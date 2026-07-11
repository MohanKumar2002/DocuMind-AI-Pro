/**
 * DocuMind AI Web Worker
 * Runs entirely off the main UI thread so the interface never freezes.
 * Handles: text chunking, TF-IDF embedding, cosine search, hardware check
 * 
 * Communication: postMessage in / postMessage out
 */

// ── TF-IDF Engine ──
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s\u0B80-\u0BFF\u0900-\u097F]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function buildTFIDF(chunks) {
  const N = chunks.length;
  const df = {};
  chunks.forEach(c => {
    new Set(tokenize(c.text)).forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  return chunks.map(c => {
    const tokens = tokenize(c.text);
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const vec = {};
    Object.entries(tf).forEach(([t, f]) => {
      const idf = Math.log((N + 1) / ((df[t] || 0) + 1)) + 1;
      vec[t] = (f / tokens.length) * idf;
    });
    return { ...c, vec };
  });
}

function cosineSim(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  keys.forEach(k => {
    const va = a[k] || 0, vb = b[k] || 0;
    dot += va * vb; na += va * va; nb += vb * vb;
  });
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function queryVector(q, allTerms) {
  const tokens = tokenize(q);
  const vec = {};
  tokens.forEach(t => { if (allTerms.has(t)) vec[t] = 1; });
  return vec;
}

// ── Chunker ──
function chunkText(text, chunkSize = 800, overlap = 120) {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?\n])\s*/);
  const chunks = [];
  let current = '';
  let idx = 0;
  for (const s of sentences) {
    if ((current + s).length > chunkSize && current.length > 0) {
      chunks.push({ id: idx++, text: current.trim() });
      const words = current.split(' ');
      current = words.slice(-Math.ceil(overlap / 6)).join(' ') + ' ' + s + ' ';
    } else {
      current += s + ' ';
    }
  }
  if (current.trim()) chunks.push({ id: idx, text: current.trim() });
  return chunks;
}

// ── State ──
let indexedChunks = null;
let allTerms = null;
let docMeta = null;

// ── Memory management ──
function flushMemory() {
  indexedChunks = null;
  allTerms = null;
  docMeta = null;
  postMessage({ type: 'memory_flushed' });
}

// ── Hardware check ──
function checkHardware() {
  const ua = self.navigator?.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const hasWebGPU = typeof GPUAdapter !== 'undefined';
  return { isMobile, hasWebGPU, recommended: !isMobile };
}

// ── Message handler ──
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  switch (type) {

    case 'CHECK_HARDWARE': {
      postMessage({ type: 'hardware_result', data: checkHardware() });
      break;
    }

    case 'PROCESS_DOCUMENT': {
      const { text, docId, name } = payload;
      try {
        postMessage({ type: 'pipeline_stage', stage: 'chunking', progress: 20 });
        const chunks = chunkText(text);

        postMessage({ type: 'pipeline_stage', stage: 'embedding', progress: 50 });
        const embedded = buildTFIDF(chunks);

        postMessage({ type: 'pipeline_stage', stage: 'indexing', progress: 80 });
        allTerms = new Set(embedded.flatMap(c => Object.keys(c.vec)));
        indexedChunks = embedded;
        docMeta = { docId, name, chunkCount: chunks.length };

        // Store in IndexedDB for persistence
        await storeInIndexedDB(docId, embedded);

        postMessage({
          type: 'pipeline_complete',
          data: { docId, chunkCount: chunks.length, termCount: allTerms.size, progress: 100 }
        });
      } catch (err) {
        postMessage({ type: 'pipeline_error', error: err.message });
      }
      break;
    }

    case 'QUERY': {
      const { question, topK = 5 } = payload;
      if (!indexedChunks) {
        postMessage({ type: 'query_error', error: 'No document indexed. Please upload first.' });
        break;
      }
      const qVec = queryVector(question, allTerms);
      const results = indexedChunks
        .map(c => ({ ...c, score: cosineSim(qVec, c.vec) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(c => c.score > 0.01);

      postMessage({ type: 'query_result', data: { chunks: results, question } });
      break;
    }

    case 'LOAD_FROM_CACHE': {
      const { docId } = payload;
      try {
        const cached = await loadFromIndexedDB(docId);
        if (cached) {
          indexedChunks = cached;
          allTerms = new Set(cached.flatMap(c => Object.keys(c.vec)));
          postMessage({ type: 'cache_loaded', data: { docId, chunkCount: cached.length } });
        } else {
          postMessage({ type: 'cache_miss', data: { docId } });
        }
      } catch (e) {
        postMessage({ type: 'cache_miss', data: { docId } });
      }
      break;
    }

    case 'FLUSH_MEMORY': {
      flushMemory();
      break;
    }
  }
};

// ── IndexedDB persistence (model stays cached) ──
function storeInIndexedDB(docId, data) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('documind_cache', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('vectors', { keyPath: 'docId' });
    };
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('vectors', 'readwrite');
      tx.objectStore('vectors').put({ docId, data, timestamp: Date.now() });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

function loadFromIndexedDB(docId) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('documind_cache', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('vectors', { keyPath: 'docId' });
    };
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('vectors', 'readonly');
      const get = tx.objectStore('vectors').get(docId);
      get.onsuccess = () => { db.close(); resolve(get.result?.data || null); };
      get.onerror = () => reject(get.error);
    };
    req.onerror = () => reject(req.error);
  });
}

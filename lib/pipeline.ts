// ── Text chunking ──
export function chunkText(text: string, size = 800, overlap = 120): { id: number; text: string }[] {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?\n])\s+/)
  const chunks: { id: number; text: string }[] = []
  let current = ''
  let idx = 0
  for (const s of sentences) {
    if ((current + s).length > size && current.length > 0) {
      chunks.push({ id: idx++, text: current.trim() })
      const words = current.split(' ')
      current = words.slice(-Math.ceil(overlap / 6)).join(' ') + ' ' + s + ' '
    } else {
      current += s + ' '
    }
  }
  if (current.trim()) chunks.push({ id: idx, text: current.trim() })
  return chunks
}

// ── TF-IDF vectorizer ──
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2)
}

export function buildIndex(chunks: { id: number; text: string }[]) {
  const N = chunks.length
  const df: Record<string, number> = {}
  chunks.forEach(c => {
    new Set(tokenize(c.text)).forEach(t => { df[t] = (df[t] || 0) + 1 })
  })
  return chunks.map(c => {
    const tokens = tokenize(c.text)
    const tf: Record<string, number> = {}
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1 })
    const vec: Record<string, number> = {}
    Object.entries(tf).forEach(([t, f]) => {
      const idf = Math.log((N + 1) / ((df[t] || 0) + 1)) + 1
      vec[t] = (f / tokens.length) * idf
    })
    return { ...c, vec }
  })
}

function cosine(a: Record<string,number>, b: Record<string,number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  let dot = 0, na = 0, nb = 0
  keys.forEach(k => {
    const va = a[k] || 0, vb = b[k] || 0
    dot += va * vb; na += va * va; nb += vb * vb
  })
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}

export function searchIndex(
  query: string,
  index: { id: number; text: string; vec: Record<string,number> }[],
  topK = 5
) {
  const tokens = tokenize(query)
  const allTerms = new Set(index.flatMap(c => Object.keys(c.vec)))
  const qVec: Record<string,number> = {}
  tokens.forEach(t => { if (allTerms.has(t)) qVec[t] = 1 })
  return index
    .map(c => ({ ...c, score: cosine(qVec, c.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(c => c.score > 0.01)
}

// ── Format file size ──
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ── Doc emoji ──
export function getDocEmoji(name: string): string {
  const ext = name?.split('.').pop()?.toLowerCase()
  const map: Record<string,string> = { pdf:'📄', docx:'📝', doc:'📝', txt:'📃', md:'📋', csv:'📊', xlsx:'📊', xls:'📊' }
  return map[ext || ''] || '📄'
}

// ── Format number ──
export function fmtNum(n: number): string {
  if (isNaN(n)) return '—'
  if (Math.abs(n) >= 1000000) return `${(n/1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `${(n/1000).toFixed(1)}K`
  return n.toFixed(2)
}

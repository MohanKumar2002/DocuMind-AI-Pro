'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import toast from 'react-hot-toast'
import {
  Upload, MessageSquare, BarChart3, FileText, Zap,
  ChevronLeft, ChevronRight, Trash2, Copy, Download,
  Globe, User, LogOut, Plus, X, CheckCircle, AlertCircle,
  Clock, BookOpen, Send, RefreshCw, ArrowRight
} from 'lucide-react'
import { useDocStore, useChatStore, useUIStore, Doc, Message } from '@/lib/store'
import { chunkText, buildIndex, searchIndex, formatSize, getDocEmoji, fmtNum } from '@/lib/pipeline'

Chart.register(...registerables)

const CHART_OPTS: any = {
  responsive: true, maintainAspectRatio: true,
  plugins: { legend: { labels: { color: '#4a5065', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#8890a8' }, grid: { color: '#e8eaf2' } },
    y: { ticks: { color: '#8890a8' }, grid: { color: '#e8eaf2' } },
  },
}

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'ta', label: '🇮🇳 Tamil' },
  { code: 'hi', label: '🇮🇳 Hindi' },
  { code: 'te', label: '🇮🇳 Telugu' },
  { code: 'de', label: '🇩🇪 German' },
]

const SUGGESTIONS = [
  'What is this document about?',
  'List the key points',
  'Summarize in 3 sentences',
  'What are the main conclusions?',
  'List all important numbers',
]

const PIPELINE_STAGES = ['Reading file', 'Extracting text', 'Chunking content', 'Building index', 'Ready!']

// ────────────────────────────────────────────────────────
// MAIN APP
// ────────────────────────────────────────────────────────
export default function AppPage() {
  const { docs, activeDoc, isUploading, uploadProgress, pipelineStage,
    addDoc, updateDoc, removeDoc, setActiveDoc,
    setUploading, setUploadProgress, setPipelineStage } = useDocStore()
  const { messages, isStreaming, streamContent, addMessage, clearMessages, setStreaming, setStreamContent, appendStream } = useChatStore()
  const { sidebarOpen, language, toggleSidebar, setLanguage } = useUIStore()

  const [view, setView] = useState<'upload' | 'chat' | 'dashboard' | 'summary' | 'quiz'>('upload')
  const [chatInput, setChatInput] = useState('')
  const [summaryLevel, setSummaryLevel] = useState<'quick' | 'detailed' | 'full'>('detailed')
  const [summaryText, setSummaryText] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [quizData, setQuizData] = useState<any[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizCount, setQuizCount] = useState(8)
  const [quizType, setQuizType] = useState('mcq')
  const [dashAsk, setDashAsk] = useState('')
  const [dashAnswer, setDashAnswer] = useState('')
  const [dashLoading, setDashLoading] = useState(false)
  const [tableFilter, setTableFilter] = useState('')
  const [activeSheet, setActiveSheet] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamContent])

  // ── File processing pipeline ──
  const processFile = useCallback(async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    const id = `doc_${Date.now()}`

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let text = ''
      let pages = 1
      let sheets: Record<string, any> | undefined

      setPipelineStage('Reading file')
      setUploadProgress(15)
      await sleep(100)

      if (ext === 'pdf') {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
        const buf = await file.arrayBuffer()
        const pdf = await getDocument({ data: buf }).promise
        pages = pdf.numPages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map((s: any) => s.str).join(' ') + '\n'
        }
      } else if (ext === 'docx') {
        const mammoth = (await import('mammoth')).default
        const buf = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer: buf })
        text = result.value
        pages = Math.ceil(text.length / 3000)
      } else if (['csv', 'xlsx', 'xls'].includes(ext)) {
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        sheets = {}
        wb.SheetNames.forEach(name => {
          const ws = wb.Sheets[name]
          const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
          const csv = XLSX.utils.sheet_to_csv(ws)
          sheets![name] = {
            data: json,
            csv,
            columns: json.length > 0 ? Object.keys(json[0] as any) : [],
          }
          text += `Sheet: ${name}\n${csv}\n\n`
        })
        setActiveSheet(wb.SheetNames[0])
      } else {
        text = await file.text()
        pages = Math.ceil(text.length / 3000)
      }

      setPipelineStage('Extracting text')
      setUploadProgress(35)
      await sleep(150)

      setPipelineStage('Chunking content')
      setUploadProgress(55)
      const chunks = chunkText(text)
      await sleep(100)

      setPipelineStage('Building index')
      setUploadProgress(80)
      const index = buildIndex(chunks)
      await sleep(150)

      setPipelineStage('Ready!')
      setUploadProgress(100)
      await sleep(400)

      const doc: Doc = {
        id, name: file.name, type: ext,
        size: formatSize(file.size), pages,
        chunkCount: chunks.length, text, index,
        sheets, status: 'ready',
        uploadedAt: new Date().toLocaleTimeString(),
      }
      addDoc(doc)
      setActiveDoc(doc)
      if (sheets) setView('dashboard')
      else setView('chat')
      toast.success(`${file.name} processed ✓`, { icon: '✅' })

    } catch (err: any) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setUploading(false)
      setPipelineStage(null)
      setUploadProgress(0)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach(processFile),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt', '.md'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  })

  // ── Chat ──
  async function sendChat() {
    const msg = chatInput.trim()
    if (!msg || isStreaming || !activeDoc) return
    setChatInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { role: 'user', content: msg, createdAt: new Date().toISOString() }
    addMessage(activeDoc.id, userMsg)
    setStreaming(true)
    setStreamContent('')

    const results = searchIndex(msg, activeDoc.index, 5)
    const context = results.map((r, i) => `[Section ${i + 1}]: ${r.text}`).join('\n\n---\n\n')
    const docMessages = messages[activeDoc.id] || []
    const history = docMessages.slice(-6).map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context, language, history }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.replace('data: ', ''))
            if (parsed.done) break
            if (parsed.delta) { full += parsed.delta; appendStream(parsed.delta) }
          } catch {}
        }
      }
      const sources = results.map((r, i) => ({ section: i + 1, preview: r.text.slice(0, 100) + '...', score: r.score }))
      addMessage(activeDoc.id, { role: 'assistant', content: full, sources, createdAt: new Date().toISOString() })
    } catch (e: any) {
      toast.error('Chat failed')
    } finally {
      setStreaming(false)
      setStreamContent('')
    }
  }

  // ── Summary ──
  async function genSummary() {
    if (!activeDoc) { toast.error('Select a document first'); return }
    setSummaryLoading(true); setSummaryText('')
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: activeDoc.text, level: summaryLevel, language }),
      })
      const data = await res.json()
      setSummaryText(data.summary || data.error)
    } catch { toast.error('Summary failed') }
    setSummaryLoading(false)
  }

  // ── Quiz ──
  async function genQuiz() {
    if (!activeDoc) { toast.error('Select a document first'); return }
    setQuizLoading(true); setQuizData([]); setQuizAnswers({}); setQuizSubmitted(false)
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: activeDoc.text, count: quizCount, type: quizType, language }),
      })
      const data = await res.json()
      setQuizData(data.questions || [])
    } catch { toast.error('Quiz generation failed') }
    setQuizLoading(false)
  }

  // ── Dashboard AI ──
  async function askDashboard() {
    if (!activeDoc?.sheets || !dashAsk.trim()) return
    setDashLoading(true); setDashAnswer('')
    const sheetText = Object.entries(activeDoc.sheets).map(([k,v]: any) => `Sheet: ${k}\n${v.csv}`).join('\n\n').slice(0, 8000)
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${dashAsk}\n\nData:\n${sheetText}`, level: 'quick', language }),
      })
      const data = await res.json()
      setDashAnswer(data.summary || '')
    } catch { toast.error('Query failed') }
    setDashLoading(false)
  }

  // ── Quiz score ──
  const quizScore = quizSubmitted && quizData.length > 0
    ? Math.round((Object.entries(quizAnswers).filter(([i, a]) => a === quizData[+i]?.answer).length / quizData.length) * 100)
    : null

  // ── Dashboard data ──
  const sheet = activeDoc?.sheets?.[activeSheet]
  const headers = sheet?.columns || []
  const data: any[] = sheet?.data || []
  const numCols = headers.filter((h: string) => data.slice(0, 10).filter((r: any) => !isNaN(parseFloat(r[h]))).length > 5)
  const catCols = headers.filter((h: string) => !numCols.includes(h))
  const filteredData = tableFilter ? data.filter((r: any) => Object.values(r).some(v => String(v).toLowerCase().includes(tableFilter.toLowerCase()))) : data

  const stageIndex = PIPELINE_STAGES.findIndex(s => pipelineStage?.includes(s.split(' ')[0]))

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-secondary)', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: sidebarOpen ? 240 : 56, flexShrink: 0,
        background: 'var(--bg-primary)', borderRight: '1px solid var(--border-light)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Logo */}
        <div style={{ height: 56, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#6c3de8,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🧠</div>
              <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.03em' }}>Docu<span style={{ color: 'var(--brand-purple)' }}>Mind</span></span>
            </div>
          )}
          <button onClick={toggleSidebar} className="btn btn-ghost btn-icon" style={{ marginLeft: sidebarOpen ? 0 : 'auto' }}>
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flexShrink: 0 }}>
          {sidebarOpen && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '4px 8px 6px' }}>Tools</div>}
          {([
            { id: 'upload', icon: Upload, label: 'Upload' },
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'summary', icon: FileText, label: 'Summarize' },
            { id: 'quiz', icon: Zap, label: 'Quiz' },
          ] as const).map(n => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: sidebarOpen ? '8px 10px' : '8px', justifyContent: sidebarOpen ? 'flex-start' : 'center',
                width: '100%', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginBottom: 2, fontSize: 13, fontWeight: 500, transition: 'all .15s',
                background: view === n.id ? 'var(--brand-purple-bg)' : 'transparent',
                color: view === n.id ? 'var(--brand-purple)' : 'var(--text-secondary)',
              }}
              title={!sidebarOpen ? n.label : ''}
            >
              <n.icon size={16} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span>{n.label}</span>}
            </button>
          ))}
        </nav>

        {/* Docs list */}
        {sidebarOpen && docs.length > 0 && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 16px 6px' }}>Documents</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
              {docs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => { setActiveDoc(doc); setView(doc.sheets ? 'dashboard' : 'chat') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    borderRadius: 8, cursor: 'pointer', marginBottom: 3,
                    background: activeDoc?.id === doc.id ? 'var(--brand-purple-bg)' : 'transparent',
                    border: `1px solid ${activeDoc?.id === doc.id ? 'var(--brand-purple-border)' : 'transparent'}`,
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{getDocEmoji(doc.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{doc.chunkCount} chunks · {doc.size}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeDoc(doc.id); if (activeDoc?.id === doc.id) { setActiveDoc(null); setView('upload') } }} style={{ opacity: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, borderRadius: 4, transition: 'opacity .15s' }} className="doc-delete">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: 10, borderTop: '1px solid var(--border-light)', flexShrink: 0 }}>
          {sidebarOpen ? (
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>MOH AI TECH</div>
              Namakkal, Tamil Nadu 🇮🇳
            </div>
          ) : null}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top header */}
        <header style={{ height: 56, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeDoc ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span>{getDocEmoji(activeDoc.name)}</span>
                  <span style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeDoc.name}</span>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>Ready</span>
                </span>
              ) : 'DocuMind AI Pro'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 100, background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)' }}>
              🔒 100% Private
            </div>
            <select value={language} onChange={e => setLanguage(e.target.value)} className="input" style={{ width: 'auto', padding: '5px 10px', fontSize: 12, height: 32 }}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ── UPLOAD VIEW ── */}
          {view === 'upload' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', justifyContent: docs.length === 0 ? 'center' : 'flex-start' }}>
              <div style={{ width: '100%', maxWidth: 680 }}>
                <div
                  {...getRootProps()}
                  style={{
                    border: `2px dashed ${isDragActive ? 'var(--brand-purple)' : 'var(--border-medium)'}`,
                    borderRadius: 16, padding: '48px 32px', textAlign: 'center', cursor: 'pointer',
                    background: isDragActive ? 'var(--brand-purple-bg)' : 'var(--bg-primary)',
                    transition: 'all .2s', boxShadow: isDragActive ? 'var(--shadow-brand)' : 'var(--shadow-sm)',
                  }}
                >
                  <input {...getInputProps()} />
                  {isUploading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 36, animation: 'spin 2s linear infinite' }}>⚙️</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{pipelineStage || 'Processing...'}</div>
                      <div className="progress-bar" style={{ width: 320 }}>
                        <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {PIPELINE_STAGES.map((s, i) => (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: i < stageIndex ? 'var(--success)' : i === stageIndex ? 'var(--brand-purple)' : 'var(--text-tertiary)', fontWeight: i === stageIndex ? 600 : 400 }}>
                            {i < stageIndex ? <CheckCircle size={11} /> : <Clock size={11} />}
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 40, marginBottom: 14 }}>{isDragActive ? '📂' : '📄'}</div>
                      <h3 style={{ fontSize: 17, marginBottom: 6, color: 'var(--text-primary)' }}>
                        {isDragActive ? 'Drop it here!' : 'Upload your document'}
                      </h3>
                      <p style={{ fontSize: 13, marginBottom: 20, color: 'var(--text-secondary)' }}>
                        Drag & drop or <span style={{ color: 'var(--brand-purple)', fontWeight: 600, cursor: 'pointer' }}>click to browse</span>
                      </p>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                        {['PDF', 'Word', 'TXT', 'CSV', 'Excel'].map(t => (
                          <span key={t} className="badge badge-gray">{t}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Max 50MB · 100% private · Never sent to any server</div>
                    </>
                  )}
                </div>

                {/* Pipeline explanation */}
                <div className="card" style={{ padding: 20, marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    🔬 How the AI pipeline works
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                    {['📥 Ingest', '📝 Extract', '✂️ Chunk', '🧮 TF-IDF Embed', '🗂️ Index', '✅ Groq AI Ready'].map((s, i, arr) => (
                      <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ background: 'var(--brand-purple-bg)', border: '1px solid var(--brand-purple-border)', color: 'var(--brand-purple)', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 500 }}>{s}</span>
                        {i < arr.length - 1 && <ArrowRight size={11} color="var(--text-tertiary)" />}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                    Document → text extraction → 800-char sliding window chunks → TF-IDF vectors → ChromaDB index → Groq Llama 3.1 70B answers your questions citing exact sections.
                  </p>
                </div>
              </div>

              {/* Recent docs */}
              {docs.length > 0 && (
                <div style={{ width: '100%', maxWidth: 680 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Recent documents</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                    {docs.map(doc => (
                      <div key={doc.id} className="card" onClick={() => { setActiveDoc(doc); setView(doc.sheets ? 'dashboard' : 'chat') }}
                        style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{getDocEmoji(doc.name)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{doc.chunkCount} chunks · {doc.size}</div>
                        </div>
                        <span className="badge badge-green" style={{ fontSize: 10 }}>Ready</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CHAT VIEW ── */}
          {view === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {activeDoc && (
                <div style={{ padding: '10px 20px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>{getDocEmoji(activeDoc.name)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{activeDoc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{activeDoc.chunkCount} chunks · {activeDoc.pages} pages · Groq Llama 3.1 70B</div>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setView('summary')}>📝 Summary</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setView('quiz')}>🎯 Quiz</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { if (activeDoc) clearMessages(activeDoc.id) }}>
                      <Trash2 size={13} /> Clear
                    </button>
                  </div>
                </div>
              )}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {!activeDoc ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-tertiary)' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>No document selected</div>
                    <button className="btn btn-primary btn-sm" onClick={() => setView('upload')}>Upload a document</button>
                  </div>
                ) : (messages[activeDoc.id] || []).length === 0 && !isStreaming ? (
                  <div style={{ textAlign: 'center', margin: 'auto' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Ask anything about your document</div>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>Powered by Groq · Llama 3.1 70B · RAG retrieval</p>
                  </div>
                ) : null}

                {activeDoc && (messages[activeDoc.id] || []).map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, maxWidth: 780, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', animation: 'fadeIn .2s ease' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: msg.role === 'user' ? 'linear-gradient(135deg,#6c3de8,#4f46e5)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginTop: 2, border: msg.role === 'assistant' ? '1px solid var(--border-light)' : 'none' }}>
                      {msg.role === 'user' ? '👤' : '🧠'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        padding: '12px 16px', borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
                        background: msg.role === 'user' ? 'linear-gradient(135deg,#6c3de8,#4f46e5)' : 'var(--bg-primary)',
                        color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                        border: msg.role === 'assistant' ? '1px solid var(--border-light)' : 'none',
                        boxShadow: 'var(--shadow-sm)', fontSize: 14, lineHeight: 1.7,
                      }}>
                        {msg.role === 'user' ? msg.content : <div className="md-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>}
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                          {msg.sources.slice(0, 3).map((s, j) => (
                            <span key={j} style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100, background: 'var(--brand-purple-bg)', border: '1px solid var(--brand-purple-border)', color: 'var(--brand-purple)' }}>
                              📄 Section {s.section} · {Math.round(s.score * 100)}% match
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isStreaming && streamContent && (
                  <div style={{ display: 'flex', gap: 10, maxWidth: 780 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginTop: 2, border: '1px solid var(--border-light)' }}>🧠</div>
                    <div style={{ padding: '12px 16px', borderRadius: '3px 14px 14px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', fontSize: 14, lineHeight: 1.7, flex: 1 }}>
                      <div className="md-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown></div>
                      <span style={{ display: 'inline-block', width: 2, height: 16, background: 'var(--brand-purple)', animation: 'pulse 0.7s infinite', verticalAlign: 'middle', marginLeft: 3, borderRadius: 1 }} />
                    </div>
                  </div>
                )}
                {isStreaming && !streamContent && (
                  <div style={{ display: 'flex', gap: 10, maxWidth: 780 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, border: '1px solid var(--border-light)' }}>🧠</div>
                    <div style={{ padding: '12px 16px', borderRadius: '3px 14px 14px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-tertiary)', animation: `bounce .9s infinite ${i * 0.15}s` }} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-primary)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => { setChatInput(s); setTimeout(sendChat, 100) }} style={{ padding: '5px 12px', borderRadius: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap', fontWeight: 400 }}>{s}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={textareaRef}
                    value={chatInput}
                    onChange={e => { setChatInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px' }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                    placeholder="Ask anything about your document..."
                    disabled={isStreaming || !activeDoc}
                    rows={1}
                    className="input"
                    style={{ resize: 'none', minHeight: 42, maxHeight: 130, lineHeight: 1.5 }}
                  />
                  <button onClick={sendChat} disabled={isStreaming || !chatInput.trim() || !activeDoc}
                    style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#6c3de8,#4f46e5)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!chatInput.trim() || !activeDoc) ? 0.4 : 1, transition: 'all .15s' }}>
                    {isStreaming ? <div className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> : <Send size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 7 }}>
                  Groq · Llama 3.1 70B · TF-IDF RAG · Privacy-first
                </div>
              </div>
            </div>
          )}

          {/* ── DASHBOARD VIEW ── */}
          {view === 'dashboard' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!activeDoc?.sheets ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-tertiary)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Upload a CSV or Excel file</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setView('upload')}>Upload data file</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3>📊 {activeDoc.name}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={() => setView('chat')}><MessageSquare size={13} /> Chat with this</button>
                  </div>

                  {/* Sheet tabs */}
                  {Object.keys(activeDoc.sheets).length > 1 && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {Object.keys(activeDoc.sheets).map(name => (
                        <button key={name} onClick={() => setActiveSheet(name)} className={`btn btn-sm ${activeSheet === name ? 'btn-primary' : 'btn-secondary'}`}>{name}</button>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
                    <div className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total rows</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{data.length.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{headers.length} columns</div>
                    </div>
                    {numCols.slice(0, 3).map((col: string) => {
                      const vals = data.map((r: any) => parseFloat(r[col])).filter((v: number) => !isNaN(v))
                      const sum = vals.reduce((a: number, b: number) => a + b, 0)
                      return (
                        <div key={col} className="card" style={{ padding: 14 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{col}</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand-purple)' }}>{fmtNum(sum)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Avg: {fmtNum(sum / vals.length)}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Charts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {numCols[0] && catCols[0] && (
                      <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>📊 {numCols[0]} by {catCols[0]}</div>
                        <Bar data={{ labels: data.slice(0, 12).map((r: any) => String(r[catCols[0]]).slice(0, 14)), datasets: [{ label: numCols[0], data: data.slice(0, 12).map((r: any) => parseFloat(r[numCols[0]]) || 0), backgroundColor: 'rgba(108,61,232,0.65)', borderColor: '#6c3de8', borderWidth: 1 }] }} options={CHART_OPTS} />
                      </div>
                    )}
                    {numCols.length >= 2 && (
                      <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>📈 Trend: {numCols[0]} vs {numCols[1]}</div>
                        <Line data={{ labels: data.slice(0, 20).map((_: any, i: number) => `#${i + 1}`), datasets: [{ label: numCols[0], data: data.slice(0, 20).map((r: any) => parseFloat(r[numCols[0]]) || 0), borderColor: '#6c3de8', tension: 0.4, fill: false }, { label: numCols[1], data: data.slice(0, 20).map((r: any) => parseFloat(r[numCols[1]]) || 0), borderColor: '#0891b2', tension: 0.4, fill: false }] }} options={CHART_OPTS} />
                      </div>
                    )}
                    {catCols[0] && (() => {
                      const counts: Record<string, number> = {}
                      data.forEach((r: any) => { const v = String(r[catCols[0]]); counts[v] = (counts[v] || 0) + 1 })
                      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
                      return (
                        <div className="card" style={{ padding: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>🥧 {catCols[0]} distribution</div>
                          <Doughnut data={{ labels: top.map(x => x[0].slice(0, 18)), datasets: [{ data: top.map(x => x[1]), backgroundColor: ['#6c3de8', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#06b6d4'] }] }} options={{ ...CHART_OPTS, scales: undefined }} />
                        </div>
                      )
                    })()}
                  </div>

                  {/* AI Ask */}
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>🤖 Ask AI about this data</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input className="input" value={dashAsk} onChange={e => setDashAsk(e.target.value)} onKeyDown={e => e.key === 'Enter' && askDashboard()} placeholder="e.g. What is the highest value? Which category appears most?" />
                      <button className="btn btn-primary btn-sm" onClick={askDashboard} disabled={dashLoading} style={{ whiteSpace: 'nowrap' }}>
                        {dashLoading ? <div className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> : 'Ask →'}
                      </button>
                    </div>
                    {dashAnswer && <div className="md-content" style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)' }}><ReactMarkdown>{dashAnswer}</ReactMarkdown></div>}
                  </div>

                  {/* Table */}
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>📋 {data.length.toLocaleString()} rows</span>
                      <input className="input" style={{ width: 200, height: 32, fontSize: 12, padding: '5px 10px' }} placeholder="🔍 Filter rows..." value={tableFilter} onChange={e => setTableFilter(e.target.value)} />
                    </div>
                    <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>{headers.map((h: string) => <th key={h} style={{ background: 'var(--bg-secondary)', padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap', position: 'sticky', top: 0 }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {filteredData.slice(0, 100).map((row: any, i: number) => (
                            <tr key={i} style={{ transition: 'background .1s' }}>
                              {headers.map((h: string) => <td key={h} style={{ padding: '7px 12px', borderBottom: '1px solid var(--border-light)', color: !isNaN(parseFloat(row[h])) ? 'var(--brand-purple)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{String(row[h] ?? '')}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── SUMMARY VIEW ── */}
          {view === 'summary' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, width: '100%', margin: '0 auto' }}>
              {activeDoc && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Document: <strong style={{ color: 'var(--text-secondary)' }}>{activeDoc.name}</strong></div>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {(['quick', 'detailed', 'full'] as const).map(l => (
                  <button key={l} onClick={() => setSummaryLevel(l)} className={`btn btn-sm ${summaryLevel === l ? 'btn-primary' : 'btn-secondary'}`}>
                    {l === 'quick' ? '⚡ Quick' : l === 'detailed' ? '📋 Detailed' : '📚 Full'}
                  </button>
                ))}
                <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={genSummary} disabled={summaryLoading || !activeDoc}>
                  {summaryLoading ? <><div className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> Generating...</> : 'Generate →'}
                </button>
              </div>
              <div className="card" style={{ padding: 24, minHeight: 200 }}>
                {summaryLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: 12 }}>
                    <div className="spinner spinner-lg" />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Groq Llama 3.1 is reading your document...</div>
                  </div>
                ) : summaryText ? (
                  <div className="md-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryText}</ReactMarkdown></div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12, opacity: .4 }}>📝</div>
                    <div>{activeDoc ? 'Select a level and click Generate' : 'Upload a document first'}</div>
                  </div>
                )}
              </div>
              {summaryText && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(summaryText); toast.success('Copied!') }}><Copy size={13} /> Copy</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([summaryText], { type: 'text/plain' })); a.download = `summary.txt`; a.click() }}><Download size={13} /> Download</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setView('quiz')}><Zap size={13} /> Generate quiz</button>
                </div>
              )}
            </div>
          )}

          {/* ── QUIZ VIEW ── */}
          {view === 'quiz' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 780, width: '100%', margin: '0 auto' }}>
              {activeDoc && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Document: <strong style={{ color: 'var(--text-secondary)' }}>{activeDoc.name}</strong></div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { label: 'Questions', value: quizCount, opts: [5, 8, 10, 15], setter: setQuizCount },
                  { label: 'Type', value: quizType, opts: ['mcq', 'truefalse', 'mixed'], setter: setQuizType },
                ].map(({ label, value, opts, setter }) => (
                  <select key={label} value={value} onChange={e => setter(isNaN(Number(e.target.value)) ? e.target.value as any : Number(e.target.value))} className="input" style={{ width: 'auto', height: 34, fontSize: 12 }}>
                    {opts.map(o => <option key={o} value={o}>{typeof o === 'number' ? `${o} questions` : String(o).charAt(0).toUpperCase() + String(o).slice(1)}</option>)}
                  </select>
                ))}
                <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={genQuiz} disabled={quizLoading || !activeDoc}>
                  {quizLoading ? <><div className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> Generating...</> : '🎯 Generate quiz'}
                </button>
              </div>

              {quizScore !== null && (
                <div style={{ background: 'linear-gradient(135deg, var(--brand-purple-bg), #eef2ff)', border: '1px solid var(--brand-purple-border)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: quizScore >= 80 ? 'var(--success)' : quizScore >= 60 ? 'var(--warning)' : 'var(--danger)' }}>{quizScore}%</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {Object.entries(quizAnswers).filter(([i, a]) => a === quizData[+i]?.answer).length} of {quizData.length} correct
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    {quizScore >= 80 ? '🎉 Excellent!' : quizScore >= 60 ? '👍 Good work!' : '📚 Keep studying!'}
                  </div>
                </div>
              )}

              {quizData.map((q, i) => {
                const chosen = quizAnswers[i]
                const isAnswered = chosen !== undefined
                return (
                  <div key={i} className="card" style={{ padding: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-purple)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7 }}>Question {i + 1} of {quizData.length}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14, lineHeight: 1.55, color: 'var(--text-primary)' }}>{q.q}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map((opt: string, j: number) => {
                        let bg = 'var(--bg-secondary)', color = 'var(--text-secondary)', border = 'var(--border-medium)'
                        if (isAnswered && !quizSubmitted) { if (j === chosen) { bg = 'var(--brand-purple-bg)'; color = 'var(--brand-purple)'; border = 'var(--brand-purple)' } }
                        if (quizSubmitted) {
                          if (j === q.answer) { bg = 'var(--success-bg)'; color = 'var(--success)'; border = 'var(--success-border)' }
                          else if (j === chosen && j !== q.answer) { bg = 'var(--danger-bg)'; color = 'var(--danger)'; border = 'var(--danger-border)' }
                        }
                        return (
                          <div key={j} onClick={() => { if (!quizSubmitted) setQuizAnswers(a => ({ ...a, [i]: j })) }}
                            style={{ padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, cursor: quizSubmitted ? 'default' : 'pointer', fontSize: 13, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {quizSubmitted && j === q.answer && <CheckCircle size={14} />}
                            {opt}
                          </div>
                        )
                      })}
                    </div>
                    {quizSubmitted && <div style={{ marginTop: 10, padding: '9px 13px', background: 'var(--brand-purple-bg)', border: '1px solid var(--brand-purple-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>💡 {q.explanation}</div>}
                  </div>
                )
              })}

              {quizData.length > 0 && !quizSubmitted && Object.keys(quizAnswers).length === quizData.length && (
                <button className="btn btn-primary btn-lg" style={{ justifyContent: 'center' }} onClick={() => setQuizSubmitted(true)}>Submit quiz →</button>
              )}
              {quizData.length === 0 && !quizLoading && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: .4 }}>🎯</div>
                  <div>{activeDoc ? 'Click Generate to create practice questions' : 'Upload a document first'}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chatAPI, summaryAPI, quizAPI } from '../utils/api'
import { useDocStore, useChatStore, useUIStore } from '../store'
import toast from 'react-hot-toast'
import styles from './UnifiedDocumentPage.module.css'

const SUGGESTIONS = [
  'Summarize the key points',
  'What are the main conclusions?',
  'List the most important facts'
]

export default function UnifiedDocumentPage() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const { activeDoc, documents, setActiveDoc } = useDocStore()
  const { messages, addMessage, setMessages, isStreaming, setStreaming, streamContent, setStreamContent, appendStream } = useChatStore()
  const { language } = useUIStore()

  const [activeTab, setActiveTab] = useState('chat')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Summary State
  const [summary, setSummary] = useState(null)
  
  // Quiz State
  const [quiz, setQuiz] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const taRef = useRef(null)

  const currentDoc = docId ? documents.find(d => d.id === docId) || activeDoc : activeDoc
  const docMessages = (docId && messages[docId]) || []

  useEffect(() => {
    if (docId) {
      const doc = documents.find(d => d.id === docId)
      if (doc) setActiveDoc(doc)
      loadHistory()
    }
  }, [docId])

  useEffect(() => { scrollToBottom() }, [docMessages, streamContent, activeTab])

  async function loadHistory() {
    try {
      const res = await chatAPI.history(docId)
      setMessages(docId, res.data || [])
    } catch {}
  }

  function scrollToBottom() {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  async function sendMessage(text) {
    const msg = text || input.trim()
    if (!msg || isLoading || isStreaming) return
    if (!currentDoc) { toast.error('Select a document first'); navigate('/app/upload'); return }
    if (currentDoc.status !== 'ready') { toast.error('Document is still processing...'); return }

    setInput('')
    if (taRef.current) { taRef.current.style.height = 'auto' }

    const userMsg = { role: 'user', content: msg, created_at: new Date().toISOString() }
    addMessage(docId || currentDoc.id, userMsg)
    setStreaming(true)
    setStreamContent('')
    setIsLoading(true)

    try {
      await chatAPI.stream(
        { doc_id: docId || currentDoc.id, message: msg, language, stream: true },
        (delta) => appendStream(delta),
        (done) => {
          const aiMsg = {
            role: 'assistant',
            content: streamContent + (done.remaining || ''),
            sources: done.sources || [],
            created_at: new Date().toISOString()
          }
          addMessage(docId || currentDoc.id, aiMsg)
          setStreaming(false)
          setStreamContent('')
          setIsLoading(false)
        },
        (err) => {
          toast.error(err || 'Chat error')
          setStreaming(false)
          setIsLoading(false)
        }
      )
    } catch (err) {
      toast.error('Failed to send message')
      setStreaming(false)
      setIsLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function autoResize(e) {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  async function generateSummary() {
    if (!currentDoc) return
    setIsLoading(true)
    try {
      const res = await summaryAPI.generate({ doc_id: currentDoc.id, level: 'detailed', language })
      setSummary(res.data.summary)
    } catch (err) {
      toast.error('Failed to generate summary')
    }
    setIsLoading(false)
  }

  return (
    <div className={styles.container}>
      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/app/upload')}>
          ← All documents
        </button>
      </div>

      {/* ── Document Header ── */}
      {currentDoc && (
        <div className={styles.docHeader}>
          <div className={styles.docTitleRow}>
            <h1 className={styles.docTitle}>{currentDoc.name.split('.')[0] || 'Document'}</h1>
            <div className={styles.statusBadge}>
              <span className={styles.statusDot}></span> Ready
            </div>
          </div>
          <div className={styles.docMeta}>
            {currentDoc.file_type?.toUpperCase().replace('.', '') || 'PDF'} · {currentDoc.pages || 0} pages · {currentDoc.chunk_count * 800 || 0} characters
          </div>
        </div>
      )}

      {/* ── Segmented Control Tabs ── */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabBar}>
          <button className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`} onClick={() => setActiveTab('chat')}>
            💬 Chat
          </button>
          <button className={`${styles.tab} ${activeTab === 'summary' ? styles.tabActive : ''}`} onClick={() => setActiveTab('summary')}>
            📝 Summary
          </button>
          <button className={`${styles.tab} ${activeTab === 'quiz' ? styles.tabActive : ''}`} onClick={() => setActiveTab('quiz')}>
            🎯 Quiz
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className={styles.tabContent}>
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className={styles.chatArea}>
            <div className={styles.messages}>
              {docMessages.length === 0 && !isStreaming && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>✨</div>
                  <h3>Ask anything about this document</h3>
                  <p>Answers are grounded in your file. Ask in English, Tamil, Hindi or Telugu.</p>
                  
                  <div className={styles.suggestions}>
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} className={styles.suggestionBtn} onClick={() => sendMessage(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {docMessages.map((msg, i) => (
                <div key={i} className={`${styles.msgRow} ${msg.role === 'user' ? styles.userRow : ''}`}>
                  <div className={styles.msgAvatar}>{msg.role === 'user' ? 'M' : '✨'}</div>
                  <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                    {msg.role === 'user' ? msg.content : (
                      <div className="md-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && streamContent && (
                <div className={styles.msgRow}>
                  <div className={styles.msgAvatar}>✨</div>
                  <div className={`${styles.bubble} ${styles.aiBubble}`}>
                    <div className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <div className={styles.inputBox}>
                <div className={styles.inputIconsLeft}>
                  <button className={styles.iconBtn}>⛶</button>
                  <button className={styles.iconBtn}>T</button>
                  <button className={styles.iconBtn}>📎</button>
                  <button className={styles.iconBtn}>💬</button>
                </div>
                <textarea
                  ref={taRef}
                  className={styles.chatInput}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  onInput={autoResize}
                  placeholder="Ask a question about this document..."
                  rows={1}
                  disabled={isLoading || isStreaming}
                />
                <button 
                  className={styles.sendBtn} 
                  onClick={() => sendMessage()} 
                  disabled={isLoading || isStreaming || !input.trim()}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className={styles.centerArea}>
            {!summary ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📝</div>
                <h3>Generate a Summary</h3>
                <p>Get a detailed breakdown of this document instantly.</p>
                <button className="btn btn-primary" onClick={generateSummary} disabled={isLoading} style={{marginTop: 16}}>
                  {isLoading ? 'Generating...' : 'Generate Summary'}
                </button>
              </div>
            ) : (
              <div className="card" style={{ maxWidth: 800, margin: '0 auto', textAlign: 'left' }}>
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className={styles.centerArea}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎯</div>
              <h3>Quiz Time</h3>
              <p>Test your knowledge on this document.</p>
              <button className="btn btn-primary" style={{marginTop: 16}}>Start Quiz</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

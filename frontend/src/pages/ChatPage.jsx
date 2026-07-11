import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chatAPI } from '../utils/api'
import { useDocStore, useChatStore, useUIStore } from '../store'
import toast from 'react-hot-toast'
import styles from './ChatPage.module.css'

const SUGGESTIONS = [
  'What is this document about?',
  'List the key points',
  'Summarize in 3 sentences',
  'What are the main conclusions?',
  'List all important numbers and statistics',
  'What action items are mentioned?',
]

export default function ChatPage() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const { activeDoc, documents, setActiveDoc } = useDocStore()
  const { messages, addMessage, setMessages, isStreaming, setStreaming, streamContent, setStreamContent, appendStream } = useChatStore()
  const { language } = useUIStore()

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const taRef = useRef(null)

  const currentDoc = docId ? documents.find(d => d.id === docId) || activeDoc : activeDoc
  const docMessages = (docId && messages[docId]) || []

  // Load document + history
  useEffect(() => {
    if (docId) {
      const doc = documents.find(d => d.id === docId)
      if (doc) setActiveDoc(doc)
      loadHistory()
    }
  }, [docId])

  useEffect(() => { scrollToBottom() }, [docMessages, streamContent])

  async function loadHistory() {
    try {
      const res = await chatAPI.history(docId)
      setMessages(docId, res.data || [])
    } catch {}
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  async function clearChat() {
    try {
      await chatAPI.clearHistory(docId || currentDoc.id)
      setMessages(docId || currentDoc.id, [])
      toast.success('Chat cleared')
    } catch { toast.error('Failed to clear chat') }
  }

  return (
    <div className={styles.container}>
      {/* Doc header */}
      {currentDoc && (
        <div className={styles.docHeader}>
          <div className={styles.docIcon}>{getDocEmoji(currentDoc.name)}</div>
          <div className={styles.docInfo}>
            <div className={styles.docName}>{currentDoc.name}</div>
            <div className={styles.docMeta}>
              {currentDoc.status === 'ready'
                ? `${currentDoc.chunk_count} chunks · ${currentDoc.pages} pages · Ready`
                : <span style={{ color: 'var(--amber)' }}>Processing...</span>}
            </div>
          </div>
          <div className={styles.docActions}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/summary/${currentDoc.id}`)}>📝 Summary</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/quiz/${currentDoc.id}`)}>🎯 Quiz</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/extraction/${currentDoc.id}`)}>✨ Extract Data</button>
            <button className="btn btn-ghost btn-sm" onClick={clearChat}>🗑️ Clear</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={styles.messages}>
        {docMessages.length === 0 && !isStreaming && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <h3>Ask anything about your document</h3>
            <p>Powered by Groq (Llama 3.1 70B) — free, ultra-fast, and context-aware</p>
          </div>
        )}

        {docMessages.map((msg, i) => (
          <div key={i} className={`${styles.msgRow} ${msg.role === 'user' ? styles.user : ''}`}>
            <div className={`${styles.avatar} ${msg.role === 'ai' || msg.role === 'assistant' ? styles.aiAvatar : ''}`}>
              {msg.role === 'user' ? '👤' : '🧠'}
            </div>
            <div className={styles.msgContent}>
              <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                {msg.role === 'user' ? msg.content : (
                  <div className="md-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {msg.sources?.length > 0 && (
                <div className={styles.sources}>
                  {msg.sources.slice(0, 3).map((s, j) => (
                    <span key={j} className={styles.sourceBadge}>
                      📄 Section {s.section} · {Math.round(s.score * 100)}% match
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamContent && (
          <div className={styles.msgRow}>
            <div className={`${styles.avatar} ${styles.aiAvatar}`}>🧠</div>
            <div className={styles.msgContent}>
              <div className={styles.aiBubble}>
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
                </div>
                <span className={styles.cursor} />
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamContent && (
          <div className={styles.msgRow}>
            <div className={`${styles.avatar} ${styles.aiAvatar}`}>🧠</div>
            <div className={styles.typingBubble}>
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <div className={styles.suggestions}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className={styles.suggestion} onClick={() => sendMessage(s)}>{s}</button>
          ))}
        </div>
        <div className={styles.inputRow}>
          <textarea
            ref={taRef}
            className={styles.chatInput}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            onInput={autoResize}
            placeholder="Ask anything about your document..."
            rows={1}
            disabled={isLoading || isStreaming}
          />
          <button
            className={`${styles.sendBtn} ${(isLoading || isStreaming) ? styles.loading : ''}`}
            onClick={() => sendMessage()}
            disabled={isLoading || isStreaming || !input.trim()}
          >
            {isLoading || isStreaming ? <span className="spinner" style={{width:16,height:16}} /> : '➤'}
          </button>
        </div>
        <div className={styles.inputFooter}>
          Powered by Groq · Llama 3.1 70B · RAG pipeline · ChromaDB + HuggingFace embeddings
        </div>
      </div>
    </div>
  )
}

function getDocEmoji(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  return { pdf: '📄', docx: '📝', doc: '📝', txt: '📃', md: '📋', csv: '📊', xlsx: '📊' }[ext] || '📄'
}

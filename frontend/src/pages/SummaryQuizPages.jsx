// SummaryPage.jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { summaryAPI } from '../utils/api'
import { useDocStore, useUIStore } from '../store'
import toast from 'react-hot-toast'

const LEVELS = [
  { id: 'quick', label: '⚡ Quick', desc: '2–3 sentences' },
  { id: 'detailed', label: '📋 Detailed', desc: '1 page' },
  { id: 'full', label: '📚 Full breakdown', desc: 'Complete analysis' },
]

export function SummaryPage() {
  const { docId } = useParams()
  const { documents, activeDoc } = useDocStore()
  const { language } = useUIStore()
  const [level, setLevel] = useState('detailed')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const doc = docId ? documents.find(d => d.id === docId) || activeDoc : activeDoc

  async function generate() {
    if (!doc) { toast.error('Select a document first'); return }
    setLoading(true)
    setSummary('')
    try {
      const res = await summaryAPI.generate({ doc_id: doc.id, level, language })
      setSummary(res.data.summary)
    } catch { toast.error('Failed to generate summary') }
    setLoading(false)
  }

  function copy() { navigator.clipboard.writeText(summary); toast.success('Copied!') }
  function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([summary], { type: 'text/plain' }))
    a.download = `summary_${doc?.name || 'document'}.txt`
    a.click()
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
      {doc && <div style={{ fontSize:13, color:'var(--text3)' }}>Document: <strong style={{ color:'var(--text2)' }}>{doc.name}</strong></div>}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        {LEVELS.map(l => (
          <button key={l.id} className={`btn ${level===l.id?'btn-primary':'btn-ghost'}`} onClick={() => setLevel(l.id)}>
            {l.label} <span style={{ fontSize:11, opacity:.7 }}>({l.desc})</span>
          </button>
        ))}
        <button className="btn btn-cyan" style={{ marginLeft:'auto' }} onClick={generate} disabled={loading || !doc}>
          {loading ? <><span className="spinner" style={{width:14,height:14}} /> Generating...</> : 'Generate →'}
        </button>
      </div>

      <div className="card" style={{ flex:1, padding:20, minHeight:200, position:'relative' }}>
        {loading && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'3rem', gap:12 }}>
            <div className="spinner spinner-lg" />
            <div style={{ fontSize:13, color:'var(--text2)' }}>Groq Llama 3.1 70B is reading your document...</div>
          </div>
        )}
        {!loading && !summary && (
          <div style={{ textAlign:'center', padding:'3rem', color:'var(--text3)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'.75rem', opacity:.4 }}>📝</div>
            <div style={{ fontSize:14 }}>Select a level and click Generate</div>
          </div>
        )}
        {!loading && summary && (
          <div className="md-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown></div>
        )}
      </div>

      {summary && (
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={copy}>📋 Copy</button>
          <button className="btn btn-ghost btn-sm" onClick={download}>⬇️ Download</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(doc?.id ? `/app/quiz/${doc.id}` : '/app/quiz')}>🎯 Generate quiz from this</button>
        </div>
      )}
    </div>
  )
}

// QuizPage.jsx
import { quizAPI } from '../utils/api'

export function QuizPage() {
  const { docId } = useParams()
  const { documents, activeDoc } = useDocStore()
  const { language } = useUIStore()
  const [count, setCount] = useState(10)
  const [type, setType] = useState('mcq')
  const [difficulty, setDifficulty] = useState('medium')
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(false)

  const doc = docId ? documents.find(d => d.id === docId) || activeDoc : activeDoc

  async function generate() {
    if (!doc) { toast.error('Select a document first'); return }
    setLoading(true); setQuiz(null); setAnswers({}); setSubmitted(false); setScore(null)
    try {
      const res = await quizAPI.generate({ doc_id: doc.id, count, type, difficulty, language })
      setQuiz(res.data)
    } catch { toast.error('Failed to generate quiz') }
    setLoading(false)
  }

  function answer(qi, opt) {
    if (submitted) return
    setAnswers(a => ({ ...a, [qi]: opt }))
  }

  async function submit() {
    if (!quiz) return
    const ansArr = quiz.questions.map((_, i) => answers[i] ?? -1)
    try {
      const res = await quizAPI.submit(quiz.quiz_id, ansArr)
      setScore(res.data)
      setSubmitted(true)
    } catch { toast.error('Failed to submit') }
  }

  const allAnswered = quiz && Object.keys(answers).length === quiz.questions.length

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
      {doc && <div style={{ fontSize:13, color:'var(--text3)' }}>Document: <strong style={{ color:'var(--text2)' }}>{doc.name}</strong></div>}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        {[['count',count,setCount,[5,8,10,15]],['type',type,setType,['mcq','truefalse','mixed']],['difficulty',difficulty,setDifficulty,['easy','medium','hard']]].map(([label,val,setter,opts]) => (
          <select key={label} className="input" style={{ width:'auto', padding:'6px 10px' }} value={val} onChange={e => setter(isNaN(e.target.value) ? e.target.value : parseInt(e.target.value))}>
            {opts.map(o => <option key={o} value={o}>{label==='count' ? `${o} questions` : o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
          </select>
        ))}
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={generate} disabled={loading || !doc}>
          {loading ? <><span className="spinner" style={{width:14,height:14}} /> Generating...</> : '🎯 Generate quiz'}
        </button>
      </div>

      {score && (
        <div style={{ background:'linear-gradient(135deg,rgba(124,58,237,.15),rgba(0,212,255,.08))', border:'1px solid rgba(124,58,237,.25)', borderRadius:12, padding:20, textAlign:'center' }}>
          <div style={{ fontSize:32, fontWeight:800, color: score.score >= 80 ? 'var(--green)' : score.score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{score.score}%</div>
          <div style={{ fontSize:14, color:'var(--text2)', marginTop:4 }}>You got {score.correct} out of {score.total} correct</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>{score.score>=80?'🎉 Excellent!':score.score>=60?'👍 Good job!':'📚 Keep studying!'}</div>
        </div>
      )}

      {quiz?.questions?.map((q, i) => {
        const chosen = answers[i]
        const result = submitted && score?.results?.[i]
        return (
          <div key={i} className="card" style={{ padding:16 }}>
            <div style={{ fontSize:11, color:'var(--cyan)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Question {i+1} of {quiz.questions.length}</div>
            <div style={{ fontSize:14, fontWeight:500, marginBottom:12, lineHeight:1.5 }}>{q.q}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {q.options.map((opt, j) => {
                let bg = 'var(--bg3)', color = 'var(--text2)', border = 'var(--border2)'
                if (chosen === j && !submitted) { bg = 'rgba(124,58,237,.15)'; color = 'var(--purple2)'; border = 'var(--purple)' }
                if (submitted) {
                  if (j === q.answer) { bg = 'rgba(16,185,129,.1)'; color = 'var(--green)'; border = 'var(--green)' }
                  else if (chosen === j) { bg = 'rgba(239,68,68,.1)'; color = 'var(--red)'; border = 'var(--red)' }
                }
                return (
                  <div key={j} onClick={() => answer(i,j)} style={{ padding:'9px 14px', borderRadius:8, border:`1px solid ${border}`, background:bg, color, cursor:submitted?'default':'pointer', fontSize:13, transition:'all .15s' }}>
                    {opt}
                  </div>
                )
              })}
            </div>
            {submitted && result && (
              <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(0,212,255,.05)', border:'1px solid rgba(0,212,255,.15)', borderRadius:8, fontSize:12, color:'var(--text2)' }}>
                💡 {q.explanation}
              </div>
            )}
          </div>
        )
      })}

      {quiz && !submitted && allAnswered && (
        <button className="btn btn-primary btn-lg" style={{ justifyContent:'center' }} onClick={submit}>Submit quiz →</button>
      )}
      {!quiz && !loading && (
        <div style={{ textAlign:'center', padding:'3rem', color:'var(--text3)' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'.75rem', opacity:.4 }}>🎯</div>
          <div>Configure options above and click Generate</div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// DashboardPage.jsx
// ============================================================
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import { dashboardAPI } from '../utils/api'
import { useDocStore, useUIStore } from '../store'
import toast from 'react-hot-toast'

Chart.register(...registerables)

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: true,
  plugins: { legend: { labels: { color: '#9090b0', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#505070' }, grid: { color: '#1e1e32' } },
    y: { ticks: { color: '#505070' }, grid: { color: '#1e1e32' } }
  }
}

export function DashboardPage() {
  const { docId } = useParams()
  const { documents, activeDoc, setActiveDoc } = useDocStore()
  const { language } = useUIStore()
  const [dashData, setDashData] = useState(null)
  const [activeSheet, setActiveSheet] = useState(null)
  const [aiQ, setAiQ] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const navigate = useNavigate()

  useEffect(() => { if (docId) loadDashboard() }, [docId])

  async function loadDashboard() {
    try {
      const doc = documents.find(d => d.id === docId)
      if (doc) setActiveDoc(doc)
      const res = await dashboardAPI.getData(docId)
      setDashData(res.data)
      const sheets = res.data.sheets || {}
      setActiveSheet(Object.keys(sheets)[0] || null)
    } catch (err) { toast.error('Failed to load dashboard') }
  }

  async function askAI() {
    if (!aiQ.trim()) return
    setAiLoading(true)
    try {
      const res = await dashboardAPI.ask({ doc_id: docId, question: aiQ, language })
      setAiAnswer(res.data.answer)
    } catch { toast.error('AI query failed') }
    setAiLoading(false)
  }

  if (!dashData) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  const sheets = dashData.sheets || {}
  const sheet = sheets[activeSheet] || {}
  const data = sheet.data || []
  const headers = sheet.columns || []
  const numCols = headers.filter(h => data.slice(0,20).every(r => !isNaN(parseFloat(r[h])) || r[h] === '' || r[h] === null))
  const catCols = headers.filter(h => !numCols.includes(h))

  // Filter + sort
  let displayData = filter
    ? data.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(filter.toLowerCase())))
    : data
  if (sortCol) {
    displayData = [...displayData].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol]
      const cmp = !isNaN(parseFloat(va)) ? parseFloat(va) - parseFloat(vb) : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  // Chart datasets
  const barData = numCols[0] && catCols[0] ? {
    labels: data.slice(0, 12).map(r => String(r[catCols[0]]).slice(0, 15)),
    datasets: [{ label: numCols[0], data: data.slice(0, 12).map(r => parseFloat(r[numCols[0]]) || 0), backgroundColor: 'rgba(124,58,237,0.6)', borderColor: '#7c3aed', borderWidth: 1 }]
  } : null

  const lineData = numCols.length >= 2 ? {
    labels: data.slice(0, 20).map((_, i) => `#${i+1}`),
    datasets: [
      { label: numCols[0], data: data.slice(0,20).map(r => parseFloat(r[numCols[0]])||0), borderColor: '#00d4ff', tension: 0.4, fill: false },
      { label: numCols[1], data: data.slice(0,20).map(r => parseFloat(r[numCols[1]])||0), borderColor: '#9d5cf6', tension: 0.4, fill: false }
    ]
  } : null

  const doughnutData = catCols[0] ? (() => {
    const counts = {}
    data.forEach(r => { const v = String(r[catCols[0]]); counts[v] = (counts[v]||0)+1 })
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8)
    return { labels: top.map(x=>x[0].slice(0,20)), datasets: [{ data: top.map(x=>x[1]), backgroundColor: ['#7c3aed','#00d4ff','#10b981','#f59e0b','#ef4444','#4f46e5','#9d5cf6','#ec4899'] }] }
  })() : null

  // Stats
  const stats = numCols.slice(0,4).map(col => {
    const vals = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v))
    const sum = vals.reduce((a,b)=>a+b,0)
    return { col, sum, avg: sum/vals.length, max: Math.max(...vals), count: vals.length }
  })

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h3 style={{ fontSize:15, fontWeight:700 }}>📊 {dashData.name}</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/chat/${docId}`)}>💬 Chat with this</button>
      </div>

      {/* Sheet tabs */}
      {Object.keys(sheets).length > 1 && (
        <div style={{ display:'flex', gap:6 }}>
          {Object.keys(sheets).map(name => (
            <button key={name} className={`btn btn-sm ${activeSheet===name?'btn-primary':'btn-ghost'}`} onClick={() => setActiveSheet(name)}>{name}</button>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        <div className="card" style={{ padding:12 }}>
          <div style={{ fontSize:11, color:'var(--text3)' }}>Total rows</div>
          <div style={{ fontSize:22, fontWeight:700 }}>{data.length.toLocaleString()}</div>
          <div style={{ fontSize:11, color:'var(--text2)' }}>{headers.length} columns</div>
        </div>
        {stats.slice(0,3).map(s => (
          <div key={s.col} className="card" style={{ padding:12 }}>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{s.col}</div>
            <div style={{ fontSize:20, fontWeight:700 }}>{s.sum.toLocaleString(undefined,{maximumFractionDigits:1})}</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>Avg: {s.avg.toFixed(1)} · Max: {s.max.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {barData && <div className="card" style={{ padding:14 }}><div style={{ fontSize:12, fontWeight:500, color:'var(--text2)', marginBottom:8 }}>📊 {numCols[0]} by {catCols[0]}</div><Bar data={barData} options={CHART_OPTS} /></div>}
        {lineData && <div className="card" style={{ padding:14 }}><div style={{ fontSize:12, fontWeight:500, color:'var(--text2)', marginBottom:8 }}>📈 Trend comparison</div><Line data={lineData} options={CHART_OPTS} /></div>}
        {doughnutData && <div className="card" style={{ padding:14 }}><div style={{ fontSize:12, fontWeight:500, color:'var(--text2)', marginBottom:8 }}>🥧 {catCols[0]} distribution</div><Doughnut data={doughnutData} options={{ ...CHART_OPTS, scales: undefined }} /></div>}
      </div>

      {/* AI Q&A */}
      <div className="card" style={{ padding:14 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>🤖 Ask AI about this data</div>
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <input className="input" value={aiQ} onChange={e=>setAiQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&askAI()} placeholder="e.g. What is the highest sales value? Which category dominates?" />
          <button className="btn btn-primary" onClick={askAI} disabled={aiLoading}>{aiLoading ? <span className="spinner" style={{width:14,height:14}} /> : 'Ask →'}</button>
        </div>
        {aiAnswer && <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, background:'var(--bg3)', padding:12, borderRadius:8 }}>{aiAnswer}</div>}
      </div>

      {/* Data table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>📋 Raw data — {data.length.toLocaleString()} rows</span>
          <input className="input" style={{ width:200, padding:'5px 10px', fontSize:12 }} placeholder="🔍 Filter rows..." value={filter} onChange={e=>setFilter(e.target.value)} />
        </div>
        <div style={{ overflowX:'auto', maxHeight:300, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>{headers.map(h => (
                <th key={h} onClick={()=>handleSort(h)} style={{ background:'var(--bg3)', padding:'8px 12px', textAlign:'left', color:'var(--text2)', fontWeight:500, borderBottom:'1px solid var(--border)', cursor:'pointer', whiteSpace:'nowrap' }}>
                  {h} {sortCol===h ? (sortDir==='asc'?'↑':'↓') : '↕'}
                </th>
              ))}</tr>
            </thead>
            <tbody>
              {displayData.slice(0,100).map((row, i) => (
                <tr key={i} style={{ ':hover':{ background:'var(--bg3)' } }}>
                  {headers.map(h => (
                    <td key={h} style={{ padding:'7px 12px', borderBottom:'1px solid var(--border)', color: !isNaN(parseFloat(row[h])) ? parseFloat(row[h]) < 0 ? 'var(--red)' : 'var(--cyan)' : 'var(--text2)', whiteSpace:'nowrap' }}>
                      {String(row[h] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayData.length > 100 && <div style={{ padding:'6px 14px', fontSize:11, color:'var(--text3)', borderTop:'1px solid var(--border)' }}>Showing 100 of {displayData.length} rows</div>}
      </div>
    </div>
  )
}
export default DashboardPage

'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { FileText, Zap, Shield, Globe, BarChart3, Brain, CheckCircle, ArrowRight, Star, Users, Upload, MessageSquare } from 'lucide-react'

const FEATURES = [
  { icon: MessageSquare, title: 'Chat with any document', desc: 'Ask questions in plain language. Get cited, accurate answers from PDF, Word, TXT, CSV — powered by Groq Llama 3.3 70B.', color: '#6c3de8' },
  { icon: BarChart3, title: 'Data dashboard + AI', desc: 'Upload CSV or Excel → auto-generates bar, line, pie, scatter charts + AI Q&A on your data. No BI tool needed.', color: '#4f46e5' },
  { icon: Brain, title: 'Smart summarizer', desc: '3 levels: Quick (2 lines), Detailed (1 page), Full breakdown. Download or copy your summary instantly.', color: '#0891b2' },
  { icon: Zap, title: 'Quiz generator', desc: 'Auto-generate MCQ and True/False questions from any document. AI-graded with explanations and scores.', color: '#059669' },
  { icon: Globe, title: 'Tamil · Hindi · Telugu', desc: 'First document AI platform built for India. Upload in English, ask in Tamil, get answers in Tamil.', color: '#d97706' },
  { icon: Shield, title: '100% private & local', desc: 'Documents are processed on your server. No content ever sent to third parties. Bank-grade privacy.', color: '#dc2626' },
]

const PRICING = [
  { name: 'Free', price: '₹0', usd: '$0', period: 'forever', docs: 3, highlight: false, features: ['3 documents / month', '20 questions / day', 'Chat + summary', 'Basic dashboard'] },
  { name: 'Student', price: '₹299', usd: '$4', period: '/month', docs: 50, highlight: true, features: ['50 documents / month', 'Unlimited questions', 'Quiz generator', 'Tamil & Hindi support', 'All summary levels', 'Priority processing'] },
  { name: 'Professional', price: '₹999', usd: '$12', period: '/month', docs: 200, highlight: false, features: ['200 documents / month', 'Team workspace (3 members)', 'Data extraction + export', 'Document comparison', 'API access (1K calls/mo)', 'All languages'] },
  { name: 'Business', price: '₹4,999', usd: '$60', period: '/month', docs: -1, highlight: false, features: ['Unlimited documents', '10 team members', 'Unlimited API access', 'Custom branding', 'Priority SLA', 'On-premise option'] },
]

const STATS = [{ value: '10+', label: 'File formats' }, { value: '3', label: 'Indian languages' }, { value: '5', label: 'AI modules' }, { value: '₹0', label: 'To get started' }]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-light)' : 'none',
        transition: 'all 0.3s',
        padding: '0 5%', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6c3de8,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🧠</div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}>Docu<span style={{ color: 'var(--brand-purple)' }}>Mind</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/app" className="btn btn-primary btn-sm">Open App <ArrowRight size={13} /></Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 5% 80px', background: 'linear-gradient(160deg, #faf8ff 0%, #f0f4ff 40%, #f0fbff 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative blobs */}
        <div style={{ position:'absolute',top:-80,right:-80,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(108,61,232,0.1) 0%,transparent 70%)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:-60,left:-60,width:350,height:350,borderRadius:'50%',background:'radial-gradient(circle,rgba(6,182,212,0.08) 0%,transparent 70%)',pointerEvents:'none' }} />

        <div className="badge badge-purple" style={{ marginBottom: 20, fontSize: 12 }}>
          <span style={{ width:6,height:6,borderRadius:'50%',background:'#059669',animation:'pulse 2s infinite',flexShrink:0 }} />
          Built in Tamil Nadu · Powered by Groq + HuggingFace
        </div>

        <h1 style={{ maxWidth: 820, marginBottom: 22 }}>
          Chat with any document
          <br /><span className="gradient-text">in seconds</span>
        </h1>

        <p style={{ fontSize: 18, maxWidth: 580, marginBottom: 40, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Upload PDFs, Excel, Word docs — ask questions, get cited answers, generate summaries and quizzes. Enterprise-grade AI, built for students and companies.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 60 }}>
          <Link href="/app" className="btn btn-primary btn-xl">
            Start free — no card needed <ArrowRight size={16} />
          </Link>
          <Link href="/app" className="btn btn-secondary btn-xl">Sign in</Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 60 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-purple)', letterSpacing:'-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Product preview */}
        <div style={{ width:'100%',maxWidth:900,background:'var(--bg-primary)',borderRadius:20,border:'1px solid var(--border-light)',boxShadow:'0 24px 80px rgba(15,17,23,0.12)',overflow:'hidden' }}>
          {/* Browser bar */}
          <div style={{ background:'var(--bg-secondary)',borderBottom:'1px solid var(--border-light)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ display:'flex',gap:5 }}>
              {['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{ width:10,height:10,borderRadius:'50%',background:c }} />)}
            </div>
            <div style={{ flex:1,background:'var(--bg-primary)',borderRadius:6,padding:'4px 12px',fontSize:11,color:'var(--text-tertiary)',border:'1px solid var(--border-light)',margin:'0 12px',textAlign:'left' }}>app.documind.ai</div>
          </div>
          {/* App preview */}
          <div style={{ display:'grid',gridTemplateColumns:'220px 1fr',height:360 }}>
            {/* Sidebar */}
            <div style={{ borderRight:'1px solid var(--border-light)',padding:14,background:'var(--bg-secondary)' }}>
              <div style={{ fontSize:10,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8 }}>Documents</div>
              {[{n:'ML_Textbook.pdf',s:'ready',c:186},{n:'Q3_Report.xlsx',s:'ready',c:42},{n:'HR_Policy.docx',s:'ready',c:94}].map(d=>(
                <div key={d.n} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,marginBottom:4,background:d.n==='ML_Textbook.pdf'?'var(--brand-purple-bg)':'transparent',border:d.n==='ML_Textbook.pdf'?'1px solid var(--brand-purple-border)':'1px solid transparent' }}>
                  <span style={{ fontSize:14 }}>{d.n.endsWith('.pdf')?'📄':d.n.endsWith('.xlsx')?'📊':'📝'}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:11,fontWeight:500,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.n}</div>
                    <div style={{ fontSize:10,color:'var(--text-tertiary)' }}>{d.c} chunks · ready</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Chat */}
            <div style={{ display:'flex',flexDirection:'column',padding:16,gap:12 }}>
              <div style={{ alignSelf:'flex-end',background:'linear-gradient(135deg,#6c3de8,#4f46e5)',color:'white',padding:'9px 14px',borderRadius:'12px 12px 3px 12px',fontSize:13,maxWidth:'70%' }}>
                What is gradient descent and how does backpropagation use it?
              </div>
              <div style={{ alignSelf:'flex-start',background:'var(--bg-secondary)',border:'1px solid var(--border-light)',padding:'10px 14px',borderRadius:'3px 12px 12px 12px',fontSize:12,color:'var(--text-secondary)',maxWidth:'80%',lineHeight:1.6 }}>
                <strong style={{ color:'var(--text-primary)' }}>Gradient descent</strong> is an optimization algorithm that minimizes loss by moving parameters in the direction of steepest descent. <span style={{ background:'var(--brand-purple-bg)',color:'var(--brand-purple)',fontSize:10,padding:'1px 6px',borderRadius:4,fontWeight:600 }}>pg. 47</span>
                <br /><br />Backpropagation computes the gradient of the loss with respect to each weight using the chain rule... <span style={{ background:'var(--brand-purple-bg)',color:'var(--brand-purple)',fontSize:10,padding:'1px 6px',borderRadius:4,fontWeight:600 }}>pg. 52</span>
              </div>
              <div style={{ marginTop:'auto',display:'flex',gap:8 }}>
                <div style={{ flex:1,background:'var(--bg-primary)',border:'1px solid var(--border-medium)',borderRadius:8,padding:'9px 12px',fontSize:12,color:'var(--text-placeholder)' }}>Ask anything about your document...</div>
                <div style={{ width:36,height:36,borderRadius:8,background:'linear-gradient(135deg,#6c3de8,#4f46e5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:'white',flexShrink:0 }}>➤</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '100px 5%', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign:'center', marginBottom: 60 }}>
            <div className="badge badge-purple" style={{ marginBottom:14 }}>Features</div>
            <h2>Everything from any document</h2>
            <p style={{ fontSize:16, marginTop:10, maxWidth:520, margin:'10px auto 0' }}>One platform for students, teams, and enterprises — powered by the same AI your team deserves.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="card" style={{ padding:24 }}>
                <div style={{ width:44,height:44,borderRadius:11,background:`${f.color}15`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14 }}>
                  <f.icon size={22} color={f.color} />
                </div>
                <h3 style={{ fontSize:15,marginBottom:7 }}>{f.title}</h3>
                <p style={{ fontSize:13,lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '100px 5%', background: 'linear-gradient(160deg,#faf8ff,#f0f4ff)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign:'center', marginBottom: 60 }}>
            <div className="badge badge-purple" style={{ marginBottom:14 }}>Pricing</div>
            <h2>Simple, honest pricing</h2>
            <p style={{ fontSize:16, marginTop:10 }}>Start free. Upgrade when you grow. No hidden fees, ever.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:16, alignItems:'start' }}>
            {PRICING.map(p => (
              <div key={p.name} className="card" style={{ padding:24, position:'relative', border: p.highlight?'2px solid var(--brand-purple)':'', background:p.highlight?'var(--brand-purple-bg)':'' }}>
                {p.highlight && <div style={{ position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#6c3de8,#4f46e5)',color:'white',fontSize:11,fontWeight:700,padding:'4px 16px',borderRadius:100,whiteSpace:'nowrap' }}>Most popular</div>}
                <div style={{ fontSize:13,fontWeight:600,color:'var(--text-tertiary)',marginBottom:6 }}>{p.name}</div>
                <div style={{ fontSize:30,fontWeight:800,letterSpacing:'-0.04em',marginBottom:2 }}>{p.price}</div>
                <div style={{ fontSize:12,color:'var(--text-tertiary)',marginBottom:20 }}>{p.usd} · {p.period}</div>
                <ul style={{ listStyle:'none',marginBottom:24,display:'flex',flexDirection:'column',gap:7 }}>
                  {p.features.map(f=>(
                    <li key={f} style={{ display:'flex',alignItems:'center',gap:8,fontSize:13 }}>
                      <CheckCircle size={14} color="#059669" style={{ flexShrink:0 }} />
                      <span style={{ color:'var(--text-secondary)' }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/app" className={`btn ${p.highlight?'btn-primary':'btn-secondary'} w-full`} style={{ justifyContent:'center',width:'100%' }}>
                  {p.name==='Business'?'Contact sales':'Get started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'80px 5%',background:'linear-gradient(135deg,#6c3de8,#4f46e5)',textAlign:'center' }}>
        <h2 style={{ color:'white',marginBottom:12 }}>Ready to work smarter?</h2>
        <p style={{ color:'rgba(255,255,255,0.75)',fontSize:16,marginBottom:32 }}>Join thousands of students and companies already using DocuMind AI.</p>
        <Link href="/app" style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'14px 36px',borderRadius:14,background:'white',color:'var(--brand-purple)',fontWeight:700,fontSize:15,textDecoration:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
          Start free today <ArrowRight size={16} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'var(--bg-primary)',borderTop:'1px solid var(--border-light)',padding:'40px 5%' }}>
        <div style={{ maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16 }}>
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:9,marginBottom:6 }}>
              <div style={{ width:28,height:28,borderRadius:7,background:'linear-gradient(135deg,#6c3de8,#4f46e5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>🧠</div>
              <span style={{ fontWeight:800,fontSize:15 }}>Docu<span style={{ color:'var(--brand-purple)' }}>Mind</span> AI</span>
            </div>
            <p style={{ fontSize:12,color:'var(--text-tertiary)' }}>Built by <strong style={{ color:'var(--text-secondary)' }}>MOH AI TECH</strong> · Namakkal, Tamil Nadu 🇮🇳</p>
          </div>
          <div style={{ fontSize:12,color:'var(--text-tertiary)',textAlign:'right' }}>
            <div>info@mohaitech.in</div>
            <div style={{ marginTop:3 }}>MSME Registered · B.Tech AI & Data Science</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

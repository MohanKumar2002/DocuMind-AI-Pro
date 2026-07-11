// ============ LoginPage.jsx ============
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../utils/api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [form, setForm] = useState({ email: 'test@example.com', password: 'password123' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      login(res.data.user, res.data.access_token)
      toast.success(`Welcome back, ${res.data.user.full_name?.split(' ')[0]}!`)
      navigate('/app')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'var(--bg)' }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#00d4ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 12px' }}>🧠</div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Welcome back</h1>
          <p style={{ fontSize:14, color:'var(--text3)' }}>Sign in to your DocuMind account</p>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required />
          </div>
          <div>
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ justifyContent:'center', marginTop:4 }}>
            {loading ? <><span className="spinner" style={{width:16,height:16}} /> Signing in...</> : 'Sign in →'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:13, color:'var(--text3)', marginTop:20 }}>
          Don't have an account? <Link to="/signup" style={{ color:'var(--purple2)' }}>Create one free</Link>
        </p>
      </div>
    </div>
  )
}

// ============ SignupPage.jsx ============
export function SignupPage() {
  const [form, setForm] = useState({ full_name:'', email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.signup(form)
      login(res.data.user, res.data.access_token)
      toast.success('Account created! Welcome to DocuMind AI 🎉')
      navigate('/app')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'var(--bg)' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#00d4ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 12px' }}>🧠</div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Create your account</h1>
          <p style={{ fontSize:14, color:'var(--text3)' }}>Start with 3 free documents — no credit card required</p>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[['full_name','Full name','text','Mohan Kumar'],['email','Email','email','you@company.com'],['password','Password','password','••••••••']].map(([key,label,type,ph]) => (
            <div key={key}>
              <label className="input-label">{label}</label>
              <input className="input" type={type} placeholder={ph} value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} required />
            </div>
          ))}
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ justifyContent:'center', marginTop:4 }}>
            {loading ? <><span className="spinner" style={{width:16,height:16}} /> Creating account...</> : 'Create account →'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:13, color:'var(--text3)', marginTop:20 }}>
          Already have an account? <Link to="/login" style={{ color:'var(--purple2)' }}>Sign in</Link>
        </p>
        <p style={{ textAlign:'center', fontSize:11, color:'var(--text3)', marginTop:10 }}>
          Built by MOH AI TECH · Namakkal, Tamil Nadu 🇮🇳
        </p>
      </div>
    </div>
  )
}

// ============ ProfilePage.jsx ============
export function ProfilePage() {
  const { user, updatePlan } = useAuthStore()
  const navigate = useNavigate()
  const PLAN_COLORS = { free:'#606080', student:'#9d5cf6', pro:'#00d4ff', business:'#10b981' }
  const PLAN_LIMITS = { free:3, student:50, pro:200, business:999999 }
  const plan = user?.plan || 'free'
  const limit = PLAN_LIMITS[plan]

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:16, maxWidth:700, margin:'0 auto' }}>
      <h2 style={{ marginBottom:20 }}>👤 Profile</h2>
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,var(--purple),var(--indigo))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700 }}>{user?.full_name?.[0]?.toUpperCase()||'M'}</div>
          <div>
            <div style={{ fontSize:18, fontWeight:700 }}>{user?.full_name}</div>
            <div style={{ fontSize:13, color:'var(--text3)' }}>{user?.email}</div>
            <span className="badge badge-purple" style={{ marginTop:6, color:PLAN_COLORS[plan] }}>{plan.toUpperCase()} PLAN</span>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginBottom:14 }}>
        <h4 style={{ marginBottom:12 }}>Usage this month</h4>
        {[['Documents',user?.docs_used||0,limit===999999?'∞':limit],['Questions',(user?.questions_used||0),plan==='free'?20:plan==='student'?500:plan==='pro'?5000:'∞']].map(([label,used,max]) => (
          <div key={label} style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)', marginBottom:4 }}>
              <span>{label}</span><span>{used} / {max}</span>
            </div>
            <div style={{ height:5, background:'var(--bg5)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,var(--purple),var(--cyan))', borderRadius:3, width:`${typeof max==='number'?Math.min((used/max)*100,100):30}%`, transition:'width .5s' }} />
            </div>
          </div>
        ))}
      </div>
      {plan !== 'business' && (
        <button className="btn btn-primary btn-lg" style={{ justifyContent:'center', width:'100%' }} onClick={() => navigate('/pricing')}>
          ⚡ Upgrade Plan
        </button>
      )}
    </div>
  )
}

// ============ HardwareWarning.jsx ============
export function HardwareWarning({ onDismiss }) {
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000, background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.3)', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>⚠️</span>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--amber)' }}>DocuMind runs AI locally on your device</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>For the best experience, use a desktop or laptop computer with a modern browser (Chrome/Edge). Mobile devices may have limited performance.</div>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onDismiss}>Dismiss</button>
    </div>
  )
}

// ============ LandingPage.jsx ============
export function LandingPage() {
  const navigate = useNavigate()
  const FEATURES = [
    { icon:'💬', title:'Chat with any document', desc:'Ask questions in plain language. Get cited answers from PDF, Word, TXT in seconds.' },
    { icon:'📊', title:'Data dashboard', desc:'Upload CSV/Excel → auto bar, line, pie, scatter charts + AI questions on your data.' },
    { icon:'📝', title:'AI summarizer', desc:'3 levels: Quick (2 lines), Detailed (1 page), Full breakdown. Copy or download.' },
    { icon:'🎯', title:'Quiz generator', desc:'Auto-generate MCQ and True/False questions from any document. Self-grading with scores.' },
    { icon:'🌐', title:'Tamil · Hindi · Telugu', desc:'First document AI built for India. Ask in Tamil, get answers in Tamil.' },
    { icon:'🔒', title:'100% private', desc:'No data ever leaves your device. Bank-grade privacy. No API logs.' },
  ]
  const PRICING = [
    { name:'Free', price:'₹0', period:'forever', features:['3 documents/month','Chat + summary','Basic dashboard'], cta:'Start free', primary:false },
    { name:'Student', price:'₹299', period:'/month', features:['50 documents/month','Quiz generator','Tamil & Hindi support','All summary levels'], cta:'Start free trial', primary:true },
    { name:'Professional', price:'₹999', period:'/month', features:['200 documents/month','Team workspace','Data extraction','API access'], cta:'Start free trial', primary:false },
    { name:'Business', price:'₹4,999', period:'/month', features:['Unlimited documents','10 team members','Custom branding','Priority SLA'], cta:'Contact sales', primary:false },
  ]
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, background:'rgba(8,8,14,.85)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:16 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,var(--purple),var(--cyan))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🧠</div>
          Docu<span style={{ color:'var(--cyan)' }}>Mind</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign in</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>Start free</button>
        </div>
      </nav>
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'100px 24px 60px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-100, left:-200, width:600, height:600, borderRadius:'50%', background:'var(--purple)', filter:'blur(140px)', opacity:.12, pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-100, right:-150, width:500, height:500, borderRadius:'50%', background:'var(--cyan)', filter:'blur(140px)', opacity:.1, pointerEvents:'none' }} />
        <div className="badge badge-purple" style={{ marginBottom:20 }}>🟢 Now with Tamil, Hindi & Telugu</div>
        <h1 style={{ maxWidth:800, marginBottom:20 }}>Chat with any document <span className="grad-text">instantly</span></h1>
        <p style={{ fontSize:18, maxWidth:580, marginBottom:36 }}>Upload PDFs, Excel, Word docs. Ask questions, get summaries, generate quizzes — powered by Groq + HuggingFace. 100% private.</p>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginBottom:48 }}>
          <button className="btn btn-cyan btn-lg" onClick={() => navigate('/signup')}>Start free — no card needed →</button>
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>Sign in</button>
        </div>
        <div style={{ display:'flex', gap:36, color:'var(--text2)', fontSize:14 }}>
          {[['10+','File formats'],['3','Indian languages'],['₹0','To start']].map(([v,l]) => (
            <div key={l} style={{ textAlign:'center' }}><strong style={{ fontSize:20, fontWeight:700, color:'var(--text)', display:'block' }}>{v}</strong>{l}</div>
          ))}
        </div>
      </section>
      <section style={{ padding:'4rem 24px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:12, color:'var(--cyan)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600, marginBottom:10 }}>Features</div>
          <h2>Everything from any document</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card" style={{ transition:'all .2s' }}>
              <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
              <h3 style={{ fontSize:15, marginBottom:6 }}>{f.title}</h3>
              <p style={{ fontSize:13 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding:'4rem 24px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:12, color:'var(--cyan)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600, marginBottom:10 }}>Pricing</div>
          <h2>Simple, honest pricing</h2>
          <p style={{ fontSize:15, color:'var(--text3)', marginTop:8 }}>Start free. Upgrade when you need more. No hidden fees.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14 }}>
          {PRICING.map(p => (
            <div key={p.name} className="card" style={{ border:p.primary?'1px solid var(--purple)':'', background:p.primary?'rgba(124,58,237,.05)':'', position:'relative', padding:20 }}>
              {p.primary && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,var(--purple),var(--indigo))', color:'white', fontSize:11, fontWeight:600, padding:'3px 14px', borderRadius:100, whiteSpace:'nowrap' }}>Most popular</div>}
              <div style={{ fontSize:13, color:'var(--text3)', marginBottom:6 }}>{p.name}</div>
              <div style={{ fontSize:28, fontWeight:800, marginBottom:2 }}>{p.price}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>{p.period}</div>
              <ul style={{ listStyle:'none', marginBottom:20 }}>
                {p.features.map(f => <li key={f} style={{ fontSize:13, color:'var(--text2)', padding:'4px 0', display:'flex', gap:7 }}><span style={{ color:'var(--green)', fontWeight:700 }}>✓</span>{f}</li>)}
              </ul>
              <button className={`btn ${p.primary?'btn-primary':'btn-ghost'} w-full`} style={{ justifyContent:'center' }} onClick={() => navigate('/signup')}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>
      <footer style={{ borderTop:'1px solid var(--border)', padding:'2rem 24px', textAlign:'center' }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Docu<span style={{ color:'var(--cyan)' }}>Mind</span> AI</div>
        <p style={{ fontSize:12, color:'var(--text3)' }}>Built by <strong style={{ color:'var(--text2)' }}>MOH AI TECH</strong> · Namakkal, Tamil Nadu, India · MSME Registered</p>
        <p style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>info@mohaitech.in · moh-ai-tech.vercel.app</p>
      </footer>
    </div>
  )
}

// ============ PricingPage.jsx ============
export function PricingPage() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'80px 24px 60px' }}>
      <div style={{ textAlign:'center', marginBottom:40 }}>
        <h1 style={{ marginBottom:12 }}>Simple <span className="grad-text">pricing</span></h1>
        <p style={{ fontSize:16, color:'var(--text3)' }}>Start free. Pay when you grow. Cancel anytime.</p>
      </div>
      <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
        {[
          { name:'Free', inr:'₹0', usd:'$0', period:'forever', docs:3, q:20, features:['3 docs/month','20 questions/day','Chat + basic summary'], btn:'Get started', style:{} },
          { name:'Student', inr:'₹299', usd:'$4', period:'/month', docs:50, q:500, features:['50 docs/month','Quiz generator','Tamil & Hindi','All summary levels'], btn:'Start trial', style:{ border:'1px solid var(--purple)', background:'rgba(124,58,237,.05)' } },
          { name:'Pro', inr:'₹999', usd:'$12', period:'/month', docs:200, q:5000, features:['200 docs/month','Team workspace','API access','Data extraction'], btn:'Start trial', style:{} },
          { name:'Business', inr:'₹4,999', usd:'$60', period:'/month', docs:'∞', q:'∞', features:['Unlimited docs','10 team members','Custom branding','Priority SLA'], btn:'Contact sales', style:{} },
        ].map(p => (
          <div key={p.name} className="card" style={{ ...p.style, padding:20 }}>
            <div style={{ fontSize:13, color:'var(--text3)', marginBottom:6 }}>{p.name}</div>
            <div style={{ fontSize:26, fontWeight:800, marginBottom:2 }}>{p.inr}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:16 }}>{p.usd} · {p.period}</div>
            <ul style={{ listStyle:'none', marginBottom:20 }}>
              {p.features.map(f => <li key={f} style={{ fontSize:12, color:'var(--text2)', padding:'4px 0', display:'flex', gap:7 }}><span style={{ color:'var(--green)' }}>✓</span>{f}</li>)}
            </ul>
            <button className="btn btn-primary w-full" style={{ justifyContent:'center' }} onClick={() => navigate('/signup')}>{p.btn}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

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

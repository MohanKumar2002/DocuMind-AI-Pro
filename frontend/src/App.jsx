import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore, useUIStore } from './store'
import { authAPI } from './utils/api'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AppLayout from './components/layout/AppLayout'
import UploadPage from './pages/UploadPage'
import UnifiedDocumentPage from './pages/UnifiedDocumentPage'
import DashboardPage from './pages/DashboardPage'
import SummaryPage from './pages/SummaryPage'
import QuizPage from './pages/QuizPage'
import ExtractionPage from './pages/ExtractionPage'
import PricingPage from './pages/PricingPage'
import ProfilePage from './pages/ProfilePage'

// Hardware warning component
import HardwareWarning from './components/ui/HardwareWarning'

import './index.css'

// ── Protected route wrapper ──
function Protected({ children }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return children
}

// ── Public only (redirect if logged in) ──
function PublicOnly({ children }) {
  const { token } = useAuthStore()
  if (token) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  const { token, setUser, logout } = useAuthStore()
  const { hardwareWarning, setHardwareWarning } = useUIStore()

  // Verify token and load user on mount
  useEffect(() => {
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => logout())
    }
  }, [])

  // Hardware capability check
  useEffect(() => {
    const ua = navigator.userAgent
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry/i.test(ua)
    const hasWebGL = (() => {
      try { return !!document.createElement('canvas').getContext('webgl') }
      catch { return false }
    })()
    if (isMobile || !hasWebGL) setHardwareWarning(true)
  }, [])

  return (
    <BrowserRouter>
      {hardwareWarning && <HardwareWarning onDismiss={() => setHardwareWarning(false)} />}

      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
        <Route path="/pricing" element={<PricingPage />} />

        <Route path="/app" element={<Protected><AppLayout /></Protected>}>
          <Route index element={<Navigate to="/app/upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="chat/:docId?" element={<UnifiedDocumentPage />} />
          <Route path="dashboard/:docId?" element={<DashboardPage />} />
          <Route path="summary/:docId?" element={<SummaryPage />} />
          <Route path="quiz/:docId?" element={<QuizPage />} />
          <Route path="extraction/:docId?" element={<ExtractionPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border2)', fontSize: '13px' },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'white' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: 'white' } },
        }}
      />
    </BrowserRouter>
  )
}

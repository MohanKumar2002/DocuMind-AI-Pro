import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import toast from 'react-hot-toast'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <div className={styles.layout}>
      {/* ── Top Navigation ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft} onClick={() => navigate('/app/upload')}>
          <div className={styles.logoIcon}>🧠</div>
          <div className={styles.logoText}>DocuMind <span>AI</span></div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.navLinks}>
            <NavLink to="/app/dashboard" className={({ isActive }) => isActive ? styles.navActive : styles.navLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Dashboard
            </NavLink>
            <NavLink to="/pricing" className={styles.navLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Plans
            </NavLink>
          </div>
          <div className={styles.userChip} onClick={handleLogout} title="Click to logout">
            {user?.full_name?.[0]?.toUpperCase() || 'M'}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

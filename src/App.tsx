import React, { useState, useEffect, createContext, useContext } from 'react'
import {
  LayoutDashboard, Users, FileText, CheckSquare, UserCog,
  MessageSquare, Settings, LogOut, TrendingUp
} from 'lucide-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Engagements from './pages/Engagements'
import Invoices from './pages/Invoices'
import Tasks from './pages/Tasks'
import Interactions from './pages/Interactions'
import SettingsPage from './pages/SettingsPage'
import Team from './pages/Team'
import { ToastProvider } from './components/Toast'
import { api, setToken, getToken, clearToken } from './lib/api'

export const AuthContext = createContext<any>(null)
export const useAuth = () => useContext(AuthContext)

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',   icon: LayoutDashboard, section: 'MAIN' },
  { id: 'clients',      label: 'Clients',      icon: Users,           section: 'CRM' },
  { id: 'engagements',  label: 'Pipeline',     icon: TrendingUp,      section: 'CRM' },
  { id: 'interactions', label: 'Interactions', icon: MessageSquare,   section: 'CRM' },
  { id: 'invoices',     label: 'Invoices',     icon: FileText,        section: 'FINANCE' },
  { id: 'tasks',        label: 'Tasks',        icon: CheckSquare,     section: 'WORK' },
  { id: 'team',         label: 'Team',          icon: UserCog,         section: 'SYSTEM' },
  { id: 'settings',     label: 'Settings',     icon: Settings,        section: 'SYSTEM' },
]

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [page, setPage] = useState('dashboard')
  const [checking, setChecking] = useState(true)

  // Restore session from localStorage on page load
  useEffect(() => {
    const token    = getToken()
    const saved    = localStorage.getItem('crm_user')
    if (token && saved) {
      try { setUser(JSON.parse(saved)) } catch { clearToken() }
    }
    setChecking(false)
  }, [])

  const login = (u: any, token: string) => {
    setToken(token)
    localStorage.setItem('crm_user', JSON.stringify(u))
    setUser(u)
  }

  const logout = async () => {
    try { await api.auth.logout() } catch {}
    clearToken()
    localStorage.removeItem('crm_user')
    setUser(null)
    setPage('dashboard')
  }

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#6b7280', fontSize: 13 }}>
      Loading...
    </div>
  )

  if (!user) return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <ToastProvider><Login /></ToastProvider>
    </AuthContext.Provider>
  )

  const sections = [...new Set(NAV.map(n => n.section))]
  const initials = user.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard />
      case 'clients':      return <Clients />
      case 'engagements':  return <Engagements />
      case 'interactions': return <Interactions />
      case 'invoices':     return <Invoices />
      case 'tasks':        return <Tasks />
      case 'team':         return <Team />
      case 'settings':     return <SettingsPage />
      default:             return <Dashboard />
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <ToastProvider>
        <div className="app-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="firm-name">SAGUARO</div>
              <div className="firm-sub">PRIVATE EQUITY · CRM</div>
            </div>

            <nav className="sidebar-nav">
              {sections.map(section => (
                <div key={section}>
                  <div className="nav-section-label">{section}</div>
                  {NAV.filter(n => n.section === section).map(n => (
                    <div
                      key={n.id}
                      className={`nav-item ${page === n.id ? 'active' : ''}`}
                      onClick={() => setPage(n.id)}
                    >
                      <n.icon />
                      {n.label}
                    </div>
                  ))}
                </div>
              ))}
            </nav>

            <div className="sidebar-footer">
              <div className="user-info">
                <div className="user-avatar">{initials}</div>
                <div>
                  <div className="user-name">{user.name || user.username}</div>
                  <div className="user-role">{user.role}</div>
                </div>
                <button className="btn btn-icon" style={{ marginLeft: 'auto' }} onClick={logout} title="Sign out">
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="main-content">
            {renderPage()}
          </main>
        </div>
      </ToastProvider>
    </AuthContext.Provider>
  )
}

import React, { useState } from 'react'
import { Lock, User, Globe } from 'lucide-react'
import { useAuth } from '../App'
import { api } from '../lib/api'

export default function Login() {
  const { login }   = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res: any = await api.auth.login({ username, password })
      if (res.success) login(res.user, res.token)
      else setError(res.error || 'Invalid credentials')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to connect to server. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Logo / Brand */}
        <div className="login-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={18} color="var(--accent-light)" />
            </div>
          </div>
          <div className="firm">SAGUARO</div>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, letterSpacing: 2, marginTop: 2 }}>
            PRIVATE EQUITY
          </div>
          <div className="sub" style={{ marginTop: 6 }}>CRM & Invoice Management System</div>
        </div>

        <hr className="login-divider" />

        <form onSubmit={handleLogin}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="search-bar">
              <User size={13} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="search-bar">
              <Lock size={13} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '10px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--text-muted)' }}>
          Default: <strong style={{ color: 'var(--text-secondary)' }}>admin</strong> / <strong style={{ color: 'var(--text-secondary)' }}>saguaro2025</strong>
        </div>

        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
          Web-based · Runs on any browser
        </div>
      </div>
    </div>
  )
}

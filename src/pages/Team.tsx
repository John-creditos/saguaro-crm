import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Users, Key, Shield, User } from 'lucide-react'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { useAuth } from '../App'

const ROLES = ['admin', 'staff']
const ROLE_BADGE: any = { admin: 'badge-navy', staff: 'badge-blue' }

const emptyForm = () => ({ name: '', username: '', password: '', role: 'staff' })

export default function Team() {
  const toast = useToast()
  const { user: currentUser } = useAuth()
  const [members,  setMembers]  = useState<any[]>([])
  const [modal,    setModal]    = useState(false)
  const [pwModal,  setPwModal]  = useState<any>(null)
  const [editing,  setEditing]  = useState<any>(null)
  const [form,     setForm]     = useState<any>(emptyForm())
  const [newPw,    setNewPw]    = useState('')
  const [saving,   setSaving]   = useState(false)

  const load = () => api.team.getAll().then((d: any) => setMembers(d))
  useEffect(() => { load() }, [])

  const openNew  = () => { setForm(emptyForm()); setEditing(null); setModal(true) }
  const openEdit = (m: any) => { setForm({ name: m.name, username: m.username, password: '', role: m.role }); setEditing(m); setModal(true) }
  const close    = () => { setModal(false); setEditing(null); setForm(emptyForm()) }
  const f        = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.username.trim()) return toast('Username required', 'error')
    if (!editing && !form.password) return toast('Password required for new user', 'error')
    if (form.password && form.password.length < 6) return toast('Password must be 6+ characters', 'error')
    setSaving(true)
    try {
      if (editing) {
        await api.team.update({ id: editing.id, name: form.name, role: form.role, password: form.password || undefined })
      } else {
        await api.team.create(form)
      }
      toast(editing ? 'Team member updated' : 'Team member added')
      close(); load()
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Error saving', 'error')
    } finally { setSaving(false) }
  }

  const del = async (m: any) => {
    if (m.username === 'admin') return toast('Cannot delete the admin account', 'error')
    if (!confirm(`Remove ${m.name || m.username} from the team?`)) return
    await api.team.delete(m.id)
    toast('Team member removed'); load()
  }

  const changePassword = async () => {
    if (!newPw || newPw.length < 6) return toast('Password must be at least 6 characters', 'error')
    setSaving(true)
    try {
      await api.team.changePassword(pwModal.id, newPw)
      toast('Password updated')
      setPwModal(null); setNewPw('')
    } catch { toast('Error updating password', 'error') }
    finally { setSaving(false) }
  }

  const initials = (m: any) => (m.name || m.username).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Team</div>
          <div className="page-sub">{members.length} user{members.length !== 1 ? 's' : ''} · Manage access and roles</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={13} /> Add Team Member</button>
      </div>

      <div className="page-body">
        {/* Info banner */}
        <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Shield size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent)' }}>How team access works:</strong> Each team member gets their own username and password. They log in at the same URL as you.
            Share your server address (e.g. <strong>http://192.168.1.5:3000</strong> on your office Wi-Fi, or your Railway URL if hosted online).
            <strong> Admin</strong> users can manage team and settings. <strong>Staff</strong> users have full access to clients, invoices, and pipeline.
          </div>
        </div>

        {/* Team grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {members.map((m: any) => (
            <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: m.role === 'admin' ? 'var(--navy)' : 'var(--accent-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800,
                  color: m.role === 'admin' ? '#fff' : 'var(--accent)', flexShrink: 0
                }}>
                  {initials(m)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name || m.username}
                    {m.username === currentUser?.username && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>(you)</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>@{m.username}</div>
                </div>
                <span className={`badge ${ROLE_BADGE[m.role] || 'badge-gray'}`}>{m.role}</span>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Joined: {m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </div>

              <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(m)}>
                  <Edit2 size={11} /> Edit
                </button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setPwModal(m); setNewPw('') }}>
                  <Key size={11} /> Password
                </button>
                {m.username !== 'admin' && (
                  <button className="btn btn-danger btn-sm" onClick={() => del(m)}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* How to share access section */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div className="card-title">How to give your team access</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>1</div>
                Office Wi-Fi (local network)
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                1. Open Command Prompt and type: <code style={{ background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 3 }}>ipconfig</code><br />
                2. Find your <strong>IPv4 Address</strong> (e.g. 192.168.1.5)<br />
                3. Tell your team to open their browser and go to:<br />
                <code style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 3, display: 'inline-block', marginTop: 4 }}>http://192.168.1.5:3000</code><br />
                4. They log in with their own username & password
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>2</div>
                Anywhere in the world (hosted online)
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                Deploy to Railway (railway.app) — free to start.<br />
                1. Push your code to GitHub<br />
                2. Connect repo to Railway<br />
                3. Railway gives you a public URL like:<br />
                <code style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 3, display: 'inline-block', marginTop: 4 }}>https://saguaro-crm.railway.app</code><br />
                4. Share that URL with your team anywhere
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal" style={{ width: 460 }}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Team Member' : 'Add Team Member'}</div>
              <button className="btn btn-icon" onClick={close}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Chanda Mwale" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" value={form.username} onChange={e => f('username', e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="e.g. chanda" disabled={!!editing} />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder="Min. 6 characters" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => f('role', e.target.value)}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Admin</strong> — can manage team members and system settings.<br />
                <strong style={{ color: 'var(--text-secondary)' }}>Staff</strong> — full access to clients, pipeline, invoices, tasks, and interactions.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {pwModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPwModal(null)}>
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Change Password</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>@{pwModal.username}</div>
              </div>
              <button className="btn btn-icon" onClick={() => setPwModal(null)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  autoFocus
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                The team member will use this password on their next login.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPwModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={changePassword} disabled={saving}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

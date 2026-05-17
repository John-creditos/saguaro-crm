import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, X, CheckSquare, Square } from 'lucide-react'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'


const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const STATUSES   = ['Pending', 'In Progress', 'Done', 'Cancelled']

const PRI_BADGE: any = { Low: 'badge-gray', Medium: 'badge-blue', High: 'badge-amber', Urgent: 'badge-red' }
const STA_BADGE: any = { Pending: 'badge-amber', 'In Progress': 'badge-blue', Done: 'badge-green', Cancelled: 'badge-gray' }

const empty = () => ({
  title: '', description: '', client_id: '', due_date: '', priority: 'Medium', status: 'Pending', assigned_to: ''
})

export default function Tasks() {
  const toast = useToast()
  const [tasks,   setTasks]   = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('All')
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form,    setForm]    = useState<any>(empty())
  const [saving,  setSaving]  = useState(false)

  const load = () => {
    api.tasks.getAll().then(setTasks)
    api.clients.getAll().then(setClients)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => tasks.filter(t => {
    const q = search.toLowerCase()
    const mQ = !q || t.title?.toLowerCase().includes(q) || t.client_name?.toLowerCase().includes(q)
    const mF = filter === 'All' || t.status === filter || t.priority === filter
    return mQ && mF
  }), [tasks, search, filter])

  const openNew  = () => { setForm(empty()); setEditing(null); setModal(true) }
  const openEdit = (t: any) => { setForm({ ...t }); setEditing(t); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }
  const f        = (field: string, val: any) => setForm((p: any) => ({ ...p, [field]: val }))

  const save = async () => {
    if (!form.title.trim()) return toast('Task title required', 'error')
    setSaving(true)
    try {
      if (editing) await api.tasks.update({ id: editing.id, ...form })
      else await api.tasks.create(form)
      toast(editing ? 'Task updated' : 'Task created')
      close(); load()
    } catch { toast('Error saving task', 'error') }
    finally { setSaving(false) }
  }

  const del = async (t: any) => {
    if (!confirm(`Delete task "${t.title}"?`)) return
    await api.tasks.delete(t.id)
    toast('Task deleted'); load()
  }

  const toggleDone = async (t: any) => {
    const newStatus = t.status === 'Done' ? 'Pending' : 'Done'
    await api.tasks.update({ ...t, status: newStatus })
    load()
  }

  const overdue = (t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done'

  const pending  = tasks.filter(t => t.status === 'Pending').length
  const inProg   = tasks.filter(t => t.status === 'In Progress').length
  const done     = tasks.filter(t => t.status === 'Done').length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Tasks</div>
          <div className="page-sub">{pending} pending · {inProg} in progress · {done} done</div>
        </div>
        <div className="gap-2">
          <div className="search-bar">
            <Search /><input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openNew}><Plus size={13} /> New Task</button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          {['All', ...STATUSES, ...PRIORITIES].map(s => (
            <div key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</div>
          ))}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Task</th>
                  <th>Client</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><CheckSquare /><p>No tasks found. Add your first task.</p></div>
                  </td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id} style={{ opacity: t.status === 'Done' ? 0.55 : 1 }}>
                    <td>
                      <button className="btn btn-icon" onClick={() => toggleDone(t)}>
                        {t.status === 'Done' ? <CheckSquare size={14} color="var(--accent-light)" /> : <Square size={14} />}
                      </button>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: t.status === 'Done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.status === 'Done' ? 'line-through' : 'none', fontSize: 12 }}>
                        {t.title}
                      </div>
                      {t.description && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.description.slice(0, 60)}{t.description.length > 60 ? '…' : ''}</div>}
                    </td>
                    <td>{t.client_name || '—'}</td>
                    <td style={{ fontSize: 11, color: overdue(t) ? 'var(--red)' : undefined, fontWeight: overdue(t) ? 700 : 400 }}>
                      {t.due_date || '—'}
                      {overdue(t) && <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--red)' }}>OVERDUE</span>}
                    </td>
                    <td><span className={`badge ${PRI_BADGE[t.priority] || 'badge-gray'}`}>{t.priority}</span></td>
                    <td><span className={`badge ${STA_BADGE[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.assigned_to || '—'}</td>
                    <td>
                      <div className="gap-2">
                        <button className="btn btn-icon" onClick={() => openEdit(t)}><Edit2 size={12} /></button>
                        <button className="btn btn-icon" onClick={() => del(t)} style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Task' : 'New Task'}</div>
              <button className="btn btn-icon" onClick={close}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input className="form-input" value={form.title} onChange={e => f('title', e.target.value)} placeholder="What needs to be done?" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => f('description', e.target.value)} placeholder="Additional details..." />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Client (optional)</label>
                  <select className="form-select" value={form.client_id} onChange={e => f('client_id', e.target.value)}>
                    <option value="">No client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={form.due_date} onChange={e => f('due_date', e.target.value)} />
                </div>
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={e => f('priority', e.target.value)}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => f('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  <input className="form-input" value={form.assigned_to} onChange={e => f('assigned_to', e.target.value)} placeholder="Name..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

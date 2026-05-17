import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, X, MessageSquare } from 'lucide-react'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'


const TYPES = ['Meeting', 'Call', 'Email', 'Proposal Sent', 'Site Visit', 'Conference', 'WhatsApp', 'Other']
const TYPE_COLORS: any = {
  Meeting: 'badge-green', Call: 'badge-blue', Email: 'badge-gray',
  'Proposal Sent': 'badge-amber', 'Site Visit': 'badge-navy',
  WhatsApp: 'badge-green', Conference: 'badge-blue', Other: 'badge-gray'
}

const today = () => new Date().toISOString().split('T')[0]
const empty = () => ({
  client_id: '', engagement_id: '', date: today(), type: 'Meeting',
  subject: '', notes: '', outcome: '', next_steps: '', follow_up_date: '', logged_by: ''
})

export default function Interactions() {
  const toast = useToast()
  const [items,       setItems]       = useState<any[]>([])
  const [clients,     setClients]     = useState<any[]>([])
  const [engagements, setEngagements] = useState<any[]>([])
  const [search,      setSearch]      = useState('')
  const [filterType,  setFilterType]  = useState('All')
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState<any>(empty())
  const [saving,      setSaving]      = useState(false)
  const [expanded,    setExpanded]    = useState<number | null>(null)

  const load = () => {
    api.interactions.getAll(null).then(setItems)
    api.clients.getAll().then(setClients)
    api.engagements.getAll().then(setEngagements)
  }
  useEffect(() => { load() }, [])

  const clientEngs = useMemo(() =>
    engagements.filter(e => e.client_id === parseInt(form.client_id)),
    [form.client_id, engagements]
  )

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase()
    const mQ = !q || i.client_name?.toLowerCase().includes(q) || i.subject?.toLowerCase().includes(q)
    const mT = filterType === 'All' || i.type === filterType
    return mQ && mT
  }), [items, search, filterType])

  const open  = () => { setForm(empty()); setModal(true) }
  const close = () => { setModal(false) }
  const f     = (field: string, val: any) => setForm((p: any) => ({ ...p, [field]: val }))

  const save = async () => {
    if (!form.client_id) return toast('Select a client', 'error')
    if (!form.subject.trim()) return toast('Subject required', 'error')
    setSaving(true)
    try {
      await api.interactions.create(form)
      toast('Interaction logged')
      close(); load()
    } catch { toast('Error saving', 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Interactions</div>
          <div className="page-sub">{items.length} interactions logged</div>
        </div>
        <div className="gap-2">
          <div className="search-bar">
            <Search /><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={open}><Plus size={13} /> Log Interaction</button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          {['All', ...TYPES].map(t => (
            <div key={t} className={`tab ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>{t}</div>
          ))}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Client</th><th>Type</th><th>Subject</th>
                  <th>Outcome</th><th>Follow-Up</th><th>By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><MessageSquare /><p>No interactions logged yet.</p></div>
                  </td></tr>
                ) : filtered.map(i => (
                  <React.Fragment key={i.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === i.id ? null : i.id)}>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{i.date}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>{i.client_name}</td>
                      <td><span className={`badge ${TYPE_COLORS[i.type] || 'badge-gray'}`}>{i.type}</span></td>
                      <td style={{ maxWidth: 200 }}>{i.subject}</td>
                      <td style={{ maxWidth: 180, fontSize: 11, color: 'var(--text-muted)' }}>
                        {i.outcome ? i.outcome.slice(0, 60) + (i.outcome.length > 60 ? '…' : '') : '—'}
                      </td>
                      <td style={{ fontSize: 11, color: i.follow_up_date && new Date(i.follow_up_date) < new Date() ? 'var(--red)' : undefined }}>
                        {i.follow_up_date || '—'}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.logged_by || '—'}</td>
                    </tr>
                    {expanded === i.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--bg-tertiary)', padding: '12px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 12 }}>
                            {[['Notes', i.notes], ['Outcome', i.outcome], ['Next Steps', i.next_steps]].map(([l, v]) => v ? (
                              <div key={l}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
                                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{v}</div>
                              </div>
                            ) : null)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">Log Interaction</div>
              <button className="btn btn-icon" onClick={close}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select className="form-select" value={form.client_id} onChange={e => { f('client_id', e.target.value); f('engagement_id', '') }}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Engagement (optional)</label>
                  <select className="form-select" value={form.engagement_id} onChange={e => f('engagement_id', e.target.value)}>
                    <option value="">None</option>
                    {clientEngs.map(e => <option key={e.id} value={e.id}>{e.eng_id} — {e.service_type}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={form.date} onChange={e => f('date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => f('type', e.target.value)}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Logged By</label>
                  <input className="form-input" value={form.logged_by} onChange={e => f('logged_by', e.target.value)} placeholder="Your name" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input className="form-input" value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="e.g. Initial advisory meeting re: investor readiness" />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="What was discussed?" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Outcome</label>
                  <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.outcome} onChange={e => f('outcome', e.target.value)} placeholder="What was agreed or decided?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Next Steps</label>
                  <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.next_steps} onChange={e => f('next_steps', e.target.value)} placeholder="What happens next?" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Follow-Up Date</label>
                <input className="form-input" style={{ maxWidth: 200 }} type="date" value={form.follow_up_date} onChange={e => f('follow_up_date', e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Log Interaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

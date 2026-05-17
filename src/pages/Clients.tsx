import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, X, User } from 'lucide-react'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'


const STATUSES  = ['Prospect','Active','Closed','Dormant']
const INDUSTRIES = ['Financial Services','Infrastructure','Technology','Real Estate','Agriculture','Energy','Consumer Businesses','Logistics','Other']
const TYPES      = ['Corporate','SME','Individual','Government','DFI','Other']

const badge = (s: string) => {
  const m: any = { Active:'badge-green', Prospect:'badge-blue', Closed:'badge-gray', Dormant:'badge-amber' }
  return <span className={`badge ${m[s]||'badge-gray'}`}>{s}</span>
}

const empty = () => ({
  name:'', company:'', email:'', phone:'', country:'Zambia',
  industry:'', status:'Prospect', type:'Corporate', nda_signed:0, notes:''
})

export default function Clients() {
  const toast = useToast()
  const [clients, setClients] = useState<any[]>([])
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('All')
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form,    setForm]    = useState<any>(empty())
  const [saving,  setSaving]  = useState(false)

  const load = () => api.clients.getAll().then(setClients)
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => clients.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    const matchF = filter === 'All' || c.status === filter
    return matchQ && matchF
  }), [clients, search, filter])

  const openNew  = () => { setForm(empty()); setEditing(null); setModal(true) }
  const openEdit = (c: any) => { setForm({...c}); setEditing(c); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }

  const save = async () => {
    if (!form.name.trim()) return toast('Client name is required', 'error')
    setSaving(true)
    try {
      if (editing) await api.clients.update({ id: editing.id, ...form })
      else await api.clients.create(form)
      toast(editing ? 'Client updated' : 'Client created')
      close(); load()
    } catch { toast('Error saving client', 'error') }
    finally { setSaving(false) }
  }

  const del = async (c: any) => {
    if (!confirm(`Delete client "${c.name}"? This cannot be undone.`)) return
    await api.clients.delete(c.id)
    toast('Client deleted'); load()
  }

  const f = (field: string, val: any) => setForm((p: any) => ({ ...p, [field]: val }))

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Clients</div>
          <div className="page-sub">{clients.length} total · {clients.filter(c=>c.status==='Active').length} active</div>
        </div>
        <div className="gap-2">
          <div className="search-bar">
            <Search />
            <input placeholder="Search clients..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openNew}><Plus size={13} /> New Client</button>
        </div>
      </div>

      <div className="page-body">
        {/* Filter tabs */}
        <div className="tabs">
          {['All',...STATUSES].map(s => (
            <div key={s} className={`tab ${filter===s?'active':''}`} onClick={()=>setFilter(s)}>{s}</div>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client / Company</th>
                  <th>Contact</th>
                  <th>Industry</th>
                  <th>Country</th>
                  <th>NDA</th>
                  <th>Status</th>
                  <th>Invoiced</th>
                  <th>Engagements</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10}>
                    <div className="empty-state"><User /><p>No clients found. Add your first client to get started.</p></div>
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.client_id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>{c.name}</div>
                      {c.company && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.company}</div>}
                    </td>
                    <td>
                      <div>{c.email}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.phone}</div>
                    </td>
                    <td>{c.industry || '—'}</td>
                    <td>{c.country}</td>
                    <td>{c.nda_signed ? <span className="badge badge-green">Signed</span> : <span className="badge badge-gray">No</span>}</td>
                    <td>{badge(c.status)}</td>
                    <td className="text-right" style={{ fontSize: 11 }}>{c.total_invoiced > 0 ? `ZMW ${c.total_invoiced.toLocaleString()}` : '—'}</td>
                    <td className="text-center">{c.engagement_count || 0}</td>
                    <td>
                      <div className="gap-2">
                        <button className="btn btn-icon" onClick={()=>openEdit(c)}><Edit2 size={12}/></button>
                        <button className="btn btn-icon" onClick={()=>del(c)} style={{color:'var(--red)'}}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Client' : 'New Client'}</div>
              <button className="btn btn-icon" onClick={close}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e=>f('name',e.target.value)} placeholder="e.g. John Banda" />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-input" value={form.company} onChange={e=>f('company',e.target.value)} placeholder="Company name" />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e=>f('email',e.target.value)} placeholder="email@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e=>f('phone',e.target.value)} placeholder="+260 XXX XXX XXX" />
                </div>
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" value={form.country} onChange={e=>f('country',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <select className="form-select" value={form.industry} onChange={e=>f('industry',e.target.value)}>
                    <option value="">Select...</option>
                    {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Client Type</label>
                  <select className="form-select" value={form.type} onChange={e=>f('type',e.target.value)}>
                    {TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e=>f('status',e.target.value)}>
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">NDA Signed</label>
                  <select className="form-select" value={form.nda_signed} onChange={e=>f('nda_signed',parseInt(e.target.value))}>
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes / Relationship Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Any important context about this client..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, X, TrendingUp } from 'lucide-react'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'


const STAGES   = ['Lead','Qualified','Proposal Sent','Negotiation','Active','Completed','Lost']
const SERVICES = ['Strategic Investment Advisory','Investor Readiness','Corporate Finance','Business Valuation','Financial Modelling','Transaction Advisory','Institutional Readiness','Other']
const FEE_TYPES = ['Retainer','Project Fee','Success Fee','Hourly','Mixed']
const CURRENCIES = ['ZMW','USD','ZAR','EUR']
const STATUSES = ['Active','Completed','On Hold','Cancelled']

const STAGE_COLORS: any = {
  Lead: '#6b7280', Qualified: '#3b82f6', 'Proposal Sent': '#f59e0b',
  Negotiation: '#8b5cf6', Active: '#16a34a', Completed: '#059669', Lost: '#ef4444'
}

const empty = () => ({
  client_id:'', service_type:'', description:'', start_date:'', end_date:'',
  status:'Active', stage:'Lead', fee:0, fee_type:'Retainer',
  currency:'ZMW', probability:50, notes:''
})

export default function Engagements() {
  const toast = useToast()
  const [engs,    setEngs]    = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [view,    setView]    = useState<'kanban'|'list'>('kanban')
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form,    setForm]    = useState<any>(empty())
  const [saving,  setSaving]  = useState(false)

  const load = () => {
    api.engagements.getAll().then(setEngs)
    api.clients.getAll().then(setClients)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => engs.filter(e => {
    const q = search.toLowerCase()
    return !q || e.client_name?.toLowerCase().includes(q) || e.service_type?.toLowerCase().includes(q)
  }), [engs, search])

  const byStage = (stage: string) => filtered.filter(e => e.stage === stage)

  const openNew  = () => { setForm(empty()); setEditing(null); setModal(true) }
  const openEdit = (e: any) => { setForm({...e}); setEditing(e); setModal(true) }
  const close    = () => { setModal(false); setEditing(null) }
  const f        = (field: string, val: any) => setForm((p: any) => ({ ...p, [field]: val }))

  const save = async () => {
    if (!form.client_id) return toast('Select a client', 'error')
    setSaving(true)
    try {
      if (editing) await api.engagements.update({ id: editing.id, ...form })
      else await api.engagements.create(form)
      toast(editing ? 'Engagement updated' : 'Engagement created')
      close(); load()
    } catch { toast('Error saving', 'error') }
    finally { setSaving(false) }
  }

  const del = async (e: any) => {
    if (!confirm(`Delete engagement for "${e.client_name}"?`)) return
    await api.engagements.delete(e.id)
    toast('Engagement deleted'); load()
  }

  const totalPipeline = engs.filter(e=>!['Completed','Lost'].includes(e.stage)).reduce((s,e)=>s+e.fee,0)
  const activeValue   = engs.filter(e=>e.stage==='Active').reduce((s,e)=>s+e.fee,0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Pipeline</div>
          <div className="page-sub">
            {engs.length} engagements · Pipeline ZMW {totalPipeline.toLocaleString()} · Active ZMW {activeValue.toLocaleString()}
          </div>
        </div>
        <div className="gap-2">
          <div className="search-bar">
            <Search /><input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div className="gap-2" style={{ background:'var(--bg-card)', borderRadius:'var(--radius)', border:'1px solid var(--border)', padding:'2px' }}>
            {(['kanban','list'] as const).map(v => (
              <button key={v} className={`btn btn-sm ${view===v?'btn-primary':'btn-secondary'}`}
                style={{ border:'none' }} onClick={()=>setView(v)}>
                {v === 'kanban' ? 'Kanban' : 'List'}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={openNew}><Plus size={13}/> New Engagement</button>
        </div>
      </div>

      <div className="page-body">
        {view === 'kanban' ? (
          <div className="kanban-board">
            {STAGES.map(stage => {
              const cards = byStage(stage)
              return (
                <div key={stage} className="kanban-col">
                  <div className="kanban-col-header">
                    <div className="kanban-col-title" style={{ color: STAGE_COLORS[stage] }}>{stage}</div>
                    <span className="kanban-col-count">{cards.length}</span>
                  </div>
                  <div className="kanban-cards">
                    {cards.map(e => (
                      <div key={e.id} className="kanban-card" onClick={()=>openEdit(e)}>
                        <div className="kanban-card-title">{e.client_name}</div>
                        <div className="kanban-card-meta">{e.service_type}</div>
                        {e.fee > 0 && (
                          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--accent-light)' }}>
                            {e.currency} {e.fee.toLocaleString()}
                          </div>
                        )}
                        <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{e.probability}% probability</span>
                        </div>
                      </div>
                    ))}
                    {cards.length === 0 && (
                      <div style={{ padding: '12px', textAlign:'center', fontSize:10, color:'var(--text-muted)' }}>
                        No deals here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Client</th><th>Service</th><th>Stage</th>
                    <th>Fee</th><th>Status</th><th>Probability</th><th>Start</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9}><div className="empty-state"><TrendingUp/><p>No engagements yet</p></div></td></tr>
                  ) : filtered.map(e => (
                    <tr key={e.id}>
                      <td className="font-mono" style={{ fontSize:10, color:'var(--text-muted)' }}>{e.eng_id}</td>
                      <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{e.client_name}</td>
                      <td>{e.service_type}</td>
                      <td><span className="badge" style={{ background:'rgba(0,0,0,0.3)', color: STAGE_COLORS[e.stage] }}>{e.stage}</span></td>
                      <td>{e.currency} {e.fee?.toLocaleString()}</td>
                      <td><span className={`badge ${e.status==='Active'?'badge-green':e.status==='Completed'?'badge-navy':'badge-gray'}`}>{e.status}</span></td>
                      <td>{e.probability}%</td>
                      <td style={{ fontSize:11 }}>{e.start_date}</td>
                      <td>
                        <div className="gap-2">
                          <button className="btn btn-icon" onClick={()=>openEdit(e)}><Edit2 size={12}/></button>
                          <button className="btn btn-icon" onClick={()=>del(e)} style={{color:'var(--red)'}}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Engagement' : 'New Engagement'}</div>
              <button className="btn btn-icon" onClick={close}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select className="form-select" value={form.client_id} onChange={e=>f('client_id',e.target.value)}>
                    <option value="">Select client...</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.company?` — ${c.company}`:''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Service Type</label>
                  <select className="form-select" value={form.service_type} onChange={e=>f('service_type',e.target.value)}>
                    <option value="">Select service...</option>
                    {SERVICES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" style={{ minHeight:60 }} value={form.description} onChange={e=>f('description',e.target.value)} placeholder="Brief description of the engagement..." />
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Stage</label>
                  <select className="form-select" value={form.stage} onChange={e=>f('stage',e.target.value)}>
                    {STAGES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e=>f('status',e.target.value)}>
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Probability %</label>
                  <input className="form-input" type="number" min={0} max={100} value={form.probability} onChange={e=>f('probability',parseInt(e.target.value)||0)} />
                </div>
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Agreed Fee</label>
                  <input className="form-input" type="number" value={form.fee} onChange={e=>f('fee',parseFloat(e.target.value)||0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fee Type</label>
                  <select className="form-select" value={form.fee_type} onChange={e=>f('fee_type',e.target.value)}>
                    {FEE_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={form.currency} onChange={e=>f('currency',e.target.value)}>
                    {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e=>f('start_date',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={form.end_date} onChange={e=>f('end_date',e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e=>f('notes',e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Engagement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

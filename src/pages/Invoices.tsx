import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, X, FileText, Download } from 'lucide-react'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'

const CURRENCIES  = ['ZMW','USD','ZAR','EUR','GBP']
const PAY_METHODS = ['Bank Transfer','Cheque','Mobile Money','Cash','Other']
const ALL_STATUSES = ['Unpaid','Partial','Paid','Overdue','Cancelled','Written Off']

const STATUS_STYLE: any = {
  Unpaid:      { badge:'badge-amber',  btn:'btn-warning'  },
  Partial:     { badge:'badge-blue',   btn:'btn-secondary'},
  Paid:        { badge:'badge-green',  btn:'btn-success'  },
  Overdue:     { badge:'badge-red',    btn:'btn-danger'   },
  Cancelled:   { badge:'badge-gray',   btn:'btn-secondary'},
  'Written Off':{ badge:'badge-gray',  btn:'btn-secondary'},
}

const today    = () => new Date().toISOString().split('T')[0]
const addDays  = (d: string, n: number) => { const dt=new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().split('T')[0] }
const fmt      = (n: number) => (n||0).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})
const emptyItem= () => ({ description:'', qty:1, unit_price:0, amount:0 })
const emptyForm= () => ({ client_id:'', engagement_id:'', invoice_date:today(), due_date:addDays(today(),30), currency:'ZMW', subtotal:0, tax_rate:16, discount:0, amount_paid:0, payment_method:'', date_paid:'', notes:'', items:[emptyItem()] })

export default function Invoices() {
  const toast = useToast()
  const [invoices,    setInvoices]    = useState<any[]>([])
  const [clients,     setClients]     = useState<any[]>([])
  const [engagements, setEngagements] = useState<any[]>([])
  const [settings,    setSettings]    = useState<any>({})
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('All')
  const [modal,       setModal]       = useState(false)
  const [viewModal,   setViewModal]   = useState<any>(null)
  const [editing,     setEditing]     = useState<any>(null)
  const [form,        setForm]        = useState<any>(emptyForm())
  const [saving,      setSaving]      = useState(false)
  const [statusModal, setStatusModal] = useState<any>(null)

  const load = () => {
    api.invoices.getAll().then((d:any)=>setInvoices(d))
    api.clients.getAll().then((d:any)=>setClients(d))
    api.engagements.getAll().then((d:any)=>setEngagements(d))
    api.settings.getAll().then((d:any)=>setSettings(d))
  }
  useEffect(()=>{ load() },[])

  const clientEngs = useMemo(()=>engagements.filter((e:any)=>e.client_id===parseInt(form.client_id)),[form.client_id,engagements])

  const filtered = useMemo(()=>invoices.filter((inv:any)=>{
    const q=search.toLowerCase()
    const mQ=!q||inv.invoice_no?.toLowerCase().includes(q)||inv.client_name?.toLowerCase().includes(q)
    const mF=filter==='All'||inv.status===filter
    return mQ&&mF
  }),[invoices,search,filter])

  const computedSubtotal = form.items.reduce((s:number,i:any)=>s+(parseFloat(i.qty)*parseFloat(i.unit_price)||0),0)
  const taxAmt  = (computedSubtotal*(parseFloat(form.tax_rate)||0))/100
  const total   = computedSubtotal+taxAmt-(parseFloat(form.discount)||0)
  const balance = total-(parseFloat(form.amount_paid)||0)

  const openNew  = () => { setForm(emptyForm()); setEditing(null); setModal(true) }
  const openEdit = async (inv:any) => {
    const full:any = await api.invoices.get(inv.id)
    setForm({...full, items: full.items?.length ? full.items : [emptyItem()]})
    setEditing(full); setModal(true)
  }
  const openView = async (inv:any) => { const full:any = await api.invoices.get(inv.id); setViewModal(full) }
  const close    = () => { setModal(false); setEditing(null) }
  const f        = (field:string,val:any) => setForm((p:any)=>({...p,[field]:val}))

  const updateItem = (idx:number,field:string,val:any) => {
    const items=[...form.items]; items[idx]={...items[idx],[field]:val}
    items[idx].amount=(parseFloat(items[idx].qty)*parseFloat(items[idx].unit_price))||0
    setForm((p:any)=>({...p,items}))
  }
  const addItem    = () => setForm((p:any)=>({...p,items:[...p.items,emptyItem()]}))
  const removeItem = (idx:number) => setForm((p:any)=>({...p,items:p.items.filter((_:any,i:number)=>i!==idx)}))

  const save = async () => {
    if (!form.client_id) return toast('Select a client','error')
    if (!form.invoice_date) return toast('Invoice date required','error')
    setSaving(true)
    try {
      const payload={...form, subtotal:computedSubtotal, items:form.items.filter((i:any)=>i.description)}
      if (editing) await api.invoices.update({id:editing.id,...payload})
      else await api.invoices.create(payload)
      toast(editing?'Invoice updated':'Invoice created')
      close(); load()
    } catch { toast('Error saving invoice','error') }
    finally { setSaving(false) }
  }

  const del = async (inv:any) => {
    if (!confirm(`Delete invoice ${inv.invoice_no}?`)) return
    await api.invoices.delete(inv.id)
    toast('Invoice deleted'); load()
  }

  // Quick status change
  const changeStatus = async (inv:any, newStatus:string) => {
    try {
      const full:any = await api.invoices.get(inv.id)
      const payload = {
        ...full,
        status: newStatus,
        // If marking paid, set amount_paid to total
        amount_paid: newStatus==='Paid' ? full.total : (newStatus==='Unpaid'||newStatus==='Overdue' ? 0 : full.amount_paid),
        date_paid: newStatus==='Paid' ? today() : full.date_paid,
        items: full.items||[]
      }
      await api.invoices.update({ id: inv.id, ...payload })
      toast(`Status updated to ${newStatus}`)
      setStatusModal(null)
      load()
    } catch { toast('Error updating status','error') }
  }

  const generatePDF = async (inv:any) => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const full:any = inv.items ? inv : await api.invoices.get(inv.id)
      const s = settings
      const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
      const W=210, ml=14, mr=196

      doc.setFillColor(8,29,58); doc.rect(0,0,W,36,'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(255,255,255)
      doc.text(s.company_name||'SAGUARO PRIVATE EQUITY', ml, 14)
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(138,155,176)
      doc.text(s.company_address||'Lusaka, Zambia', ml, 20)
      doc.text(`${s.company_email||''}   |   ${s.company_website||''}`, ml, 25)
      doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(255,255,255)
      doc.text('TAX INVOICE', mr, 18, {align:'right'})

      doc.setFillColor(27,58,107); doc.rect(130,40,66,48,'F')
      ;[['INVOICE NO',full.invoice_no],['DATE',full.invoice_date],['DUE DATE',full.due_date],['CURRENCY',full.currency],['STATUS',full.status]].forEach(([label,val],i)=>{
        const y=48+i*8
        doc.setFontSize(7); doc.setTextColor(138,155,176); doc.setFont('helvetica','bold'); doc.text(label,133,y)
        doc.setTextColor(255,255,255); doc.setFont('helvetica','normal'); doc.text(String(val||'—'),194,y,{align:'right'})
      })

      doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(138,155,176); doc.text('BILL TO',ml,46)
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(8,29,58); doc.text(full.client_name||'',ml,54)
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(70,70,70)
      if (full.company) doc.text(full.company,ml,60)
      if (full.client_email) doc.text(full.client_email,ml,66)
      if (full.country) doc.text(full.country,ml,72)

      autoTable(doc,{
        startY:96,
        head:[['#','DESCRIPTION','QTY','UNIT PRICE','AMOUNT']],
        body:(full.items||[]).map((item:any,i:number)=>[i+1,item.description,item.qty,`${full.currency} ${fmt(item.unit_price)}`,`${full.currency} ${fmt(item.amount)}`]),
        theme:'grid',
        headStyles:{fillColor:[8,29,58],textColor:255,fontSize:8,fontStyle:'bold'},
        bodyStyles:{fontSize:9,textColor:[50,50,50]},
        columnStyles:{0:{cellWidth:8},2:{halign:'center'},3:{halign:'right'},4:{halign:'right'}},
        alternateRowStyles:{fillColor:[244,245,247]},
        margin:{left:ml,right:14}
      })

      const finalY=(doc as any).lastAutoTable.finalY+6
      let ty=finalY
      ;[['SUBTOTAL',`${full.currency} ${fmt(full.subtotal)}`],
        [`VAT (${full.tax_rate}%)`,`${full.currency} ${fmt(full.tax_amount)}`],
        ['DISCOUNT',`- ${full.currency} ${fmt(full.discount)}`],
        ['TOTAL DUE',`${full.currency} ${fmt(full.total)}`],
        ['AMOUNT PAID',`${full.currency} ${fmt(full.amount_paid)}`],
        ['BALANCE DUE',`${full.currency} ${fmt(full.balance)}`],
      ].forEach(([label,val])=>{
        const isTotal=label==='TOTAL DUE', isBal=label==='BALANCE DUE'
        if (isTotal||isBal) { doc.setFillColor(isTotal?8:27,isTotal?29:58,isTotal?58:107); doc.rect(120,ty-4,76,9,'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold') }
        else { doc.setTextColor(80,80,80); doc.setFont('helvetica','normal') }
        doc.setFontSize(isTotal||isBal?9:8)
        doc.text(label,122,ty+1); doc.text(val,mr,ty+1,{align:'right'}); ty+=9
      })

      const payY=ty+8
      doc.setFillColor(244,245,247); doc.rect(ml,payY,88,40,'F')
      doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(138,155,176); doc.text('PAYMENT DETAILS',ml+3,payY+6)
      ;[['Bank:',s.bank_name||''],['Account:',s.account_name||''],['Acc No:',s.account_number||''],['SWIFT:',s.swift_code||''],['Reference:',full.invoice_no]].forEach(([l,v],i)=>{
        const y=payY+12+i*5.5; doc.setTextColor(50,50,50)
        doc.setFont('helvetica','bold'); doc.text(l,ml+3,y)
        doc.setFont('helvetica','normal'); doc.text(v,ml+24,y)
      })

      if (full.notes) { doc.setFontSize(7); doc.setTextColor(100,100,100); doc.text('Notes: '+full.notes,ml,payY+46) }
      doc.setFillColor(8,29,58); doc.rect(0,278,W,19,'F')
      doc.setFontSize(7); doc.setTextColor(138,155,176)
      doc.text(`${s.company_name||'Saguaro Private Equity'}  ·  ${s.company_address||'Lusaka, Zambia'}  ·  ${s.company_email||''}`,W/2,286,{align:'center'})
      doc.text('This is a computer generated invoice.',W/2,292,{align:'center'})
      doc.save(`${full.invoice_no}.pdf`)
      toast('PDF downloaded')
    } catch(e) { console.error(e); toast('PDF failed','error') }
  }

  const totalOutstanding = invoices.filter((i:any)=>['Unpaid','Partial','Overdue'].includes(i.status)).reduce((s:number,i:any)=>s+i.balance,0)
  const totalPaid        = invoices.filter((i:any)=>i.status==='Paid').reduce((s:number,i:any)=>s+i.total,0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Invoices</div>
          <div className="page-sub">{invoices.length} invoices · Outstanding ZMW {fmt(totalOutstanding)} · Paid YTD ZMW {fmt(totalPaid)}</div>
        </div>
        <div className="gap-2">
          <div className="search-bar"><Search /><input placeholder="Search invoices..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={openNew}><Plus size={13}/> New Invoice</button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          {['All','Unpaid','Partial','Paid','Overdue','Cancelled'].map(s=>(
            <div key={s} className={`tab ${filter===s?'active':''}`} onClick={()=>setFilter(s)}>{s}</div>
          ))}
        </div>

        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice No</th><th>Client</th><th>Date</th><th>Due</th>
                  <th>Curr</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={10}><div className="empty-state"><FileText/><p>No invoices found.</p></div></td></tr>
                ) : filtered.map((inv:any)=>(
                  <tr key={inv.id}>
                    <td className="font-mono text-accent" style={{fontSize:11,cursor:'pointer'}} onClick={()=>openView(inv)}>{inv.invoice_no}</td>
                    <td style={{fontWeight:600,color:'var(--text-primary)'}}>{inv.client_name}</td>
                    <td style={{fontSize:11}}>{inv.invoice_date}</td>
                    <td style={{fontSize:11,color:new Date(inv.due_date)<new Date()&&inv.status!=='Paid'?'var(--red)':undefined}}>{inv.due_date}</td>
                    <td>{inv.currency}</td>
                    <td className="text-right font-bold">{fmt(inv.total)}</td>
                    <td className="text-right" style={{color:'var(--green)'}}>{fmt(inv.amount_paid)}</td>
                    <td className="text-right text-red">{fmt(inv.balance)}</td>
                    <td>
                      {/* Status badge — clickable to change */}
                      <span
                        className={`badge ${STATUS_STYLE[inv.status]?.badge||'badge-gray'}`}
                        style={{cursor:'pointer'}}
                        title="Click to change status"
                        onClick={()=>setStatusModal(inv)}
                      >
                        {inv.status} ▾
                      </span>
                    </td>
                    <td>
                      <div className="gap-2">
                        <button className="btn btn-icon" title="Download PDF" onClick={()=>generatePDF(inv)}><Download size={12}/></button>
                        <button className="btn btn-icon" onClick={()=>openEdit(inv)}><Edit2 size={12}/></button>
                        <button className="btn btn-icon" onClick={()=>del(inv)} style={{color:'var(--red)'}}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Quick Status Change Modal ── */}
      {statusModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setStatusModal(null)}>
          <div className="modal" style={{width:380}}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Change Invoice Status</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{statusModal.invoice_no} · {statusModal.client_name}</div>
              </div>
              <button className="btn btn-icon" onClick={()=>setStatusModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div style={{marginBottom:12,fontSize:12,color:'var(--text-muted)'}}>
                Current status: <span className={`badge ${STATUS_STYLE[statusModal.status]?.badge}`}>{statusModal.status}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {ALL_STATUSES.filter(s=>s!==statusModal.status).map(s=>(
                  <button
                    key={s}
                    className={`btn ${STATUS_STYLE[s]?.btn||'btn-secondary'}`}
                    style={{justifyContent:'flex-start',width:'100%'}}
                    onClick={()=>changeStatus(statusModal,s)}
                  >
                    <span className={`badge ${STATUS_STYLE[s]?.badge}`} style={{marginRight:8}}>{s}</span>
                    {s==='Paid' && '— Mark as fully paid (auto-fills payment amount)'}
                    {s==='Unpaid' && '— Reset to unpaid'}
                    {s==='Partial' && '— Mark as partially paid'}
                    {s==='Overdue' && '— Flag as overdue'}
                    {s==='Cancelled' && '— Cancel this invoice'}
                    {s==='Written Off' && '— Write off as uncollectable'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="modal modal-lg" style={{width:820}}>
            <div className="modal-header">
              <div className="modal-title">{editing?`Edit ${editing.invoice_no}`:'New Invoice'}</div>
              <button className="btn btn-icon" onClick={close}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select className="form-select" value={form.client_id} onChange={e=>{f('client_id',e.target.value);f('engagement_id','')}}>
                    <option value="">Select client...</option>
                    {clients.map((c:any)=><option key={c.id} value={c.id}>{c.name}{c.company?` — ${c.company}`:''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Engagement (optional)</label>
                  <select className="form-select" value={form.engagement_id} onChange={e=>f('engagement_id',e.target.value)}>
                    <option value="">None</option>
                    {clientEngs.map((e:any)=><option key={e.id} value={e.id}>{e.eng_id} — {e.service_type}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid-3">
                <div className="form-group"><label className="form-label">Invoice Date</label><input className="form-input" type="date" value={form.invoice_date} onChange={e=>f('invoice_date',e.target.value)}/></div>
                <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.due_date} onChange={e=>f('due_date',e.target.value)}/></div>
                <div className="form-group"><label className="form-label">Currency</label><select className="form-select" value={form.currency} onChange={e=>f('currency',e.target.value)}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>

              {/* Line items */}
              <div style={{marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <label className="form-label" style={{margin:0}}>Line Items</label>
                  <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={11}/> Add Line</button>
                </div>
                <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'var(--navy)'}}>
                        {['Description','Qty','Unit Price','Amount',''].map(h=>(
                          <th key={h} style={{padding:'8px 10px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.7)',textAlign:h==='Amount'?'right':'left'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item:any,idx:number)=>(
                        <tr key={idx} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'4px 6px'}}><input className="form-input" style={{padding:'5px 8px',fontSize:12}} value={item.description} placeholder="Service description" onChange={e=>updateItem(idx,'description',e.target.value)}/></td>
                          <td style={{padding:'4px 6px',width:60}}><input className="form-input" type="number" style={{padding:'5px 8px',fontSize:12}} value={item.qty} min={0} onChange={e=>updateItem(idx,'qty',e.target.value)}/></td>
                          <td style={{padding:'4px 6px',width:120}}><input className="form-input" type="number" style={{padding:'5px 8px',fontSize:12}} value={item.unit_price} min={0} onChange={e=>updateItem(idx,'unit_price',e.target.value)}/></td>
                          <td style={{padding:'4px 10px',textAlign:'right',fontSize:12,fontWeight:700,color:'var(--accent)',width:110}}>{form.currency} {fmt(item.qty*item.unit_price||0)}</td>
                          <td style={{padding:'4px 6px',width:30}}>
                            {form.items.length>1&&<button className="btn btn-icon" onClick={()=>removeItem(idx)} style={{color:'var(--red)',padding:4}}><X size={11}/></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <div style={{width:280,border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'7px 12px',borderBottom:'1px solid var(--border)',fontSize:12}}><span style={{color:'var(--text-muted)'}}>Subtotal</span><span>{form.currency} {fmt(computedSubtotal)}</span></div>
                  <div style={{display:'flex',alignItems:'center',padding:'5px 12px',borderBottom:'1px solid var(--border)',gap:8}}>
                    <span style={{color:'var(--text-muted)',fontSize:12,flex:1}}>VAT %</span>
                    <input className="form-input" type="number" style={{width:60,padding:'3px 6px',fontSize:12}} value={form.tax_rate} min={0} max={100} onChange={e=>f('tax_rate',parseFloat(e.target.value)||0)}/>
                    <span style={{fontSize:12,width:90,textAlign:'right'}}>{form.currency} {fmt(taxAmt)}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',padding:'5px 12px',borderBottom:'1px solid var(--border)',gap:8}}>
                    <span style={{color:'var(--text-muted)',fontSize:12,flex:1}}>Discount</span>
                    <input className="form-input" type="number" style={{width:100,padding:'3px 6px',fontSize:12}} value={form.discount} min={0} onChange={e=>f('discount',parseFloat(e.target.value)||0)}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'10px 12px',background:'var(--navy)',fontSize:13,fontWeight:700}}>
                    <span style={{color:'#fff'}}>TOTAL DUE</span><span style={{color:'#60a5fa'}}>{form.currency} {fmt(total)}</span>
                  </div>
                </div>
              </div>

              <hr className="divider"/>
              <div className="form-grid-3">
                <div className="form-group"><label className="form-label">Amount Paid</label><input className="form-input" type="number" value={form.amount_paid} min={0} onChange={e=>f('amount_paid',parseFloat(e.target.value)||0)}/></div>
                <div className="form-group"><label className="form-label">Payment Method</label><select className="form-select" value={form.payment_method} onChange={e=>f('payment_method',e.target.value)}><option value="">Select...</option>{PAY_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Date Paid</label><input className="form-input" type="date" value={form.date_paid} onChange={e=>f('date_paid',e.target.value)}/></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" style={{minHeight:60}} value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Any notes for this invoice..."/></div>
              <div style={{display:'flex',gap:12}}>
                <div style={{padding:'8px 14px',background:'var(--accent-dim)',borderRadius:'var(--radius)',fontSize:12}}>
                  <span style={{color:'var(--text-muted)'}}>Balance: </span>
                  <span style={{color:'var(--accent)',fontWeight:700}}>{form.currency} {fmt(balance)}</span>
                </div>
                {balance<=0&&total>0&&<span className="badge badge-green" style={{alignSelf:'center'}}>Fully Paid</span>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving...':editing?'Save Changes':'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View modal ── */}
      {viewModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setViewModal(null)}>
          <div className="modal" style={{width:560}}>
            <div className="modal-header">
              <div className="modal-title">{viewModal.invoice_no}</div>
              <div className="gap-2">
                <button className="btn btn-secondary btn-sm" onClick={()=>generatePDF(viewModal)}><Download size={12}/> PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={()=>{setViewModal(null);setStatusModal(viewModal)}}>Change Status</button>
                <button className="btn btn-icon" onClick={()=>setViewModal(null)}><X size={14}/></button>
              </div>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                {[['Client',viewModal.client_name],['Status',viewModal.status],['Invoice Date',viewModal.invoice_date],['Due Date',viewModal.due_date],['Currency',viewModal.currency],['Total',`${viewModal.currency} ${fmt(viewModal.total)}`],['Paid',`${viewModal.currency} ${fmt(viewModal.amount_paid)}`],['Balance',`${viewModal.currency} ${fmt(viewModal.balance)}`]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:10,color:'var(--text-muted)',marginBottom:2}}>{l}</div><div style={{fontSize:13,color:'var(--text-primary)',fontWeight:600}}>{l==='Status'?<span className={`badge ${STATUS_STYLE[v]?.badge||'badge-gray'}`}>{v}</span>:v}</div></div>
                ))}
              </div>
              <hr className="divider"/>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{borderBottom:'2px solid var(--border)'}}>{['Description','Qty','Unit Price','Amount'].map(h=><th key={h} style={{textAlign:h==='Amount'||h==='Qty'?'right':'left',padding:'6px 0',color:'var(--text-muted)',fontSize:10}}>{h}</th>)}</tr></thead>
                <tbody>{viewModal.items?.map((item:any,i:number)=>(
                  <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'8px 0',color:'var(--text-secondary)'}}>{item.description}</td>
                    <td style={{textAlign:'right',padding:'8px 0'}}>{item.qty}</td>
                    <td style={{textAlign:'right',padding:'8px 0'}}>{fmt(item.unit_price)}</td>
                    <td style={{textAlign:'right',padding:'8px 0',fontWeight:700}}>{fmt(item.amount)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

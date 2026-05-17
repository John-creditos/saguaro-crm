import React, { useState, useEffect } from 'react'
import { Save, Settings } from 'lucide-react'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'


export default function SettingsPage() {
  const toast = useToast()
  const [settings, setSettings] = useState<any>({})
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    api.settings.getAll().then(setSettings)
  }, [])

  const f = (key: string, val: string) => setSettings((p: any) => ({ ...p, [key]: val }))

  const save = async () => {
    setSaving(true)
    try {
      await api.settings.update(settings)
      toast('Settings saved')
    } catch { toast('Error saving settings', 'error') }
    finally { setSaving(false) }
  }

  const Section = ({ title }: { title: string }) => (
    <div style={{ padding: '14px 0 8px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</div>
    </div>
  )

  const Field = ({ label, k, placeholder }: { label: string; k: string; placeholder?: string }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" value={settings[k] || ''} onChange={e => f(k, e.target.value)} placeholder={placeholder || ''} />
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Company profile, invoice defaults, and system configuration</div>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={13} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 640 }}>
          <div className="card">
            <Section title="Company Information" />
            <div className="form-grid">
              <Field label="Company Name"    k="company_name"    placeholder="Saguaro Private Equity" />
              <Field label="Registration No" k="company_reg"     placeholder="XXXXXXXXXX" />
            </div>
            <Field label="Address"           k="company_address" placeholder="Lusaka, Zambia" />
            <div className="form-grid">
              <Field label="Email"           k="company_email"   placeholder="info@saguaroprivateequity.com" />
              <Field label="Phone"           k="company_phone"   placeholder="+260 XXX XXX XXX" />
            </div>
            <Field label="Website"           k="company_website" placeholder="www.saguaroprivateequity.com" />

            <Section title="Invoice Defaults" />
            <div className="form-grid-3">
              <Field label="Invoice Prefix"   k="invoice_prefix"   placeholder="SPE-INV" />
              <Field label="Default Currency" k="default_currency" placeholder="ZMW" />
              <Field label="Default VAT %"    k="default_tax_rate" placeholder="16" />
            </div>

            <Section title="Bank Details (for Invoice PDF)" />
            <div className="form-grid">
              <Field label="Bank Name"         k="bank_name"       placeholder="Your bank" />
              <Field label="Account Name"      k="account_name"    placeholder="Saguaro Private Equity" />
            </div>
            <div className="form-grid">
              <Field label="Account Number"    k="account_number"  placeholder="XXXXXXXXXXXX" />
              <Field label="Branch / Sort Code" k="branch_code"    placeholder="XXXXXXX" />
            </div>
            <div className="form-grid">
              <Field label="SWIFT / BIC Code"  k="swift_code"      placeholder="XXXXXXXX" />
              <Field label="Bank Branch"        k="bank_branch"     placeholder="Cairo Road, Lusaka" />
            </div>

            <Section title="System" />
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Default Login:</span> admin / saguaro2025
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Database:</span> Local SQLite (offline-first)
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Version:</span> Saguaro CRM v1.0.0
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={save} disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                <Save size={13} /> {saving ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

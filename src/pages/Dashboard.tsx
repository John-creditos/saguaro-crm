import React, { useEffect, useState } from 'react'
import { Users, TrendingUp, FileText, CheckSquare, AlertCircle, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { api } from '../lib/api'


const fmt = (n: number) => n?.toLocaleString('en-ZM', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const statusBadge = (s: string) => {
  const map: any = {
    Paid: 'badge-green', Unpaid: 'badge-amber', Overdue: 'badge-red',
    Partial: 'badge-blue', Active: 'badge-green', Prospect: 'badge-blue',
  }
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    api.dashboard.stats().then(setStats)
  }, [])

  if (!stats) return (
    <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading dashboard...</div>
    </div>
  )

  const chartData = MONTHS.map((m, i) => {
    const row = stats.monthlyRevenue?.find((r: any) => parseInt(r.month) === i + 1)
    return { month: m, invoiced: row?.invoiced || 0, collected: row?.collected || 0 }
  })

  const pipelineData = stats.pipelineByStage?.map((r: any) => ({
    stage: r.stage, count: r.count, value: r.value
  })) || []

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Saguaro Private Equity — Live Business Overview</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-ZM', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="page-body">
        {/* KPI Row */}
        <div className="kpi-grid" style={{ marginBottom: 14 }}>
          <div className="kpi-card">
            <div className="kpi-label">Total Clients</div>
            <div className="kpi-value accent">{stats.totalClients}</div>
            <div className="kpi-sub">{stats.activeClients} active</div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-label">Active Engagements</div>
            <div className="kpi-value blue">{stats.activeEngagements}</div>
            <div className="kpi-sub">Ongoing mandates</div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-label">Outstanding Invoices</div>
            <div className="kpi-value amber">{stats.unpaidInvoices}</div>
            <div className="kpi-sub">ZMW {fmt(stats.outstandingBalance)} due</div>
          </div>
          <div className="kpi-card red">
            <div className="kpi-label">Invoiced YTD</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>ZMW {fmt(stats.totalInvoicedYTD)}</div>
            <div className="kpi-sub">{stats.overdueInvoices} overdue</div>
          </div>
        </div>

        {/* Charts row */}
        <div className="dash-grid-3" style={{ marginBottom: 14 }}>
          {/* Revenue chart */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Monthly Revenue — {new Date().getFullYear()}</div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #242424', borderRadius: 6, fontSize: 11 }}
                  itemStyle={{ color: '#f0f0f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="invoiced"  fill="#1a56db" radius={[3,3,0,0]} name="Invoiced" />
                <Bar dataKey="collected" fill="#1a3a6b" radius={[3,3,0,0]} name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Pipeline by Stage</div>
            </div>
            {pipelineData.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>No pipeline data yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pipelineData.map((row: any) => (
                  <div key={row.stage} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <div style={{ width: 80, color: 'var(--text-muted)', flexShrink: 0 }}>{row.stage}</div>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((row.count / Math.max(...pipelineData.map((r:any)=>r.count),1)) * 100, 100)}%`, background: 'var(--accent)', borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 20, textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 700 }}>{row.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tables row */}
        <div className="dash-grid">
          {/* Recent Invoices */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Invoices</div>
            </div>
            {stats.recentInvoices?.length === 0 ? (
              <div className="empty-state"><p>No invoices yet</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentInvoices?.map((inv: any) => (
                      <tr key={inv.id}>
                        <td className="font-mono text-accent" style={{ fontSize: 11 }}>{inv.invoice_no}</td>
                        <td>{inv.client_name}</td>
                        <td className="text-right">{inv.currency} {fmt(inv.total)}</td>
                        <td style={{ fontSize: 11 }}>{inv.due_date}</td>
                        <td>{statusBadge(inv.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upcoming Tasks + Recent Clients */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Upcoming Tasks</div>
                <AlertCircle size={13} color="var(--amber)" />
              </div>
              {stats.upcomingTasks?.length === 0 ? (
                <div className="empty-state" style={{ padding: '16px' }}><p>No pending tasks</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stats.upcomingTasks?.map((t: any) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{t.title}</div>
                        {t.client_name && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.client_name}</div>}
                      </div>
                      <div>
                        <span className={`badge ${t.priority === 'High' ? 'badge-red' : t.priority === 'Medium' ? 'badge-amber' : 'badge-gray'}`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Recent Clients</div>
              </div>
              {stats.recentClients?.map((c: any) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--accent-dim)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0
                  }}>
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.industry || c.type}</div>
                  </div>
                  {statusBadge(c.status)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

import axios from 'axios'

const BASE = '/api'

// ── Token management ──────────────────────────────────────
export const getToken  = () => localStorage.getItem('crm_token') || ''
export const setToken  = (t: string) => localStorage.setItem('crm_token', t)
export const clearToken = () => localStorage.removeItem('crm_token')

const ax = axios.create({ baseURL: BASE })
ax.interceptors.request.use(cfg => {
  const token = getToken()
  if (token) cfg.headers['x-auth-token'] = token
  return cfg
})
ax.interceptors.response.use(
  r => r.data,
  err => {
    if (err.response?.status === 401) {
      clearToken()
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

// ── API surface — mirrors original window.api exactly ─────
export const api = {

  auth: {
    login:  (d: any) => ax.post('/auth/login', d),
    logout: ()       => ax.post('/auth/logout'),
  },

  clients: {
    getAll: ()        => ax.get('/clients'),
    get:    (id: any) => ax.get(`/clients/${id}`),
    create: (d: any)  => ax.post('/clients', d),
    update: (d: any)  => ax.put(`/clients/${d.id}`, d),
    delete: (id: any) => ax.delete(`/clients/${id}`),
  },

  engagements: {
    getAll:      ()             => ax.get('/engagements'),
    getByClient: (clientId: any)=> ax.get(`/engagements/by-client/${clientId}`),
    create:      (d: any)       => ax.post('/engagements', d),
    update:      (d: any)       => ax.put(`/engagements/${d.id}`, d),
    delete:      (id: any)      => ax.delete(`/engagements/${id}`),
  },

  invoices: {
    getAll: ()        => ax.get('/invoices'),
    get:    (id: any) => ax.get(`/invoices/${id}`),
    create: (d: any)  => ax.post('/invoices', d),
    update: (d: any)  => ax.put(`/invoices/${d.id}`, d),
    delete: (id: any) => ax.delete(`/invoices/${id}`),
  },

  tasks: {
    getAll: ()        => ax.get('/tasks'),
    create: (d: any)  => ax.post('/tasks', d),
    update: (d: any)  => ax.put(`/tasks/${d.id}`, d),
    delete: (id: any) => ax.delete(`/tasks/${id}`),
  },

  interactions: {
    getAll: (clientId?: any) => ax.get('/interactions', clientId ? { params: { client_id: clientId } } : {}),
    create: (d: any)         => ax.post('/interactions', d),
  },

  dashboard: {
    stats: () => ax.get('/dashboard'),
  },

  settings: {
    getAll: ()       => ax.get('/settings'),
    update: (d: any) => ax.put('/settings', d),
  },
  team: {
    getAll:         ()        => ax.get('/team'),
    create:         (d: any)  => ax.post('/team', d),
    update:         (d: any)  => ax.put(`/team/${d.id}`, d),
    delete:         (id: any) => ax.delete(`/team/${id}`),
    changePassword: (id: any, password: string) => ax.put(`/team/${id}/password`, { password }),
  },

}

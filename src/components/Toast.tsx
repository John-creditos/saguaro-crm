import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

const ToastCtx = createContext<any>(null)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<any[]>([])

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const remove = (id: number) => setToasts(t => t.filter(x => x.id !== id))

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {t.msg}
            <button className="btn btn-icon" style={{ marginLeft: 'auto', padding: '0' }} onClick={() => remove(t.id)}>
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

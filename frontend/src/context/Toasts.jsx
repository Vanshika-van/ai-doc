import { createContext, useCallback, useContext, useState } from 'react'

// A tiny "toast": a short message at the bottom of the screen that disappears by itself.
const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const notify = useCallback((message, kind = 'error') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((all) => [...all, { id, message, kind }])
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), 5000)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
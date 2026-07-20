import { createContext, useCallback, useContext, useState } from 'react'

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" className="shrink-0 mt-[1px]">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.8 8.2l2.1 2.1 4.3-4.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" className="shrink-0 mt-[1px]">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
      <line x1="8" y1="4.6" x2="8" y2="8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.9" fill="currentColor" />
    </svg>
  )
}

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, type = 'success') => {
      const id = ++idCounter
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => remove(id), type === 'error' ? 6000 : 3500)
    },
    [remove]
  )

  const showSuccess = useCallback((message) => show(message, 'success'), [show])
  const showError = useCallback((message) => show(message, 'error'), [show])

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 text-[12.5px] leading-snug px-3.5 py-2.5 rounded-sm border max-w-sm break-words ${
              t.type === 'error' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'
            }`}
          >
            {t.type === 'error' ? <AlertIcon /> : <CheckIcon />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

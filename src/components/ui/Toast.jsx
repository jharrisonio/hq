import { createContext, useCallback, useContext, useState } from 'react'

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
            className={`pointer-events-auto text-[12.5px] leading-snug px-3.5 py-2.5 rounded-sm border max-w-sm break-words ${
              t.type === 'error' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'
            }`}
          >
            {t.message}
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

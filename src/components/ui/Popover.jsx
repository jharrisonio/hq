import { useEffect, useRef, useState } from 'react'

// trigger: (toggle, open) => JSX — the button/element that opens the popover.
// children: (close) => JSX — the popover's content; call close() after a selection.
export default function Popover({ trigger, children, align = 'end' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && (
        <div
          className={`absolute z-20 mt-1.5 min-w-[170px] bg-white border border-gray-200 rounded-sm py-1 ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

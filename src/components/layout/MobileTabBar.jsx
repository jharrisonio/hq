import { NavLink } from 'react-router-dom'

const TABS = [
  { label: 'Projects', to: '/', end: true },
  { label: 'Todos', to: '/todos' },
  { label: 'Finance', to: '/finance' },
  { label: 'Settings', to: '/settings' },
]

const tabClass = ({ isActive }) =>
  `flex-1 flex items-center justify-center h-full text-[11px] font-medium uppercase tracking-widest border-t-2 transition-colors ${
    isActive ? 'border-black text-black' : 'border-transparent text-gray-400'
  }`

export default function MobileTabBar({ className = '' }) {
  return (
    <div className={`flex h-[52px] border-t border-gray-100 bg-white ${className}`}>
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={tabClass}>
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}

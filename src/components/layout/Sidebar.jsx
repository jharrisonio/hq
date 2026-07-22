import { NavLink } from 'react-router-dom'

const PROJECT_ROUTES = {
  'canada-pr': '/pr',
  apartment: '/apartment',
}

const navLinkClass = ({ isActive }) =>
  `block px-2.5 py-1.5 rounded-sm text-[13px] transition-colors ${
    isActive ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

function SectionLabel({ children }) {
  return <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-300 px-2.5 mt-5 mb-1.5">{children}</div>
}

export default function Sidebar({ projects, user, onSignOut }) {
  return (
    <div className="hidden md:flex w-[240px] shrink-0 border-r border-gray-100 flex-col h-full bg-white">
      <div className="px-2.5 pt-5 pb-3">
        <div className="px-2.5 text-[13px] font-semibold tracking-wide">HQ</div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        <NavLink to="/" end className={navLinkClass}>
          Dashboard
        </NavLink>

        <SectionLabel>Projects</SectionLabel>
        <div className="flex flex-col gap-0.5">
          {projects.map((p) => (
            <NavLink key={p.id} to={PROJECT_ROUTES[p.slug] || `/${p.slug}`} className={navLinkClass}>
              {p.name}
            </NavLink>
          ))}
        </div>

        <SectionLabel>Personal</SectionLabel>
        <div className="flex flex-col gap-0.5">
          <NavLink to="/todos" className={navLinkClass}>
            Todos
          </NavLink>
          <NavLink to="/crm" className={navLinkClass}>
            CRM
          </NavLink>
          <NavLink to="/finance" className={navLinkClass}>
            Finance
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            Settings
          </NavLink>
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-[12px] text-gray-500 truncate">{user?.user_metadata?.full_name || user?.email}</span>
        <button onClick={onSignOut} className="text-[11px] text-gray-400 hover:text-black shrink-0 ml-2">
          Sign out
        </button>
      </div>
    </div>
  )
}

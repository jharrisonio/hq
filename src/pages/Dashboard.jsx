import { Link, useOutletContext } from 'react-router-dom'

const PROJECT_ROUTES = {
  'canada-pr': '/pr',
  apartment: '/apartment',
}

const PERSONAL_CARDS = [
  { name: 'Todos', to: '/todos' },
  { name: 'CRM', to: '/crm' },
]

function Card({ name, to }) {
  return (
    <Link
      to={to}
      className="flex items-center p-5 border border-gray-100 rounded-sm hover:border-gray-300 transition-colors"
    >
      <span className="text-[13px] font-medium">{name}</span>
    </Link>
  )
}

export default function Dashboard() {
  const { projects } = useOutletContext()

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="text-[11px] font-medium uppercase tracking-widest text-black mb-6">Dashboard</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
        {projects.map((p) => (
          <Card key={p.id} name={p.name} to={PROJECT_ROUTES[p.slug] || `/${p.slug}`} />
        ))}
        {PERSONAL_CARDS.map((c) => (
          <Card key={c.name} {...c} />
        ))}
      </div>
    </div>
  )
}

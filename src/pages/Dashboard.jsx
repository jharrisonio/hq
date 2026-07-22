import { Link, useOutletContext } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'

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
    <div className="h-full flex flex-col">
      <PageHeader title="Dashboard" />
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
          {projects.map((p) => (
            <Card key={p.id} name={p.name} to={PROJECT_ROUTES[p.slug] || `/${p.slug}`} />
          ))}
          {PERSONAL_CARDS.map((c) => (
            <Card key={c.name} {...c} />
          ))}
        </div>
      </div>
    </div>
  )
}

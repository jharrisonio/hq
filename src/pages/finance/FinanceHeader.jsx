import { NavLink } from 'react-router-dom'

const tabClass = ({ isActive }) =>
  `text-[11px] font-medium uppercase tracking-widest pb-2.5 border-b-2 transition-colors ${
    isActive ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
  }`

export default function FinanceHeader({ right }) {
  return (
    <div className="shrink-0 border-b border-gray-100">
      <div className="flex items-center justify-between h-[52px] px-4 md:px-6">
        <div className="text-[11px] font-medium uppercase tracking-widest text-black">Finance</div>
        {right}
      </div>
      <div className="flex items-center gap-5 px-4 md:px-6 pt-1">
        <NavLink to="/finance" end className={tabClass}>
          Dashboard
        </NavLink>
        <NavLink to="/finance/transactions" className={tabClass}>
          Transactions
        </NavLink>
      </div>
    </div>
  )
}

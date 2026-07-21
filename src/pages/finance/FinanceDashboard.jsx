import { useOutletContext } from 'react-router-dom'
import { useTransactions } from '../../hooks/useTransactions'
import { currency } from '../../lib/currency'
import FinanceHeader from './FinanceHeader'

function CategoryBreakdown({ transactions }) {
  const totals = {}
  transactions
    .filter((t) => t.amount > 0)
    .forEach((t) => {
      const key = t.category || 'Uncategorized'
      totals[key] = (totals[key] || 0) + t.amount
    })
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1])
  if (rows.length === 0) return null
  const max = rows[0][1]

  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-300 mb-3">Spend by Category</div>
      <div className="flex flex-col gap-2.5">
        {rows.map(([category, total]) => (
          <div key={category} className="flex items-center gap-3">
            <div className="w-[130px] shrink-0 text-[12px] text-gray-600 truncate">{category}</div>
            <div className="flex-1 h-[6px] bg-gray-50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-700 rounded-full"
                style={{ width: `${Math.max((total / max) * 100, 3)}%` }}
              />
            </div>
            <div className="w-[80px] shrink-0 text-[12px] text-gray-500 text-right tabular-nums">
              {currency.format(total)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubscriptionsList({ transactions }) {
  const subscriptions = transactions.filter((t) => t.is_subscription)
  if (subscriptions.length === 0) return null

  const byMerchant = {}
  subscriptions.forEach((t) => {
    const key = t.merchant || t.description
    if (!byMerchant[key] || t.txn_date > byMerchant[key].txn_date) byMerchant[key] = t
  })
  const rows = Object.values(byMerchant).sort((a, b) => b.amount - a.amount)

  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-300 mb-3">Subscriptions</div>
      <div className="flex flex-col gap-2">
        {rows.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12.5px] text-black truncate">{t.merchant || t.description}</div>
              {t.note && <div className="text-[11px] text-gray-400 mt-0.5">{t.note}</div>}
            </div>
            <div className="text-[12px] text-gray-500 tabular-nums shrink-0">{currency.format(t.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FinanceDashboard() {
  const { user } = useOutletContext()
  const { transactions, loading } = useTransactions(user?.id)

  if (loading) return null

  return (
    <div className="h-full flex flex-col">
      <FinanceHeader />

      <div className="flex-1 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="px-6 py-10 text-[13px] text-gray-300">
            No transactions yet. Import a CIBC credit card CSV export from the Transactions tab to get started.
          </div>
        ) : (
          <>
            <CategoryBreakdown transactions={transactions} />
            <SubscriptionsList transactions={transactions} />
          </>
        )}
      </div>
    </div>
  )
}

import { useOutletContext } from 'react-router-dom'
import { useState } from 'react'
import { currency } from '../../lib/currency'
import { filterByPeriod } from '../../lib/periods'
import { useToast } from '../../components/ui/Toast'
import FinanceHeader from './FinanceHeader'
import PeriodFilter from './PeriodFilter'
import SpendTrendChart from './SpendTrendChart'
import TransactionDetailPanel from './TransactionDetailPanel'

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

function SubscriptionsList({ transactions, onSelect }) {
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
          <div
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="flex items-start justify-between gap-3 cursor-pointer group"
          >
            <div className="min-w-0">
              <div className="text-[12.5px] text-black truncate group-hover:underline underline-offset-2">
                {t.merchant || t.description}
              </div>
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
  const { transactions, updateTransaction, outlierThreshold } = useOutletContext()
  const { showError } = useToast()
  const [period, setPeriod] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  const periodTransactions = filterByPeriod(transactions, period)
  const selectedTransaction = transactions.find((t) => t.id === selectedId) || null

  const handleUpdateCategory = async (id, newCategory) => {
    try {
      await updateTransaction(id, { category: newCategory, status: 'categorized' })
    } catch (err) {
      showError(err.message)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <FinanceHeader right={<PeriodFilter transactions={transactions} period={period} onChange={setPeriod} />} />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-w-0">
          {transactions.length === 0 ? (
            <div className="px-6 py-10 text-[13px] text-gray-300">
              No transactions yet. Import a CIBC credit card CSV export from the Transactions tab to get started.
            </div>
          ) : periodTransactions.length === 0 ? (
            <div className="px-6 py-10 text-[13px] text-gray-300">No transactions in this period.</div>
          ) : (
            <>
              <SpendTrendChart transactions={periodTransactions} period={period} outlierThreshold={outlierThreshold} />
              <CategoryBreakdown transactions={periodTransactions} />
              <SubscriptionsList transactions={periodTransactions} onSelect={setSelectedId} />
            </>
          )}
        </div>

        <TransactionDetailPanel
          transaction={selectedTransaction}
          allTransactions={transactions}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
          onUpdateCategory={handleUpdateCategory}
        />
      </div>
    </div>
  )
}

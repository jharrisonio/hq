import { useOutletContext } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useFinancialAccounts } from '../hooks/useFinancialAccounts'
import { useTransactions } from '../hooks/useTransactions'
import { parseCibcCsv } from '../lib/parseCibcCsv'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'

const currency = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

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

function TransactionRow({ t }) {
  const isCredit = t.amount < 0
  return (
    <div className="flex items-center gap-3 px-6 py-2 border-b border-gray-50 last:border-b-0">
      <div className="w-[56px] shrink-0 text-[11px] text-gray-400 tabular-nums">{formatDate(t.txn_date)}</div>
      <div className="flex-1 min-w-0 text-[12.5px] text-gray-700 truncate">{t.merchant || t.description}</div>
      {t.status === 'pending' ? (
        <div className="text-[9px] font-medium uppercase tracking-wider text-gray-300 border border-gray-200 px-1.5 py-0.5 rounded-sm shrink-0">
          Pending
        </div>
      ) : (
        t.category && (
          <div className="text-[10px] text-gray-400 shrink-0 max-w-[120px] truncate">{t.category}</div>
        )
      )}
      <div
        className={`w-[80px] shrink-0 text-[12.5px] text-right tabular-nums ${isCredit ? 'text-gray-400' : 'text-black'}`}
      >
        {isCredit ? '−' : ''}
        {currency.format(Math.abs(t.amount))}
      </div>
    </div>
  )
}

export default function FinancePage() {
  const { user } = useOutletContext()
  const { accounts, loading: accountsLoading } = useFinancialAccounts(user?.id)
  const { transactions, loading: transactionsLoading, importTransactions } = useTransactions(user?.id)
  const { showSuccess, showError } = useToast()
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  const account = accounts[0]

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !account) return
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = parseCibcCsv(text)
      if (parsed.length === 0) throw new Error('No transactions found in that file')
      const { inserted, skipped } = await importTransactions(account.id, parsed)
      showSuccess(`Imported ${inserted} transaction${inserted === 1 ? '' : 's'}${skipped ? ` (${skipped} already imported)` : ''}`)
    } catch (err) {
      showError(err.message)
    } finally {
      setImporting(false)
    }
  }

  if (accountsLoading || transactionsLoading) return null

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 shrink-0">
        <div className="text-[11px] font-medium uppercase tracking-widest text-black">Finance</div>
        <div>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import CIBC CSV'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <CategoryBreakdown transactions={transactions} />
        <SubscriptionsList transactions={transactions} />

        {transactions.length === 0 ? (
          <div className="px-6 py-10 text-[13px] text-gray-300">
            No transactions yet. Import a CIBC credit card CSV export to get started.
          </div>
        ) : (
          <div className="pt-1">
            {transactions.map((t) => (
              <TransactionRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useOutletContext } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useFinancialAccounts } from '../../hooks/useFinancialAccounts'
import { useTransactions } from '../../hooks/useTransactions'
import { parseCibcCsv } from '../../lib/parseCibcCsv'
import { currency } from '../../lib/currency'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import FinanceHeader from './FinanceHeader'
import TransactionDetailPanel from './TransactionDetailPanel'

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function TransactionRow({ t, isActive, onSelect }) {
  const isCredit = t.amount < 0
  return (
    <div
      onClick={() => onSelect(t.id)}
      className={`flex items-center gap-3 px-6 py-2 cursor-pointer border-b border-gray-50 border-l-2 transition-colors hover:bg-gray-50 last:border-b-0 ${
        isActive ? 'border-l-black bg-gray-50' : 'border-l-transparent'
      }`}
    >
      <div className="w-[56px] shrink-0 text-[11px] text-gray-400 tabular-nums">{formatDate(t.txn_date)}</div>
      <div className="flex-1 min-w-0 text-[12.5px] text-gray-700 truncate">{t.merchant || t.description}</div>
      {t.status === 'pending' ? (
        <div className="text-[9px] font-medium uppercase tracking-wider text-gray-300 border border-gray-200 px-1.5 py-0.5 rounded-sm shrink-0">
          Pending
        </div>
      ) : (
        t.category && <div className="text-[10px] text-gray-400 shrink-0 max-w-[120px] truncate">{t.category}</div>
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

export default function FinanceTransactions() {
  const { user } = useOutletContext()
  const { accounts, loading: accountsLoading } = useFinancialAccounts(user?.id)
  const { transactions, loading: transactionsLoading, importTransactions } = useTransactions(user?.id)
  const { showSuccess, showError } = useToast()
  const [importing, setImporting] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const fileInputRef = useRef(null)

  const account = accounts[0]
  const selectedTransaction = transactions.find((t) => t.id === selectedId) || null

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
      <FinanceHeader
        right={
          <div>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? 'Importing…' : 'Import CIBC CSV'}
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-w-0">
          {transactions.length === 0 ? (
            <div className="px-6 py-10 text-[13px] text-gray-300">
              No transactions yet. Import a CIBC credit card CSV export to get started.
            </div>
          ) : (
            transactions.map((t) => (
              <TransactionRow key={t.id} t={t} isActive={t.id === selectedId} onSelect={setSelectedId} />
            ))
          )}
        </div>

        <TransactionDetailPanel
          transaction={selectedTransaction}
          allTransactions={transactions}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
        />
      </div>
    </div>
  )
}

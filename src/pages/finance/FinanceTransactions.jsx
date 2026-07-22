import { useOutletContext } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFinancialAccounts } from '../../hooks/useFinancialAccounts'
import { useTransactions } from '../../hooks/useTransactions'
import { parseCibcCsv } from '../../lib/parseCibcCsv'
import { currency } from '../../lib/currency'
import { filterByPeriod } from '../../lib/periods'
import { FINANCE_CATEGORIES } from '../../lib/financeCategories'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Popover from '../../components/ui/Popover'
import { FilterIcon } from '../../components/ui/icons'
import FinanceHeader from './FinanceHeader'
import PeriodFilter from './PeriodFilter'
import TransactionDetailPanel from './TransactionDetailPanel'

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function TransactionRow({ t, index, isActive, isSelected, onSelect, onToggleSelect, onRangeSelect }) {
  const isCredit = t.amount < 0

  const handleClick = (e) => {
    if (e.shiftKey) onRangeSelect(index)
    else if (e.metaKey || e.ctrlKey) onToggleSelect(t.id, index)
    else onSelect(t.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 h-9 px-6 cursor-pointer select-none border-b border-gray-50 border-l-2 transition-colors hover:bg-gray-50 last:border-b-0 ${
        isActive ? 'border-l-black bg-gray-50' : 'border-l-transparent'
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggleSelect(t.id, index)}
        className="shrink-0"
      />
      <div className="w-[56px] shrink-0 text-[11px] text-gray-400 tabular-nums">{formatDate(t.txn_date)}</div>
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-[12.5px] text-gray-700 truncate min-w-0">{t.merchant || t.description}</span>
        {t.merchant && t.merchant !== t.description && (
          <span className="text-[10.5px] text-gray-400 truncate shrink-0 max-w-[160px]">{t.description}</span>
        )}
      </div>
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

function CategoryFilter({ transactions, value, onChange }) {
  const categories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category).filter(Boolean))).sort(),
    [transactions]
  )
  const label = value === 'all' ? 'All Categories' : value === 'pending' ? 'Pending' : value

  return (
    <Popover
      trigger={(toggle) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-black hover:border-gray-400 border border-gray-200 rounded-sm px-2 py-1"
        >
          <FilterIcon />
          {label}
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col max-h-[280px] overflow-y-auto">
          {[{ value: 'all', label: 'All Categories' }, { value: 'pending', label: 'Pending' }, ...categories.map((c) => ({ value: c, label: c }))].map(
            (o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value)
                  close()
                }}
                className={`text-left text-[12px] px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap ${
                  o.value === value ? 'text-black font-medium' : 'text-gray-600'
                }`}
              >
                {o.label}
              </button>
            )
          )}
        </div>
      )}
    </Popover>
  )
}

function AmountFilter({ min, max, onChange }) {
  const label = min || max ? `${min || '0'}–${max || '∞'}` : 'Any Amount'
  return (
    <Popover
      trigger={(toggle) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-black hover:border-gray-400 border border-gray-200 rounded-sm px-2 py-1"
        >
          <FilterIcon />
          {label}
        </button>
      )}
    >
      {() => (
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            type="number"
            value={min}
            onChange={(e) => onChange(e.target.value, max)}
            placeholder="Min"
            className="w-[70px] text-[12px] border border-gray-200 rounded-sm px-2 py-1"
          />
          <span className="text-gray-300">–</span>
          <input
            type="number"
            value={max}
            onChange={(e) => onChange(min, e.target.value)}
            placeholder="Max"
            className="w-[70px] text-[12px] border border-gray-200 rounded-sm px-2 py-1"
          />
        </div>
      )}
    </Popover>
  )
}

function BulkActionBar({ count, visibleCount, onSelectAllVisible, onApply, onClear, applying }) {
  const [bulkCategory, setBulkCategory] = useState('')

  const handleApply = async () => {
    if (!bulkCategory) return
    await onApply(bulkCategory)
    setBulkCategory('')
  }

  return (
    <div className="flex items-center gap-3 h-11 px-6 border-b border-gray-100 bg-gray-50 shrink-0">
      <span className="text-[12px] font-medium text-black tabular-nums">{count} selected</span>
      {count < visibleCount && (
        <button
          onClick={onSelectAllVisible}
          className="text-[11px] text-gray-400 hover:text-black underline underline-offset-2"
        >
          Select all {visibleCount}
        </button>
      )}

      <div className="w-px h-4 bg-gray-200" />

      <span className="text-[11px] text-gray-400">Set category</span>
      <select
        value={bulkCategory}
        onChange={(e) => setBulkCategory(e.target.value)}
        className="text-[12px] border border-gray-200 rounded-sm px-2 py-1 bg-white"
      >
        <option value="">Choose…</option>
        {FINANCE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <Button variant="primary" onClick={handleApply} disabled={!bulkCategory || applying} className="text-[12px] py-1">
        {applying ? 'Applying…' : 'Apply'}
      </Button>

      <button onClick={onClear} className="ml-auto text-[11px] text-gray-400 hover:text-black">
        Clear selection
      </button>
    </div>
  )
}

export default function FinanceTransactions() {
  const { user } = useOutletContext()
  const { accounts, loading: accountsLoading } = useFinancialAccounts(user?.id)
  const {
    transactions,
    loading: transactionsLoading,
    importTransactions,
    updateTransaction,
    bulkUpdateCategory,
  } = useTransactions(user?.id)
  const { showSuccess, showError } = useToast()
  const [importing, setImporting] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  const [bulkApplying, setBulkApplying] = useState(false)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [category, setCategory] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const fileInputRef = useRef(null)

  const account = accounts[0]
  const selectedTransaction = transactions.find((t) => t.id === selectedId) || null

  const hasActiveFilters = search || period !== 'all' || category !== 'all' || minAmount || maxAmount

  const clearFilters = () => {
    setSearch('')
    setPeriod('all')
    setCategory('all')
    setMinAmount('')
    setMaxAmount('')
  }

  const filteredTransactions = useMemo(() => {
    let rows = filterByPeriod(transactions, period)
    if (category === 'pending') rows = rows.filter((t) => t.status === 'pending')
    else if (category !== 'all') rows = rows.filter((t) => t.category === category)
    if (minAmount) rows = rows.filter((t) => t.amount >= Number(minAmount))
    if (maxAmount) rows = rows.filter((t) => t.amount <= Number(maxAmount))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (t) => t.description.toLowerCase().includes(q) || (t.merchant && t.merchant.toLowerCase().includes(q))
      )
    }
    return rows
  }, [transactions, period, category, minAmount, maxAmount, search])

  // Statement payments are large negative amounts that would otherwise net
  // against spend and make the total meaningless — excluded here to match
  // the "sum(amount) excluding Payment" net-spend convention used
  // elsewhere, unless the user has filtered down to Payment rows
  // specifically, in which case excluding them would just zero it out.
  const totalTransactions =
    category === 'Payment' ? filteredTransactions : filteredTransactions.filter((t) => t.category !== 'Payment')
  const filteredTotal = totalTransactions.reduce((sum, t) => sum + t.amount, 0)

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

  const handleUpdateCategory = async (id, newCategory) => {
    try {
      await updateTransaction(id, { category: newCategory, status: 'categorized' })
    } catch (err) {
      showError(err.message)
    }
  }

  // Plain click opens the detail panel (onSelect). Cmd/Ctrl-click toggles
  // one row in/out of the bulk selection and sets the shift-click anchor.
  // Shift-click extends the selection from that anchor to the clicked row,
  // Finder/Gmail-style.
  const toggleSelect = (id, index) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    if (index !== undefined) setLastSelectedIndex(index)
  }

  const rangeSelect = (index) => {
    if (lastSelectedIndex === null) {
      toggleSelect(filteredTransactions[index].id, index)
      return
    }
    const [start, end] = [lastSelectedIndex, index].sort((a, b) => a - b)
    const rangeIds = filteredTransactions.slice(start, end + 1).map((t) => t.id)
    setSelectedIds((prev) => new Set([...prev, ...rangeIds]))
    setLastSelectedIndex(index)
  }

  const selectAllVisible = () => {
    setSelectedIds((prev) => new Set([...prev, ...filteredTransactions.map((t) => t.id)]))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setLastSelectedIndex(null)
  }

  // Escape deselects all, same as Clear selection — Finder/Gmail-style.
  useEffect(() => {
    if (selectedIds.size === 0) return
    const handleKey = (e) => {
      if (e.key === 'Escape') clearSelection()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedIds.size])

  const handleBulkApply = async (bulkCategory) => {
    setBulkApplying(true)
    try {
      const ids = Array.from(selectedIds)
      await bulkUpdateCategory(ids, bulkCategory)
      showSuccess(`Categorized ${ids.length} transaction${ids.length === 1 ? '' : 's'} as ${bulkCategory}`)
      setSelectedIds(new Set())
    } catch (err) {
      showError(err.message)
    } finally {
      setBulkApplying(false)
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

      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-gray-100 shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions…"
          className="w-[180px] text-[12px] border border-gray-200 rounded-sm px-2.5 py-1"
        />
        <PeriodFilter transactions={transactions} period={period} onChange={setPeriod} />
        <CategoryFilter transactions={transactions} value={category} onChange={setCategory} />
        <AmountFilter
          min={minAmount}
          max={maxAmount}
          onChange={(mn, mx) => {
            setMinAmount(mn)
            setMaxAmount(mx)
          }}
        />
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[11px] text-gray-400 hover:text-black">
            Clear filters
          </button>
        )}
        <div className="ml-auto text-[12px] text-gray-500 tabular-nums shrink-0">
          {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'} ·{' '}
          <span className={filteredTotal < 0 ? 'text-gray-500' : 'text-black font-medium'}>
            {filteredTotal < 0 ? '−' : ''}
            {currency.format(Math.abs(filteredTotal))}
          </span>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          visibleCount={filteredTransactions.length}
          onSelectAllVisible={selectAllVisible}
          onApply={handleBulkApply}
          onClear={clearSelection}
          applying={bulkApplying}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-w-0">
          {transactions.length === 0 ? (
            <div className="px-6 py-10 text-[13px] text-gray-300">
              No transactions yet. Import a CIBC credit card CSV export to get started.
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-6 py-10 text-[13px] text-gray-300">No transactions match these filters.</div>
          ) : (
            filteredTransactions.map((t, index) => (
              <TransactionRow
                key={t.id}
                t={t}
                index={index}
                isActive={t.id === selectedId}
                isSelected={selectedIds.has(t.id)}
                onSelect={setSelectedId}
                onToggleSelect={toggleSelect}
                onRangeSelect={rangeSelect}
              />
            ))
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

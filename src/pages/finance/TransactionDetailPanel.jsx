import { currency } from '../../lib/currency'

const SIMILAR_TRANSACTIONS_LIMIT = 8

function formatFullDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-CA', { dateStyle: 'medium' })
}

function formatShortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Section({ label, children }) {
  return (
    <div className="px-5 py-3.5 border-b border-gray-100">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-300 mb-2">{label}</div>
      {children}
    </div>
  )
}

function findSimilarTransactions(transaction, allTransactions) {
  return allTransactions
    .filter((t) => t.id !== transaction.id)
    .filter(
      (t) =>
        t.description === transaction.description ||
        (transaction.merchant && t.merchant && t.merchant === transaction.merchant)
    )
    .sort((a, b) => (a.txn_date < b.txn_date ? 1 : -1))
}

export default function TransactionDetailPanel({ transaction, allTransactions, onClose, onSelect }) {
  if (!transaction) return null

  const isCredit = transaction.amount < 0
  const similar = findSimilarTransactions(transaction, allTransactions)
  const shownSimilar = similar.slice(0, SIMILAR_TRANSACTIONS_LIMIT)

  return (
    <div className="w-[360px] border-l border-gray-100 overflow-y-auto overflow-x-hidden shrink-0 bg-white flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3.5 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="text-[14px] font-medium leading-snug flex-1 min-w-0 break-words">
          {transaction.merchant || transaction.description}
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-black text-sm leading-none mt-0.5">
          ✕
        </button>
      </div>

      <div className="px-5 py-3 border-b border-gray-200 flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5 min-h-[26px]">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 w-[72px] shrink-0">
            Date
          </span>
          <span className="text-[13px] text-gray-600">{formatFullDate(transaction.txn_date)}</span>
        </div>
        <div className="flex items-center gap-2.5 min-h-[26px]">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 w-[72px] shrink-0">
            Amount
          </span>
          <span className={`text-[13px] tabular-nums ${isCredit ? 'text-gray-500' : 'text-black'}`}>
            {isCredit ? '−' : ''}
            {currency.format(Math.abs(transaction.amount))}
          </span>
        </div>
        <div className="flex items-center gap-2.5 min-h-[26px]">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 w-[72px] shrink-0">
            Category
          </span>
          {transaction.status === 'pending' ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm">
              Pending
            </span>
          ) : (
            <span className="text-[13px] text-gray-600">{transaction.category || 'Uncategorized'}</span>
          )}
        </div>
      </div>

      {transaction.merchant && transaction.merchant !== transaction.description && (
        <Section label="Original Description">
          <div className="text-[12.5px] leading-relaxed text-gray-600 break-words">{transaction.description}</div>
        </Section>
      )}

      {transaction.is_subscription && (
        <Section label="Subscription">
          <div className="text-[12.5px] leading-relaxed text-gray-600 break-words">
            {transaction.note || 'Flagged as a recurring subscription charge.'}
          </div>
        </Section>
      )}

      {shownSimilar.length > 0 && (
        <Section label="Other Occurrences">
          <div className="flex flex-col gap-1.5">
            {shownSimilar.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="flex items-center justify-between gap-2 text-[12px] cursor-pointer text-gray-600 hover:text-black"
              >
                <span className="tabular-nums">{formatShortDate(t.txn_date)}</span>
                <span className={`tabular-nums ${t.amount < 0 ? 'text-gray-400' : ''}`}>
                  {t.amount < 0 ? '−' : ''}
                  {currency.format(Math.abs(t.amount))}
                </span>
              </div>
            ))}
            {similar.length > shownSimilar.length && (
              <div className="text-[11px] text-gray-300 mt-0.5">and {similar.length - shownSimilar.length} more</div>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

// Simple "all time or a specific month" period picker — deliberately not a
// date-range picker. `period` is either 'all' or a 'YYYY-MM' key.

export function getAvailableMonths(transactions) {
  const months = new Set(transactions.map((t) => t.txn_date.slice(0, 7)))
  return Array.from(months).sort().reverse()
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

export function filterByPeriod(transactions, period) {
  if (period === 'all') return transactions
  return transactions.filter((t) => t.txn_date.slice(0, 7) === period)
}

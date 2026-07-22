// Buckets spend transactions by day/week/month and computes average $/day
// per bucket (not total spend) — so a month bar is comparable to a day bar
// instead of just being bigger because it spans more days.

// Any single transaction over this is treated as a one-off (a holiday, a
// big purchase) rather than routine daily spend, and excluded from the
// "adjusted" average alongside the unfiltered "all" average.
export const OUTLIER_THRESHOLD = 300

function dateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function daysBetweenInclusive(a, b) {
  return Math.round((b - a) / 86400000) + 1
}

function mondayOf(d) {
  const day = d.getDay() // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day
  return addDays(d, diff)
}

function periodBounds(transactions, period) {
  const today = dateOnly(new Date())
  if (period === 'all') {
    const dates = transactions.map((t) => t.txn_date).sort()
    const start = dates.length ? new Date(`${dates[0]}T00:00:00`) : today
    return { start, end: today }
  }
  const [year, month] = period.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0)
  const end = lastDayOfMonth < today ? lastDayOfMonth : today
  return { start, end }
}

export function computeSpendTrend(transactions, period, granularity) {
  const spend = transactions.filter((t) => t.amount > 0)
  const { start: periodStart, end: periodEnd } = periodBounds(spend, period)
  if (periodEnd < periodStart) return []

  const inRange = spend.filter((t) => {
    const d = new Date(`${t.txn_date}T00:00:00`)
    return d >= periodStart && d <= periodEnd
  })

  const buckets = new Map()

  inRange.forEach((t) => {
    const d = new Date(`${t.txn_date}T00:00:00`)
    let key, bucketStart, bucketEnd
    if (granularity === 'day') {
      key = t.txn_date
      bucketStart = d
      bucketEnd = d
    } else if (granularity === 'week') {
      const weekStart = mondayOf(d)
      key = weekStart.toISOString().slice(0, 10)
      bucketStart = weekStart
      bucketEnd = addDays(weekStart, 6)
    } else {
      key = t.txn_date.slice(0, 7)
      bucketStart = new Date(d.getFullYear(), d.getMonth(), 1)
      bucketEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    }
    const clippedStart = bucketStart < periodStart ? periodStart : bucketStart
    const clippedEnd = bucketEnd > periodEnd ? periodEnd : bucketEnd
    if (!buckets.has(key)) buckets.set(key, { total: 0, adjustedTotal: 0, start: clippedStart, end: clippedEnd })
    const bucket = buckets.get(key)
    bucket.total += t.amount
    if (t.amount <= OUTLIER_THRESHOLD) bucket.adjustedTotal += t.amount
  })

  return Array.from(buckets.entries())
    .map(([key, b]) => {
      const days = Math.max(daysBetweenInclusive(b.start, b.end), 1)
      return {
        key,
        start: b.start,
        end: b.end,
        total: b.total,
        adjustedTotal: b.adjustedTotal,
        days,
        average: b.total / days,
        adjustedAverage: b.adjustedTotal / days,
      }
    })
    .sort((a, b) => a.start - b.start)
}

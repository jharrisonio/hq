import { useMemo, useState } from 'react'
import { computeSpendTrend, OUTLIER_THRESHOLD } from '../../lib/spendTrend'
import { currency } from '../../lib/currency'

const GRANULARITIES = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

const CHART_HEIGHT = 120

function niceMax(max) {
  if (max <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const steps = [1, 2, 2.5, 5, 10]
  for (const step of steps) {
    const candidate = step * magnitude
    if (candidate >= max) return candidate
  }
  return 10 * magnitude
}

function barHeightPct(value, max) {
  if (value <= 0) return 0
  return Math.max((value / max) * 100, 2)
}

function bucketLabel(bucket, granularity) {
  if (granularity === 'day') return bucket.start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  if (granularity === 'week') {
    const from = bucket.start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    const to = bucket.end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    return `${from} – ${to}`
  }
  return bucket.start.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

function Swatch({ className }) {
  return <span className={`inline-block w-2 h-2 rounded-sm mr-1 align-middle ${className}`} />
}

export default function SpendTrendChart({ transactions, period }) {
  const [granularity, setGranularity] = useState('day')
  const [hoveredKey, setHoveredKey] = useState(null)

  const buckets = useMemo(() => computeSpendTrend(transactions, period, granularity), [transactions, period, granularity])
  const max = useMemo(() => niceMax(Math.max(...buckets.map((b) => b.average), 0)), [buckets])
  const hovered = buckets.find((b) => b.key === hoveredKey) || null

  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-300">Average Spend / Day</div>
        <div className="flex items-center gap-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              onClick={() => setGranularity(g.value)}
              className={`text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
                granularity === g.value
                  ? 'border-black text-black font-medium'
                  : 'border-gray-200 text-gray-400 hover:text-black'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {buckets.length === 0 ? (
        <div className="text-[12px] text-gray-300 py-6">No spend in this period.</div>
      ) : (
        <div className="relative">
          <div className="mb-1.5 text-[11px] flex items-center gap-4">
            <span className="text-gray-500">
              <Swatch className="bg-gray-200" />
              All{hovered && (
                <span className="text-black font-medium tabular-nums"> {currency.format(hovered.average)}/day</span>
              )}
            </span>
            <span className="text-gray-500">
              <Swatch className="bg-gray-700" />
              Excl. outliers (&gt;{currency.format(OUTLIER_THRESHOLD)})
              {hovered && (
                <span className="text-black font-medium tabular-nums">
                  {' '}
                  {currency.format(hovered.adjustedAverage)}/day
                </span>
              )}
            </span>
            {hovered ? (
              <span className="text-gray-400">— {bucketLabel(hovered, granularity)}</span>
            ) : (
              <span className="text-gray-300">— hover a bar for details</span>
            )}
          </div>

          <div className="relative" style={{ height: CHART_HEIGHT }}>
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-gray-100 relative">
                <span className="absolute -top-2 right-0 text-[9px] text-gray-300 bg-white pl-1">
                  {currency.format(max)}
                </span>
              </div>
              <div className="border-t border-gray-100 relative">
                <span className="absolute -top-2 right-0 text-[9px] text-gray-300 bg-white pl-1">
                  {currency.format(max / 2)}
                </span>
              </div>
              <div className="border-t border-gray-200" />
            </div>

            <div className="absolute inset-0 flex items-end gap-[2px] overflow-x-auto">
              {buckets.map((b) => (
                <div
                  key={b.key}
                  onMouseEnter={() => setHoveredKey(b.key)}
                  onMouseLeave={() => setHoveredKey((k) => (k === b.key ? null : k))}
                  className="flex-1 min-w-[3px] max-w-[24px] h-full relative cursor-pointer"
                >
                  <div
                    className={`absolute bottom-0 left-0 w-full rounded-t-[4px] transition-colors ${
                      hoveredKey === b.key ? 'bg-gray-300' : 'bg-gray-200'
                    }`}
                    style={{ height: `${barHeightPct(b.average, max)}%` }}
                  />
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] rounded-t-[3px] transition-colors ${
                      hoveredKey === b.key ? 'bg-black' : 'bg-gray-700'
                    }`}
                    style={{ height: `${barHeightPct(b.adjustedAverage, max)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

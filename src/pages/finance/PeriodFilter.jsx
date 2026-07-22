import Popover from '../../components/ui/Popover'
import { FilterIcon } from '../../components/ui/icons'
import { getAvailableMonths, formatMonthLabel } from '../../lib/periods'

export default function PeriodFilter({ transactions, period, onChange }) {
  const months = getAvailableMonths(transactions)
  const label = period === 'all' ? 'All Time' : formatMonthLabel(period)

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
          <button
            onClick={() => {
              onChange('all')
              close()
            }}
            className={`text-left text-[12px] px-3 py-1.5 hover:bg-gray-50 ${
              period === 'all' ? 'text-black font-medium' : 'text-gray-600'
            }`}
          >
            All Time
          </button>
          {months.map((m) => (
            <button
              key={m}
              onClick={() => {
                onChange(m)
                close()
              }}
              className={`text-left text-[12px] px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap ${
                m === period ? 'text-black font-medium' : 'text-gray-600'
              }`}
            >
              {formatMonthLabel(m)}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}

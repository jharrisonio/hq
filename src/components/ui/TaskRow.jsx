import StatusIcon from './StatusIcon'

const ASSIGNEE_LABELS = { james: 'James', naomi: 'Naomi', both: 'Both' }

function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function isOverdue(d) {
  if (!d) return false
  return new Date(d + 'T23:59:59') < new Date()
}

export default function TaskRow({ task, isChild, isActive, isExpanded, onSelect, onToggleExpand, badge }) {
  const hasChildren = task.children && task.children.length > 0
  const dueFmt = formatDate(task.dueDate)
  const overdue = isOverdue(task.dueDate)

  return (
    <div
      onClick={() => onSelect(task.id)}
      className={`flex items-center gap-2.5 py-2 cursor-pointer border-b border-gray-100 border-l-2 min-h-[40px] transition-colors hover:bg-gray-50 ${
        isChild ? 'pl-11 pr-6' : 'px-6'
      } ${isActive ? 'border-l-black' : 'border-l-transparent'}`}
    >
      {hasChildren ? (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(task.id)
          }}
          className={`w-2.5 text-[9px] shrink-0 select-none flex items-center justify-center -ml-0.5 ${
            isExpanded ? 'text-gray-600' : 'text-gray-300'
          }`}
        >
          {isExpanded ? '▾' : '▸'}
        </span>
      ) : (
        <span className="w-2.5 shrink-0" />
      )}

      <StatusIcon status={task.status} type={task.type} />

      <span
        className={`flex-1 text-[13px] leading-snug min-w-0 whitespace-nowrap overflow-hidden text-ellipsis ${
          task.status === 'done' ? 'line-through text-gray-300' : ''
        }`}
      >
        {task.title}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {dueFmt && (
          <span className={`text-[10px] tracking-wide ${overdue ? 'text-black font-semibold' : 'text-gray-400'}`}>
            {dueFmt}
          </span>
        )}
        {badge && (
          <span className="text-[9px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm">
            {badge}
          </span>
        )}
        {task.assignee && (
          <span className="text-[9px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm">
            {ASSIGNEE_LABELS[task.assignee] || task.assignee}
          </span>
        )}
      </div>
    </div>
  )
}

const STATUS_LABELS = { todo: 'To Do', blocked: 'Blocked', prepared: 'Prepared', done: 'Done' }
const ASSIGNEE_LABELS = { james: 'James', naomi: 'Naomi', both: 'Both' }

function Section({ label, children }) {
  return (
    <div className="px-5 py-3.5 border-b border-gray-100">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-300 mb-2">{label}</div>
      {children}
    </div>
  )
}

function Pills({ tasks, onNavigate }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tasks.map((t) => (
        <span
          key={t.id}
          onClick={() => onNavigate(t.id)}
          className="text-[11px] px-2.5 py-1 cursor-pointer border border-gray-200 text-gray-600 rounded-sm max-w-full truncate hover:border-black hover:text-black"
        >
          {t.title}
        </span>
      ))}
    </div>
  )
}

export default function DetailPanel({
  task,
  getTask,
  onClose,
  onUpdateStatus,
  onUpdateDueDate,
  onNavigate,
  onDelete,
  extraSections = [],
}) {
  if (!task) return null

  const blockedByTasks = (task.blockedBy || []).map(getTask).filter(Boolean)
  const blocksTasks = (task.blocks || []).map(getTask).filter(Boolean)
  const parentTask = task.parentId ? getTask(task.parentId) : null
  const childTasks = (task.children || []).map(getTask).filter(Boolean)
  const driveEntries = Object.entries(task.driveLinks || {})

  return (
    <div className="w-full md:w-[360px] md:border-l border-gray-100 overflow-y-auto overflow-x-hidden shrink-0 bg-white flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3.5 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="text-[14px] font-medium leading-snug flex-1 min-w-0 break-words">{task.title}</div>
        <button onClick={onClose} className="text-gray-300 hover:text-black text-sm leading-none mt-0.5">
          ✕
        </button>
      </div>

      <div className="px-5 py-3 border-b border-gray-200 flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5 min-h-[26px]">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 w-[72px] shrink-0">
            Status
          </span>
          <select
            value={task.status}
            onChange={(e) => onUpdateStatus(task.id, e.target.value)}
            className="text-[11px] font-medium tracking-wide py-1 px-2 border border-gray-200 bg-white rounded-sm cursor-pointer"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {task.assignee && (
          <div className="flex items-center gap-2.5 min-h-[26px]">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 w-[72px] shrink-0">
              Assignee
            </span>
            <span className="text-[13px] text-gray-600">{ASSIGNEE_LABELS[task.assignee] || task.assignee}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 min-h-[26px]">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 w-[72px] shrink-0">
            Due Date
          </span>
          <input
            type="date"
            value={task.dueDate || ''}
            onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
            className="text-[12px] border border-gray-200 rounded-sm px-2 py-1"
          />
        </div>
      </div>

      {task.description && (
        <Section label="Description">
          <div className="text-[12.5px] leading-relaxed text-gray-600 break-words">{task.description}</div>
        </Section>
      )}

      {task.deloitteNote && (
        <Section label="Deloitte's Instructions">
          <div className="border-l-2 border-black pl-3 text-[12px] leading-relaxed text-gray-500 italic break-words">
            {task.deloitteNote}
          </div>
        </Section>
      )}

      {task.note && (
        <Section label="Notes">
          <div className="text-[12.5px] leading-relaxed text-gray-600 break-words">{task.note}</div>
        </Section>
      )}

      {task.links && task.links.length > 0 && (
        <Section label="Links">
          <div className="flex flex-col gap-1.5">
            {task.links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="text-[12.5px] text-black underline underline-offset-2 hover:text-gray-500"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        </Section>
      )}

      {driveEntries.length > 0 && (
        <Section label="Google Drive">
          <div className="flex flex-col gap-2">
            {driveEntries.map(([person, l]) => (
              <div key={person}>
                {driveEntries.length > 1 && (
                  <div className="text-[9px] text-gray-300 font-semibold uppercase tracking-wider mb-0.5">
                    {person === 'joint' ? 'Joint' : person.charAt(0).toUpperCase() + person.slice(1)}
                  </div>
                )}
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12.5px] text-black underline underline-offset-2 hover:text-gray-500"
                >
                  {l.label} ↗
                </a>
              </div>
            ))}
          </div>
        </Section>
      )}

      {parentTask && (
        <Section label="Part Of">
          <Pills tasks={[parentTask]} onNavigate={onNavigate} />
        </Section>
      )}

      {childTasks.length > 0 && (
        <Section label="Sub-Tasks">
          <Pills tasks={childTasks} onNavigate={onNavigate} />
        </Section>
      )}

      {blockedByTasks.length > 0 && (
        <Section label="Blocked By">
          <Pills tasks={blockedByTasks} onNavigate={onNavigate} />
        </Section>
      )}

      {blocksTasks.length > 0 && (
        <Section label="Blocks">
          <Pills tasks={blocksTasks} onNavigate={onNavigate} />
        </Section>
      )}

      {extraSections.map((s, i) => (
        <Section key={i} label={s.label}>
          {s.content}
        </Section>
      ))}

      {onDelete && (
        <div className="px-5 py-3.5 border-b border-gray-100">
          <button onClick={onDelete} className="text-[12px] text-gray-400 hover:text-black">
            Delete task
          </button>
        </div>
      )}
    </div>
  )
}

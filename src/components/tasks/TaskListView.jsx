import { useEffect, useState } from 'react'
import TaskRow from '../ui/TaskRow'
import DetailPanel from '../ui/DetailPanel'
import { useToast } from '../ui/Toast'

function SectionHeader({ children }) {
  return (
    <div className="px-6 pt-4 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-300 sticky top-0 bg-white z-[1] border-b border-gray-50">
      {children}
    </div>
  )
}

// Generic list + detail-panel split view, shared by any page that renders
// a set of tasks (Canada PR, Todos, and future project/task-type pages).
// `sections` decides grouping/labels; `getExtraSections` and `onDeleteTask`
// let a page plug in type-specific detail-panel content without this
// component or DetailPanel needing to know what that content is.
export default function TaskListView({
  sections,
  getTask,
  onUpdateStatus,
  onUpdateDueDate,
  onDeleteTask,
  getExtraSections,
  getRowBadge,
}) {
  const [selectedId, setSelectedId] = useState(null)
  const [expanded, setExpanded] = useState(new Set())
  const { showError } = useToast()

  const taskCount = sections.reduce((n, s) => n + s.tasks.length, 0)

  useEffect(() => {
    const withChildren = sections.flatMap((s) => s.tasks).filter((t) => t.children && t.children.length > 0)
    if (withChildren.length) {
      setExpanded(new Set(withChildren.map((t) => t.id)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskCount])

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedTask = selectedId ? getTask(selectedId) : null

  const handleUpdateStatus = async (id, status) => {
    try {
      await onUpdateStatus(id, status)
    } catch (e) {
      showError(e.message)
    }
  }

  const handleUpdateDueDate = async (id, dueDate) => {
    try {
      await onUpdateDueDate(id, dueDate)
    } catch (e) {
      showError(e.message)
    }
  }

  const handleDelete = async () => {
    try {
      await onDeleteTask(selectedTask.id)
      setSelectedId(null)
    } catch (e) {
      showError(e.message)
    }
  }

  const renderRow = (t, isChild) => (
    <TaskRow
      key={t.id}
      task={t}
      isChild={isChild}
      isActive={t.id === selectedId}
      isExpanded={expanded.has(t.id)}
      onSelect={setSelectedId}
      onToggleExpand={toggleExpand}
      badge={getRowBadge ? getRowBadge(t) : null}
    />
  )

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto min-w-0">
        {sections.map(
          (section) =>
            section.tasks.length > 0 && (
              <div key={section.label}>
                <SectionHeader>{section.label}</SectionHeader>
                {section.tasks.map((t) => (
                  <div key={t.id}>
                    {renderRow(t, false)}
                    {section.expandable &&
                      t.children?.length > 0 &&
                      expanded.has(t.id) &&
                      t.children.map((childId) => {
                        const child = getTask(childId)
                        return child ? renderRow(child, true) : null
                      })}
                  </div>
                ))}
              </div>
            )
        )}
        {taskCount === 0 && <p className="px-6 pt-4 text-[12px] text-gray-300">Nothing here yet.</p>}
      </div>

      {selectedTask && (
        <DetailPanel
          task={selectedTask}
          getTask={getTask}
          onClose={() => setSelectedId(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateDueDate={handleUpdateDueDate}
          onNavigate={setSelectedId}
          onDelete={onDeleteTask ? handleDelete : undefined}
          extraSections={getExtraSections ? getExtraSections(selectedTask) : []}
        />
      )}
    </div>
  )
}

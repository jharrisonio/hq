import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import TaskRow from '../components/ui/TaskRow'
import DetailPanel from '../components/ui/DetailPanel'

function SectionHeader({ children }) {
  return (
    <div className="px-6 pt-4 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-300 sticky top-0 bg-white z-[1] border-b border-gray-50">
      {children}
    </div>
  )
}

function Countdown({ dueDate }) {
  if (!dueDate) return null
  const deadline = new Date(dueDate + 'T23:59:59')
  const days = Math.ceil((deadline - new Date()) / 86400000)
  const label = deadline.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  return (
    <div className="text-[11px] text-gray-400 tracking-wide">
      <strong className="text-black font-semibold">{days}</strong> days until {label}
    </div>
  )
}

export default function ProjectPage({ slug }) {
  const { user, projects } = useOutletContext()
  const project = projects.find((p) => p.slug === slug)
  const { tasks, loading, getTask, updateStatus, updateDueDate } = useTasks(user?.id, project?.id)

  const [selectedId, setSelectedId] = useState(null)
  const [expanded, setExpanded] = useState(new Set())

  useEffect(() => {
    if (tasks.length) {
      setExpanded(new Set(tasks.filter((t) => t.children.length > 0).map((t) => t.id)))
    }
  }, [tasks.length])

  if (loading || !project) return null

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const questions = tasks.filter((t) => t.type === 'question')
  const topLevelTasks = tasks.filter((t) => t.type === 'task' && !t.parentId && !t.isSubmission)
  const submission = tasks.find((t) => t.isSubmission)
  const selectedTask = selectedId ? getTask(selectedId) : null

  const renderRow = (t, isChild) => (
    <TaskRow
      key={t.id}
      task={t}
      isChild={isChild}
      isActive={t.id === selectedId}
      isExpanded={expanded.has(t.id)}
      onSelect={setSelectedId}
      onToggleExpand={toggleExpand}
    />
  )

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 shrink-0">
        <div className="text-[11px] font-medium uppercase tracking-widest text-black">{project.name}</div>
        {submission && <Countdown dueDate={submission.dueDate} />}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-w-0">
          {questions.length > 0 && (
            <>
              <SectionHeader>Open Questions</SectionHeader>
              {questions.map((t) => renderRow(t, false))}
            </>
          )}

          {topLevelTasks.length > 0 && (
            <>
              <SectionHeader>Tasks</SectionHeader>
              {topLevelTasks.map((t) => (
                <div key={t.id}>
                  {renderRow(t, false)}
                  {t.children.length > 0 &&
                    expanded.has(t.id) &&
                    t.children.map((childId) => {
                      const child = getTask(childId)
                      return child ? renderRow(child, true) : null
                    })}
                </div>
              ))}
            </>
          )}

          {submission && (
            <>
              <SectionHeader>Submission</SectionHeader>
              {renderRow(submission, false)}
            </>
          )}
        </div>

        {selectedTask && (
          <DetailPanel
            task={selectedTask}
            getTask={getTask}
            onClose={() => setSelectedId(null)}
            onUpdateStatus={updateStatus}
            onUpdateDueDate={updateDueDate}
            onNavigate={setSelectedId}
          />
        )}
      </div>
    </div>
  )
}

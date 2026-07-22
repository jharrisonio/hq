import { useOutletContext } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import TaskListView from '../components/tasks/TaskListView'
import PageHeader from '../components/layout/PageHeader'

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

  if (!project) return null

  const questions = tasks.filter((t) => t.type === 'question')
  const topLevelTasks = tasks.filter((t) => t.type === 'task' && !t.parentId && !t.isSubmission)
  const submission = tasks.find((t) => t.isSubmission)

  const sections = [
    { label: 'Open Questions', tasks: questions },
    { label: 'Tasks', tasks: topLevelTasks, expandable: true },
    { label: 'Submission', tasks: submission ? [submission] : [] },
  ]

  return (
    <div className="h-full flex flex-col">
      <PageHeader title={project.name} right={submission && <Countdown dueDate={submission.dueDate} />} />

      {loading ? null : (
        <TaskListView sections={sections} getTask={getTask} onUpdateStatus={updateStatus} onUpdateDueDate={updateDueDate} />
      )}
    </div>
  )
}

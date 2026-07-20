import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import StatusIcon from '../components/ui/StatusIcon'
import Button from '../components/ui/Button'

export default function TodosPage() {
  const { user } = useOutletContext()
  const { tasks, loading, updateStatus, addTask, deleteTask } = useTasks(user?.id, null)
  const [title, setTitle] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await addTask({ title: title.trim() })
    setTitle('')
  }

  const toggleDone = (t) => updateStatus(t.id, t.status === 'done' ? 'todo' : 'done')

  if (loading) return null

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="text-[11px] font-medium uppercase tracking-widest text-black mb-6">Todos</div>

      <form onSubmit={submit} className="flex gap-2 mb-6 max-w-md">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a todo…"
          className="flex-1 text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />
        <Button type="submit" variant="secondary">
          Add
        </Button>
      </form>

      <div className="flex flex-col max-w-md">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-2.5 py-2 border-b border-gray-100 cursor-pointer"
            onClick={() => toggleDone(t)}
          >
            <StatusIcon status={t.status} type={t.type} />
            <span className={`flex-1 text-[13px] ${t.status === 'done' ? 'line-through text-gray-300' : ''}`}>
              {t.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteTask(t.id)
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-black text-[12px]"
            >
              ✕
            </button>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-[12px] text-gray-300">Nothing here yet.</p>}
      </div>
    </div>
  )
}

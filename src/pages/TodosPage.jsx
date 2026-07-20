import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useEmailDrafts } from '../hooks/useEmailDrafts'
import { useTriageRules } from '../hooks/useTriageRules'
import TaskListView from '../components/tasks/TaskListView'
import Button from '../components/ui/Button'

function draftGmailUrl(draft) {
  if (!draft.thread_id) return null
  return `https://mail.google.com/mail/u/0/#all/${draft.thread_id}`
}

function EmailDraftDetail({ draft, onApproveAndSend, onDontFlagAgain }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [ruleAdded, setRuleAdded] = useState(false)
  const editUrl = draftGmailUrl(draft)

  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      await onApproveAndSend(draft.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleDontFlag = async () => {
    await onDontFlagAgain(draft)
    setRuleAdded(true)
  }

  return (
    <div className="flex flex-col gap-2">
      {editUrl && (
        <a
          href={editUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[12.5px] text-black underline underline-offset-2 hover:text-gray-500 self-start"
        >
          Edit draft ↗
        </a>
      )}

      {draft.status === 'sent' ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm self-start">
          Sent
        </span>
      ) : (
        <Button variant="secondary" onClick={handleSend} disabled={sending} className="self-start text-[12px]">
          {sending ? 'Sending…' : draft.status === 'failed' ? 'Retry send' : 'Approve & Send'}
        </Button>
      )}

      {error && <span className="text-[11px] text-black">{error}</span>}
      {!error && draft.status === 'failed' && draft.error && (
        <span className="text-[11px] text-black">{draft.error}</span>
      )}

      {draft.status !== 'sent' &&
        draft.to_email &&
        (ruleAdded ? (
          <span className="text-[11px] text-gray-400">Won’t flag {draft.to_email} again</span>
        ) : (
          <button onClick={handleDontFlag} className="text-[11px] text-gray-400 hover:text-black self-start">
            Don’t flag like this again
          </button>
        ))}
    </div>
  )
}

export default function TodosPage() {
  const { user } = useOutletContext()
  const { tasks, loading, getTask, updateStatus, updateDueDate, addTask, deleteTask } = useTasks(user?.id, null)
  const { draftsByTaskId, loading: draftsLoading, approveAndSend } = useEmailDrafts(user?.id)
  const { addRule } = useTriageRules(user?.id)
  const [title, setTitle] = useState('')

  const dontFlagAgain = (draft) =>
    addRule({
      matchType: 'sender',
      matchValue: draft.to_email,
      action: 'always_archive',
      guidance: draft.subject ? `From a corrected todo: "${draft.subject}"` : 'From a corrected todo',
    })

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await addTask({ title: title.trim() })
    setTitle('')
  }

  const getExtraSections = (task) => {
    const draft = draftsByTaskId[task.id]
    if (!draft) return []
    return [
      {
        label: 'Email Draft',
        content: <EmailDraftDetail draft={draft} onApproveAndSend={approveAndSend} onDontFlagAgain={dontFlagAgain} />,
      },
    ]
  }

  if (loading || draftsLoading) return null

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3.5 border-b border-gray-100 shrink-0">
        <div className="text-[11px] font-medium uppercase tracking-widest text-black mb-3">Todos</div>
        <form onSubmit={submit} className="flex gap-2 max-w-xl">
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
      </div>

      <TaskListView
        sections={[{ label: 'Todos', tasks, expandable: true }]}
        getTask={getTask}
        onUpdateStatus={updateStatus}
        onUpdateDueDate={updateDueDate}
        onDeleteTask={deleteTask}
        getExtraSections={getExtraSections}
      />
    </div>
  )
}

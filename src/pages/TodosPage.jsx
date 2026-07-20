import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useEmailDrafts } from '../hooks/useEmailDrafts'
import { startGmailConnect } from '../lib/gmailAuth'
import StatusIcon from '../components/ui/StatusIcon'
import Button from '../components/ui/Button'

function draftGmailUrl(draft) {
  if (!draft.thread_id) return null
  return `https://mail.google.com/mail/u/0/#all/${draft.thread_id}`
}

function EmailDraftControls({ draft, onApproveAndSend }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const editUrl = draftGmailUrl(draft)

  const handleSend = async (e) => {
    e.stopPropagation()
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

  return (
    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
      {editUrl && (
        <a
          href={editUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-black underline underline-offset-2 hover:text-gray-500"
        >
          Edit draft ↗
        </a>
      )}
      {draft.status === 'sent' ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm">
          Sent
        </span>
      ) : (
        <Button variant="secondary" onClick={handleSend} disabled={sending} className="text-[11px] py-1">
          {sending ? 'Sending…' : draft.status === 'failed' ? 'Retry send' : 'Approve & Send'}
        </Button>
      )}
      {error && <span className="text-[10px] text-black">{error}</span>}
      {!error && draft.status === 'failed' && draft.error && (
        <span className="text-[10px] text-black">{draft.error}</span>
      )}
    </div>
  )
}

export default function TodosPage() {
  const { user } = useOutletContext()
  const { tasks, loading, updateStatus, addTask, deleteTask } = useTasks(user?.id, null)
  const { draftsByTaskId, loading: draftsLoading, approveAndSend } = useEmailDrafts(user?.id)
  const [title, setTitle] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await addTask({ title: title.trim() })
    setTitle('')
  }

  const toggleDone = (t) => updateStatus(t.id, t.status === 'done' ? 'todo' : 'done')

  if (loading || draftsLoading) return null

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="flex items-center justify-between max-w-xl mb-6">
        <div className="text-[11px] font-medium uppercase tracking-widest text-black">Todos</div>
        <Button variant="ghost" onClick={startGmailConnect} className="text-[11px]">
          Connect Gmail for sending
        </Button>
      </div>

      <form onSubmit={submit} className="flex gap-2 mb-6 max-w-xl">
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

      <div className="flex flex-col max-w-xl">
        {tasks.map((t) => {
          const draft = draftsByTaskId[t.id]
          return (
            <div
              key={t.id}
              className="group flex items-center gap-2.5 py-2 border-b border-gray-100 cursor-pointer"
              onClick={() => toggleDone(t)}
            >
              <StatusIcon status={t.status} type={t.type} />
              <span className={`flex-1 text-[13px] ${t.status === 'done' ? 'line-through text-gray-300' : ''}`}>
                {t.title}
              </span>
              {draft && <EmailDraftControls draft={draft} onApproveAndSend={approveAndSend} />}
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
          )
        })}
        {tasks.length === 0 && <p className="text-[12px] text-gray-300">Nothing here yet.</p>}
      </div>
    </div>
  )
}

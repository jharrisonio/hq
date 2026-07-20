import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useEmailDrafts } from '../hooks/useEmailDrafts'
import { useTriageRules } from '../hooks/useTriageRules'
import StatusIcon from '../components/ui/StatusIcon'
import Button from '../components/ui/Button'

function draftGmailUrl(draft) {
  if (!draft.thread_id) return null
  return `https://mail.google.com/mail/u/0/#all/${draft.thread_id}`
}

function EmailDraftControls({ draft, onApproveAndSend, onDontFlagAgain }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [ruleAdded, setRuleAdded] = useState(false)
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

  const handleDontFlag = async (e) => {
    e.stopPropagation()
    await onDontFlagAgain(draft)
    setRuleAdded(true)
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
        <>
          <Button variant="secondary" onClick={handleSend} disabled={sending} className="text-[11px] py-1">
            {sending ? 'Sending…' : draft.status === 'failed' ? 'Retry send' : 'Approve & Send'}
          </Button>
          {draft.to_email &&
            (ruleAdded ? (
              <span className="text-[10px] text-gray-400">Won’t flag {draft.to_email} again</span>
            ) : (
              <button onClick={handleDontFlag} className="text-[11px] text-gray-400 hover:text-black">
                Don’t flag like this again
              </button>
            ))}
        </>
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
  const { addRule } = useTriageRules(user?.id)
  const [title, setTitle] = useState('')

  const dontFlagAgain = (draft) =>
    addRule({
      matchType: 'sender',
      matchValue: draft.to_email,
      action: 'always_archive',
      note: draft.subject ? `From a corrected todo: "${draft.subject}"` : 'From a corrected todo',
    })

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
      <div className="text-[11px] font-medium uppercase tracking-widest text-black mb-6">Todos</div>

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
              {draft && (
                <EmailDraftControls draft={draft} onApproveAndSend={approveAndSend} onDontFlagAgain={dontFlagAgain} />
              )}
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

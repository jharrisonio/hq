import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useEmailDrafts } from '../hooks/useEmailDrafts'
import { useEmailSubscriptions } from '../hooks/useEmailSubscriptions'
import { useEmailArchiveCandidates } from '../hooks/useEmailArchiveCandidates'
import { useTriageRules } from '../hooks/useTriageRules'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'
import { useToast } from '../components/ui/Toast'
import Popover from '../components/ui/Popover'
import Modal from '../components/ui/Modal'
import { PlusIcon, FilterIcon } from '../components/ui/icons'
import TaskListView from '../components/tasks/TaskListView'
import Button from '../components/ui/Button'

function draftGmailUrl(draft) {
  if (!draft.thread_id) return null
  return `https://mail.google.com/mail/u/0/#all/${draft.thread_id}`
}

const COMPLETED_FILTER_KEY = 'hq-todos-completed-filter'
const COMPLETED_FILTER_OPTIONS = [
  { value: 'none', label: 'Hide completed', shortLabel: 'Hide completed' },
  { value: 'day', label: 'Completed: last day', shortLabel: 'Last day' },
  { value: 'week', label: 'Completed: last week', shortLabel: 'Last week' },
  { value: 'all', label: 'Completed: all', shortLabel: 'All' },
]
const COMPLETED_FILTER_WINDOW_MS = { day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000 }

function isTaskVisible(task, completedFilter) {
  if (task.status !== 'done') return true
  if (completedFilter === 'none') return false
  if (completedFilter === 'all') return true
  if (!task.completedAt) return true
  const windowMs = COMPLETED_FILTER_WINDOW_MS[completedFilter]
  return Date.now() - new Date(task.completedAt).getTime() <= windowMs
}

function formatEmailDate(dateHeader) {
  if (!dateHeader) return ''
  const d = new Date(dateHeader)
  return Number.isNaN(d.getTime()) ? dateHeader : d.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
}

function EmailDraftDetail({ draft, onApproveAndSend, onReject, onDontFlagAgain }) {
  const { showSuccess, showError } = useToast()
  const [sending, setSending] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [ruleAdded, setRuleAdded] = useState(false)
  const [liveBody, setLiveBody] = useState(null)
  const [original, setOriginal] = useState(null)
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState(null)
  const editUrl = draftGmailUrl(draft)

  useEffect(() => {
    let cancelled = false
    setLiveBody(null)
    setOriginal(null)
    setLiveLoading(true)
    setLiveError(null)
    supabase.functions
      .invoke('get-gmail-draft', { body: { email_draft_id: draft.id } })
      .then(async ({ data, error: err }) => {
        if (cancelled) return
        if (err || data?.error) setLiveError(data?.error || (await extractFunctionError(err)))
        else {
          setLiveBody(data?.body || '')
          setOriginal(data?.original || null)
        }
      })
      .catch((e) => {
        if (!cancelled) setLiveError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLiveLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [draft.id])

  const displayBody = liveBody !== null ? liveBody : draft.body

  const handleSend = async () => {
    setSending(true)
    try {
      await onApproveAndSend(draft.id)
      showSuccess('Email sent')
    } catch (err) {
      showError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleDontFlag = async () => {
    try {
      await onDontFlagAgain(draft)
      setRuleAdded(true)
      showSuccess(`Won’t flag ${draft.to_email} again`)
    } catch (err) {
      showError(err.message)
    }
  }

  const handleReject = async () => {
    setRejecting(true)
    try {
      await onReject(draft)
      showSuccess('Marked as not needed')
    } catch (err) {
      showError(err.message)
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {original && (
        <div>
          <div className="text-[9px] text-gray-300 font-semibold uppercase tracking-wider mb-1 break-words">
            Original Email{original.from ? ` — ${original.from}` : ''}
          </div>
          {original.date && <div className="text-[11px] text-gray-400 mb-1.5">{formatEmailDate(original.date)}</div>}
          <div className="text-[12.5px] leading-relaxed text-gray-600 whitespace-pre-wrap break-words border-l-2 border-gray-100 pl-3">
            {original.body}
          </div>
        </div>
      )}

      <div>
        <div className="text-[9px] text-gray-300 font-semibold uppercase tracking-wider mb-1">Reply Draft</div>
        {displayBody ? (
          <div>
            <div className="text-[12.5px] leading-relaxed text-gray-600 whitespace-pre-wrap break-words border-l-2 border-gray-100 pl-3">
              {displayBody}
            </div>
            {liveLoading && liveBody === null && (
              <div className="text-[10px] text-gray-300 mt-1">Refreshing from Gmail…</div>
            )}
            {!liveLoading && liveError && liveBody === null && (
              <div className="text-[10px] text-gray-300 mt-1">
                Showing last saved version — couldn’t refresh from Gmail ({liveError}).
              </div>
            )}
          </div>
        ) : liveLoading ? (
          <div className="text-[12px] text-gray-300">Loading draft…</div>
        ) : (
          <div className="text-[12px] text-gray-300">
            {liveError ? `Couldn’t load the draft (${liveError}).` : 'No draft text available.'} Open in Gmail to
            view it.
          </div>
        )}
      </div>

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
      ) : draft.status === 'rejected' ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm self-start">
          Not needed
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSend} disabled={sending || rejecting} className="text-[12px]">
            {sending ? 'Sending…' : draft.status === 'failed' ? 'Retry send' : 'Approve & Send'}
          </Button>
          <button
            onClick={handleReject}
            disabled={sending || rejecting}
            className="text-[11px] text-gray-400 hover:text-black"
          >
            Not needed
          </button>
        </div>
      )}

      {draft.status === 'failed' && draft.error && <span className="text-[11px] text-black">{draft.error}</span>}

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

function UnsubscribeDetail({ subscription, onUnsubscribe, onDismiss }) {
  const { showSuccess, showError } = useToast()
  const [working, setWorking] = useState(false)

  const handleUnsubscribe = async () => {
    setWorking(true)
    try {
      if (subscription.unsubscribe_method !== 'one_click_post' && subscription.unsubscribe_url) {
        window.open(subscription.unsubscribe_url, '_blank', 'noreferrer')
      }
      await onUnsubscribe(subscription.id)
      showSuccess('Unsubscribed')
    } catch (err) {
      showError(err.message)
    } finally {
      setWorking(false)
    }
  }

  const handleDismiss = async () => {
    setWorking(true)
    try {
      await onDismiss(subscription)
      showSuccess('Kept — won’t ask again')
    } catch (err) {
      showError(err.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12.5px] leading-relaxed text-gray-600 break-words">
        {subscription.from_email || subscription.from_domain}
        {subscription.subject ? ` — ${subscription.subject}` : ''}
      </div>

      {subscription.status === 'unsubscribed' ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm self-start">
          Unsubscribed
        </span>
      ) : subscription.status === 'dismissed' ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm self-start">
          Dismissed — kept
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleUnsubscribe} disabled={working} className="text-[12px]">
            {working ? 'Working…' : 'Unsubscribe'}
          </Button>
          <button onClick={handleDismiss} disabled={working} className="text-[11px] text-gray-400 hover:text-black">
            Keep — dismiss
          </button>
        </div>
      )}

      {subscription.status === 'failed' && subscription.error && (
        <span className="text-[11px] text-black">{subscription.error}</span>
      )}
    </div>
  )
}

function ArchiveCandidateDetail({ candidate, onArchive, onIgnore }) {
  const { showSuccess, showError } = useToast()
  const [working, setWorking] = useState(false)

  const handleArchive = async () => {
    setWorking(true)
    try {
      await onArchive(candidate.id)
      showSuccess('Archived')
    } catch (err) {
      showError(err.message)
    } finally {
      setWorking(false)
    }
  }

  const handleIgnore = async () => {
    setWorking(true)
    try {
      await onIgnore(candidate)
      showSuccess('Ignored — kept in inbox')
    } catch (err) {
      showError(err.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12.5px] leading-relaxed text-gray-600 break-words">
        {candidate.from_email}
        {candidate.subject ? ` — ${candidate.subject}` : ''}
      </div>
      {candidate.snippet && (
        <div className="text-[12.5px] leading-relaxed text-gray-600 break-words border-l-2 border-gray-100 pl-3">
          {candidate.snippet}
        </div>
      )}

      {candidate.status === 'archived' ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm self-start">
          Archived
        </span>
      ) : candidate.status === 'ignored' ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-sm self-start">
          Ignored
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleArchive} disabled={working} className="text-[12px]">
            {working ? 'Working…' : 'Archive'}
          </Button>
          <button onClick={handleIgnore} disabled={working} className="text-[11px] text-gray-400 hover:text-black">
            Ignore
          </button>
        </div>
      )}

      {candidate.status === 'failed' && candidate.error && (
        <span className="text-[11px] text-black">{candidate.error}</span>
      )}
    </div>
  )
}

export default function TodosPage() {
  const { user } = useOutletContext()
  const {
    tasks,
    loading,
    getTask,
    updateStatus,
    updateDueDate,
    addTask,
    deleteTask,
    refresh: refreshTasks,
  } = useTasks(user?.id, null)
  const { draftsByTaskId, loading: draftsLoading, approveAndSend, reject } = useEmailDrafts(user?.id)
  const {
    subscriptionsByTaskId,
    loading: subscriptionsLoading,
    unsubscribe,
    dismiss,
  } = useEmailSubscriptions(user?.id)
  const { candidatesByTaskId, loading: candidatesLoading, archive, ignore } = useEmailArchiveCandidates(user?.id)
  const { addRule } = useTriageRules(user?.id)
  const { showError } = useToast()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [completedFilter, setCompletedFilter] = useState(
    () => localStorage.getItem(COMPLETED_FILTER_KEY) || 'none'
  )

  const handleCompletedFilterChange = (value) => {
    setCompletedFilter(value)
    localStorage.setItem(COMPLETED_FILTER_KEY, value)
  }

  // Every action here marks its linked todo done server-side (or in the hook
  // itself for dismiss/ignore) — refresh so the strikethrough shows without
  // requiring a full page reload.
  const handleApproveAndSend = async (id) => {
    await approveAndSend(id)
    refreshTasks()
  }

  const handleReject = async (draft) => {
    await reject(draft)
    refreshTasks()
  }

  const handleUnsubscribe = async (id) => {
    await unsubscribe(id)
    refreshTasks()
  }

  const handleDismiss = async (subscription) => {
    await dismiss(subscription)
    refreshTasks()
  }

  const handleArchive = async (id) => {
    await archive(id)
    refreshTasks()
  }

  const handleIgnore = async (candidate) => {
    await ignore(candidate)
    refreshTasks()
  }

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
    try {
      await addTask({ title: title.trim(), due_date: dueDate || null })
      setTitle('')
      setDueDate('')
      setAddModalOpen(false)
    } catch (err) {
      showError(err.message)
    }
  }

  const getExtraSections = (task) => {
    const draft = draftsByTaskId[task.id]
    if (draft) {
      return [
        {
          label: 'Email',
          content: (
            <EmailDraftDetail
              draft={draft}
              onApproveAndSend={handleApproveAndSend}
              onReject={handleReject}
              onDontFlagAgain={dontFlagAgain}
            />
          ),
        },
      ]
    }
    const subscription = subscriptionsByTaskId[task.id]
    if (subscription) {
      return [
        {
          label: 'Unsubscribe',
          content: (
            <UnsubscribeDetail subscription={subscription} onUnsubscribe={handleUnsubscribe} onDismiss={handleDismiss} />
          ),
        },
      ]
    }
    const candidate = candidatesByTaskId[task.id]
    if (candidate) {
      return [
        {
          label: 'Archive Candidate',
          content: <ArchiveCandidateDetail candidate={candidate} onArchive={handleArchive} onIgnore={handleIgnore} />,
        },
      ]
    }
    return []
  }

  if (loading || draftsLoading || subscriptionsLoading || candidatesLoading) return null

  const visibleTasks = tasks.filter((t) => isTaskVisible(t, completedFilter))

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 shrink-0">
        <div className="text-[11px] font-medium uppercase tracking-widest text-black">Todos</div>
        <div className="flex items-center gap-2">
          <Popover
            trigger={(toggle) => (
              <button
                onClick={toggle}
                className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-black hover:border-gray-400 border border-gray-200 rounded-sm px-2 py-1"
              >
                <FilterIcon />
                {COMPLETED_FILTER_OPTIONS.find((o) => o.value === completedFilter)?.shortLabel}
              </button>
            )}
          >
            {(close) => (
              <div className="flex flex-col">
                {COMPLETED_FILTER_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => {
                      handleCompletedFilterChange(o.value)
                      close()
                    }}
                    className={`text-left text-[12px] px-3 py-1.5 hover:bg-gray-50 ${
                      o.value === completedFilter ? 'text-black font-medium' : 'text-gray-600'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </Popover>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center justify-center w-[26px] h-[26px] border border-gray-200 rounded-sm text-gray-500 hover:text-black hover:border-gray-400"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="text-[13px] font-medium">New Todo</div>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
          />
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 w-[72px] shrink-0">
              Due Date
            </span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-[12px] border border-gray-200 rounded-sm px-2 py-1"
            />
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add
            </Button>
          </div>
        </form>
      </Modal>

      <TaskListView
        sections={[{ label: 'Todos', tasks: visibleTasks, expandable: true }]}
        getTask={getTask}
        onUpdateStatus={updateStatus}
        onUpdateDueDate={updateDueDate}
        onDeleteTask={deleteTask}
        getExtraSections={getExtraSections}
      />
    </div>
  )
}

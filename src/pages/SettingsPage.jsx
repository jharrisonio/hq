import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useGmailConnection } from '../hooks/useGmailConnection'
import { useTriageRules } from '../hooks/useTriageRules'
import { startGmailConnect } from '../lib/gmailAuth'
import Button from '../components/ui/Button'

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
}

const ACTION_LABELS = { always_actionable: 'Always draft a reply', always_archive: 'Always archive' }

function TriageRulesSection({ userId }) {
  const { rules, loading, addRule, deleteRule } = useTriageRules(userId)
  const [matchType, setMatchType] = useState('sender')
  const [matchValue, setMatchValue] = useState('')
  const [action, setAction] = useState('always_archive')
  const [note, setNote] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!matchValue.trim()) return
    await addRule({ matchType, matchValue: matchValue.trim(), action, note: note.trim() })
    setMatchValue('')
    setNote('')
  }

  if (loading) return null

  return (
    <div className="max-w-md border border-gray-100 rounded-sm p-5 flex flex-col gap-4 mt-6">
      <div>
        <div className="text-[13px] font-medium">Email triage rules</div>
        <div className="text-[12px] text-gray-400 mt-0.5">
          Read by the triage automation before classifying each email — corrections here take effect on its next run.
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
            className="text-[12px] border border-gray-200 rounded-sm px-2 py-1.5"
          >
            <option value="sender">Sender email</option>
            <option value="domain">Sender domain</option>
          </select>
          <input
            value={matchValue}
            onChange={(e) => setMatchValue(e.target.value)}
            placeholder={matchType === 'sender' ? 'billing@example.com' : 'example.com'}
            className="flex-1 text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="text-[12px] border border-gray-200 rounded-sm px-2 py-1.5"
        >
          <option value="always_archive">Always archive</option>
          <option value="always_actionable">Always draft a reply</option>
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />
        <Button type="submit" variant="secondary" className="self-start">
          Add rule
        </Button>
      </form>

      <div className="flex flex-col gap-1.5">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 py-1.5 border-t border-gray-100">
            <div className="text-[12px] min-w-0">
              <span className="font-medium">{r.match_value}</span>
              <span className="text-gray-400"> — {ACTION_LABELS[r.action] || r.action}</span>
              {r.note && <span className="text-gray-400"> ({r.note})</span>}
            </div>
            <button
              onClick={() => deleteRule(r.id)}
              className="text-gray-300 hover:text-black text-[12px] shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-[12px] text-gray-300">No rules yet.</p>}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useOutletContext()
  const { connected, updatedAt, loading, refresh } = useGmailConnection(user?.id)

  const handleConnect = () => {
    startGmailConnect()
  }

  if (loading) return null

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="text-[11px] font-medium uppercase tracking-widest text-black mb-6">Settings</div>

      <div className="max-w-md border border-gray-100 rounded-sm p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium">Gmail sending</div>
            <div className="text-[12px] text-gray-400 mt-0.5">
              {connected
                ? `Connected${updatedAt ? ` — last connected ${formatDateTime(updatedAt)}` : ''}`
                : 'Not connected — approve & send won’t work until this is set up'}
            </div>
          </div>
          {connected ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 border border-gray-200 px-2 py-1 rounded-sm shrink-0">
              Connected
            </span>
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 border border-gray-200 px-2 py-1 rounded-sm shrink-0">
              Not connected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant={connected ? 'secondary' : 'primary'} onClick={handleConnect}>
            {connected ? 'Reconnect Gmail' : 'Connect Gmail for sending'}
          </Button>
          {connected && (
            <Button variant="ghost" onClick={refresh}>
              Refresh status
            </Button>
          )}
        </div>
      </div>

      <TriageRulesSection userId={user?.id} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useGmailConnection } from '../hooks/useGmailConnection'
import { useTriageRules } from '../hooks/useTriageRules'
import { useTriageOutcomes } from '../hooks/useTriageOutcomes'
import { useFinanceRecommendationRules } from '../hooks/useFinanceRecommendationRules'
import { useFinanceSettings } from '../hooks/useFinanceSettings'
import { startGmailConnect } from '../lib/gmailAuth'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import PageHeader from '../components/layout/PageHeader'

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
}

const ACTION_LABELS = { always_actionable: 'Always draft a reply', always_archive: 'Always archive' }

const SUGGESTED_ACTION_LABELS = { reply: 'Reply', archive: 'Archive', unsubscribe: 'Unsubscribe' }
const SUGGESTED_ACTION_ORDER = ['reply', 'archive', 'unsubscribe']

function TriageAccuracySection({ userId }) {
  const { rows, loading } = useTriageOutcomes(userId)

  if (loading) return null

  const byAction = {}
  rows.forEach((r) => {
    byAction[r.suggested_action] = byAction[r.suggested_action] || { agreed: 0, disagreed: 0, pending: 0, failed: 0 }
    byAction[r.suggested_action][r.outcome] = (byAction[r.suggested_action][r.outcome] || 0) + 1
  })

  return (
    <div className="max-w-md border border-gray-100 rounded-sm p-5 flex flex-col gap-4 mt-6">
      <div>
        <div className="text-[13px] font-medium">Triage accuracy</div>
        <div className="text-[12px] text-gray-400 mt-0.5">
          How often the suggested action matched what you actually did, per type.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {SUGGESTED_ACTION_ORDER.filter((a) => byAction[a]).map((a) => {
          const stats = byAction[a]
          const judged = stats.agreed + stats.disagreed
          const pct = judged > 0 ? Math.round((stats.agreed / judged) * 100) : null
          return (
            <div key={a} className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-[13px]">{SUGGESTED_ACTION_LABELS[a]}</span>
              <span className="text-[12px] text-gray-400">
                {pct !== null ? `${pct}% agreement` : 'No verdicts yet'}
                {judged > 0 && ` (${stats.agreed}/${judged})`}
                {stats.pending > 0 && ` · ${stats.pending} pending`}
              </span>
            </div>
          )
        })}
        {rows.length === 0 && <p className="text-[12px] text-gray-300">No triaged emails yet.</p>}
      </div>
    </div>
  )
}

function ruleScopeLabel(r) {
  if (!r.match_type) return 'All emails'
  return r.match_type === 'sender' ? r.match_value : `@${r.match_value}`
}

function TriageRulesSection({ userId }) {
  const { rules, loading, addRule, deleteRule } = useTriageRules(userId)
  const { showSuccess, showError } = useToast()
  const [scope, setScope] = useState('general')
  const [matchValue, setMatchValue] = useState('')
  const [action, setAction] = useState('')
  const [guidance, setGuidance] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (scope !== 'general' && !matchValue.trim()) return
    if (!action && !guidance.trim()) return
    try {
      await addRule({
        matchType: scope === 'general' ? null : scope,
        matchValue: scope === 'general' ? null : matchValue.trim(),
        action: action || null,
        guidance: guidance.trim() || null,
      })
      setMatchValue('')
      setAction('')
      setGuidance('')
      showSuccess('Rule added')
    } catch (e) {
      showError(e.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteRule(id)
      showSuccess('Rule removed')
    } catch (e) {
      showError(e.message)
    }
  }

  if (loading) return null

  return (
    <div className="max-w-md border border-gray-100 rounded-sm p-5 flex flex-col gap-4 mt-6">
      <div>
        <div className="text-[13px] font-medium">Email triage rules</div>
        <div className="text-[12px] text-gray-400 mt-0.5">
          Read by the triage automation before classifying each email — corrections here take effect on its next run.
          A rule can be a hard override, free-form guidance it weighs alongside its own judgment, or both.
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="text-[12px] border border-gray-200 rounded-sm px-2 py-1.5"
          >
            <option value="general">All emails</option>
            <option value="sender">Specific sender</option>
            <option value="domain">Specific domain</option>
          </select>
          {scope !== 'general' && (
            <input
              value={matchValue}
              onChange={(e) => setMatchValue(e.target.value)}
              placeholder={scope === 'sender' ? 'billing@example.com' : 'example.com'}
              className="flex-1 text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
            />
          )}
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="text-[12px] border border-gray-200 rounded-sm px-2 py-1.5"
        >
          <option value="">No hard override — just guidance</option>
          <option value="always_archive">Always archive</option>
          <option value="always_actionable">Always draft a reply</option>
        </select>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="e.g. these are usually just FYI, no need to reply unless I'm CC'd directly"
          rows={2}
          className="text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />
        <Button type="submit" variant="secondary" className="self-start">
          Add rule
        </Button>
      </form>

      <div className="flex flex-col gap-1.5">
        {rules.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-2 py-1.5 border-t border-gray-100">
            <div className="text-[12px] min-w-0">
              <span className="font-medium">{ruleScopeLabel(r)}</span>
              {r.action && <span className="text-gray-400"> — {ACTION_LABELS[r.action]}</span>}
              {r.guidance && <div className="text-gray-400 mt-0.5">{r.guidance}</div>}
            </div>
            <button
              onClick={() => handleDelete(r.id)}
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

function financeRuleScopeLabel(r) {
  if (!r.match_type) return 'All recommendations'
  return r.match_value
}

const FINANCE_KIND_OPTIONS = [
  { value: '', label: 'Any kind' },
  { value: 'cancel_subscription', label: 'Cancel subscription' },
  { value: 'switch_provider', label: 'Switch provider' },
  { value: 'spending_habit', label: 'Spending habit' },
]

function FinanceRulesSection({ userId }) {
  const { rules, loading, addRule, deleteRule } = useFinanceRecommendationRules(userId)
  const { showSuccess, showError } = useToast()
  const [scope, setScope] = useState('general')
  const [matchValue, setMatchValue] = useState('')
  const [suppress, setSuppress] = useState(false)
  const [guidance, setGuidance] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (scope !== 'general' && !matchValue.trim()) return
    if (!suppress && !guidance.trim()) return
    try {
      await addRule({
        matchType: scope === 'general' ? null : scope,
        matchValue: scope === 'general' ? null : matchValue.trim(),
        action: suppress ? 'suppress' : null,
        guidance: guidance.trim() || null,
      })
      setMatchValue('')
      setSuppress(false)
      setGuidance('')
      showSuccess('Rule added')
    } catch (e) {
      showError(e.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteRule(id)
      showSuccess('Rule removed')
    } catch (e) {
      showError(e.message)
    }
  }

  if (loading) return null

  return (
    <div className="max-w-md border border-gray-100 rounded-sm p-5 flex flex-col gap-4 mt-6">
      <div>
        <div className="text-[13px] font-medium">Finance recommendation rules</div>
        <div className="text-[12px] text-gray-400 mt-0.5">
          Read by the recommendation automation before suggesting a to-do — dismissing a recommendation with a
          reason adds one of these automatically.
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="text-[12px] border border-gray-200 rounded-sm px-2 py-1.5"
          >
            <option value="general">All recommendations</option>
            <option value="merchant">Specific merchant</option>
            <option value="kind">Specific kind</option>
          </select>
          {scope === 'merchant' && (
            <input
              value={matchValue}
              onChange={(e) => setMatchValue(e.target.value)}
              placeholder="Rogers"
              className="flex-1 text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
            />
          )}
          {scope === 'kind' && (
            <select
              value={matchValue}
              onChange={(e) => setMatchValue(e.target.value)}
              className="flex-1 text-[12px] border border-gray-200 rounded-sm px-2 py-1.5"
            >
              {FINANCE_KIND_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500">
          <input type="checkbox" checked={suppress} onChange={(e) => setSuppress(e.target.checked)} />
          Never suggest this again
        </label>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="e.g. staying with Rogers — already checked competitors, their new plan matched the price"
          rows={2}
          className="text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />
        <Button type="submit" variant="secondary" className="self-start">
          Add rule
        </Button>
      </form>

      <div className="flex flex-col gap-1.5">
        {rules.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-2 py-1.5 border-t border-gray-100">
            <div className="text-[12px] min-w-0">
              <span className="font-medium">{financeRuleScopeLabel(r)}</span>
              {r.action === 'suppress' && <span className="text-gray-400"> — never suggest again</span>}
              {r.guidance && <div className="text-gray-400 mt-0.5">{r.guidance}</div>}
            </div>
            <button
              onClick={() => handleDelete(r.id)}
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

function FinanceThresholdSection({ userId }) {
  const { outlierThreshold, loading, updateOutlierThreshold } = useFinanceSettings(userId)
  const { showSuccess, showError } = useToast()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading) setValue(String(outlierThreshold))
  }, [loading, outlierThreshold])

  const submit = async (e) => {
    e.preventDefault()
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    setSaving(true)
    try {
      await updateOutlierThreshold(parsed)
      showSuccess('Saved')
    } catch (e) {
      showError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="max-w-md border border-gray-100 rounded-sm p-5 flex flex-col gap-4 mt-6">
      <div>
        <div className="text-[13px] font-medium">Spend outlier threshold</div>
        <div className="text-[12px] text-gray-400 mt-0.5">
          Transactions above this are treated as one-off purchases (a holiday, a big buy) rather than routine daily
          spend, and excluded from the "excl. outliers" line on the Finance dashboard's spend trend chart.
        </div>
      </div>

      <form onSubmit={submit} className="flex items-center gap-2">
        <span className="text-[13px] text-gray-400">$</span>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-[100px] text-[13px] border border-gray-200 rounded-sm px-3 py-1.5"
        />
        <Button type="submit" variant="secondary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useOutletContext()
  const { connected, updatedAt, loading, refresh } = useGmailConnection(user?.id)

  const handleConnect = () => {
    startGmailConnect()
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Settings" />

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {loading ? null : (
          <>
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

            <TriageAccuracySection userId={user?.id} />
            <TriageRulesSection userId={user?.id} />
            <FinanceRulesSection userId={user?.id} />
            <FinanceThresholdSection userId={user?.id} />
          </>
        )}
      </div>
    </div>
  )
}

import { useOutletContext } from 'react-router-dom'
import { useGmailConnection } from '../hooks/useGmailConnection'
import { startGmailConnect } from '../lib/gmailAuth'
import Button from '../components/ui/Button'

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
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
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'
import { useToast } from '../components/ui/Toast'

export default function GmailCallback() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [status, setStatus] = useState('Connecting Gmail…')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')

    if (errorParam) {
      showError(`Google denied the request: ${errorParam}`)
      navigate('/settings')
      return
    }
    if (!code) {
      showError('Missing authorization code.')
      navigate('/settings')
      return
    }

    supabase.functions
      .invoke('exchange-google-code', { body: { code } })
      .then(async ({ data, error }) => {
        if (error || data?.error) {
          showError(`Failed to connect Gmail: ${data?.error || (await extractFunctionError(error))}`)
        } else {
          showSuccess('Gmail connected')
        }
        navigate('/settings')
      })
      .catch((e) => {
        showError(`Failed to connect Gmail: ${e.message}`)
        navigate('/settings')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-[13px] text-gray-500">{status}</p>
    </div>
  )
}

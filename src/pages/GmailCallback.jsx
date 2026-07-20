import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function GmailCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Connecting Gmail…')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')

    if (errorParam) {
      setStatus(`Google denied the request: ${errorParam}`)
      return
    }
    if (!code) {
      setStatus('Missing authorization code.')
      return
    }

    supabase.functions
      .invoke('exchange-google-code', { body: { code } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setStatus(`Failed to connect: ${error?.message || data?.error}`)
          return
        }
        setStatus('Gmail connected — redirecting…')
        setTimeout(() => navigate('/todos'), 1200)
      })
      .catch((e) => setStatus(`Failed to connect: ${e.message}`))
  }, [navigate])

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-[13px] text-gray-500">{status}</p>
    </div>
  )
}

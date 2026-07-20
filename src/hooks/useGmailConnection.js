import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'
import { useToast } from '../components/ui/Toast'

export function useGmailConnection(userId) {
  const [connected, setConnected] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('gmail-connection-status')
      if (error) throw new Error(data?.error || (await extractFunctionError(error)))
      setConnected(Boolean(data?.connected))
      setUpdatedAt(data?.updatedAt ?? null)
    } catch (e) {
      showError(e.message)
    } finally {
      loadedOnce.current = true
      setLoading(false)
    }
  }, [userId, showError])

  useEffect(() => {
    load()
  }, [load])

  return { connected, updatedAt, loading, refresh: load }
}

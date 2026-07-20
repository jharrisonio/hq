import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'

export function useGmailConnection(userId) {
  const [connected, setConnected] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase.functions.invoke('gmail-connection-status')
    if (error) throw new Error(data?.error || (await extractFunctionError(error)))
    setConnected(Boolean(data?.connected))
    setUpdatedAt(data?.updatedAt ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return { connected, updatedAt, loading, refresh: load }
}

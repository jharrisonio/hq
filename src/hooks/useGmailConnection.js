import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useGmailConnection(userId) {
  const [connected, setConnected] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase.functions.invoke('gmail-connection-status')
    if (error) throw error
    setConnected(Boolean(data?.connected))
    setUpdatedAt(data?.updatedAt ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return { connected, updatedAt, loading, refresh: load }
}

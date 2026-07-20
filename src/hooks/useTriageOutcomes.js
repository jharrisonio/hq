import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

export function useTriageOutcomes(userId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('email_triage_outcomes')
        .select('suggested_action, outcome')
        .eq('user_id', userId)
      if (error) throw error
      setRows(data)
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

  return { rows, loading, refresh: load }
}

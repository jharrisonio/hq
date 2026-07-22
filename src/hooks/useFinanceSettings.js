import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { DEFAULT_OUTLIER_THRESHOLD } from '../lib/spendTrend'

// Get-or-create the single settings row for this user, same pattern as
// useFinancialAccounts.
export function useFinanceSettings(userId) {
  const [outlierThreshold, setOutlierThreshold] = useState(DEFAULT_OUTLIER_THRESHOLD)
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase.from('finance_settings').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error

      if (!data) {
        const { data: created, error: insertError } = await supabase
          .from('finance_settings')
          .insert({ user_id: userId, outlier_threshold: DEFAULT_OUTLIER_THRESHOLD })
          .select()
          .single()
        if (insertError) throw insertError
        setOutlierThreshold(Number(created.outlier_threshold))
      } else {
        setOutlierThreshold(Number(data.outlier_threshold))
      }
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

  const updateOutlierThreshold = async (value) => {
    const { error } = await supabase
      .from('finance_settings')
      .update({ outlier_threshold: value })
      .eq('user_id', userId)
    if (error) throw error
    setOutlierThreshold(value)
  }

  return { outlierThreshold, loading, updateOutlierThreshold }
}

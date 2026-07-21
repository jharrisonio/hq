import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

export function useFinanceRecommendationRules(userId) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('finance_recommendation_rules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setRules(data)
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

  const addRule = async ({ matchType, matchValue, action, guidance }) => {
    const { error } = await supabase.from('finance_recommendation_rules').insert({
      user_id: userId,
      match_type: matchType || null,
      match_value: matchValue || null,
      action: action || null,
      guidance: guidance || null,
    })
    if (error) throw error
    await load()
  }

  const deleteRule = async (id) => {
    const { error } = await supabase.from('finance_recommendation_rules').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { rules, loading, addRule, deleteRule, refresh: load }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

export function useFinanceRecommendations(userId) {
  const [recommendationsByTaskId, setRecommendationsByTaskId] = useState({})
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase.from('finance_recommendations').select('*').eq('user_id', userId)
      if (error) throw error
      const map = {}
      data.forEach((r) => {
        if (r.task_id) map[r.task_id] = r
      })
      setRecommendationsByTaskId(map)
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

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`finance-recommendations-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'finance_recommendations', filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  // Dismissing with a reason writes it back both onto the recommendation
  // (so the panel can show it after the fact) and into
  // finance_recommendation_rules (so future Cowork runs stop re-suggesting
  // it) — same "don't flag like this again" idea as email triage.
  const dismiss = async (recommendation, reason) => {
    const { error } = await supabase
      .from('finance_recommendations')
      .update({ status: 'dismissed', dismissal_reason: reason || null })
      .eq('id', recommendation.id)
    if (error) throw error

    if (recommendation.task_id) {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', recommendation.task_id)
      if (taskError) throw taskError
    }

    if (reason) {
      const { error: ruleError } = await supabase.from('finance_recommendation_rules').insert({
        user_id: userId,
        match_type: recommendation.related_merchant ? 'merchant' : 'kind',
        match_value: recommendation.related_merchant || recommendation.kind,
        action: 'suppress',
        guidance: reason,
      })
      if (ruleError) throw ruleError
    }

    await load()
  }

  return { recommendationsByTaskId, loading, dismiss, refresh: load }
}

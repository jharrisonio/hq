import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'
import { useToast } from '../components/ui/Toast'

export function useEmailSubscriptions(userId) {
  const [subscriptionsByTaskId, setSubscriptionsByTaskId] = useState({})
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase.from('email_subscriptions').select('*').eq('user_id', userId)
      if (error) throw error
      const map = {}
      data.forEach((s) => {
        if (s.task_id) map[s.task_id] = s
      })
      setSubscriptionsByTaskId(map)
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

  const unsubscribe = async (emailSubscriptionId) => {
    const { data, error } = await supabase.functions.invoke('unsubscribe-email', {
      body: { email_subscription_id: emailSubscriptionId },
    })
    if (error) throw new Error(data?.error || (await extractFunctionError(error)))
    if (data?.error) throw new Error(data.error)
    await load()
  }

  const dismiss = async (subscription) => {
    const { error } = await supabase
      .from('email_subscriptions')
      .update({ status: 'dismissed' })
      .eq('id', subscription.id)
    if (error) throw error
    if (subscription.task_id) {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', subscription.task_id)
      if (taskError) throw taskError
    }
    await load()
  }

  return { subscriptionsByTaskId, loading, unsubscribe, dismiss, refresh: load }
}

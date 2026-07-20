import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'

export function useEmailSubscriptions(userId) {
  const [subscriptionsByTaskId, setSubscriptionsByTaskId] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase.from('email_subscriptions').select('*').eq('user_id', userId)
    if (error) throw error
    const map = {}
    data.forEach((s) => {
      if (s.task_id) map[s.task_id] = s
    })
    setSubscriptionsByTaskId(map)
    setLoading(false)
  }, [userId])

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

  const dismiss = async (emailSubscriptionId) => {
    const { error } = await supabase
      .from('email_subscriptions')
      .update({ status: 'dismissed' })
      .eq('id', emailSubscriptionId)
    if (error) throw error
    await load()
  }

  return { subscriptionsByTaskId, loading, unsubscribe, dismiss, refresh: load }
}

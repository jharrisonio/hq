import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTriageRules(userId) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('email_triage_rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    setRules(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const addRule = async ({ matchType, matchValue, action, note }) => {
    const { error } = await supabase.from('email_triage_rules').insert({
      user_id: userId,
      match_type: matchType,
      match_value: matchValue,
      action,
      note: note || null,
    })
    if (error) throw error
    await load()
  }

  const deleteRule = async (id) => {
    const { error } = await supabase.from('email_triage_rules').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { rules, loading, addRule, deleteRule, refresh: load }
}

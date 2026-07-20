import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useEmailDrafts(userId) {
  const [draftsByTaskId, setDraftsByTaskId] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase.from('email_drafts').select('*').eq('user_id', userId)
    if (error) throw error
    const map = {}
    data.forEach((d) => {
      if (d.task_id) map[d.task_id] = d
    })
    setDraftsByTaskId(map)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const approveAndSend = async (emailDraftId) => {
    const { data, error } = await supabase.functions.invoke('send-gmail-draft', {
      body: { email_draft_id: emailDraftId },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    await load()
  }

  return { draftsByTaskId, loading, approveAndSend, refresh: load }
}

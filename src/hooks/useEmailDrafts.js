import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'
import { useToast } from '../components/ui/Toast'

export function useEmailDrafts(userId) {
  const [draftsByTaskId, setDraftsByTaskId] = useState({})
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase.from('email_drafts').select('*').eq('user_id', userId)
      if (error) throw error
      const map = {}
      data.forEach((d) => {
        if (d.task_id) map[d.task_id] = d
      })
      setDraftsByTaskId(map)
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

  const approveAndSend = async (emailDraftId) => {
    const { data, error } = await supabase.functions.invoke('send-gmail-draft', {
      body: { email_draft_id: emailDraftId },
    })
    if (error) throw new Error(data?.error || (await extractFunctionError(error)))
    if (data?.error) throw new Error(data.error)
    await load()
  }

  return { draftsByTaskId, loading, approveAndSend, refresh: load }
}

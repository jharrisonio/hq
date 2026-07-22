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

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`email-drafts-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_drafts', filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  const approveAndSend = async (emailDraftId) => {
    const { data, error } = await supabase.functions.invoke('send-gmail-draft', {
      body: { email_draft_id: emailDraftId },
    })
    if (error) throw new Error(data?.error || (await extractFunctionError(error)))
    if (data?.error) throw new Error(data.error)
    await load()
  }

  // Explicit disagreement signal — this email didn't need a reply, distinct
  // from just leaving the draft pending forever. Feeds triage accuracy
  // tracking the same way dismiss/ignore do for subscriptions/archive
  // candidates.
  const reject = async (draft) => {
    const { error } = await supabase.from('email_drafts').update({ status: 'rejected' }).eq('id', draft.id)
    if (error) throw error
    if (draft.task_id) {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', draft.task_id)
      if (taskError) throw taskError
    }
    await load()
  }

  // Lets the user override the suggested "reply" action when they'd rather
  // just archive the email — same Gmail action and task-done bookkeeping as
  // an archive candidate, just reusing this table's row instead.
  const archiveInstead = async (emailDraftId) => {
    const { data, error } = await supabase.functions.invoke('archive-email', {
      body: { email_draft_id: emailDraftId },
    })
    if (error) throw new Error(data?.error || (await extractFunctionError(error)))
    if (data?.error) throw new Error(data.error)
    await load()
  }

  return { draftsByTaskId, loading, approveAndSend, reject, archiveInstead, refresh: load }
}

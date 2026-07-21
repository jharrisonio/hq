import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'
import { useToast } from '../components/ui/Toast'

export function useEmailArchiveCandidates(userId) {
  const [candidatesByTaskId, setCandidatesByTaskId] = useState({})
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase.from('email_archive_candidates').select('*').eq('user_id', userId)
      if (error) throw error
      const map = {}
      data.forEach((c) => {
        if (c.task_id) map[c.task_id] = c
      })
      setCandidatesByTaskId(map)
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
      .channel(`email-archive-candidates-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_archive_candidates', filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  const archive = async (emailArchiveCandidateId) => {
    const { data, error } = await supabase.functions.invoke('archive-email', {
      body: { email_archive_candidate_id: emailArchiveCandidateId },
    })
    if (error) throw new Error(data?.error || (await extractFunctionError(error)))
    if (data?.error) throw new Error(data.error)
    await load()
  }

  const ignore = async (candidate) => {
    const { error } = await supabase
      .from('email_archive_candidates')
      .update({ status: 'ignored' })
      .eq('id', candidate.id)
    if (error) throw error
    if (candidate.task_id) {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', candidate.task_id)
      if (taskError) throw taskError
    }
    await load()
  }

  return { candidatesByTaskId, loading, archive, ignore, refresh: load }
}

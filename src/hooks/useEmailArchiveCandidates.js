import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { extractFunctionError } from '../lib/functionsError'

export function useEmailArchiveCandidates(userId) {
  const [candidatesByTaskId, setCandidatesByTaskId] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase.from('email_archive_candidates').select('*').eq('user_id', userId)
    if (error) throw error
    const map = {}
    data.forEach((c) => {
      if (c.task_id) map[c.task_id] = c
    })
    setCandidatesByTaskId(map)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const archive = async (emailArchiveCandidateId) => {
    const { data, error } = await supabase.functions.invoke('archive-email', {
      body: { email_archive_candidate_id: emailArchiveCandidateId },
    })
    if (error) throw new Error(data?.error || (await extractFunctionError(error)))
    if (data?.error) throw new Error(data.error)
    await load()
  }

  const ignore = async (emailArchiveCandidateId) => {
    const { error } = await supabase
      .from('email_archive_candidates')
      .update({ status: 'ignored' })
      .eq('id', emailArchiveCandidateId)
    if (error) throw error
    await load()
  }

  return { candidatesByTaskId, loading, archive, ignore, refresh: load }
}

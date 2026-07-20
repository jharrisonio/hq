import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_PROJECTS = [
  { name: 'Canada PR', slug: 'canada-pr', icon: '🍁', color: '#000000', position: 0 },
  { name: 'Apartment', slug: 'apartment', icon: '🏠', color: '#888888', position: 1 },
]

export function useProjects(userId) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    let { data: rows, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (error) throw error

    if (rows.length === 0) {
      const { data: created, error: createError } = await supabase
        .from('projects')
        .insert(DEFAULT_PROJECTS.map((p) => ({ ...p, user_id: userId })))
        .select('*')
      if (createError) throw createError
      rows = created
    }

    setProjects(rows)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return { projects, loading, refresh: load }
}

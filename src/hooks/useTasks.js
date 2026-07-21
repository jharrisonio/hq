import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

function assembleTask(row, allRows, linkRows, relRows) {
  const links = linkRows
    .filter((l) => l.task_id === row.id && l.category === 'link')
    .map((l) => ({ label: l.label, url: l.url }))

  const driveLinks = {}
  linkRows
    .filter((l) => l.task_id === row.id && l.category === 'drive')
    .forEach((l) => {
      driveLinks[l.person] = { label: l.label, url: l.url }
    })

  const blockedBy = relRows
    .filter((r) => r.task_id === row.id && r.type === 'blocked_by')
    .map((r) => r.related_task_id)

  const blocks = relRows
    .filter((r) => r.task_id === row.id && r.type === 'blocks')
    .map((r) => r.related_task_id)

  const children = allRows.filter((r) => r.parent_id === row.id).map((r) => r.id)

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    status: row.status,
    completedAt: row.completed_at,
    assignee: row.assignee,
    dueDate: row.due_date,
    description: row.description,
    deloitteNote: row.deloitte_note,
    note: row.note,
    isSubmission: row.is_submission,
    parentId: row.parent_id,
    children,
    links,
    driveLinks,
    blockedBy,
    blocks,
  }
}

// projectId: pass a project id to scope tasks to that project, or null for
// unscoped personal todos (project_id IS NULL).
export function useTasks(userId, projectId) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)

    try {
      let query = supabase.from('tasks').select('*').eq('user_id', userId)
      query = projectId ? query.eq('project_id', projectId) : query.is('project_id', null)
      const { data: rows, error } = await query.order('position', { ascending: true })
      if (error) throw error

      const ids = rows.map((r) => r.id)
      const [{ data: linkRows, error: linkError }, { data: relRows, error: relError }] = ids.length
        ? await Promise.all([
            supabase.from('task_links').select('*').in('task_id', ids),
            supabase.from('task_relationships').select('*').in('task_id', ids),
          ])
        : [{ data: [] }, { data: [] }]
      if (linkError) throw linkError
      if (relError) throw relError

      setTasks(rows.map((r) => assembleTask(r, rows, linkRows, relRows)))
    } catch (e) {
      showError(e.message)
    } finally {
      loadedOnce.current = true
      setLoading(false)
    }
  }, [userId, projectId, showError])

  useEffect(() => {
    load()
  }, [load])

  const getTask = (id) => tasks.find((t) => t.id === id)

  const updateStatus = async (id, status) => {
    const completedAt = status === 'done' ? new Date().toISOString() : null
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status, completedAt } : t)))
    const { error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  const updateDueDate = async (id, dueDate) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate } : t)))
    const { error } = await supabase
      .from('tasks')
      .update({ due_date: dueDate || null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  const addTask = async (fields) => {
    const { error } = await supabase.from('tasks').insert({
      user_id: userId,
      project_id: projectId || null,
      type: 'task',
      status: 'todo',
      ...fields,
    })
    if (error) throw error
    await load()
  }

  const deleteTask = async (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  }

  return { tasks, loading, getTask, updateStatus, updateDueDate, addTask, deleteTask, refresh: load }
}

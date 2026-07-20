import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

export function useContacts(userId) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })
      if (error) throw error
      setContacts(data)
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

  const addContact = async (fields) => {
    const { error } = await supabase.from('contacts').insert({ ...fields, user_id: userId })
    if (error) throw error
    await load()
  }

  const updateContact = async (id, fields) => {
    const { error } = await supabase.from('contacts').update(fields).eq('id', id)
    if (error) throw error
    await load()
  }

  const deleteContact = async (id) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { contacts, loading, refresh: load, addContact, updateContact, deleteContact }
}

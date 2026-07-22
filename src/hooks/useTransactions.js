import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

const PAGE_SIZE = 1000

export function useTransactions(userId) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      // Supabase/PostgREST caps a single select at 1000 rows — page through
      // until a page comes back short, so the count keeps growing correctly
      // past that as more statements get imported.
      let all = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('txn_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + PAGE_SIZE - 1)
        if (error) throw error
        all = all.concat(data)
        if (data.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }
      setTransactions(all)
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

  // Realtime — the Cowork categorization pass updates rows in the
  // background and the list should reflect that without a manual refresh.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  // Rows that collide with the (account_id, txn_date, description, amount)
  // unique index are silently skipped rather than overwritten, so
  // re-uploading an overlapping "last 30 days" export never touches rows
  // that have already been categorized.
  const importTransactions = async (accountId, parsedRows) => {
    if (parsedRows.length === 0) return { inserted: 0 }
    const payload = parsedRows.map((r) => ({
      account_id: accountId,
      user_id: userId,
      txn_date: r.txn_date,
      description: r.description,
      amount: r.amount,
      raw_row: r.raw_row,
    }))
    const { data, error } = await supabase
      .from('transactions')
      .upsert(payload, { onConflict: 'account_id,txn_date,description,amount', ignoreDuplicates: true })
      .select()
    if (error) throw error
    await load()
    return { inserted: data.length, skipped: parsedRows.length - data.length }
  }

  const updateTransaction = async (id, fields) => {
    const { error } = await supabase.from('transactions').update(fields).eq('id', id)
    if (error) throw error
    await load()
  }

  const bulkUpdateCategory = async (ids, category) => {
    if (ids.length === 0) return
    const { error } = await supabase
      .from('transactions')
      .update({ category, status: 'categorized' })
      .in('id', ids)
    if (error) throw error
    await load()
  }

  return { transactions, loading, importTransactions, updateTransaction, bulkUpdateCategory, refresh: load }
}

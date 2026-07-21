import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

// For now there's just one account: the CIBC credit card. Get-or-create it
// so the Finance page has somewhere to attach imported transactions without
// asking the user to set anything up first.
export function useFinancialAccounts(userId) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)
  const { showError } = useToast()

  const load = useCallback(async () => {
    if (!userId) return
    if (!loadedOnce.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error

      if (data.length === 0) {
        const { data: created, error: insertError } = await supabase
          .from('financial_accounts')
          .insert({ user_id: userId, name: 'CIBC Credit Card', institution: 'cibc', account_type: 'credit_card' })
          .select()
          .single()
        if (insertError) throw insertError
        setAccounts([created])
      } else {
        setAccounts(data)
      }
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

  return { accounts, loading, refresh: load }
}

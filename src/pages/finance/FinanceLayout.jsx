import { Outlet, useOutletContext } from 'react-router-dom'
import { useFinancialAccounts } from '../../hooks/useFinancialAccounts'
import { useTransactions } from '../../hooks/useTransactions'
import { useFinanceSettings } from '../../hooks/useFinanceSettings'

// Fetches everything the Dashboard/Transactions tabs share exactly once, so
// switching between them doesn't unmount the data layer and refetch from
// scratch (which was causing a loading-flash on every tab switch).
export default function FinanceLayout() {
  const { user } = useOutletContext()
  const { accounts, loading: accountsLoading } = useFinancialAccounts(user?.id)
  const {
    transactions,
    loading: transactionsLoading,
    importTransactions,
    updateTransaction,
    bulkUpdateCategory,
  } = useTransactions(user?.id)
  const { outlierThreshold, loading: settingsLoading } = useFinanceSettings(user?.id)

  if (accountsLoading || transactionsLoading || settingsLoading) return null

  return (
    <Outlet
      context={{
        account: accounts[0],
        transactions,
        importTransactions,
        updateTransaction,
        bulkUpdateCategory,
        outlierThreshold,
      }}
    />
  )
}

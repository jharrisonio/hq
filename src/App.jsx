import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'
import TodosPage from './pages/TodosPage'
import ApartmentPage from './pages/ApartmentPage'
import CRMPage from './pages/crm/CRMPage'
import ContactDetail from './pages/crm/ContactDetail'
import FinancePage from './pages/FinancePage'
import GmailCallback from './pages/GmailCallback'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <Route path="*" element={<Auth />} />
        ) : (
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pr" element={<ProjectPage slug="canada-pr" />} />
            <Route path="/todos" element={<TodosPage />} />
            <Route path="/apartment" element={<ApartmentPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/crm/:contactId" element={<ContactDetail />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/auth/gmail-callback" element={<GmailCallback />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  )
}

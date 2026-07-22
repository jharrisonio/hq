import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileTabBar from './MobileTabBar'
import { useAuth } from '../../hooks/useAuth'
import { useProjects } from '../../hooks/useProjects'

export default function AppShell() {
  const { user, signOut } = useAuth()
  const { projects, loading, refresh } = useProjects(user?.id)

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden text-[13px] text-black">
      <Sidebar projects={projects} user={user} onSignOut={signOut} />
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden order-1 md:order-2">
        {loading ? null : <Outlet context={{ user, projects, refreshProjects: refresh }} />}
      </div>
      <MobileTabBar className="md:hidden order-2 shrink-0" />
    </div>
  )
}

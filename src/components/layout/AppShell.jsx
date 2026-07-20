import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useProjects } from '../../hooks/useProjects'

export default function AppShell() {
  const { user, signOut } = useAuth()
  const { projects, loading, refresh } = useProjects(user?.id)

  return (
    <div className="flex h-screen w-screen overflow-hidden text-[13px] text-black">
      <Sidebar projects={projects} user={user} onSignOut={signOut} />
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {loading ? null : <Outlet context={{ user, projects, refreshProjects: refresh }} />}
      </div>
    </div>
  )
}

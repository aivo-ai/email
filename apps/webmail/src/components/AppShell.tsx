import { Outlet } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ComposeDrawer from './ComposeDrawer'
import NotificationToasts from './NotificationToasts'

export default function AppShell() {
  const { state } = useApp()

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex">
      {/* Sidebar */}
      <div
        className={`
          ${state.sidebarOpen ? 'w-64' : 'w-16'} 
          transition-all duration-300 ease-in-out
          bg-white border-r border-gray-200 flex-shrink-0
        `}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <TopBar />

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Compose drawer */}
      {state.composeDrawerOpen && <ComposeDrawer />}

      {/* Notification toasts */}
      <NotificationToasts />
    </div>
  )
}

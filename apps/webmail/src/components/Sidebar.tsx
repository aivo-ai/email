import { NavLink } from 'react-router-dom'
import { 
  Inbox, 
  Search, 
  Edit3, 
  Calendar, 
  Users, 
  MessageCircle, 
  Settings,
  Mail,
  Menu,
  Star,
  Send,
  Archive,
  Trash2,
  Tag
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'

const navigation = [
  { name: 'Inbox', href: '/app/inbox', icon: Inbox, count: 12 },
  { name: 'Starred', href: '/app/starred', icon: Star, count: 3 },
  { name: 'Sent', href: '/app/sent', icon: Send },
  { name: 'Archive', href: '/app/archive', icon: Archive },
  { name: 'Trash', href: '/app/trash', icon: Trash2 },
]

const apps = [
  { name: 'Search', href: '/app/search', icon: Search },
  { name: 'Compose', href: '/app/compose', icon: Edit3 },
  { name: 'Calendar', href: '/app/calendar', icon: Calendar },
  { name: 'Contacts', href: '/app/contacts', icon: Users },
  { name: 'Chat', href: '/app/chat', icon: MessageCircle },
]

const labels = [
  { name: 'Work', color: 'bg-blue-500' },
  { name: 'Personal', color: 'bg-green-500' },
  { name: 'Important', color: 'bg-red-500' },
  { name: 'Travel', color: 'bg-purple-500' },
]

export default function Sidebar() {
  const { state, toggleSidebar, toggleComposeDrawer } = useApp()
  const { state: authState } = useAuth()

  const handleComposeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleComposeDrawer()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Mail className="h-6 w-6 text-blue-600" />
          {state.sidebarOpen && (
            <span className="text-lg font-semibold text-gray-900">Mail</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label={state.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Compose button */}
      <div className="p-4">
        <button
          onClick={handleComposeClick}
          className={`
            w-full flex items-center justify-center space-x-2 
            bg-blue-600 hover:bg-blue-700 text-white 
            rounded-lg py-3 px-4 transition-colors
            ${!state.sidebarOpen ? 'px-2' : ''}
          `}
        >
          <Edit3 className="h-5 w-5" />
          {state.sidebarOpen && <span className="font-medium">Compose</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2">
        {/* Main navigation */}
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => `
                group flex items-center px-2 py-2 text-sm font-medium rounded-md
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`
                ${state.sidebarOpen ? 'mr-3' : 'mx-auto'} 
                h-5 w-5 flex-shrink-0
              `} />
              {state.sidebarOpen && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {item.count && (
                    <span className="bg-gray-100 text-gray-600 ml-3 inline-block py-0.5 px-2 text-xs rounded-full">
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Apps section */}
        {state.sidebarOpen && (
          <div className="mt-8">
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Apps
            </h3>
            <div className="mt-2 space-y-1">
              {apps.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => `
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Labels section */}
        {state.sidebarOpen && (
          <div className="mt-8">
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Labels
            </h3>
            <div className="mt-2 space-y-1">
              {labels.map((label) => (
                <a
                  key={label.name}
                  href="#"
                  className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <Tag className="mr-3 h-4 w-4 flex-shrink-0" />
                  <div className={`w-3 h-3 rounded-full mr-2 ${label.color}`} />
                  <span>{label.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {authState.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          {state.sidebarOpen && (
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {authState.user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {authState.user?.email || 'user@example.com'}
              </p>
            </div>
          )}
          {state.sidebarOpen && (
            <NavLink
              to="/app/settings"
              className="ml-3 flex-shrink-0 p-1 rounded hover:bg-gray-100"
            >
              <Settings className="h-4 w-4 text-gray-400" />
            </NavLink>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { 
  Search, 
  Menu, 
  Bell, 
  HelpCircle, 
  Grid3X3, 
  User,
  Settings,
  LogOut,
  Sun,
  Moon
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'

export default function TopBar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showAppsMenu, setShowAppsMenu] = useState(false)
  const { 
    state, 
    toggleSidebar, 
    setSearchQuery, 
    toggleDarkMode 
  } = useApp()
  const { state: authState, logout } = useAuth()

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleLogout = () => {
    logout()
    setShowProfileMenu(false)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Menu toggle (only show when sidebar is collapsed) */}
          {!state.sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded hover:bg-gray-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5 text-gray-500" />
            </button>
          )}

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search mail"
              className="block w-96 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={state.searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          {/* Help */}
          <button className="p-2 rounded hover:bg-gray-100 transition-colors">
            <HelpCircle className="h-5 w-5 text-gray-500" />
          </button>

          {/* Notifications */}
          <button className="p-2 rounded hover:bg-gray-100 transition-colors relative">
            <Bell className="h-5 w-5 text-gray-500" />
            {state.notifications.length > 0 && (
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
            )}
          </button>

          {/* Apps menu */}
          <div className="relative">
            <button
              onClick={() => setShowAppsMenu(!showAppsMenu)}
              className="p-2 rounded hover:bg-gray-100 transition-colors"
            >
              <Grid3X3 className="h-5 w-5 text-gray-500" />
            </button>

            {showAppsMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                    Ceerion Apps
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-4">
                    <a href="#" className="flex flex-col items-center p-2 rounded hover:bg-gray-50">
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mb-1">
                        <span className="text-white text-xs font-medium">M</span>
                      </div>
                      <span className="text-xs text-gray-700">Mail</span>
                    </a>
                    <a href="#" className="flex flex-col items-center p-2 rounded hover:bg-gray-50">
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center mb-1">
                        <span className="text-white text-xs font-medium">C</span>
                      </div>
                      <span className="text-xs text-gray-700">Calendar</span>
                    </a>
                    <a href="#" className="flex flex-col items-center p-2 rounded hover:bg-gray-50">
                      <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center mb-1">
                        <span className="text-white text-xs font-medium">K</span>
                      </div>
                      <span className="text-xs text-gray-700">Contacts</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {authState.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {authState.user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {authState.user?.email || 'user@example.com'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {authState.user?.domain || 'example.com'}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <User className="mr-3 h-4 w-4" />
                      Profile
                    </button>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </button>
                    <button 
                      onClick={toggleDarkMode}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {state.isDarkMode ? (
                        <Sun className="mr-3 h-4 w-4" />
                      ) : (
                        <Moon className="mr-3 h-4 w-4" />
                      )}
                      {state.isDarkMode ? 'Light mode' : 'Dark mode'}
                    </button>
                  </div>

                  <div className="border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

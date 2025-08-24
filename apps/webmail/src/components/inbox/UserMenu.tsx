import './UserMenu.css'

interface User {
  id?: string
  username?: string
  email?: string
  name?: string
  avatar?: string
  role?: string
}

interface UserMenuProps {
  user: User | null
  onLogout: () => void
  onClose: () => void
}

const UserMenu = ({ user, onLogout, onClose }: UserMenuProps) => {
  return (
    <>
      <div className="user-menu-overlay" onClick={onClose}></div>
      <div className="user-menu">
        <div className="user-menu-header">
          <div className="user-avatar-large">
            {user?.avatar || user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <h3>{user?.name || 'User'}</h3>
            <p>{user?.email || 'user@ceerion.com'}</p>
            <span className="user-role">@{user?.username || 'user'}</span>
          </div>
        </div>
        
        <div className="user-menu-divider"></div>
        
        <nav className="user-menu-nav">
          <button className="user-menu-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Profile Settings
          </button>
          
          <button className="user-menu-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Preferences
          </button>
          
          <button className="user-menu-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Activity Log
          </button>
          
          <button className="user-menu-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Help & Support
          </button>
        </nav>
        
        <div className="user-menu-divider"></div>
        
        <button className="user-menu-item logout" onClick={onLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Sign Out
        </button>
      </div>
    </>
  )
}

export default UserMenu

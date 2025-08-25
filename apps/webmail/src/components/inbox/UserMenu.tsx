import React from 'react'

interface User {
  email: string
  name: string
}

interface UserMenuProps {
  user: User | null
  onLogout: () => void
  onClose: () => void
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  if (!user) return null

  return (
    <div className="user-menu">
      <div className="user-info">
        <div className="user-avatar">{user.name ? user.name.charAt(0) : 'U'}</div>
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>
      <div className="user-actions">
        <button onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}

export default UserMenu

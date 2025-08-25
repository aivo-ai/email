import React from 'react'

interface SidebarProps {
  selectedFolder: string
  setSelectedFolder: (folder: string) => void
  emailCounts: {
    inbox: number
    starred: number
    sent: number
    draft: number
    spam: number
    trash: number
  }
  onCompose: () => void
  currentUser: any
}

const Sidebar: React.FC<SidebarProps> = ({ selectedFolder, setSelectedFolder, emailCounts, onCompose }) => {
  return (
    <div className="sidebar">
      <button className="compose-btn" onClick={onCompose}>
        Compose
      </button>
      <nav className="folder-nav">
        <div 
          className={`folder-item ${selectedFolder === 'inbox' ? 'active' : ''}`}
          onClick={() => setSelectedFolder('inbox')}
        >
          <span>Inbox</span>
          <span className="count">{emailCounts.inbox}</span>
        </div>
        <div 
          className={`folder-item ${selectedFolder === 'starred' ? 'active' : ''}`}
          onClick={() => setSelectedFolder('starred')}
        >
          <span>Starred</span>
          <span className="count">{emailCounts.starred}</span>
        </div>
      </nav>
    </div>
  )
}

export default Sidebar

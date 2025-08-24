import './Sidebar.css'

const Sidebar = ({ selectedFolder, setSelectedFolder, emailCounts, onCompose }) => {
  const folders = [
    { id: 'inbox', label: 'Inbox', icon: '📥', count: emailCounts.inbox },
    { id: 'starred', label: 'Starred', icon: '⭐', count: emailCounts.starred },
    { id: 'sent', label: 'Sent', icon: '📤', count: emailCounts.sent },
    { id: 'draft', label: 'Draft', icon: '📝', count: emailCounts.draft },
    { id: 'spam', label: 'Spam', icon: '⚠️', count: emailCounts.spam },
    { id: 'trash', label: 'Trash', icon: '🗑️', count: emailCounts.trash }
  ]

  const categories = [
    { id: 'primary', label: 'In Primary', count: 8, color: '#5B6CF8' },
    { id: 'social', label: 'Social', count: 45, color: '#34A853' },
    { id: 'works', label: 'Works', count: 87, color: '#4285F4' },
    { id: 'promotion', label: 'Promotion', count: 197, color: '#FBBC04' }
  ]

  const recentChats = [
    { id: 1, name: 'Agnes Parsons', avatar: 'AP', status: 'online' },
    { id: 2, name: 'Jel Chibuzo', avatar: 'JC', status: 'offline', unread: 3 }
  ]

  return (
    <aside className="sidebar">
      <button className="compose-button" onClick={onCompose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Write Message
      </button>

      <nav className="folder-list">
        {folders.map(folder => (
          <button
            key={folder.id}
            className={`folder-item ${selectedFolder === folder.id ? 'active' : ''}`}
            onClick={() => setSelectedFolder(folder.id)}
          >
            <span className="folder-icon">{folder.icon}</span>
            <span className="folder-label">{folder.label}</span>
            {folder.count > 0 && (
              <span className={`folder-count ${folder.id === 'inbox' && folder.count > 0 ? 'unread' : ''}`}>
                {folder.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="categories-section">
        <h3 className="section-title">CATEGORIES</h3>
        <div className="category-list">
          {categories.map(category => (
            <div key={category.id} className="category-item">
              <span className="category-dot" style={{ backgroundColor: category.color }}></span>
              <span className="category-label">{category.label}</span>
              <span className="category-count">{category.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chats-section">
        <h3 className="section-title">RECENT CHATS</h3>
        <button className="new-chat-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14m7-7H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Start New Chat
        </button>
        <div className="chat-list">
          {recentChats.map(chat => (
            <div key={chat.id} className="chat-item">
              <div className="chat-avatar" style={{ backgroundColor: chat.id === 1 ? '#5B6CF8' : '#34A853' }}>
                {chat.avatar}
              </div>
              <span className="chat-name">{chat.name}</span>
              {chat.status === 'online' && <span className="online-indicator"></span>}
              {chat.unread && <span className="unread-count">{chat.unread}</span>}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

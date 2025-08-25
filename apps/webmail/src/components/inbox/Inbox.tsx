import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext, UserContext } from '../../App'
import './Inbox.css'
import Sidebar from './Sidebar.tsx'
import EmailList from './EmailList.tsx'
import EmailView from './EmailView.tsx'
import ComposeEmail from './ComposeEmail.tsx'
import UserMenu from './UserMenu.tsx'

interface Email {
  id: number
  sender: string
  senderEmail: string
  avatar: string
  subject: string
  preview: string
  body: string
  time: string
  date: Date
  isRead: boolean
  hasAttachment: boolean
  attachments: Array<{ name: string; size: string; type: string }>
  folder: string
  isStarred: boolean
  labels: string[]
}

const Inbox = () => {
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const userContext = useContext(UserContext)
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [isComposing, setIsComposing] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedEmails, setSelectedEmails] = useState<number[]>([])
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date())
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false)

  // Update current date/time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  // Format date time as UTC YYYY-MM-DD HH:MM:SS
  const formatDateTime = (date: Date): string => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
  }

  // Mock email data with current user context
  useEffect(() => {
    const currentUserName = userContext.currentUser?.name || 'User'
    const currentUsername = userContext.currentUser?.username || 'there'
    
    const mockEmails: Email[] = [
      {
        id: 1,
        sender: 'Amy Carrol',
        senderEmail: 'amy.carrol@company.com',
        avatar: 'AC',
        subject: 'Website Hosting Reviews Free The Best Resource For Hosting Comparison',
        preview: `Hey ${currentUsername}, Could you free now? Can you look and read the brief first...`,
        body: `Hi ${currentUserName},

Do you know what could beat the exciting feeling of having a new computer? Make your own PC!

Making your own computer from scratch is not only fun to do but cheaper as well. You can get to choose the parts you want to use on your PC. This gives you the control in balancing the price and the quality of your newly assembled PC.

Best Regards,
Tom Gravesen`,
        time: '12:48PM',
        date: new Date(),
        isRead: false,
        hasAttachment: true,
        attachments: [
          { name: 'Brief Details', size: '146.5 Kb', type: 'document' },
          { name: 'Master File', size: '146.5 Kb', type: 'document' }
        ],
        folder: 'inbox',
        isStarred: false,
        labels: []
      },
      {
        id: 2,
        sender: 'System Admin',
        senderEmail: 'admin@ceerion.com',
        avatar: 'SA',
        subject: 'Welcome to CEERION Enterprise Email',
        preview: 'Welcome to your new enterprise email system...',
        body: `Welcome to CEERION Enterprise Email Platform!

Your account has been successfully set up. You can now access all enterprise features including:

- Professional email management
- Calendar integration
- Contact management
- File sharing capabilities

If you have any questions, please contact your system administrator.

Best regards,
CEERION IT Team`,
        time: '9:30AM',
        date: new Date(),
        isRead: true,
        hasAttachment: false,
        attachments: [],
        folder: 'inbox',
        isStarred: true,
        labels: ['important']
      }
    ]
    setEmails(mockEmails)
  }, []) // Run only once on mount

  const handleLogout = () => {
    authContext.logout()
    navigate('/login')
  }

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email)
    setEmails(prev => prev.map(e => 
      e.id === email.id ? { ...e, isRead: true } : e
    ))
  }

  const handleDeleteEmail = (emailId: number) => {
    setEmails(prev => prev.filter(e => e.id !== emailId))
    setSelectedEmail(null)
  }

  const handleArchiveEmail = (emailId: number) => {
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, folder: 'archive' } : e
    ))
    setSelectedEmail(null)
  }

  const handleStarEmail = (emailId: number) => {
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, isStarred: !e.isStarred } : e
    ))
  }

  const filteredEmails = emails.filter(email => {
    const matchesFolder = selectedFolder === 'starred' 
      ? email.isStarred 
      : email.folder === selectedFolder
    
    const matchesSearch = searchQuery === '' || 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesFolder && matchesSearch
  })

  return (
    <div className="inbox-container">
      <header className="inbox-header">
        <div className="header-left">
          <button className="menu-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <h1 className="logo">CEERION</h1>
        </div>
        
        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search from Message"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="header-right">
          <div className="datetime-display">
            {formatDateTime(currentDateTime)}
          </div>
          
          <div className="user-section">
            <button 
              className="user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar">
                {userContext.currentUser?.avatar || userContext.currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <span className="user-name">{userContext.currentUser?.username || 'User'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            {showUserMenu && (
              <UserMenu 
                user={userContext.currentUser}
                onLogout={handleLogout}
                onClose={() => setShowUserMenu(false)}
              />
            )}
          </div>
        </div>
      </header>

      <div className="inbox-body">
        <Sidebar 
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          emailCounts={{
            inbox: emails.filter(e => e.folder === 'inbox').length,
            starred: emails.filter(e => e.isStarred).length,
            sent: 0,
            draft: 0,
            spam: 0,
            trash: 0
          }}
          onCompose={() => setIsComposing(true)}
          currentUser={userContext.currentUser}
        />

        {selectedEmail ? (
          <EmailView 
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onDelete={() => handleDeleteEmail(selectedEmail.id)}
            onArchive={() => handleArchiveEmail(selectedEmail.id)}
            onStar={() => handleStarEmail(selectedEmail.id)}
            currentUser={userContext.currentUser}
          />
        ) : (
          <EmailList 
            emails={filteredEmails}
            onEmailSelect={handleEmailSelect}
            selectedEmails={selectedEmails}
            setSelectedEmails={setSelectedEmails}
            onStar={handleStarEmail}
          />
        )}
      </div>

      {isComposing && (
        <ComposeEmail 
          onClose={() => setIsComposing(false)} 
          currentUser={userContext.currentUser}
        />
      )}
    </div>
  )
}

export default Inbox

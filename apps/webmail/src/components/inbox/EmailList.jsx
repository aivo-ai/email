import { useState } from 'react'
import './EmailList.css'

const EmailList = ({ emails, onEmailSelect, selectedEmails, setSelectedEmails, onStar, currentFolder }) => {
  const [selectAll, setSelectAll] = useState(false)

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmails([])
    } else {
      setSelectedEmails(emails.map(e => e.id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelectEmail = (emailId) => {
    if (selectedEmails.includes(emailId)) {
      setSelectedEmails(selectedEmails.filter(id => id !== emailId))
    } else {
      setSelectedEmails([...selectedEmails, emailId])
    }
  }

  const formatTime = (date) => {
    const now = new Date()
    const emailDate = new Date(date)
    const diffTime = Math.abs(now - emailDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return emailDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return emailDate.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return emailDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="email-list">
      <div className="email-list-header">
        <div className="header-left">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={handleSelectAll}
            className="select-all-checkbox"
          />
          <select className="filter-dropdown">
            <option>Primary</option>
            <option>Social</option>
            <option>Promotions</option>
            <option>Updates</option>
          </select>
        </div>
        <div className="header-right">
          <button className="refresh-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="email-time">Today, 8:26 AM</span>
        </div>
      </div>

      <div className="email-list-body">
        {emails.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>No emails in {currentFolder}</p>
          </div>
        ) : (
          emails.map(email => (
            <div 
              key={email.id} 
              className={`email-item ${!email.isRead ? 'unread' : ''} ${selectedEmails.includes(email.id) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedEmails.includes(email.id)}
                onChange={() => handleSelectEmail(email.id)}
                className="email-checkbox"
                onClick={(e) => e.stopPropagation()}
              />
              
              <div 
                className="email-content"
                onClick={() => onEmailSelect(email)}
              >
                <div className="sender-avatar" style={{ 
                  backgroundColor: email.id % 2 === 0 ? '#5B6CF8' : '#34A853' 
                }}>
                  {email.avatar}
                </div>
                
                <div className="email-details">
                  <div className="email-header">
                    <span className="sender-name">{email.sender}</span>
                    <span className="email-time">{formatTime(email.date)}</span>
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-preview">
                    {email.hasAttachment && (
                      <svg className="attachment-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                    {email.preview}
                  </div>
                </div>
              </div>

              <button 
                className={`star-button ${email.isStarred ? 'starred' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onStar(email.id)
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={email.isStarred ? '#FBBC04' : 'none'}>
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default EmailList

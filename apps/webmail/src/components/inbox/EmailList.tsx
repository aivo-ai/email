import React from 'react'

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

interface EmailListProps {
  emails: Email[]
  onEmailSelect: (email: Email) => void
  selectedEmails: number[]
  setSelectedEmails: (emailIds: number[]) => void
  onStar: (emailId: number) => void
}

const EmailList: React.FC<EmailListProps> = ({ 
  emails, 
  onEmailSelect, 
  onStar
}) => {
  return (
    <div className="email-list">
      <div className="emails">
        {emails.map((email) => (
          <div
            key={email.id}
            className={`email-item ${!email.isRead ? 'unread' : ''}`}
            onClick={() => onEmailSelect(email)}
          >
            <div className="email-avatar">{email.avatar}</div>
            <div className="email-content">
              <div className="email-header">
                <span className="sender">{email.sender}</span>
                <span className="time">{email.time}</span>
              </div>
              <div className="subject">{email.subject}</div>
              <div className="preview">{email.preview}</div>
            </div>
            <div className="email-actions">
              <button onClick={(e) => {
                e.stopPropagation()
                onStar(email.id)
              }}>
                {email.isStarred ? '★' : '☆'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EmailList

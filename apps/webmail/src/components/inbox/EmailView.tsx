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

interface EmailViewProps {
  email: Email | null
  onDelete: () => void
  onArchive: () => void
  onStar: () => void
  onClose: () => void
  currentUser: any
}

const EmailView: React.FC<EmailViewProps> = ({ email, onDelete, onArchive, onStar, onClose }) => {
  if (!email) {
    return (
      <div className="email-view no-email">
        <p>Select an email to view</p>
      </div>
    )
  }

  return (
    <div className="email-view">
      <div className="email-header">
        <button onClick={onClose}>←</button>
        <h2>{email.subject}</h2>
        <div className="email-actions">
          <button onClick={onStar}>{email.isStarred ? '★' : '☆'}</button>
          <button onClick={onArchive}>Archive</button>
          <button onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div className="email-meta">
        <div className="sender-info">
          <div className="avatar">{email.avatar}</div>
          <div>
            <div className="sender-name">{email.sender}</div>
            <div className="sender-email">{email.senderEmail}</div>
          </div>
        </div>
        <div className="email-time">{email.time}</div>
      </div>
      <div className="email-body">
        <div dangerouslySetInnerHTML={{ __html: email.body.replace(/\n/g, '<br>') }} />
      </div>
      {email.hasAttachment && email.attachments && email.attachments.length > 0 && (
        <div className="attachments">
          <h3>Attachments</h3>
          {email.attachments.map((attachment, index) => (
            <div key={index} className="attachment">
              <span>{attachment.name}</span>
              <span>{attachment.size}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EmailView

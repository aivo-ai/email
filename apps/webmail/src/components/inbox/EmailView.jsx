import './EmailView.css'

const EmailView = ({ email, onClose, onDelete, onArchive, onStar }) => {
  return (
    <div className="email-view">
      <div className="email-view-header">
        <button className="back-button" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        
        <div className="email-actions">
          <button className="action-button" onClick={onArchive}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="action-button" onClick={onDelete}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="action-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={`action-button ${email.isStarred ? 'starred' : ''}`} onClick={onStar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={email.isStarred ? '#FBBC04' : 'none'}>
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        <div className="view-actions">
          <button className="action-button">Reply</button>
          <button className="action-button">Forward Message</button>
          <button className="action-button">Filter Message</button>
          <button className="action-button">Delete Message</button>
          <button className="action-button">Block "{email.sender}"</button>
          <button className="action-button">Report Spam</button>
          <button className="action-button">Download Message</button>
          <button className="action-button">Translate Message</button>
        </div>
      </div>

      <div className="email-view-content">
        <div className="email-meta">
          <div className="sender-info">
            <div className="sender-avatar" style={{ backgroundColor: '#5B6CF8' }}>
              {email.avatar}
            </div>
            <div>
              <h3 className="sender-name">{email.sender}</h3>
              <p className="sender-email">{email.senderEmail}</p>
            </div>
          </div>
          <span className="email-date">{email.time}</span>
        </div>

        <h2 className="email-subject">{email.subject}</h2>
        
        <div className="email-body">
          {email.body.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {email.attachments && email.attachments.length > 0 && (
          <div className="attachments-section">
            <h4>Attachments</h4>
            <div className="attachments-list">
              {email.attachments.map((attachment, index) => (
                <div key={index} className="attachment-item">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div className="attachment-details">
                    <span className="attachment-name">{attachment.name}</span>
                    <span className="attachment-size">{attachment.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="reply-section">
          <textarea 
            placeholder="Type your reply here..."
            className="reply-textarea"
          />
          <div className="reply-actions">
            <button className="send-button">Send Reply</button>
            <button className="attach-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailView

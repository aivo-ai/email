import { useState } from 'react'
import './ComposeEmail.css'

const ComposeEmail = ({ onClose }) => {
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Sending email:', formData)
    onClose()
  }

  return (
    <div className="compose-overlay">
      <div className="compose-modal">
        <div className="compose-header">
          <h3>New Message</h3>
          <button className="close-button" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="compose-form">
          <input
            type="email"
            placeholder="To"
            value={formData.to}
            onChange={(e) => setFormData({...formData, to: e.target.value})}
            className="compose-input"
            required
          />
          
          <input
            type="email"
            placeholder="Cc"
            value={formData.cc}
            onChange={(e) => setFormData({...formData, cc: e.target.value})}
            className="compose-input"
          />
          
          <input
            type="email"
            placeholder="Bcc"
            value={formData.bcc}
            onChange={(e) => setFormData({...formData, bcc: e.target.value})}
            className="compose-input"
          />
          
          <input
            type="text"
            placeholder="Subject"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            className="compose-input"
            required
          />
          
          <textarea
            placeholder="Compose email"
            value={formData.body}
            onChange={(e) => setFormData({...formData, body: e.target.value})}
            className="compose-textarea"
            required
          />

          <div className="compose-footer">
            <button type="submit" className="send-button">Send</button>
            <div className="compose-tools">
              <button type="button" className="tool-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button type="button" className="tool-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ComposeEmail

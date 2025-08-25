import React, { useState } from 'react'

interface ComposeEmailProps {
  onClose: () => void
  currentUser: any
}

const ComposeEmail: React.FC<ComposeEmailProps> = ({ onClose }) => {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const handleSend = () => {
    if (to && subject && body) {
      // Here we would call an onSend prop, but for now just close
      setTo('')
      setSubject('')
      setBody('')
      onClose()
    }
  }

  return (
    <div className="compose-email-overlay">
      <div className="compose-email">
        <div className="compose-header">
          <h3>Compose Email</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="compose-form">
          <input
            type="email"
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            placeholder="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
          />
          <div className="compose-actions">
            <button onClick={handleSend}>Send</button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComposeEmail

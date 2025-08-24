import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const HOST = 'mail.ceerion.com'

if (window.location.hostname !== HOST && process.env.NODE_ENV === 'production') {
  throw new Error(`Invalid host. Expected ${HOST}, got ${window.location.hostname}`)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

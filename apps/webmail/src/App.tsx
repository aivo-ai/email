import { useState, useEffect, createContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import Inbox from './components/inbox/Inbox'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

// Types
interface User {
  id: string
  username: string
  email: string
  name: string
  avatar: string
  role: string
  lastLogin: string
  settings: {
    theme: string
    notifications: boolean
    language: string
  }
}

interface AuthContextType {
  isAuthenticated: boolean
  login: (credentials: any) => Promise<any>
  logout: () => void
}

interface UserContextType {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
}

// Create Auth Context with default values
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => ({ success: false }),
  logout: () => {}
})

// Create User Context with default values
export const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {}
})

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Check if user is already logged in (from localStorage/sessionStorage)
    const checkAuth = () => {
      const token = localStorage.getItem('authToken')
      const userData = localStorage.getItem('userData')
      
      if (token && userData) {
        setIsAuthenticated(true)
        setCurrentUser(JSON.parse(userData))
      }
      setIsLoading(false)
    }
    
    checkAuth()
  }, [])

  const handleLogin = (credentials: { email: string; password: string }) => {
    // Simulate authentication
    // In production, this would make an API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock successful login
        if (credentials.email && credentials.password) {
          const userData = {
            id: 'user-001',
            username: 'aivo-ai',
            email: credentials.email,
            name: 'Aivo AI',
            avatar: 'AA',
            role: 'user',
            lastLogin: new Date().toISOString(),
            settings: {
              theme: 'light',
              notifications: true,
              language: 'en'
            }
          }
          
          // Store auth data
          const authToken = 'mock-jwt-token-' + Date.now()
          localStorage.setItem('authToken', authToken)
          localStorage.setItem('userData', JSON.stringify(userData))
          
          setCurrentUser(userData)
          setIsAuthenticated(true)
          resolve({ success: true, user: userData })
        } else {
          reject({ success: false, message: 'Invalid credentials' })
        }
      }, 1000)
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    setIsAuthenticated(false)
    setCurrentUser(null)
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <svg className="spinner" width="50" height="50" viewBox="0 0 24 24">
            <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="#5B6CF8" strokeWidth="3" fill="none"/>
          </svg>
        </div>
        <p>Loading CEERION Enterprise Email...</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login: handleLogin, logout: handleLogout }}>
      <UserContext.Provider value={{ currentUser, setCurrentUser }}>
        <Router>
          <div className="App">
            <Routes>
              <Route 
                path="/login" 
                element={
                  isAuthenticated ? 
                    <Navigate to="/inbox" replace /> : 
                    <LoginPage />
                } 
              />
              <Route 
                path="/inbox" 
                element={
                  <ProtectedRoute>
                    <Inbox />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/" 
                element={<Navigate to={isAuthenticated ? "/inbox" : "/login"} replace />} 
              />
              <Route 
                path="*" 
                element={<Navigate to="/" replace />} 
              />
            </Routes>
          </div>
        </Router>
      </UserContext.Provider>
    </AuthContext.Provider>
  )
}

export default App

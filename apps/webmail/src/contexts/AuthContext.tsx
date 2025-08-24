import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  domain: string
  role: 'admin' | 'user'
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  token: string | null
}

type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } }

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
      }
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
      }
    case 'LOGOUT':
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
      }
    case 'RESTORE_SESSION':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
      }
    default:
      return state
  }
}

interface AuthContextType {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    // Restore session on app start
    try {
      const token = localStorage.getItem('auth_token')
      const userStr = localStorage.getItem('auth_user')
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr)
          dispatch({ type: 'RESTORE_SESSION', payload: { user, token } })
        } catch (error) {
          console.error('Failed to restore session:', error)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          dispatch({ type: 'LOGIN_FAILURE' })
        }
      } else {
        dispatch({ type: 'LOGIN_FAILURE' })
      }
    } catch (error) {
      console.error('localStorage access failed:', error)
      dispatch({ type: 'LOGIN_FAILURE' })
    }
  }, [])

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' })

    try {
      // For demo purposes, accept any email/password combination
      // In production, this would make a real API call
      if (email && password) {
        const mockUser: User = {
          id: '1',
          email: email,
          name: email.split('@')[0],
          domain: email.split('@')[1] || 'ceerion.com',
          role: 'admin',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${email.split('@')[0]}`
        }
        const mockToken = 'demo-token-' + Date.now()

        localStorage.setItem('auth_token', mockToken)
        localStorage.setItem('auth_user', JSON.stringify(mockUser))

        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: mockUser, token: mockToken } })
        return
      }

      // Real API call (commented out for demo)
      /*
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      const { user, token } = data

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(user))

      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } })
      */
    } catch (error) {
      console.error('Login error:', error)
      dispatch({ type: 'LOGIN_FAILURE' })
      throw error
    }
  }

  const logout = () => {
    dispatch({ type: 'LOGOUT' })
  }

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      const { user, token } = data

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(user))

      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } })
    } catch (error) {
      console.error('Token refresh error:', error)
      dispatch({ type: 'LOGOUT' })
      throw error
    }
  }

  const value: AuthContextType = {
    state,
    login,
    logout,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

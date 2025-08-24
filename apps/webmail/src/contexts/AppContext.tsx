import { createContext, useContext, useReducer, ReactNode } from 'react'

interface AppState {
  sidebarOpen: boolean
  currentView: 'inbox' | 'message' | 'compose' | 'search' | 'calendar' | 'contacts' | 'chat' | 'settings'
  composeDrawerOpen: boolean
  searchQuery: string
  selectedMessages: string[]
  inboxFilter: 'all' | 'primary' | 'social' | 'promotions' | 'updates' | 'forums'
  inboxView: 'focused' | 'other'
  isDarkMode: boolean
  notifications: Notification[]
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  timestamp: number
}

type AppAction = 
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_CURRENT_VIEW'; payload: AppState['currentView'] }
  | { type: 'TOGGLE_COMPOSE_DRAWER' }
  | { type: 'SET_COMPOSE_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_MESSAGES'; payload: string[] }
  | { type: 'ADD_SELECTED_MESSAGE'; payload: string }
  | { type: 'REMOVE_SELECTED_MESSAGE'; payload: string }
  | { type: 'CLEAR_SELECTED_MESSAGES' }
  | { type: 'SET_INBOX_FILTER'; payload: AppState['inboxFilter'] }
  | { type: 'SET_INBOX_VIEW'; payload: AppState['inboxView'] }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }

const initialState: AppState = {
  sidebarOpen: true,
  currentView: 'inbox',
  composeDrawerOpen: false,
  searchQuery: '',
  selectedMessages: [],
  inboxFilter: 'all',
  inboxView: 'focused',
  isDarkMode: false,
  notifications: [],
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload }
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload }
    case 'TOGGLE_COMPOSE_DRAWER':
      return { ...state, composeDrawerOpen: !state.composeDrawerOpen }
    case 'SET_COMPOSE_DRAWER_OPEN':
      return { ...state, composeDrawerOpen: action.payload }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'SET_SELECTED_MESSAGES':
      return { ...state, selectedMessages: action.payload }
    case 'ADD_SELECTED_MESSAGE':
      return { 
        ...state, 
        selectedMessages: [...state.selectedMessages, action.payload]
      }
    case 'REMOVE_SELECTED_MESSAGE':
      return { 
        ...state, 
        selectedMessages: state.selectedMessages.filter(id => id !== action.payload)
      }
    case 'CLEAR_SELECTED_MESSAGES':
      return { ...state, selectedMessages: [] }
    case 'SET_INBOX_FILTER':
      return { ...state, inboxFilter: action.payload }
    case 'SET_INBOX_VIEW':
      return { ...state, inboxView: action.payload }
    case 'TOGGLE_DARK_MODE':
      const newDarkMode = !state.isDarkMode
      try {
        localStorage.setItem('darkMode', JSON.stringify(newDarkMode))
      } catch (error) {
        console.warn('Failed to save dark mode preference:', error)
      }
      return { ...state, isDarkMode: newDarkMode }
    case 'ADD_NOTIFICATION':
      const notification: Notification = {
        ...action.payload,
        id: Math.random().toString(36).substring(2),
        timestamp: Date.now(),
      }
      return { 
        ...state, 
        notifications: [...state.notifications, notification] 
      }
    case 'REMOVE_NOTIFICATION':
      return { 
        ...state, 
        notifications: state.notifications.filter(n => n.id !== action.payload) 
      }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  // Convenience methods
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCurrentView: (view: AppState['currentView']) => void
  toggleComposeDrawer: () => void
  setComposeDrawerOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setSelectedMessages: (messageIds: string[]) => void
  addSelectedMessage: (messageId: string) => void
  removeSelectedMessage: (messageId: string) => void
  clearSelectedMessages: () => void
  setInboxFilter: (filter: AppState['inboxFilter']) => void
  setInboxView: (view: AppState['inboxView']) => void
  toggleDarkMode: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  // Safely get initial dark mode preference
  let initialDarkMode = false
  try {
    const stored = localStorage.getItem('darkMode')
    if (stored) {
      initialDarkMode = JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to parse dark mode preference:', error)
  }

  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    isDarkMode: initialDarkMode,
  })

  const value: AppContextType = {
    state,
    dispatch,
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    setSidebarOpen: (open: boolean) => dispatch({ type: 'SET_SIDEBAR_OPEN', payload: open }),
    setCurrentView: (view: AppState['currentView']) => dispatch({ type: 'SET_CURRENT_VIEW', payload: view }),
    toggleComposeDrawer: () => dispatch({ type: 'TOGGLE_COMPOSE_DRAWER' }),
    setComposeDrawerOpen: (open: boolean) => dispatch({ type: 'SET_COMPOSE_DRAWER_OPEN', payload: open }),
    setSearchQuery: (query: string) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query }),
    setSelectedMessages: (messageIds: string[]) => dispatch({ type: 'SET_SELECTED_MESSAGES', payload: messageIds }),
    addSelectedMessage: (messageId: string) => dispatch({ type: 'ADD_SELECTED_MESSAGE', payload: messageId }),
    removeSelectedMessage: (messageId: string) => dispatch({ type: 'REMOVE_SELECTED_MESSAGE', payload: messageId }),
    clearSelectedMessages: () => dispatch({ type: 'CLEAR_SELECTED_MESSAGES' }),
    setInboxFilter: (filter: AppState['inboxFilter']) => dispatch({ type: 'SET_INBOX_FILTER', payload: filter }),
    setInboxView: (view: AppState['inboxView']) => dispatch({ type: 'SET_INBOX_VIEW', payload: view }),
    toggleDarkMode: () => dispatch({ type: 'TOGGLE_DARK_MODE' }),
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => 
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification }),
    removeNotification: (id: string) => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

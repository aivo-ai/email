import { createContext, useContext, ReactNode } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'
import { useApp } from './AppContext'

interface KeyboardShortcutsContextType {
  // This context provides keyboard shortcuts throughout the app
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null)

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider')
  }
  return context
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const navigate = useNavigate()
  const { 
    toggleSidebar, 
    toggleComposeDrawer, 
    setCurrentView,
    clearSelectedMessages,
    toggleDarkMode 
  } = useApp()

  // Navigation shortcuts
  useHotkeys('g i', () => {
    navigate('/app/inbox')
    setCurrentView('inbox')
  }, { description: 'Go to inbox' })

  useHotkeys('g s', () => {
    navigate('/app/search')
    setCurrentView('search')
  }, { description: 'Go to search' })

  useHotkeys('g c', () => {
    navigate('/app/compose')
    setCurrentView('compose')
  }, { description: 'Go to compose' })

  useHotkeys('g a', () => {
    navigate('/app/calendar')
    setCurrentView('calendar')
  }, { description: 'Go to calendar' })

  useHotkeys('g k', () => {
    navigate('/app/contacts')
    setCurrentView('contacts')
  }, { description: 'Go to contacts' })

  useHotkeys('g t', () => {
    navigate('/app/chat')
    setCurrentView('chat')
  }, { description: 'Go to chat' })

  useHotkeys('g ,', () => {
    navigate('/app/settings')
    setCurrentView('settings')
  }, { description: 'Go to settings' })

  // Interface shortcuts
  useHotkeys('ctrl+b, cmd+b', () => {
    toggleSidebar()
  }, { description: 'Toggle sidebar' })

  useHotkeys('c', () => {
    toggleComposeDrawer()
  }, { description: 'Compose new message' })

  useHotkeys('/', (event) => {
    event.preventDefault()
    navigate('/app/search')
    setCurrentView('search')
    // Focus search input
    setTimeout(() => {
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    }, 100)
  }, { description: 'Search' })

  useHotkeys('escape', () => {
    clearSelectedMessages()
  }, { description: 'Clear selection' })

  // Theme toggle
  useHotkeys('ctrl+shift+l, cmd+shift+l', () => {
    toggleDarkMode()
  }, { description: 'Toggle dark mode' })

  // Message shortcuts (when messages are selected)
  useHotkeys('ctrl+a, cmd+a', (event) => {
    // This will be implemented in the inbox component
    event.preventDefault()
  }, { description: 'Select all messages' })

  useHotkeys('delete, backspace', () => {
    // This will be implemented in the inbox component
  }, { description: 'Delete selected messages' })

  useHotkeys('r', () => {
    // Reply to selected message
  }, { description: 'Reply to message' })

  useHotkeys('shift+r', () => {
    // Reply all to selected message
  }, { description: 'Reply all to message' })

  useHotkeys('f', () => {
    // Forward selected message
  }, { description: 'Forward message' })

  useHotkeys('a', () => {
    // Archive selected messages
  }, { description: 'Archive messages' })

  useHotkeys('s', () => {
    // Star/unstar selected messages
  }, { description: 'Star messages' })

  useHotkeys('u', () => {
    // Mark as read/unread
  }, { description: 'Toggle read status' })

  useHotkeys('!', () => {
    // Mark as important
  }, { description: 'Mark as important' })

  useHotkeys('j', () => {
    // Next message
  }, { description: 'Next message' })

  useHotkeys('k', () => {
    // Previous message
  }, { description: 'Previous message' })

  useHotkeys('enter', () => {
    // Open selected message
  }, { description: 'Open message' })

  const value: KeyboardShortcutsContextType = {}

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}

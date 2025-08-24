import { useApp } from '../contexts/AppContext'

export default function NotificationToasts() {
  const { state, removeNotification } = useApp()

  if (state.notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {state.notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            max-w-sm bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 p-4
            ${notification.type === 'error' ? 'border-l-4 border-red-500' : ''}
            ${notification.type === 'success' ? 'border-l-4 border-green-500' : ''}
            ${notification.type === 'warning' ? 'border-l-4 border-yellow-500' : ''}
            ${notification.type === 'info' ? 'border-l-4 border-blue-500' : ''}
          `}
        >
          <div className="flex items-start">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                {notification.title}
              </h4>
              {notification.message && (
                <p className="mt-1 text-sm text-gray-500">
                  {notification.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

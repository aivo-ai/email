import { useState } from 'react'
import { 
  Archive, 
  Trash2, 
  Star, 
  MoreHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Square,
  CheckSquare,
  Paperclip
} from 'lucide-react'

const mockMessages = [
  {
    id: '1',
    from: 'Roger Nelson',
    fromEmail: 'roger.nelson@company.com',
    subject: 'New comments on MCR draft presentation',
    preview: 'Roger Nelson said what about...',
    time: '2:35 PM',
    isRead: false,
    isStarred: false,
    hasAttachment: false,
    isImportant: true,
  },
  {
    id: '2',
    from: 'Lori Cole',
    fromEmail: 'lori.cole@company.com',
    subject: 'Q1 project wrap-up',
    preview: "Here's a list of all the top challenges and findings. Sur...",
    time: 'Nov 11',
    isRead: false,
    isStarred: false,
    hasAttachment: true,
    isImportant: false,
  },
  {
    id: '3',
    from: 'Lauren Roberts',
    fromEmail: 'lauren.roberts@company.com',
    subject: 'Fwd: Client resources for Q3',
    preview: "Ryan, here's the doc with all the client resou...",
    time: 'Nov 8',
    isRead: false,
    isStarred: false,
    hasAttachment: false,
    isImportant: false,
  },
  {
    id: '4',
    from: 'Ethan Lattimore',
    fromEmail: 'ethan.lattimore@company.com',
    subject: "Last year's EMEA strategy deck",
    preview: 'Sending this out to anyone who missed...',
    time: 'Nov 8',
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    isImportant: false,
  },
  {
    id: '5',
    from: 'Gloria Hill',
    fromEmail: 'gloria.hill@company.com',
    subject: 'Revised organic search numbers',
    preview: 'Hi, all—the table below contains the revise...',
    time: 'Nov 7',
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    isImportant: false,
  },
  {
    id: '6',
    from: 'Shirley Franklin',
    fromEmail: 'shirley.franklin@company.com',
    subject: '[Updated invitation] Midwest retail sales check-in',
    preview: 'Midwest retail sales che...',
    time: 'Nov 7',
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    isImportant: false,
  }
]

export default function InboxPage() {
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [allSelected, setAllSelected] = useState(false)

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedMessages([])
    } else {
      setSelectedMessages(mockMessages.map(msg => msg.id))
    }
    setAllSelected(!allSelected)
  }

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId)
      } else {
        return [...prev, messageId]
      }
    })
  }

  const isSelected = (messageId: string) => selectedMessages.includes(messageId)

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Select all checkbox */}
            <button
              onClick={toggleSelectAll}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-gray-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-600" />
              )}
            </button>

            {/* Toolbar actions */}
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded" title="Archive">
                <Archive className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded" title="Delete">
                <Trash2 className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded" title="More">
                <MoreHorizontal className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded" title="Refresh">
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </button>
            <div className="text-sm text-gray-500">1-50 of 1,000+</div>
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="h-4 w-4 text-gray-400" />
            </button>
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {mockMessages.map((message) => (
          <div
            key={message.id}
            className={`flex items-center px-4 py-2 border-b border-gray-100 hover:shadow-sm hover:bg-gray-50 cursor-pointer group ${
              isSelected(message.id) ? 'bg-blue-50' : ''
            } ${!message.isRead ? 'bg-white' : 'bg-gray-50'}`}
            onClick={() => toggleSelectMessage(message.id)}
          >
            {/* Checkbox */}
            <div className="flex-shrink-0 mr-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleSelectMessage(message.id)
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isSelected(message.id) ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                )}
              </button>
            </div>

            {/* Star */}
            <div className="flex-shrink-0 mr-3">
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Star className={`h-4 w-4 ${message.isStarred ? 'text-yellow-400 fill-current' : 'text-gray-400 hover:text-gray-600'}`} />
              </button>
            </div>

            {/* Important marker */}
            {message.isImportant && (
              <div className="flex-shrink-0 mr-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              </div>
            )}

            {/* Sender */}
            <div className={`flex-shrink-0 w-48 mr-4 truncate ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {message.from}
            </div>

            {/* Subject and preview */}
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center">
                <span className={`truncate ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                  {message.subject}
                </span>
                <span className="text-gray-500 text-sm ml-2 truncate">
                  — {message.preview}
                </span>
              </div>
            </div>

            {/* Attachment icon */}
            {message.hasAttachment && (
              <div className="flex-shrink-0 mr-2">
                <Paperclip className="h-4 w-4 text-gray-400" />
              </div>
            )}

            {/* Time */}
            <div className="flex-shrink-0 text-sm text-gray-500 w-16 text-right">
              {message.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

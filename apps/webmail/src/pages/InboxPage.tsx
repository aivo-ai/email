import React, { useState } from 'react';

interface Email {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  isImportant: boolean;
}

const mockEmails: Email[] = [
  {
    id: '1',
    sender: 'John Doe',
    subject: 'Q4 Quarterly Report',
    preview: 'Please find attached the quarterly report for Q4. The numbers look promising and...',
    timestamp: 'Dec 15',
    isRead: false,
    isStarred: true,
    hasAttachment: true,
    isImportant: true,
  },
  {
    id: '2',
    sender: 'Sarah Johnson',
    subject: 'Meeting Schedule Update',
    preview: 'The meeting originally scheduled for tomorrow has been moved to next week...',
    timestamp: 'Dec 14',
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    isImportant: false,
  },
  {
    id: '3',
    sender: 'Mike Wilson',
    subject: 'Project Timeline Review',
    preview: 'I wanted to discuss the current project timeline and potential adjustments...',
    timestamp: 'Dec 13',
    isRead: false,
    isStarred: false,
    hasAttachment: true,
    isImportant: false,
  },
  {
    id: '4',
    sender: 'Emily Davis',
    subject: 'Welcome to the Team!',
    preview: 'Welcome aboard! We are excited to have you join our team. Here is some information...',
    timestamp: 'Dec 12',
    isRead: true,
    isStarred: true,
    hasAttachment: false,
    isImportant: true,
  },
  {
    id: '5',
    sender: 'Team Lead',
    subject: 'Weekly Status Update',
    preview: 'This week we made significant progress on the project deliverables...',
    timestamp: 'Dec 11',
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    isImportant: false,
  },
];

const InboxPage: React.FC = () => {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(mockEmails.map(email => email.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectEmail = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
    setSelectAll(newSelected.size === mockEmails.length);
  };

  const handleStarToggle = (emailId: string) => {
    // Toggle star logic would go here
    console.log('Toggle star for email:', emailId);
  };

  const handleArchive = () => {
    console.log('Archive emails:', Array.from(selectedEmails));
  };

  const handleDelete = () => {
    console.log('Delete emails:', Array.from(selectedEmails));
  };

  const handleMarkAsRead = () => {
    console.log('Mark as read:', Array.from(selectedEmails));
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <button
              onClick={handleArchive}
              disabled={selectedEmails.size === 0}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Archive"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4m0 0l4-4m-4 4V3m0 9v9" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={selectedEmails.size === 0}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={handleMarkAsRead}
              disabled={selectedEmails.size === 0}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mark as read"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1" />
          
          <div className="text-sm text-gray-500">
            {selectedEmails.size > 0 ? `${selectedEmails.size} selected` : `${mockEmails.length} conversations`}
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {mockEmails.map((email) => (
          <div
            key={email.id}
            className={`flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer group ${
              selectedEmails.has(email.id) ? 'bg-blue-50' : ''
            } ${!email.isRead ? 'bg-white font-medium' : 'bg-gray-50 font-normal'}`}
            onClick={() => handleSelectEmail(email.id)}
          >
            {/* Checkbox */}
            <div className="flex items-center mr-3">
              <input
                type="checkbox"
                checked={selectedEmails.has(email.id)}
                onChange={() => handleSelectEmail(email.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Star */}
            <div className="flex items-center mr-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStarToggle(email.id);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <svg
                  className={`w-5 h-5 ${
                    email.isStarred ? 'text-yellow-400 fill-current' : 'text-gray-400'
                  }`}
                  fill={email.isStarred ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            </div>

            {/* Important Marker */}
            {email.isImportant && (
              <div className="flex items-center mr-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              </div>
            )}

            {/* Sender */}
            <div className={`w-48 flex-shrink-0 truncate ${!email.isRead ? 'font-bold' : 'font-normal'}`}>
              {email.sender}
            </div>

            {/* Subject and Preview */}
            <div className="flex-1 min-w-0 mx-4">
              <div className="flex items-center">
                <span className={`${!email.isRead ? 'font-bold' : 'font-normal'} mr-2`}>
                  {email.subject}
                </span>
                <span className="text-gray-600 text-sm truncate">
                  - {email.preview}
                </span>
              </div>
            </div>

            {/* Attachment Icon */}
            {email.hasAttachment && (
              <div className="flex items-center mr-3">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-sm text-gray-500 w-16 text-right">
              {email.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InboxPage;

import { useState, useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  category: string;
  modifiers?: ('ctrl' | 'cmd' | 'shift' | 'alt')[];
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'c',
    description: 'Compose new email',
    action: () => window.dispatchEvent(new CustomEvent('compose-email')),
    category: 'Compose',
  },
  {
    key: 'r',
    description: 'Reply to email',
    action: () => window.dispatchEvent(new CustomEvent('reply-email')),
    category: 'Compose',
  },
  {
    key: 'a',
    description: 'Reply all',
    action: () => window.dispatchEvent(new CustomEvent('reply-all-email')),
    category: 'Compose',
  },
  {
    key: 'f',
    description: 'Forward email',
    action: () => window.dispatchEvent(new CustomEvent('forward-email')),
    category: 'Compose',
  },
  {
    key: '/',
    description: 'Search emails',
    action: () => window.dispatchEvent(new CustomEvent('focus-search')),
    category: 'Navigation',
  },
  {
    key: 'g',
    description: 'Go to inbox',
    action: () => window.dispatchEvent(new CustomEvent('go-to-inbox')),
    category: 'Navigation',
    modifiers: ['shift'],
  },
  {
    key: 'e',
    description: 'Archive email',
    action: () => window.dispatchEvent(new CustomEvent('archive-email')),
    category: 'Actions',
  },
  {
    key: 'd',
    description: 'Delete email',
    action: () => window.dispatchEvent(new CustomEvent('delete-email')),
    category: 'Actions',
  },
  {
    key: 's',
    description: 'Star email',
    action: () => window.dispatchEvent(new CustomEvent('star-email')),
    category: 'Actions',
  },
  {
    key: 'u',
    description: 'Mark as unread',
    action: () => window.dispatchEvent(new CustomEvent('mark-unread')),
    category: 'Actions',
  },
  {
    key: 'j',
    description: 'Next email',
    action: () => window.dispatchEvent(new CustomEvent('next-email')),
    category: 'Navigation',
  },
  {
    key: 'k',
    description: 'Previous email',
    action: () => window.dispatchEvent(new CustomEvent('previous-email')),
    category: 'Navigation',
  },
  {
    key: '?',
    description: 'Show keyboard shortcuts',
    action: () => window.dispatchEvent(new CustomEvent('show-shortcuts')),
    category: 'Help',
  },
];

export function useKeyboardShortcuts() {
  const [shortcuts] = useState<KeyboardShortcut[]>(DEFAULT_SHORTCUTS);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).contentEditable === 'true') {
      return;
    }

    const key = event.key.toLowerCase();
    const hasCtrl = event.ctrlKey || event.metaKey;
    const hasShift = event.shiftKey;
    const hasAlt = event.altKey;

    const matchingShortcut = shortcuts.find(shortcut => {
      if (shortcut.key !== key) return false;
      
      const requiredModifiers = shortcut.modifiers || [];
      const hasRequiredCtrl = requiredModifiers.includes('ctrl') || requiredModifiers.includes('cmd');
      const hasRequiredShift = requiredModifiers.includes('shift');
      const hasRequiredAlt = requiredModifiers.includes('alt');

      return (hasRequiredCtrl === hasCtrl) &&
             (hasRequiredShift === hasShift) &&
             (hasRequiredAlt === hasAlt);
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    // Listen for show shortcuts event
    const handleShowShortcuts = () => setShowCheatSheet(true);
    window.addEventListener('show-shortcuts', handleShowShortcuts);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('show-shortcuts', handleShowShortcuts);
    };
  }, [handleKeyDown]);

  return {
    shortcuts,
    showCheatSheet,
    setShowCheatSheet,
  };
}

export function KeyboardShortcutsCheatSheet() {
  const { shortcuts, showCheatSheet, setShowCheatSheet } = useKeyboardShortcuts();

  if (!showCheatSheet) return null;

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const modifiers = shortcut.modifiers || [];
    const parts = [...modifiers, shortcut.key.toUpperCase()];
    return parts.join(' + ');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={() => setShowCheatSheet(false)}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setShowCheatSheet(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close shortcuts"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div key={`${shortcut.key}-${shortcut.category}`} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">?</kbd> to show/hide this help
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

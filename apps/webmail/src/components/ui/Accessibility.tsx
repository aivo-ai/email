import { useState, useCallback, useRef, useEffect } from 'react';

export type LiveRegionPoliteness = 'polite' | 'assertive' | 'off';

interface LiveRegionMessage {
  id: string;
  message: string;
  politeness: LiveRegionPoliteness;
  timestamp: number;
}

export function useLiveRegion() {
  const [messages, setMessages] = useState<LiveRegionMessage[]>([]);
  const messageId = useRef(0);

  const announce = useCallback((
    message: string, 
    politeness: LiveRegionPoliteness = 'polite'
  ) => {
    const id = `live-message-${messageId.current++}`;
    const newMessage: LiveRegionMessage = {
      id,
      message,
      politeness,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMessage]);

    // Auto-remove message after 5 seconds
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, 5000);
  }, []);

  const announceAction = useCallback((action: string, target?: string) => {
    const message = target ? `${action} ${target}` : action;
    announce(message, 'polite');
  }, [announce]);

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive');
  }, [announce]);

  return {
    messages,
    announce,
    announceAction,
    announceError,
  };
}

export function LiveRegionContainer() {
  const { messages } = useLiveRegion();

  return (
    <>
      {/* Polite announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="live-region-polite"
      >
        {messages
          .filter(msg => msg.politeness === 'polite')
          .slice(-1) // Only show the latest polite message
          .map(msg => (
            <div key={msg.id}>{msg.message}</div>
          ))
        }
      </div>

      {/* Assertive announcements */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="live-region-assertive"
      >
        {messages
          .filter(msg => msg.politeness === 'assertive')
          .slice(-1) // Only show the latest assertive message
          .map(msg => (
            <div key={msg.id}>{msg.message}</div>
          ))
        }
      </div>
    </>
  );
}

// Action announcements for common email operations
export function useEmailActionAnnouncements() {
  const { announceAction, announceError } = useLiveRegion();

  const announceEmailAction = useCallback((
    action: 'archived' | 'deleted' | 'starred' | 'unstarred' | 'read' | 'unread',
    count: number = 1
  ) => {
    const subject = count === 1 ? 'email' : `${count} emails`;
    const actionText = action === 'read' ? 'marked as read' : 
                      action === 'unread' ? 'marked as unread' :
                      action === 'starred' ? 'starred' :
                      action === 'unstarred' ? 'unstarred' :
                      action;
    
    announceAction(`${subject} ${actionText}`);
  }, [announceAction]);

  const announceNavigationAction = useCallback((
    action: 'opened' | 'closed' | 'focused',
    target: string
  ) => {
    announceAction(`${target} ${action}`);
  }, [announceAction]);

  const announceComposeAction = useCallback((
    action: 'draft saved' | 'email sent' | 'attachment added' | 'attachment removed'
  ) => {
    announceAction(action);
  }, [announceAction]);

  return {
    announceEmailAction,
    announceNavigationAction,
    announceComposeAction,
    announceError,
  };
}

// Mobile gesture support
interface SwipeGesture {
  startX: number;
  startY: number;
  startTime: number;
  element: HTMLElement;
}

export function useSwipeGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 50
) {
  const swipeRef = useRef<HTMLElement>(null);
  const gestureRef = useRef<SwipeGesture | null>(null);

  useEffect(() => {
    const element = swipeRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        element,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const gesture = gestureRef.current;
      if (!gesture) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = Math.abs(touch.clientY - gesture.startY);
      const deltaTime = Date.now() - gesture.startTime;

      // Only trigger if it's a horizontal swipe
      if (deltaTime < 500 && Math.abs(deltaX) > threshold && deltaY < 100) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      gestureRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return swipeRef;
}

// Mobile-responsive bottom navigation
export function BottomNavigation() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY.current;
      
      // Hide on scroll down, show on scroll up
      setIsVisible(!isScrollingDown || currentScrollY < 50);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`
      fixed bottom-0 left-0 right-0 z-40
      bg-white border-t border-gray-200
      transform transition-transform duration-200
      lg:hidden
      ${isVisible ? 'translate-y-0' : 'translate-y-full'}
    `}>
      <div className="flex justify-around items-center h-16">
        <button
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-blue-600"
          aria-label="Inbox"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H1" />
          </svg>
          <span className="text-xs mt-1">Inbox</span>
        </button>

        <button
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-blue-600"
          aria-label="Search"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs mt-1">Search</span>
        </button>

        <button
          className="flex flex-col items-center justify-center flex-1 h-full bg-blue-600 text-white rounded-full mx-2 aspect-square"
          aria-label="Compose"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-blue-600"
          aria-label="Folders"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-xs mt-1">Folders</span>
        </button>

        <button
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-blue-600"
          aria-label="Settings"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs mt-1">Settings</span>
        </button>
      </div>
    </nav>
  );
}

import { useState, useEffect } from 'react';

export interface OnlineStatus {
  isOnline: boolean;
}

/**
 * Simple online status hook
 * Phase 1 Offline-First: Only exposes isOnline for potential future use.
 * No blocking UI or restrictions based on offline status.
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

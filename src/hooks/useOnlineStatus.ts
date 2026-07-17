import { useState, useEffect } from 'react';
import { onlineManager } from '@tanstack/react-query';

export interface OnlineStatus {
  isOnline: boolean;
}

/**
 * Online status backed by React Query's onlineManager - the same source that
 * decides whether mutations run or pause into the offline queue. On native
 * it is fed by the Capacitor Network plugin (see lib/networkStatus.ts), on
 * the web by browser online/offline events. Keeping UI and mutation behavior
 * on one source prevents them from disagreeing.
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => {
    return onlineManager.subscribe(setIsOnline);
  }, []);

  return { isOnline };
}

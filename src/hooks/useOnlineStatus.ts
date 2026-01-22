import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface OnlineStatus {
  isOnline: boolean;
  hasCachedData: boolean;
  shouldShowOfflineScreen: boolean;
  shouldShowOfflineBanner: boolean;
}

/**
 * Cache-aware online status hook
 * Determines offline UI behavior based on network status AND cached data availability
 * 
 * Rules:
 * - If online: normal operation
 * - If offline + cached data exists: show banner, allow read-only
 * - If offline + no cached data: show full offline screen
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  const hasCachedData = useMemo(() => {
    if (!user?.id) return false;

    // Check if any of the primary queries have cached data
    // Using balances as the primary indicator (most critical for app usability)
    const balancesQuery = queryClient.getQueryState(['balances', user.id]);
    const groupsQuery = queryClient.getQueryState(['groups', user.id]);
    const activitiesQuery = queryClient.getQueryState(['activities', user.id]);

    // Data is considered cached if dataUpdatedAt > 0 and data is not null/undefined
    const hasBalances = balancesQuery?.dataUpdatedAt && balancesQuery.dataUpdatedAt > 0 && balancesQuery.data != null;
    const hasGroups = groupsQuery?.dataUpdatedAt && groupsQuery.dataUpdatedAt > 0 && groupsQuery.data != null;
    const hasActivities = activitiesQuery?.dataUpdatedAt && activitiesQuery.dataUpdatedAt > 0 && activitiesQuery.data != null;

    // Consider cached if at least one primary query has data
    return !!(hasBalances || hasGroups || hasActivities);
  }, [queryClient, user?.id, isOnline]); // Re-check when online status changes

  return {
    isOnline,
    hasCachedData,
    // Show full offline screen ONLY when offline AND no cached data exists
    shouldShowOfflineScreen: !isOnline && !hasCachedData,
    // Show subtle banner when offline BUT cached data exists
    shouldShowOfflineBanner: !isOnline && hasCachedData,
  };
}

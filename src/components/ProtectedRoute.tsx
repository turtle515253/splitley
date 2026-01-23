import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useHydration } from '@/contexts/HydrationContext';
import { OfflineScreen } from '@/components/offline';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { shouldShowOfflineScreen } = useOnlineStatus();
  const { isHydrated } = useHydration();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show full offline screen ONLY when:
  // 1. Hydration is complete (we've checked IndexedDB cache)
  // 2. Device is offline
  // 3. No cached data exists
  // Before hydration completes, always render the app shell
  if (isHydrated && shouldShowOfflineScreen) {
    return <OfflineScreen />;
  }

  return <>{children}</>;
}

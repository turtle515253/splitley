import { useState, useEffect } from 'react';
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
  
  // First-render guard: prevents OfflineScreen from blocking before queries mount
  const [hasRenderedOnce, setHasRenderedOnce] = useState(false);
  
  useEffect(() => {
    setHasRenderedOnce(true);
  }, []);

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
  // 1. At least one render has occurred (queries have had a chance to mount)
  // 2. Hydration is complete (we've checked IndexedDB cache)
  // 3. Device is offline
  // 4. No cached data exists
  // This prevents blocking the app before queries can hydrate persisted cache
  if (hasRenderedOnce && isHydrated && shouldShowOfflineScreen) {
    return <OfflineScreen />;
  }

  return <>{children}</>;
}

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that ensures user is authenticated.
 * Phase 1 Offline-First: Never blocks for offline status.
 * App shell always renders - shows cached data or empty states.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Remember where the user was headed (e.g. a group link from an email) so
    // Auth can return them there after login. sessionStorage survives the
    // OAuth redirect round-trip, unlike router state.
    if (location.pathname !== '/') {
      sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
    }
    return <Navigate to="/auth" replace />;
  }

  // Phase 1: Always render children - no offline blocking
  return <>{children}</>;
}

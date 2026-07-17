import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

/**
 * Simple mobile-first layout with natural document scrolling.
 * Headers scroll with content to avoid jitter issues on mobile.
 */
export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  const { isOnline } = useOnlineStatus();

  return (
    <div className="min-h-screen bg-background">
      {!isOnline && <OfflineBanner className="sticky top-0 z-50" />}
      <main className={hideNav ? "" : "pb-24"}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

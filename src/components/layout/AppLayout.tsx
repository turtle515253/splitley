import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

/**
 * Simple mobile-first layout with natural document scrolling.
 * Headers scroll with content to avoid jitter issues on mobile.
 */
export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className={hideNav ? "" : "pb-24"}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

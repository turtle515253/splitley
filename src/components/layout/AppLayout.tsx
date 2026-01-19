import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top safe area spacer for Despia Native */}
      <div className="safe-area-top-spacer bg-background" />
      <main className={hideNav ? "" : "pb-24"}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
      {/* Bottom safe area spacer for Despia Native */}
      <div className="safe-area-bottom-spacer bg-background" />
    </div>
  );
}

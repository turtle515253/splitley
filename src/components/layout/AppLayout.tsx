import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

interface PageHeaderProps {
  children: ReactNode;
}

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-first layout with fixed header and scrollable content.
 * 
 * Usage:
 * <AppLayout>
 *   <AppLayout.Header>
 *     <h1>Title</h1>
 *   </AppLayout.Header>
 *   <AppLayout.Content>
 *     <div>Scrollable content</div>
 *   </AppLayout.Content>
 * </AppLayout>
 */
export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Safe area for notch/status bar */}
      <div className="safe-top bg-background shrink-0" />
      
      {/* Main content area - fills remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
      
      {/* Bottom navigation */}
      {!hideNav && <BottomNav />}
    </div>
  );
}

/**
 * Fixed header that stays at top and never scrolls.
 * Place navigation, titles, and action buttons here.
 */
function PageHeader({ children }: PageHeaderProps) {
  return (
    <header className="shrink-0 bg-background px-5 pt-6 pb-4">
      {children}
    </header>
  );
}

/**
 * Scrollable content area between header and bottom nav.
 * This is the ONLY scrollable container on the page.
 */
function PageContent({ children, className = '' }: PageContentProps) {
  return (
    <div 
      className={`flex-1 overflow-y-auto overscroll-contain ${className}`}
      style={{
        // Ensure smooth scrolling on iOS
        WebkitOverflowScrolling: 'touch',
        // Prevent content from going under bottom nav
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  );
}

// Attach sub-components
AppLayout.Header = PageHeader;
AppLayout.Content = PageContent;

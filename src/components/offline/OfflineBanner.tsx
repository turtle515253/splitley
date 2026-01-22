import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
  className?: string;
}

/**
 * Subtle offline indicator banner
 * Shown at the top of screens when offline but cached data exists
 * Non-blocking - user can still interact with cached content
 */
export function OfflineBanner({ className }: OfflineBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-2 px-4 bg-muted/80 backdrop-blur-sm text-muted-foreground text-sm',
        className
      )}
    >
      <WifiOff className="h-4 w-4" />
      <span>You're offline — viewing cached data</span>
    </div>
  );
}

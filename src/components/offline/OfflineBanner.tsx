import { WifiOff } from 'lucide-react';
import { useMutationState } from '@tanstack/react-query';
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
  // Writes queued while offline (paused mutations waiting for the network)
  const pausedCount = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => mutation.state.isPaused,
  }).filter(Boolean).length;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-2 px-4 bg-muted/80 backdrop-blur-sm text-muted-foreground text-sm',
        className
      )}
    >
      <WifiOff className="h-4 w-4" />
      <span>
        {pausedCount > 0
          ? `You're offline — ${pausedCount} change${pausedCount === 1 ? '' : 's'} will sync when you're back online`
          : "You're offline — viewing cached data"}
      </span>
    </div>
  );
}

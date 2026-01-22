import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface OfflineDisabledButtonProps {
  children: ReactNode;
  /** If true, the button will be disabled when offline */
  disableOffline?: boolean;
}

/**
 * Wrapper component that disables interactive elements when offline
 * Shows a tooltip explaining why the action is disabled
 * 
 * Usage:
 * <OfflineDisabledButton disableOffline>
 *   <Button onClick={...}>Add Expense</Button>
 * </OfflineDisabledButton>
 */
export function OfflineDisabledButton({ 
  children, 
  disableOffline = true 
}: OfflineDisabledButtonProps) {
  const { isOnline } = useOnlineStatus();

  if (isOnline || !disableOffline) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">
          <span className="pointer-events-none opacity-50">
            {children}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>You're offline</p>
      </TooltipContent>
    </Tooltip>
  );
}

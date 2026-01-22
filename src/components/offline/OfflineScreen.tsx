import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

/**
 * Full offline screen
 * Shown ONLY when:
 * - User is offline AND
 * - No cached bootstrap/primary data exists AND
 * - This is first app launch or first login
 */
export function OfflineScreen() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    // Simply reload the page to retry connection
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="flex flex-col items-center text-center max-w-sm space-y-6">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">No internet connection</h1>
          <p className="text-muted-foreground">
            Connect to the internet to get started with Splitley
          </p>
        </div>

        <Button 
          onClick={handleRetry} 
          disabled={isRetrying}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </Button>
      </div>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationsSelectorProps {
  onClose: () => void;
}

export function NotificationsSelector({ onClose }: NotificationsSelectorProps) {
  const { permission, isSupported, requestPermission } = useNotifications();

  const handleToggle = async () => {
    if (permission !== 'granted') {
      await requestPermission();
    }
  };

  if (!isSupported) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Notifications Not Supported</p>
            <p className="text-xs text-muted-foreground">
              Your browser doesn't support push notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Notification Permission */}
      <button
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left",
          permission === 'granted' 
            ? "bg-primary/10 border border-primary/20" 
            : "bg-accent hover:bg-accent/80"
        )}
      >
        <div className="p-2 rounded-lg bg-background">
          {permission === 'granted' ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Push Notifications</p>
          <p className="text-xs text-muted-foreground">
            {permission === 'granted' 
              ? 'You will receive notifications for new expenses and settlements'
              : permission === 'denied'
              ? 'Notifications are blocked. Enable them in device settings.'
              : 'Get notified when expenses are added to your groups'
            }
          </p>
        </div>
        <Switch 
          checked={permission === 'granted'} 
          disabled={permission === 'denied'}
        />
      </button>

      {/* Info */}
      <div className="p-4 rounded-lg bg-muted/50">
        <h4 className="font-medium text-sm mb-2">You'll be notified when:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Someone adds an expense to your groups</li>
          <li>• Someone settles up with you</li>
          <li>• You're added to a new group</li>
        </ul>
      </div>

      <Button variant="outline" className="w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from 'sonner';

const isNative = Capacitor.isNativePlatform();

function mapNativePermission(state: string): NotificationPermission {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'default';
}

/**
 * Notification permission handling.
 * Native: Android notification permission via @capacitor/local-notifications
 * (the web Notification API is always denied inside the WebView).
 * Web: standard Notification API + service worker.
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (isNative) {
      setIsSupported(true);
      LocalNotifications.checkPermissions()
        .then(({ display }) => setPermission(mapNativePermission(display)))
        .catch(() => setIsSupported(false));
      return;
    }

    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Register service worker
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Notifications are not supported on this device');
      return false;
    }

    try {
      let result: NotificationPermission;
      if (isNative) {
        const { display } = await LocalNotifications.requestPermissions();
        result = mapNativePermission(display);
      } else {
        result = await Notification.requestPermission();
      }
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notifications enabled!');
        return true;
      }
      if (result === 'denied') {
        toast.error('Notification permission denied. You can enable it in system settings.');
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    if (isNative) {
      void LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 2147483647),
            title,
            body: typeof options?.body === 'string' ? options.body : '',
          },
        ],
      }).catch((error) => console.error('Failed to show notification:', error));
      return;
    }

    // Try to use service worker for notifications
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }).catch(() => {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    });
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  };
}

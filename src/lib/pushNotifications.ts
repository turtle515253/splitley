import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

let initialized = false;

/** Request permission (if needed) and register this device's FCM token. */
export async function registerForPush(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    let { receive } = await PushNotifications.checkPermissions();
    if (receive === 'prompt') {
      ({ receive } = await PushNotifications.requestPermissions());
    }
    if (receive !== 'granted') return false;
    await PushNotifications.register();
    return true;
  } catch (error) {
    console.warn('Push registration failed:', error);
    return false;
  }
}

/**
 * Attaches push listeners once and registers the device when the in-app
 * preference allows it. Call on login.
 *
 * @param onNotificationTap called with the notification's data payload when
 * the user taps a push notification (used for deep linking).
 */
export async function setupPushNotifications(
  userId: string,
  onNotificationTap: (data: Record<string, string>) => void,
) {
  if (!Capacitor.isNativePlatform()) return;

  if (!initialized) {
    initialized = true;

    await PushNotifications.addListener('registration', async ({ value: token }) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await supabase.from('push_tokens').upsert(
          { user_id: session.user.id, token, platform: 'android', updated_at: new Date().toISOString() },
          { onConflict: 'token' },
        );
      } catch (error) {
        console.error('Failed to save push token:', error);
      }
    });

    await PushNotifications.addListener('registrationError', (error) => {
      // Expected until Firebase is configured (google-services.json)
      console.warn('Push registration error:', error);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = (action.notification.data ?? {}) as Record<string, string>;
      onNotificationTap(data);
    });
  }

  await registerForPush();
}

/** Removes this device's tokens for the current user (logout / notifications off). */
export async function teardownPushNotifications(userId?: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    let id = userId;
    if (!id) {
      const { data: { session } } = await supabase.auth.getSession();
      id = session?.user?.id;
    }
    if (!id) return;
    await supabase.from('push_tokens').delete().eq('user_id', id);
  } catch (error) {
    console.error('Failed to remove push tokens:', error);
  }
}

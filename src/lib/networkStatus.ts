import { onlineManager } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

/**
 * Makes React Query's onlineManager the single source of truth for
 * connectivity.
 *
 * In the Android WebView navigator.onLine is unreliable (often stays true in
 * airplane mode), which made offline mutations run and fail instead of
 * pausing into the sync queue. On native we feed onlineManager from the
 * Capacitor Network plugin, which reads real device connectivity. On the web
 * React Query's default (browser online/offline events) is kept.
 *
 * Call once at startup, before the app renders.
 */
export function setupNetworkStatus() {
  if (!Capacitor.isNativePlatform()) return;

  // Replace the default navigator.onLine-based listener with the plugin
  onlineManager.setEventListener((setOnline) => {
    void Network.getStatus().then((status) => setOnline(status.connected));
    const listenerPromise = Network.addListener('networkStatusChange', (status) => {
      setOnline(status.connected);
    });
    return () => {
      void listenerPromise.then((listener) => listener.remove());
    };
  });
}

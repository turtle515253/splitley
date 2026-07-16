import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { parseDeepLinkPath } from '@/lib/deepLink';

/**
 * Routes external URLs (email links, App Links) into the app.
 * Handles both warm opens (appUrlOpen) and cold starts (getLaunchUrl).
 * If the user isn't logged in, ProtectedRoute stores the target and
 * Auth returns them there after login.
 */
export default function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: PluginListenerHandle | undefined;
    let active = true;

    void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      const path = parseDeepLinkPath(url);
      if (path) navigate(path);
    }).then((handle) => {
      if (active) listener = handle;
      else void handle.remove();
    });

    // Cold start: the app was launched by tapping a link
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (!active || !launch?.url) return;
      const path = parseDeepLinkPath(launch.url);
      if (path) navigate(path);
    });

    return () => {
      active = false;
      void listener?.remove();
    };
  }, [navigate]);

  return null;
}

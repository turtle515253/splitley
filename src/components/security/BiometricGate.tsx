import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAppLockEnabled, getAppLockTimeout } from '@/lib/appLock';
import splitleyLogo from '@/assets/Splitley_Logo.png';

/**
 * Fullscreen lock overlay. When app lock is enabled it covers the app on
 * cold start and whenever the app returns from the background after the
 * configured timeout, until the user passes device biometrics/passcode.
 */
export default function BiometricGate() {
  const [locked, setLocked] = useState(
    () => Capacitor.isNativePlatform() && isAppLockEnabled()
  );
  const [verifying, setVerifying] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  // The biometric prompt backgrounds the app itself; while it's up (and just
  // after), app state changes must not re-trigger the lock or we loop forever
  const verifyingRef = useRef(false);

  const attemptUnlock = useCallback(async () => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Unlock Splitley',
        title: 'Unlock Splitley',
        useFallback: true,
      });
      hiddenAt.current = null;
      setLocked(false);
    } catch {
      // Stay locked; user can retry with the button
    } finally {
      setVerifying(false);
      // Keep ignoring app state changes briefly - the resume event from the
      // prompt closing can arrive after the promise settles
      setTimeout(() => {
        verifyingRef.current = false;
      }, 1000);
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: PluginListenerHandle | undefined;
    let active = true;

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isAppLockEnabled() || verifyingRef.current) return;
      if (!isActive) {
        hiddenAt.current = Date.now();
        return;
      }
      const elapsed = hiddenAt.current === null ? Infinity : (Date.now() - hiddenAt.current) / 1000;
      if (elapsed > getAppLockTimeout()) {
        setLocked(true);
      }
    }).then((handle) => {
      if (active) listener = handle;
      else void handle.remove();
    });

    return () => {
      active = false;
      void listener?.remove();
    };
  }, []);

  // Prompt as soon as the lock screen appears
  useEffect(() => {
    if (locked) void attemptUnlock();
  }, [locked, attemptUnlock]);

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-6 px-8">
      <img src={splitleyLogo} alt="Splitley" className="w-20 h-20" />
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold">Splitley is locked</h1>
        <p className="text-muted-foreground text-sm">
          Use your fingerprint, face, or device passcode to continue
        </p>
      </div>
      <Button onClick={attemptUnlock} disabled={verifying} className="min-w-40">
        <Fingerprint className="h-5 w-5 mr-2" />
        {verifying ? 'Verifying…' : 'Unlock'}
      </Button>
    </div>
  );
}

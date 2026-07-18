import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  isAppLockEnabled,
  setAppLockEnabled,
  getAppLockTimeout,
  setAppLockTimeout,
  lockTimeoutOptions,
} from '@/lib/appLock';

interface SecuritySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecuritySheet({ open, onOpenChange }: SecuritySheetProps) {
  const [enabled, setEnabled] = useState(isAppLockEnabled);
  const [timeout, setTimeoutValue] = useState(getAppLockTimeout);
  const [busy, setBusy] = useState(false);

  const handleToggle = async (next: boolean) => {
    if (!next) {
      setAppLockEnabled(false);
      setEnabled(false);
      toast.success('App lock turned off');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      toast.error('Biometric lock is only available in the mobile app');
      return;
    }

    setBusy(true);
    try {
      const { isAvailable } = await NativeBiometric.isAvailable({ useFallback: true });
      if (!isAvailable) {
        toast.error('No biometrics or device passcode set up on this device');
        return;
      }
      // Confirm identity once before turning the lock on
      await NativeBiometric.verifyIdentity({
        reason: 'Confirm it’s you to turn on app lock',
        title: 'Turn on app lock',
        useFallback: true,
      });
      setAppLockEnabled(true);
      setEnabled(true);
      toast.success('App lock turned on');
    } catch {
      toast.error('Biometric verification was cancelled');
    } finally {
      setBusy(false);
    }
  };

  const handleTimeoutChange = (value: string) => {
    const seconds = Number(value);
    setAppLockTimeout(seconds);
    setTimeoutValue(seconds);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Security</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="appLockToggle" className="text-base font-medium">
                Authenticate with biometrics
              </Label>
              <Switch
                id="appLockToggle"
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={busy}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Require device passcode or biometrics to open Splitley.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <Label className="text-base font-medium">Timeout</Label>
              <Select value={String(timeout)} onValueChange={handleTimeoutChange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lockTimeoutOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Authentication will not be required if the app is reopened before the timeout
              expires.
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

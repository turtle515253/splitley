import { useState, useEffect, useCallback } from 'react';
import { DeviceState, loadDeviceState, saveDeviceState, clearDeviceState } from '@/lib/storage';

/**
 * Non-blocking hook for device storage access
 * Returns immediately with null state, updates asynchronously when storage loads
 */
export function useDeviceStorage() {
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load device state on mount (non-blocking, fire-and-forget)
  useEffect(() => {
    loadDeviceState().then((state) => {
      setDeviceState(state);
      setIsLoaded(true);
    });
  }, []);

  // Update device state and persist
  const updateDeviceState = useCallback(async (updates: Partial<DeviceState>) => {
    await saveDeviceState(updates);
    // Reload to get merged state
    const newState = await loadDeviceState();
    setDeviceState(newState);
  }, []);

  // Clear device state
  const clearDevice = useCallback(async () => {
    await clearDeviceState();
    setDeviceState(null);
  }, []);

  return {
    deviceState,
    isLoaded,
    updateDeviceState,
    clearDevice,
  };
}

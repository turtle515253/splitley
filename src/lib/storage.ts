import despia from 'despia-native';

/**
 * Check if running in Despia native runtime AND the SDK is available
 * Both conditions must be true to safely use Despia storage
 */
export const isDespiaNative = (): boolean => {
  return typeof navigator !== 'undefined' && 
         navigator.userAgent.toLowerCase().includes('despia') &&
         typeof despia === 'function';
};

/**
 * Device state interface - only for device-level continuity data
 * NOT for API data (expenses, groups, balances) - those use React Query + IndexedDB
 */
export interface DeviceState {
  auth?: {
    user_id: string;
    refresh_token: string;
    provider: 'email' | 'google';
  } | null;
  preferences?: {
    currency: string;
    theme: 'light' | 'dark' | 'system';
    accent_color: string;
    notifications_enabled: boolean;
  };
}

const STORAGE_KEY = 'splitley-device-state';

/**
 * Load device state from storage (non-blocking)
 * Returns null if storage is empty or unavailable
 */
export async function loadDeviceState(): Promise<DeviceState | null> {
  try {
    if (isDespiaNative()) {
      const response = await despia("readvalue://", ["storedValues"]);
      if (response?.storedValues) {
        return JSON.parse(decodeURIComponent(response.storedValues)) as DeviceState;
      }
      return null;
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as DeviceState;
      }
      return null;
    }
  } catch (error) {
    console.error('Error loading device state:', error);
    return null;
  }
}

/**
 * Save device state to storage (merges with existing state)
 */
export async function saveDeviceState(partialState: Partial<DeviceState>): Promise<void> {
  try {
    const existing = await loadDeviceState();
    const merged: DeviceState = {
      ...existing,
      ...partialState,
      // Deep merge preferences if both exist
      preferences: partialState.preferences !== undefined
        ? { ...existing?.preferences, ...partialState.preferences }
        : existing?.preferences,
      // Handle auth explicitly to allow null clearing
      auth: partialState.auth !== undefined
        ? partialState.auth
        : existing?.auth,
    };

    if (isDespiaNative()) {
      const encoded = encodeURIComponent(JSON.stringify(merged));
      await despia(`writevalue://${encoded}`);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  } catch (error) {
    console.error('Error saving device state:', error);
  }
}

/**
 * Clear all device state
 */
export async function clearDeviceState(): Promise<void> {
  try {
    if (isDespiaNative()) {
      await despia('writevalue://');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error clearing device state:', error);
  }
}

// Legacy exports for backward compatibility (if needed elsewhere)
export interface StorageData {
  [key: string]: unknown;
}

export async function writeStorage<T extends StorageData>(data: T): Promise<void> {
  if (isDespiaNative()) {
    const encoded = encodeURIComponent(JSON.stringify(data));
    await despia(`writevalue://${encoded}`);
  } else {
    localStorage.setItem('splitley-storage', JSON.stringify(data));
  }
}

export async function readStorage<T extends StorageData>(): Promise<T | null> {
  try {
    if (isDespiaNative()) {
      const response = await despia("readvalue://", ["storedValues"]);
      if (response?.storedValues) {
        return JSON.parse(decodeURIComponent(response.storedValues)) as T;
      }
      return null;
    } else {
      const stored = localStorage.getItem('splitley-storage');
      if (stored) {
        return JSON.parse(stored) as T;
      }
      return null;
    }
  } catch (error) {
    console.error('Error reading storage:', error);
    return null;
  }
}

export async function updateStorage<T extends StorageData>(updates: Partial<T>): Promise<void> {
  const existing = await readStorage<T>();
  const merged = { ...existing, ...updates } as T;
  await writeStorage(merged);
}

export async function removeFromStorage(keys: string[]): Promise<void> {
  const existing = await readStorage<StorageData>();
  if (existing) {
    keys.forEach(key => delete existing[key]);
    await writeStorage(existing);
  }
}

export async function clearStorage(): Promise<void> {
  if (isDespiaNative()) {
    await despia('writevalue://');
  } else {
    localStorage.removeItem('splitley-storage');
  }
}

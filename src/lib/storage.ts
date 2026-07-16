/**
 * Device-level continuity data. API data such as expenses, groups, and
 * balances is persisted separately through React Query and IndexedDB.
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
const LEGACY_STORAGE_KEY = 'splitley-storage';

export async function loadDeviceState(): Promise<DeviceState | null> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as DeviceState : null;
  } catch (error) {
    console.error('Error loading device state:', error);
    return null;
  }
}

export async function saveDeviceState(partialState: Partial<DeviceState>): Promise<void> {
  try {
    const existing = await loadDeviceState();
    const merged: DeviceState = {
      ...existing,
      ...partialState,
      preferences: partialState.preferences !== undefined
        ? { ...existing?.preferences, ...partialState.preferences }
        : existing?.preferences,
      auth: partialState.auth !== undefined
        ? partialState.auth
        : existing?.auth,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Error saving device state:', error);
  }
}

export async function clearDeviceState(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing device state:', error);
  }
}

export interface StorageData {
  [key: string]: unknown;
}

export async function writeStorage<T extends StorageData>(data: T): Promise<void> {
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(data));
}

export async function readStorage<T extends StorageData>(): Promise<T | null> {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    return stored ? JSON.parse(stored) as T : null;
  } catch (error) {
    console.error('Error reading storage:', error);
    return null;
  }
}

export async function updateStorage<T extends StorageData>(updates: Partial<T>): Promise<void> {
  const existing = await readStorage<T>();
  await writeStorage({ ...existing, ...updates } as T);
}

export async function removeFromStorage(keys: string[]): Promise<void> {
  const existing = await readStorage<StorageData>();
  if (!existing) return;

  keys.forEach((key) => delete existing[key]);
  await writeStorage(existing);
}

export async function clearStorage(): Promise<void> {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

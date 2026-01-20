import despia from 'despia-native';

/**
 * Check if running in Despia native runtime
 */
const isDespiaNative = (): boolean => {
  return typeof navigator !== 'undefined' && 
         navigator.userAgent.toLowerCase().includes('despia');
};

/**
 * Storage interface for type safety
 */
export interface StorageData {
  [key: string]: unknown;
}

/**
 * Write data to storage (Despia native or localStorage fallback)
 */
export async function writeStorage<T extends StorageData>(data: T): Promise<void> {
  if (isDespiaNative()) {
    const encoded = encodeURIComponent(JSON.stringify(data));
    await despia(`writevalue://${encoded}`);
  } else {
    localStorage.setItem('splitley-storage', JSON.stringify(data));
  }
}

/**
 * Read data from storage (Despia native or localStorage fallback)
 */
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

/**
 * Update specific keys in storage while preserving others
 */
export async function updateStorage<T extends StorageData>(updates: Partial<T>): Promise<void> {
  const existing = await readStorage<T>();
  const merged = { ...existing, ...updates } as T;
  await writeStorage(merged);
}

/**
 * Remove specific keys from storage
 */
export async function removeFromStorage(keys: string[]): Promise<void> {
  const existing = await readStorage<StorageData>();
  if (existing) {
    keys.forEach(key => delete existing[key]);
    await writeStorage(existing);
  }
}

/**
 * Clear all storage
 */
export async function clearStorage(): Promise<void> {
  if (isDespiaNative()) {
    await despia('writevalue://');
  } else {
    localStorage.removeItem('splitley-storage');
  }
}

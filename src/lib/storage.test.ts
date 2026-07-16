import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDeviceState,
  clearStorage,
  loadDeviceState,
  readStorage,
  removeFromStorage,
  saveDeviceState,
  updateStorage,
  writeStorage,
} from './storage';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));

describe('device state storage', () => {
  it('merges preferences without dropping existing values', async () => {
    await saveDeviceState({
      preferences: {
        currency: 'INR',
        theme: 'light',
        accent_color: 'blue',
        notifications_enabled: true,
      },
    });
    await saveDeviceState({ preferences: { theme: 'dark' } as never });

    expect((await loadDeviceState())?.preferences).toEqual({
      currency: 'INR',
      theme: 'dark',
      accent_color: 'blue',
      notifications_enabled: true,
    });
  });

  it('clears device state', async () => {
    await saveDeviceState({
      auth: { user_id: 'user-1', refresh_token: 'token', provider: 'email' },
    });
    await clearDeviceState();

    expect(await loadDeviceState()).toBeNull();
  });
});

describe('legacy storage API', () => {
  it('updates and removes selected fields', async () => {
    await writeStorage({ first: 1, second: 2 });
    await updateStorage<{ first: number; second: number; third?: number }>({ third: 3 });
    await removeFromStorage(['second']);

    expect(await readStorage()).toEqual({ first: 1, third: 3 });
  });

  it('clears legacy storage', async () => {
    await writeStorage({ value: true });
    await clearStorage();

    expect(await readStorage()).toBeNull();
  });
});

/**
 * Biometric app-lock settings, stored locally on the device.
 */

const ENABLED_KEY = 'splitley-app-lock-enabled';
const TIMEOUT_KEY = 'splitley-app-lock-timeout';

export const lockTimeoutOptions = [
  { value: 0, label: 'Immediately' },
  { value: 5, label: '5 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
] as const;

export function isAppLockEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

export function setAppLockEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

/** Seconds the app can stay in the background before it locks again. */
export function getAppLockTimeout(): number {
  const stored = Number(localStorage.getItem(TIMEOUT_KEY));
  return Number.isFinite(stored) && stored >= 0 ? stored : 5;
}

export function setAppLockTimeout(seconds: number) {
  localStorage.setItem(TIMEOUT_KEY, String(seconds));
}

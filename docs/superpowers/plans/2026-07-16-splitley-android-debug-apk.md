# Splitley Android Debug APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Lovable and Despia integration, preserve Google sign-in through official Capacitor APIs, and produce a locally bundled Splitley debug APK.

**Architecture:** Vite builds the React app into `dist`, and Capacitor embeds it in an Android WebView. Browser storage replaces the Despia storage bridge, while Capacitor Browser and App handle Google OAuth through `splitley://auth/callback`.

**Tech Stack:** React 19, TypeScript, Vite 5, Vitest 2, Supabase, Capacitor 8, Android Gradle toolchain

## Global Constraints

- Build a debug APK only; do not add release signing or Play Store configuration.
- Use Android application ID `com.splitley.app` and application label `Splitley`.
- Bundle web assets from `dist`; do not configure a hosted `server.url`.
- Remove `@despia/local`, `despia-native`, and `lovable-tagger`.
- Remove all product-code Lovable and Despia imports, URLs, plugins, runtime checks, metadata, and documentation.
- Preserve Google authentication through `@capacitor/browser`, `@capacitor/app`, and `splitley://auth/callback`.
- Preserve existing storage keys and exported storage function signatures.
- Keep Supabase as the backend.

## File Map

- `package.json`, `package-lock.json`: dependency and repeatable build/test scripts.
- `vite.config.ts`, `src/vite-env.d.ts`: Vite configuration without third-party builder plugins.
- `capacitor.config.ts`: local bundle, app label, and application ID.
- `src/lib/storage.ts`, `src/lib/storage.test.ts`: browser storage implementation and behavior tests.
- `src/lib/oauth.ts`, `src/lib/oauth.test.ts`: native callback parser and tests.
- `src/components/auth/GoogleLoginButton.tsx`: web and Capacitor Google OAuth flows.
- `src/App.tsx`, `src/pages/NativeCallback.tsx`: removal of the obsolete hosted callback route.
- `supabase/functions/auth-start/`, `supabase/config.toml`: removal of the Despia callback function.
- `supabase/functions/delete-account/index.ts`: CORS origins without Lovable domains.
- `index.html`, `README.md`: project-owned metadata and documentation.
- `android/`: generated Capacitor Android project and deep-link intent filter.

---

### Task 1: Remove Builder Dependencies and Configure Splitley

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `capacitor.config.ts`
- Modify: `index.html`

**Interfaces:**
- Consumes: existing Vite `build` command and Capacitor 8 packages.
- Produces: clean Vite configuration, Splitley identity, Vitest command, and repeatable Android build commands.

- [ ] **Step 1: Prove builder dependencies and the remote runtime are present**

Run:

```bash
npm ls @despia/local despia-native lovable-tagger
rg -n "lovable|despia|server:" vite.config.ts capacitor.config.ts src/vite-env.d.ts index.html -i
```

Expected: all three npm packages and their configuration references are reported.

- [ ] **Step 2: Replace dependencies with official Capacitor plugins and add tests**

Run:

```bash
npm uninstall @despia/local despia-native lovable-tagger
npm install @capacitor/app@^8.0.0 @capacitor/browser@^8.0.0
npm install --save-dev vitest@^2.1.9
```

Add these scripts to `package.json`:

```json
"test": "vitest run",
"android:sync": "npm run build && cap sync android",
"android:apk": "npm run android:sync && cd android && ./gradlew assembleDebug"
```

- [ ] **Step 3: Simplify Vite and Capacitor configuration**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Replace `src/vite-env.d.ts` with:

```ts
/// <reference types="vite/client" />
```

Replace `capacitor.config.ts` with:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.splitley.app',
  appName: 'Splitley',
  webDir: 'dist',
};

export default config;
```

Remove the two external image meta tags from `index.html`:

```html
<meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
<meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
```

- [ ] **Step 4: Verify configuration and build**

Run:

```bash
npm ls @despia/local despia-native lovable-tagger
rg -n "lovable|despia" vite.config.ts capacitor.config.ts src/vite-env.d.ts index.html -i
npm run build
```

Expected: `npm ls` reports an empty dependency result, `rg` returns no matches, and Vite completes successfully.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/vite-env.d.ts capacitor.config.ts index.html
git commit -m "build: remove Lovable and Despia tooling"
```

### Task 2: Replace Despia Storage with Browser Storage

**Files:**
- Create: `src/lib/storage.test.ts`
- Modify: `src/lib/storage.ts`

**Interfaces:**
- Consumes: the global `localStorage` API.
- Produces: unchanged `DeviceState`, `loadDeviceState`, `saveDeviceState`, `clearDeviceState`, `writeStorage`, `readStorage`, `updateStorage`, `removeFromStorage`, and `clearStorage` exports.

- [ ] **Step 1: Add storage characterization tests**

Create `src/lib/storage.test.ts` with an in-memory `Storage` implementation and these cases:

```ts
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
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));

describe('device state storage', () => {
  it('merges preferences without dropping existing values', async () => {
    await saveDeviceState({ preferences: { currency: 'INR', theme: 'light', accent_color: 'blue', notifications_enabled: true } });
    await saveDeviceState({ preferences: { theme: 'dark' } as never });
    expect((await loadDeviceState())?.preferences).toEqual({ currency: 'INR', theme: 'dark', accent_color: 'blue', notifications_enabled: true });
  });

  it('clears device state', async () => {
    await saveDeviceState({ auth: { user_id: 'user-1', refresh_token: 'token', provider: 'email' } });
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
```

- [ ] **Step 2: Run characterization tests**

Run: `npm test -- src/lib/storage.test.ts`

Expected: tests pass through the existing web fallback, proving behavior to preserve.

- [ ] **Step 3: Remove Despia branches**

Delete the `despia-native` import and `isDespiaNative` export. In each exported operation, retain only the existing `localStorage` branch. For example, the final device-state operations must be:

```ts
export async function loadDeviceState(): Promise<DeviceState | null> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as DeviceState : null;
  } catch (error) {
    console.error('Error loading device state:', error);
    return null;
  }
}

export async function clearDeviceState(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing device state:', error);
  }
}
```

Keep the existing merge logic in `saveDeviceState`, writing the merged value with:

```ts
localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
```

Make the legacy operations read, write, and clear only `splitley-storage` through `localStorage`.

- [ ] **Step 4: Verify tests and source removal**

Run:

```bash
npm test -- src/lib/storage.test.ts
rg -n "despia|isDespiaNative" src/lib/storage.ts src/lib/storage.test.ts -i
```

Expected: all storage tests pass and `rg` returns no matches.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "refactor: use browser storage for device state"
```

### Task 3: Replace Despia OAuth with Capacitor OAuth

**Files:**
- Create: `src/lib/oauth.ts`
- Create: `src/lib/oauth.test.ts`
- Modify: `src/components/auth/GoogleLoginButton.tsx`
- Modify: `src/pages/Auth.tsx`
- Modify: `src/App.tsx`
- Delete: `src/pages/NativeCallback.tsx`

**Interfaces:**
- Consumes: Supabase `signInWithOAuth`/`setSession`, Capacitor `App`, `Browser`, and `Capacitor.isNativePlatform()`.
- Produces: `NATIVE_OAUTH_REDIRECT_URL` and `parseOAuthCallback(url): OAuthCallbackResult`.

- [ ] **Step 1: Write failing callback parser tests**

Create `src/lib/oauth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NATIVE_OAUTH_REDIRECT_URL, parseOAuthCallback } from './oauth';

describe('parseOAuthCallback', () => {
  it('accepts tokens returned in the URL hash', () => {
    expect(parseOAuthCallback('splitley://auth/callback#access_token=access&refresh_token=refresh')).toEqual({
      ok: true,
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('returns provider errors', () => {
    expect(parseOAuthCallback('splitley://auth/callback?error=access_denied&error_description=Cancelled')).toEqual({
      ok: false,
      message: 'Cancelled',
    });
  });

  it('rejects unrelated deep links', () => {
    expect(parseOAuthCallback('splitley://groups/123')).toBeNull();
  });

  it('uses the permanent native redirect URL', () => {
    expect(NATIVE_OAUTH_REDIRECT_URL).toBe('splitley://auth/callback');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/oauth.test.ts`

Expected: FAIL because `src/lib/oauth.ts` does not exist.

- [ ] **Step 3: Implement the callback parser**

Create `src/lib/oauth.ts`:

```ts
export const NATIVE_OAUTH_REDIRECT_URL = 'splitley://auth/callback';

export type OAuthCallbackResult =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; message: string };

export function parseOAuthCallback(url: string): OAuthCallbackResult | null {
  const parsed = new URL(url);
  if (`${parsed.protocol}//${parsed.host}${parsed.pathname}` !== NATIVE_OAUTH_REDIRECT_URL) {
    return null;
  }

  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const value = (key: string) => hash.get(key) ?? parsed.searchParams.get(key);
  const error = value('error');

  if (error) {
    return { ok: false, message: value('error_description') ?? error };
  }

  const accessToken = value('access_token');
  if (!accessToken) {
    return { ok: false, message: 'Google sign-in returned no access token.' };
  }

  return {
    ok: true,
    accessToken,
    refreshToken: value('refresh_token') ?? '',
  };
}
```

- [ ] **Step 4: Verify the parser passes**

Run: `npm test -- src/lib/oauth.test.ts`

Expected: four passing tests.

- [ ] **Step 5: Implement native and web Google sign-in**

Update `GoogleLoginButton.tsx` to remove the Despia import, `deeplinkScheme` prop, user-agent check, and `auth-start` invocation. Use `Capacitor.isNativePlatform()` to choose the flow. The OAuth request must be:

```ts
const isNative = Capacitor.isNativePlatform();
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: isNative ? NATIVE_OAUTH_REDIRECT_URL : `${window.location.origin}/auth`,
    scopes: 'openid email profile',
    skipBrowserRedirect: isNative,
  },
});

if (error) throw error;
if (isNative) {
  if (!data.url) throw new Error('Google sign-in URL was not returned.');
  await Browser.open({ url: data.url });
}
```

Register an `App.addListener('appUrlOpen', ...)` effect while the button is mounted. Pass `event.url` to `parseOAuthCallback`; ignore `null`, close `Browser`, show errors through `toast.error`, and for a successful result call:

```ts
const { error } = await supabase.auth.setSession({
  access_token: result.accessToken,
  refresh_token: result.refreshToken,
});
if (error) throw error;
toast.success('Welcome!');
navigate('/', { replace: true });
```

Remove the old native-specific comment in `src/pages/Auth.tsx`. Remove the `NativeCallback` import and `/native-callback` route from `src/App.tsx`, then delete `src/pages/NativeCallback.tsx`.

- [ ] **Step 6: Verify authentication code**

Run:

```bash
npm test -- src/lib/oauth.test.ts
npm run build
rg -n "despia|auth-start|native-callback|NativeCallback" src -i
```

Expected: tests and Vite build pass, and `rg` returns no matches.

- [ ] **Step 7: Commit**

```bash
git add src/lib/oauth.ts src/lib/oauth.test.ts src/components/auth/GoogleLoginButton.tsx src/pages/Auth.tsx src/App.tsx src/pages/NativeCallback.tsx
git commit -m "feat: add Capacitor Google authentication"
```

### Task 4: Remove Hosted Service References

**Files:**
- Delete: `supabase/functions/auth-start/index.ts`
- Modify: `supabase/config.toml`
- Modify: `supabase/functions/delete-account/index.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: Capacitor's Android WebView origin `http://localhost` and local Vite origins.
- Produces: project-owned documentation and a CORS allowlist without hosted builder domains.

- [ ] **Step 1: Remove the obsolete auth function**

Delete `supabase/functions/auth-start/index.ts` and remove this block from `supabase/config.toml`:

```toml
[functions.auth-start]
verify_jwt = false
```

- [ ] **Step 2: Replace the account-deletion origin rules**

Set the allowlist in `supabase/functions/delete-account/index.ts` to:

```ts
const allowedOrigins = [
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:8080',
];
```

Set the allow decision to:

```ts
const isAllowed = allowedOrigins.includes(origin);
```

- [ ] **Step 3: Replace the README with project-owned setup instructions**

Document the Splitley stack, `npm ci`, `npm run dev`, `npm test`, and `npm run build`. Add an Android section containing:

```markdown
## Android debug APK

Prerequisites: Node.js, a JDK compatible with Capacitor 8, and the Android SDK. Add `splitley://auth/callback` to the Supabase authentication redirect allowlist before testing Google sign-in.

```sh
npm ci
npx cap add android # Run once if android/ is absent.
npm run android:apk
```

The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.
```

- [ ] **Step 4: Verify hosted references are gone**

Run:

```bash
rg -n "lovable|despia" README.md index.html capacitor.config.ts vite.config.ts src supabase -i
npm test
npm run build
```

Expected: `rg` returns no matches, all tests pass, and Vite builds successfully.

- [ ] **Step 5: Commit**

```bash
git add README.md supabase/config.toml supabase/functions/auth-start/index.ts supabase/functions/delete-account/index.ts
git commit -m "chore: remove hosted builder integration"
```

### Task 5: Generate and Configure Android

**Files:**
- Create: `android/`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: `com.splitley.app`, `Splitley`, `dist`, and the official Capacitor plugins.
- Produces: a Gradle Android project that handles `splitley://auth/callback`.

- [ ] **Step 1: Check native build prerequisites**

Run:

```bash
java -version
printf 'ANDROID_HOME=%s\n' "$ANDROID_HOME"
test -d "$ANDROID_HOME"
```

Expected: a compatible JDK is reported and the Android SDK directory exists. If `ANDROID_HOME` is empty, locate the installed SDK and export its absolute path before continuing.

- [ ] **Step 2: Generate Android and synchronize plugins**

Run:

```bash
npm run build
npx cap add android
npx cap sync android
```

Expected: Capacitor adds Android, copies `dist`, and reports both App and Browser plugins.

- [ ] **Step 3: Add the OAuth deep-link intent filter**

Add this sibling of the launcher intent filter inside `MainActivity` in `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="splitley"
        android:host="auth"
        android:pathPrefix="/callback" />
</intent-filter>
```

- [ ] **Step 4: Verify native identity, assets, plugins, and deep link**

Run:

```bash
test -x android/gradlew
test -f android/app/src/main/assets/public/index.html
rg -n "com\.splitley\.app" android/app
rg -n "Splitley" android/app/src/main/res/values/strings.xml
rg -n "android:scheme=\"splitley\"|android:host=\"auth\"|android:pathPrefix=\"/callback\"" android/app/src/main/AndroidManifest.xml
rg -n '"server"|lovable|despia' android/app/src/main/assets/capacitor.config.json -i
```

Expected: the wrapper and assets exist; identity and all deep-link fields match; the packaged Capacitor config has no remote server or removed integration references.

- [ ] **Step 5: Commit**

```bash
git add android
git commit -m "build: add Splitley Android project"
```

### Task 6: Build and Verify the Debug APK

**Files:**
- Generate: `android/app/build/outputs/apk/debug/app-debug.apk`

**Interfaces:**
- Consumes: `npm run android:apk` and the Android SDK/Gradle toolchain.
- Produces: the verified debug APK deliverable.

- [ ] **Step 1: Run all project verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: tests and Vite build pass, `git diff --check` prints nothing, and lint has no new violations. Record unrelated pre-existing lint violations separately if present.

- [ ] **Step 2: Assemble the APK**

Run:

```bash
npm run android:apk
```

Expected: Capacitor sync succeeds and Gradle ends with `BUILD SUCCESSFUL`.

- [ ] **Step 3: Validate the APK archive and manifest identity**

Run:

```bash
test -s android/app/build/outputs/apk/debug/app-debug.apk
unzip -t android/app/build/outputs/apk/debug/app-debug.apk
apkanalyzer manifest application-id android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: the archive has no errors and `apkanalyzer` prints `com.splitley.app`. If `apkanalyzer` is not on `PATH`, use the executable under the installed Android SDK `cmdline-tools` directory.

- [ ] **Step 4: Smoke-test on a device when available**

Run: `adb devices`

If a device is listed in the `device` state, run:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.splitley.app -c android.intent.category.LAUNCHER 1
```

Expected: installation reports `Success` and the launch event completes. If no device is connected, record the device smoke test as skipped.

- [ ] **Step 5: Record deliverable details and repository state**

Run:

```bash
shasum -a 256 android/app/build/outputs/apk/debug/app-debug.apk
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
git status --short --branch
git log -8 --oneline
```

Expected: a SHA-256 checksum, non-zero size, the expected local commits, and no uncommitted source/configuration changes.

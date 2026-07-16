# Splitley

Splitley is a React application for splitting expenses with friends and groups. It uses Vite, TypeScript, Tailwind CSS, shadcn/ui, Supabase, and Capacitor.

## Local development

Install dependencies and start the development server:

```sh
npm ci --legacy-peer-deps
npm run dev
```

The development server runs on port 8080 by default.

## Checks

```sh
npm test
npm run lint
npm run build
```

## Android debug APK

Prerequisites:

- Node.js
- A JDK compatible with Capacitor 8
- The Android SDK

Add `splitley://auth/callback` to the Supabase authentication redirect allowlist before testing Google sign-in.

Generate the Android project once, then build the debug APK:

```sh
npm ci --legacy-peer-deps
npx cap add android # Run only when android/ is absent.
npm run android:apk
```

The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

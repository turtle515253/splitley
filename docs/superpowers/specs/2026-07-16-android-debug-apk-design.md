# Splitley Android Debug APK Design

## Goal

Produce an installable Android debug APK for Splitley from the current repository. The APK will bundle the Vite production build, use the Android application ID `com.splitley.app`, and contain no Lovable or Despia product integration.

## Scope

The work includes removing Lovable and Despia dependencies and integrations, replacing Despia-specific storage and Google authentication behavior, generating the Capacitor Android project, synchronizing local web assets, building the debug variant, and verifying the generated APK.

Release signing, Play Store publishing, and a native UI rewrite are outside this task. Supabase remains the application's backend.

## Dependency and Branding Removal

The npm packages `@despia/local`, `despia-native`, and `lovable-tagger` will be removed. Their Vite plugins, custom type declaration, runtime user-agent checks, comments, and native storage bridge will also be removed.

Lovable-hosted URLs will be removed from Capacitor configuration, page metadata, Supabase functions, CORS configuration, and project documentation. The displayed application name will be `Splitley`, and the Capacitor/Android application ID will be `com.splitley.app`.

## Architecture

The existing React and TypeScript application remains the source of the interface and business logic. Vite compiles it into static assets under `dist`. Capacitor embeds those assets in an Android WebView through a generated native Android project under `android/`.

The checked-in `capacitor.config.ts` will use `appName: 'Splitley'`, `appId: 'com.splitley.app'`, and `webDir: 'dist'`. It will contain no remote `server.url`, so Capacitor serves the packaged Vite assets.

## Storage

The device-state storage module will use the browser `localStorage` implementation for both the web app and the Capacitor WebView. Its existing public interfaces and storage keys will remain stable so consumers do not need to change and existing browser data remains readable. Despia detection and protocol calls will be deleted.

## Google Authentication

Google sign-in will use the official `@capacitor/browser` and `@capacitor/app` plugins in the Android app. Supabase will create the provider authorization URL without automatically navigating the WebView. Capacitor Browser will open that URL in the Android system browser.

After authentication, Supabase will redirect to `splitley://auth/callback`. An Android intent filter will route that deep link back to Splitley. The application will listen for Capacitor's `appUrlOpen` event, close the system browser, extract the returned access and refresh tokens or OAuth error, and update the Supabase session. The existing standard browser redirect flow will remain available when the app is not running under Capacitor.

The obsolete Despia `auth-start` edge function, hosted `NativeCallback` page, and `/native-callback` route will be removed. Supabase must include `splitley://auth/callback` in its authentication redirect allowlist for Google sign-in to complete on Android.

## Supabase Origins

Lovable domains will be removed from the account-deletion function's CORS allowlist. The allowlist will retain local development origins and add Capacitor's Android origin, `http://localhost`. Any future deployed web domain must be added explicitly when that deployment exists.

## Build Flow

1. Install the locked npm dependencies and verify the web application builds after dependency removal.
2. Generate the Capacitor Android platform if `android/` is absent.
3. Add the `splitley://auth/callback` intent filter to the Android activity.
4. Synchronize Capacitor configuration, official plugins, and local `dist` assets into Android.
5. Run the Android Gradle `assembleDebug` task.
6. Report the verified APK path, size, and SHA-256 checksum.

## Error Handling

Storage operations will preserve the existing safe fallback behavior: failures are logged and return `null` or complete without crashing the application. Google authentication failures from URL generation, the system browser, the deep-link callback, or Supabase session creation will clear loading state and present an actionable error to the user.

The build will stop on dependency installation, Vite compilation, Capacitor synchronization, or Gradle failures. Environment prerequisites such as a compatible JDK and Android SDK will be checked, and missing prerequisites will be reported precisely.

## Verification

Verification will include:

- The removed npm packages are absent from both package manifests and installed dependencies.
- Product code and configuration contain no Lovable or Despia imports, plugins, runtime checks, URLs, or metadata.
- Storage tests confirm the existing keys and merge/clear behavior still work through `localStorage`.
- Authentication tests cover native URL creation, deep-link token/error parsing, and the standard web fallback.
- The Vite production build and lint checks complete without new failures.
- Capacitor synchronization and Gradle debug assembly complete successfully.
- The APK is a valid, non-empty archive with application ID `com.splitley.app` and label `Splitley`.
- The packaged Capacitor configuration has no hosted `server.url`, and the Android manifest handles `splitley://auth/callback`.
- If an emulator or connected device is available, installation and launch are smoke-tested.

## Deliverable

The primary deliverable is `android/app/build/outputs/apk/debug/app-debug.apk`, together with the generated Android project and repeatable repository commands for rebuilding it.

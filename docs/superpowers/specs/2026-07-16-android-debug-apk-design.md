# Android Debug APK Design

## Goal

Produce an installable Android debug APK for SplitEase from the current repository. The APK will bundle the Vite production build locally and will not depend on the configured Lovable-hosted application URL to start.

## Scope

The work includes generating the Capacitor Android project, configuring Capacitor to use the local `dist` build, synchronizing web assets, building the debug variant, and verifying the generated APK. Release signing, Play Store publishing, app-store metadata, and a native rewrite are outside this task.

## Architecture

The existing React and TypeScript application remains the source of the user interface and business logic. Vite compiles it into static assets under `dist`. Capacitor embeds those assets in an Android WebView through a generated native Android project under `android/`.

The checked-in `capacitor.config.ts` will retain the existing application identifier and display name, but its hosted `server.url` configuration will be removed. With no remote server override, Capacitor serves the contents of `webDir` (`dist`) from the packaged application.

## Build Flow

1. Install the locked npm dependencies.
2. Run the existing Vite production build to create `dist`.
3. Generate the Android platform with Capacitor if `android/` is absent.
4. Synchronize the latest Capacitor configuration, plugins, and web assets into the Android project.
5. Run the Android Gradle `assembleDebug` task.
6. Copy or identify the final APK at its stable output path and report that path to the user.

## Runtime Behavior

On launch, Android opens the Capacitor activity and loads the bundled SplitEase assets. The initial interface can render without reaching the Lovable hosting URL. Features backed by Supabase or other network services will still require network access when they communicate with those services.

The existing service-worker and browser notification behavior will be left unchanged unless it prevents the Android build or launch. Capacitor compatibility fixes will be limited to issues required to produce and run the debug APK.

## Error Handling

The build will stop on dependency installation, Vite compilation, Capacitor synchronization, or Gradle failures. Each failure will be diagnosed at its originating layer. Environment prerequisites such as a compatible JDK and Android SDK will be checked before or during the native build, and any missing prerequisite will be reported precisely.

## Verification

Verification will include:

- The web production build completes successfully.
- Capacitor synchronization completes successfully.
- Gradle's debug assembly completes successfully.
- The generated file is a valid APK archive at the reported path.
- The Android package uses the configured SplitEase application identity.
- The packaged assets come from the local `dist` build and no hosted `server.url` override remains.

If an Android emulator or connected device is available, installation and a launch smoke test may also be performed. The APK build itself does not depend on a device being present.

## Deliverable

The primary deliverable is the generated debug APK under the Android build outputs in this workspace, together with the Capacitor Android project and repeatable npm scripts or documented commands needed to rebuild it.

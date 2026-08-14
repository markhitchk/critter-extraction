# Critter Extraction — Native Android

This directory is the true native Android 14+ edition of Critter Extraction.

- Minimum: Android 14 / API 34
- Compile/target: API 36
- Runtime: Android Activity + Canvas game loop
- Java 17
- Touch-first landscape controls
- No INTERNET permission
- No WebView
- No HTML/JavaScript runtime
- Offline local saves and gameplay

The Android build packages the existing `live/assets` folder directly into the APK as resources, so the character, weapon, item, loading, branding, HTG and other current assets remain available to the native app. They are not used to run the web game.

## Playable native systems

Twin-stick movement and aim/fire, native combat, enemy spawning, loot, extraction hold objective, dash, medkits, haptics, persistent petals/stats, pause/resume, Android lifecycle handling, immersive fullscreen, and optional controller buttons.

## Build

With JDK 17, Android SDK 36 and Gradle 9.5 installed:

```bash
cd android
gradle :app:assembleDebug
```

Installable APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The repository workflow `Native Android APK` builds and uploads the APK automatically.

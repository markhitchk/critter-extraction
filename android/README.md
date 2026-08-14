# Critter Extraction — Native Android Mobile Alpha

This directory is the true native Android 14+ edition of **Critter Extraction**.

## v0.24.0 native mobile alpha

- Minimum Android: Android 14 / API 34
- Compile/target SDK: API 36
- Runtime: Android `Activity` + native `Canvas` game loop
- Java 17
- Touch-first landscape controls
- Adaptive launcher/round icon
- Android native splash branding
- No `INTERNET` permission
- No `WebView`
- No HTML/JavaScript runtime
- Offline local saves and gameplay
- Stable **development-only** APK signing for update installs between test versions

## Native asset system

The Android build packages the existing `live/assets` tree directly into the APK. `AssetLibrary.java` enumerates and renders the shared art locally using AndroidSVG, which means the mobile game can use the actual Critter Extraction SVG artwork without a browser.

Current native loadout support includes:

- 13 selectable critter definitions backed by `characters/*.svg`
- 5 selectable weapons backed by `weapons/*.svg`
- 6 selectable armor sets backed by `items/armor_*.svg`
- Crystal loot and medkit item art
- HTG branding/loading assets
- Dynamic discovery of packaged character/item/weapon/branding/loading files

The rest of the shared asset tree remains bundled and discoverable by the native asset library as the app grows.

## Playable native systems

- Twin-stick movement and aim/fire
- Mobile touch controls and haptics
- Weapon-specific fire rate, damage, projectile speed, spread and piercing
- Armor-specific damage reduction, movement modifiers and bonuses
- Native enemy combat and spawning
- Loot collection and extraction hold objective
- Dash and medkits
- Persistent loadout, petals, run count and best extraction
- Pause/resume and Android lifecycle handling
- Immersive fullscreen
- Optional controller buttons
- Startup error screen instead of unexplained instant-close failures

## Signing note

Debug/mobile-alpha APKs use the public development key stored as base64 under `android/dev-signing/`. This is intentional so GitHub Actions builds have the same signature and can update each other on a phone. **Never use this development key for a production/Play Store release.** Production must use a private signing key kept outside the repository.

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

The repository workflow **Native Android APK** builds, verifies the APK signature, confirms representative bundled assets, creates a SHA-256 checksum, and uploads the installable artifact.

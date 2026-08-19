# Critter Extraction — Native Android v0.2.0 test checkpoint

This project is a real Android/libGDX game build. It does **not** use WebView, HTML, CSS, JavaScript, `index.html`, or the browser game runtime.

## Native gameplay in this checkpoint
- OpenGL-backed 3D world and camera
- Third-person and first-person camera toggle
- Native multitouch movement/look/fire controls
- Procedural 3D puppy player model built in game code
- Enemy critters with chase AI, health, death and respawn
- Projectile shooting, ammo/reload, health and medkit action
- Extraction pad + 5-second extraction objective
- Petals, kills and extraction counters persisted with native Preferences
- Landscape immersive Android game activity
- Android 14+ (`minSdk 34`)
- Package: `com.harleytg.critterextraction`

## Assets
`tools/prepare_assets.py` converts the repo's `live/assets/*.svg` art to native PNG textures. It also makes all Android launcher icon sizes from the exact `live/assets/icon.svg` requested for Critter Extraction.

The runtime asset folder contains character, weapon, item, loading and branding art. The original `icon.svg` is retained under `assets/source/icon.svg` for provenance.

## Build
Requires JDK 17+, Android SDK and Gradle. From this folder:

```bash
gradle :android:assembleDebug
```

APK output:
`android/build/outputs/apk/debug/android-debug.apk`

## Next native-port milestones
- Port all 39 procedural critter recipes into native model builders
- Native weapon/armor/backpack attachments
- Native inventory/loot screen and extraction results screen
- Native maps matching Pine Valley / Amber Junction / Moonberry Marsh / Clover Highlands / Frostflower Ridge / Redwood Run
- Multiplayer transport/cross-play protocol port (without a browser WebRTC dependency)
- Audio, animation rigs, recoil, hit reactions, graphics presets and controller support

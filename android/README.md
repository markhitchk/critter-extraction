# Critter Extraction — Native Android 14+ 3D

This is the Android 14+ native 3D edition of Critter Extraction.

- Android 14 / API 34 minimum
- API 36 target
- Java 17
- OpenGL ES 3.0 renderer
- No WebView, embedded HTML page, or JavaScript game runtime
- Source art/game identity pulled from this repository
- Real WebRTC multiplayer uses Android network permissions
- Release signing is supplied only through private environment variables

## Canonical app icon

The launcher, round icon, Android splash, boot screen, and top-left native header all use the
exact Critter Extraction puppy mark from `live/assets/branding/icon.svg`. The checked-in launcher
PNG is a 1024×1024 raster export of that SVG; it is not a redraw or a replacement icon. Run
`node android/tools/verify-branding.mjs` from the repository root to validate this contract.

## 3D systems

The native renderer ports the repository's canonical `live/core/rendering/model-library.js` and
`species-models.js` concepts into Java/OpenGL ES. The current Android parity baseline includes
species-specific presentation, first/third-person cameras, touch movement and aim, five weapon
profiles, enemies, damage, loot, extraction, healing, environment geometry, depth testing,
directional lighting, and distance fog. Production GLB assets and further visual polish remain
tracked work and must not be described as complete until they pass asset and device validation.

The existing SVG/item/weapon/branding/loading asset folders continue to be packaged in the APK for native UI and future texture/material work.

## Build

```bash
cd android
gradle :app:assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

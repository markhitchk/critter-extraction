# Critter Extraction — Native Android 3D

This is the Android 14+ native 3D edition of Critter Extraction.

- Android 14 / API 34 minimum
- API 36 target
- Java 17
- OpenGL ES 3.0 renderer
- No WebView, HTML page, JavaScript engine, or INTERNET permission
- Source art/game identity pulled from this repository
- Stable development signing for test updates

## 3D systems

The v0.30 stage ports the repository's canonical `live/core/rendering/model-library.js` and `species-models.js` concepts into native Java/OpenGL. All 39 critters are represented through shared low-poly meshes plus per-species colors, ears, tails, limbs, roles, and equipment. The renderer includes a perspective follow camera, first-person camera toggle, twin-stick mobile movement/aim, auto-fire, five weapon profiles, enemies, damage, loot, extraction, medkits, dash, 3D trees/rocks/crates, depth testing, directional lighting and distance fog.

The existing SVG/item/weapon/branding/loading asset folders continue to be packaged in the APK for native UI and future texture/material work.

## Build

```bash
cd android
gradle :app:assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

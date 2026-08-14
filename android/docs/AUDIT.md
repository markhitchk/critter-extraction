# Android v0.41.0 Baseline Audit

## Source of truth

`main/live/` remains the canonical browser game. The Android app consumes the shared character,
weapon, item, loading, and branding assets without changing the independent LIVE, Prerelease,
Testing, or Tech Preview deployments.

## Reused native work

The starting Android tree was recovered from closed PR #74 because it already contains a native
OpenGL ES game loop, profiles, inventory/economy data, touch controls, menu/HUD work, and a native
WebRTC transport. It is treated as a baseline to validate and improve—not proof that all master
prompt requirements are complete.

## Corrected before reuse

- Removed the committed development keystore and all hard-coded signing credentials.
- Moved release signing to private environment variables.
- Replaced the unrelated HTG launcher bitmap and generic paw vector with the exact
  `live/assets/branding/icon.svg` puppy icon confirmed by the repository owner.
- Removed the unused legacy `GameView` prototype so it cannot reintroduce stale v0.24 branding
  or a second game runtime beside the active `Game3DView` implementation.
- Updated the Android version line to v0.41.0 / versionCode 410.
- Added an automated canonical-branding contract and CI verification.

## Still requiring validation

- Android 14 hardware launch and performance.
- Save migration and import/export compatibility with browser profile v7 XML.
- Real Android-to-Android and Android-to-browser multiplayer gameplay.
- Production GLB models, animation, materials, collisions, and asset diagnostics.
- Full feature-parity and accessibility matrices.

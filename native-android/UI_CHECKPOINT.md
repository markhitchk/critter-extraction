# Native UI checkpoint — v0.2.0-test1

The native app now starts in a Scene2D main menu instead of launching directly into gameplay.

## Main menu
- Critter Extraction branding and bundled cinematic background.
- Play launches the existing native 3D GameScreen.
- Loadout placeholder for the next UI checkpoint.
- Settings, Credits, and Exit Game actions.
- Android Back / Escape exits from the main menu.

## Settings
- Graphics: render scale, FPS limit, effects quality, shadows, FOV.
- Audio: mute, master, music, sound effects.
- Controls: look/aim sensitivity, invert Y, haptics, left-handed layout.
- Accessibility: UI scale, reduced motion, high-contrast HUD, crosshair size, color vision filter.

Settings are persisted locally through LibGDX Preferences and include Apply, Reset Defaults, Cancel, and Back behavior.

<!--
AI ASSISTANTS: DO NOT EDIT, REWRITE, OR REPLACE THIS README.md during unrelated project work. Preserve this file exactly unless the repository owner explicitly requests a README change.
-->

<h1 align="center">Critter Extraction</h1>

<p align="center">
  <img src="assets/branding/icon.svg" alt="Critter Extraction game logo" width="220">
</p>

**Critter Extraction** is a cute 3D browser extraction shooter created by **Harley’s Studios**.

Explore the map, fight enemy critters, collect weapons and gear, complete objectives, and reach the extraction zone with your loot.

## Play

[Play Critter Extraction](https://markhitchk.github.io/critter-extraction/)

## Features

- Solo, co-op, and PvP modes
- First-person and third-person cameras
- Weapons, armor, backpacks, loot, and death boxes
- Inventory, account stash, and custom loadouts
- Quests, objectives, merchants, and Petals
- Enemy AI with adjustable difficulty and respawn settings
- Direct browser multiplayer using room links and six-digit codes
- Local player profiles with downloadable account backups
- Keyboard, mouse, and touchscreen controls

## Unreal Engine 6 Release

A new **Unreal Engine 6 edition of Critter Extraction is coming soon**.

## Project Status

Critter Extraction is still being developed. Features, gameplay, and artwork may change as the game is improved.

## Current Version

**v0.22.0**

## Repository Layout

- `index.html` — canonical GitHub Pages homepage
- `core/` — boot, game, loader, rendering, page, style, storage, multiplayer, account, inventory, AI, and UI systems
- `core/error-system/` — canonical privacy-safe error center
- `assets/` — branding, characters, items, loading media, vendor libraries, and weapons
- `docs/` — architecture, guides, credits, error documentation, design notes, and release notes
- `portable/START_HERE.html` — canonical portable build
- `tests/` — browser, smoke, unit, integration, multiplayer, fixture, and error coverage
- `tools/` — build and validation utilities

Root `404.html`, `error.html`, `invite.html`, `START_HERE.html`, `styles.css`, and legacy JavaScript/asset URLs are compatibility adapters or generated files.

## Development

```bash
npm ci
npm test
```

Generate compatibility files with:

```bash
npm run build:styles
npm run build:portable
```

## Credits

Created by **Harley’s Studios**.

## Feedback and Issues

- [Report a new issue](https://github.com/markhitchk/critter-extraction/issues/new)
- [View existing issues](https://github.com/markhitchk/critter-extraction/issues)

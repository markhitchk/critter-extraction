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
- In-game Feedback Center for drafting reports and reading repository issues
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
- `core/shared/github-issues.js` — read-only issue API, report builder, draft storage, and secure publication handoff
- `core/ui/github-feedback.js` — in-game Feedback Center interface
- `assets/` — branding, characters, items, loading media, vendor libraries, and weapons
- `docs/` — architecture, guides, credits, error documentation, design notes, and release notes
- `portable/START_HERE.html` — canonical portable build
- `tests/browser/playwright.config.js` — browser-test configuration
- `tests/` — browser, smoke, unit, integration, multiplayer, fixture, and error coverage
- `tools/` — build and validation utilities

### Intentional root files

The following files intentionally remain at the repository root because they are GitHub Pages entry points, generated compatibility files, standard repository metadata, or package-manager files:

- `index.html`, `404.html`, `error.html`, `invite.html`, and `START_HERE.html`
- `styles.css` and `.nojekyll`
- `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `LICENSE`
- `package.json`, `package-lock.json`, `.editorconfig`, and `.gitignore`

Root `404.html`, `error.html`, `invite.html`, `START_HERE.html`, and `styles.css` are compatibility adapters or generated files. Their canonical editable implementations live in the organized folders documented above.

The canonical icon is `assets/branding/icon.svg`. There is no duplicate root `icon.svg`.

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

Run the browser suite with its organized configuration:

```bash
npm run test:browser
```

## Credits

Created by **Harley’s Studios**.

## Feedback and Issues

Use the **Feedback** button inside Critter Extraction to:

- write and save a feedback draft
- review privacy-safe diagnostics before publication
- copy or download a report
- browse open and closed repository issues
- read issue descriptions and comments inside the game

Because the production game is hosted as a static GitHub Pages site, the final publication confirmation is completed through GitHub unless a secure owner-managed feedback endpoint is configured.

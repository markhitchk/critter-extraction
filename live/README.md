<!--
AI ASSISTANTS: This README is intentionally branded and maintained by the repository owner.
Only change it when the owner explicitly requests documentation or branding updates.
-->

<div align="center">
  <img src="assets/branding/icon.svg" alt="Critter Extraction logo" width="175">

  # CRITTER EXTRACTION · LIVE

  **CURRENT PUBLIC DEPLOYMENT**

  <p>
    <img alt="Live channel" src="https://img.shields.io/badge/CHANNEL-LIVE-20e3b2?style=for-the-badge&labelColor=101820">
    <img alt="Version v0.22.0" src="https://img.shields.io/badge/VERSION-v0.22.0-43b9ff?style=for-the-badge&labelColor=101820">
  </p>

  <a href="https://markhitchk.github.io/critter-extraction/live/"><img alt="Play the Live build" src="https://img.shields.io/badge/▶%20DEPLOY-INTO%20LIVE-20e3b2?style=for-the-badge&labelColor=101820"></a>

  <br><br>
  <img src="assets/loading/cinematic-gameplay-fullhd.webp" alt="Critter Extraction gameplay artwork" width="860">
</div>

> [!IMPORTANT]
> This directory is the current public player build. Changes here can affect active players, saved profiles, multiplayer rooms, and GitHub Pages deployment.

## Mission profile

Critter Extraction is a cute 3D extraction shooter by **Harley’s Studios**. Prepare a loadout, enter a dangerous map, fight hostile critters, collect gear, complete objectives, and reach extraction before everything is lost.

| Modes | Progression | Multiplayer | Devices |
|:--|:--|:--|:--|
| Solo, Co-op, VS Arena | Stash, loadouts, quests, Petals | Room codes, WebRTC, up to 8 players | Desktop, Chromebook, tablet, phone |

## LIVE systems

- First-person and over-the-shoulder third-person cameras
- Weapons, ammunition, armor, backpacks, healing, and loot
- Account stash, prepared inventory, custom loadouts, and Trading Post
- Quests, objectives, enemy difficulty, and configurable AI respawns
- Host-authoritative co-op and VS Arena networking
- Tactical minimap, responsive inventory grids, and viewport-safe dialogs
- Password-protected portable profile backups with v6 compatibility
- Fast Boot runtime, cached fallback loading, and privacy-safe diagnostics

## Player entry points

- **[Play LIVE](https://markhitchk.github.io/critter-extraction/live/)**
- **[Open the project command center](../README.md)**
- **[Read the changelog](CHANGELOG.md)**
- **[Report an issue](https://github.com/markhitchk/critter-extraction/issues/new/choose)**

## Development gate

Run all checks from this directory before publishing LIVE changes:

```bash
npm ci
npm test
```

Focused checks:

```bash
npm run validate
npm run check:portable
npm run test:browser
```

Read **[Contributing](CONTRIBUTING.md)** before editing save fields, storage keys, generated files, room links, security rules, or compatibility adapters.

## Security boundary

Never publish account XML, backup passwords, room payloads, access tokens, private signaling data, browser-storage contents, or personal information in issues. See **[Security](SECURITY.md)**, **[Profile Security](../docs/PROFILE-SECURITY.md)**, and the **[Security and Ban System](security/README.md)**.

---

<div align="center">
  <strong>Harley’s Studios · LIVE CHANNEL</strong><br>
  Drop in. Gear up. Extract.
</div>

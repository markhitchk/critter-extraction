<!--
AI ASSISTANTS: This README is intentionally branded and maintained by the repository owner.
Only change it when the owner explicitly requests documentation or branding updates.
-->

<div align="center">
  <img src="live/assets/branding/icon.svg" alt="Critter Extraction logo" width="190">

  # CRITTER EXTRACTION

  **DROP IN · GEAR UP · EXTRACT**

  A cute 3D browser extraction shooter from **Harley’s Studios**.

  <p>
    <img alt="Version v0.22.0" src="https://img.shields.io/badge/VERSION-v0.22.0-20e3b2?style=for-the-badge&labelColor=101820">
    <img alt="Browser game" src="https://img.shields.io/badge/PLATFORM-MODERN%20BROWSERS-43b9ff?style=for-the-badge&labelColor=101820">
    <img alt="Active development" src="https://img.shields.io/badge/STATUS-ACTIVE%20DEVELOPMENT-ffb84d?style=for-the-badge&labelColor=101820">
  </p>

  <p>
    <a href="https://markhitchk.github.io/critter-extraction/live/"><img alt="Play Live" src="https://img.shields.io/badge/▶%20PLAY-LIVE%20BUILD-20e3b2?style=for-the-badge&labelColor=101820"></a>
    <a href="https://markhitchk.github.io/critter-extraction/prerelease/"><img alt="Open Prerelease" src="https://img.shields.io/badge/◆%20OPEN-PRERELEASE-9b8cff?style=for-the-badge&labelColor=101820"></a>
  </p>

  <img src="live/assets/loading/cinematic-gameplay-fullhd.webp" alt="Critter Extraction gameplay artwork" width="900">
</div>

> [!IMPORTANT]
> Critter Extraction is actively developed. Gameplay, balance, networking, artwork, and save formats may continue to evolve while compatibility protections are maintained.

## Choose your deployment channel

| Channel | Purpose | Launch |
|:--|:--|:--:|
| **Live** | Current public game and recommended player build | **[Deploy](https://markhitchk.github.io/critter-extraction/live/)** |
| **Prerelease** | Upcoming releases, upgraded assets, and release candidates | **[Deploy](https://markhitchk.github.io/critter-extraction/prerelease/)** |
| **Testing** | Focused UI, UX, browser, and gameplay testing | **[Deploy](https://markhitchk.github.io/critter-extraction/testing/)** |
| **Tech Preview** | Early experiments and systems that may change quickly | **[Deploy](https://markhitchk.github.io/critter-extraction/tech-preview/)** |

## The extraction loop

| 01 · Prepare | 02 · Deploy | 03 · Survive | 04 · Extract |
|:--:|:--:|:--:|:--:|
| Select a critter, armor, backpack, weapons, and supplies. | Enter a map alone, with a co-op squad, or in VS Arena. | Fight hostile critters, complete objectives, and search for valuable loot. | Reach extraction alive to secure gear, Petals, and career progress. |

## Built for cute tactical chaos

<table>
<tr>
<td width="50%" valign="top">

### 🎮 Game modes

- Solo extraction runs
- Direct browser co-op rooms
- Free-for-all and team VS Arena
- First-person and over-the-shoulder cameras
- Host-controlled rules, enemy difficulty, and respawn settings

</td>
<td width="50%" valign="top">

### 🎒 Gear and progression

- Weapons, ammunition, armor, backpacks, and consumables
- Account stash, prepared inventory, and custom loadouts
- Loot crates, pickups, death boxes, and Take All flows
- Objectives, quests, merchants, career records, and Petals
- Local profiles with portable password-protected backups

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🌐 Multiplayer

- Six-digit room codes and shareable room invitations
- PeerJS/WebRTC direct connections with host authority
- Up to eight players in the current LIVE multiplayer design
- Fair Play validation, host-local restrictions, and security notices
- No required dedicated gameplay server

</td>
<td width="50%" valign="top">

### 🖥️ Browser experience

- Current desktop and mobile browsers
- Keyboard, mouse, and touchscreen controls
- Responsive layouts for Chromebook, short-height, tablet, and phone screens
- Fast Boot generated runtime with cached fallback loading
- Reduced-motion, compatibility, and graphics-quality options

</td>
</tr>
</table>

## Quick controls

| Action | Default control |
|:--|:--|
| Move | `W` `A` `S` `D` |
| Aim / look | Mouse or touch look area |
| Fire | Left mouse button or fire control |
| Interact / loot | `E` |
| Jump | `Space` |
| Change camera | `V` |
| Inventory | In-game inventory control |
| Pause / exit options | `Esc` |

> [!NOTE]
> Controls can vary by device and game state. The in-game Help and Settings screens are the source of truth for the active build.

## Profiles and backup security

Critter Extraction accounts are stored locally in the browser. Current portable exports use the encrypted **profile v7** format, while compatible v6/CE6 backups remain importable. Backup passwords are not written into exported XML files.

Keep profile XML, backup passwords, room payloads, access tokens, and private account details out of public issues.

Read the technical boundary in **[Profile Security](docs/PROFILE-SECURITY.md)** and the multiplayer enforcement design in **[Security and Ban System](live/security/README.md)**.

## Repository map

```text
critter-extraction/
├── live/          # Current public build
├── prerelease/    # Upcoming release work and authored asset integration
├── testing/       # Focused UI, UX, and gameplay testing
├── tech-preview/  # Experimental systems
├── docs/          # Cross-channel technical documentation
├── scripts/       # Build and optimization scripts
└── README.md      # Project command center
```

Each channel is designed to be independently deployable. The repository root routes players to the LIVE build while preserving query strings and URL fragments used by game links.

## Development checks

Run project validation from the channel being changed. For LIVE work:

```bash
cd live
npm ci
npm test
```

Useful focused commands:

```bash
npm run validate
npm run check:portable
npm run test:browser
```

See **[Contributing](live/CONTRIBUTING.md)** before changing saves, multiplayer, generated files, or compatibility adapters.

## Feedback and issue reports

The in-game **Feedback Center** can draft reports, preview privacy-safe diagnostics, copy or download the report, and browse repository issues. Direct publication requires either a temporary user-provided GitHub connection or an owner-managed secure endpoint.

- **[Report a bug or idea](https://github.com/markhitchk/critter-extraction/issues/new/choose)**
- **[Browse current issues](https://github.com/markhitchk/critter-extraction/issues)**
- **[Read the changelog](live/CHANGELOG.md)**

## Roadmap signal

- Continue improving the browser edition’s maps, quests, assets, combat, multiplayer reliability, and interface polish.
- Expand professionally authored 3D asset coverage in prerelease.
- Continue work toward a future **Unreal Engine 6 edition** of Critter Extraction.

---

<div align="center">
  <strong>Created by Harley’s Studios</strong><br>
  Cute critters. Serious loot. One clean extraction.
</div>

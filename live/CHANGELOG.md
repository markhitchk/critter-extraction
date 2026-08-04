<div align="center">
  <img src="assets/branding/icon.svg" alt="Critter Extraction logo" width="115">

  # DEPLOYMENT LOG

  **Critter Extraction · LIVE Channel**

  <img alt="Version v0.22.0" src="https://img.shields.io/badge/CURRENT-v0.22.0-20e3b2?style=flat-square&labelColor=101820">
  <img alt="Active development" src="https://img.shields.io/badge/STATUS-ACTIVE-ffb84d?style=flat-square&labelColor=101820">
</div>

> [!NOTE]
> This log highlights player-facing systems and important maintenance changes. Small cache-token, generated-runtime, and corrective commits may be grouped with the feature they support.

## Unreleased

### ⚡ Fast Boot and reliability

- Replaced the long sequential LIVE patch waterfall with a generated Fast Boot runtime.
- Added early preload hints, a generated patch bundle, parallel fallback loading, and cached runtime recovery.
- Added build automation that regenerates and validates Fast Boot output when LIVE runtime sources change.
- Added browser performance markers for startup diagnostics.

### 🌐 Multiplayer and VS Arena

- Expanded the current multiplayer design to support up to eight players.
- Added a dedicated VS Arena with free-for-all and balanced team modes.
- Added timed respawns, elimination targets, scoring, spawn protection, and synchronized match results.
- Improved guest shooting reliability, host reconciliation, disconnect handling, and network status tools.
- Redesigned the multiplayer pause menu and added clearer account/security notifications.

### 🗺️ Combat, HUD, and inventory

- Revamped the tactical minimap with responsive player, enemy, loot, and extraction markers.
- Improved short-height, Chromebook, tablet, and mobile behavior for inventory, stash, loot, and loadout grids.
- Added viewport-safe modal positioning and cleaner multiplayer loadout selection.
- Improved AI retaliation, configurable enemy respawns, and death-box handling.

### 🔐 Profiles and security

- Upgraded password-protected portable profile exports to format v7 while preserving v6/CE6 import compatibility.
- Added session-only backup-password controls without writing passwords into profile XML.
- Added stronger profile validation, legacy-account migration, encrypted backup auditing, and recovery compatibility.
- Separated host-local restrictions from repository-wide multiplayer bans.
- Prevented false Fair Play key-normalization violations from escalating into automatic bans.

### 🧭 Interface and feedback

- Rebuilt high-use menus, settings, accounts, loadouts, and responsive layouts.
- Added system-wide motion with reduced-motion support.
- Added the in-game Feedback Center for drafting reports, reviewing privacy-safe diagnostics, and browsing issues.
- Added optional direct GitHub issue submission using a tab-only user connection or owner-managed endpoint.

## v0.22.0

### Repository foundation

- Reorganized the project into independently deployable LIVE, Prerelease, Testing, and Tech Preview channels.
- Rebuilt startup diagnostics and the shared error center.
- Added project validation, portable-build parity, release checks, and browser smoke tests.
- Preserved compatibility adapters for public entry points, account data, room links, and portable builds.

---

<div align="center">
  <strong>Harley’s Studios</strong><br>
  <a href="README.md">LIVE README</a> · <a href="../README.md">Project Command Center</a>
</div>

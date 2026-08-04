<div align="center">
  <img src="../../assets/branding/icon.svg" alt="Critter Extraction logo" width="95">

  # GAME ARCHITECTURE

  **LIVE runtime map and compatibility boundaries**
</div>

## Deployment model

Critter Extraction is a static browser game deployed through GitHub Pages. The repository contains independent channels, while this document describes the `live/` build.

```text
live/
├── index.html          # LIVE browser entry point
├── core/               # Runtime, UI, rendering, security, and error systems
├── assets/             # Branding, characters, items, weapons, loading art, vendor files
├── docs/               # LIVE technical documentation
├── invite/             # Canonical recruitment/invite page
├── reset/              # Canonical account reset page
├── portable/           # Canonical portable file build
├── tests/              # Browser and system tests
└── tools/              # Build, validation, and packaging tools
```

## Boot path

1. `index.html` establishes the page and early preload hints.
2. `core/boot/project-paths.js` resolves channel-local paths.
3. Build and security configuration load before gameplay.
4. The Fast Boot loader prefers generated runtime and patch bundles.
5. A cached/source fallback remains available if generated output is unavailable.
6. The game runtime initializes accounts, UI, rendering, multiplayer, and match systems.

## Architecture rules

- Keep each channel independently deployable.
- Resolve assets relative to the active channel instead of assuming the repository root.
- Treat generated runtime files as build output; change their source and rebuild them.
- Keep startup failures visible through the shared error system.
- Preserve compatibility paths used by old bookmarks, portable builds, profile URLs, and room invitations.
- Do not mix experimental Tech Preview behavior into LIVE without validation.

## High-risk boundaries

| Area | Compatibility requirement |
|:--|:--|
| Accounts | Preserve storage keys, IDs, save fields, migrations, and encrypted export compatibility |
| Multiplayer | Preserve room codes, host authority, message validation, and guest reconciliation |
| Portable build | Preserve `file://` loading and generated copy parity |
| Error system | Preserve stable error codes and privacy-safe report generation |
| Generated runtime | Preserve source/build parity, validation, and safe fallback behavior |

## Related documents

- **[Account System](ACCOUNT_SYSTEM.md)**
- **[Multiplayer](MULTIPLAYER.md)**
- **[Error System](ERROR_SYSTEM.md)**
- **[Portable Build](PORTABLE_BUILD.md)**
- **[Contributor Field Guide](../../CONTRIBUTING.md)**

---

<div align="center"><strong>Harley’s Studios · LIVE Architecture</strong></div>

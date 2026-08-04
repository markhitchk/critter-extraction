<div align="center">
  <img src="live/assets/branding/icon.svg" alt="Critter Extraction logo" width="105">

  # CONTRIBUTOR FIELD GUIDE

  **Build carefully. Preserve player progress. Keep extraction playable.**
</div>

> [!IMPORTANT]
> Changes can affect browser saves, portable profiles, multiplayer rooms, generated files, and active GitHub Pages players. Compatibility is part of the feature.

## Choose the correct channel

| Channel | Use it for |
|:--|:--|
| `live/` | Current public game and production fixes |
| `prerelease/` | Upcoming releases and authored asset integration |
| `testing/` | Focused UI, UX, browser, and gameplay tests |
| `tech-preview/` | Experimental systems that may change quickly |

Keep changes inside the intended channel unless a shared root document, workflow, or build script also needs an update.

## Before changing code

- Read the nearby architecture or security document for the system being changed.
- Do not rename save fields, storage keys, account IDs, room parameters, or public compatibility paths without a tested migration.
- Do not place private profiles, room payloads, credentials, tokens, or personal data in fixtures, commits, screenshots, issues, or reports.
- Preserve generated-file and portable-build parity.
- Keep LIVE behavior separate from experiments unless the change is intentionally being promoted.

## Local setup

Run commands from the channel being changed. For LIVE work:

```bash
cd live
npm ci
```

## Required validation

```bash
npm test
```

That command rebuilds generated assets, validates the project, checks portable parity, and runs browser tests.

Useful focused checks:

```bash
npm run build:styles
npm run build:portable
npm run validate
npm run check:js
npm run check:links
npm run check:assets
npm run check:portable
npm run test:browser
```

## Compatibility checklist

- [ ] Existing profiles still load and export.
- [ ] Account IDs, usernames, stash, loadouts, Petals, and career data remain intact.
- [ ] Room links and six-digit codes still work.
- [ ] Host and guest behavior was checked when multiplayer changed.
- [ ] Root and channel entry points still route correctly.
- [ ] Portable `file://` behavior remains usable when portable files changed.
- [ ] Generated files were rebuilt instead of edited inconsistently.
- [ ] Desktop, short-height, mobile, and reduced-motion layouts were considered.
- [ ] Reports and test data contain no private player information.

## Pull request style

A useful pull request should explain:

1. **What changed** for players or maintainers.
2. **Why it changed**, including the actual root cause when fixing a bug.
3. **What files or systems are affected**.
4. **How it was validated**.
5. **What remains untested or incomplete**.

Keep unrelated fixes separate. Do not describe procedural blockouts, placeholders, or imported files as production-ready unless they are connected and validated in gameplay.

## High-risk systems

| System | Preserve |
|:--|:--|
| Accounts | IDs, storage keys, migrations, XML compatibility, overwrite confirmation |
| Inventory | Slot counts, stack limits, stash data, prepared items, loadout ownership |
| Multiplayer | Room codes, invitations, host authority, guest reconciliation |
| Security | Privacy boundaries, ban scope, validation order, legacy compatibility |
| Generated runtime | Source/build parity, syntax checks, safe fallback loading |
| Portable build | `file://` loading, generated-copy parity, offline-compatible paths |

## Documentation rule

Update the README, changelog, architecture notes, or security documentation when behavior changes. Documentation should use the same terminology shown in the game and clearly separate LIVE behavior from testing or experimental work.

---

<div align="center">
  <strong>Thanks for improving Critter Extraction.</strong><br>
  Validate the run before calling extraction.
</div>

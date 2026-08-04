# Critter Codes verification

The browser suite is available at `live/tests/critter-codes.test.html`. It uses a synthetic code and restores a clean test profile after each run; no production code strings are stored in the test page.

## Automated coverage

- capitalization, spaces, and hyphen normalization
- SHA-256 consistency
- ten-entry registry shape and unique hashes
- all eight playable reward critters, portraits, presets, and renderer bases
- every required themed reward definition
- migration of older profiles
- unique reward duplicate behavior
- Petal cap behavior
- persistent crate delivery and full-stash safety
- atomic multi-reward grants, redemption history, and exact notification details
- already-redeemed, disabled, future, expired, version-locked, and missing-definition states
- game-core renderer bridge hooks
- mobile, reduced-motion, keyboard, and controller affordances

## Release checks

Run these from the repository root:

```bash
node --check live/core/boot/project-paths.js
node --check live/core/rewards/critter-codes.js
node --check live/core/rewards/critter-codes.registry.js
for file in live/core/rewards/critter-codes.payload.*.js; do node --check "$file"; done
```

The owner-private registry generator, plaintext code list, and verification secrets must remain outside this repository and outside the published `live/` build. Generate the minified hashed registry privately, then copy only `live/core/rewards/critter-codes.registry.js` into this repository. Before release, privately verify that every intended code normalizes to the expected SHA-256 entry, all hashes are unique, and no plaintext code appears anywhere under `live/`.

## Manual game checks

1. Redeem each owner-provided starter code on a clean profile.
2. Equip every critter and confirm its portrait, preset, animated base model, first-person paws, and profile ownership survive reload and XML export/import.
3. Equip each backpack, outfit, armor, hat, wrap, trail, extraction effect, title, badge, nameplate, and emote; start a match and confirm the visible 3D or interface effect.
4. Open every claim notification after closing the original reveal and verify that it lists the exact reward bundle.
5. Fill all 40 stash slots, claim a supply crate, and verify the unclaimed items remain in Delivery Storage.
6. Test 1366×768 Chromebook, 390×844 mobile, keyboard-only navigation, controller D-pad/A/B navigation, reduced-motion, and volume set to zero.

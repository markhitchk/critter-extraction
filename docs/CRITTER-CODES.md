# Critter Codes

Critter Codes unlock permanent rewards for the active Critter Extraction profile saved in the current browser.

## Redeem page

Open the standalone terminal:

```text
https://markhitchk.github.io/critter-extraction/live/redeem/
```

Show a username on the terminal:

```text
https://markhitchk.github.io/critter-extraction/live/redeem/?@HarleyTG
```

The username in the URL is a display and safety check. This static browser build cannot remotely change another person's profile. Rewards always go to the active local profile stored in that browser.

Codes are case-insensitive. Spaces and hyphens are ignored, so all of these forms are treated the same:

```text
PENGUINPARTY
penguinparty
Penguin Party
PENGUIN-PARTY
```

## Public starter codes

| Critter Code | Rewards |
|---|---|
| `WELCOMECRITTER` | 5,000 Petals, Starter Supply Crate, Welcome Badge |
| `PENGUINPARTY` | Penguin, Frozen Expedition Backpack, Snowflake Trail, 10,000 Petals |
| `CROWCOLLECTOR` | Crow, Shiny Scavenger Pack, Feather Trail |
| `RACCOONRAID` | Raccoon, Scavenger Backpack, Loot Bandit Title |
| `FROGGYFRIDAY` | Frog, Raincoat Outfit, Lily Pad Extraction Effect |
| `REDPANDAPOWER` | Red Panda, Tactical Hoodie, Red Panda Nameplate |
| `ARCTICADVENTURE` | Arctic Fox, Winter Armor, Frost Weapon Wrap |
| `CAPYBARACHILL` | Capybara, Relaxed Emote, Orange Hat |
| `AXOLOTLAQUA` | Axolotl, Aquatic Cosmetic Set, Bubble Trail |
| `CUDDLEPARTY` | Two-tone Brown Otter playable critter |
| `HARLEYSCLAN` | Cyan HTG Cosmetic Set, Clan Badge, Harley's Clan Nameplate |

## Redemption rules

- Normal public codes can be redeemed once per profile.
- Rewards persist through reloads and supported profile export/import.
- Already-owned unique rewards are not duplicated.
- Petals respect the 1,000,000 Petal account cap.
- Physical rewards that cannot fit in the stash remain safe in Delivery Storage.
- Disabled, expired, future, version-locked, and invalid codes show separate errors.
- Successful claims are added to the notification panel.

## Public and private codes

This file lists the public starter and event codes already announced for the game. Owner-only, testing, limited, or unreleased codes must not be added here. The production registry and reward extensions store SHA-256 hashes and internal reward IDs rather than plaintext code strings.

## Adding another public code

Public code definitions are generated privately using:

```bash
node tools/critter-codes/generate-registry.mjs tools/critter-codes/private-codes.json live/core/rewards/critter-codes.registry.js
```

Keep `private-codes.json` outside the public repository. After generating the hashed registry, document only codes that are intentionally public in this Markdown file.

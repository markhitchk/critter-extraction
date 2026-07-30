# Critter Extraction v0.26.7

A cute 3D browser extraction game by **Harley’s Studios**. This release adds the account-based **Petals** economy and repairs the **Custom Loadout Builder** so it uses only real items packed from Account Stash.

## Highlights

- Eight low-poly critters with first- and third-person views.
- Procedural regions, contracts, loot, enemies, extraction, and direct WebRTC co-op.
- Per-account Petals balance. New and migrated accounts begin at **0 Petals**.
- Trading Post with safe stash selling, Sell Junk protection, item locking, and basic supply purchases.
- Twenty-slot, 30 kg Custom Loadout with real packed weapons and armor—no invisible starter gear.
- Forty-slot Account Stash with centered, short-screen-friendly inventory layouts.
- Local account saves, XML exports, profile URLs, and migration from previous v26.x builds.

## Run locally

Extract the complete folder and open `START_HERE.html` for the self-contained build. For GitHub Pages, PWA caching, and WebRTC testing, run a static server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`.

## Controls

`WASD` move • mouse aim • left click/F/Space fire • right click aim • `R` reload • `Q` heal • `I`/Tab inventory • `E` interact/extract • `V` camera • `B` shoulder • `Esc` pause.

## Petals and Trading Post

Extracted items enter Account Stash. Open **Trading Post** to sell one item, a stack, or approved junk. Weapons, armor, ammo, healing items, quest items, Moonberries, locked items, and Custom Loadout items are protected from Sell Junk. Basic supplies can be bought only when the account has enough Petals and the stash has room.

## Custom Loadout

Choose **Custom Loadout**, then move real items from Account Stash into the left 20-slot backpack. Pack and equip a weapon before starting. Prepared items are saved locally and become at-risk match inventory only after the world initializes successfully.

## Browser support

Designed for current Chrome, Chromebook Chrome, Edge, Firefox, and Safari. Solo play can run locally. Public matchmaking/PeerJS and WebRTC require internet access; restrictive networks may still block direct peer connections.

## Data and privacy

Accounts, Petals, settings, stash, and statistics are stored in the browser. The game has no central account database. Diagnostic reports exclude profile images, usernames, inventory contents, room codes, and WebRTC packets.

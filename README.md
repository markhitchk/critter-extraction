# Critter Extraction 3D — GitHub Pages Edition

A static, no-build browser extraction shooter with full low-poly puppy and bunny characters, first-person paws/weapon view, animated third-person character view, inventory management, local saves, Chromebook fallback rendering, and manual-code WebRTC co-op.

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload **all files and folders from this package to the repository root**. Keep `.github/workflows/pages.yml` and the empty `.nojekyll` file.
3. Commit to the `main` branch.
4. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
5. Open the repository's **Actions** tab and wait for **Deploy Critter Extraction to GitHub Pages** to complete.
6. Open the URL shown by the deployment. A project repository normally uses `https://USERNAME.github.io/REPOSITORY/`.

No npm install, build command, database, or server is required. All paths are relative so the game works from a GitHub project subfolder.

## Controls

- `W A S D` / arrows — move
- Mouse — look
- Left click — shoot
- `F` or `Space` — backup shoot controls
- Right click — aim
- `V` — first/third person
- `R` — reload
- `I` / `Tab` — inventory
- `E` — interact/extract
- `Q` — heal
- `Esc` — release mouse

## Character views

- **Third-person:** complete upright puppy or bunny, head, face, ears, muzzle/tail, torso, vest, backpack, arms, paws, legs, feet, weapon, walk animation, recoil, and muzzle flash.
- **First-person:** visible sleeves, both forearms and paws, Pea Popper, movement bob, recoil, and muzzle flash.

## Shooting fix

Shots are queued immediately on pointer input so fast Chromebook clicks are not lost during pointer-lock or network update timing. The game also accepts `F` and `Space` as backup fire keys.

## Local testing

Open `index.html` directly for basic solo testing, or run a static server for PWA and WebRTC behavior:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`.

## Multiplayer note

Direct co-op still uses the manual Host Code / Join Code WebRTC exchange. GitHub Pages supplies HTTPS hosting but is not a signaling or TURN backend, so restrictive networks can still block peer-to-peer connections.

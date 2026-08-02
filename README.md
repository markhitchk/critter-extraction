# Critter Extraction v0.27.1 — GitHub Pages Edition

This folder is the **repository root**. Upload its contents directly to a GitHub repository so `index.html`, `styles.css`, `.nojekyll`, `assets`, `js`, and `.github` are all at the top level.

## Deploy

1. Create a new GitHub repository with `main` as its default branch.
2. Extract this ZIP.
3. Upload **the contents of the extracted folder**, not the enclosing folder itself.
4. Confirm that opening the repository shows `index.html` immediately at the top level.
5. Open **Settings → Pages**.
6. Under **Build and deployment → Source**, select **GitHub Actions**.
7. Open the **Actions** tab and wait for **Deploy Critter Extraction to GitHub Pages** to finish.
8. Open the address shown by the successful deployment.

The workflow validates required files and case-sensitive asset paths before every deployment. A failed validation prevents a broken site from replacing the working deployment.

## Static-hosting behavior

- Solo play, graphics, adaptive phone/tablet controls, mouse/keyboard controls, profiles, inventory, and settings run entirely in the browser.
- Every device account has separate progress, stash, loadout, Petals, appearance, statistics, and settings in browser-local storage.
- Use **Download Account** beside a profile to save its complete XML account file, then **Upload Account File** to restore it in another browser. These are portable local profiles, not secure cloud logins.
- Multiplayer uses the included PeerJS client, secure PeerJS signaling, and STUN/TURN-assisted WebRTC connections. GitHub Pages supplies the required HTTPS origin; exceptionally restrictive networks can still block WebRTC.
- No service worker is installed, so updating the repository cannot leave an old cached game worker behind.

## Custom errors

- GitHub Pages automatically serves the branded `404.html` when a path does not exist.
- `error.html?code=500` is the general error center and supports 400, 403, 404, 408, 429, 500, 503, and offline states.
- Error pages include retry, back, return-to-game, and copyable diagnostic actions without exposing account or stash data.
- Startup and runtime boot failures continue to use the in-game diagnostic screen with a downloadable support report.

## Local check

If Node.js is installed, run:

```bash
node tools/validate-pages.mjs
```

Do not use `START_HERE.html` as the Pages homepage. GitHub Pages automatically opens `index.html`; `START_HERE.html` is retained as a portable fallback.

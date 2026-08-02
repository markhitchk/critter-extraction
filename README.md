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

- Solo play, graphics, touch controls, profiles, inventory, and settings run entirely in the browser.
- Save data uses browser-local storage and does not automatically move between devices.
- Multiplayer uses the included PeerJS client, an external room-signaling service, and direct WebRTC connections. Some restrictive networks may still require a TURN relay, which GitHub Pages cannot provide.
- No service worker is installed, so updating the repository cannot leave an old cached game worker behind.

## Local check

If Node.js is installed, run:

```bash
node tools/validate-pages.mjs
```

Do not use `START_HERE.html` as the Pages homepage. GitHub Pages automatically opens `index.html`; `START_HERE.html` is retained as a portable fallback.

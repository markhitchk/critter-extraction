<div align="center">
  <img src="../../assets/branding/icon.svg" alt="Critter Extraction logo" width="95">

  # PORTABLE BUILD

  **Single-file gameplay · local launch · compatibility parity**
</div>

## Canonical files

The canonical portable document is:

```text
portable/START_HERE.html
```

The channel-root `START_HERE.html` is generated for backwards compatibility. Both must remain usable when opened from a local `file://` URL.

## Build flow

```bash
npm run build:portable
npm run check:portable
```

The builder packages the required runtime into the portable document. The parity check confirms that the generated compatibility copy matches the canonical source.

## Portable requirements

- Resolve embedded and relative resources without a web server.
- Avoid assumptions about the repository or GitHub Pages pathname.
- Preserve account creation, import/export, settings, inventory, gameplay, and recovery behavior where supported.
- Keep generated portable content synchronized with its source.
- Display clear limitations when browser security rules block online or external features.

## Network boundary

Opening from `file://` can behave differently across browsers. Multiplayer, remote profile URLs, service workers, fetch requests, and external resources may be restricted by browser policy. The portable build should fail clearly and keep offline-capable systems usable.

## Data safety

Portable gameplay still uses browser-local storage for the active origin or file context. Players should export a profile before switching browsers, moving files, clearing storage, or testing experimental builds.

Never bundle real player profiles, access tokens, room payloads, or private reports into a portable release package.

## Compatibility checklist

- [ ] `portable/START_HERE.html` opens directly from disk.
- [ ] The generated root copy matches the canonical portable file.
- [ ] Inline scripts pass syntax validation.
- [ ] Required branding and fallback assets are available.
- [ ] Account creation and local profile backup remain usable.
- [ ] Unsupported online features show an understandable message.
- [ ] No private test data is embedded in the generated file.

## Related documents

- **[Game Architecture](GAME_ARCHITECTURE.md)**
- **[Account System](ACCOUNT_SYSTEM.md)**
- **[Contributor Field Guide](../../CONTRIBUTING.md)**

---

<div align="center"><strong>Harley’s Studios · Portable Deployment</strong></div>

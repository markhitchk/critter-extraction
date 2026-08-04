<div align="center">
  <img src="../../assets/branding/icon.svg" alt="Critter Extraction logo" width="95">

  # ERROR SYSTEM

  **Stable codes · player-facing recovery · privacy-safe reports**
</div>

## Canonical implementation

The LIVE startup and reporting system lives in `core/error-system/`. Channel entry pages and compatibility adapters should route into that implementation rather than creating separate error logic.

Key components include:

- error catalog and stable category codes
- error sanitization and report generation
- startup monitoring and fatal-error routing
- recovery UI and fallback pages
- privacy-safe feedback integration

## Error identity

A report uses a stable category code, such as `CE-BOOT-JS-001`, plus a unique event ID for the individual occurrence. Stable codes identify the class of failure; event IDs distinguish separate incidents.

## Reporting rules

Reports may include safe technical context such as:

- game and loader version
- channel and pathname
- browser family and viewport size
- elapsed startup/report timing
- source type and sanitized display location
- online/offline state and generated error code

Reports must exclude:

- profile XML and account contents
- inventory, stash, and loadout contents
- room codes, invitations, and WebRTC descriptions
- IP addresses, tokens, clipboard data, and browser-storage dumps
- private images and unrelated personal information

## Recovery behavior

- Fatal startup errors should appear immediately.
- Recoverable rendering fallbacks should not be reported as fatal when gameplay remains usable.
- Missing-path routing should preserve the useful pathname while sanitizing query and hash information.
- A failed error UI must still provide a minimal fallback page.
- Recovery actions should explain what they change before clearing or replacing local data.

## Compatibility checklist

- [ ] Stable error codes still map to one catalog entry.
- [ ] New reports pass through the sanitizer.
- [ ] Fatal failures surface without waiting for a slow-start timer.
- [ ] Canvas or compatibility fallback remains recoverable when successful.
- [ ] Missing routes reach the correct channel-local error center.
- [ ] Reports contain no profile, room, token, or storage contents.

## Related documents

- **[Error Codes](../errors/ERROR_CODES.md)**
- **[Error Report Schema](../errors/ERROR_REPORT_SCHEMA.md)**
- **[Game Architecture](GAME_ARCHITECTURE.md)**
- **[Security and Player Privacy](../../SECURITY.md)**

---

<div align="center"><strong>Harley’s Studios · Recovery Systems</strong></div>

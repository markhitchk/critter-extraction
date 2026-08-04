<div align="center">
  <img src="assets/branding/icon.svg" alt="Critter Extraction logo" width="105">

  # SECURITY AND PLAYER PRIVACY

  **Protect accounts, rooms, reports, and the people behind them.**
</div>

> [!CAUTION]
> Never publish account XML, backup passwords, access tokens, room payloads, WebRTC signaling data, browser-storage contents, private profile images, IP addresses, or personal information in an issue, screenshot, log, test fixture, or pull request.

## Reporting a security concern

Report security concerns privately to the repository owner. Public issues are appropriate only after sensitive details have been removed and the report no longer exposes a player, credential, profile, room, or active exploit path.

A useful private report includes:

- the affected channel and version
- a concise description of the impact
- safe reproduction steps
- affected files or systems
- whether the issue exposes account data, multiplayer data, or code execution
- a sanitized screenshot or error code when useful

Do not include real credentials or another person’s private data as evidence.

## Browser security boundary

Critter Extraction is a static browser game with peer-to-peer multiplayer. It can provide encrypted profile backups, host-authoritative validation, local restrictions, global ban-list checks, and privacy-safe diagnostics, but it does not have a dedicated authoritative account server.

A player who controls their browser can modify local code or storage. Competitive enforcement and valuable cloud economies would require owner-controlled authentication and server authority.

## Protected information

| Keep private | Reason |
|:--|:--|
| Profile XML and backup codes | They can contain complete portable account data |
| Backup passwords | They protect encrypted exports |
| GitHub or API tokens | They can authorize account or repository actions |
| Room invitations and signaling payloads | They can expose active session details |
| Browser storage dumps | They may include profiles, settings, bans, or recovery data |
| IP addresses and device identifiers | They are not required for normal support reports |
| Private images and personal details | They are unrelated to diagnosing the game |

## Safe issue reports

The in-game Feedback Center is designed to produce privacy-safe diagnostics. Review every report before publishing. Remove names, room information, account contents, and any data that is not needed to reproduce the problem.

## Related documents

- **[Encrypted Profile Security](../docs/PROFILE-SECURITY.md)**
- **[Security and Ban System](security/README.md)**
- **[Error System Architecture](docs/architecture/ERROR_SYSTEM.md)**
- **[Multiplayer Architecture](docs/architecture/MULTIPLAYER.md)**

---

<div align="center">
  <strong>Harley’s Studios</strong><br>
  Security reports should help fix the game without exposing its players.
</div>

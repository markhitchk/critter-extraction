<div align="center">
  <img src="../assets/branding/icon.svg" alt="Critter Extraction logo" width="105">

  # SECURITY AND BAN SYSTEM

  **Host enforcement · repository-wide restrictions · privacy-respecting identity checks**

  <img alt="Peer-to-peer security" src="https://img.shields.io/badge/MODEL-PEER%20TO%20PEER-43b9ff?style=flat-square&labelColor=101820">
  <img alt="Host authoritative" src="https://img.shields.io/badge/AUTHORITY-HOST-20e3b2?style=flat-square&labelColor=101820">
</div>

> [!IMPORTANT]
> Critter Extraction is a static GitHub Pages game. Its security layer can reduce normal cheating and repeat ban evasion, but it cannot provide the same authority as an authenticated dedicated server.

## Restriction scopes

| Scope | Meaning | Storage |
|:--|:--|:--|
| **Host-local** | Blocks a player only from rooms created by that host | Host browser storage |
| **Repository-wide multiplayer** | Blocks matching identifiers from multiplayer across the published game | `security/bans.json` |

The player-facing notice must clearly identify which scope is active. A host-local restriction is not a global Critter Extraction ban.

## Privacy-respecting identifiers

Each local account receives a persistent `securityId` such as `csp_...`. A browser installation also receives a random install ID; only a short hash is shared during multiplayer checks.

A security packet can include:

- `securityId`
- `installHash`
- `accountIdHash`
- normalized `username`
- `recruitCode`
- `profileFingerprint`

The system does **not** collect IP addresses, MAC addresses, hardware serial numbers, contacts, files, or unrelated browsing data.

## Fair Play enforcement

The host validates gameplay actions including:

- movement and input shape
- firing, reloads, ammunition, damage, and healing
- interaction distance and message rate
- loot, gear ownership, drops, and extraction state
- respawn, scoring, and match-rule behavior

Repeated validated violations can remove a guest and create a host-local restriction.

### Automatic host-local escalation

1. First qualifying removal: **24 hours**
2. Second qualifying removal: **7 days**
3. Third and later qualifying removals: **permanent until manually removed**

Input-key representation differences such as the corrected `FP-INPUT-KEYS` case must not create strikes or automatic bans by themselves.

## Add a repository-wide multiplayer ban

Edit `security/bans.json` and add an enabled entry to the `bans` array. Use one or more identifiers. Matching any supplied identifier blocks multiplayer.

```json
{
  "id": "ban-2026-001",
  "enabled": true,
  "scope": "multiplayer",
  "reason": "Repeated cheating and Fair Play bypass attempts.",
  "createdAt": "2026-08-02T13:30:00Z",
  "expiresAt": null,
  "appealUrl": "",
  "identifiers": {
    "securityIds": ["csp_example"],
    "installHashes": [],
    "accountIdHashes": [],
    "usernames": ["example_user"],
    "recruitCodes": [],
    "profileFingerprints": []
  }
}
```

Use an ISO 8601 date for a temporary `expiresAt`. Use `null` for a permanent entry. Set `enabled` to `false` to preserve a record without enforcing it.

The strongest practical combination is usually `securityId`, `installHash`, and `profileFingerprint`. Username-only restrictions are easier to evade.

## Security Center

The in-game Security Center provides:

- current account identifiers
- global ban-list status
- manual host-local restrictions and unban controls
- recent security events
- downloadable sanitized security reports
- identity JSON for a cooperating player or investigation

Security logs remain local unless the user explicitly downloads or shares a report.

## Operational checklist

- [ ] Confirm whether the action is host-local or repository-wide.
- [ ] Record a clear reason without unnecessary personal details.
- [ ] Use the minimum identifiers needed for reliable matching.
- [ ] Add an expiration date when a permanent restriction is not justified.
- [ ] Keep profile XML, room payloads, tokens, and private connection data out of reports.
- [ ] Verify that key-normalization or network delay did not create a false Fair Play result.
- [ ] Provide an appeal path when appropriate.

## Security boundary

A determined player can clear storage, edit profile files, or run modified public JavaScript. Truly hard-to-evade global enforcement, ranked competition, or valuable account economies require owner-controlled authentication and authoritative server validation.

## Related documents

- **[Security and Player Privacy](../SECURITY.md)**
- **[Multiplayer Architecture](../docs/architecture/MULTIPLAYER.md)**
- **[Encrypted Profile Security](../../docs/PROFILE-SECURITY.md)**

---

<div align="center">
  <strong>Harley’s Studios · Multiplayer Security</strong><br>
  Enforce the match without invading the player.
</div>

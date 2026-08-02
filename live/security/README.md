# Critter Extraction Security and Ban System

This folder controls repository-wide multiplayer bans for Critter Extraction.

The browser game is hosted as a static GitHub Pages application and multiplayer is peer-to-peer. That means there is no dedicated account server with access to IP addresses, hardware serial numbers, or authoritative cloud accounts. The security layer therefore uses several non-invasive identifiers together and has the host enforce every restriction.

## Identifiers

Each local account receives a `securityId` such as `csp_...`. It is stored inside the account object, so it is included in downloaded XML profiles and normally follows the account to another browser.

Each browser installation also receives a random install ID. Only its short hash is sent to another player. The security packet can contain:

- `securityId`: strongest profile/XML identifier
- `installHash`: identifies the current browser installation
- `accountIdHash`: hash of the current local account ID
- `username`: normalized lowercase username
- `recruitCode`: account recruit code
- `profileFingerprint`: combined fingerprint of the profile security ID, recruit code, and username

A determined user can still modify a public browser game's JavaScript, clear browser storage, or edit an XML file. These identifiers are meant to stop normal ban evasion and repeat casual cheating; they are not equivalent to a dedicated authenticated game server.

## Automatic cheating bans

The existing host-authoritative Fair Play system validates movement, firing, input sequences, message rates, loot, gear ownership, healing, drops, interaction distance, and extraction state.

When Fair Play removes a guest after repeated violations, the security layer automatically creates a host-local ban:

1. First removal: 24 hours
2. Second removal: 7 days
3. Third and later removals: permanent until manually removed

Automatic bans remain in that host browser. They do not edit this repository automatically.

## Add a repository-wide ban

Edit `security/bans.json` and add an object to the `bans` array. Use one or more identifiers. Matching any supplied identifier blocks multiplayer.

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

Use an ISO 8601 date in `expiresAt` for a temporary ban. Use `null` for a permanent ban. Set `enabled` to `false` to keep an entry without enforcing it.

The strongest practical combination is usually `securityId` plus `installHash` plus `profileFingerprint`. A username-only ban is supported but is easy to evade by renaming the profile.

## Security Center

The game adds a **Security** button to the top menu. It provides:

- the current account's ban identifiers
- global ban-list status
- manual host-local bans
- local unban controls
- recent security events
- a downloadable security report

Use **Copy Identity JSON** to collect identifiers from a player who is cooperating with an investigation. A host can also export a report after Fair Play removes someone.

## Privacy and limitations

The system does not attempt invasive fingerprinting. It does not collect IP addresses, MAC addresses, hardware serial numbers, contacts, files, or unrelated browsing data. Security logs and host bans stay in local browser storage unless the user explicitly downloads a report.

For truly hard-to-evade global bans, ranked play, or valuable item economies, move multiplayer authority and account authentication to an owner-controlled backend. Peer-to-peer browser enforcement can reduce cheating but cannot make an unmodified client mandatory.

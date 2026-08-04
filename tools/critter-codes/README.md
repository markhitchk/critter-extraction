# Critter Codes registry generator

The published game contains SHA-256 hashes and internal reward IDs only. Keep the plaintext code list outside the repository.

## Local workflow

1. Create `tools/critter-codes/private-codes.json` on a trusted machine. This file is ignored by Git.
2. Add objects using the schema below.
3. Run:

```bash
node tools/critter-codes/generate-registry.mjs tools/critter-codes/private-codes.json live/core/rewards/critter-codes.registry.js
```

Example schema using a non-production placeholder:

```json
[
  {
    "code": "YOUR PRIVATE CODE",
    "id": "internal_bundle_id",
    "rewards": ["internal_reward_id"],
    "active": true,
    "startsAt": null,
    "expiresAt": null,
    "minimumVersion": "0.22.0",
    "perProfileLimit": 1,
    "totalLimit": 0,
    "category": "event",
    "theme": "snow",
    "notificationTitle": "Event Rewards Claimed",
    "notificationDescription": "Your event rewards are ready."
  }
]
```

`totalLimit` must remain `0` for the offline build. A non-zero global redemption limit requires an authoritative online verification service.

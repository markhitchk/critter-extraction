<div align="center">
  <img src="../../assets/branding/icon.svg" alt="Critter Extraction logo" width="95">

  # ACCOUNT SYSTEM

  **Local profiles · portable backups · progression compatibility**
</div>

> [!IMPORTANT]
> A Critter Extraction account is a complete player profile, not only a display name. Changes must preserve progression, inventory ownership, security metadata, settings, and portable backup compatibility.

## Account contents

A local profile can include:

- account ID, username, display name, bio, avatar, and appearance
- XP, level, Petals, career records, and statistics
- account stash, prepared inventory, equipment, and custom loadouts
- settings, recruitment data, transaction history, and recovery metadata
- security IDs and encrypted profile-export information

## Storage model

Profiles are stored in the browser and can be exported for transfer or recovery. Storage keys, IndexedDB names, account IDs, and save-field names are compatibility-sensitive.

Do not rename or delete them without:

1. a migration path
2. tests using older profiles
3. export/import verification
4. recovery-cache verification
5. clear failure handling

## Import and overwrite flow

- New account identities import as separate local profiles.
- Matching account IDs or usernames require explicit overwrite confirmation.
- Cancelling an overwrite must leave the existing profile untouched.
- Legacy profiles can be normalized only through bounded, documented migration rules.
- Invalid secure profiles must fail validation instead of being silently repaired.

## Portable profile security

Current exports use password-protected profile format v7. Compatible v6/CE6 exports remain importable. Backup passwords are session-only and are never stored inside exported XML.

Validation protects identifiers, progression, item IDs, stack limits, loadouts, statistics, and economy history. See **[Encrypted Profile Security](../../../docs/PROFILE-SECURITY.md)**.

## Compatibility checklist

- [ ] Existing profiles load without losing data.
- [ ] New profiles receive valid IDs and default fields.
- [ ] Stash, prepared inventory, and loadout ownership remain consistent.
- [ ] Petal limits and transaction history remain valid.
- [ ] XML download, URL import, file import, and recovery cache still work.
- [ ] Matching imports still require overwrite confirmation.
- [ ] Legacy migrations cannot hide tampering in already-secure profiles.

## Related documents

- **[Game Architecture](GAME_ARCHITECTURE.md)**
- **[Portable Build](PORTABLE_BUILD.md)**
- **[Security and Player Privacy](../../SECURITY.md)**

---

<div align="center"><strong>Harley’s Studios · Profile Compatibility Zone</strong></div>

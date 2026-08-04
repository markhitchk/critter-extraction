<div align="center">
  <img src="../live/assets/branding/icon.svg" alt="Critter Extraction logo" width="105">

  # ENCRYPTED PROFILE SECURITY

  **Portable profile format v7 · browser-native encryption · compatibility validation**

  <img alt="Current format v7" src="https://img.shields.io/badge/PROFILE%20FORMAT-v7-20e3b2?style=flat-square&labelColor=101820">
  <img alt="v6 compatible" src="https://img.shields.io/badge/IMPORT-v6%20%2F%20CE6%20COMPATIBLE-43b9ff?style=flat-square&labelColor=101820">
</div>

> [!IMPORTANT]
> Encryption protects exported profile files from casual reading and undetected editing. It does not turn a static browser game into an authoritative server-controlled account service.

## Current format

Critter Extraction’s current portable profile export is **format v7**. It keeps the password-protected encryption and validation model introduced by v6 while adding the current account-security and session-password controls.

Compatible v6 XML and `CE6.` backup data remain importable.

## Cryptographic design

- **AES-256-GCM** encrypts the account payload and provides authenticated tamper detection.
- **PBKDF2-HMAC-SHA-256** derives the encryption key from the user’s backup password.
- Each export uses a fresh random salt, IV, and authenticated nonce.
- Authenticated metadata binds the game version, export time, profile version, security version, nonce, and account fingerprint to the ciphertext.
- SHA-256 audit digests bind progression, inventory, loadout, and economy history inside the encrypted payload.
- The backup password is never written into the XML, backup text, or profile URL.

## Session password controls

The Account interface can remember the active backup password only for the current browser tab/session. Players can set, change, reveal, or forget that session password.

- The password is not written into local account data.
- The password is not included in XML exports.
- Changing the active password affects newly created backups, not old backup files.
- Closing or clearing the session removes the remembered password.

## Import validation

Secure imports are rejected when:

- the password is incorrect
- ciphertext or authenticated metadata was changed
- the account fingerprint does not match
- audit digests differ
- account or security identifiers are invalid
- XP, Petals, statistics, item IDs, stack limits, or loadout IDs violate profile rules
- transaction IDs are duplicated or transaction order/timestamps are invalid

Already-secure profiles should fail validation when tampered with. They must not be silently “fixed” in a way that hides modification.

## Legacy compatibility

Older XML v4/v5 files and v3 backup codes were encoded rather than strongly protected. They require an explicit legacy warning and bounded migration.

Legacy migration can normalize old values before creating a new secure export, but it must not weaken validation for a profile already marked as securely exported or verified.

## Browser-only security boundary

Critter Extraction is hosted as a static browser application. A player who controls the running browser can alter local runtime state before creating a new encrypted export. Encryption protects the portable file; it cannot prove that all gameplay leading to the file occurred on an unmodified client.

Competitive enforcement should combine:

- host-authoritative multiplayer validation
- Fair Play checks
- profile and economy validation
- security identifiers and ban scope
- eventually, owner-controlled authentication and server-held signing authority

## Player safety checklist

- [ ] Use a unique backup password.
- [ ] Store the password separately from the XML file.
- [ ] Keep at least one known-good backup.
- [ ] Never post profile XML or passwords in public issues.
- [ ] Verify the account name before confirming an overwrite import.
- [ ] Treat legacy profiles as untrusted until migrated and re-exported.

## Related documents

- **[Project Command Center](../README.md)**
- **[LIVE Account System](../live/docs/architecture/ACCOUNT_SYSTEM.md)**
- **[Security and Ban System](../live/security/README.md)**
- **[Security and Player Privacy](../live/SECURITY.md)**

---

<div align="center">
  <strong>Harley’s Studios · Profile Protection</strong><br>
  Keep the password private. Keep the backup recoverable.
</div>

# Encrypted profile security

Critter Extraction profile XML version 6 protects portable account backups with browser-native Web Crypto.

## Format

- AES-256-GCM encrypts the account payload and provides authenticated tamper detection.
- PBKDF2-HMAC-SHA-256 derives the encryption key from the user's backup password.
- Every export uses a new 128-bit salt, 96-bit IV, and random authenticated nonce.
- Authenticated metadata binds the game version, export time, profile version, security version, nonce, and account fingerprint to the ciphertext.
- SHA-256 audit digests bind progression, inventory, loadout, and the economy transaction list inside the encrypted payload.
- The password is never written into the XML or profile URL.

## Import validation

Version 6 imports are rejected when authentication fails, metadata is modified, the account fingerprint does not match, audit digests differ, or account values violate profile limits. Validation covers identifiers, XP, Petals, statistics, item IDs, stack limits, loadouts, transaction IDs, transaction ordering, and future timestamps.

Older XML v4/v5 files and v3 backup codes are not trusted because they were only encoded. They require an explicit warning, are marked `legacy-migrated`, and invalid values are sanitized before import.

## Browser-only security boundary

The game is hosted as a static browser application. Encryption protects a backup from editing or reading without its password, but it is not a substitute for an authoritative server. A player who controls the running browser can still alter local runtime state before creating a new encrypted export. Competitive enforcement should therefore combine this format with host validation, multiplayer fair-play checks, and eventually a server-held signing key or authoritative account service.

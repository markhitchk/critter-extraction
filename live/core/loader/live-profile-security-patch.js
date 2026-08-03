(() => {
  'use strict';

  const utils = window.__CRITTER_PATCH_UTILS__;
  if (!utils || !Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Profile security patch loaded before the Critter patch runtime');
  }

  const bodyOf = fn => {
    const source = fn.toString();
    return source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).replace(/^\n|\n\s*$/g, '');
  };

  function secureRuntimeSource() {
    function encodeUtf8Base64Url(text) {
      const bytes = new TextEncoder().encode(text); let bin = '';
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
    function decodeUtf8Base64Url(text) {
      const n = String(text || '').trim().replace(/-/g, '+').replace(/_/g, '/');
      const p = n + '='.repeat((4 - n.length % 4) % 4);
      const bytes = Uint8Array.from(atob(p), c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    const PROFILE_SECURITY_VERSION = 2;
    const PROFILE_XML_VERSION = 6;
    const PROFILE_KDF_ITERATIONS = 310000;
    const PROFILE_PASSWORD_MIN = 10;
    const PROFILE_MAX_BYTES = 2 * 1024 * 1024;
    const PROFILE_CLOCK_SKEW_MS = 5 * 60 * 1000;
    const utf8 = value => new TextEncoder().encode(String(value ?? ''));
    const bytesToBase64Url = bytes => {
      let bin = '';
      for (const byte of bytes) bin += String.fromCharCode(byte);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };
    const base64UrlToBytes = text => {
      const normalized = String(text || '').trim().replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    };
    const randomBytes = length => { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return bytes; };
    function canonicalJson(value) {
      if (value === null || typeof value !== 'object') return JSON.stringify(value);
      if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
      return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
    }
    async function sha256Base64Url(value) {
      const bytes = value instanceof Uint8Array ? value : utf8(value);
      return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
    }
    async function deriveProfileKey(passphrase, salt, usages) {
      const material = await crypto.subtle.importKey('raw', utf8(passphrase), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name:'PBKDF2', hash:'SHA-256', salt, iterations:PROFILE_KDF_ITERATIONS },
        material,
        { name:'AES-GCM', length:256 },
        false,
        usages
      );
    }
    function requireProfileCrypto() {
      if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw new Error('Secure profile encryption is not supported by this browser');
    }
    function promptProfilePassword(mode) {
      const verb = mode === 'import' ? 'unlock' : 'protect';
      const first = prompt(`Enter a backup password to ${verb} this Critter Extraction profile.\n\nUse at least ${PROFILE_PASSWORD_MIN} characters. This password is not stored in the XML.`);
      if (first == null) throw new Error('Profile operation cancelled');
      if (first.length < PROFILE_PASSWORD_MIN) throw new Error(`Backup password must be at least ${PROFILE_PASSWORD_MIN} characters`);
      if (mode !== 'import') {
        const second = prompt('Enter the same backup password again.');
        if (second == null) throw new Error('Profile operation cancelled');
        if (first !== second) throw new Error('Backup passwords did not match');
      }
      return first;
    }
    function profileSecurityId(account) {
      let id = String(account?.securityId || '');
      if (!/^csp_[a-f0-9]{24,64}$/i.test(id)) {
        id = 'csp_' + [...randomBytes(18)].map(value => value.toString(16).padStart(2, '0')).join('');
        account.securityId = id;
        account.securityCreatedAt = Date.now();
      }
      account.securityVersion = PROFILE_SECURITY_VERSION;
      return id.toLowerCase();
    }
    function validateProfileSlots(slots, limit, label) {
      if (!Array.isArray(slots) || slots.length > limit) throw new Error(`${label} has an invalid slot count`);
      for (const entry of slots) {
        if (entry == null) continue;
        if (!entry || typeof entry !== 'object' || !ITEMS[entry.id]) throw new Error(`${label} contains an unknown item`);
        const qty = Number(entry.qty), max = Number(ITEMS[entry.id].stack || 1);
        if (!Number.isInteger(qty) || qty < 1 || qty > max) throw new Error(`${label} contains an impossible ${entry.id} stack`);
        if (entry.locked != null && typeof entry.locked !== 'boolean') throw new Error(`${label} contains invalid item flags`);
        if (entry.favorite != null && typeof entry.favorite !== 'boolean') throw new Error(`${label} contains invalid item flags`);
      }
    }
    function sanitizeLegacySlots(slots, limit) {
      return normalizeSlots(slots, limit).map(entry => {
        if (!entry) return null;
        return { ...entry, qty:Math.min(Number(ITEMS[entry.id]?.stack || 1), Math.max(1, Math.floor(Number(entry.qty) || 1))) };
      });
    }
    function validateProfileTransactions(transactions) {
      if (!Array.isArray(transactions) || transactions.length > 40) throw new Error('Economy transaction history is invalid');
      const ids = new Set(); let lastAt = 0;
      for (const transaction of transactions) {
        if (!transaction || typeof transaction !== 'object') throw new Error('Economy transaction history is invalid');
        const id = safeText(transaction.id, 80);
        if (!id || ids.has(id)) throw new Error('Economy transaction IDs are missing or duplicated');
        ids.add(id);
        const at = Number(transaction.at);
        if (!Number.isFinite(at) || at <= 0 || at > Date.now() + PROFILE_CLOCK_SKEW_MS || at < lastAt) throw new Error('Economy transaction timestamps are invalid');
        lastAt = at;
        for (const key of ['amount','qty']) {
          if (transaction[key] == null) continue;
          const value = Number(transaction[key]);
          if (!Number.isInteger(value) || Math.abs(value) > PETAL_CAP) throw new Error(`Economy transaction ${key} is invalid`);
        }
        if (transaction.itemId && !ITEMS[transaction.itemId]) throw new Error('Economy transaction references an unknown item');
      }
    }
    function validateSecureProfileAccount(account) {
      if (!account || typeof account !== 'object' || Array.isArray(account)) throw new Error('Encrypted profile account is missing');
      if (!/^[A-Za-z0-9_-]{1,96}$/.test(String(account.id || ''))) throw new Error('Account ID is invalid');
      if (!/^csp_[a-f0-9]{24,64}$/i.test(String(account.securityId || ''))) throw new Error('Security ID is invalid');
      if (!/^[A-Za-z0-9_-]{1,18}$/.test(String(account.username || ''))) throw new Error('Username is invalid');
      if (!safeText(account.displayName, 24)) throw new Error('Display name is invalid');
      const xp = Number(account.xp), petals = Number(account.petals);
      if (!Number.isSafeInteger(xp) || xp < 0 || xp > 1_000_000_000_000) throw new Error('XP is outside the secure profile limits');
      if (!Number.isInteger(petals) || petals < 0 || petals > PETAL_CAP) throw new Error('Petal balance is outside the secure profile limits');
      const stats = account.stats || {};
      for (const key of ['extracts','berries','kills','matches']) {
        const value = Number(stats[key]);
        if (!Number.isSafeInteger(value) || value < 0 || value > 10_000_000) throw new Error(`${key} statistics are outside the secure profile limits`);
      }
      if (stats.extracts > stats.matches) throw new Error('Extract count cannot exceed match count');
      if (stats.kills > Math.max(500, stats.matches * 500)) throw new Error('Kill count is not plausible for the recorded matches');
      if (stats.berries > Math.max(1000, stats.matches * 1000)) throw new Error('Berry count is not plausible for the recorded matches');
      validateProfileSlots(account.stash, STASH_COUNT, 'Account stash');
      validateProfileSlots(account.prepared, SLOT_COUNT, 'Prepared loadout');
      validateProfileTransactions(Array.isArray(account.economyTransactions) ? account.economyTransactions : []);
      if (account.loadoutId && !LOADOUTS[account.loadoutId]) throw new Error('Loadout ID is invalid');
      if (account.equippedWeaponId && !WEAPONS[account.equippedWeaponId]) throw new Error('Equipped weapon is invalid');
      if (account.equippedArmorId && !ARMORS[account.equippedArmorId]) throw new Error('Equipped armor is invalid');
      return account;
    }
    async function profileAudit(account) {
      const snapshot = {
        id:account.id, securityId:account.securityId, username:account.username,
        xp:account.xp, petals:account.petals, stats:account.stats,
        stash:account.stash, prepared:account.prepared, loadoutId:account.loadoutId,
        equippedWeaponId:account.equippedWeaponId, equippedArmorId:account.equippedArmorId,
        economyTransactions:account.economyTransactions || []
      };
      return {
        schema:1,
        snapshotDigest:await sha256Base64Url(canonicalJson(snapshot)),
        transactionDigest:await sha256Base64Url(canonicalJson(account.economyTransactions || []))
      };
    }
    async function verifyProfileAudit(account, audit) {
      if (!audit || audit.schema !== 1) throw new Error('Encrypted profile audit record is missing');
      const expected = await profileAudit(account);
      if (audit.snapshotDigest !== expected.snapshotDigest || audit.transactionDigest !== expected.transactionDigest) throw new Error('Encrypted profile audit does not match the account data');
    }
    function accountToCacheXml(account) {
      const doc = document.implementation.createDocument('', 'CritterExtractionProfile', null);
      const root = doc.documentElement; root.setAttribute('version', '5'); root.setAttribute('studio', "Harley's Studios"); root.setAttribute('cacheOnly', 'true');
      const payload = doc.createElement('ProfileData'); payload.textContent = encodeUtf8Base64Url(JSON.stringify({ type:'critter-account-xml-v5', account })); payload.setAttribute('encoding', 'base64url-json'); root.appendChild(payload);
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc);
    }
    async function accountToXml(account, suppliedPassword = '') {
      requireProfileCrypto();
      profileSecurityId(account);
      account.securityTrust = 'encrypted-v6';
      account.securityRevision = Math.max(0, Math.floor(Number(account.securityRevision) || 0)) + 1;
      account.securityLastExportAt = Date.now();
      validateSecureProfileAccount(account);
      const password = suppliedPassword || promptProfilePassword('export');
      const exportedAt = new Date().toISOString(), salt = randomBytes(16), iv = randomBytes(12), nonce = bytesToBase64Url(randomBytes(16));
      const fingerprint = await sha256Base64Url(`${account.securityId}|${account.id}|${String(account.username).toLowerCase()}`);
      const aadObject = { type:'critter-profile-aad-v1', version:PROFILE_XML_VERSION, securityVersion:PROFILE_SECURITY_VERSION, gameVersion:GAME_VERSION, exportedAt, nonce, fingerprint };
      const aadText = canonicalJson(aadObject);
      const payloadObject = { type:'critter-account-xml-v6', version:PROFILE_XML_VERSION, securityVersion:PROFILE_SECURITY_VERSION, issuedAt:exportedAt, account:deepCopy(account), audit:await profileAudit(account) };
      const key = await deriveProfileKey(password, salt, ['encrypt']);
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv, additionalData:utf8(aadText), tagLength:128 }, key, utf8(canonicalJson(payloadObject))));
      const cipherDigest = await sha256Base64Url(encrypted);
      const doc = document.implementation.createDocument('', 'CritterExtractionProfile', null), root = doc.documentElement;
      root.setAttribute('version', String(PROFILE_XML_VERSION)); root.setAttribute('studio', "Harley's Studios"); root.setAttribute('gameVersion', GAME_VERSION); root.setAttribute('exportedAt', exportedAt); root.setAttribute('encrypted', 'true');
      const add = (name, value) => { const node = doc.createElement(name); node.textContent = String(value ?? ''); root.appendChild(node); return node; };
      add('DisplayName', account.displayName); add('Username', account.username); if (/^https?:/i.test(account.avatar || '')) add('AvatarURL', account.avatar);
      const security = doc.createElement('ProfileSecurity'); security.setAttribute('version', String(PROFILE_SECURITY_VERSION)); security.setAttribute('algorithm', 'AES-256-GCM'); security.setAttribute('kdf', 'PBKDF2-HMAC-SHA-256'); security.setAttribute('iterations', String(PROFILE_KDF_ITERATIONS)); security.setAttribute('cipherDigest', cipherDigest); security.setAttribute('fingerprint', fingerprint); root.appendChild(security);
      for (const [name, value] of [['Salt',bytesToBase64Url(salt)],['IV',bytesToBase64Url(iv)],['AuthenticatedMetadata',encodeUtf8Base64Url(aadText)],['EncryptedProfileData',bytesToBase64Url(encrypted)]]) {
        const node = doc.createElement(name); node.textContent = value; security.appendChild(node);
      }
      window.CritterSecurityRuntime?.log?.('secure-profile-exported',{profileVersion:PROFILE_XML_VERSION,securityId:account.securityId,revision:account.securityRevision});
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc);
    }
    async function accountFromXml(text) {
      if (utf8(String(text)).byteLength > PROFILE_MAX_BYTES) throw new Error('Profile XML is too large');
      const doc = new DOMParser().parseFromString(String(text), 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
      const root = doc.documentElement;
      if (!root || root.nodeName !== 'CritterExtractionProfile') throw new Error('Not a Critter Extraction profile');
      const version = Number(root.getAttribute('version') || 0), security = root.querySelector('ProfileSecurity'), encryptedNode = security?.querySelector('EncryptedProfileData');
      if (version >= PROFILE_XML_VERSION || encryptedNode) {
        requireProfileCrypto();
        if (!security || !encryptedNode) throw new Error('Encrypted profile security envelope is incomplete');
        if (security.getAttribute('algorithm') !== 'AES-256-GCM' || security.getAttribute('kdf') !== 'PBKDF2-HMAC-SHA-256') throw new Error('Unsupported encrypted profile algorithm');
        if (Number(security.getAttribute('iterations')) !== PROFILE_KDF_ITERATIONS) throw new Error('Unsupported encrypted profile key settings');
        const password = promptProfilePassword('import'), salt = base64UrlToBytes(security.querySelector('Salt')?.textContent), iv = base64UrlToBytes(security.querySelector('IV')?.textContent), encrypted = base64UrlToBytes(encryptedNode.textContent), aadText = decodeUtf8Base64Url(security.querySelector('AuthenticatedMetadata')?.textContent);
        if (salt.length !== 16 || iv.length !== 12 || !encrypted.length || !aadText) throw new Error('Encrypted profile security values are invalid');
        const digest = await sha256Base64Url(encrypted);
        if (digest !== security.getAttribute('cipherDigest')) throw new Error('Encrypted profile data is corrupted');
        const aad = JSON.parse(aadText);
        if (aad.type !== 'critter-profile-aad-v1' || aad.version !== PROFILE_XML_VERSION || aad.securityVersion !== PROFILE_SECURITY_VERSION) throw new Error('Encrypted profile metadata is invalid');
        if (aad.fingerprint !== security.getAttribute('fingerprint')) throw new Error('Encrypted profile fingerprint is invalid');
        let plaintext;
        try {
          const key = await deriveProfileKey(password, salt, ['decrypt']);
          plaintext = await crypto.subtle.decrypt({ name:'AES-GCM', iv, additionalData:utf8(aadText), tagLength:128 }, key, encrypted);
        } catch (_) {
          window.CritterSecurityRuntime?.log?.('secure-profile-import-rejected',{reason:'authentication-failed'});
          throw new Error('Wrong backup password or modified encrypted profile');
        }
        const pack = JSON.parse(new TextDecoder().decode(plaintext));
        if (!pack || pack.type !== 'critter-account-xml-v6' || pack.version !== PROFILE_XML_VERSION || !pack.account) throw new Error('Unsupported encrypted profile payload');
        validateSecureProfileAccount(pack.account);
        const fingerprint = await sha256Base64Url(`${pack.account.securityId}|${pack.account.id}|${String(pack.account.username).toLowerCase()}`);
        if (fingerprint !== aad.fingerprint) throw new Error('Encrypted profile identity does not match its security envelope');
        await verifyProfileAudit(pack.account, pack.audit);
        pack.account.securityTrust = 'encrypted-v6'; pack.account.securityVersion = PROFILE_SECURITY_VERSION; pack.account.securityLastVerifiedAt = Date.now();
        window.CritterSecurityRuntime?.log?.('secure-profile-import-verified',{profileVersion:PROFILE_XML_VERSION,securityId:pack.account.securityId,revision:pack.account.securityRevision||0});
        return pack.account;
      }
      const payload = root.querySelector('ProfileData');
      if (!payload) throw new Error('ProfileData is missing');
      const pack = JSON.parse(decodeUtf8Base64Url(payload.textContent));
      if (!pack || !['critter-account-xml-v4','critter-account-xml-v5'].includes(pack.type) || !pack.account) throw new Error('Unsupported profile XML');
      if (root.getAttribute('cacheOnly') === 'true') return pack.account;
      const allowLegacy = confirm('This is an older unencrypted profile. It cannot prove that its progress was not edited.\n\nImport it as an untrusted legacy profile and sanitize invalid values?');
      if (!allowLegacy) throw new Error('Legacy profile import cancelled');
      const legacy = deepCopy(pack.account);
      profileSecurityId(legacy); legacy.securityTrust = 'legacy-migrated'; legacy.securityMigratedAt = Date.now();
      legacy.petals = safePetals(legacy.petals); legacy.xp = Math.max(0, Math.min(1_000_000_000_000, Math.floor(Number(legacy.xp) || 0)));
      legacy.stats = {extracts:0,berries:0,kills:0,matches:0,...(legacy.stats||{})};
      for (const key of ['extracts','berries','kills','matches']) legacy.stats[key] = Math.max(0, Math.min(10_000_000, Math.floor(Number(legacy.stats[key]) || 0)));
      legacy.stats.extracts = Math.min(legacy.stats.extracts, legacy.stats.matches);
      legacy.stash = sanitizeLegacySlots(legacy.stash, STASH_COUNT); legacy.prepared = sanitizeLegacySlots(legacy.prepared, SLOT_COUNT);
      validateSecureProfileAccount(legacy);
      window.CritterSecurityRuntime?.log?.('legacy-profile-migrated',{securityId:legacy.securityId});
      return legacy;
    }
  }

  function downloadSource() {
    async function downloadProfileXml(account) {
      try {
        const xml = await accountToXml(account), blob = new Blob([xml], { type:'application/xml;charset=utf-8' }), url = URL.createObjectURL(blob);
        saveDB();
        const link = document.createElement('a'); link.href = url; link.download = `${safeText(account.username,18) || 'critter'}-secure-critter-extraction-account.xml`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast('Encrypted account downloaded');
      } catch (error) { console.error(error); toast(error?.message || 'Secure account download failed', 3600); }
    }
    async function profileUrlFor(account) {
      const xml = await accountToXml(account), base = location.href.split('#')[0];
      saveDB();
      return `${base}#profile=${encodeUtf8Base64Url(xml)}`;
    }
    async function copyProfileUrl(account) {
      try {
        const url = await profileUrlFor(account);
        try { await navigator.clipboard.writeText(url); toast('Encrypted Profile URL copied'); }
        catch (_) { dom.backupTitle.textContent='Encrypted Profile URL';dom.backupHelp.textContent='Keep this URL and its password private. Paste it into Import XML URL on the destination browser.';dom.backupCode.value=url;dom.applyImportBtn.hidden=true;dom.backupModal.showModal(); }
      } catch (error) { console.error(error); toast(error?.message || 'Could not create encrypted Profile URL', 3600); }
    }
  }

  function backupSource() {
    async function openBackupExport(id) {
      const a = db.accounts.find(x => x.id === id); if (!a) return;
      try {
        const xml = await accountToXml(a); saveDB();
        dom.backupTitle.textContent = 'Encrypted Account Backup'; dom.backupHelp.textContent = 'This CE6 backup contains AES-256-GCM encrypted XML. Keep the backup password separate.';
        dom.backupCode.readOnly = true; dom.backupCode.value = 'CE6.' + encodeUtf8Base64Url(xml); dom.applyImportBtn.hidden = true;
        dom.accountsModal.close(); dom.backupModal.showModal();
      } catch (error) { console.error(error); toast(error?.message || 'Encrypted backup failed', 3600); }
    }
    function openBackupImport() {
      dom.backupTitle.textContent = 'Import Secure Account'; dom.backupHelp.textContent = 'Paste a CE6 encrypted backup code. Older unencrypted codes are treated as untrusted legacy imports.';
      dom.backupCode.readOnly = false; dom.backupCode.value = ''; dom.applyImportBtn.hidden = false; dom.accountsModal.close(); dom.backupModal.showModal();
    }
    dom.applyImportBtn.onclick = async () => {
      try {
        const raw = String(dom.backupCode.value || '').trim();
        if (raw.startsWith('CE6.')) {
          await importProfileXmlText(decodeUtf8Base64Url(raw.slice(4))); dom.backupModal.close(); return;
        }
        const pack = decodeBackup(raw); if (!pack || pack.type !== 'critter-account-v3' || !pack.account) throw new Error('Invalid backup');
        if (!confirm('This older backup code is not encrypted or tamper-evident. Import it as an untrusted legacy account?')) return toast('Legacy import cancelled');
        const legacy = deepCopy(pack.account); profileSecurityId(legacy); legacy.securityTrust='legacy-migrated'; legacy.securityMigratedAt=Date.now();
        legacy.petals=safePetals(legacy.petals); legacy.xp=Math.max(0,Math.min(1_000_000_000_000,Math.floor(Number(legacy.xp)||0))); legacy.stats={extracts:0,berries:0,kills:0,matches:0,...(legacy.stats||{})};
        for(const key of ['extracts','berries','kills','matches'])legacy.stats[key]=Math.max(0,Math.min(10_000_000,Math.floor(Number(legacy.stats[key])||0))); legacy.stats.extracts=Math.min(legacy.stats.extracts,legacy.stats.matches); legacy.stash=sanitizeLegacySlots(legacy.stash,STASH_COUNT); legacy.prepared=sanitizeLegacySlots(legacy.prepared,SLOT_COUNT); validateSecureProfileAccount(legacy);
        if (await installImportedAccount(legacy)) dom.backupModal.close();
      } catch (error) { console.error(error); toast(error?.message || 'That secure backup is not valid', 3600); }
    };
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const { one } = utils;

    source = one(
      source,
      'secure XML profile v6 crypto runtime',
      /  function encodeUtf8Base64Url\(text\) \{[\s\S]*?  function normalizeImportedAccount\(source\) \{/,
      bodyOf(secureRuntimeSource) + '\n  function normalizeImportedAccount(source) {'
    );

    source = one(
      source,
      'encrypted profile cache writer',
      /      if \(account && typeof accountToXml === 'function'\) localStorage\.setItem\(PROFILE_XML_CACHE_KEY, accountToXml\(account\)\);/,
      "      if (account && typeof accountToCacheXml === 'function') localStorage.setItem(PROFILE_XML_CACHE_KEY, accountToCacheXml(account));"
    );

    source = one(
      source,
      'async encrypted account download',
      /  function downloadProfileXml\(account\) \{[\s\S]*?\n  \}\n  function profileUrlFor\(account\) \{[\s\S]*?\n  \}\n  async function copyProfileUrl\(account\) \{[\s\S]*?\n  \}/,
      bodyOf(downloadSource)
    );

    source = source.replace(
      /  async function importProfileXmlText\(text\) \{ if \(await installImportedAccount\(accountFromXml\(text\)\) && dom\.accountsModal\.open\) dom\.accountsModal\.close\(\); \}/,
      '  async function importProfileXmlText(text) { const account=await accountFromXml(text); if (await installImportedAccount(account) && dom.accountsModal.open) dom.accountsModal.close(); }'
    ).replace(
      /  async function importProfileXmlText\(text\) \{ if \(installImportedAccount\(accountFromXml\(text\)\) && dom\.accountsModal\.open\) dom\.accountsModal\.close\(\); \}/,
      '  async function importProfileXmlText(text) { const account=await accountFromXml(text); if (await installImportedAccount(account) && dom.accountsModal.open) dom.accountsModal.close(); }'
    );

    source = one(
      source,
      'encrypted backup code export',
      /  function openBackupExport\(id\) \{[\s\S]*?\n  \}\n  function openBackupImport\(\) \{[\s\S]*?\n  \}\n  dom\.applyImportBtn\.onclick = \(\) => \{[\s\S]*?\n  \};/,
      bodyOf(backupSource) + `
  /* Profile security compatibility anchors for the existing base loader.
  async function importProfileXmlText(text) { if (installImportedAccount(accountFromXml(text)) && dom.accountsModal.open) dom.accountsModal.close(); }
  dom.applyImportBtn.onclick = () => {
    try {
      const pack = decodeBackup(dom.backupCode.value); if (!pack || pack.type !== 'critter-account-v3' || !pack.account) throw new Error('Invalid backup');
      if (installImportedAccount(pack.account)) dom.backupModal.close();
    } catch (_) { toast('That backup code is not valid'); }
  };
    dom.backupTitle.textContent = 'Import Account'; dom.backupHelp.textContent = 'Paste a Critter Extraction account backup code. It restores a separate local account with its profile, progress, stash, loadout, currency, settings, and statistics.';
  */`
    );

    return source;
  });
})();

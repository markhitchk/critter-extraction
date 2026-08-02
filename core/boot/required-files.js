(() => {
  'use strict';

  window.CritterRequiredFiles = Object.freeze([
    'styles.css', 'core/loader/game-loader.js', 'core/game/game-core.js',
    'core/rendering/model-library.js', 'assets/vendor/peerjs.min.js',
    'security/bans.json'
  ]);

  const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  if (!nativeFetch) return;

  const STORAGE_KEY = 'critterExtractionInventory';
  const LEGACY_STORAGE_PREFIX = 'critterExtraction3DInventory';
  const BAN_URLS = [
    `./security/bans.json?banCheck=${Date.now()}`,
    `https://raw.githubusercontent.com/markhitchk/critter-extraction/main/security/bans.json?banCheck=${Date.now()}`
  ];

  const gate = {
    status: 'checking',
    bans: [],
    match: null,
    account: null,
    matchedIdentifiers: [],
    checkedAt: 0
  };
  window.CritterBanGate = gate;

  const normalize = value => String(value ?? '').trim();
  const normalizeLower = value => normalize(value).toLowerCase();
  const normalizeUpper = value => normalize(value).toUpperCase();
  const unique = (values, transform = normalize) => [...new Set((values || []).map(transform).filter(Boolean))];

  function readDatabaseCandidates() {
    const candidates = [];
    try {
      const stable = localStorage.getItem(STORAGE_KEY);
      if (stable) candidates.push({ key: STORAGE_KEY, raw: stable, priority: Number.MAX_SAFE_INTEGER });
      const legacy = localStorage.getItem(LEGACY_STORAGE_PREFIX);
      if (legacy) candidates.push({ key: LEGACY_STORAGE_PREFIX, raw: legacy, priority: Number.MAX_SAFE_INTEGER - 1 });
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || key === STORAGE_KEY || key === LEGACY_STORAGE_PREFIX || !key.startsWith(`${LEGACY_STORAGE_PREFIX}_`)) continue;
        const raw = localStorage.getItem(key);
        if (raw) candidates.push({ key, raw, priority: 0 });
      }
    } catch (_) { }
    return candidates;
  }

  function readActiveAccount() {
    let best = null;
    let bestScore = -Infinity;
    for (const candidate of readDatabaseCandidates()) {
      try {
        const parsed = JSON.parse(candidate.raw);
        if (!parsed || !Array.isArray(parsed.accounts) || !parsed.accounts.length) continue;
        const account = parsed.accounts.find(item => item && item.id === parsed.activeId) || parsed.accounts[0];
        if (!account || typeof account !== 'object') continue;
        const score = candidate.priority + (Number(parsed.updatedAt) || 0);
        if (score > bestScore) {
          best = account;
          bestScore = score;
        }
      } catch (_) { }
    }
    return best;
  }

  function collectDeepValues(value, output, seen = new Set(), depth = 0) {
    if (depth > 7 || value == null) return;
    if (typeof value === 'string' || typeof value === 'number') {
      output.push(String(value));
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(item => collectDeepValues(item, output, seen, depth + 1));
      return;
    }
    Object.values(value).forEach(item => collectDeepValues(item, output, seen, depth + 1));
  }

  function directFieldValues(account, names) {
    const results = [];
    const wanted = new Set(names.map(name => name.toLowerCase()));
    const visit = (value, seen = new Set(), depth = 0) => {
      if (!value || typeof value !== 'object' || depth > 6 || seen.has(value)) return;
      seen.add(value);
      for (const [key, child] of Object.entries(value)) {
        if (wanted.has(String(key).toLowerCase()) && (typeof child === 'string' || typeof child === 'number')) results.push(String(child));
        if (child && typeof child === 'object') visit(child, seen, depth + 1);
      }
    };
    visit(account);
    return results;
  }

  function buildIdentity(account) {
    const allValues = [];
    collectDeepValues(account, allValues);
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !/critter|security|install|profile/i.test(key)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        allValues.push(raw);
        try { collectDeepValues(JSON.parse(raw), allValues); } catch (_) { }
      }
    } catch (_) { }

    return {
      securityIds: unique([
        ...directFieldValues(account, ['securityId', 'securityID']),
        ...allValues.filter(value => /^csp_[a-f0-9]{24,64}$/i.test(normalize(value)))
      ], normalizeLower),
      installHashes: unique(directFieldValues(account, ['installHash', 'installationHash']), normalizeLower),
      accountIdHashes: unique(directFieldValues(account, ['accountIdHash', 'accountHash']), normalizeLower),
      usernames: unique([account?.username], normalizeLower),
      recruitCodes: unique([account?.recruitCode, ...directFieldValues(account, ['recruitCode'])], normalizeUpper),
      profileFingerprints: unique(directFieldValues(account, ['profileFingerprint', 'fingerprint']), normalizeLower)
    };
  }

  function activeBan(ban) {
    if (!ban || ban.enabled !== true) return false;
    if (!ban.expiresAt) return true;
    const expiry = Date.parse(ban.expiresAt);
    return !Number.isFinite(expiry) || expiry > Date.now();
  }

  function findMatch(bans, identity) {
    const normalizers = {
      securityIds: normalizeLower,
      installHashes: normalizeLower,
      accountIdHashes: normalizeLower,
      usernames: normalizeLower,
      recruitCodes: normalizeUpper,
      profileFingerprints: normalizeLower
    };
    for (const ban of bans) {
      if (!activeBan(ban)) continue;
      const identifiers = ban.identifiers || {};
      const matched = [];
      for (const [key, transform] of Object.entries(normalizers)) {
        const bannedValues = new Set(unique(identifiers[key], transform));
        if (!bannedValues.size) continue;
        if ((identity[key] || []).some(value => bannedValues.has(transform(value)))) matched.push(key);
      }
      if (matched.length) return { ban, matched };
    }
    return null;
  }

  async function loadBanList() {
    let lastError = null;
    for (const url of BAN_URLS) {
      try {
        const response = await nativeFetch(url, { cache: 'no-store', credentials: 'omit' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data || !Array.isArray(data.bans)) throw new Error('Invalid ban-list format');
        return data.bans;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Ban list unavailable');
  }

  function scopeBlocksEntireGame(scope) {
    return ['all', 'game', 'full', 'account'].includes(normalizeLower(scope));
  }

  function humanScope(scope) {
    return scopeBlocksEntireGame(scope) ? 'All game access' : 'Multiplayer access';
  }

  function matchedLabel(key) {
    return ({
      securityIds: 'Security ID',
      installHashes: 'Install hash',
      accountIdHashes: 'Account ID hash',
      usernames: 'Username',
      recruitCodes: 'Recruit code',
      profileFingerprints: 'Profile fingerprint'
    })[key] || key;
  }

  function onBodyReady(callback) {
    if (document.body) callback();
    else document.addEventListener('DOMContentLoaded', callback, { once: true });
  }

  function markBootHandled(message) {
    try { window.__CRITTER_BOOT__?.markReady?.(message); } catch (_) { }
    try { window.__critterBootReport?.('ready', message); } catch (_) { }
  }

  function installInputBlocker() {
    if (window.__CRITTER_BAN_INPUT_BLOCKER__) return;
    window.__CRITTER_BAN_INPUT_BLOCKER__ = true;
    const stop = event => {
      if (!window.__CRITTER_ACCOUNT_BLOCKED__) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      if (path.some(node => node && node.id === 'critter-ban-screen')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend', 'wheel', 'contextmenu'].forEach(type => {
      document.addEventListener(type, stop, { capture: true, passive: false });
    });
  }

  function showBanScreen(match, account) {
    const ban = match.ban;
    gate.status = 'blocked';
    gate.match = ban;
    gate.account = account;
    gate.matchedIdentifiers = match.matched.slice();
    window.__CRITTER_ACCOUNT_BLOCKED__ = true;
    installInputBlocker();
    try { document.exitPointerLock?.(); } catch (_) { }
    markBootHandled('Account access blocked by the repository ban list.');

    onBodyReady(() => {
      if (document.getElementById('critter-ban-screen')) return;
      document.documentElement.classList.add('critter-account-banned');

      const style = document.createElement('style');
      style.id = 'critter-ban-style';
      style.textContent = `
        html.critter-account-banned, html.critter-account-banned body { min-height:100%; overflow:auto !important; background:#070810 !important; }
        html.critter-account-banned #app, html.critter-account-banned #studioBoot, html.critter-account-banned #dropLoading,
        html.critter-account-banned #critter-emergency, html.critter-account-banned .critter-error-overlay { display:none !important; }
        #critter-ban-screen { position:fixed; inset:0; z-index:2147483647; overflow:auto; display:grid; place-items:center; padding:24px; color:#f4f7ff; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:radial-gradient(circle at 50% 0%,rgba(255,62,96,.22),transparent 42%),linear-gradient(145deg,#070810,#111226 60%,#070810); }
        #critter-ban-screen * { box-sizing:border-box; }
        #critter-ban-screen .ban-card { width:min(680px,100%); padding:clamp(24px,5vw,44px); border:1px solid rgba(255,82,112,.78); border-radius:26px; background:linear-gradient(180deg,rgba(28,29,53,.98),rgba(12,13,27,.98)); box-shadow:0 28px 90px rgba(0,0,0,.62),0 0 44px rgba(255,56,91,.15); }
        #critter-ban-screen .ban-mark { width:72px; height:72px; display:grid; place-items:center; margin:0 auto 18px; border:2px solid #ff526f; border-radius:50%; color:#ff6d87; font-size:38px; font-weight:900; box-shadow:0 0 28px rgba(255,82,111,.28); }
        #critter-ban-screen .ban-eyebrow { margin:0 0 8px; color:#ff7890; text-align:center; font-size:12px; font-weight:900; letter-spacing:.18em; }
        #critter-ban-screen h1 { margin:0; text-align:center; font-size:clamp(30px,6vw,48px); line-height:1.04; }
        #critter-ban-screen .ban-summary { margin:16px auto 26px; max-width:560px; color:#c9cee2; text-align:center; line-height:1.65; }
        #critter-ban-screen .ban-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:0 0 18px; }
        #critter-ban-screen .ban-detail { min-width:0; padding:14px 16px; border:1px solid rgba(132,141,184,.24); border-radius:15px; background:rgba(255,255,255,.035); }
        #critter-ban-screen .ban-detail.full { grid-column:1/-1; }
        #critter-ban-screen .ban-detail small { display:block; margin-bottom:5px; color:#8992b4; font-size:10px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
        #critter-ban-screen .ban-detail strong, #critter-ban-screen .ban-detail span { display:block; overflow-wrap:anywhere; color:#f5f7ff; line-height:1.45; }
        #critter-ban-screen .ban-warning { margin:18px 0 0; padding:14px 16px; border-left:3px solid #ff526f; border-radius:10px; color:#ffd8df; background:rgba(255,62,96,.09); line-height:1.55; }
        #critter-ban-screen .ban-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:22px; }
        #critter-ban-screen button, #critter-ban-screen a { min-height:44px; padding:11px 18px; border:1px solid rgba(126,234,241,.58); border-radius:12px; color:#eaffff; font:inherit; font-weight:800; text-decoration:none; cursor:pointer; background:rgba(50,190,202,.12); }
        #critter-ban-screen button:hover, #critter-ban-screen a:hover { background:rgba(50,190,202,.22); }
        #critter-ban-screen .ban-foot { margin:18px 0 0; color:#7f87a5; text-align:center; font-size:12px; }
        @media (max-width:560px) { #critter-ban-screen { padding:14px; } #critter-ban-screen .ban-card { border-radius:20px; } #critter-ban-screen .ban-grid { grid-template-columns:1fr; } #critter-ban-screen .ban-detail.full { grid-column:auto; } }
      `;
      document.head.appendChild(style);

      const screen = document.createElement('main');
      screen.id = 'critter-ban-screen';
      screen.setAttribute('role', 'alertdialog');
      screen.setAttribute('aria-modal', 'true');
      screen.setAttribute('aria-labelledby', 'critter-ban-title');
      screen.innerHTML = `
        <section class="ban-card">
          <div class="ban-mark" aria-hidden="true">×</div>
          <p class="ban-eyebrow">CRITTER EXTRACTION SECURITY</p>
          <h1 id="critter-ban-title">Account Access Blocked</h1>
          <p class="ban-summary"></p>
          <div class="ban-grid">
            <div class="ban-detail"><small>Ban ID</small><strong data-ban-id></strong></div>
            <div class="ban-detail"><small>Status</small><strong data-status></strong></div>
            <div class="ban-detail"><small>Scope</small><strong data-scope></strong></div>
            <div class="ban-detail"><small>Account</small><strong data-account></strong></div>
            <div class="ban-detail full"><small>Reason</small><span data-reason></span></div>
            <div class="ban-detail full"><small>Identity match</small><span data-match></span></div>
          </div>
          <p class="ban-warning">This window cannot be dismissed. Reloading the page does not remove an active repository ban.</p>
          <div class="ban-actions"><button type="button" data-copy>Copy Ban Details</button></div>
          <p class="ban-foot">Harley’s Studios • Fair Play & Account Security</p>
        </section>`;

      const expiresAt = ban.expiresAt ? new Date(ban.expiresAt) : null;
      const permanent = !expiresAt || Number.isNaN(expiresAt.getTime());
      const username = normalize(account?.username || account?.displayName || 'Current account');
      const status = permanent ? 'Permanent' : `Until ${expiresAt.toLocaleString()}`;
      const scope = humanScope(ban.scope);
      const reason = normalize(ban.reason || 'No reason was provided.');
      const matchText = match.matched.map(matchedLabel).join(', ') || 'Account identity';
      screen.querySelector('.ban-summary').textContent = scopeBlocksEntireGame(ban.scope)
        ? 'This account is banned from playing Critter Extraction. Solo play, hosting, joining, inventory access, and game menus are disabled.'
        : 'This account is banned from Critter Extraction multiplayer. Hosting and joining shared rooms are disabled.';
      screen.querySelector('[data-ban-id]').textContent = normalize(ban.id || 'Unspecified');
      screen.querySelector('[data-status]').textContent = status;
      screen.querySelector('[data-scope]').textContent = scope;
      screen.querySelector('[data-account]').textContent = username || 'Current account';
      screen.querySelector('[data-reason]').textContent = reason;
      screen.querySelector('[data-match]').textContent = matchText;

      const actions = screen.querySelector('.ban-actions');
      if (ban.appealUrl && /^https?:\/\//i.test(String(ban.appealUrl))) {
        const appeal = document.createElement('a');
        appeal.href = String(ban.appealUrl);
        appeal.target = '_blank';
        appeal.rel = 'noopener noreferrer';
        appeal.textContent = 'Open Appeal Page';
        actions.appendChild(appeal);
      }
      screen.querySelector('[data-copy]').addEventListener('click', async () => {
        const details = [
          'Critter Extraction Ban',
          `Ban ID: ${normalize(ban.id || 'Unspecified')}`,
          `Account: ${username || 'Current account'}`,
          `Status: ${status}`,
          `Scope: ${scope}`,
          `Reason: ${reason}`,
          `Matched: ${matchText}`
        ].join('\n');
        try {
          await navigator.clipboard.writeText(details);
          screen.querySelector('[data-copy]').textContent = 'Ban Details Copied';
        } catch (_) {
          window.prompt('Copy ban details:', details);
        }
      });

      document.body.appendChild(screen);
      screen.querySelector('[data-copy]')?.focus();
    });
  }

  function showMultiplayerBan(match, account) {
    gate.status = 'multiplayer-blocked';
    gate.match = match.ban;
    gate.account = account;
    gate.matchedIdentifiers = match.matched.slice();
    window.__CRITTER_MULTIPLAYER_BLOCKED__ = true;
    onBodyReady(() => {
      const blockedIds = new Set(['hostBtn', 'joinBtn', 'startCoopBtn', 'joinRoomBtn', 'copyInviteLinkBtn', 'shareInviteLinkBtn']);
      document.addEventListener('click', event => {
        if (!window.__CRITTER_MULTIPLAYER_BLOCKED__) return;
        const target = event.target?.closest?.('button,a');
        if (!target || !blockedIds.has(target.id)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showBanScreen(match, account);
      }, true);
      const applyDisabledState = () => blockedIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        element.setAttribute('aria-disabled', 'true');
        element.title = 'This account is banned from multiplayer.';
      });
      applyDisabledState();
      const observer = new MutationObserver(applyDisabledState);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  function applyMatch(match, account) {
    if (!match) return false;
    if (scopeBlocksEntireGame(match.ban.scope)) showBanScreen(match, account);
    else showMultiplayerBan(match, account);
    return true;
  }

  async function evaluateCurrentAccount() {
    const account = readActiveAccount();
    gate.account = account;
    if (!account) return null;
    const identity = buildIdentity(account);
    return findMatch(gate.bans, identity);
  }

  let decisionResolved = false;
  const decision = (async () => {
    try {
      gate.bans = await loadBanList();
      gate.checkedAt = Date.now();
      const account = readActiveAccount();
      gate.account = account;
      const match = account ? findMatch(gate.bans, buildIdentity(account)) : null;
      gate.match = match?.ban || null;
      gate.matchedIdentifiers = match?.matched || [];
      if (match) applyMatch(match, account);
      else gate.status = 'clear';
      return { blocked: !!match && scopeBlocksEntireGame(match.ban.scope), match, account };
    } catch (error) {
      gate.status = 'unavailable';
      gate.error = String(error?.message || error || 'Ban list unavailable');
      console.warn('Critter Extraction ban check unavailable; allowing local startup.', error);
      return { blocked: false, error };
    } finally {
      decisionResolved = true;
    }
  })();
  gate.ready = decision;

  window.fetch = async function critterSecurityFetch(input, init) {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (/core\/game\/game-core\.js(?:\?|$)/i.test(url)) {
      const result = await decision;
      if (result.blocked) return new Promise(() => {});
    }
    return nativeFetch(input, init);
  };

  onBodyReady(() => {
    const status = document.getElementById('bootStatus');
    if (status && !decisionResolved) status.textContent = 'Checking account access and repository bans…';
  });

  setInterval(async () => {
    if (!gate.bans.length || window.__CRITTER_ACCOUNT_BLOCKED__) return;
    const account = readActiveAccount();
    if (!account) return;
    const currentKey = `${normalize(account.id)}|${normalizeLower(account.username)}|${normalizeUpper(account.recruitCode)}`;
    const previousKey = gate.account ? `${normalize(gate.account.id)}|${normalizeLower(gate.account.username)}|${normalizeUpper(gate.account.recruitCode)}` : '';
    if (currentKey === previousKey) return;
    gate.account = account;
    const match = await evaluateCurrentAccount();
    if (!match) {
      window.__CRITTER_MULTIPLAYER_BLOCKED__ = false;
      gate.status = 'clear';
      return;
    }
    applyMatch(match, account);
    if (scopeBlocksEntireGame(match.ban.scope) && window.__CRITTER_BOOT__?.gameStarted) setTimeout(() => location.reload(), 80);
  }, 1500);
})();

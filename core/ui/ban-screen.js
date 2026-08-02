(() => {
  'use strict';

  const SCREEN_ID = 'critter-ban-screen';
  const LEGACY_STYLE_ID = 'critter-ban-style';

  const normalize = value => String(value ?? '').trim();
  const normalizeLower = value => normalize(value).toLowerCase();

  const scopeBlocksEntireGame = scope => ['all', 'game', 'full', 'account'].includes(normalizeLower(scope));
  const humanScope = scope => scopeBlocksEntireGame(scope) ? 'All game access' : 'Multiplayer access';
  const matchedLabel = key => ({
    securityIds: 'Security ID',
    installHashes: 'Installation',
    accountIdHashes: 'Account ID',
    usernames: 'Username',
    recruitCodes: 'Recruit code',
    profileFingerprints: 'Profile fingerprint'
  })[key] || key;

  const setText = (root, selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  };

  const buildDetailsText = ({ banId, username, status, scope, reason, matchText }) => [
    'Critter Extraction Access Restriction',
    `Restriction ID: ${banId}`,
    `Account: ${username}`,
    `Status: ${status}`,
    `Access: ${scope}`,
    `Reason: ${reason}`,
    `Matched by: ${matchText}`
  ].join('\n');

  function enhanceBanScreen(screen) {
    if (!screen || screen.dataset.critterBanEnhanced === 'true') return;
    screen.dataset.critterBanEnhanced = 'true';

    const gate = window.CritterBanGate || {};
    const ban = gate.match || {};
    const account = gate.account || {};
    const expiresAt = ban.expiresAt ? new Date(ban.expiresAt) : null;
    const permanent = !expiresAt || Number.isNaN(expiresAt.getTime());
    const username = normalize(account.username || account.displayName || 'Current account');
    const status = permanent ? 'Permanent restriction' : `Restricted until ${expiresAt.toLocaleString()}`;
    const scope = humanScope(ban.scope);
    const reason = normalize(ban.reason || 'No reason was provided.');
    const banId = normalize(ban.id || 'Unspecified');
    const matchText = (gate.matchedIdentifiers || []).map(matchedLabel).join(', ') || 'Account identity';
    const fullBlock = scopeBlocksEntireGame(ban.scope);
    const summary = fullBlock
      ? 'This account cannot enter Critter Extraction. Solo drops, multiplayer rooms, inventory, trading, and account menus are unavailable.'
      : 'This account can use local features, but hosting and joining multiplayer rooms are unavailable.';

    document.getElementById(LEGACY_STYLE_ID)?.remove();
    document.documentElement.classList.add('critter-account-banned', 'critter-ban-theme-ready');
    document.title = 'Access Restricted — Critter Extraction';

    screen.setAttribute('role', 'alertdialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-labelledby', 'critter-ban-title');
    screen.innerHTML = `
      <div class="ban-atmosphere" aria-hidden="true">
        <span class="ban-orb ban-orb-a"></span>
        <span class="ban-orb ban-orb-b"></span>
        <span class="ban-grid-lines"></span>
      </div>

      <section class="ban-shell">
        <header class="ban-topbar">
          <div class="ban-brand">
            <img src="./assets/branding/icon.svg" alt="" width="48" height="48">
            <span><strong>Critter Extraction</strong><small>Harley’s Studios Security</small></span>
          </div>
          <span class="ban-server-state"><i aria-hidden="true"></i> ACCESS GATE ACTIVE</span>
        </header>

        <div class="ban-layout">
          <aside class="ban-scene" aria-hidden="true">
            <div class="ban-scene-shade"></div>
            <div class="ban-emblem">
              <img src="./assets/branding/icon.svg" alt="">
              <span class="ban-lock-mark">×</span>
            </div>
            <div class="ban-scene-copy">
              <span>DROP AUTHORIZATION</span>
              <strong>REVOKED</strong>
              <small>SECURITY CHECK • FAIR PLAY NETWORK</small>
            </div>
          </aside>

          <main class="ban-content">
            <div class="ban-kicker"><span aria-hidden="true">◆</span> ACCOUNT SECURITY NOTICE</div>
            <h1 id="critter-ban-title">Drop access has been restricted.</h1>
            <p class="ban-summary" data-summary></p>

            <div class="ban-account-card">
              <span class="ban-account-avatar"><img src="./assets/branding/icon.svg" alt=""></span>
              <span class="ban-account-copy"><small>RESTRICTED ACCOUNT</small><strong data-account></strong><em data-status></em></span>
              <span class="ban-status-pill">BLOCKED</span>
            </div>

            <div class="ban-stat-row">
              <div><small>ACCESS LEVEL</small><strong data-scope></strong></div>
              <div><small>RESTRICTION ID</small><strong data-ban-id></strong></div>
            </div>

            <section class="ban-reason-panel">
              <div class="ban-section-title"><span>RESTRICTION DETAILS</span><i></i></div>
              <p data-reason></p>
              <dl>
                <div><dt>Identity check</dt><dd data-match></dd></div>
                <div><dt>Enforcement</dt><dd>Repository security registry</dd></div>
              </dl>
            </section>

            <div class="ban-warning">
              <span aria-hidden="true">!</span>
              <p><strong>This restriction cannot be dismissed.</strong> Reloading, changing the page address, or reopening the game will not remove an active restriction.</p>
            </div>

            <div class="ban-actions">
              <button class="ban-primary-action" type="button" data-copy>
                <span aria-hidden="true">▣</span> Copy restriction details
              </button>
              <span data-appeal-slot></span>
            </div>

            <footer class="ban-footer">
              <span>HARLEY’S STUDIOS</span><i></i><span>FAIR PLAY & ACCOUNT SECURITY</span>
            </footer>
          </main>
        </div>
      </section>`;

    setText(screen, '[data-summary]', summary);
    setText(screen, '[data-account]', username);
    setText(screen, '[data-status]', status);
    setText(screen, '[data-scope]', scope);
    setText(screen, '[data-ban-id]', banId);
    setText(screen, '[data-reason]', reason);
    setText(screen, '[data-match]', matchText);

    const details = buildDetailsText({ banId, username, status, scope, reason, matchText });
    const copyButton = screen.querySelector('[data-copy]');
    copyButton?.addEventListener('click', async () => {
      const original = copyButton.innerHTML;
      try {
        await navigator.clipboard.writeText(details);
        copyButton.textContent = 'Restriction details copied';
      } catch (_) {
        window.prompt('Copy restriction details:', details);
      }
      window.setTimeout(() => { copyButton.innerHTML = original; }, 2200);
    });

    if (ban.appealUrl && /^https?:\/\//i.test(String(ban.appealUrl))) {
      const appeal = document.createElement('a');
      appeal.className = 'ban-secondary-action';
      appeal.href = String(ban.appealUrl);
      appeal.target = '_blank';
      appeal.rel = 'noopener noreferrer';
      appeal.textContent = 'Open appeal page';
      screen.querySelector('[data-appeal-slot]')?.appendChild(appeal);
    }

    copyButton?.focus({ preventScroll: true });
  }

  function findAndEnhance() {
    const screen = document.getElementById(SCREEN_ID);
    if (screen) enhanceBanScreen(screen);
  }

  findAndEnhance();
  const observer = new MutationObserver(findAndEnhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

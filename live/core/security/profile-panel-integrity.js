(() => {
  'use strict';
  if (window.__CRITTER_PROFILE_MANAGER_V2__) return;
  window.__CRITTER_PROFILE_MANAGER_V2__ = true;

  const NOTICE_HTML = '<strong>Stored on this device.</strong><span>Profiles, progress, Stash, Petals, and settings are local. Make an encrypted backup before clearing browser data or moving devices.</span>';
  const MAIN_MENU_DOCK_SELECTOR = '#menuScreen nav.lobby-action-dock';
  const TAB_NAMES = ['profiles', 'security', 'backups'];

  const securityRuntime = () => window.CritterSecurityRuntime || null;
  const text = (value, limit = 160) => String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, limit);

  function suppressMainMenuPanels() {
    document.querySelectorAll(MAIN_MENU_DOCK_SELECTOR).forEach(dock => {
      dock.hidden = true;
      dock.setAttribute('aria-hidden', 'true');
      dock.setAttribute('inert', '');
      dock.classList.remove('dashboard-action-panel');
    });

    const dashboard = document.querySelector('#menuScreen .dashboard');
    if (!dashboard) return;
    [...dashboard.children].forEach(panel => {
      if (panel.matches('nav.lobby-action-dock, .profile-panel, .stats-panel, .loadout-panel')) return;
      const copy = String(panel.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/(fair play|anti[- ]?cheat|quick actions)/i.test(copy)) return;
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
      panel.setAttribute('inert', '');
    });
  }

  function removeStorageMeter(card) {
    if (!card) return;
    [...card.querySelectorAll('*')]
      .filter(node => node !== card && node.children.length === 0)
      .filter(node => /^(LOCAL STORAGE|BROWSER STORAGE)$/i.test(node.textContent.trim()))
      .forEach(node => {
        const parent = node.parentElement;
        const parentCopy = String(parent?.textContent || '').replace(/\s+/g, ' ').trim();
        if (parent && parent !== card && /browser storage/i.test(parentCopy) && parentCopy.length < 320) parent.remove();
        else node.remove();
      });
  }

  function ensureLocalNotice(card, root) {
    let notice = card.querySelector(':scope > .profile-local-notice, :scope > .account-manager-intro');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'account-note account-manager-intro profile-local-notice';
      if (root) root.insertAdjacentElement('beforebegin', notice);
      else card.querySelector(':scope > header')?.insertAdjacentElement('afterend', notice);
    }
    notice.className = 'account-note account-manager-intro profile-local-notice';
    notice.hidden = false;
    notice.removeAttribute('aria-hidden');
    if (notice.innerHTML !== NOTICE_HTML) notice.innerHTML = NOTICE_HTML;
    return notice;
  }

  function restoreQuickButtons(root) {
    const quickSection = root?.querySelector('.account-quick-section');
    if (!quickSection) return;
    const top = document.querySelector('.top-actions');
    const account = document.getElementById('accountBtn');
    if (top) {
      quickSection.querySelectorAll('[data-open="helpModal"], [data-open="settingsModal"]').forEach(button => {
        button.classList.remove('account-quick-button');
        if (button.parentElement !== top) top.insertBefore(button, account || null);
      });
    }
    quickSection.remove();
  }

  function cleanupLegacyCardChildren(card, root, notice) {
    if (!card || !root) return;
    const header = card.querySelector(':scope > header');
    [...card.children].forEach(child => {
      if (child === header || child === root || child === notice) return;
      child.remove();
    });
  }

  function ensureHeader(card) {
    const eyebrow = card.querySelector(':scope > header .eyebrow');
    const title = card.querySelector(':scope > header h2');
    if (eyebrow) eyebrow.textContent = 'ACCOUNT CENTER';
    if (title) title.textContent = 'Profiles & Security';
  }

  function unreadNotificationCount() {
    try {
      const notes = window.__CRITTER_RECOVERY__?.notifications?.() || [];
      if (Array.isArray(notes)) return notes.filter(note => note?.unread).length;
    } catch (_) { }
    const badge = document.getElementById('recoveryNotificationsBadge');
    return badge && !badge.hidden ? Math.max(0, Number.parseInt(badge.textContent, 10) || 0) : 0;
  }

  function ensureNotificationsSection(root) {
    let section = root.querySelector('.account-notifications-section');
    if (!section) {
      section = document.createElement('section');
      section.className = 'account-manager-section account-notifications-section';
      section.innerHTML = `
        <div class="account-section-heading compact-heading">
          <div><span class="eyebrow">ACCOUNT INBOX</span><h3>Notifications</h3><p>Recovery and Fair Play notices for the active profile.</p></div>
          <span id="accountNotificationsSummary" class="account-status-pill">No unread notices</span>
        </div>
        <button class="secondary account-notifications-open" id="accountNotificationsOpenBtn" type="button"><span aria-hidden="true">🔔</span><strong>Open notifications</strong><b id="accountNotificationsInlineBadge" hidden>0</b></button>`;
    }
    const unread = unreadNotificationCount();
    const summary = section.querySelector('#accountNotificationsSummary');
    const badge = section.querySelector('#accountNotificationsInlineBadge');
    if (summary) summary.textContent = unread ? `${unread} unread` : 'No unread notices';
    if (badge) {
      badge.hidden = unread < 1;
      badge.textContent = unread > 99 ? '99+' : String(unread);
    }
    const button = section.querySelector('#accountNotificationsOpenBtn');
    if (button && button.dataset.ready !== 'true') {
      button.dataset.ready = 'true';
      button.addEventListener('click', () => {
        document.getElementById('accountsModal')?.close?.();
        setTimeout(() => {
          if (typeof window.__CRITTER_RECOVERY__?.open === 'function') window.__CRITTER_RECOVERY__.open();
          else document.getElementById('recoveryNotificationsBtn')?.click();
        }, 0);
      });
    }
    if (button) button.disabled = !window.__CRITTER_RECOVERY__?.open && !document.getElementById('recoveryNotificationsBtn');
    return section;
  }

  function readFairPlayStatus() {
    let fairPlay = null;
    let network = null;
    try { fairPlay = window.__CRITTER_DEBUG__?.fairPlay?.() || null; } catch (_) { }
    try { network = window.__CRITTER_NETWORK_TELEMETRY__?.() || null; } catch (_) { }
    const peers = Array.isArray(fairPlay?.peers) ? fairPlay.peers : [];
    const blocked = peers.reduce((sum, peer) => sum + Math.max(0, Number(peer?.blocked) || 0), 0);
    const strikes = peers.reduce((sum, peer) => sum + Math.max(0, Number(peer?.strikes) || 0), 0);
    const events = Array.isArray(fairPlay?.events) ? fairPlay.events.length : 0;
    const inMatch = !!network?.inMatch || document.body.classList.contains('in-match');
    const role = String(network?.role || 'solo').toLowerCase();
    if (inMatch && role === 'host') return { state:'HOST AUTHORITY', authority:'Host-authoritative validation', detail:'This browser validates connected players and blocks invalid gameplay or network actions.', version:String(fairPlay?.version || '1.1'), blocked, strikes, events };
    if (inMatch && role === 'guest') return { state:'HOST VALIDATED', authority:'Protected by the room host', detail:'Movement, combat, loot, inventory, healing, and network actions are verified by the host.', version:String(fairPlay?.version || '1.1'), blocked, strikes, events };
    if (inMatch) return { state:'ACTIVE', authority:'Local validation', detail:'Solo gameplay uses the same movement, combat, inventory, and interaction rules.', version:String(fairPlay?.version || '1.1'), blocked, strikes, events };
    return { state:'READY', authority:'Automatic protection', detail:'Fair Play starts automatically when a Solo, Co-op, or VS Arena match begins.', version:String(fairPlay?.version || '1.1'), blocked, strikes, events };
  }

  function ensureFairPlaySection(root) {
    let section = root.querySelector('.account-fair-play-section');
    if (!section) {
      section = document.createElement('section');
      section.className = 'account-manager-section account-fair-play-section';
      section.innerHTML = `
        <div class="account-section-heading compact-heading">
          <div><span class="eyebrow">FAIR PLAY</span><h3>Anti-cheat protection</h3><p>Host-authoritative checks for gameplay, inventory, and network actions.</p></div>
          <span id="accountFairPlayState" class="account-status-pill">READY</span>
        </div>
        <div class="account-fair-play-grid" aria-live="polite">
          <div><span>MODE</span><strong id="accountFairPlayAuthority">Automatic protection</strong></div>
          <div><span>VERSION</span><strong id="accountFairPlayVersion">v1.1</strong></div>
          <div><span>BLOCKED</span><strong id="accountFairPlayBlocked">0</strong></div>
          <div><span>STRIKES</span><strong id="accountFairPlayStrikes">0</strong></div>
        </div>
        <p id="accountFairPlayDetail" class="account-fair-play-detail"></p>`;
    }
    const status = readFairPlayStatus();
    section.dataset.state = status.state.toLowerCase().replace(/\s+/g, '-');
    const set = (selector, value) => {
      const node = section.querySelector(selector);
      if (node) node.textContent = value;
    };
    set('#accountFairPlayState', status.state);
    set('#accountFairPlayAuthority', status.authority);
    set('#accountFairPlayVersion', `v${status.version}`);
    set('#accountFairPlayBlocked', String(status.blocked));
    set('#accountFairPlayStrikes', String(status.strikes));
    set('#accountFairPlayDetail', status.events ? `${status.detail} ${status.events} recent event${status.events === 1 ? '' : 's'} recorded.` : status.detail);
    return section;
  }

  function ensureBackupPasswordSection(root) {
    let section = root.querySelector('.account-password-section');
    const panel = document.getElementById('accountBackupSecurity');
    if (!section && panel) {
      section = document.createElement('section');
      section.className = 'account-manager-section account-password-section';
      section.innerHTML = '<div class="account-section-heading compact-heading"><div><span class="eyebrow">ENCRYPTED BACKUPS</span><h3>Backup password</h3><p>Protect new profile exports for this browser tab.</p></div></div>';
    }
    if (section && panel && panel.parentElement !== section) section.appendChild(panel);
    return section;
  }

  function connectionRows() {
    const S = securityRuntime();
    if (!S?.connections) return [];
    try { return S.connections({ direction:'host-inbound' }).filter(connection => connection.status !== 'closed'); }
    catch (_) { return []; }
  }

  function ensurePlayerDetailsDialog() {
    let dialog = document.getElementById('accountSecurityPlayerDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'accountSecurityPlayerDialog';
    dialog.className = 'modal account-security-player-dialog';
    dialog.innerHTML = '<div class="modal-card"><header><div><span class="eyebrow">CONNECTED PLAYER</span><h2>Security data</h2></div><button class="icon-close" type="button">×</button></header><div class="security-player-data"></div><footer><button class="primary" type="button">Done</button></footer></div>';
    document.body.append(dialog);
    dialog.querySelector('.icon-close').onclick = dialog.querySelector('footer button').onclick = () => dialog.close();
    return dialog;
  }

  function showPlayerDetails(connection) {
    const dialog = ensurePlayerDetailsDialog();
    const profile = connection.profile || {};
    const identity = connection.identity || {};
    const values = [
      ['Display name', profile.displayName || 'Connected Critter'],
      ['Username', profile.username ? `@${profile.username}` : 'Not supplied'],
      ['Status', connection.status || 'unknown'],
      ['Connected', connection.connectedAt ? new Date(connection.connectedAt).toLocaleString() : 'Unknown'],
      ['Peer ID', connection.peerId || 'Not available'],
      ['Security ID', identity.securityId || 'Not available'],
      ['Install hash', identity.installHash || 'Not available'],
      ['Profile fingerprint', identity.profileFingerprint || 'Not available'],
      ['Account ID hash', identity.accountIdHash || 'Not available'],
      ['Recruit code', identity.recruitCode || 'Not supplied']
    ];
    const root = dialog.querySelector('.security-player-data');
    root.textContent = '';
    for (const [label, value] of values) {
      const row = document.createElement('div');
      const strong = document.createElement('strong');
      const code = document.createElement('code');
      strong.textContent = label;
      code.textContent = String(value);
      row.append(strong, code);
      root.append(row);
    }
    if (!dialog.open) dialog.showModal?.();
  }

  function ensureBanDialog() {
    let dialog = document.getElementById('accountHostBanDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'accountHostBanDialog';
    dialog.className = 'modal account-host-ban-dialog';
    dialog.innerHTML = `
      <form class="modal-card" id="accountHostBanForm">
        <header><div><span class="eyebrow">HOST-LOCAL SECURITY</span><h2>Ban connected player</h2></div><button class="icon-close" type="button">×</button></header>
        <p class="modal-intro">This restriction applies only to rooms hosted from this browser. It is not a global Critter Extraction ban.</p>
        <input type="hidden" name="connectionId">
        <label>Player<input name="player" readonly></label>
        <label>Duration<select name="duration"><option value="86400000">24 hours</option><option value="604800000">7 days</option><option value="2592000000">30 days</option><option value="permanent">Permanent</option></select></label>
        <label>Reason<input name="reason" maxlength="180" value="Cheating or repeated Fair Play violations" required></label>
        <footer><button class="ghost cancel-ban" type="button">Cancel</button><button class="danger-button" type="submit">Ban & disconnect</button></footer>
      </form>`;
    document.body.append(dialog);
    const form = dialog.querySelector('form');
    dialog.querySelector('.icon-close').onclick = dialog.querySelector('.cancel-ban').onclick = () => dialog.close();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const durationValue = String(data.get('duration') || '86400000');
      const durationMs = durationValue === 'permanent' ? null : Number(durationValue);
      const S = securityRuntime();
      const ban = S?.hostBanConnection?.(String(data.get('connectionId') || ''), {
        reason: text(data.get('reason'), 180) || 'Removed by the room host.',
        durationMs,
        disconnect: true
      });
      if (ban) dialog.close();
      window.dispatchEvent(new Event('critter-security-change'));
    });
    return dialog;
  }

  function openBanDialog(connection) {
    const dialog = ensureBanDialog();
    const form = dialog.querySelector('form');
    form.elements.connectionId.value = connection.id;
    form.elements.player.value = connection.profile?.displayName || connection.identity?.username || connection.peerId || 'Connected player';
    if (!dialog.open) dialog.showModal?.();
  }

  function renderSecurityPlayers(section) {
    const list = section.querySelector('#accountConnectedPlayersList');
    const count = section.querySelector('#accountConnectedPlayerCount');
    const bans = section.querySelector('#accountHostBanList');
    if (!list || !count || !bans) return;
    const players = connectionRows();
    count.textContent = `${players.length} connected`;
    list.textContent = '';
    if (!players.length) {
      const empty = document.createElement('div');
      empty.className = 'account-security-empty';
      empty.innerHTML = '<strong>No connected players</strong><span>Host a multiplayer room to view player security data and apply host-local bans.</span>';
      list.append(empty);
    }
    for (const connection of players) {
      const row = document.createElement('article');
      row.className = 'account-security-player-row';
      const info = document.createElement('div');
      const name = document.createElement('strong');
      const meta = document.createElement('small');
      name.textContent = connection.profile?.displayName || connection.identity?.username || 'Connected Critter';
      meta.textContent = `${connection.profile?.username ? `@${connection.profile.username} • ` : ''}${connection.status.toUpperCase()} • ${connection.identity?.securityId ? 'verified identity' : 'identity pending'}`;
      info.append(name, meta);
      const actions = document.createElement('div');
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'secondary';
      view.textContent = 'View data';
      view.onclick = () => showPlayerDetails(connection);
      const ban = document.createElement('button');
      ban.type = 'button';
      ban.className = 'danger-button';
      ban.textContent = 'Host ban';
      ban.disabled = !connection.identity?.securityId && !connection.identity?.installHash && !connection.identity?.username;
      ban.onclick = () => openBanDialog(connection);
      actions.append(view, ban);
      row.append(info, actions);
      list.append(row);
    }

    bans.textContent = '';
    const localBans = securityRuntime()?.localBans?.() || [];
    if (!localBans.length) {
      const empty = document.createElement('span');
      empty.className = 'account-host-ban-empty';
      empty.textContent = 'No active host bans.';
      bans.append(empty);
    }
    for (const ban of localBans.slice().reverse()) {
      const row = document.createElement('div');
      row.className = 'account-host-ban-row';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      const detail = document.createElement('small');
      title.textContent = ban.reason || 'Host ban';
      detail.textContent = ban.expiresAt ? `Expires ${new Date(ban.expiresAt).toLocaleString()}` : 'Permanent';
      info.append(title, detail);
      const unban = document.createElement('button');
      unban.type = 'button';
      unban.className = 'ghost';
      unban.textContent = 'Unban';
      unban.onclick = () => { securityRuntime()?.removeBan?.(ban.id); renderSecurityPlayers(section); };
      row.append(info, unban);
      bans.append(row);
    }
  }

  function ensureSecurityManagementSection(root) {
    let section = root.querySelector('.account-security-management-section');
    if (!section) {
      section = document.createElement('section');
      section.className = 'account-manager-section account-security-management-section';
      section.innerHTML = `
        <div class="account-section-heading compact-heading">
          <div><span class="eyebrow">ROOM SECURITY</span><h3>Players & host bans</h3><p>Inspect connected-player identity data, ban a player from your rooms, or manage saved bans.</p></div>
          <span id="accountConnectedPlayerCount" class="account-status-pill">0 connected</span>
        </div>
        <div class="account-security-actions"><button class="secondary" id="openFullSecurityCenterBtn" type="button">Open full Security Center</button><button class="ghost" id="refreshAccountSecurityBtn" type="button">Refresh</button></div>
        <div id="accountConnectedPlayersList" class="account-connected-players"></div>
        <details class="account-host-ban-fold"><summary><strong>Active host bans</strong><span>View or remove saved restrictions</span></summary><div id="accountHostBanList" class="account-host-ban-list"></div></details>`;
    }
    const open = section.querySelector('#openFullSecurityCenterBtn');
    if (open && open.dataset.ready !== 'true') {
      open.dataset.ready = 'true';
      open.addEventListener('click', () => {
        document.getElementById('accountsModal')?.close?.();
        setTimeout(() => securityRuntime()?.openCenter?.(), 0);
      });
    }
    const refresh = section.querySelector('#refreshAccountSecurityBtn');
    if (refresh && refresh.dataset.ready !== 'true') {
      refresh.dataset.ready = 'true';
      refresh.addEventListener('click', () => renderSecurityPlayers(section));
    }
    if (open) open.disabled = !securityRuntime()?.openCenter;
    renderSecurityPlayers(section);
    return section;
  }

  function ensureProfileToolbar(root) {
    const section = root.querySelector('.account-profiles-section');
    const toolbar = section?.querySelector('.account-toolbar');
    if (!toolbar || document.getElementById('newProfilePrimaryBtn')) return;
    const button = document.createElement('button');
    button.id = 'newProfilePrimaryBtn';
    button.type = 'button';
    button.className = 'primary';
    button.textContent = 'New profile';
    button.addEventListener('click', () => document.getElementById('newAccountBtn')?.click());
    toolbar.append(button);
  }

  function ensureMissingProfileNotice(root, accountList) {
    const section = root?.querySelector('.account-profiles-section');
    if (!section || !accountList) return;
    let notice = section.querySelector('#profileMissingNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'profileMissingNotice';
      notice.className = 'profile-missing-notice';
      notice.innerHTML = '<strong>No local profile found</strong><span>Create a profile or restore an encrypted backup to continue.</span>';
      accountList.insertAdjacentElement('beforebegin', notice);
    }
    notice.hidden = !!accountList.querySelector('.account-row');
  }

  function ensureTabs(root) {
    restoreQuickButtons(root);
    let tabs = root.querySelector(':scope > .account-manager-tabs');
    let panels = root.querySelector(':scope > .account-tab-panels');
    if (!tabs) {
      tabs = document.createElement('nav');
      tabs.className = 'account-manager-tabs';
      tabs.setAttribute('aria-label', 'Account center sections');
      tabs.innerHTML = '<button type="button" data-account-tab="profiles">Profiles</button><button type="button" data-account-tab="security">Security</button><button type="button" data-account-tab="backups">Backups & Transfer</button>';
      root.prepend(tabs);
    }
    if (!panels) {
      panels = document.createElement('div');
      panels.className = 'account-tab-panels';
      panels.innerHTML = '<div class="account-tab-panel" data-account-panel="profiles"></div><div class="account-tab-panel" data-account-panel="security"></div><div class="account-tab-panel" data-account-panel="backups"></div>';
      tabs.insertAdjacentElement('afterend', panels);
    }

    const profilePanel = panels.querySelector('[data-account-panel="profiles"]');
    const securityPanel = panels.querySelector('[data-account-panel="security"]');
    const backupPanel = panels.querySelector('[data-account-panel="backups"]');
    const profileSection = root.querySelector('.account-profiles-section');
    const notifications = ensureNotificationsSection(root);
    const fairPlay = ensureFairPlaySection(root);
    const securityManagement = ensureSecurityManagementSection(root);
    const password = ensureBackupPasswordSection(root);
    const transfer = root.querySelector('.account-transfer-section');
    if (profileSection && profileSection.parentElement !== profilePanel) profilePanel.append(profileSection);
    for (const section of [notifications, fairPlay, securityManagement]) if (section && section.parentElement !== securityPanel) securityPanel.append(section);
    for (const section of [password, transfer]) if (section && section.parentElement !== backupPanel) backupPanel.append(section);

    const activate = requested => {
      const active = TAB_NAMES.includes(requested) ? requested : 'profiles';
      root.dataset.activeTab = active;
      tabs.querySelectorAll('[data-account-tab]').forEach(button => {
        const selected = button.dataset.accountTab === active;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-selected', String(selected));
      });
      panels.querySelectorAll('[data-account-panel]').forEach(panel => { panel.hidden = panel.dataset.accountPanel !== active; });
    };
    if (tabs.dataset.ready !== 'true') {
      tabs.dataset.ready = 'true';
      tabs.addEventListener('click', event => {
        const button = event.target.closest('[data-account-tab]');
        if (button) activate(button.dataset.accountTab);
      });
    }
    activate(root.dataset.activeTab || 'profiles');
  }

  function installStyles() {
    if (document.getElementById('profilePanelIntegrityStylesV2')) return;
    const style = document.createElement('style');
    style.id = 'profilePanelIntegrityStylesV2';
    style.textContent = `
html body #menuScreen nav.lobby-action-dock,html body #menuScreen .dashboard>nav.lobby-action-dock.dashboard-action-panel{display:none!important;visibility:hidden!important;pointer-events:none!important}
#accountsModal .account-manager-revamp{width:min(980px,calc(100vw - 18px))!important;max-height:calc(100dvh - 18px)!important;overflow:hidden!important;padding:14px!important}
#accountsModal .account-manager-layout{display:block!important}
#accountsModal .profile-local-notice{display:flex!important;align-items:center;gap:8px;margin:8px 0 10px!important;padding:9px 11px!important}
#accountsModal .profile-local-notice span{color:var(--muted);font-size:10px}
#accountsModal .account-manager-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:0 0 10px;padding:5px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(0,0,0,.18)}
#accountsModal .account-manager-tabs button{min-height:38px;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:var(--muted);font-size:10px;font-weight:900;cursor:pointer}
#accountsModal .account-manager-tabs button.active{background:linear-gradient(135deg,rgba(103,240,239,.17),rgba(164,145,255,.14));color:#efffff;box-shadow:inset 0 0 0 1px rgba(103,240,239,.3)}
#accountsModal .account-tab-panels{max-height:calc(100dvh - 190px);overflow:auto;padding-right:3px}
#accountsModal .account-tab-panel{display:grid;gap:10px}#accountsModal .account-tab-panel[hidden]{display:none!important}
#accountsModal .account-manager-section{margin:0!important;padding:12px!important;border-radius:15px!important}
#accountsModal .compact-heading{margin-bottom:9px!important}.compact-heading h3{font-size:15px!important}.compact-heading p{font-size:9px!important}
#accountsModal .account-status-pill{align-self:center;padding:6px 9px;border:1px solid rgba(103,240,239,.23);border-radius:999px;background:rgba(103,240,239,.07);color:var(--cyan,#67f0ef);font-size:9px;font-weight:900;white-space:nowrap}
#accountsModal .account-toolbar{grid-template-columns:minmax(180px,1fr) auto auto auto!important}
#accountsModal .profile-missing-notice{display:grid;gap:3px;margin:0 0 8px;padding:10px;border:1px solid rgba(255,211,111,.35);border-radius:11px;background:rgba(255,211,111,.07)}#accountsModal .profile-missing-notice[hidden]{display:none!important}
#accountsModal .account-notifications-open{position:relative;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:100%!important;min-height:40px!important}
#accountsModal .account-notifications-open>b{display:grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ff5f72;color:#fff;font-size:9px}#accountsModal .account-notifications-open>b[hidden]{display:none!important}
#accountsModal .account-fair-play-section{border-color:rgba(103,240,239,.28)!important;background:linear-gradient(145deg,rgba(103,240,239,.055),rgba(164,145,255,.035))!important}
#accountsModal .account-fair-play-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
#accountsModal .account-fair-play-grid>div{display:grid;gap:3px;padding:9px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(0,0,0,.14)}
#accountsModal .account-fair-play-grid span{color:var(--muted);font-size:7px;font-weight:850;letter-spacing:.08em}#accountsModal .account-fair-play-grid strong{font-size:10px;overflow-wrap:anywhere}
#accountsModal .account-fair-play-detail{margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.45}
#accountsModal .account-security-actions{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:8px}
#accountsModal .account-connected-players{display:grid;gap:7px}
#accountsModal .account-security-empty{display:grid;gap:3px;padding:14px;border:1px dashed rgba(255,255,255,.14);border-radius:11px;text-align:center;color:var(--muted)}#accountsModal .account-security-empty strong{color:var(--text,#fff);font-size:11px}#accountsModal .account-security-empty span{font-size:9px}
#accountsModal .account-security-player-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(0,0,0,.13)}
#accountsModal .account-security-player-row>div:first-child{display:grid;gap:3px;min-width:0}#accountsModal .account-security-player-row small{color:var(--muted);font-size:8px;overflow-wrap:anywhere}#accountsModal .account-security-player-row>div:last-child{display:flex;gap:6px}
#accountsModal .account-host-ban-fold{margin-top:9px;border:1px solid rgba(255,255,255,.09);border-radius:11px;overflow:hidden}#accountsModal .account-host-ban-fold summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;cursor:pointer}#accountsModal .account-host-ban-fold summary span{color:var(--muted);font-size:8px}
#accountsModal .account-host-ban-list{display:grid;gap:6px;padding:0 10px 10px}.account-host-ban-empty{color:var(--muted);font-size:9px}.account-host-ban-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border-radius:9px;background:rgba(255,255,255,.035)}.account-host-ban-row>div{display:grid;gap:2px}.account-host-ban-row small{color:var(--muted);font-size:8px}
.account-security-player-dialog .modal-card,.account-host-ban-dialog .modal-card{width:min(620px,calc(100vw - 24px))}.security-player-data{display:grid;gap:0}.security-player-data>div{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08)}.security-player-data code{overflow-wrap:anywhere;color:#cffffd}
.account-host-ban-dialog form>label{display:grid;gap:5px;margin:9px 0}
@media(max-width:760px){#accountsModal .account-manager-tabs{grid-template-columns:1fr}#accountsModal .account-tab-panels{max-height:calc(100dvh - 265px)}#accountsModal .profile-local-notice{align-items:flex-start;flex-direction:column}#accountsModal .account-toolbar{grid-template-columns:1fr 1fr!important}#accountsModal .account-toolbar .account-search-field{grid-column:1/-1}#accountsModal .account-fair-play-grid{grid-template-columns:1fr 1fr}#accountsModal .account-security-player-row{grid-template-columns:1fr}#accountsModal .account-security-player-row>div:last-child{justify-content:flex-start}.security-player-data>div{grid-template-columns:1fr;gap:4px}}
@media(max-width:480px){#accountsModal .account-fair-play-grid{grid-template-columns:1fr}#accountsModal .account-toolbar{grid-template-columns:1fr!important}#accountsModal .account-toolbar .account-search-field{grid-column:auto}}
`;
    document.head.append(style);
  }

  function repair() {
    installStyles();
    suppressMainMenuPanels();
    const modal = document.getElementById('accountsModal');
    const card = modal?.querySelector('.modal-card');
    const root = document.getElementById('accountManagerRevamp');
    const accountList = document.getElementById('accountList');
    if (!modal || !card || !root) return false;
    ensureHeader(card);
    removeStorageMeter(card);
    const notice = ensureLocalNotice(card, root);
    cleanupLegacyCardChildren(card, root, notice);
    ensureTabs(root);
    ensureProfileToolbar(root);
    ensureMissingProfileNotice(root, accountList);
    return true;
  }

  function start() {
    installStyles();
    suppressMainMenuPanels();
    let attempts = 0;
    const bootRepair = () => {
      repair();
      if (attempts++ < 180) setTimeout(bootRepair, 100);
    };
    bootRepair();

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; repair(); });
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });

    const timer = setInterval(() => {
      const root = document.getElementById('accountManagerRevamp');
      if (!root) return;
      ensureFairPlaySection(root);
      const security = root.querySelector('.account-security-management-section');
      if (security) renderSecurityPlayers(security);
      suppressMainMenuPanels();
    }, 1000);
    window.addEventListener('pagehide', () => clearInterval(timer), { once:true });
    window.addEventListener('critter-security-change', () => setTimeout(repair, 0));
    window.addEventListener('critter-profile-password-change', () => setTimeout(repair, 0));
    document.addEventListener('click', event => {
      if (event.target.closest('#accountBtn, #accountsBtn, #recoveryNotificationsBtn')) setTimeout(repair, 0);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

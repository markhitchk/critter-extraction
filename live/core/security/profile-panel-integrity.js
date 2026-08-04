(() => {
  'use strict';

  const NOTICE_HTML = '<strong>Saved only on this device.</strong><span>Your progress, stash, Petals, appearance, statistics, loadout, and settings are local. Create an encrypted backup before clearing browser data or moving devices.</span>';
  const MAIN_MENU_DOCK_SELECTOR = '#menuScreen nav.lobby-action-dock';

  function closestCompactStorageBlock(node, card) {
    let target = node;
    while (target?.parentElement && target.parentElement !== card) {
      const parent = target.parentElement;
      const text = String(parent.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/browser storage/i.test(text) || text.length > 260 || parent.querySelector('#accountManagerRevamp')) break;
      target = parent;
    }
    return target;
  }

  function removeStorageMeter(card) {
    if (!card) return;
    [...card.querySelectorAll('*')]
      .filter(element => element !== card && /browser storage/i.test(String(element.textContent || '')))
      .filter(element => ![...element.children].some(child => /browser storage/i.test(String(child.textContent || ''))))
      .forEach(node => closestCompactStorageBlock(node, card)?.remove());

    [...card.querySelectorAll('*')]
      .filter(element => element.children.length === 0 && element.textContent.trim().toUpperCase() === 'LOCAL STORAGE')
      .forEach(label => {
        const parentText = String(label.parentElement?.textContent || '').replace(/\s+/g, ' ').trim();
        if (/browser storage/i.test(parentText) && parentText.length < 300) label.parentElement.remove();
        else label.remove();
      });
  }

  function suppressMainMenuPanels() {
    document.querySelectorAll(MAIN_MENU_DOCK_SELECTOR).forEach(dock => {
      if (!dock.hidden) dock.hidden = true;
      if (dock.getAttribute('aria-hidden') !== 'true') dock.setAttribute('aria-hidden', 'true');
      if (!dock.hasAttribute('inert')) dock.setAttribute('inert', '');
      dock.classList.remove('dashboard-action-panel');
    });

    const dashboard = document.querySelector('#menuScreen .dashboard');
    if (!dashboard) return;
    [...dashboard.children].forEach(panel => {
      if (panel.matches('nav.lobby-action-dock, .profile-panel, .stats-panel, .loadout-panel')) return;
      const text = String(panel.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/(fair play|anti[- ]?cheat)/i.test(text)) return;
      if (!panel.hidden) panel.hidden = true;
      if (panel.getAttribute('aria-hidden') !== 'true') panel.setAttribute('aria-hidden', 'true');
      if (!panel.hasAttribute('inert')) panel.setAttribute('inert', '');
    });
  }

  function ensureLocalNotice(card, root) {
    let notice = card.querySelector('.profile-local-notice, .account-manager-intro');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'account-note account-manager-intro profile-local-notice';
      if (root) root.insertAdjacentElement('beforebegin', notice);
      else card.querySelector(':scope > header')?.insertAdjacentElement('afterend', notice);
    }
    notice.classList.add('profile-local-notice', 'account-manager-intro');
    if (notice.hidden) notice.hidden = false;
    if (notice.hasAttribute('aria-hidden')) notice.removeAttribute('aria-hidden');
    if (notice.innerHTML !== NOTICE_HTML) notice.innerHTML = NOTICE_HTML;
  }

  function ensureMissingProfileNotice(root, accountList) {
    if (!root || !accountList) return;
    const profilesSection = root.querySelector('.account-profiles-section') || accountList.closest('section');
    if (!profilesSection) return;
    let notice = profilesSection.querySelector('#profileMissingNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'profileMissingNotice';
      notice.className = 'profile-missing-notice';
      notice.setAttribute('role', 'status');
      notice.innerHTML = '<strong>No local profile found</strong><span>Create a new profile or import an encrypted backup to continue.</span>';
      accountList.insertAdjacentElement('beforebegin', notice);
    }
    const shouldHide = !!accountList.querySelector('.account-row');
    if (notice.hidden !== shouldHide) notice.hidden = shouldHide;
  }

  function unreadNotificationCount() {
    const sourceBadge = document.getElementById('recoveryNotificationsBadge');
    if (sourceBadge && !sourceBadge.hidden) return Math.max(0, Number.parseInt(sourceBadge.textContent, 10) || 0);
    try {
      return (window.__CRITTER_RECOVERY__?.notifications?.() || []).filter(note => note?.unread).length;
    } catch (_) {
      return 0;
    }
  }

  function ensureNotificationsSection(root) {
    if (!root) return null;
    let section = root.querySelector('.account-notifications-section');
    if (!section) {
      section = document.createElement('section');
      section.className = 'account-manager-section account-notifications-section';
      section.innerHTML = `
        <div class="account-section-heading">
          <div><span class="eyebrow">NOTIFICATIONS</span><h3>Account inbox</h3><p>Interrupted-drop recovery and Fair Play protection updates stay with the active profile.</p></div>
          <span id="accountNotificationsSummary" class="account-notifications-summary">No unread notices</span>
        </div>
        <button class="secondary account-notifications-open" id="accountNotificationsOpenBtn" type="button">
          <span aria-hidden="true">🔔</span><strong>Open notifications</strong><b id="accountNotificationsInlineBadge" hidden>0</b>
        </button>`;
    }

    const profiles = root.querySelector('.account-profiles-section');
    const fairPlaySection = root.querySelector('.account-fair-play-section');
    const anchor = fairPlaySection || profiles;
    if (section.parentElement !== root || (anchor && section.nextElementSibling !== anchor)) {
      if (anchor) root.insertBefore(section, anchor);
      else root.appendChild(section);
    }

    const unread = unreadNotificationCount();
    const summary = section.querySelector('#accountNotificationsSummary');
    const inlineBadge = section.querySelector('#accountNotificationsInlineBadge');
    const summaryText = unread ? `${unread} unread notice${unread === 1 ? '' : 's'}` : 'No unread notices';
    if (summary && summary.textContent !== summaryText) summary.textContent = summaryText;
    if (inlineBadge) {
      const shouldHide = unread < 1;
      const badgeText = unread > 99 ? '99+' : String(unread);
      if (inlineBadge.hidden !== shouldHide) inlineBadge.hidden = shouldHide;
      if (inlineBadge.textContent !== badgeText) inlineBadge.textContent = badgeText;
    }

    const openButton = section.querySelector('#accountNotificationsOpenBtn');
    if (openButton && openButton.dataset.notificationsReady !== 'true') {
      openButton.dataset.notificationsReady = 'true';
      openButton.addEventListener('click', () => {
        const accountsModal = document.getElementById('accountsModal');
        if (accountsModal?.open && typeof accountsModal.close === 'function') accountsModal.close();
        setTimeout(() => {
          if (typeof window.__CRITTER_RECOVERY__?.open === 'function') window.__CRITTER_RECOVERY__.open();
          else document.getElementById('recoveryNotificationsBtn')?.click();
        }, 0);
      });
    }
    if (openButton) {
      const shouldDisable = !window.__CRITTER_RECOVERY__?.open && !document.getElementById('recoveryNotificationsBtn');
      if (openButton.disabled !== shouldDisable) openButton.disabled = shouldDisable;
    }
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

    let state = 'READY';
    let authority = 'Automatic protection';
    let detail = 'Fair Play starts automatically when a Solo, Co-op, or VS Arena match begins.';
    if (inMatch && role === 'host') {
      state = 'HOST AUTHORITY';
      authority = 'Host-authoritative validation';
      detail = 'This browser validates connected players and blocks invalid gameplay or network actions.';
    } else if (inMatch && role === 'guest') {
      state = 'HOST VALIDATED';
      authority = 'Protected by the room host';
      detail = 'Movement, combat, loot, inventory, healing, and network actions are verified by the host.';
    } else if (inMatch) {
      state = 'ACTIVE';
      authority = 'Local validation';
      detail = 'Solo gameplay uses the same movement, combat, inventory, and interaction rules.';
    }

    return {
      state,
      authority,
      detail,
      version: String(fairPlay?.version || '1.1'),
      blocked,
      strikes,
      events
    };
  }

  function ensureFairPlaySection(root) {
    if (!root) return null;
    let section = root.querySelector('.account-fair-play-section');
    if (!section) {
      section = document.createElement('section');
      section.className = 'account-manager-section account-fair-play-section';
      section.innerHTML = `
        <div class="account-section-heading">
          <div><span class="eyebrow">FAIR PLAY SECURITY</span><h3>Anti-cheat protection</h3><p>Host-authoritative checks protect movement, combat, inventory, loot, healing, interactions, and network limits.</p></div>
          <span id="accountFairPlayState" class="account-fair-play-state">READY</span>
        </div>
        <div class="account-fair-play-grid" aria-live="polite">
          <div><span>SECURITY MODE</span><strong id="accountFairPlayAuthority">Automatic protection</strong></div>
          <div><span>FAIR PLAY VERSION</span><strong id="accountFairPlayVersion">1.1</strong></div>
          <div><span>BLOCKED ACTIONS</span><strong id="accountFairPlayBlocked">0</strong></div>
          <div><span>ACTIVE STRIKES</span><strong id="accountFairPlayStrikes">0</strong></div>
        </div>
        <div class="account-fair-play-coverage" aria-label="Fair Play coverage">
          <span>Movement</span><span>Combat</span><span>Inventory</span><span>Loot</span><span>Network</span>
        </div>
        <p id="accountFairPlayDetail" class="account-fair-play-detail">Fair Play starts automatically when a match begins.</p>`;
    }

    const profiles = root.querySelector('.account-profiles-section');
    const notifications = root.querySelector('.account-notifications-section');
    if (section.parentElement !== root) {
      if (profiles) root.insertBefore(section, profiles);
      else root.appendChild(section);
    } else if (profiles && section.nextElementSibling !== profiles) {
      root.insertBefore(section, profiles);
    }
    if (notifications && notifications.nextElementSibling !== section) notifications.insertAdjacentElement('afterend', section);

    const status = readFairPlayStatus();
    const stateKey = status.state.toLowerCase().replace(/\s+/g, '-');
    if (section.dataset.state !== stateKey) section.dataset.state = stateKey;
    const setText = (selector, value) => {
      const node = section.querySelector(selector);
      if (node && node.textContent !== value) node.textContent = value;
    };
    setText('#accountFairPlayState', status.state);
    setText('#accountFairPlayAuthority', status.authority);
    setText('#accountFairPlayVersion', `v${status.version}`);
    setText('#accountFairPlayBlocked', String(status.blocked));
    setText('#accountFairPlayStrikes', String(status.strikes));
    setText('#accountFairPlayDetail', status.events
      ? `${status.detail} ${status.events} recent Fair Play event${status.events === 1 ? '' : 's'} recorded for this match.`
      : status.detail);
    return section;
  }

  function installStyles() {
    if (document.getElementById('profilePanelIntegrityStyles')) return;
    const style = document.createElement('style');
    style.id = 'profilePanelIntegrityStyles';
    style.textContent = `
      html body #menuScreen nav.lobby-action-dock,
      html body #menuScreen .dashboard > nav.lobby-action-dock.dashboard-action-panel{display:none!important;visibility:hidden!important;pointer-events:none!important}
      #accountsModal .profile-local-notice{display:flex!important;align-items:center;gap:8px;margin:8px 0 12px!important;padding:10px 12px!important}
      #accountsModal .profile-local-notice span{color:var(--muted);font-size:10px}
      #accountsModal .profile-missing-notice{display:grid;gap:3px;margin:0 0 10px;padding:11px 12px;border:1px solid rgba(255,211,111,.35);border-radius:12px;background:rgba(255,211,111,.07)}
      #accountsModal .profile-missing-notice[hidden]{display:none!important}
      #accountsModal .profile-missing-notice strong{font-size:11px;color:#ffe39a}
      #accountsModal .profile-missing-notice span{font-size:9px;color:var(--muted)}
      #accountsModal .account-notifications-section,
      #accountsModal .account-fair-play-section{display:block!important;visibility:visible!important;opacity:1!important}
      #accountsModal .account-notifications-summary,
      #accountsModal .account-fair-play-state{align-self:center;padding:6px 9px;border:1px solid rgba(103,240,239,.22);border-radius:999px;background:rgba(103,240,239,.07);color:var(--cyan,#67f0ef);font-size:9px;font-weight:850;white-space:nowrap}
      #accountsModal .account-fair-play-section[data-state="host-authority"] .account-fair-play-state,
      #accountsModal .account-fair-play-section[data-state="active"] .account-fair-play-state{border-color:rgba(126,247,212,.45);background:rgba(126,247,212,.12);color:#9fffe2}
      #accountsModal .account-notifications-open{position:relative;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:100%!important;min-height:42px!important}
      #accountsModal .account-notifications-open>b{display:grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ff5f72;color:#fff;font-size:9px;line-height:1}
      #accountsModal .account-notifications-open>b[hidden]{display:none!important}
      #accountsModal .account-fair-play-section{border-color:rgba(103,240,239,.28)!important;background:linear-gradient(145deg,rgba(103,240,239,.055),rgba(164,145,255,.035))!important}
      #accountsModal .account-fair-play-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      #accountsModal .account-fair-play-grid>div{display:grid;gap:3px;min-width:0;padding:9px 10px;border:1px solid rgba(255,255,255,.09);border-radius:11px;background:rgba(0,0,0,.14)}
      #accountsModal .account-fair-play-grid span{color:var(--muted);font-size:7px;font-weight:850;letter-spacing:.08em}
      #accountsModal .account-fair-play-grid strong{font-size:10px;overflow-wrap:anywhere}
      #accountsModal .account-fair-play-coverage{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
      #accountsModal .account-fair-play-coverage span{padding:5px 7px;border:1px solid rgba(103,240,239,.18);border-radius:999px;background:rgba(103,240,239,.055);color:#cffffd;font-size:8px;font-weight:800}
      #accountsModal .account-fair-play-detail{margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.45}
      @media(max-width:760px){#accountsModal .profile-local-notice{align-items:flex-start;flex-direction:column}#accountsModal .account-notifications-summary,#accountsModal .account-fair-play-state{white-space:normal;text-align:right}#accountsModal .account-fair-play-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:480px){#accountsModal .account-fair-play-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function repair() {
    installStyles();
    suppressMainMenuPanels();

    const modal = document.getElementById('accountsModal');
    const card = modal?.querySelector('.modal-card');
    if (!modal || !card) return false;

    const root = document.getElementById('accountManagerRevamp');
    const accountList = document.getElementById('accountList');
    removeStorageMeter(card);
    ensureLocalNotice(card, root);
    ensureNotificationsSection(root);
    ensureFairPlaySection(root);
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
      queueMicrotask(() => {
        queued = false;
        repair();
      });
    });
    observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });

    const statusTimer = window.setInterval(() => {
      const root = document.getElementById('accountManagerRevamp');
      if (root) ensureFairPlaySection(root);
      suppressMainMenuPanels();
    }, 1000);
    window.addEventListener('pagehide', () => window.clearInterval(statusTimer), { once:true });

    document.addEventListener('click', event => {
      if (event.target.closest('#accountBtn, #accountsBtn, .lobby-dock-button, #recoveryNotificationsBtn')) setTimeout(repair, 0);
    }, true);
    window.addEventListener('critter-profile-password-change', () => setTimeout(repair, 0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

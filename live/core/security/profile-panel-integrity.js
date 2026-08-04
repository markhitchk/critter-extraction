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
    const parent = target?.parentElement;
    if (parent && parent !== card) {
      const parentText = String(parent.textContent || '').replace(/\s+/g, ' ').trim();
      if (/LOCAL STORAGE/i.test(parentText) && /browser storage/i.test(parentText) && parentText.length < 300 && !parent.querySelector('#accountManagerRevamp')) {
        target = parent;
      }
    }
    return target;
  }

  function removeStorageMeter(card) {
    if (!card) return;
    const browserStorageNodes = [...card.querySelectorAll('*')]
      .filter(element => element !== card && /browser storage/i.test(String(element.textContent || '')))
      .filter(element => ![...element.children].some(child => /browser storage/i.test(String(child.textContent || ''))));

    browserStorageNodes.forEach(node => closestCompactStorageBlock(node, card)?.remove());

    [...card.querySelectorAll('*')]
      .filter(element => element.children.length === 0 && element.textContent.trim().toUpperCase() === 'LOCAL STORAGE')
      .forEach(label => {
        const parentText = String(label.parentElement?.textContent || '').replace(/\s+/g, ' ').trim();
        if (/browser storage/i.test(parentText) && parentText.length < 300) label.parentElement.remove();
        else label.remove();
      });
  }

  function suppressMainMenuQuickActions() {
    document.querySelectorAll(MAIN_MENU_DOCK_SELECTOR).forEach(dock => {
      if (!dock.hidden) dock.hidden = true;
      if (dock.getAttribute('aria-hidden') !== 'true') dock.setAttribute('aria-hidden', 'true');
      if (!dock.hasAttribute('inert')) dock.setAttribute('inert', '');
      if (dock.classList.contains('dashboard-action-panel')) dock.classList.remove('dashboard-action-panel');
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
    return notice;
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
    const quick = root.querySelector('.account-quick-section');
    if (section.parentElement !== root) {
      if (profiles) root.insertBefore(section, profiles);
      else root.appendChild(section);
    } else if (profiles && section.nextElementSibling !== profiles && section.previousElementSibling !== quick) {
      root.insertBefore(section, profiles);
    }

    const openButton = section.querySelector('#accountNotificationsOpenBtn');
    const summary = section.querySelector('#accountNotificationsSummary');
    const inlineBadge = section.querySelector('#accountNotificationsInlineBadge');
    const sourceButton = document.getElementById('recoveryNotificationsBtn');
    const sourceBadge = document.getElementById('recoveryNotificationsBadge');
    const unread = sourceBadge && !sourceBadge.hidden ? Math.max(0, Number.parseInt(sourceBadge.textContent, 10) || 0) : 0;

    const summaryText = unread ? `${unread} unread notice${unread === 1 ? '' : 's'}` : 'No unread notices';
    if (summary && summary.textContent !== summaryText) summary.textContent = summaryText;
    if (inlineBadge) {
      const shouldHide = unread < 1;
      const badgeText = unread > 99 ? '99+' : String(unread);
      if (inlineBadge.hidden !== shouldHide) inlineBadge.hidden = shouldHide;
      if (inlineBadge.textContent !== badgeText) inlineBadge.textContent = badgeText;
    }
    if (openButton) {
      const shouldDisable = !sourceButton && !window.__CRITTER_RECOVERY__?.open;
      if (openButton.disabled !== shouldDisable) openButton.disabled = shouldDisable;
      if (openButton.dataset.notificationsReady !== 'true') {
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
    }
    return section;
  }

  function ensureSecuritySection(root) {
    if (!root) return null;
    let section = root.querySelector('.account-password-section');
    if (!section) {
      section = document.createElement('section');
      section.className = 'account-manager-section account-password-section';
      section.innerHTML = '<div class="account-section-heading"><div><span class="eyebrow">SECURITY</span><h3>Protect new backups</h3><p>One password is reused for exports during this tab session.</p></div></div>';
    }

    const profiles = root.querySelector('.account-profiles-section');
    if (section.parentElement !== root) {
      if (profiles) root.insertBefore(section, profiles);
      else root.appendChild(section);
    } else if (profiles && section.nextElementSibling !== profiles) {
      root.insertBefore(section, profiles);
    }
    if (section.hidden) section.hidden = false;
    section.removeAttribute('aria-hidden');
    return section;
  }

  function createSecurityPanel() {
    const panel = document.createElement('section');
    panel.id = 'accountBackupSecurity';
    panel.className = 'account-backup-security account-security-simple';
    panel.dataset.profileIntegrityCreated = 'true';
    panel.innerHTML = `
      <div>
        <span class="eyebrow">PROFILE SECURITY V7</span>
        <strong>Backup password</strong>
        <small id="accountBackupPasswordStatus">Checking backup security…</small>
      </div>
      <label><span>Password for this tab</span><input id="accountBackupPasswordView" type="password" readonly placeholder="Not set for this tab"></label>
      <div class="account-backup-actions">
        <button class="ghost" id="showBackupPasswordBtn" type="button">Show</button>
        <button class="secondary" id="changeBackupPasswordBtn" type="button">Set / Change</button>
        <button class="ghost" id="forgetBackupPasswordBtn" type="button">Clear</button>
      </div>
      <p>This password encrypts new v7 backups and stays only in this browser tab. It is never written into the XML backup. Older backups still require their original password.</p>`;
    return panel;
  }

  function wireSecurityPanel(panel) {
    if (!panel || panel.dataset.securityIntegrityReady === 'true') return;
    panel.dataset.securityIntegrityReady = 'true';

    const input = panel.querySelector('#accountBackupPasswordView');
    const status = panel.querySelector('#accountBackupPasswordStatus');
    const show = panel.querySelector('#showBackupPasswordBtn');
    const change = panel.querySelector('#changeBackupPasswordBtn');
    const clear = panel.querySelector('#forgetBackupPasswordBtn');
    if (!input || !status || !show || !change || !clear) return;

    const refresh = () => {
      const api = window.CritterProfilePasswordUI;
      if (!api) {
        input.value = '';
        input.placeholder = 'Security system is loading';
        show.disabled = true;
        clear.disabled = true;
        change.disabled = true;
        status.textContent = 'Profile Security V7 is loading…';
        return false;
      }
      const password = api.get?.() || '';
      const account = api.account?.() || {};
      input.value = password;
      input.type = 'password';
      input.placeholder = 'Not set for this tab';
      show.textContent = 'Show';
      show.disabled = !password;
      clear.disabled = !password;
      change.disabled = false;
      status.textContent = password
        ? `Password ready for ${account.name || 'the active profile'}.`
        : `No backup password is saved for ${account.name || 'the active profile'}.`;
      return true;
    };

    show.addEventListener('click', () => {
      if (!input.value) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      show.textContent = showing ? 'Show' : 'Hide';
    });

    change.addEventListener('click', () => {
      const api = window.CritterProfilePasswordUI;
      if (!api) return alert('Profile Security V7 is still loading.');
      const first = prompt(`Enter a new backup password. Use at least ${api.min} characters.`);
      if (first == null) return;
      if (first.length < api.min) return alert(`Backup password must be at least ${api.min} characters.`);
      const second = prompt('Enter the same backup password again.');
      if (second == null) return;
      if (first !== second) return alert('Backup passwords did not match.');
      try {
        api.set(first);
        refresh();
      } catch (error) {
        alert(error?.message || 'Could not save the backup password.');
      }
    });

    clear.addEventListener('click', () => {
      window.CritterProfilePasswordUI?.clear?.();
      refresh();
    });

    window.addEventListener('critter-profile-password-change', refresh);
    panel.closest('#accountsModal')?.addEventListener('click', () => setTimeout(refresh, 0));
    refresh();
    let attempts = 0;
    const waitForApi = () => {
      if (refresh() || attempts++ > 80) return;
      setTimeout(waitForApi, 100);
    };
    waitForApi();
  }

  function ensureSecurity(root) {
    const section = ensureSecuritySection(root);
    if (!section) return;
    let panel = document.getElementById('accountBackupSecurity');
    const created = !panel;
    if (!panel) panel = createSecurityPanel();
    if (panel.hidden) panel.hidden = false;
    panel.removeAttribute('aria-hidden');
    panel.classList.add('account-security-simple');
    if (panel.parentElement !== section) section.appendChild(panel);
    if (created || panel.dataset.profileIntegrityCreated === 'true') wireSecurityPanel(panel);
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
      #accountsModal .account-password-section{display:block!important;visibility:visible!important;opacity:1!important}
      #accountsModal .account-notifications-summary{align-self:center;padding:6px 9px;border:1px solid rgba(103,240,239,.22);border-radius:999px;background:rgba(103,240,239,.07);color:var(--cyan,#67f0ef);font-size:9px;font-weight:850;white-space:nowrap}
      #accountsModal .account-notifications-open{position:relative;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:100%!important;min-height:42px!important}
      #accountsModal .account-notifications-open>b{display:grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ff5f72;color:#fff;font-size:9px;line-height:1}
      #accountsModal .account-notifications-open>b[hidden]{display:none!important}
      #accountsModal #accountBackupSecurity{display:grid!important;visibility:visible!important;opacity:1!important}
      #accountsModal #accountBackupSecurity[hidden]{display:grid!important}
      @media(max-width:760px){#accountsModal .profile-local-notice{align-items:flex-start;flex-direction:column}#accountsModal .account-notifications-summary{white-space:normal;text-align:right}}
    `;
    document.head.appendChild(style);
  }

  function repair() {
    installStyles();
    suppressMainMenuQuickActions();

    const modal = document.getElementById('accountsModal');
    const card = modal?.querySelector('.modal-card');
    if (!modal || !card) return false;

    const root = document.getElementById('accountManagerRevamp');
    const accountList = document.getElementById('accountList');
    removeStorageMeter(card);
    ensureLocalNotice(card, root);
    ensureNotificationsSection(root);
    ensureSecurity(root);
    ensureMissingProfileNotice(root, accountList);
    return true;
  }

  function start() {
    installStyles();
    suppressMainMenuQuickActions();
    let attempts = 0;
    const bootRepair = () => {
      repair();
      if (attempts++ < 160) setTimeout(bootRepair, 100);
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

    document.addEventListener('click', event => {
      if (event.target.closest('#accountBtn, #accountsBtn, .lobby-dock-button, #recoveryNotificationsBtn')) setTimeout(repair, 0);
    }, true);
    window.addEventListener('critter-profile-password-change', () => setTimeout(repair, 0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

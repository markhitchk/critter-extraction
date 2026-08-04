(() => {
  'use strict';

  const NOTICE_HTML = '<strong>Saved only on this device.</strong><span>Your progress, stash, Petals, appearance, statistics, loadout, and settings are local. Create an encrypted backup before clearing browser data or moving devices.</span>';

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

  function ensureLocalNotice(card, root) {
    let notice = card.querySelector('.profile-local-notice, .account-manager-intro');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'account-note account-manager-intro profile-local-notice';
      if (root) root.insertAdjacentElement('beforebegin', notice);
      else card.querySelector(':scope > header')?.insertAdjacentElement('afterend', notice);
    }
    notice.hidden = false;
    notice.removeAttribute('aria-hidden');
    notice.innerHTML = NOTICE_HTML;
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
    const hasProfile = !!accountList.querySelector('.account-row');
    notice.hidden = hasProfile;
  }

  function ensureSecuritySection(root) {
    if (!root) return null;
    let section = root.querySelector('.account-password-section');
    if (!section) {
      section = document.createElement('section');
      section.className = 'account-manager-section account-password-section';
      section.innerHTML = '<div class="account-section-heading"><div><span class="eyebrow">SECURITY</span><h3>Protect new backups</h3><p>One password is reused for exports during this tab session.</p></div></div>';
      const transfer = root.querySelector('.account-transfer-section');
      if (transfer) transfer.insertAdjacentElement('beforebegin', section);
      else root.appendChild(section);
    }
    section.hidden = false;
    return section;
  }

  function createSecurityPanel() {
    const panel = document.createElement('section');
    panel.id = 'accountBackupSecurity';
    panel.className = 'account-backup-security account-security-simple';
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
    if (!panel) panel = createSecurityPanel();
    panel.hidden = false;
    panel.classList.add('account-security-simple');
    section.appendChild(panel);
    wireSecurityPanel(panel);
  }

  function installStyles() {
    if (document.getElementById('profilePanelIntegrityStyles')) return;
    const style = document.createElement('style');
    style.id = 'profilePanelIntegrityStyles';
    style.textContent = `
      #accountsModal .profile-local-notice{display:flex!important;align-items:center;gap:8px;margin:8px 0 12px!important;padding:10px 12px!important}
      #accountsModal .profile-local-notice span{color:var(--muted);font-size:10px}
      #accountsModal .profile-missing-notice{display:grid;gap:3px;margin:0 0 10px;padding:11px 12px;border:1px solid rgba(255,211,111,.35);border-radius:12px;background:rgba(255,211,111,.07)}
      #accountsModal .profile-missing-notice[hidden]{display:none!important}
      #accountsModal .profile-missing-notice strong{font-size:11px;color:#ffe39a}
      #accountsModal .profile-missing-notice span{font-size:9px;color:var(--muted)}
      #accountsModal #accountBackupSecurity{display:grid!important;visibility:visible!important;opacity:1!important}
      #accountsModal #accountBackupSecurity[hidden]{display:grid!important}
      @media(max-width:760px){#accountsModal .profile-local-notice{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function repair() {
    const modal = document.getElementById('accountsModal');
    const card = modal?.querySelector('.modal-card');
    if (!modal || !card) return false;

    const root = document.getElementById('accountManagerRevamp');
    const accountList = document.getElementById('accountList');
    removeStorageMeter(card);
    ensureLocalNotice(card, root);
    ensureMissingProfileNotice(root, accountList);
    ensureSecurity(root);
    installStyles();
    return true;
  }

  function start() {
    let attempts = 0;
    const bootRepair = () => {
      repair();
      if (attempts++ < 120) setTimeout(bootRepair, 100);
    };
    bootRepair();

    const observer = new MutationObserver(() => repair());
    observer.observe(document.documentElement, { childList:true, subtree:true });

    document.addEventListener('click', event => {
      if (event.target.closest('#accountBtn, #accountsBtn, .lobby-dock-button')) setTimeout(repair, 0);
    }, true);
    window.addEventListener('critter-profile-password-change', () => setTimeout(repair, 0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();

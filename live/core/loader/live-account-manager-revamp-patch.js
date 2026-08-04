(() => {
  'use strict';

  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Account manager revamp loaded before the Critter patch runtime');
  }

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectAccountManagerRevamp() {
    previousUi?.();

    const menuScreen = document.getElementById('menuScreen');
    const syncMainMenuState = () => {
      document.body.classList.toggle('critter-main-menu-active', !!menuScreen?.classList.contains('active'));
    };
    syncMainMenuState();
    if (menuScreen && !menuScreen.dataset.topbarObserverReady) {
      menuScreen.dataset.topbarObserverReady = 'true';
      new MutationObserver(syncMainMenuState).observe(menuScreen, { attributes:true, attributeFilter:['class'] });
    }

    const modal = document.getElementById('accountsModal');
    const card = modal?.querySelector('.modal-card');
    const accountList = document.getElementById('accountList');
    if (!modal || !card || !accountList || document.getElementById('accountManagerRevamp')) {
      return;
    }

    const removeStorageMeter = () => {
      const labels = [...card.querySelectorAll('*')].filter(element =>
        element.children.length === 0 && element.textContent.trim().toUpperCase() === 'LOCAL STORAGE'
      );
      labels.forEach(label => {
        let target = label.parentElement;
        while (target && target !== card && !/browser storage/i.test(target.textContent)) {
          target = target.parentElement;
        }
        if (!target || target === card) {
          label.parentElement?.remove();
          return;
        }
        const combined = target.textContent.toUpperCase();
        if (combined.includes('ACTIVE ACCOUNT') || combined.includes('PROFILES')) {
          const storageChild = [...target.children].find(child => /LOCAL STORAGE/i.test(child.textContent));
          if (storageChild) storageChild.remove();
          else label.parentElement?.remove();
        } else {
          target.remove();
        }
      });
    };
    removeStorageMeter();
    setTimeout(removeStorageMeter, 0);
    new MutationObserver(removeStorageMeter).observe(card, { childList:true, subtree:true });

    card.classList.add('account-manager-revamp');
    const eyebrow = card.querySelector(':scope > header .eyebrow');
    const title = card.querySelector(':scope > header h2');
    if (eyebrow) eyebrow.textContent = 'LOCAL PROFILES';
    if (title) title.textContent = 'Profiles & Backups';

    const oldNote = card.querySelector(':scope > .account-note');
    if (oldNote) {
      oldNote.classList.add('account-manager-intro');
      oldNote.innerHTML = '<strong>Saved only on this device.</strong><span>Choose a profile, create an encrypted backup, or restore one from another browser. No online login is required.</span>';
    }

    const security = document.getElementById('accountBackupSecurity');
    if (security) {
      security.classList.add('account-security-simple');
      const securityEyebrow = security.querySelector('.eyebrow');
      const securityTitle = security.querySelector('strong');
      const securityParagraph = security.querySelector('p');
      const passwordLabel = security.querySelector('label > span');
      const changeButton = document.getElementById('changeBackupPasswordBtn');
      const forgetButton = document.getElementById('forgetBackupPasswordBtn');
      if (securityEyebrow) securityEyebrow.textContent = 'ENCRYPTED BACKUPS';
      if (securityTitle) securityTitle.textContent = 'Backup password';
      if (passwordLabel) passwordLabel.textContent = 'Password for this tab';
      if (changeButton) changeButton.textContent = 'Change password';
      if (forgetButton) forgetButton.textContent = 'Clear';
      if (securityParagraph) securityParagraph.textContent = 'This password encrypts new v7 backups and stays only in this browser tab. It is never written into the XML file.';
    }

    const xmlTools = card.querySelector(':scope > .xml-profile-tools');
    const oldFooter = card.querySelector(':scope > footer');
    const importFileButton = document.getElementById('importAccountBtn');
    const backupCodeButton = document.getElementById('legacyImportBtn');
    const copyInviteButton = document.getElementById('copyInviteBtn');
    const newAccountButton = document.getElementById('newAccountBtn');
    const urlInput = document.getElementById('profileXmlUrlInput');
    const importUrlButton = document.getElementById('importProfileUrlBtn');

    if (urlInput) {
      urlInput.placeholder = 'Paste a Critter profile link or XML URL';
      const label = urlInput.closest('label');
      if (label) {
        for (const node of [...label.childNodes]) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.textContent = 'Profile link or XML URL';
        }
      }
    }
    if (importUrlButton) importUrlButton.textContent = 'Import link';
    if (importFileButton) importFileButton.textContent = 'Upload XML file';
    if (backupCodeButton) backupCodeButton.textContent = 'Paste backup code';
    if (copyInviteButton) copyInviteButton.textContent = 'Copy game invite';
    if (newAccountButton) newAccountButton.textContent = 'New profile';

    const root = document.createElement('div');
    root.id = 'accountManagerRevamp';
    root.className = 'account-manager-layout';

    const quickSection = document.createElement('section');
    quickSection.className = 'account-manager-section account-quick-section';
    quickSection.innerHTML = `
      <div class="account-section-heading">
        <div><span class="eyebrow">QUICK ACCESS</span><h3>Game tools</h3><p>Controls, settings, and your Petals balance stay close to your profile.</p></div>
      </div>
      <div class="account-quick-actions" id="accountQuickActions"></div>`;

    const quickActions = quickSection.querySelector('#accountQuickActions');
    const controlsButton = document.querySelector('.top-actions [data-open="helpModal"]');
    const settingsButton = document.querySelector('.top-actions [data-open="settingsModal"]');
    const petalsButton = document.getElementById('topPetalsBtn');
    [controlsButton, settingsButton].filter(Boolean).forEach(button => {
      button.classList.add('account-quick-button');
      button.addEventListener('click', () => {
        if (modal.open && typeof modal.close === 'function') modal.close();
      }, true);
      quickActions.appendChild(button);
    });
    if (petalsButton) {
      const petalsQuickButton = document.createElement('button');
      petalsQuickButton.type = 'button';
      petalsQuickButton.className = 'petals-chip account-quick-button account-petals-proxy';
      const syncPetalsProxy = () => {
        petalsQuickButton.innerHTML = petalsButton.innerHTML;
        petalsQuickButton.setAttribute('aria-label', petalsButton.getAttribute('aria-label') || 'Open Trading Post');
      };
      petalsQuickButton.addEventListener('click', () => {
        if (modal.open && typeof modal.close === 'function') modal.close();
        petalsButton.click();
      });
      syncPetalsProxy();
      new MutationObserver(syncPetalsProxy).observe(petalsButton, { childList:true, subtree:true, characterData:true });
      quickActions.appendChild(petalsQuickButton);
    }

    const profilesSection = document.createElement('section');
    profilesSection.className = 'account-manager-section account-profiles-section';
    profilesSection.innerHTML = `
      <div class="account-section-heading">
        <div><span class="eyebrow">PROFILES</span><h3>Profiles on this device</h3><p>Switch, edit, back up, or remove a local save.</p></div>
        <div class="account-summary" aria-live="polite"><strong id="accountProfileCount">0</strong><span>profiles</span><b id="accountActiveName">No active profile</b></div>
      </div>
      <div class="account-toolbar">
        <label class="account-search-field"><span>Find a profile</span><input id="simpleAccountSearch" type="search" autocomplete="off" placeholder="Search name or username"></label>
        <button class="secondary" id="backupActiveProfileBtn" type="button">Back up active</button>
        <button class="ghost" id="clearAccountSearchBtn" type="button">Clear</button>
      </div>`;
    profilesSection.appendChild(accountList);

    const securitySection = document.createElement('section');
    securitySection.className = 'account-manager-section account-password-section';
    securitySection.innerHTML = '<div class="account-section-heading"><div><span class="eyebrow">SECURITY</span><h3>Protect new backups</h3><p>One password is reused for exports during this tab session.</p></div></div>';
    if (security) securitySection.appendChild(security);

    const transferSection = document.createElement('section');
    transferSection.className = 'account-manager-section account-transfer-section';
    transferSection.innerHTML = `
      <div class="account-section-heading"><div><span class="eyebrow">RESTORE OR TRANSFER</span><h3>Move a profile</h3><p>Open only the transfer method you need.</p></div></div>
      <div class="account-transfer-folds">
        <details class="account-transfer-fold">
          <summary><span aria-hidden="true">↓</span><div><strong>Upload an XML backup</strong><small>Restore an encrypted v7 account file.</small></div><b aria-hidden="true">⌄</b></summary>
          <div class="account-transfer-panel account-transfer-actions" id="restoreFileActions"></div>
        </details>
        <details class="account-transfer-fold">
          <summary><span aria-hidden="true">↗</span><div><strong>Import from a profile link</strong><small>Use a copied profile link or direct XML URL.</small></div><b aria-hidden="true">⌄</b></summary>
          <div class="account-transfer-panel account-link-import" id="profileLinkImport"></div>
        </details>
        <details class="account-transfer-fold">
          <summary><span aria-hidden="true">＋</span><div><strong>More profile options</strong><small>Backup codes, game invites, and new profiles.</small></div><b aria-hidden="true">⌄</b></summary>
          <div class="account-transfer-panel account-transfer-actions" id="otherProfileActions"></div>
        </details>
      </div>`;

    const restoreActions = transferSection.querySelector('#restoreFileActions');
    const linkImport = transferSection.querySelector('#profileLinkImport');
    const otherActions = transferSection.querySelector('#otherProfileActions');
    if (importFileButton) restoreActions.appendChild(importFileButton);
    if (xmlTools) linkImport.appendChild(xmlTools);
    if (backupCodeButton) otherActions.appendChild(backupCodeButton);
    if (copyInviteButton) otherActions.appendChild(copyInviteButton);
    if (newAccountButton) otherActions.appendChild(newAccountButton);

    root.append(quickSection, profilesSection, securitySection, transferSection);
    if (oldNote) oldNote.insertAdjacentElement('afterend', root);
    else card.querySelector(':scope > header')?.insertAdjacentElement('afterend', root);
    if (oldFooter) oldFooter.remove();

    const search = document.getElementById('simpleAccountSearch');
    const clearSearch = document.getElementById('clearAccountSearchBtn');
    const backupActive = document.getElementById('backupActiveProfileBtn');
    const count = document.getElementById('accountProfileCount');
    const activeName = document.getElementById('accountActiveName');

    const buttonByText = (row, text) => [...row.querySelectorAll('button')].find(button => button.textContent.trim().toLowerCase() === text.toLowerCase());
    const refreshRows = () => {
      const rows = [...accountList.querySelectorAll('.account-row')];
      const query = String(search?.value || '').trim().toLowerCase();
      let visible = 0;
      rows.forEach(row => {
        const matches = !query || row.textContent.toLowerCase().includes(query);
        row.hidden = !matches;
        if (matches) visible += 1;
        const download = buttonByText(row, 'Download Account');
        const copy = buttonByText(row, 'Copy Profile URL');
        if (download) download.textContent = 'Back up';
        if (copy) copy.textContent = 'Copy link';
        const activeButton = buttonByText(row, 'Active');
        if (activeButton) {
          activeButton.disabled = true;
          activeButton.setAttribute('aria-current', 'true');
        }
      });
      if (count) count.textContent = query ? String(visible) : String(rows.length);
      const activeRow = accountList.querySelector('.account-row.active');
      const activeText = activeRow?.querySelector('.account-info strong, .info strong, strong')?.textContent?.trim() || 'No active profile';
      if (activeName) activeName.textContent = activeText;
      if (backupActive) backupActive.disabled = !activeRow;
    };

    search?.addEventListener('input', refreshRows);
    clearSearch?.addEventListener('click', () => {
      if (!search) return;
      search.value = '';
      search.focus();
      refreshRows();
    });
    backupActive?.addEventListener('click', () => {
      const activeRow = accountList.querySelector('.account-row.active');
      const button = activeRow && ([...activeRow.querySelectorAll('button')].find(item => /^(back up|download account)$/i.test(item.textContent.trim())));
      button?.click();
    });

    const observer = new MutationObserver(refreshRows);
    observer.observe(accountList, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class'] });
    modal.addEventListener('close', () => {
      if (search) search.value = '';
      refreshRows();
    });
    document.getElementById('accountBtn')?.addEventListener('click', () => setTimeout(removeStorageMeter, 0));
    document.getElementById('accountsBtn')?.addEventListener('click', () => setTimeout(removeStorageMeter, 0));
    setTimeout(refreshRows, 0);

    if (!document.getElementById('accountManagerRevampStyles')) {
      const style = document.createElement('style');
      style.id = 'accountManagerRevampStyles';
      style.textContent = `
body.critter-main-menu-active .topbar{justify-content:space-between!important}
body.critter-main-menu-active .topbar>.brand{display:flex!important;visibility:visible!important}
body.critter-main-menu-active .top-actions{margin-left:auto!important}
body.critter-main-menu-active .top-actions>:not(#accountBtn):not(#topPetalsBtn){display:none!important}
body.critter-main-menu-active #topPetalsBtn{display:flex!important}
body.critter-main-menu-active #accountBtn small{font-size:0}
body.critter-main-menu-active #accountBtn small:after{content:'Profile';font-size:9px}
#accountsModal .account-manager-revamp{width:min(920px,calc(100vw - 18px))!important;max-height:calc(100dvh - 18px)!important;overflow:auto!important;padding:16px!important}
.account-manager-intro{display:flex!important;align-items:center;gap:8px!important;margin:8px 0 12px!important;padding:10px 12px!important}
.account-manager-intro span{color:var(--muted);font-size:10px}
.account-manager-layout{display:grid;gap:12px}
.account-manager-section{border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.025);padding:12px;min-width:0}
.account-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:10px}
.account-section-heading h3{margin:2px 0 3px;font-size:16px}.account-section-heading p{margin:0;color:var(--muted);font-size:9px}
.account-quick-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.account-quick-actions .account-quick-button{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;width:100%!important;min-height:44px!important;margin:0!important;padding:9px 12px!important;border-radius:12px!important;font-size:10px!important}
.account-quick-actions .petals-chip{background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:none!important}
.account-quick-actions .petals-chip strong{font-size:10px!important}
.account-summary{display:grid;grid-template-columns:auto auto;align-items:baseline;gap:1px 5px;text-align:right;white-space:nowrap}.account-summary strong{font-size:20px}.account-summary span{font-size:8px;color:var(--muted);text-transform:uppercase}.account-summary b{grid-column:1/-1;font-size:9px;color:var(--cyan,#64e8ea)}
.account-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) auto auto;gap:8px;align-items:end;margin-bottom:10px}.account-search-field{display:grid;gap:4px}.account-search-field span{font-size:8px;color:var(--muted);text-transform:uppercase;font-weight:800}.account-search-field input{width:100%;min-width:0}
#accountsModal .account-list{display:grid!important;gap:8px!important;max-height:280px!important;overflow:auto!important;padding-right:2px}
#accountsModal .account-row{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:10px!important;border-radius:13px!important}
#accountsModal .account-row>div:last-child{display:flex!important;flex-wrap:wrap!important;justify-content:flex-end!important;gap:5px!important}
#accountsModal .account-row button{min-height:34px!important;padding:7px 10px!important;font-size:9px!important}
.account-password-section{padding-bottom:10px}.account-security-simple{margin:0!important;padding:10px!important;border-radius:13px!important;display:grid!important;grid-template-columns:minmax(180px,1fr) minmax(180px,.8fr) auto!important;align-items:end!important;gap:10px!important}
.account-security-simple>div:first-child{align-self:center}.account-security-simple label{margin:0!important}.account-security-simple .account-backup-actions{display:flex!important;gap:5px!important;flex-wrap:wrap!important}.account-security-simple p{grid-column:1/-1!important;margin:0!important;font-size:8px!important;color:var(--muted)!important}
.account-transfer-folds{display:grid;gap:8px}
.account-transfer-fold{border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(0,0,0,.12);overflow:hidden}
.account-transfer-fold>summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 12px;cursor:pointer;list-style:none;background:rgba(255,255,255,.025)}
.account-transfer-fold>summary::-webkit-details-marker{display:none}
.account-transfer-fold>summary>span{font-size:18px;color:var(--cyan,#64e8ea)}
.account-transfer-fold>summary>div{display:grid;gap:2px}.account-transfer-fold>summary strong{font-size:11px}.account-transfer-fold>summary small{font-size:8px;color:var(--muted)}
.account-transfer-fold>summary>b{font-size:16px;transition:transform .15s}.account-transfer-fold[open]>summary>b{transform:rotate(180deg)}
.account-transfer-panel{padding:10px 12px;border-top:1px solid rgba(255,255,255,.07)}
.account-transfer-actions,.account-link-import{display:flex;flex-wrap:wrap;gap:6px}
.account-link-import .xml-profile-tools{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:6px!important;width:100%!important;margin:0!important;padding:0!important;border:0!important;background:none!important}.account-link-import label{min-width:0!important}.account-link-import input{width:100%!important;min-width:0!important}.account-transfer-actions button,.account-link-import button{min-height:36px!important;font-size:9px!important}
@media(max-width:760px){.account-quick-actions{grid-template-columns:1fr}.account-security-simple{grid-template-columns:1fr}.account-security-simple p{grid-column:1}.account-toolbar{grid-template-columns:1fr 1fr}.account-toolbar .account-search-field{grid-column:1/-1}#accountsModal .account-row{grid-template-columns:auto minmax(0,1fr)!important}#accountsModal .account-row>div:last-child{grid-column:1/-1;justify-content:flex-start!important}.account-section-heading{align-items:flex-start}.account-manager-intro{align-items:flex-start;flex-direction:column}}
@media(max-width:560px){body.critter-main-menu-active .topbar{gap:8px!important}body.critter-main-menu-active .topbar>.brand span small{display:none!important}body.critter-main-menu-active #topPetalsBtn{padding:7px 9px!important}}
@media(max-height:700px){#accountsModal .account-manager-revamp{padding:12px!important}.account-manager-layout{gap:8px}.account-manager-section{padding:9px}#accountsModal .account-list{max-height:190px!important}.account-section-heading{margin-bottom:7px}.account-transfer-fold>summary{padding:9px 10px}}
`;
      document.head.appendChild(style);
    }
  };
})();
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
      <div class="account-section-heading"><div><span class="eyebrow">RESTORE OR TRANSFER</span><h3>Move a profile</h3><p>Use a file or link. Matching profiles ask before they are replaced.</p></div></div>
      <div class="account-transfer-grid">
        <article><span aria-hidden="true">↓</span><div><strong>Restore a backup</strong><small>Import an encrypted v7 XML file from this or another browser.</small></div><div class="account-transfer-actions" id="restoreFileActions"></div></article>
        <article><span aria-hidden="true">↗</span><div><strong>Use a profile link</strong><small>Paste a copied profile link or a direct XML URL.</small></div><div class="account-link-import" id="profileLinkImport"></div></article>
        <article><span aria-hidden="true">＋</span><div><strong>Other options</strong><small>Use an older backup code, share a game invite, or start fresh.</small></div><div class="account-transfer-actions" id="otherProfileActions"></div></article>
      </div>`;

    const restoreActions = transferSection.querySelector('#restoreFileActions');
    const linkImport = transferSection.querySelector('#profileLinkImport');
    const otherActions = transferSection.querySelector('#otherProfileActions');
    if (importFileButton) restoreActions.appendChild(importFileButton);
    if (xmlTools) linkImport.appendChild(xmlTools);
    if (backupCodeButton) otherActions.appendChild(backupCodeButton);
    if (copyInviteButton) otherActions.appendChild(copyInviteButton);
    if (newAccountButton) otherActions.appendChild(newAccountButton);

    root.append(profilesSection, securitySection, transferSection);
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
    setTimeout(refreshRows, 0);

    if (!document.getElementById('accountManagerRevampStyles')) {
      const style = document.createElement('style');
      style.id = 'accountManagerRevampStyles';
      style.textContent = `
body.critter-main-menu-active .topbar{justify-content:flex-end!important}
body.critter-main-menu-active .topbar>.brand,body.critter-main-menu-active .top-actions>:not(#accountBtn){display:none!important}
body.critter-main-menu-active .top-actions{margin-left:auto!important}
body.critter-main-menu-active #accountBtn small{font-size:0}
body.critter-main-menu-active #accountBtn small:after{content:'Profile';font-size:9px}
#accountsModal .account-manager-revamp{width:min(920px,calc(100vw - 18px))!important;max-height:calc(100dvh - 18px)!important;overflow:auto!important;padding:16px!important}
.account-manager-intro{display:flex!important;align-items:center;gap:8px!important;margin:8px 0 12px!important;padding:10px 12px!important}
.account-manager-intro span{color:var(--muted);font-size:10px}
.account-manager-layout{display:grid;gap:12px}
.account-manager-section{border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.025);padding:12px;min-width:0}
.account-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:10px}
.account-section-heading h3{margin:2px 0 3px;font-size:16px}.account-section-heading p{margin:0;color:var(--muted);font-size:9px}
.account-summary{display:grid;grid-template-columns:auto auto;align-items:baseline;gap:1px 5px;text-align:right;white-space:nowrap}.account-summary strong{font-size:20px}.account-summary span{font-size:8px;color:var(--muted);text-transform:uppercase}.account-summary b{grid-column:1/-1;font-size:9px;color:var(--cyan,#64e8ea)}
.account-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) auto auto;gap:8px;align-items:end;margin-bottom:10px}.account-search-field{display:grid;gap:4px}.account-search-field span{font-size:8px;color:var(--muted);text-transform:uppercase;font-weight:800}.account-search-field input{width:100%;min-width:0}
#accountsModal .account-list{display:grid!important;gap:8px!important;max-height:280px!important;overflow:auto!important;padding-right:2px}
#accountsModal .account-row{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:10px!important;border-radius:13px!important}
#accountsModal .account-row>div:last-child{display:flex!important;flex-wrap:wrap!important;justify-content:flex-end!important;gap:5px!important}
#accountsModal .account-row button{min-height:34px!important;padding:7px 10px!important;font-size:9px!important}
.account-password-section{padding-bottom:10px}.account-security-simple{margin:0!important;padding:10px!important;border-radius:13px!important;display:grid!important;grid-template-columns:minmax(180px,1fr) minmax(180px,.8fr) auto!important;align-items:end!important;gap:10px!important}
.account-security-simple>div:first-child{align-self:center}.account-security-simple label{margin:0!important}.account-security-simple .account-backup-actions{display:flex!important;gap:5px!important;flex-wrap:wrap!important}.account-security-simple p{grid-column:1/-1!important;margin:0!important;font-size:8px!important;color:var(--muted)!important}
.account-transfer-grid{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:8px}.account-transfer-grid article{display:grid;grid-template-columns:auto 1fr;gap:8px;align-content:start;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(0,0,0,.12)}.account-transfer-grid article>span{font-size:18px;color:var(--cyan,#64e8ea)}.account-transfer-grid strong{font-size:11px}.account-transfer-grid small{display:block;margin-top:3px;color:var(--muted);font-size:8px;line-height:1.35}.account-transfer-actions,.account-link-import{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.account-link-import .xml-profile-tools{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:6px!important;width:100%!important;margin:0!important;padding:0!important;border:0!important;background:none!important}.account-link-import label{min-width:0!important}.account-link-import input{width:100%!important;min-width:0!important}.account-transfer-actions button,.account-link-import button{min-height:36px!important;font-size:9px!important}
@media(max-width:760px){.account-transfer-grid{grid-template-columns:1fr}.account-security-simple{grid-template-columns:1fr}.account-security-simple p{grid-column:1}.account-toolbar{grid-template-columns:1fr 1fr}.account-toolbar .account-search-field{grid-column:1/-1}#accountsModal .account-row{grid-template-columns:auto minmax(0,1fr)!important}#accountsModal .account-row>div:last-child{grid-column:1/-1;justify-content:flex-start!important}.account-section-heading{align-items:flex-start}.account-manager-intro{align-items:flex-start;flex-direction:column}}
@media(max-height:700px){#accountsModal .account-manager-revamp{padding:12px!important}.account-manager-layout{gap:8px}.account-manager-section{padding:9px}#accountsModal .account-list{max-height:190px!important}.account-section-heading{margin-bottom:7px}.account-transfer-grid article{padding:8px}}
`;
      document.head.appendChild(style);
    }
  };
})();

(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const SESSION_TAB_KEY = 'critter.ui.settings.activeTab';
  const SESSION_ACCOUNT_SEARCH_KEY = 'critter.ui.accounts.search';

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  }

  function make(tag, className, html) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (html !== undefined) element.innerHTML = html;
    return element;
  }

  function dispatchControl(control) {
    if (!control) return;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setControl(id, value) {
    const control = document.getElementById(id);
    if (!control) return;
    if (control.type === 'checkbox') control.checked = Boolean(value);
    else control.value = String(value);
    dispatchControl(control);
  }

  function setSaveStatus(message, state = '') {
    const note = $('.settings-revamp-card .setting-save-note');
    if (!note) return;
    note.textContent = message;
    note.dataset.state = state;
  }

  function applyPerformancePreset(name) {
    const presets = {
      battery: {
        quality: 'low', renderScale: 0.7, fogEnabled: false,
        compatibilityMode: true, reducedMotion: true, hudScale: 95
      },
      balanced: {
        quality: 'medium', renderScale: 0.85, fogEnabled: true,
        compatibilityMode: false, reducedMotion: false, hudScale: 100
      },
      quality: {
        quality: 'high', renderScale: 1, fogEnabled: true,
        compatibilityMode: false, reducedMotion: false, hudScale: 100
      }
    };

    let selected = name;
    if (name === 'auto') {
      const memory = Number(navigator.deviceMemory) || 0;
      const cores = Number(navigator.hardwareConcurrency) || 0;
      const constrained = /CrOS|Android|iPhone|iPad/i.test(navigator.userAgent || '') ||
        (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
      const powerful = memory >= 8 && cores >= 8 && !/Android|iPhone|iPad/i.test(navigator.userAgent || '');
      selected = constrained ? 'battery' : (powerful ? 'quality' : 'balanced');
    }

    const preset = presets[selected] || presets.balanced;
    Object.entries(preset).forEach(([id, value]) => setControl(id, value));
    setSaveStatus(`${name === 'auto' ? 'Auto-detected' : 'Preset applied'}: ${selected === 'battery' ? 'Performance' : selected === 'quality' ? 'High quality' : 'Balanced'}`, 'saved');
  }

  function initSettingsRevamp() {
    const modal = document.getElementById('settingsModal');
    const form = document.getElementById('settingsForm');
    const grid = form?.querySelector('.settings-grid');
    if (!modal || !form || !grid || form.dataset.revamped === 'true') return;

    form.dataset.revamped = 'true';
    form.classList.add('settings-revamp-card');
    modal.classList.add('settings-revamp-modal');

    const header = form.querySelector('header');
    const eyebrow = header?.querySelector('.eyebrow');
    const title = header?.querySelector('h2');
    if (eyebrow) eyebrow.textContent = 'GAMEPLAY • CAMERA • PERFORMANCE';
    if (title) title.textContent = 'Game Settings';

    const intro = make('p', 'settings-revamp-intro', 'Tune the active Critter account. Every change is stored locally and applied without replacing another account’s setup.');
    header?.insertAdjacentElement('afterend', intro);

    const overview = make('div', 'settings-overview', `
      <span><b>01</b><strong>Per-account</strong><small>Each profile keeps its own setup</small></span>
      <span><b>02</b><strong>Auto-save</strong><small>Changes save in this browser</small></span>
      <span><b>03</b><strong>Live apply</strong><small>Most options update immediately</small></span>
    `);
    intro.insertAdjacentElement('afterend', overview);

    const presetPanel = make('section', 'performance-presets', `
      <div class="preset-copy">
        <span class="eyebrow">QUICK PERFORMANCE SETUP</span>
        <strong>Choose a starting point</strong>
        <small>Fine-tune individual options afterward. Auto Detect uses the browser’s available device hints.</small>
      </div>
      <div class="preset-actions" role="group" aria-label="Graphics performance presets">
        <button type="button" class="preset-button" data-settings-preset="auto"><b>Auto Detect</b><small>Recommended</small></button>
        <button type="button" class="preset-button" data-settings-preset="battery"><b>Performance</b><small>Higher frame rate</small></button>
        <button type="button" class="preset-button" data-settings-preset="balanced"><b>Balanced</b><small>Default mix</small></button>
        <button type="button" class="preset-button" data-settings-preset="quality"><b>High Quality</b><small>Sharper visuals</small></button>
      </div>
    `);
    overview.insertAdjacentElement('afterend', presetPanel);

    const sectionData = [
      { key: 'gameplay', match: 'gameplay', label: 'Gameplay', icon: '◆', description: 'Difficulty, assists, enemy behavior, and testing tools.' },
      { key: 'camera', match: 'camera', label: 'Camera', icon: '◎', description: 'View mode, shoulder position, field of view, and aiming feel.' },
      { key: 'graphics', match: 'graphics', label: 'Performance', icon: '▦', description: 'Model detail, render scale, fog, and compatibility options.' },
      { key: 'interface', match: 'interface', label: 'Interface & Audio', icon: '◫', description: 'HUD size, sound volume, and touch controls.' }
    ];

    const sections = $$('.settings-grid > section', form);
    const nav = make('div', 'settings-tabs');
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Settings categories');

    sectionData.forEach((meta, index) => {
      const section = sections.find(item => item.querySelector('h3')?.textContent.toLowerCase().includes(meta.match));
      if (!section) return;

      const panelId = `settings-panel-${meta.key}`;
      const tabId = `settings-tab-${meta.key}`;
      section.id = panelId;
      section.dataset.settingsPanel = meta.key;
      section.setAttribute('role', 'tabpanel');
      section.setAttribute('aria-labelledby', tabId);
      section.classList.add('settings-category-panel');

      const oldHeading = section.querySelector('h3');
      if (oldHeading && !section.querySelector('.settings-section-heading')) {
        const heading = make('div', 'settings-section-heading');
        const icon = make('span', 'settings-section-icon', meta.icon);
        const copy = make('div', '', `<small>${String(index + 1).padStart(2, '0')}</small><p>${meta.description}</p>`);
        oldHeading.replaceWith(heading);
        copy.prepend(oldHeading);
        heading.append(icon, copy);
      }

      const button = make('button', 'settings-tab', `<span>${meta.icon}</span><b>${meta.label}</b>`);
      button.type = 'button';
      button.id = tabId;
      button.dataset.settingsTab = meta.key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panelId);
      button.setAttribute('aria-selected', 'false');
      button.tabIndex = -1;
      nav.appendChild(button);
    });

    presetPanel.insertAdjacentElement('afterend', nav);

    function selectTab(key, focus = false) {
      const available = $$('[data-settings-tab]', nav);
      const chosen = available.find(button => button.dataset.settingsTab === key) || available[0];
      if (!chosen) return;
      available.forEach(button => {
        const active = button === chosen;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      $$('[data-settings-panel]', grid).forEach(panel => {
        const active = panel.dataset.settingsPanel === chosen.dataset.settingsTab;
        panel.hidden = !active;
        panel.classList.toggle('active', active);
      });
      try { sessionStorage.setItem(SESSION_TAB_KEY, chosen.dataset.settingsTab); } catch (_) { }
      if (focus) chosen.focus();
    }

    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-settings-tab]');
      if (button) selectTab(button.dataset.settingsTab);
    });
    nav.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = $$('[data-settings-tab]', nav);
      const current = Math.max(0, tabs.indexOf(document.activeElement));
      let next = current;
      if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      event.preventDefault();
      selectTab(tabs[next]?.dataset.settingsTab, true);
    });

    let savedTab = 'gameplay';
    try { savedTab = sessionStorage.getItem(SESSION_TAB_KEY) || savedTab; } catch (_) { }
    selectTab(savedTab);

    presetPanel.addEventListener('click', event => {
      const button = event.target.closest('[data-settings-preset]');
      if (!button) return;
      applyPerformancePreset(button.dataset.settingsPreset);
      $$('.preset-button', presetPanel).forEach(item => item.classList.toggle('active', item === button));
    });

    const saveNote = form.querySelector('.setting-save-note');
    if (saveNote) {
      saveNote.textContent = 'Saved to the active device account';
      saveNote.dataset.state = 'saved';
    }
    form.addEventListener('input', event => {
      if (event.target.matches('input[type="range"]')) setSaveStatus('Previewing change…', 'saving');
    });
    form.addEventListener('change', () => {
      setSaveStatus('Saving to this account…', 'saving');
      window.setTimeout(() => setSaveStatus('Saved to the active device account', 'saved'), 180);
    });
  }

  function readableBytes(bytes) {
    const number = Math.max(0, Number(bytes) || 0);
    if (number < 1024) return `${number} B`;
    if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;
    return `${(number / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function updateStorageSummary() {
    const output = document.getElementById('revampStorageValue');
    const detail = document.getElementById('revampStorageDetail');
    if (!output || !detail) return;

    try {
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = Number(estimate.usage) || 0;
        const quota = Number(estimate.quota) || 0;
        output.textContent = readableBytes(used);
        detail.textContent = quota ? `of ${readableBytes(quota)} browser storage` : 'estimated browser storage used';
        return;
      }
    } catch (_) { }

    try {
      let characters = 0;
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || '';
        characters += key.length + (localStorage.getItem(key) || '').length;
      }
      output.textContent = readableBytes(characters * 2);
      detail.textContent = 'approximate local save size';
    } catch (_) {
      output.textContent = 'Unavailable';
      detail.textContent = 'browser storage could not be measured';
    }
  }

  function initAccountsRevamp() {
    const modal = document.getElementById('accountsModal');
    const card = modal?.querySelector('.modal-card');
    const accountList = document.getElementById('accountList');
    if (!modal || !card || !accountList || card.dataset.revamped === 'true') return;

    card.dataset.revamped = 'true';
    card.classList.add('accounts-revamp-card');
    modal.classList.add('accounts-revamp-modal');

    const header = card.querySelector('header');
    const eyebrow = header?.querySelector('.eyebrow');
    const title = header?.querySelector('h2');
    if (eyebrow) eyebrow.textContent = 'SAVED IN THIS BROWSER';
    if (title) title.textContent = 'Device Accounts';

    const intro = make('p', 'accounts-revamp-intro', 'Switch local Critter profiles, protect progress with account files, or bring a profile to another browser. No online login is required.');
    header?.insertAdjacentElement('afterend', intro);

    const dashboard = make('div', 'accounts-dashboard', `
      <article><span>PROFILES</span><strong id="revampAccountCount">0</strong><small>saved on this device</small></article>
      <article><span>ACTIVE ACCOUNT</span><strong id="revampActiveAccount">None</strong><small>currently used by the game</small></article>
      <article><span>LOCAL STORAGE</span><strong id="revampStorageValue">Checking…</strong><small id="revampStorageDetail">measuring this browser</small></article>
    `);
    intro.insertAdjacentElement('afterend', dashboard);

    const note = card.querySelector('.account-note');
    if (note) {
      note.classList.add('account-privacy-banner');
      note.innerHTML = '<span class="account-privacy-icon" aria-hidden="true">◆</span><div><strong>Local profiles, not cloud logins</strong><p>Progress, stash, Petals, appearance, statistics, loadout, and settings stay in this browser. Download an account file before clearing browser data or moving devices.</p></div>';
    }

    const toolbar = make('div', 'account-manager-toolbar', `
      <label class="account-search"><span>Find an account</span><input id="deviceAccountSearch" type="search" autocomplete="off" placeholder="Search display name or username"></label>
      <div class="account-toolbar-actions">
        <button type="button" class="secondary" id="revampBackupActive">Back Up Active</button>
        <button type="button" class="ghost" id="revampClearAccountSearch">Clear Search</button>
      </div>
    `);
    accountList.insertAdjacentElement('beforebegin', toolbar);
    accountList.setAttribute('aria-live', 'polite');

    const searchInput = document.getElementById('deviceAccountSearch');
    const clearSearch = document.getElementById('revampClearAccountSearch');
    const backupActive = document.getElementById('revampBackupActive');

    function enhanceRows() {
      const rows = $$('.account-row', accountList);
      rows.forEach(row => {
        row.classList.add('account-card');
        const info = row.children[1];
        if (info) info.classList.add('account-card-copy');
        const actions = row.querySelector('.account-actions') || row.children[row.children.length - 1];
        if (actions) {
          actions.classList.add('account-card-actions');
          $$('button', actions).forEach(button => {
            const label = button.textContent.trim().toLowerCase();
            if (label.includes('use') || label.includes('select') || label.includes('active')) button.classList.add('account-action-select');
            if (label.includes('download')) button.classList.add('account-action-download');
            if (label.includes('delete')) button.classList.add('account-action-delete');
          });
        }
        if (row.classList.contains('active') && !row.querySelector('.active-account-badge')) {
          const badge = make('span', 'active-account-badge', '<i></i> ACTIVE');
          info?.appendChild(badge);
        }
      });
      filterRows();
      updateAccountSummary();
    }

    function filterRows() {
      const query = String(searchInput?.value || '').trim().toLowerCase();
      let visible = 0;
      $$('.account-row', accountList).forEach(row => {
        const matches = !query || row.textContent.toLowerCase().includes(query);
        row.hidden = !matches;
        if (matches) visible += 1;
      });
      accountList.classList.toggle('is-filtered', Boolean(query));
      accountList.dataset.visibleCount = String(visible);
      try { sessionStorage.setItem(SESSION_ACCOUNT_SEARCH_KEY, query); } catch (_) { }
    }

    function updateAccountSummary() {
      const rows = $$('.account-row', accountList);
      const active = rows.find(row => row.classList.contains('active'));
      const activeName = active?.querySelector('.account-card-copy strong, .account-card-copy b, strong, b')?.textContent?.trim() || 'None';
      const count = document.getElementById('revampAccountCount');
      const activeOutput = document.getElementById('revampActiveAccount');
      if (count) count.textContent = String(rows.length);
      if (activeOutput) activeOutput.textContent = activeName;
      if (backupActive) backupActive.disabled = !active;
    }

    searchInput?.addEventListener('input', filterRows);
    clearSearch?.addEventListener('click', () => {
      if (!searchInput) return;
      searchInput.value = '';
      filterRows();
      searchInput.focus();
    });
    backupActive?.addEventListener('click', () => {
      const active = $('.account-row.active', accountList);
      const download = $$('button', active || accountList).find(button => button.textContent.toLowerCase().includes('download'));
      if (download) download.click();
    });

    try { searchInput.value = sessionStorage.getItem(SESSION_ACCOUNT_SEARCH_KEY) || ''; } catch (_) { }

    const transfer = card.querySelector('.xml-profile-tools');
    if (transfer) {
      transfer.classList.add('account-transfer-panel');
      transfer.insertAdjacentHTML('afterbegin', '<div class="account-transfer-copy"><span class="eyebrow">RESTORE OR TRANSFER</span><strong>Import an account profile</strong><small>Use a downloaded XML file or a Critter profile URL. Matching accounts ask before overwriting.</small></div>');
    }

    const footer = card.querySelector('footer');
    if (footer) {
      footer.classList.add('accounts-action-bar');
      const upload = document.getElementById('importAccountBtn');
      const legacy = document.getElementById('legacyImportBtn');
      const invite = document.getElementById('copyInviteBtn');
      const create = document.getElementById('newAccountBtn');
      if (upload) upload.textContent = 'Upload Account File';
      if (legacy) legacy.textContent = 'Import Backup Code';
      if (invite) invite.textContent = 'Copy Active Invite';
      if (create) create.textContent = 'Create New Account';
    }

    const observer = new MutationObserver(enhanceRows);
    observer.observe(accountList, { childList: true });
    enhanceRows();
    updateStorageSummary();
    modal.addEventListener('close', () => {
      if (searchInput) {
        searchInput.value = '';
        filterRows();
      }
    });
  }

  ready(() => {
    initSettingsRevamp();
    initAccountsRevamp();
  });
})();

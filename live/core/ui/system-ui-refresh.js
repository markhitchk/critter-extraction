(() => {
  'use strict';

  const UI_VERSION = '1.0.0';

  function resolve(path) {
    if (window.CritterPaths && typeof window.CritterPaths.resolve === 'function') {
      return window.CritterPaths.resolve(path);
    }
    return new URL(path, document.baseURI).href;
  }

  function loadStyles() {
    const files = [
      'core/ui/system-ui-core.css',
      'core/ui/system-ui-lobby.css',
      'core/ui/system-ui-components.css',
      'core/ui/system-ui-responsive.css'
    ];
    files.forEach((file, index) => {
      const id = `critter-system-ui-refresh-${index + 1}`;
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = resolve(file);
      link.dataset.uiVersion = UI_VERSION;
      document.head.appendChild(link);
    });
  }

  function safeClick(element) {
    if (element && typeof element.click === 'function') element.click();
  }

  function setJoinCode(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 6);
  }

  function createQuickJoin(heroCopy) {
    if (!heroCopy || document.getElementById('lobbyQuickJoin')) return;

    const panel = document.createElement('div');
    panel.id = 'lobbyQuickJoin';
    panel.className = 'lobby-quick-join';
    panel.innerHTML = `
      <label for="lobbyJoinCode">
        <span>ROOM CODE</span>
        <input id="lobbyJoinCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-describedby="lobbyJoinHelp">
      </label>
      <button id="lobbyJoinCodeBtn" class="quick-join-button" type="button">Join Room</button>
      <small id="lobbyJoinHelp">Paste or type the host’s six-digit code.</small>
    `;

    const playRow = heroCopy.querySelector('.play-row');
    if (playRow) playRow.insertAdjacentElement('afterend', panel);
    else heroCopy.appendChild(panel);

    const input = panel.querySelector('#lobbyJoinCode');
    const submit = panel.querySelector('#lobbyJoinCodeBtn');

    const join = () => {
      const code = setJoinCode(input.value);
      input.value = code;
      if (code.length !== 6) {
        panel.classList.remove('is-ready');
        panel.classList.add('has-error');
        input.focus();
        return;
      }
      panel.classList.remove('has-error');
      panel.classList.add('is-working');
      safeClick(document.getElementById('joinBtn'));
      window.setTimeout(() => {
        const modalInput = document.getElementById('joinRoomPin');
        if (modalInput) {
          modalInput.value = code;
          modalInput.dispatchEvent(new Event('input', { bubbles: true }));
          modalInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        panel.classList.remove('is-working');
        safeClick(document.getElementById('joinRoomBtn'));
      }, 120);
    };

    input.addEventListener('input', () => {
      input.value = setJoinCode(input.value);
      panel.classList.toggle('is-ready', input.value.length === 6);
      panel.classList.remove('has-error');
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        join();
      }
    });
    submit.addEventListener('click', join);
  }

  function makeDock(menuScreen) {
    if (!menuScreen || menuScreen.querySelector('.lobby-action-dock')) return;
    const dock = document.createElement('nav');
    dock.className = 'lobby-action-dock panel';
    dock.setAttribute('aria-label', 'Main menu shortcuts');

    const actions = [
      ['Character', 'Customize your critter', () => safeClick(menuScreen.querySelector('[data-open="customizeModal"]'))],
      ['Loadout', 'Choose weapons and gear', () => safeClick(document.getElementById('loadoutBtn'))],
      ['Stash', 'Open account storage', () => safeClick(document.getElementById('inventoryBtn'))],
      ['Trading', 'Open the Trading Post', () => safeClick(document.getElementById('merchantBtn'))],
      ['Accounts', 'Switch or manage profiles', () => safeClick(document.getElementById('accountsBtn'))],
      ['Settings', 'Camera, graphics, audio, and controls', () => safeClick(document.querySelector('[data-open="settingsModal"]'))]
    ];

    actions.forEach(([label, description, handler]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lobby-dock-button';
      button.innerHTML = `<strong>${label}</strong><small>${description}</small>`;
      button.addEventListener('click', handler);
      dock.appendChild(button);
    });

    menuScreen.appendChild(dock);
  }

  function buildLobbyLayout(menuScreen) {
    if (!menuScreen || menuScreen.dataset.uiLayout === UI_VERSION) return;
    const hero = menuScreen.querySelector(':scope > .hero');
    const dashboard = menuScreen.querySelector(':scope > .dashboard');
    if (!hero || !dashboard) return;

    menuScreen.dataset.uiLayout = UI_VERSION;
    menuScreen.classList.add('lobby-screen');
    hero.classList.add('lobby-hero');
    dashboard.classList.add('lobby-sidebar');

    const shell = document.createElement('div');
    shell.className = 'lobby-shell';
    menuScreen.insertBefore(shell, hero);
    shell.appendChild(hero);
    shell.appendChild(dashboard);

    const heroCopy = hero.querySelector('.hero-copy');
    if (heroCopy) {
      const eyebrow = heroCopy.querySelector('.eyebrow');
      const title = heroCopy.querySelector('h1');
      const description = heroCopy.querySelector('p');
      if (eyebrow) eyebrow.textContent = 'HARLEY’S STUDIOS • EXTRACTION LOBBY';
      if (title) title.textContent = 'Gear up. Drop in. Bring the loot home.';
      if (description) description.textContent = 'Choose a critter, prepare your kit, and enter a procedural extraction run alone or with up to four players.';

      const solo = document.getElementById('soloBtn');
      const host = document.getElementById('hostBtn');
      const join = document.getElementById('joinBtn');
      if (solo) solo.textContent = 'Deploy Solo';
      if (host) host.textContent = 'Host Co-op';
      if (join) join.textContent = 'Join Multiplayer';

      createQuickJoin(heroCopy);

      const notice = heroCopy.querySelector('.notice');
      if (notice) {
        notice.className = 'lobby-feature-strip';
        notice.innerHTML = '<span>Procedural regions</span><span>Solo, co-op & PvP</span><span>Local profiles</span><span>Modern browsers</span>';
      }
    }

    const profile = dashboard.querySelector('.profile-panel');
    const stats = dashboard.querySelector('.stats-panel');
    const loadout = dashboard.querySelector('.loadout-panel');
    if (profile) profile.classList.add('lobby-profile-card');
    if (loadout) loadout.classList.add('lobby-loadout-card');
    if (stats) stats.classList.add('lobby-stats-card');

    const footer = menuScreen.querySelector(':scope > .studio-footer');
    if (footer) footer.classList.add('lobby-studio-footer');

    makeDock(menuScreen);
  }

  function enhanceDialogs() {
    document.querySelectorAll('dialog.modal').forEach(dialog => {
      if (dialog.dataset.uiEnhanced === UI_VERSION) return;
      dialog.dataset.uiEnhanced = UI_VERSION;
      dialog.querySelectorAll('.icon-close').forEach(button => {
        if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Close dialog');
      });
      const card = dialog.querySelector('.modal-card');
      if (card) card.setAttribute('data-dialog-id', dialog.id || 'dialog');
    });
  }

  function enhanceGlobalUX() {
    document.documentElement.classList.add('critter-ui-refresh');
    document.body.classList.add('critter-ui-refresh');
    document.body.dataset.uiVersion = UI_VERSION;

    if (!document.querySelector('.ui-skip-link')) {
      const skip = document.createElement('a');
      skip.className = 'ui-skip-link';
      skip.href = '#menuScreen';
      skip.textContent = 'Skip to game menu';
      document.body.prepend(skip);
    }

    document.querySelectorAll('button:not([aria-label])').forEach(button => {
      const text = button.textContent.trim().replace(/\s+/g, ' ');
      if (text) button.setAttribute('aria-label', text);
    });

    enhanceDialogs();
    buildLobbyLayout(document.getElementById('menuScreen'));

    document.addEventListener('keydown', event => {
      if (event.key.toLowerCase() !== 'j' || event.altKey || event.ctrlKey || event.metaKey) return;
      const active = document.activeElement;
      if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
      const menu = document.getElementById('menuScreen');
      if (!menu || !menu.classList.contains('active')) return;
      const input = document.getElementById('lobbyJoinCode');
      if (input) {
        event.preventDefault();
        input.focus();
      }
    });

    const observer = new MutationObserver(() => {
      enhanceDialogs();
      const anyOpen = Boolean(document.querySelector('dialog[open]'));
      document.body.classList.toggle('ui-dialog-open', anyOpen);
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
  }

  loadStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceGlobalUX, { once: true });
  } else {
    enhanceGlobalUX();
  }
})();

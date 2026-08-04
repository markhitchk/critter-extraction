/* Critter Codes production loader v2.0.2. Valid codes are never stored in this file. */
(() => {
  'use strict';

  const VERSION = '2.0.2';
  const paths = [1,2,3,4,5,6,7].map(part => `core/rewards/critter-codes.payload.${part}.js?v=${VERSION}`);
  const resolve = path => window.CritterPaths?.resolve?.(path) || `./${path}`;
  const state = { status: 'loading', detail: 'Loading secure reward terminal…' };
  let uiScheduled = false;

  function ensureStyles() {
    if (document.getElementById('critterCodesEntryStyles')) return;
    const style = document.createElement('style');
    style.id = 'critterCodesEntryStyles';
    style.textContent = `
      .critter-codes-entry-button{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:0;white-space:normal}
      .critter-codes-entry-button .cc-entry-dot{width:8px;height:8px;border-radius:50%;background:#ffd36f;box-shadow:0 0 10px #ffd36f;flex:0 0 auto}
      .critter-codes-entry-button[data-state="ready"] .cc-entry-dot{background:#72f2bd;box-shadow:0 0 12px #72f2bd}
      .critter-codes-entry-button[data-state="error"] .cc-entry-dot{background:#ff7f9f;box-shadow:0 0 12px #ff7f9f}
      #menuScreen .lobby-utility-rail{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:12px;margin-top:14px;min-width:0}
      #menuScreen .lobby-utility-rail>.panel{min-width:0;padding:16px 18px;border-radius:20px;box-sizing:border-box}
      .critter-codes-entry-panel{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,250px);gap:7px 16px;align-items:center;overflow:hidden;border-color:rgba(100,232,234,.48)!important;background:linear-gradient(145deg,rgba(20,34,59,.96),rgba(11,22,39,.96))!important}
      .critter-codes-entry-panel:before{content:"";position:absolute;inset:-80% 52% 20% -22%;background:radial-gradient(circle,rgba(100,232,234,.22),transparent 68%);pointer-events:none}
      .critter-codes-entry-panel>*{position:relative;z-index:1}
      .critter-codes-entry-panel .panel-heading{grid-column:1;min-width:0}
      .critter-codes-entry-panel .panel-heading h2{margin:0}
      .cc-entry-mark{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(100,232,234,.55);border-radius:14px;background:rgba(100,232,234,.12);font-size:21px;box-shadow:0 0 24px rgba(100,232,234,.13)}
      .cc-entry-copy{grid-column:1;margin:0;color:var(--muted,#b9c4d6);font-size:12px;line-height:1.45}
      .critter-codes-entry-panel>.critter-codes-entry-button{grid-column:2;grid-row:1/3;width:100%;min-height:48px}
      .cc-entry-status{grid-column:1/-1;display:flex;align-items:center;gap:8px;margin-top:2px;color:var(--muted,#b9c4d6);font-size:10px;min-width:0}
      .cc-entry-status span{min-width:0;overflow-wrap:anywhere}
      .cc-entry-status i{width:8px;height:8px;border-radius:50%;background:#ffd36f;box-shadow:0 0 9px currentColor;flex:0 0 auto}
      .cc-entry-status[data-state="ready"] i{background:#72f2bd}.cc-entry-status[data-state="error"] i{background:#ff7f9f}
      .fair-play-lobby-panel{display:grid;gap:9px;align-content:center;border-color:rgba(126,247,212,.3)!important;background:linear-gradient(145deg,rgba(24,42,51,.94),rgba(12,24,35,.96))!important}
      .fair-play-lobby-panel .panel-heading{align-items:center}.fair-play-lobby-panel h2{margin:0}.fair-play-mark{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(126,247,212,.45);border-radius:14px;background:rgba(126,247,212,.1);font-size:20px}
      .fair-play-copy{margin:0;color:var(--muted,#b9c4d6);font-size:11px;line-height:1.45}
      .fair-play-status{display:flex;align-items:center;gap:7px;color:#b9c4d6;font-size:10px;min-width:0}.fair-play-status i{width:8px;height:8px;border-radius:50%;background:#ffd36f;flex:0 0 auto}.fair-play-status[data-state="ready"] i{background:#72f2bd;box-shadow:0 0 10px #72f2bd}.fair-play-status[data-state="error"] i{background:#ff7f9f}
      #menuScreen>.lobby-action-dock.lobby-action-dock-fixed{position:static!important;inset:auto!important;transform:none!important;width:100%!important;max-width:none!important;margin:12px 0 0!important;padding:10px!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;overflow:hidden!important;box-sizing:border-box!important}
      #menuScreen>.lobby-action-dock.lobby-action-dock-fixed:before{content:"QUICK ACTIONS";grid-column:1/-1;color:var(--muted,#aeb2d1);font-size:9px;font-weight:900;letter-spacing:.16em;padding:0 2px 2px}
      #menuScreen>.lobby-action-dock.lobby-action-dock-fixed .lobby-dock-button{width:100%!important;min-width:0!important;min-height:62px!important;padding:10px 12px!important;overflow:hidden!important;align-content:center!important;text-align:left!important}
      #menuScreen>.lobby-action-dock.lobby-action-dock-fixed .lobby-dock-button strong,#menuScreen>.lobby-action-dock.lobby-action-dock-fixed .lobby-dock-button small{display:block!important;min-width:0!important;max-width:100%!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:normal!important;word-break:normal!important;hyphens:none!important}
      #menuScreen>.lobby-action-dock.lobby-action-dock-fixed .lobby-dock-button strong{font-size:12px!important;line-height:1.2!important}
      #menuScreen>.lobby-action-dock.lobby-action-dock-fixed .lobby-dock-button small{font-size:9px!important;line-height:1.3!important;margin-top:3px}
      .cc-entry-card{width:min(560px,calc(100vw - 28px));border:1px solid rgba(100,232,234,.5)!important;background:linear-gradient(155deg,#111a2d,#0a1221)!important}
      .cc-entry-form{display:grid;gap:12px;padding:4px 0}.cc-entry-form label{display:grid;gap:7px;color:#dffcff;font-weight:800;letter-spacing:.06em;font-size:.78rem}
      .cc-entry-form input{width:100%;box-sizing:border-box;padding:15px 16px;border:1px solid rgba(100,232,234,.42);border-radius:14px;background:#070d19;color:#fff;font:800 1rem/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;outline:none}
      .cc-entry-form input:focus{border-color:#64e8ea;box-shadow:0 0 0 3px rgba(100,232,234,.13)}.cc-entry-actions{display:grid;grid-template-columns:1fr auto;gap:10px}.cc-entry-message{min-height:24px;margin:0;color:#b9c4d6}.cc-entry-message.success{color:#72f2bd}.cc-entry-message.error{color:#ff9dad}
      @media(max-width:900px){#menuScreen .lobby-utility-rail{grid-template-columns:1fr}.critter-codes-entry-panel{grid-template-columns:minmax(0,1fr) minmax(180px,230px)}}
      @media(max-width:760px){#menuScreen>.lobby-action-dock.lobby-action-dock-fixed{grid-template-columns:repeat(2,minmax(0,1fr))!important}.critter-codes-entry-button .cc-entry-label{display:inline}.cc-entry-actions{grid-template-columns:1fr}.critter-codes-entry-panel{grid-template-columns:1fr}.critter-codes-entry-panel>.critter-codes-entry-button{grid-column:1;grid-row:auto}.critter-codes-entry-panel{grid-column:1/-1}}
      @media(max-width:390px){#menuScreen>.lobby-action-dock.lobby-action-dock-fixed{grid-template-columns:1fr!important}}
      @media(prefers-reduced-motion:reduce){.critter-codes-entry-panel:before{display:none}.critter-codes-entry-button .cc-entry-dot,.cc-entry-status i,.fair-play-status i{box-shadow:none}}
    `;
    document.head.appendChild(style);
  }

  function createButton(id, label, className, handler = openTerminal) {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.className = className;
    button.innerHTML = `<span class="cc-entry-dot" aria-hidden="true"></span><span class="cc-entry-label">${label}</span>`;
    button.addEventListener('click', handler);
    return button;
  }

  function ensureDialog() {
    let dialog = document.getElementById('critterCodesEntryModal');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'critterCodesEntryModal';
    dialog.className = 'modal cc-entry-dialog';
    dialog.innerHTML = `
      <div class="modal-card cc-entry-card">
        <header><div><span class="eyebrow">REWARDS TERMINAL</span><h2>Critter Codes</h2></div><button type="button" class="icon-close" data-cc-entry-close aria-label="Close">×</button></header>
        <p>Enter a Critter Code to unlock animals, cosmetics, Petals, crates, titles, trails, effects, and other account rewards.</p>
        <form class="cc-entry-form" novalidate>
          <label>CRITTER CODE<input id="critterCodesEntryInput" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ENTER CODE" aria-describedby="critterCodesEntryMessage"></label>
          <p id="critterCodesEntryMessage" class="cc-entry-message" aria-live="polite">Loading secure reward terminal…</p>
          <div class="cc-entry-actions"><button type="submit" class="primary">Redeem Code</button><button type="button" class="secondary" data-cc-entry-rewards>View Rewards</button></div>
        </form>
      </div>`;
    dialog.querySelector('[data-cc-entry-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-cc-entry-rewards]').addEventListener('click', () => {
      if (typeof window.CritterCodes?.openRewards === 'function') {
        dialog.close();
        window.CritterCodes.openRewards();
      } else setMessage(state.detail, state.status === 'error' ? 'error' : '');
    });
    dialog.querySelector('form').addEventListener('submit', redeemFromEntry);
    document.body.appendChild(dialog);
    return dialog;
  }

  function ensureUtilityRail() {
    const menu = document.getElementById('menuScreen');
    if (!menu) return null;
    menu.dataset.chromeObserverReady = menu.dataset.chromeObserverReady || 'lobby-utilities-v2';
    let rail = document.getElementById('lobbyUtilityRail');
    if (!rail) {
      rail = document.createElement('section');
      rail.id = 'lobbyUtilityRail';
      rail.className = 'lobby-utility-rail';
      rail.setAttribute('aria-label', 'Rewards and Fair Play tools');
    }
    const shell = menu.querySelector(':scope > .lobby-shell');
    if (shell && rail.previousElementSibling !== shell) shell.insertAdjacentElement('afterend', rail);
    else if (!rail.isConnected) {
      const dashboard = document.querySelector('#menuScreen .dashboard');
      (dashboard?.parentElement === menu ? dashboard : menu.querySelector(':scope > .studio-footer'))?.insertAdjacentElement('beforebegin', rail);
      if (!rail.isConnected) menu.appendChild(rail);
    }
    return rail;
  }

  function ensureFairPlayPanel(rail) {
    if (!rail) return;
    let panel = document.getElementById('fairPlayLobbyPanel');
    if (!panel) {
      panel = document.createElement('article');
      panel.id = 'fairPlayLobbyPanel';
      panel.className = 'panel fair-play-lobby-panel';
      panel.innerHTML = `
        <div class="panel-heading"><div><span class="eyebrow">FAIR PLAY SECURITY</span><h2>Fair Play Center</h2></div><span class="fair-play-mark" aria-hidden="true">🛡</span></div>
        <p class="fair-play-copy">Review host-authoritative checks, security events, profile identity, and local or global multiplayer restrictions.</p>
        <div id="fairPlayLobbyStatus" class="fair-play-status" aria-live="polite"><i aria-hidden="true"></i><span>Loading Fair Play security…</span></div>
        <button id="fairPlayLobbyBtn" type="button" class="secondary full">Open Security Center</button>`;
      panel.querySelector('#fairPlayLobbyBtn').addEventListener('click', openSecurityCenter);
    }
    if (panel.parentElement !== rail) rail.appendChild(panel);
    syncSecurityUi();
  }

  function ensureDockActions(menu, rail) {
    if (!menu) return;
    const dock = menu.querySelector('.lobby-action-dock');
    if (!dock) return;
    dock.classList.remove('dashboard-action-panel');
    dock.classList.add('lobby-action-dock-fixed');
    if (!document.getElementById('critterCodesDockEntry')) {
      const button = document.createElement('button');
      button.id = 'critterCodesDockEntry';
      button.type = 'button';
      button.className = 'lobby-dock-button';
      button.innerHTML = '<strong>Critter Codes</strong><small>Redeem rewards and event codes</small>';
      button.addEventListener('click', openTerminal);
      dock.appendChild(button);
    }
    if (!document.getElementById('fairPlayDockEntry')) {
      const button = document.createElement('button');
      button.id = 'fairPlayDockEntry';
      button.type = 'button';
      button.className = 'lobby-dock-button';
      button.innerHTML = '<strong>Fair Play</strong><small>Security status, events, and bans</small>';
      button.addEventListener('click', openSecurityCenter);
      dock.appendChild(button);
    }
    if (rail && dock.previousElementSibling !== rail) rail.insertAdjacentElement('afterend', dock);
    else if (!rail && dock.parentElement !== menu) menu.appendChild(dock);
  }

  function setMessage(message, tone = '') {
    const node = document.getElementById('critterCodesEntryMessage');
    if (!node) return;
    node.textContent = message;
    node.className = `cc-entry-message ${tone}`.trim();
  }

  function syncSecurityUi() {
    const status = document.getElementById('fairPlayLobbyStatus');
    if (!status) return;
    const security = window.CritterSecurityRuntime;
    const text = status.querySelector('span');
    if (!security) {
      status.dataset.state = 'loading';
      if (text) text.textContent = 'Loading Fair Play security…';
      return;
    }
    try {
      const remote = security.remote?.() || { bans: [], source: 'loading' };
      const local = security.localBans?.() || [];
      status.dataset.state = 'ready';
      if (text) text.textContent = `Active • ${remote.bans?.length || 0} global restrictions • ${local.length} host bans • ${remote.source || 'local'} source`;
    } catch (error) {
      status.dataset.state = 'error';
      if (text) text.textContent = 'Fair Play loaded, but its status could not be read.';
    }
  }

  function syncUi() {
    for (const button of document.querySelectorAll('.critter-codes-entry-button')) button.dataset.state = state.status;
    const status = document.getElementById('critterCodesEntryStatus');
    if (status) {
      status.dataset.state = state.status;
      const text = status.querySelector('span');
      if (text) text.textContent = state.detail;
    }
    if (document.getElementById('critterCodesEntryModal')?.open) setMessage(state.detail, state.status === 'error' ? 'error' : '');
    syncSecurityUi();
  }

  function setState(status, detail) {
    state.status = status;
    state.detail = detail;
    syncUi();
  }

  function ensureEntryUi() {
    if (!document.body) return;
    ensureStyles();
    ensureDialog();
    const menu = document.getElementById('menuScreen');
    const rail = ensureUtilityRail();
    const top = document.querySelector('.top-actions');
    if (top && !document.getElementById('critterCodesTopEntry')) {
      const button = createButton('critterCodesTopEntry', 'Critter Codes', 'ghost critter-codes-entry-button');
      top.insertBefore(button, document.getElementById('topPetalsBtn') || null);
    }
    let panel = document.getElementById('critterCodesDashboardEntry');
    if (!panel) {
      panel = document.createElement('article');
      panel.id = 'critterCodesDashboardEntry';
      panel.className = 'panel critter-codes-entry-panel';
      panel.innerHTML = `
        <div class="panel-heading"><div><span class="eyebrow">ACCOUNT REWARDS</span><h2>Critter Codes</h2></div><span class="cc-entry-mark" aria-hidden="true">✦</span></div>
        <p class="cc-entry-copy">Redeem promotional and event codes for permanent critters, cosmetics, Petals, crates, trails, titles, and more.</p>
        <button type="button" class="primary full critter-codes-entry-button"><span class="cc-entry-dot" aria-hidden="true"></span><span class="cc-entry-label">Open Critter Codes</span></button>
        <div id="critterCodesEntryStatus" class="cc-entry-status"><i aria-hidden="true"></i><span>Loading secure reward terminal…</span></div>`;
      panel.querySelector('button').addEventListener('click', openTerminal);
    }
    if (rail && panel.parentElement !== rail) rail.prepend(panel);
    else if (!rail && !panel.isConnected) document.querySelector('#menuScreen .dashboard')?.appendChild(panel);
    ensureFairPlayPanel(rail);
    ensureDockActions(menu, rail);
    syncUi();
  }

  function scheduleUi() {
    if (uiScheduled) return;
    uiScheduled = true;
    requestAnimationFrame(() => {
      uiScheduled = false;
      ensureEntryUi();
    });
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute('open', '');
  }

  function openTerminal() {
    if (typeof window.CritterCodes?.open === 'function') {
      window.CritterCodes.open();
      return;
    }
    const dialog = ensureDialog();
    setMessage(state.detail, state.status === 'error' ? 'error' : '');
    openDialog(dialog);
    setTimeout(() => document.getElementById('critterCodesEntryInput')?.focus(), 0);
  }

  function openSecurityCenter() {
    const security = window.CritterSecurityRuntime;
    if (typeof security?.openCenter === 'function') {
      security.openCenter();
      return;
    }
    const existing = document.getElementById('securityCenterBtn');
    if (existing) {
      existing.click();
      return;
    }
    const status = document.getElementById('fairPlayLobbyStatus');
    if (status) {
      status.dataset.state = 'error';
      const text = status.querySelector('span');
      if (text) text.textContent = 'Fair Play security is still loading. Try again in a moment.';
    }
  }

  async function redeemFromEntry(event) {
    event.preventDefault();
    const input = document.getElementById('critterCodesEntryInput');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const code = String(input?.value || '').trim();
    if (!code) {
      setMessage('Enter a Critter Code first.', 'error');
      input?.focus();
      return;
    }
    if (typeof window.CritterCodes?.redeem !== 'function') {
      setMessage(state.detail, state.status === 'error' ? 'error' : '');
      return;
    }
    button.disabled = true;
    setMessage('Checking code…');
    try {
      await window.CritterCodes.redeem(code);
      input.value = '';
      setMessage('Code redeemed. Your rewards were added to this profile.', 'success');
    } catch (error) {
      const messages = { invalid_code:'That Critter Code is not valid.', already_redeemed:'This profile already redeemed that code.', expired_code:'That Critter Code has expired.', disabled_code:'That Critter Code is disabled.', not_active:'That Critter Code is not active yet.', version_locked:'Update Critter Extraction before using this code.', profile_corrupt:'The active profile could not safely store rewards.', reward_definition_missing:'This reward bundle is temporarily unavailable.' };
      setMessage(messages[error?.message] || 'The code could not be redeemed. Try again.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  function load(path) {
    return new Promise((ok, fail) => {
      const script = document.createElement('script');
      script.async = false;
      script.src = resolve(path);
      script.onload = () => ok();
      script.onerror = () => fail(new Error(`Could not load Critter Codes payload fragment: ${path}`));
      document.head.appendChild(script);
    });
  }

  function runtimeReady() {
    return typeof window.CritterCodes?.redeem === 'function';
  }

  function waitForApi(timeoutMs = 15000) {
    return new Promise((resolveReady, reject) => {
      const started = performance.now();
      const check = () => {
        if (runtimeReady()) return resolveReady(window.CritterCodes);
        if (performance.now() - started >= timeoutMs) return reject(new Error('Critter Codes runtime loaded, but its redeem API did not initialize.'));
        setTimeout(check, 60);
      };
      check();
    });
  }

  async function executeRuntime(source) {
    let capturedError = null;
    const capture = event => {
      if (!capturedError && String(event?.filename || '').startsWith('blob:')) capturedError = event.error || new Error(event.message || 'Critter Codes runtime error.');
    };
    window.addEventListener('error', capture, true);
    const url = URL.createObjectURL(new Blob([`${source}\n//# sourceURL=critter-codes.runtime.js`], { type: 'text/javascript' }));
    try {
      await new Promise((ok, fail) => {
        const runtime = document.createElement('script');
        runtime.dataset.critterCodesRuntime = VERSION;
        runtime.src = url;
        runtime.onload = () => ok();
        runtime.onerror = () => fail(new Error('Critter Codes runtime script could not be executed.'));
        document.head.appendChild(runtime);
      });
      await new Promise(resolveDelay => setTimeout(resolveDelay, 0));
      if (capturedError && !runtimeReady()) throw capturedError;
    } finally {
      window.removeEventListener('error', capture, true);
      URL.revokeObjectURL(url);
    }
  }

  async function bootRuntime() {
    if (!globalThis.DecompressionStream) throw new Error('This browser cannot unpack the Critter Codes interface. Use a current Chrome, Edge, Firefox, or Safari version.');
    window.__CRITTER_CODE_PAYLOAD__ = [];
    for (const path of paths) await load(path);
    const payload = window.__CRITTER_CODE_PAYLOAD__.join('');
    delete window.__CRITTER_CODE_PAYLOAD__;
    if (!payload) throw new Error('Critter Codes payload was empty.');
    const bytes = Uint8Array.from(atob(payload), character => character.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const source = await new Response(stream).text();
    if (!source.trim()) throw new Error('Critter Codes runtime unpacked to an empty script.');
    await executeRuntime(source);
    await waitForApi();
    setState('ready', 'Critter Codes ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureEntryUi, { once: true });
  else ensureEntryUi();
  const observer = new MutationObserver(scheduleUi);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('critter-security-change', syncSecurityUi);
  window.addEventListener('critter:profile-interface-ready', scheduleUi);
  window.CritterCodesEntry = Object.freeze({ version: VERSION, open: openTerminal, state: () => ({ ...state }) });
  bootRuntime().catch(error => {
    console.warn('Critter Codes production bundle could not be started.', error);
    setState('error', error?.message || 'Critter Codes could not load.');
  });
})();

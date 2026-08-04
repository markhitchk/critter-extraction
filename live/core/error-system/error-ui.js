(() => {
  'use strict';

  const SCREEN_ID = 'critterErrorScreen';
  const STYLE_ID = 'critterErrorScreenStyles';
  const escapeText = value => String(value ?? '');

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${SCREEN_ID}{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:clamp(14px,3vw,34px);overflow:auto;background:radial-gradient(circle at 20% 0,rgba(55,54,112,.98),rgba(12,13,30,.99) 48%,rgba(7,8,18,1));color:#f7f7ff;font-family:Inter,Arial,system-ui,sans-serif}
#${SCREEN_ID}[hidden]{display:none!important}
#${SCREEN_ID} .ce-shell{width:min(860px,100%);border:1px solid rgba(99,223,245,.42);border-radius:26px;background:linear-gradient(145deg,rgba(37,39,75,.98),rgba(20,22,44,.98));box-shadow:0 30px 110px rgba(0,0,0,.65),0 0 55px rgba(99,223,245,.08);overflow:hidden}
#${SCREEN_ID} .ce-head{display:flex;align-items:center;gap:16px;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(135deg,rgba(126,247,212,.08),rgba(142,130,255,.08))}
#${SCREEN_ID} .ce-logo{width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 8px 18px rgba(0,0,0,.35))}
#${SCREEN_ID} .ce-heading{min-width:0;flex:1}
#${SCREEN_ID} .ce-kicker{margin:0 0 6px;color:#7ef7d4;font-size:10px;font-weight:900;letter-spacing:.17em}
#${SCREEN_ID} h1{margin:0;font:800 clamp(25px,4vw,42px)/1.05 Arial,sans-serif;letter-spacing:-.025em}
#${SCREEN_ID} .ce-code{align-self:flex-start;padding:7px 10px;border:1px solid rgba(255,111,145,.35);border-radius:999px;background:rgba(255,111,145,.09);color:#ffb4c5;font-size:10px;font-weight:900;white-space:nowrap}
#${SCREEN_ID} .ce-body{display:grid;gap:16px;padding:22px 24px 24px}
#${SCREEN_ID} .ce-message{margin:0;color:#d6d8ec;font-size:15px;line-height:1.65}
#${SCREEN_ID} .ce-status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
#${SCREEN_ID} .ce-status-grid>div{display:grid;gap:4px;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(0,0,0,.16);min-width:0}
#${SCREEN_ID} .ce-status-grid span{color:#aeb2d1;font-size:8px;font-weight:900;letter-spacing:.12em}
#${SCREEN_ID} .ce-status-grid strong{font-size:11px;overflow-wrap:anywhere}
#${SCREEN_ID} details{border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(0,0,0,.15);overflow:hidden}
#${SCREEN_ID} summary{padding:12px 14px;cursor:pointer;font-weight:800;font-size:12px}
#${SCREEN_ID} pre{max-height:260px;overflow:auto;margin:0;padding:14px;border-top:1px solid rgba(255,255,255,.08);color:#cffffd;font:11px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
#${SCREEN_ID} .ce-actions{display:flex;flex-wrap:wrap;gap:9px}
#${SCREEN_ID} button,#${SCREEN_ID} a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 14px;border:1px solid rgba(255,255,255,.13);border-radius:12px;color:#f7f7ff;background:rgba(255,255,255,.055);font:800 12px Inter,Arial,sans-serif;text-decoration:none;cursor:pointer}
#${SCREEN_ID} .ce-primary{border-color:transparent;color:#111526;background:linear-gradient(135deg,#7ef7d4,#63dff5)}
#${SCREEN_ID} .ce-secondary{border-color:rgba(142,130,255,.42);background:rgba(142,130,255,.13)}
#${SCREEN_ID} .ce-foot{margin:0;color:#aeb2d1;font-size:10px;line-height:1.5}
#${SCREEN_ID} .ce-live{min-height:18px;margin:0;color:#7ef7d4;font-size:11px;font-weight:800}
@media(max-width:660px){#${SCREEN_ID}{place-items:start center}#${SCREEN_ID} .ce-head{align-items:flex-start;padding:18px}#${SCREEN_ID} .ce-logo{width:52px;height:52px}#${SCREEN_ID} .ce-code{display:none}#${SCREEN_ID} .ce-body{padding:18px}#${SCREEN_ID} .ce-status-grid{grid-template-columns:1fr}#${SCREEN_ID} .ce-actions>*{width:100%}}
`;
    document.head.appendChild(style);
  }

  function cleanMenuUrl() {
    try {
      const url = new URL(location.href);
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch (_) {
      return location.pathname;
    }
  }

  function hardReload() {
    try {
      const url = new URL(location.href);
      url.searchParams.set('_reload', Date.now().toString(36));
      location.replace(url.toString());
    } catch (_) {
      location.reload();
    }
  }

  function reportText(entry) {
    try {
      return window.CritterErrors?.stringify
        ? window.CritterErrors.stringify(entry)
        : JSON.stringify(entry, null, 2);
    } catch (_) {
      return String(entry?.message || entry || 'Unknown startup error');
    }
  }

  function ensureScreen() {
    installStyles();
    let screen = document.getElementById(SCREEN_ID);
    if (screen) return screen;

    screen = document.createElement('section');
    screen.id = SCREEN_ID;
    screen.hidden = true;
    screen.setAttribute('role', 'alertdialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-labelledby', 'critterErrorTitle');
    screen.innerHTML = `
      <div class="ce-shell">
        <header class="ce-head">
          <img class="ce-logo" src="./assets/branding/HTG.png" alt="Harley’s Studios logo">
          <div class="ce-heading"><p class="ce-kicker"></p><h1 id="critterErrorTitle"></h1></div>
          <span class="ce-code"></span>
        </header>
        <div class="ce-body">
          <p class="ce-message"></p>
          <div class="ce-status-grid">
            <div><span>STARTUP STAGE</span><strong data-stage></strong></div>
            <div><span>BUILD</span><strong data-build></strong></div>
            <div><span>CONNECTION</span><strong data-online></strong></div>
          </div>
          <details><summary>Technical details and support report</summary><pre></pre></details>
          <div class="ce-actions">
            <button class="ce-primary" type="button" data-retry>Retry Loading</button>
            <button class="ce-secondary" type="button" data-hard-reload>Reload Fresh Copy</button>
            <button type="button" data-copy>Copy Support Report</button>
            <button type="button" data-wait hidden>Keep Waiting</button>
            <a data-menu href="./">Main Menu</a>
          </div>
          <p class="ce-live" aria-live="polite"></p>
          <p class="ce-foot">Your local profile is not deleted by this screen. Avoid clearing browser data unless you already downloaded an encrypted profile backup.</p>
        </div>
      </div>`;
    document.body.appendChild(screen);

    screen.querySelector('[data-retry]').addEventListener('click', () => location.reload());
    screen.querySelector('[data-hard-reload]').addEventListener('click', hardReload);
    screen.querySelector('[data-menu]').href = cleanMenuUrl();
    screen.querySelector('[data-wait]').addEventListener('click', () => { screen.hidden = true; });
    screen.querySelector('[data-copy]').addEventListener('click', async () => {
      const status = screen.querySelector('.ce-live');
      const text = reportText(window.__CRITTER_LAST_ERROR__);
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Support report copied.';
      } catch (_) {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        status.textContent = copied ? 'Support report copied.' : 'Copy failed. Open Technical details and select the report manually.';
      }
    });
    return screen;
  }

  function mount({ title, message, entry, slow = false }) {
    const screen = ensureScreen();
    const code = escapeText(entry?.code || (slow ? 'CE-BOOT-SLOW-001' : 'CE-UNKNOWN-001'));
    const stage = escapeText(entry?.stage || window.__CRITTER_BOOT__?.stage || 'unknown');
    const build = escapeText(entry?.buildId || window.CritterBuildInfo?.buildId || 'unknown');
    const online = navigator.onLine ? 'Online' : 'Offline';

    screen.querySelector('.ce-kicker').textContent = slow ? 'STARTUP RECOVERY' : 'CRITTER EXTRACTION ERROR';
    screen.querySelector('h1').textContent = title;
    screen.querySelector('.ce-message').textContent = message;
    screen.querySelector('.ce-code').textContent = code;
    screen.querySelector('[data-stage]').textContent = stage;
    screen.querySelector('[data-build]').textContent = build;
    screen.querySelector('[data-online]').textContent = online;
    screen.querySelector('pre').textContent = reportText(entry);
    screen.querySelector('[data-wait]').hidden = !slow;
    screen.querySelector('.ce-live').textContent = '';
    screen.hidden = false;
    screen.querySelector(slow ? '[data-wait]' : '[data-retry]')?.focus({ preventScroll: true });
    return screen;
  }

  function show(entry = {}) {
    window.__CRITTER_LAST_ERROR__ = entry;
    return mount({
      title: 'Critter Extraction could not finish loading',
      message: entry.message || 'A required startup system stopped before the game became ready.',
      entry,
      slow: false
    });
  }

  function showSlow(state = {}) {
    const entry = window.CritterErrors?.capture
      ? window.CritterErrors.capture({
          code: 'CE-BOOT-SLOW-001',
          severity: 'warning',
          system: 'boot',
          stage: state.stage || 'startup-slow',
          message: state.detail || 'The game is taking longer than expected to initialize.'
        })
      : {
          code: 'CE-BOOT-SLOW-001',
          stage: state.stage || 'startup-slow',
          message: state.detail || 'The game is taking longer than expected to initialize.'
        };
    window.__CRITTER_LAST_ERROR__ = entry;
    return mount({
      title: 'The game is taking longer than expected',
      message: 'Startup is still running. You can keep waiting, retry normally, or request a fresh copy of the page files.',
      entry,
      slow: true
    });
  }

  function clear() {
    const screen = document.getElementById(SCREEN_ID);
    if (screen) screen.hidden = true;
  }

  window.CritterErrorUI = Object.freeze({ show, showSlow, clear, mount, installStyles });
  installStyles();
})();

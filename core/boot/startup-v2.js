(() => {
  'use strict';

  const STAGE_LABELS = {
    'document-loading': 'System check',
    'dom-ready': 'Interface ready',
    'core-loading': 'Loading game core',
    'game-script-started': 'Starting local systems',
    'game-initialized': 'Preparing account and menu',
    ready: 'Ready to extract',
    slow: 'Still working',
    stalled: 'Startup needs attention',
    failed: 'Startup stopped'
  };

  const progressFor = stage => ({
    'document-loading': 6,
    'dom-ready': 22,
    'core-loading': 42,
    'game-script-started': 64,
    'game-initialized': 84,
    ready: 100,
    slow: 72,
    stalled: 78,
    failed: 78
  }[stage] ?? 10);

  const waitForBootState = async () => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (window.__CRITTER_BOOT__) return window.__CRITTER_BOOT__;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    return null;
  };

  const safeText = (value, max = 180) => String(value || '').replace(/[<>]/g, '').trim().slice(0, max);

  const copyText = async text => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    }
  };

  function initialize(state) {
    const root = document.getElementById('studioBoot');
    const card = root?.querySelector('.studio-loading-card');
    const bar = document.getElementById('bootBar');
    const status = document.getElementById('bootStatus');
    if (!root || !card || !bar || !status) return;
    if (card.dataset.startupV2 === 'true') return;

    card.dataset.startupV2 = 'true';
    card.classList.add('startup-v2-card');
    root.classList.add('startup-v2');
    root.dataset.safeMode = state.safeMode ? 'true' : 'false';

    const heading = card.querySelector('h1');
    const eyebrow = card.querySelector('.eyebrow');
    const intro = card.querySelector('p');
    const track = card.querySelector('.loading-track');
    if (heading) heading.textContent = 'Critter Extraction';
    if (eyebrow) eyebrow.textContent = 'HARLEY’S STUDIOS • START SYSTEM V2';
    if (intro) intro.textContent = state.safeMode
      ? 'Safe Start is active. Optional interface effects are disabled for this launch.'
      : 'Checking the browser, loading the game core, and preparing your local Critter account.';

    const topLine = document.createElement('div');
    topLine.className = 'startup-v2-topline';
    topLine.innerHTML = `
      <span class="startup-v2-mode"><i aria-hidden="true"></i>${state.safeMode ? 'SAFE START' : 'STANDARD START'}</span>
      <output id="startupV2Percent" aria-live="polite">0%</output>
    `;
    track?.insertAdjacentElement('beforebegin', topLine);

    if (track) {
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', 'Critter Extraction startup progress');
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
    }

    const stages = document.createElement('ol');
    stages.className = 'startup-v2-stages';
    stages.setAttribute('aria-label', 'Startup stages');
    stages.innerHTML = [
      ['System', 'Browser and files'],
      ['Interface', 'Menus and controls'],
      ['Game Core', 'Rules and renderer'],
      ['Account', 'Local save and loadout'],
      ['Ready', 'Enter the menu']
    ].map(([title, detail], index) => `
      <li data-startup-step="${index}"><span>${index + 1}</span><div><strong>${title}</strong><small>${detail}</small></div></li>
    `).join('');
    status.insertAdjacentElement('afterend', stages);

    const detail = document.createElement('div');
    detail.className = 'startup-v2-detail';
    detail.innerHTML = `
      <span id="startupV2Stage">Starting…</span>
      <span id="startupV2Elapsed">0.0s</span>
    `;
    stages.insertAdjacentElement('afterend', detail);

    const actions = document.createElement('div');
    actions.className = 'startup-v2-actions';
    actions.hidden = true;
    actions.innerHTML = `
      <button type="button" class="primary" data-startup-action="retry">Retry Start</button>
      <button type="button" class="secondary" data-startup-action="safe">${state.safeMode ? 'Try Standard Start' : 'Use Safe Start'}</button>
      <button type="button" class="ghost" data-startup-action="diagnostics">Copy Diagnostics</button>
    `;
    detail.insertAdjacentElement('afterend', actions);

    const percent = document.getElementById('startupV2Percent');
    const stageOutput = document.getElementById('startupV2Stage');
    const elapsedOutput = document.getElementById('startupV2Elapsed');
    const stepNodes = [...stages.querySelectorAll('[data-startup-step]')];
    let displayedProgress = 0;
    let lastStage = state.stage || 'document-loading';
    let readyTimer = 0;

    const stageIndex = (stage, current) => {
      if (stage === 'ready') return 4;
      if (stage === 'game-initialized') return 3;
      if (stage === 'game-script-started' || stage === 'core-loading') return 2;
      if (stage === 'dom-ready') return 1;
      if (['slow', 'stalled', 'failed'].includes(stage)) {
        if (current.gameStarted || Number(current.progress) >= 80) return 3;
        if (Number(current.progress) >= 42) return 2;
        return 1;
      }
      return 0;
    };

    const render = snapshot => {
      const stage = snapshot.stage || lastStage;
      lastStage = stage;
      const target = Math.max(Number(snapshot.progress) || 0, progressFor(stage));
      displayedProgress = Math.max(displayedProgress, Math.min(100, target));
      const rounded = Math.round(displayedProgress);
      bar.style.width = `${rounded}%`;
      track?.setAttribute('aria-valuenow', String(rounded));
      if (percent) percent.textContent = `${rounded}%`;

      const label = STAGE_LABELS[stage] || STAGE_LABELS['document-loading'];
      status.textContent = snapshot.detail ? safeText(snapshot.detail) : label;
      if (stageOutput) stageOutput.textContent = label;

      const activeIndex = stageIndex(stage, snapshot);
      stepNodes.forEach((node, index) => {
        node.classList.toggle('is-complete', stage === 'ready' || index < activeIndex);
        node.classList.toggle('is-active', stage !== 'ready' && index === activeIndex);
      });

      const needsRecovery = snapshot.failed || ['slow', 'stalled', 'failed'].includes(stage);
      actions.hidden = !needsRecovery;
      root.classList.toggle('has-startup-problem', needsRecovery);
      root.classList.toggle('is-safe-start', !!snapshot.safeMode);

      if (stage === 'ready' || snapshot.ready) {
        displayedProgress = 100;
        bar.style.width = '100%';
        if (percent) percent.textContent = '100%';
        if (stageOutput) stageOutput.textContent = 'Ready to extract';
        status.textContent = 'Ready to extract!';
        actions.hidden = true;
        root.classList.add('startup-v2-ready');
        stepNodes.forEach(node => {
          node.classList.add('is-complete');
          node.classList.remove('is-active');
        });
        clearTimeout(readyTimer);
        readyTimer = window.setTimeout(() => {
          if (!root.hidden) {
            root.classList.add('is-hiding');
            window.setTimeout(() => { root.hidden = true; }, 460);
          }
        }, 300);
      }
    };

    const snapshot = () => typeof state.getSnapshot === 'function' ? state.getSnapshot() : state;
    const unsubscribe = typeof state.subscribe === 'function'
      ? state.subscribe(render)
      : (() => {});

    render(snapshot());

    const elapsedTimer = window.setInterval(() => {
      const current = snapshot();
      const elapsed = typeof state.detectedElapsedMs === 'function'
        ? state.detectedElapsedMs()
        : Math.max(0, Date.now() - Number(state.startedAt || Date.now()));
      if (elapsedOutput) elapsedOutput.textContent = `${(elapsed / 1000).toFixed(1)}s`;

      if (!current.ready && !current.failed) {
        const cap = current.stage === 'game-script-started' ? 82 : current.stage === 'core-loading' ? 58 : 34;
        displayedProgress = Math.min(cap, displayedProgress + 0.18);
        const rounded = Math.round(displayedProgress);
        bar.style.width = `${rounded}%`;
        track?.setAttribute('aria-valuenow', String(rounded));
        if (percent) percent.textContent = `${rounded}%`;
      }

      if (current.ready || root.hidden) {
        clearInterval(elapsedTimer);
        unsubscribe?.();
      }
    }, 180);

    actions.addEventListener('click', async event => {
      const button = event.target.closest('[data-startup-action]');
      if (!button) return;
      const action = button.dataset.startupAction;

      if (action === 'retry' || action === 'safe') {
        const useSafeMode = action === 'safe' ? !state.safeMode : !!state.safeMode;
        try {
          if (useSafeMode) sessionStorage.setItem('critter.boot.safeMode', '1');
          else sessionStorage.removeItem('critter.boot.safeMode');
        } catch (_) { }
        const url = new URL(location.href);
        if (useSafeMode) url.searchParams.set('safe', '1');
        else url.searchParams.delete('safe');
        url.searchParams.set('boot', Date.now().toString(36));
        location.replace(url.toString());
        return;
      }

      if (action === 'diagnostics') {
        const current = snapshot();
        const payload = {
          project: 'Critter Extraction',
          gameVersion: current.version || 'unknown',
          startupSystem: current.systemVersion || 2,
          attemptId: current.attemptId || '',
          safeMode: !!current.safeMode,
          online: navigator.onLine !== false,
          stage: current.stage || '',
          detail: safeText(current.detail, 240),
          elapsedMs: typeof state.detectedElapsedMs === 'function' ? state.detectedElapsedMs() : 0,
          history: Array.isArray(current.history) ? current.history.slice(-12) : [],
          errors: Array.isArray(current.errors)
            ? current.errors.slice(-4).map(error => ({ code: error?.code || '', message: safeText(error?.message || error, 240) }))
            : []
        };
        const copied = await copyText(JSON.stringify(payload, null, 2));
        button.textContent = copied ? 'Diagnostics Copied' : 'Copy Failed';
        window.setTimeout(() => { button.textContent = 'Copy Diagnostics'; }, 1800);
      }
    });

    window.addEventListener('online', () => root.classList.remove('is-offline'));
    window.addEventListener('offline', () => root.classList.add('is-offline'));
    root.classList.toggle('is-offline', navigator.onLine === false);

    window.CritterStartupV2 = Object.freeze({
      showRecovery(reason = 'stalled') {
        actions.hidden = false;
        root.classList.add('has-startup-problem');
        if (stageOutput) stageOutput.textContent = reason === 'slow' ? 'Still working' : 'Startup needs attention';
      },
      showFailure(error) {
        actions.hidden = false;
        root.classList.add('has-startup-problem');
        status.textContent = safeText(error?.message || 'The game could not finish starting.');
        if (stageOutput) stageOutput.textContent = 'Startup stopped';
      },
      render
    });
  }

  const boot = async () => {
    const state = await waitForBootState();
    if (!state) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initialize(state), { once: true });
    } else {
      initialize(state);
    }
  };

  boot();
})();

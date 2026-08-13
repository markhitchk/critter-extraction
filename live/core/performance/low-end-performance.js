/**
 * Critter Extraction — adaptive low-end phone/tablet performance manager.
 * Uses hardware hints plus a short gameplay FPS sample and persists the
 * game's existing performance settings instead of patching the renderer.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const AUTO_KEY = 'critterExtractionAutoPerformanceV1';
  const OVERRIDE_KEY = 'critterExtractionPerformanceOverrideV1';
  const TARGET_IDS = new Set(['quality', 'renderScale', 'fogEnabled', 'compatibilityMode', 'reducedMotion']);

  const runtime = {
    mode: 'standard',
    reason: 'none',
    score: 0,
    averageFps: null,
    slowFrameRatio: null,
    sampled: false,
    autoApplied: false
  };

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (_) { }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (_) { }
    }
  };

  function viewportState() {
    const known = window.CritterViewport?.getState?.();
    if (known) return known;
    const width = Math.max(1, innerWidth || root.clientWidth || 1);
    const height = Math.max(1, innerHeight || root.clientHeight || 1);
    const touchCapable = (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches;
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    let device = 'desktop';
    if (touchCapable && (shortSide <= 700 || /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent || ''))) device = 'phone';
    else if (touchCapable && shortSide <= 1100 && longSide <= 1800) device = 'tablet';
    return { device, touchCapable, width, height, devicePixelRatio: window.devicePixelRatio || 1 };
  }

  function hardwareProfile() {
    const view = viewportState();
    const phoneOrTablet = view.device === 'phone' || view.device === 'tablet';
    const memory = Number(navigator.deviceMemory || 0);
    const cores = Number(navigator.hardwareConcurrency || 0);
    const dpr = Number(window.devicePixelRatio || 1);
    const saveData = !!navigator.connection?.saveData;
    let score = 0;
    const reasons = [];

    if (!phoneOrTablet) return { phoneOrTablet, memory, cores, dpr, saveData, score, reasons, lowEnd: false };
    if (memory && memory <= 2) { score += 4; reasons.push('memory<=2GB'); }
    else if (memory && memory <= 4) { score += 2; reasons.push('memory<=4GB'); }
    if (cores && cores <= 4) { score += 3; reasons.push('cpu<=4cores'); }
    else if (cores && cores <= 6) { score += 1; reasons.push('cpu<=6cores'); }
    if (saveData) { score += 2; reasons.push('save-data'); }
    if (dpr >= 3) { score += 1; reasons.push('high-dpr'); }
    if (view.device === 'tablet' && memory && memory <= 4) score += 1;

    return { phoneOrTablet, memory, cores, dpr, saveData, score, reasons, lowEnd: score >= 3 };
  }

  function setMode(mode, reason) {
    runtime.mode = mode;
    runtime.reason = reason || runtime.reason;
    root.dataset.performanceMode = mode;
    root.classList.toggle('performance-low-end', mode === 'low-end');
    root.classList.toggle('performance-auto', runtime.autoApplied);
    updateNote();
    dispatchEvent(new CustomEvent('critter:performancechange', { detail: { ...runtime } }));
  }

  function updateNote() {
    const graphicsSection = document.querySelector('#settingsForm #quality')?.closest('section');
    if (!graphicsSection) return;
    let note = document.getElementById('adaptivePerformanceNote');
    if (!note) {
      note = document.createElement('p');
      note.id = 'adaptivePerformanceNote';
      note.className = 'setting-note adaptive-performance-note';
      graphicsSection.appendChild(note);
    }
    if (runtime.mode === 'low-end') {
      const fps = runtime.averageFps ? ` • sampled ${Math.round(runtime.averageFps)} FPS` : '';
      note.textContent = `Adaptive performance: LOW-END MODE active (${runtime.reason}${fps}). You can change Graphics settings manually.`;
    } else if (hardwareProfile().phoneOrTablet) {
      note.textContent = runtime.sampled
        ? `Adaptive performance: standard mobile profile • sampled ${Math.round(runtime.averageFps || 0)} FPS.`
        : 'Adaptive performance: monitoring this phone/tablet for sustained lag.';
    } else {
      note.textContent = 'Adaptive performance: desktop quality is unchanged.';
    }
  }

  function diagnosticsReady() {
    const diag = window.__CRITTER_DIAGNOSTICS__;
    return !!(diag && typeof diag.savedSettings === 'function' && document.getElementById('settingsForm'));
  }

  function settingsLookUserCustomized(settings) {
    if (!settings) return false;
    return settings.quality !== 'medium' || Number(settings.renderScale) !== 1 ||
      !!settings.compatibilityMode || !!settings.reducedMotion || settings.fogEnabled === false;
  }

  function applyLowEndSettings(reason, force = false) {
    if (storage.get(OVERRIDE_KEY) === '1' && !force) return false;
    if (!diagnosticsReady()) return false;

    const diag = window.__CRITTER_DIAGNOSTICS__;
    const current = diag.savedSettings();
    const wasAuto = storage.get(AUTO_KEY) === '1';
    if (!force && !wasAuto && settingsLookUserCustomized(current)) {
      setMode('standard', 'user-settings');
      return false;
    }

    const form = document.getElementById('settingsForm');
    const quality = document.getElementById('quality');
    const renderScale = document.getElementById('renderScale');
    const fog = document.getElementById('fogEnabled');
    const compatibility = document.getElementById('compatibilityMode');
    const reducedMotion = document.getElementById('reducedMotion');

    if (quality) quality.value = 'low';
    if (renderScale) renderScale.value = '0.7';
    if (fog) fog.checked = false;
    if (compatibility) compatibility.checked = true;
    if (reducedMotion) reducedMotion.checked = true;

    runtime.autoApplied = true;
    storage.set(AUTO_KEY, '1');
    setMode('low-end', reason);
    form.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function markManualOverride(event) {
    if (!event.isTrusted || !TARGET_IDS.has(event.target?.id)) return;
    storage.set(OVERRIDE_KEY, '1');
    storage.remove(AUTO_KEY);
    runtime.autoApplied = false;
    root.classList.remove('performance-auto');
    setTimeout(() => {
      const settings = window.__CRITTER_DIAGNOSTICS__?.savedSettings?.();
      setMode(settings?.compatibilityMode && settings?.quality === 'low' ? 'low-end' : 'standard', 'manual');
    }, 0);
  }

  function waitForGameSettings(callback, attempts = 0) {
    if (diagnosticsReady()) return callback();
    if (attempts >= 120) return;
    setTimeout(() => waitForGameSettings(callback, attempts + 1), attempts < 20 ? 100 : 250);
  }

  function sampleGameplayFps() {
    if (runtime.sampled || runtime.mode === 'low-end' || storage.get(OVERRIDE_KEY) === '1') return;
    const profile = hardwareProfile();
    if (!profile.phoneOrTablet) return;

    runtime.sampled = true;
    let start = 0;
    let sampleStart = 0;
    let last = 0;
    let frames = 0;
    let slowFrames = 0;

    const tick = now => {
      if (!document.getElementById('gameScreen')?.classList.contains('active') || document.hidden) {
        runtime.sampled = false;
        return;
      }
      if (!start) { start = now; last = now; requestAnimationFrame(tick); return; }
      if (!sampleStart && now - start >= 700) { sampleStart = now; last = now; requestAnimationFrame(tick); return; }
      if (!sampleStart) { last = now; requestAnimationFrame(tick); return; }

      const delta = now - last;
      last = now;
      frames += 1;
      if (delta > 26) slowFrames += 1;
      const elapsed = now - sampleStart;
      if (elapsed < 2400) { requestAnimationFrame(tick); return; }

      runtime.averageFps = frames * 1000 / Math.max(1, elapsed);
      runtime.slowFrameRatio = slowFrames / Math.max(1, frames);
      const sustainedLag = runtime.averageFps < 42 || runtime.slowFrameRatio > 0.30;
      if (sustainedLag) waitForGameSettings(() => applyLowEndSettings('measured-lag'));
      else setMode('standard', 'fps-ok');
    };
    requestAnimationFrame(tick);
  }

  function observeGameplay() {
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen) return;
    const maybeSample = () => {
      if (gameScreen.classList.contains('active')) sampleGameplayFps();
    };
    new MutationObserver(maybeSample).observe(gameScreen, { attributes: true, attributeFilter: ['class'] });
    maybeSample();
  }

  function initialize() {
    const form = document.getElementById('settingsForm');
    form?.addEventListener('change', markManualOverride, true);

    const profile = hardwareProfile();
    runtime.score = profile.score;
    if (!profile.phoneOrTablet) {
      setMode('standard', 'desktop');
      return;
    }

    if (storage.get(AUTO_KEY) === '1' && storage.get(OVERRIDE_KEY) !== '1') {
      waitForGameSettings(() => applyLowEndSettings('remembered-device'));
    } else if (profile.lowEnd && storage.get(OVERRIDE_KEY) !== '1') {
      waitForGameSettings(() => applyLowEndSettings(profile.reasons.join('+') || 'hardware'));
    } else {
      setMode('standard', 'mobile-monitoring');
    }
    observeGameplay();
  }

  window.CritterPerformance = Object.freeze({
    getState: () => ({ ...runtime, hardware: hardwareProfile() }),
    retest: () => { runtime.sampled = false; sampleGameplayFps(); },
    useLowEndMode: () => waitForGameSettings(() => applyLowEndSettings('manual-api', true)),
    allowAutomatic: () => { storage.remove(OVERRIDE_KEY); runtime.sampled = false; initialize(); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();

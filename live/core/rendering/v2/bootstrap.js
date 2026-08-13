/* Critter Extraction Renderer V2 — passive Stage 1 bootstrap. */
(() => {
  'use strict';
  if (window.CritterRendererV2Boot) return;

  const base = new URL('./', document.currentScript?.src || location.href);

  function load(id, file, isReady) {
    if (isReady()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = id;
      script.src = new URL(file, base).href;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Renderer V2 module failed: ${file}`));
      document.head.appendChild(script);
    });
  }

  const ready = load('critter-render-v2-capabilities', 'capabilities.js', () => !!window.CritterRenderCapabilities)
    .then(() => load('critter-render-v2-quality', 'quality-manager.js', () => !!window.CritterRenderQuality))
    .then(() => load('critter-render-v2-bridge', 'renderer-bridge.js', () => !!window.CritterRendererBridge))
    .then(() => {
      const report = Object.freeze({
        version:'1.0.0-stage1',
        stage:1,
        activeRenderer:window.CritterRendererBridge.report().active,
        capabilities:window.CritterRenderCapabilities.snapshot(),
        quality:window.CritterRenderQuality.createProfile('auto')
      });
      window.__CRITTER_RENDERER_V2_STAGE1_REPORT__ = report;
      window.dispatchEvent(new CustomEvent('critter:renderer-v2-stage1-ready', { detail:report }));
      return report;
    });

  window.CritterRendererV2Boot = Object.freeze({ version:'1.0.0-stage1', ready });
})();

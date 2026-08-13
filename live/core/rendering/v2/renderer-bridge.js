/* Critter Extraction Renderer V2 — renderer bridge.
   The bridge is passive until a backend is registered and explicitly activated. */
(() => {
  'use strict';
  if (window.CritterRendererBridge) return;

  const backends = new Map();
  let activeName = 'legacy';
  let preferredName = 'legacy';
  const fallbackName = 'legacy';
  let lastError = null;

  function validBackend(backend) {
    return !!backend && typeof backend === 'object' && typeof backend.render === 'function';
  }

  function register(name, backend) {
    const key = String(name || '').trim().toLowerCase();
    if (!key || key === 'legacy') throw new Error('Renderer backend requires a non-legacy name.');
    if (!validBackend(backend)) throw new TypeError('Renderer backend must provide render(state, frame).');
    backends.set(key, backend);
    window.dispatchEvent(new CustomEvent('critter:renderer-backend-registered', { detail:{ name:key } }));
    return key;
  }

  function unregister(name) {
    const key = String(name || '').trim().toLowerCase();
    if (activeName === key) activeName = fallbackName;
    return backends.delete(key);
  }

  function setPreferred(name) {
    preferredName = String(name || 'legacy').trim().toLowerCase();
    return preferredName;
  }

  function activate(name = preferredName) {
    const key = String(name || 'legacy').trim().toLowerCase();
    if (key === 'legacy') {
      activeName = 'legacy';
      lastError = null;
      return true;
    }
    if (!backends.has(key)) return false;
    activeName = key;
    lastError = null;
    window.dispatchEvent(new CustomEvent('critter:renderer-backend-activated', { detail:{ name:key } }));
    return true;
  }

  function useLegacy() {
    activeName = 'legacy';
    preferredName = 'legacy';
    return true;
  }

  function render(state, frame = {}) {
    if (activeName === 'legacy') return false;
    const backend = backends.get(activeName);
    if (!backend) {
      activeName = fallbackName;
      return false;
    }
    try {
      backend.render(state, frame);
      return true;
    } catch (error) {
      const failedName = activeName;
      lastError = error;
      console.warn(`[Renderer V2] ${failedName} failed; returning to ${fallbackName}.`, error);
      try { backend.onError?.(error); } catch (_) {}
      activeName = fallbackName;
      window.dispatchEvent(new CustomEvent('critter:renderer-backend-failed', { detail:{ name:failedName, fallback:fallbackName, error:String(error?.message || error) } }));
      return false;
    }
  }

  function resize(width, height, dpr) {
    if (activeName === 'legacy') return false;
    const backend = backends.get(activeName);
    if (!backend?.resize) return false;
    backend.resize(width, height, dpr);
    return true;
  }

  function dispose(name = activeName) {
    const key = String(name || '').trim().toLowerCase();
    if (key === 'legacy') return;
    const backend = backends.get(key);
    try { backend?.dispose?.(); } catch (error) { console.warn('[Renderer V2] dispose failed.', error); }
    if (key === activeName) activeName = fallbackName;
  }

  function report() {
    return Object.freeze({
      version:'1.0.0-stage1',
      active:activeName,
      preferred:preferredName,
      fallback:fallbackName,
      registered:Object.freeze([...backends.keys()]),
      lastError:lastError ? String(lastError?.message || lastError) : null,
      capabilities:window.CritterRenderCapabilities?.snapshot?.() || null,
      quality:window.CritterRenderQuality?.createProfile?.('auto') || null
    });
  }

  const api = Object.freeze({ version:'1.0.0-stage1', register, unregister, setPreferred, activate, useLegacy, render, resize, dispose, report });
  window.CritterRendererBridge = api;
  window.__CRITTER_RENDERER_V2__ = report();
  window.dispatchEvent(new CustomEvent('critter:renderer-bridge-ready', { detail:window.__CRITTER_RENDERER_V2__ }));
})();

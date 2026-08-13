/* Critter Extraction Renderer V2 — Stage 1 capability detection.
   Passive by design: this file does not replace or initialize the live renderer. */
(() => {
  'use strict';

  if (window.CritterRenderCapabilities) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function probeGL(kind) {
    const canvas = document.createElement('canvas');
    let gl = null;
    try {
      gl = canvas.getContext(kind, {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      });
    } catch (_) {
      gl = null;
    }

    if (!gl) return Object.freeze({ supported: false, kind });

    const read = parameter => {
      try { return gl.getParameter(parameter); }
      catch (_) { return 0; }
    };

    const result = {
      supported: true,
      kind,
      maxTextureSize: read(gl.MAX_TEXTURE_SIZE) || 0,
      maxRenderbufferSize: read(gl.MAX_RENDERBUFFER_SIZE) || 0,
      maxVertexTextureUnits: read(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) || 0,
      maxCombinedTextureUnits: read(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0,
      maxSamples: kind === 'webgl2' && gl.MAX_SAMPLES ? (read(gl.MAX_SAMPLES) || 0) : 0
    };

    try { gl.getExtension('WEBGL_lose_context')?.loseContext?.(); }
    catch (_) {}

    return Object.freeze(result);
  }

  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const coarsePointer = !!globalThis.matchMedia?.('(pointer: coarse)')?.matches;
  const hoverNone = !!globalThis.matchMedia?.('(hover: none)')?.matches;
  const compactViewport = Math.min(screen.width || innerWidth || 0, screen.height || innerHeight || 0) <= 900;
  const mobileLike = (touchPoints > 0 && coarsePointer && hoverNone) || (touchPoints > 0 && compactViewport);
  const memoryGB = Number(navigator.deviceMemory || 0);
  const logicalCores = Number(navigator.hardwareConcurrency || 0);
  const dpr = clamp(Number(devicePixelRatio || 1), 1, 4);
  const reducedMotion = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const webgl2 = probeGL('webgl2');
  const webgl = webgl2.supported ? Object.freeze({ supported: true, kind: 'webgl', impliedByWebGL2: true }) : probeGL('webgl');

  function performanceClass() {
    let score = 0;
    if (memoryGB) score += memoryGB >= 8 ? 2 : memoryGB >= 4 ? 1 : -1;
    if (logicalCores) score += logicalCores >= 8 ? 2 : logicalCores >= 6 ? 1 : logicalCores <= 4 ? -1 : 0;
    if (webgl2.supported) score += 2;
    else if (webgl.supported) score += 0;
    else score -= 4;
    if (mobileLike) score -= 1;
    if (dpr >= 3) score -= 1;

    if (!webgl.supported) return 'unsupported';
    if (score >= 4 && !mobileLike) return 'desktop-high';
    if (score >= 2 && !mobileLike) return 'desktop-balanced';
    if (score >= 1 && mobileLike) return 'mobile-balanced';
    if (mobileLike) return 'mobile-low';
    return 'compatibility';
  }

  let webGPUProbe = null;
  async function probeWebGPU() {
    if (webGPUProbe) return webGPUProbe;
    webGPUProbe = (async () => {
      if (!navigator.gpu?.requestAdapter) {
        return Object.freeze({ api: false, adapter: false, supported: false });
      }
      try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        return Object.freeze({ api: true, adapter: !!adapter, supported: !!adapter });
      } catch (error) {
        return Object.freeze({ api: true, adapter: false, supported: false, error: String(error?.message || error) });
      }
    })();
    return webGPUProbe;
  }

  function snapshot() {
    return Object.freeze({
      version: '1.0.0-stage1',
      secureContext: globalThis.isSecureContext === true,
      webGPUApi: !!navigator.gpu,
      webgl2,
      webgl,
      touchPoints,
      coarsePointer,
      hoverNone,
      mobileLike,
      memoryGB,
      logicalCores,
      dpr,
      reducedMotion,
      performanceClass: performanceClass()
    });
  }

  const api = Object.freeze({
    version: '1.0.0-stage1',
    probeGL,
    probeWebGPU,
    performanceClass,
    snapshot
  });

  window.CritterRenderCapabilities = api;
  window.__CRITTER_RENDER_CAPABILITIES__ = snapshot();
  window.dispatchEvent(new CustomEvent('critter:renderer-capabilities-ready', {
    detail: window.__CRITTER_RENDER_CAPABILITIES__
  }));
})();

/* Critter Extraction Renderer V2 — adaptive quality profiles. */
(() => {
  'use strict';
  if (window.CritterRenderQuality) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const presets = Object.freeze({
    high: Object.freeze({ id:'high', targetFps:60, renderScale:.92, minRenderScale:.72, maxRenderScale:1, shadows:true, shadowMapSize:1536, ao:true, bloom:true, vegetation:.9, particles:.9, lodBias:.95 }),
    medium: Object.freeze({ id:'medium', targetFps:60, renderScale:.82, minRenderScale:.66, maxRenderScale:.92, shadows:true, shadowMapSize:1024, ao:false, bloom:true, vegetation:.72, particles:.72, lodBias:.82 }),
    mobile: Object.freeze({ id:'mobile', targetFps:45, renderScale:.76, minRenderScale:.58, maxRenderScale:.86, shadows:true, shadowMapSize:768, ao:false, bloom:false, vegetation:.52, particles:.55, lodBias:.68 }),
    low: Object.freeze({ id:'low', targetFps:30, renderScale:.66, minRenderScale:.5, maxRenderScale:.76, shadows:false, shadowMapSize:0, ao:false, bloom:false, vegetation:.34, particles:.35, lodBias:.52 }),
    compatibility: Object.freeze({ id:'compatibility', targetFps:30, renderScale:.6, minRenderScale:.5, maxRenderScale:.68, shadows:false, shadowMapSize:0, ao:false, bloom:false, vegetation:.24, particles:.25, lodBias:.45 })
  });

  function capabilities() {
    return window.CritterRenderCapabilities?.snapshot?.() || window.__CRITTER_RENDER_CAPABILITIES__ || { performanceClass:'compatibility', mobileLike:false, webgl2:{supported:false} };
  }

  function automaticPreset(caps = capabilities()) {
    if (caps.performanceClass === 'desktop-high') return 'high';
    if (caps.performanceClass === 'desktop-balanced') return 'medium';
    if (caps.performanceClass === 'mobile-balanced') return 'mobile';
    if (caps.performanceClass === 'mobile-low') return 'low';
    return 'compatibility';
  }

  function createProfile(requested = 'auto') {
    const caps = capabilities();
    let id = requested === 'auto' ? automaticPreset(caps) : String(requested || 'medium').toLowerCase();
    if (!presets[id]) id = automaticPreset(caps);
    if (!caps.webgl2?.supported && id !== 'low') id = 'compatibility';
    return Object.freeze({ ...presets[id], capabilities:caps, reducedMotion:!!caps.reducedMotion });
  }

  class DynamicScaleController {
    constructor(profile = createProfile()) {
      this.reset(profile);
    }
    reset(profile = createProfile()) {
      this.profile = profile;
      this.scale = profile.renderScale;
      this.averageMs = 1000 / profile.targetFps;
      this.samples = 0;
      this.lastChange = 0;
      return this.scale;
    }
    sample(frameMs, now = performance.now()) {
      const ms = clamp(Number(frameMs || 0), 1, 250);
      this.averageMs = this.samples ? this.averageMs * .9 + ms * .1 : ms;
      this.samples += 1;
      if (this.samples < 45 || now - this.lastChange < 1600) return this.scale;
      const target = 1000 / this.profile.targetFps;
      let next = this.scale;
      if (this.averageMs > target * 1.14) next -= .06;
      else if (this.averageMs < target * .84) next += .035;
      next = clamp(next, this.profile.minRenderScale, this.profile.maxRenderScale);
      if (Math.abs(next - this.scale) >= .015) {
        this.scale = Number(next.toFixed(3));
        this.lastChange = now;
      }
      return this.scale;
    }
    report() {
      return Object.freeze({ profile:this.profile.id, targetFps:this.profile.targetFps, renderScale:this.scale, averageFrameMs:Number(this.averageMs.toFixed(2)), estimatedFps:Number((1000 / Math.max(1,this.averageMs)).toFixed(1)), samples:this.samples });
    }
  }

  const api = Object.freeze({ version:'1.0.0-stage1', presets, automaticPreset, createProfile, DynamicScaleController });
  window.CritterRenderQuality = api;
  window.__CRITTER_RENDER_QUALITY__ = createProfile();
  window.dispatchEvent(new CustomEvent('critter:renderer-quality-ready', { detail:window.__CRITTER_RENDER_QUALITY__ }));
})();

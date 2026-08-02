(() => {
  'use strict';
  const S = window.CritterSanitizer || { text:String, safeUrl:String, sourceDisplay:String };
  const eventId = () => 'CE-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
  const elapsed = () => window.__CRITTER_BOOT__ && window.__CRITTER_BOOT__.detectedElapsedMs ? window.__CRITTER_BOOT__.detectedElapsedMs() : 0;
  function capture(input = {}) {
    const detectedElapsedMs = Number(input.detectedElapsedMs ?? elapsed());
    const sourceRaw = S.text(input.sourceRaw || input.source || '', 4000);
    return {
      schemaVersion:2, game:'Critter Extraction', gameVersion:(window.CritterVersion && window.CritterVersion.version)||'0.22.0',
      buildId:(window.CritterBuildInfo && window.CritterBuildInfo.buildId)||'', code:S.text(input.code||'CE-UNKNOWN-001',80), eventId:eventId(),
      severity:S.text(input.severity||'fatal',20), system:S.text(input.system||'unknown',50), stage:S.text(input.stage||'unknown',100),
      message:S.text(input.message||'Unknown error'), nativeMessage:S.text(input.nativeMessage||''), sourceRaw, sourceDisplay:S.sourceDisplay(sourceRaw),
      sourceType:S.text(input.sourceType||(/blob:|data:/.test(sourceRaw)?'generated':'file'),40), generatedFrom:S.text(input.generatedFrom||''),
      loader:S.text(input.loader||'core/loader/game-loader.js'), loaderVersion:(window.CritterVersion&&window.CritterVersion.loaderVersion)||'0.22.0',
      line:Number(input.line||0), column:Number(input.column||0), stack:S.text(input.stack||'',8000), detectedElapsedMs, reportElapsedMs:detectedElapsedMs,
      occurredAt:new Date().toISOString(), pageUrl:S.safeUrl(location.href), referrer:S.safeUrl(document.referrer), protocol:location.protocol,
      online:navigator.onLine, visibilityState:document.visibilityState,
      browser:{ userAgent:S.text(navigator.userAgent,1000), language:S.text(navigator.language,100), platform:S.text(navigator.platform,200) },
      viewport:{ width:innerWidth, height:innerHeight, pixelRatio:devicePixelRatio||1 },
      bootFlags:{ gameStarted:!!window.__CRITTER_BOOT__?.gameStarted, initialized:!!window.__CRITTER_BOOT__?.initialized, ready:!!window.__CRITTER_BOOT__?.ready, failed:!!window.__CRITTER_BOOT__?.failed },
      history:Array.isArray(window.__CRITTER_BOOT__?.history)?window.__CRITTER_BOOT__.history.slice(-30):[]
    };
  }
  function finalize(report) { return { ...report, reportElapsedMs: elapsed() }; }
  function stringify(report) { return JSON.stringify(finalize(report), null, 2); }
  window.CritterErrors = Object.freeze({ capture, finalize, stringify });
})();

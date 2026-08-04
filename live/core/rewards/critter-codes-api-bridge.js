/* Critter Codes global API bridge v1.4.0.
   Publishes the packed runtime API and loads insured stash protection. */
(() => {
  'use strict';

  if (window.__CRITTER_CODES_API_BRIDGE__?.version === '1.4.0') return;

  const VERSION = '1.4.0';
  const NativeBlob = window.Blob;
  const nativeAppend = HTMLHeadElement.prototype.appendChild;
  const state = {
    status: 'waiting', attempts: 0, lastError: '', runtimePatched: false,
    blobPatchInstalled: false, blobPatched: false, apiReady: false,
    insuranceLoaded: false
  };
  let timer = 0;

  function readLexicalApi() {
    try { if (typeof CritterCodes !== 'undefined') return CritterCodes; }
    catch (error) { state.lastError = error?.message || String(error || 'Could not read Critter Codes API.'); }
    return null;
  }

  function readLexicalRewardRuntime() {
    try { if (typeof CritterRewardRuntime !== 'undefined') return CritterRewardRuntime; }
    catch (_) { }
    return null;
  }

  function normalizeApi(candidate) {
    if (!candidate || (typeof candidate !== 'object' && typeof candidate !== 'function')) return null;
    const redeem = typeof candidate.redeemCode === 'function'
      ? candidate.redeemCode.bind(candidate)
      : typeof candidate.redeem === 'function' ? candidate.redeem.bind(candidate) : null;
    const openRewards = typeof candidate.openRewards === 'function'
      ? candidate.openRewards.bind(candidate)
      : typeof candidate.open === 'function' ? candidate.open.bind(candidate) : null;
    if (!redeem || !openRewards) return null;
    try {
      if (typeof candidate.redeemCode !== 'function') candidate.redeemCode = redeem;
      if (typeof candidate.redeem !== 'function') candidate.redeem = redeem;
      if (typeof candidate.openRewards !== 'function') candidate.openRewards = openRewards;
      if (typeof candidate.open !== 'function') candidate.open = openRewards;
      candidate.ready = true;
      return candidate;
    } catch (_) {
      return Object.freeze({ ...candidate, ready: true, redeem, redeemCode: redeem, open: openRewards, openRewards });
    }
  }

  function resolveInsuranceUrl() {
    const current = [...document.scripts].find(script => /critter-codes-api-bridge\.js(?:[?#]|$)/.test(script.src));
    return new URL('critter-codes-insurance.js?v=1.0.0', current?.src || document.baseURI).href;
  }

  function loadInsurance() {
    if (window.CritterCodesInsurance) {
      state.insuranceLoaded = true;
      window.CritterCodesInsurance.refresh?.();
      return Promise.resolve(window.CritterCodesInsurance);
    }
    const existing = document.getElementById('critter-codes-insurance-loader');
    if (existing) return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.CritterCodesInsurance), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load Critter Codes insurance: ${existing.src}`)), { once: true });
    });
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'critter-codes-insurance-loader';
      script.async = false;
      script.src = resolveInsuranceUrl();
      script.addEventListener('load', () => {
        state.insuranceLoaded = Boolean(window.CritterCodesInsurance);
        window.CritterCodesInsurance?.refresh?.();
        resolve(window.CritterCodesInsurance);
      }, { once: true });
      script.addEventListener('error', () => {
        state.lastError = `Failed to load Critter Codes insurance: ${script.src}`;
        reject(new Error(state.lastError));
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  function refreshVisibleState() {
    document.querySelectorAll('.critter-codes-entry-button').forEach(button => { button.dataset.state = 'ready'; });
    const status = document.getElementById('critterCodesEntryStatus');
    if (status) {
      status.dataset.state = 'ready';
      const text = status.querySelector('span');
      if (text) text.textContent = 'Critter Codes ready';
    }
    const message = document.getElementById('critterCodesEntryMessage');
    if (message && /did not initialize|still loading|runtime loaded|failed to initialize/i.test(message.textContent || '')) {
      message.textContent = 'Critter Codes ready';
      message.className = 'cc-entry-message success';
    }
  }

  function publishApi() {
    state.attempts += 1;
    const api = normalizeApi(window.CritterCodes || readLexicalApi());
    if (!api) return false;
    try {
      window.CritterCodes = window.CritterCodesInsurance?.wrapApi?.(api) || api;
      const rewardRuntime = window.CritterRewardRuntime || readLexicalRewardRuntime();
      if (rewardRuntime) window.CritterRewardRuntime = rewardRuntime;
    } catch (error) {
      state.lastError = error?.message || String(error || 'Could not publish Critter Codes API.');
      return false;
    }
    state.status = 'ready';
    state.apiReady = true;
    refreshVisibleState();
    if (timer) { clearInterval(timer); timer = 0; }
    window.dispatchEvent(new CustomEvent('critter-codes-api-ready', {
      detail: { version: VERSION, attempts: state.attempts, runtimePatched: state.runtimePatched, blobPatched: state.blobPatched, insuranceLoaded: state.insuranceLoaded }
    }));
    return true;
  }

  function patchPackedRuntime(source) {
    let output = String(source || '');
    if (output.includes('__CRITTER_CODES_API_EXPORT_')) return output;
    let changed = false;
    const exposeBinding = name => {
      const declaration = new RegExp(`\\b(const|let|var)\\s+${name}\\s*=`, 'm');
      if (declaration.test(output)) {
        output = output.replace(declaration, `$1 ${name}=globalThis.${name}=`);
        changed = true;
      }
    };
    exposeBinding('CritterCodes');
    exposeBinding('CritterRewardRuntime');
    output += `\n;(() => {\n  try {\n    const api = typeof CritterCodes !== 'undefined' ? CritterCodes : globalThis.CritterCodes;\n    if (api && (typeof api.redeem === 'function' || typeof api.redeemCode === 'function')) globalThis.CritterCodes = api;\n    const rewardRuntime = typeof CritterRewardRuntime !== 'undefined' ? CritterRewardRuntime : globalThis.CritterRewardRuntime;\n    if (rewardRuntime) globalThis.CritterRewardRuntime = rewardRuntime;\n    globalThis.dispatchEvent(new CustomEvent('critter-codes-runtime-exported'));\n  } catch (error) {\n    globalThis.__CRITTER_CODES_RUNTIME_EXPORT_ERROR__ = error?.message || String(error);\n  }\n})();\n/* __CRITTER_CODES_API_EXPORT_${VERSION}__ changed:${changed} */\n`;
    state.runtimePatched = true;
    return output;
  }

  function installBlobPatch() {
    if (typeof NativeBlob !== 'function' || window.Blob?.__CRITTER_CODES_PATCHED_BLOB__) return;
    function CritterCodesPatchedBlob(parts = [], options = {}) {
      let nextParts = parts;
      try {
        const type = String(options?.type || '').toLowerCase();
        if (type.includes('javascript') && Array.isArray(parts) && parts.every(part => typeof part === 'string')) {
          const source = parts.join('');
          const isRuntime = source.includes('sourceURL=critter-codes.runtime.js') ||
            (source.includes('CritterCodes') && source.includes('CritterRewardRuntime') && (source.includes('redeem') || source.includes('redeemCode')));
          if (isRuntime && !source.includes('__CRITTER_CODES_API_EXPORT_')) {
            nextParts = [patchPackedRuntime(source)];
            state.blobPatched = true;
          }
        }
      } catch (error) { state.lastError = error?.message || String(error || 'Could not patch Critter Codes runtime blob.'); }
      return new NativeBlob(nextParts, options);
    }
    Object.setPrototypeOf(CritterCodesPatchedBlob, NativeBlob);
    CritterCodesPatchedBlob.prototype = NativeBlob.prototype;
    Object.defineProperty(CritterCodesPatchedBlob, '__CRITTER_CODES_PATCHED_BLOB__', { value: true });
    window.Blob = CritterCodesPatchedBlob;
    state.blobPatchInstalled = true;
  }

  installBlobPatch();
  loadInsurance().catch(error => console.error('[Critter Codes] Insurance initialization failed:', error));

  HTMLHeadElement.prototype.appendChild = function critterCodesApiBridgeAppend(node) {
    const src = node?.tagName === 'SCRIPT' ? String(node.src || '') : '';
    const isPackedRuntime = this === document.head && node?.dataset?.critterCodesRuntime && src.startsWith('blob:') && !node.dataset.critterCodesExportPatched && !state.blobPatched;
    if (!isPackedRuntime) return nativeAppend.call(this, node);
    const originalUrl = src;
    node.dataset.critterCodesExportPatched = 'loading';
    fetch(originalUrl).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    }).then(source => {
      const patchedUrl = URL.createObjectURL(new NativeBlob([patchPackedRuntime(source)], { type: 'text/javascript' }));
      node.src = patchedUrl;
      node.dataset.critterCodesExportPatched = 'true';
      node.addEventListener('load', () => { URL.revokeObjectURL(patchedUrl); queueMicrotask(publishApi); }, { once: true });
      node.addEventListener('error', () => URL.revokeObjectURL(patchedUrl), { once: true });
      nativeAppend.call(document.head, node);
    }).catch(error => {
      state.lastError = error?.message || String(error || 'Could not patch packed Critter Codes runtime.');
      node.src = originalUrl;
      node.dataset.critterCodesExportPatched = 'fallback';
      nativeAppend.call(document.head, node);
    });
    return node;
  };

  window.__CRITTER_CODES_API_BRIDGE__ = Object.freeze({
    version: VERSION, refresh: publishApi, patchPackedRuntime, normalizeApi, loadInsurance, state: () => ({ ...state })
  });

  window.CritterCodesDiagnostics = {
    ...(window.CritterCodesDiagnostics || {}), bridgeVersion: VERSION, stage: 'loading', apiReady: false, insuranceLoaded: false, error: null
  };

  if (!publishApi()) {
    timer = window.setInterval(() => {
      if (publishApi() || state.attempts >= 600) {
        if (timer) clearInterval(timer);
        timer = 0;
        if (state.status !== 'ready') {
          state.status = 'unavailable';
          window.CritterCodesDiagnostics.stage = 'error';
          window.CritterCodesDiagnostics.error = state.lastError || 'Critter Codes API was not published.';
        }
      }
    }, 50);
  }

  window.addEventListener('critter-codes-api-ready', () => {
    window.CritterCodesDiagnostics.stage = 'ready';
    window.CritterCodesDiagnostics.apiReady = true;
    window.CritterCodesDiagnostics.insuranceLoaded = Boolean(window.CritterCodesInsurance);
    window.CritterCodesDiagnostics.error = null;
    window.CritterCodesInsurance?.refresh?.();
  });
  document.addEventListener('DOMContentLoaded', publishApi, { once: true });
  window.addEventListener('load', publishApi, { once: true });
  window.addEventListener('critter-codes-runtime-exported', publishApi);
})();

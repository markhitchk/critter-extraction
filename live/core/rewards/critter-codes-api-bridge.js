/* Critter Codes global API bridge v1.1.0.
   The packed runtime may declare CritterCodes inside its generated script
   instead of assigning it to window. This bridge patches that exact runtime
   script before execution so its real API becomes available to the loader,
   the standalone redeem page, and the main-menu interface. */
(() => {
  'use strict';

  if (window.__CRITTER_CODES_API_BRIDGE__) return;

  const VERSION = '1.1.0';
  const state = { status: 'waiting', attempts: 0, lastError: '', runtimePatched: false };
  const nativeAppend = HTMLHeadElement.prototype.appendChild;
  let timer = 0;

  function readLexicalApi() {
    try {
      if (typeof CritterCodes !== 'undefined') return CritterCodes;
    } catch (error) {
      state.lastError = error?.message || String(error || 'Could not read Critter Codes API.');
    }
    return null;
  }

  function readLexicalRewardRuntime() {
    try {
      if (typeof CritterRewardRuntime !== 'undefined') return CritterRewardRuntime;
    } catch (_) { }
    return null;
  }

  function refreshVisibleState() {
    document.querySelectorAll('.critter-codes-entry-button').forEach(button => {
      button.dataset.state = 'ready';
    });
    const status = document.getElementById('critterCodesEntryStatus');
    if (status) {
      status.dataset.state = 'ready';
      const text = status.querySelector('span');
      if (text) text.textContent = 'Critter Codes ready';
    }
    const message = document.getElementById('critterCodesEntryMessage');
    if (message && /did not initialize|still loading|runtime loaded/i.test(message.textContent || '')) {
      message.textContent = 'Critter Codes ready';
      message.className = 'cc-entry-message success';
    }
  }

  function publishApi() {
    state.attempts += 1;
    const api = window.CritterCodes || readLexicalApi();
    if (!api || typeof api.redeem !== 'function') return false;

    try {
      window.CritterCodes = api;
      const rewardRuntime = window.CritterRewardRuntime || readLexicalRewardRuntime();
      if (rewardRuntime) window.CritterRewardRuntime = rewardRuntime;
    } catch (error) {
      state.lastError = error?.message || String(error || 'Could not publish Critter Codes API.');
      return false;
    }

    state.status = 'ready';
    refreshVisibleState();
    if (timer) {
      clearInterval(timer);
      timer = 0;
    }
    window.dispatchEvent(new CustomEvent('critter-codes-api-ready', {
      detail: { version: VERSION, attempts: state.attempts, runtimePatched: state.runtimePatched }
    }));
    return true;
  }

  function patchPackedRuntime(source) {
    let output = String(source || '');
    let changed = false;

    const exposeBinding = name => {
      const declaration = new RegExp(`\\b(const|let|var)\\s+${name}\\s*=`, 'm');
      if (declaration.test(output)) {
        output = output.replace(declaration, `$1 ${name}=window.${name}=`);
        changed = true;
      }
    };

    exposeBinding('CritterCodes');
    exposeBinding('CritterRewardRuntime');

    output += `\n;(() => {\n  try {\n    const api = typeof CritterCodes !== 'undefined' ? CritterCodes : globalThis.CritterCodes;\n    if (api && typeof api.redeem === 'function') globalThis.CritterCodes = api;\n    const rewardRuntime = typeof CritterRewardRuntime !== 'undefined' ? CritterRewardRuntime : globalThis.CritterRewardRuntime;\n    if (rewardRuntime) globalThis.CritterRewardRuntime = rewardRuntime;\n    globalThis.dispatchEvent(new CustomEvent('critter-codes-runtime-exported'));\n  } catch (error) {\n    globalThis.__CRITTER_CODES_RUNTIME_EXPORT_ERROR__ = error?.message || String(error);\n  }\n})();\n/* __CRITTER_CODES_API_EXPORT_${VERSION}__ changed:${changed} */\n`;

    state.runtimePatched = true;
    return output;
  }

  HTMLHeadElement.prototype.appendChild = function critterCodesApiBridgeAppend(node) {
    const src = node?.tagName === 'SCRIPT' ? String(node.src || '') : '';
    const isPackedRuntime = this === document.head &&
      node?.dataset?.critterCodesRuntime &&
      src.startsWith('blob:') &&
      !node.dataset.critterCodesExportPatched;

    if (!isPackedRuntime) return nativeAppend.call(this, node);

    const originalUrl = src;
    node.dataset.critterCodesExportPatched = 'loading';

    fetch(originalUrl).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    }).then(source => {
      const patchedUrl = URL.createObjectURL(new Blob([patchPackedRuntime(source)], { type: 'text/javascript' }));
      node.src = patchedUrl;
      node.dataset.critterCodesExportPatched = 'true';
      node.addEventListener('load', () => {
        URL.revokeObjectURL(patchedUrl);
        queueMicrotask(publishApi);
      }, { once: true });
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
    version: VERSION,
    refresh: publishApi,
    patchPackedRuntime,
    state: () => ({ ...state })
  });

  if (!publishApi()) {
    timer = window.setInterval(() => {
      if (publishApi() || state.attempts >= 600) {
        if (timer) clearInterval(timer);
        timer = 0;
        if (state.status !== 'ready') state.status = 'unavailable';
      }
    }, 50);
  }

  document.addEventListener('DOMContentLoaded', publishApi, { once: true });
  window.addEventListener('load', publishApi, { once: true });
  window.addEventListener('critter-codes-runtime-exported', publishApi);
})();

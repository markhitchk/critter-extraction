/* Critter Codes global API bridge v1.0.0.
   The packed classic-script runtime exposes CritterCodes as a global lexical
   binding in some browsers. Global lexical bindings are not properties of
   window, so this bridge publishes the existing API for the production loader
   and lobby UI without changing or exposing any valid reward codes. */
(() => {
  'use strict';

  if (window.__CRITTER_CODES_API_BRIDGE__) return;

  const VERSION = '1.0.0';
  const state = { status: 'waiting', attempts: 0, lastError: '' };
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
      detail: { version: VERSION, attempts: state.attempts }
    }));
    return true;
  }

  window.__CRITTER_CODES_API_BRIDGE__ = Object.freeze({
    version: VERSION,
    refresh: publishApi,
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
})();

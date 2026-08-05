(() => {
  'use strict';

  const BUILD_ID = '3391f2959d123859-model-gate-1';
  window.CritterBuildInfo = Object.freeze({
    buildId: BUILD_ID,
    channel: 'github-pages',
    generatedAt: '2026-08-05T03:38:00.000Z'
  });

  if (window.__CRITTER_MODEL_RUNTIME_GATE__) return;

  const previousAppend = HTMLHeadElement.prototype.appendChild;
  const MODEL_TIMEOUT_MS = 30000;
  const RUNTIME_PATTERN = /\/core\/game\/game-runtime\.js(?:[?#]|$)/;

  function validationSnapshot() {
    const completeModels = window.CritterCompleteModels?.validateModels?.();
    const runtime = window.CritterModelRuntime?.report?.();
    return {
      completeModels,
      runtime,
      ready: !!(
        window.NewCritterRuntimePatch &&
        window.CritterAllAssetRuntimePatch &&
        completeModels?.ok &&
        completeModels.count === 39 &&
        completeModels.unique === 39 &&
        runtime?.valid &&
        runtime.live === 39
      )
    };
  }

  function modelFailure(message, cause) {
    const error = new Error(message);
    error.name = 'CritterModelBootError';
    error.code = 'CE-MODEL-BOOT-001';
    error.sourceRaw = 'core/rendering/species-complete-models.js';
    if (cause) error.cause = cause;
    return error;
  }

  function waitForModels(timeoutMs = MODEL_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      let settled = false;

      const finish = callback => value => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      const resolveOnce = finish(resolve);
      const rejectOnce = finish(reject);

      const check = () => {
        const snapshot = validationSnapshot();
        if (snapshot.ready) return resolveOnce(snapshot);

        const patchError = window.NewCritterRuntimePatch?.report?.lastError;
        if (patchError) {
          return rejectOnce(modelFailure(`The complete critter model runtime failed: ${patchError}`));
        }

        if (performance.now() - started >= timeoutMs) {
          return rejectOnce(modelFailure('The complete critter and enemy models did not become ready before gameplay started.'));
        }
        setTimeout(check, 25);
      };

      const readiness = window.__CRITTER_ISSUE_62_READY__;
      if (readiness && typeof readiness.then === 'function') {
        Promise.resolve(readiness).catch(cause => {
          rejectOnce(modelFailure('The complete critter model runtime could not initialize.', cause));
        });
      }
      check();
    });
  }

  function failRuntimeNode(node, error) {
    console.error('[Critter Extraction] Gameplay blocked because complete models are unavailable.', error);
    node.dataset.modelRuntimeGate = 'failed';
    try {
      window.__CRITTER_BOOT__?.markFailed?.({
        code: error.code || 'CE-MODEL-BOOT-001',
        severity: 'fatal',
        system: 'models',
        stage: 'model-runtime-gate',
        message: error.message,
        nativeMessage: error.message,
        sourceRaw: error.sourceRaw || '',
        stack: error.stack || ''
      });
    } catch (_) { }

    const event = new Event('error');
    if (typeof node.onerror === 'function') node.onerror(event);
    else node.dispatchEvent?.(event);
  }

  function modelRuntimeGate(node) {
    const src = node?.tagName === 'SCRIPT' ? String(node.src || '') : '';
    if (this === document.head && RUNTIME_PATTERN.test(src) && !node.dataset.modelRuntimeGate) {
      const target = this;
      node.dataset.modelRuntimeGate = 'waiting';
      waitForModels().then(() => {
        node.dataset.modelRuntimeGate = 'ready';
        const latestAppend = HTMLHeadElement.prototype.appendChild;
        if (latestAppend !== modelRuntimeGate) return latestAppend.call(target, node);
        return previousAppend.call(target, node);
      }).catch(error => failRuntimeNode(node, error));
      return node;
    }
    return previousAppend.call(this, node);
  }

  HTMLHeadElement.prototype.appendChild = modelRuntimeGate;
  window.__CRITTER_MODEL_RUNTIME_GATE__ = Object.freeze({
    buildId: BUILD_ID,
    waitForModels,
    validationSnapshot
  });
})();

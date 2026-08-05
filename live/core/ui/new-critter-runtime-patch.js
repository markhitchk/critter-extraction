/* Harley's Studios — issue #62 live runtime species integration.
   Registers all 15 existing critters in the generated browser-game runtime
   and loads the shared model/save/UI bridge without editing testing or preview. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_RUNTIME_PATCH_V3__) return;
  window.__NEW_CRITTER_RUNTIME_PATCH_V3__ = true;

  const NativeBlob = window.Blob;
  if (typeof NativeBlob !== 'function') return;

  const MARKER = '__ISSUE_62_LIVE_SPECIES_RUNTIME_V3__';
  const CORE_ANCHOR = "redpanda:{name:'Red Panda',role:'Moon Tracker',body:'#bd5b3e',accent:'#f6e0c5',paw:'#f6e0c5',vest:'#77466b',asset:characterAsset('redpanda')}";
  const FALLBACK_APPEND = [
    "penguin:{name:'Penguin',role:'Frozen Explorer',body:'#26364b',accent:'#f4f7fb',paw:'#f4f7fb',vest:'#466b88',asset:characterAsset('penguin')}",
    "crow:{name:'Crow',role:'Shiny Collector',body:'#202430',accent:'#515a70',paw:'#303746',vest:'#4e5573',asset:characterAsset('crow')}",
    "frog:{name:'Frog',role:'Marsh Jumper',body:'#71b85a',accent:'#d6ee8e',paw:'#c7e991',vest:'#4f7961',asset:characterAsset('frog')}",
    "arcticfox:{name:'Arctic Fox',role:'Winter Pathfinder',body:'#eef5fb',accent:'#b9d4e8',paw:'#f9fcff',vest:'#67859a',asset:characterAsset('arcticfox')}",
    "capybara:{name:'Capybara',role:'Relaxed Support',body:'#ad7651',accent:'#6d4734',paw:'#d7ab84',vest:'#6a6353',asset:characterAsset('capybara')}",
    "axolotl:{name:'Axolotl',role:'Aquatic Scout',body:'#f1a9bd',accent:'#cf638f',paw:'#f5c7d4',vest:'#667ea4',asset:characterAsset('axolotl')}",
    "otter:{name:'Otter',role:'Cuddle Diver',body:'#765039',accent:'#d7aa7c',paw:'#d7aa7c',vest:'#386c78',asset:characterAsset('otter')}"
  ].join(',\n    ');

  const report = {
    attempted: 0,
    applied: 0,
    source: 'fallback',
    missingAnchor: 0,
    lastError: ''
  };

  function appendSource() {
    try {
      if (typeof window.CritterModelRuntime?.runtimeSpeciesAppendSource === 'function') {
        report.source = 'model-runtime';
        return window.CritterModelRuntime.runtimeSpeciesAppendSource();
      }

      const catalog = window.HARLEYS_GAME_ASSETS;
      if (catalog?.appearanceSpecies?.length && typeof catalog.getSpecies === 'function') {
        report.source = 'model-catalog';
        return catalog.appearanceSpecies.map(id => {
          const species = catalog.getSpecies(id, { allowPlanned: false });
          const q = value => JSON.stringify(String(value));
          return `${id}:{name:${q(species.name)},role:${q(species.role)},body:${q(species.colors.body)},accent:${q(species.colors.accent)},paw:${q(species.colors.paw)},vest:${q(species.colors.vest)},asset:characterAsset(${q(id)})}`;
        }).join(',\n    ');
      }
    } catch (error) {
      report.lastError = error?.message || String(error);
      console.warn('[Issue #62] Model catalog could not build runtime species definitions.', error);
    }

    report.source = 'fallback';
    return FALLBACK_APPEND;
  }

  function patchSource(source) {
    report.attempted += 1;
    let output = String(source || '');
    if (!output || output.includes(MARKER)) return output;
    if (!output.includes(CORE_ANCHOR)) {
      report.missingAnchor += 1;
      return output;
    }

    output = output.replace(CORE_ANCHOR, `${CORE_ANCHOR},\n    ${appendSource()}`);
    output += `\n/* ${MARKER} */\n`;
    report.applied += 1;
    return output;
  }

  function PatchedBlob(parts = [], options = {}) {
    let next = parts;
    try {
      const type = String(options?.type || '').toLowerCase();
      if (type.includes('javascript') && Array.isArray(parts) && parts.every(part => typeof part === 'string')) {
        const source = parts.join('');
        if (source.includes('const SPECIES') && source.includes(CORE_ANCHOR)) {
          next = [patchSource(source)];
        }
      }
    } catch (error) {
      report.lastError = error?.message || String(error);
      console.warn('[Issue #62] Live runtime registration could not inspect a script blob.', error);
    }
    return new NativeBlob(next, options);
  }

  Object.setPrototypeOf(PatchedBlob, NativeBlob);
  PatchedBlob.prototype = NativeBlob.prototype;
  Object.defineProperty(PatchedBlob, '__ISSUE_62_PATCHED_BLOB__', { value: true });
  window.Blob = PatchedBlob;

  function resolve(path) {
    return window.CritterPaths?.resolve?.(path) || `./${path}`;
  }

  function loadScript(id, path, callback) {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === 'true') callback?.();
      else if (callback) existing.addEventListener('load', callback, { once: true });
      return existing;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = resolve(path);
    script.async = false;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      callback?.();
    }, { once: true });
    script.addEventListener('error', () => {
      console.warn(`[Issue #62] Could not load ${path}.`);
    }, { once: true });
    document.head.appendChild(script);
    return script;
  }

  function loadRosterController() {
    loadScript(
      'issue-62-live-roster-loader',
      'core/ui/issue-62-live-roster.js?v=1.0.0'
    );
  }

  function loadModelRuntime(attempt = 0) {
    if (window.CritterModelRuntime) {
      loadRosterController();
      return;
    }
    if (!window.HARLEYS_GAME_ASSETS) {
      if (attempt < 200) setTimeout(() => loadModelRuntime(attempt + 1), 50);
      return;
    }
    loadScript(
      'issue-62-model-runtime-loader',
      'core/rendering/model-runtime.js?v=1.0.0',
      loadRosterController
    );
  }

  window.NewCritterRuntimePatch = Object.freeze({ patchSource, appendSource, report });
  window.CritterIssue62RuntimePatch = window.NewCritterRuntimePatch;
  loadModelRuntime();
})();

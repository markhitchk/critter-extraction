(() => {
  'use strict';

  const FASTBOOT_VERSION = '2026-08-03-fastboot-1';

  function scriptBase() {
    const current = document.currentScript && document.currentScript.src;
    if (current) return new URL('../../', current);
    return new URL('./', location.href);
  }

  function projectRoot() {
    if (location.protocol === 'file:') {
      const pathname = location.pathname.replace(/\\/g, '/');
      const markers = ['/core/', '/reset/', '/invite/', '/portable/'];
      for (const marker of markers) {
        const index = pathname.lastIndexOf(marker);
        if (index >= 0) return new URL('file://' + pathname.slice(0, index + 1));
      }
      return new URL('./', location.href);
    }
    return scriptBase();
  }

  function resolve(value = '') {
    return new URL(String(value).replace(/^\/+/, ''), projectRoot()).href;
  }

  function relative(value = '') {
    return resolve(value);
  }

  function addHint({ rel = 'preload', path, as, crossOrigin = '', priority = '' }) {
    if (!path || location.protocol === 'file:') return;
    const href = resolve(path);
    if ([...document.head.querySelectorAll('link[href]')].some(link => link.href === href)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (as) link.as = as;
    if (crossOrigin) link.crossOrigin = crossOrigin;
    if (priority && 'fetchPriority' in link) link.fetchPriority = priority;
    link.dataset.critterFastbootHint = 'true';
    document.head.appendChild(link);
  }

  window.CritterPaths = Object.freeze({ projectRoot, resolve, relative });
  window.__CRITTER_FASTBOOT_VERSION__ = FASTBOOT_VERSION;

  addHint({ path: `core/game/game-runtime.js?v=${FASTBOOT_VERSION}`, as: 'script', priority: 'high' });
  addHint({ path: `core/loader/live-patches.bundle.js?v=${FASTBOOT_VERSION}`, as: 'script', priority: 'high' });
  addHint({ path: `core/loader/game-loader-base.js?v=${FASTBOOT_VERSION}`, as: 'script' });
  addHint({ path: 'core/game/game-core.js?v=2026-08-03-main-menu-fix-1', as: 'fetch', crossOrigin: 'anonymous', priority: 'high' });
  addHint({ path: 'core/rewards/critter-codes.registry.js?v=2.0.0', as: 'script' });
  addHint({ path: 'core/rewards/critter-codes.js?v=2.0.0', as: 'script' });
  addHint({ path: 'assets/branding/HTG.png', as: 'image' });
})();

/*
 * Critter Codes game-core bridge.
 *
 * The production game core is loaded as text by the generated runtime. This
 * narrow fetch wrapper adds reward appearance hooks without forking the very
 * large generated game-core file. It never changes registry hashes or exposes
 * valid code strings.
 */
(() => {
  'use strict';
  if (window.__CRITTER_CODE_CORE_BRIDGE__) return;

  const nativeFetch = window.fetch.bind(window);
  const report = { attempted: false, applied: [], missing: [] };

  function replaceOnce(source, name, needle, replacement) {
    if (!source.includes(needle)) {
      report.missing.push(name);
      return source;
    }
    report.applied.push(name);
    return source.replace(needle, replacement);
  }

  function patchGameCore(source) {
    if (source.includes('__CRITTER_CODE_CORE_PATCHED__')) return source;
    report.attempted = true;
    let patched = source;

    patched = patched.replace(
      /species=ap\.species\|\|'puppy'/g,
      "species=window.CritterRewardRuntime?.modelBase?.(ap.species)||ap.species||'puppy'"
    );
    patched = patched.replace(
      /SPECIES\[ap\.species\]\|\|SPECIES\.puppy/g,
      "SPECIES[window.CritterRewardRuntime?.modelBase?.(ap.species)||ap.species]||SPECIES.puppy"
    );
    patched = patched.replace(
      /w=weaponFor\(p\)/g,
      "w=window.CritterRewardRuntime?.styledWeapon?.(p,weaponFor(p))||weaponFor(p)"
    );

    patched = replaceOnce(
      patched,
      'network reward loadout packet',
      "loadoutManifest:localLoadoutManifest(a)},a.displayName);",
      "loadoutManifest:localLoadoutManifest(a),equippedRewards:{...(a.equippedRewards||{})}},a.displayName);"
    );
    patched = replaceOnce(
      patched,
      'network profile reward fields',
      "return {displayName:safeText(profile.displayName||fallback,24)||fallback,username:",
      "return {equippedRewards:profile.equippedRewards&&typeof profile.equippedRewards==='object'?{...profile.equippedRewards}:{},displayName:safeText(profile.displayName||fallback,24)||fallback,username:"
    );
    patched = replaceOnce(
      patched,
      'player reward fields',
      "loadoutManifest: normalizeFairManifest(profile.loadoutManifest, loadoutId) }, invuln:",
      "loadoutManifest: normalizeFairManifest(profile.loadoutManifest, loadoutId), equippedRewards:{...(profile.equippedRewards||{})} }, invuln:"
    );
    patched = replaceOnce(
      patched,
      '3D reward cosmetics hook',
      "drawWeaponModel(p,baseY,frontX,frontZ,rightX,rightZ);drawAccessory(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ);",
      "drawWeaponModel(p,baseY,frontX,frontZ,rightX,rightZ);drawAccessory(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ);window.CritterRewardRuntime?.drawCritterExtras?.({renderer,p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ});"
    );
    patched = replaceOnce(
      patched,
      'world reward trail hook',
      "for(const fx of world.effects)drawEffect(fx);\n    renderer.end?.(); renderWorldLabels(cam);",
      "for(const fx of world.effects)drawEffect(fx);\n    window.CritterRewardRuntime?.drawWorldEffects?.({renderer,players,world,match,localPlayerId});\n    renderer.end?.(); renderWorldLabels(cam);"
    );
    patched = replaceOnce(
      patched,
      'reward extraction celebration hook',
      "if(success&&match.objectives){match.objectives.extracted=true;updateHUD();}",
      "if(success&&match.objectives){match.objectives.extracted=true;updateHUD();}window.CritterRewardRuntime?.onMatchEnd?.({success,reason,match,player:getLocalPlayer(),account:activeAccount()});"
    );

    const marker = `\n/* __CRITTER_CODE_CORE_PATCHED__ ${JSON.stringify(report.applied)} */\n`;
    return patched + marker;
  }

  window.fetch = async function critterCodesFetch(input, init) {
    const response = await nativeFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!/\/core\/game\/game-core\.js(?:[?#]|$)/.test(String(url))) return response;
      const source = await response.clone().text();
      const patched = patchGameCore(source);
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      return new Response(patched, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.warn('Critter Codes game integration could not patch the game core.', error);
      return response;
    }
  };

  window.__CRITTER_CODE_CORE_BRIDGE__ = Object.freeze({ report, patchGameCore });
})();

(() => {
  'use strict';
  if (document.getElementById('critter-system-ui-loader')) return;
  const script = document.createElement('script');
  script.id = 'critter-system-ui-loader';
  script.src = window.CritterPaths.resolve('core/ui/system-ui-refresh.js');
  script.async = false;
  script.dataset.optionalUi = 'true';
  script.addEventListener('error', () => console.warn('Critter Extraction UI refresh could not be loaded.'));
  document.head.appendChild(script);
})();

(() => {
  'use strict';
  if (document.getElementById('critter-codes-registry-loader')) return;
  const registry = document.createElement('script');
  registry.id = 'critter-codes-registry-loader';
  registry.src = window.CritterPaths.resolve('core/rewards/critter-codes.registry.js?v=2.0.0');
  registry.async = false;
  registry.addEventListener('load', () => {
    if (document.getElementById('critter-codes-loader')) return;
    const system = document.createElement('script');
    system.id = 'critter-codes-loader';
    system.src = window.CritterPaths.resolve('core/rewards/critter-codes.js?v=2.0.0');
    system.async = false;
    system.addEventListener('error', () => console.warn('Critter Codes interface could not be loaded.'));
    document.head.appendChild(system);
  });
  registry.addEventListener('error', () => console.warn('Critter Codes registry could not be loaded.'));
  document.head.appendChild(registry);
})();

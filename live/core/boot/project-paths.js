(() => {
  'use strict';

  const FASTBOOT_VERSION = '2026-08-03-fastboot-2';

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
  addHint({ path: 'core/rewards/critter-codes.js?v=2.0.2', as: 'script' });
  addHint({ path: 'assets/branding/HTG.png', as: 'image' });
})();

/* Integrate reward-owned models and cosmetics into the generated Fast Boot runtime. */
(() => {
  'use strict';
  if (window.__CRITTER_CODE_RUNTIME_INTERCEPTOR__) return;
  const nativeAppend = HTMLHeadElement.prototype.appendChild;
  const nativeFetch = window.fetch.bind(window);
  const report = { attempted:false, applied:[], missing:[] };

  function once(source, name, search, replacement) {
    if (!source.includes(search)) {
      report.missing.push(name);
      return source;
    }
    report.applied.push(name);
    return source.replace(search, replacement);
  }

  function patch(source) {
    report.attempted = true;
    let output = source;
    output = once(output, 'profile reward packet',
      "loadoutManifest:localLoadoutManifest(a)},a.displayName);",
      "loadoutManifest:localLoadoutManifest(a),equippedRewards:{...(a.equippedRewards||{})}},a.displayName);");
    output = once(output, 'network reward fields',
      "appearance:{species,bodyColor:String(appearance.bodyColor||SPECIES[species].body).slice(0,20),accentColor:String(appearance.accentColor||SPECIES[species].accent).slice(0,20),accessory:safeText(appearance.accessory||'none',20),eyeStyle:safeText(appearance.eyeStyle||'dot',20)},loadoutId,equippedWeaponId,equippedArmorId,loadoutManifest};",
      "appearance:{species,bodyColor:String(appearance.bodyColor||SPECIES[species].body).slice(0,20),accentColor:String(appearance.accentColor||SPECIES[species].accent).slice(0,20),accessory:safeText(appearance.accessory||'none',20),eyeStyle:safeText(appearance.eyeStyle||'dot',20),rewardCritterId:safeText(appearance.rewardCritterId||'',40)},equippedRewards:profile.equippedRewards&&typeof profile.equippedRewards==='object'?{...profile.equippedRewards}:{},loadoutId,equippedWeaponId,equippedArmorId,loadoutManifest};");
    output = once(output, 'player reward fields',
      "loadoutManifest: normalizeFairManifest(profile.loadoutManifest, loadoutId) }, invuln:",
      "loadoutManifest: normalizeFairManifest(profile.loadoutManifest, loadoutId), equippedRewards:{...(profile.equippedRewards||{})} }, invuln:");
    output = once(output, 'third person cosmetics',
      "drawWeaponModel(p,baseY,frontX,frontZ,rightX,rightZ);drawAccessory(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ);",
      "drawWeaponModel(p,baseY,frontX,frontZ,rightX,rightZ);drawAccessory(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ);window.CritterRewardRuntime?.drawCritterExtras?.({renderer,p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ});");
    const weaponMatches = (output.match(/const w=weaponFor\(p\),/g) || []).length;
    if (weaponMatches) {
      output = output.replace(/const w=weaponFor\(p\),/g, "const w=window.CritterRewardRuntime?.styledWeapon?.(p,weaponFor(p))||weaponFor(p),");
      report.applied.push(`weapon wraps:${weaponMatches}`);
    } else report.missing.push('weapon wraps');
    output = once(output, 'world reward trails',
      "for(const fx of world.effects)drawEffect(fx);\n    renderer.end?.(); renderWorldLabels(cam);",
      "for(const fx of world.effects)drawEffect(fx);\n    window.CritterRewardRuntime?.drawWorldEffects?.({renderer,players,world,match,localPlayerId});\n    renderer.end?.(); renderWorldLabels(cam);");
    output = once(output, 'extraction reward effect',
      "if(success&&match.objectives){match.objectives.extracted=true;updateHUD();}\n    match.ended = true;",
      "if(success&&match.objectives){match.objectives.extracted=true;updateHUD();}window.CritterRewardRuntime?.onMatchEnd?.({success,reason,match,player:getLocalPlayer(),account:activeAccount()});\n    match.ended = true;");
    output = once(output, 'reward nameplates',
      "node.querySelector('.world-label-name').textContent=p.profile?.displayName||p.id;",
      "node.querySelector('.world-label-name').textContent=window.CritterRewardRuntime?.displayName?.(p.profile)||p.profile?.displayName||p.id;");
    output += `\n/* __CRITTER_CODES_RUNTIME_PATCH__ ${JSON.stringify(report.applied)} */\n`;
    return output;
  }

  HTMLHeadElement.prototype.appendChild = function critterCodesAppend(node) {
    const src = node?.tagName === 'SCRIPT' ? String(node.src || '') : '';
    if (this === document.head && /\/core\/game\/game-runtime\.js(?:[?#]|$)/.test(src) && !node.dataset.critterCodesPatched && location.protocol !== 'file:') {
      const original = src;
      node.dataset.critterCodesPatched = 'loading';
      nativeFetch(original, { cache:'no-store' }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      }).then(source => {
        const blobUrl = URL.createObjectURL(new Blob([patch(source)], { type:'text/javascript' }));
        node.src = blobUrl;
        node.dataset.critterCodesPatched = 'true';
        node.addEventListener('load', () => URL.revokeObjectURL(blobUrl), { once:true });
        nativeAppend.call(document.head, node);
      }).catch(error => {
        console.warn('Critter Codes could not patch the generated game runtime; loading the original runtime.', error);
        node.src = original;
        node.dataset.critterCodesPatched = 'fallback';
        nativeAppend.call(document.head, node);
      });
      return node;
    }
    return nativeAppend.call(this, node);
  };

  window.__CRITTER_CODE_RUNTIME_INTERCEPTOR__ = Object.freeze({ report, patch });
  window.__CRITTER_CODE_CORE_BRIDGE__ = Object.freeze({ report, patchGameCore: patch });
})();

(() => {
  'use strict';
  if (document.getElementById('critter-system-ui-loader')) return;
  const script = document.createElement('script');
  script.id = 'critter-system-ui-loader';
  script.src = window.CritterPaths.resolve('core/ui/system-ui-refresh.js?v=2026-08-03-lobby-utilities-2');
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
    system.src = window.CritterPaths.resolve('core/rewards/critter-codes.js?v=2.0.2');
    system.async = false;
    system.addEventListener('error', () => console.warn('Critter Codes interface could not be loaded.'));
    document.head.appendChild(system);
  });
  registry.addEventListener('error', () => console.warn('Critter Codes registry could not be loaded.'));
  document.head.appendChild(registry);
})();

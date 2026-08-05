/* Harley's Studios — issue #62 generated-runtime integration for all 39 critters. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_RUNTIME_PATCH_V4__) return;
  window.__NEW_CRITTER_RUNTIME_PATCH_V4__ = true;

  const NativeBlob = window.Blob;
  if (typeof NativeBlob !== 'function') return;

  const MARKER = '__ISSUE_62_ALL_39_RUNTIME_V4__';
  const CORE_IDS = new Set(['puppy','bunny','kitty','fox','panda','bear','raccoon','redpanda']);
  const CORE_ANCHOR = "redpanda:{name:'Red Panda',role:'Moon Tracker',body:'#bd5b3e',accent:'#f6e0c5',paw:'#f6e0c5',vest:'#77466b',asset:characterAsset('redpanda')}";
  const DRAW_CHAIN = "drawSpeciesFeatures(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ,dark,paw);drawSpeciesMarkings(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ,paw);drawWeaponModel(p,baseY,frontX,frontZ,rightX,rightZ);drawAccessory(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ);";
  const DRAW_CHAIN_PATCHED = "drawSpeciesFeatures(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ,dark,paw);drawSpeciesMarkings(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ,paw);window.CritterSpeciesModels?.drawThirdPerson?.({renderer,p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ,dark,paw});drawWeaponModel(p,baseY,frontX,frontZ,rightX,rightZ);(window.CritterSpeciesModels?.drawAccessory?.({renderer,p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ})||drawAccessory(p,ap,baseY,rightX,rightZ,frontX,frontZ,backX,backZ));";
  const HEAD_PROFILE = "headWide=species==='bear'?1.20:species==='bunny'?.96:species==='fox'||species==='redpanda'?1.03:1.10,headTall=species==='bunny'?1.04:species==='bear'?.94:.98,headDeep=species==='fox'||species==='redpanda'?.92:.96;";
  const HEAD_PROFILE_PATCHED = "modelShape=window.CritterSpeciesModels?.proportions?.(species)||{},headWide=modelShape.headWide||(species==='bear'?1.20:species==='bunny'?.96:species==='fox'||species==='redpanda'?1.03:1.10),headTall=modelShape.headTall||(species==='bunny'?1.04:species==='bear'?.94:.98),headDeep=modelShape.headDeep||(species==='fox'||species==='redpanda'?.92:.96);";
  const FIRST_PERSON_PROFILE = "armColor=species==='panda'||species==='raccoon'?accent:body,pawMesh=species==='bunny'?'capsule':'sphere',pawW=species==='bear'?.26:species==='bunny'?.20:.22,pawH=species==='bunny'?.25:species==='bear'?.21:.18;";
  const FIRST_PERSON_PROFILE_PATCHED = "fpModel=window.CritterSpeciesModels?.firstPersonProfile?.(species)||{},armColor=fpModel.armColor||(species==='panda'||species==='raccoon'?accent:body),pawMesh=fpModel.pawMesh||(species==='bunny'?'capsule':'sphere'),pawW=fpModel.pawW||(species==='bear'?.26:species==='bunny'?.20:.22),pawH=fpModel.pawH||(species==='bunny'?.25:species==='bear'?.21:.18);";
  const FIRST_PERSON_PART = "const part=(fo,ri,up,sx,sy,sz,color,rz=0,mesh='cube',em=0)=>{";
  const FIRST_PERSON_PART_PATCHED = "window.CritterSpeciesModels?.drawFirstPerson?.({renderer,p,ap,speciesStyle,cam,f,r,u,point,leftPaw,rightPaw});const part=(fo,ri,up,sx,sy,sz,color,rz=0,mesh='cube',em=0)=>{";

  const report = { attempted:0, applied:0, source:'catalog', replacements:[], missing:[], lastError:'' };

  const quote = value => JSON.stringify(String(value));
  function speciesSource(id) {
    const entry = window.CritterModelRuntime?.runtimeDefinition?.(id) || window.HARLEYS_GAME_ASSETS?.getSpecies?.(id);
    if (!entry) return '';
    const colors = entry.colors || entry;
    return `${id}:{name:${quote(entry.name)},role:${quote(entry.role)},body:${quote(colors.body)},accent:${quote(colors.accent)},paw:${quote(colors.paw)},vest:${quote(colors.vest)},asset:characterAsset(${quote(id)})}`;
  }

  function appendSource() {
    try {
      if (typeof window.CritterModelRuntime?.runtimeSpeciesAppendSource === 'function') {
        report.source = 'model-runtime';
        return window.CritterModelRuntime.runtimeSpeciesAppendSource();
      }
      const catalog = window.HARLEYS_GAME_ASSETS;
      if (catalog?.speciesOrder?.length === 39) {
        report.source = 'model-catalog';
        return catalog.speciesOrder.filter(id => !CORE_IDS.has(id)).map(speciesSource).filter(Boolean).join(',\n    ');
      }
    } catch (error) {
      report.lastError = error?.message || String(error);
    }
    report.source = 'missing';
    return '';
  }

  function once(source, name, search, replacement) {
    if (!source.includes(search)) {
      report.missing.push(name);
      return source;
    }
    report.replacements.push(name);
    return source.replace(search, replacement);
  }

  function patchSource(source) {
    report.attempted += 1;
    let output = String(source || '');
    if (!output || output.includes(MARKER)) return output;

    const additional = appendSource();
    if (additional) output = once(output, '39 species database', CORE_ANCHOR, `${CORE_ANCHOR},\n    ${additional}`);
    else report.missing.push('39 species database source');

    output = once(output, 'species proportions', HEAD_PROFILE, HEAD_PROFILE_PATCHED);
    output = once(output, 'third-person species recipes', DRAW_CHAIN, DRAW_CHAIN_PATCHED);
    output = once(output, 'first-person profile', FIRST_PERSON_PROFILE, FIRST_PERSON_PROFILE_PATCHED);
    output = once(output, 'first-person species details', FIRST_PERSON_PART, FIRST_PERSON_PART_PATCHED);
    output += `\n/* ${MARKER} ${JSON.stringify(report.replacements)} */\n`;
    report.applied += 1;
    return output;
  }

  function PatchedBlob(parts = [], options = {}) {
    let next = parts;
    try {
      const type = String(options?.type || '').toLowerCase();
      if (type.includes('javascript') && Array.isArray(parts) && parts.every(part => typeof part === 'string')) {
        const source = parts.join('');
        if (source.includes('const SPECIES') && source.includes(CORE_ANCHOR)) next = [patchSource(source)];
      }
    } catch (error) {
      report.lastError = error?.message || String(error);
      console.warn('[Issue #62] Could not inspect the generated runtime Blob.', error);
    }
    return new NativeBlob(next, options);
  }

  Object.setPrototypeOf(PatchedBlob, NativeBlob);
  PatchedBlob.prototype = NativeBlob.prototype;
  Object.defineProperty(PatchedBlob, '__ISSUE_62_PATCHED_BLOB__', { value:true });
  window.Blob = PatchedBlob;

  const resolve = path => window.CritterPaths?.resolve?.(path) || `./${path}`;
  function loadScript(id, path) {
    return new Promise((resolvePromise, rejectPromise) => {
      const existing = document.getElementById(id);
      if (existing?.dataset.loaded === 'true') return resolvePromise(existing);
      if (existing) {
        existing.addEventListener('load', () => resolvePromise(existing), { once:true });
        existing.addEventListener('error', rejectPromise, { once:true });
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = resolve(path);
      script.async = false;
      script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolvePromise(script); }, { once:true });
      script.addEventListener('error', () => rejectPromise(new Error(`Could not load ${path}.`)), { once:true });
      document.head.appendChild(script);
    });
  }

  window.__CRITTER_ISSUE_62_READY__ = (async () => {
    try {
      await loadScript('issue-62-species-models-loader', 'core/rendering/species-models.js?v=1.0.0-all-39');
      await loadScript('issue-62-model-runtime-loader', 'core/rendering/model-runtime.js?v=2.0.0-all-39');
      await loadScript('issue-62-live-roster-loader', 'core/ui/issue-62-live-roster.js?v=2.0.0-all-39');
      return true;
    } catch (error) {
      report.lastError = error?.message || String(error);
      console.error('[Issue #62] Required all-39 model integration failed.', error);
      throw error;
    }
  })();

  window.NewCritterRuntimePatch = Object.freeze({ patchSource, appendSource, report });
  window.CritterIssue62RuntimePatch = window.NewCritterRuntimePatch;
})();

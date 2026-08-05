/* Harley's Studios — issue #62 generated-runtime integration for all 39 critters. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_RUNTIME_PATCH_V6__) return;
  window.__NEW_CRITTER_RUNTIME_PATCH_V6__ = true;

  const NativeBlob = window.Blob;
  if (typeof NativeBlob !== 'function') return;

  const MARKER = '__ISSUE_62_ALL_39_RUNTIME_V6__';
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

  const report = {
    attempted:0,
    applied:0,
    source:'catalog',
    replacements:[],
    missing:[],
    delayedRuntime:false,
    directRuntime:false,
    lastVerification:null,
    lastError:''
  };
  const quote = value => JSON.stringify(String(value));

  function speciesSource(id) {
    const entry = window.CritterModelRuntime?.runtimeDefinition?.(id) || window.HARLEYS_GAME_ASSETS?.getSpecies?.(id);
    if (!entry) return '';
    const colors = entry.colors || entry;
    return `${id}:{name:${quote(entry.name)},role:${quote(entry.role)},body:${quote(colors.body)},accent:${quote(colors.accent)},paw:${quote(colors.paw)},vest:${quote(colors.vest)},asset:characterAsset(${quote(id)})}`;
  }

  function additionalIds() {
    const ids = window.CritterModelRuntime?.additionalRuntimeIds;
    if (Array.isArray(ids) && ids.length) return ids;
    const order = window.HARLEYS_GAME_ASSETS?.speciesOrder;
    return Array.isArray(order) ? order.filter(id => !CORE_IDS.has(id)) : [];
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

  function markApplied(name) {
    if (!report.replacements.includes(name)) report.replacements.push(name);
  }

  function markMissing(name) {
    if (!report.missing.includes(name)) report.missing.push(name);
  }

  function once(source, name, search, replacement) {
    if (source.includes(replacement)) {
      markApplied(`${name}:already`);
      return source;
    }
    if (!source.includes(search)) {
      markMissing(name);
      return source;
    }
    markApplied(name);
    return source.replace(search, replacement);
  }

  function injectSpeciesDatabase(source, additional) {
    const ids = additionalIds();
    if (ids.length && ids.every(id => source.includes(`${id}:{`))) {
      markApplied('39 species database:already');
      return source;
    }
    if (!additional) {
      markMissing('39 species database source');
      return source;
    }
    if (source.includes(CORE_ANCHOR)) {
      markApplied('39 species database');
      return source.replace(CORE_ANCHOR, `${CORE_ANCHOR},\n    ${additional}`);
    }

    const start = source.indexOf('const SPECIES={');
    const end = start >= 0 ? source.indexOf('};', start) : -1;
    const block = start >= 0 && end > start ? source.slice(start, end) : '';
    if (start < 0 || end < 0 || !block.includes("puppy:{") || !block.includes("redpanda:{")) {
      markMissing('39 species database');
      return source;
    }
    markApplied('39 species database:fallback');
    return `${source.slice(0,end)},\n    ${additional}${source.slice(end)}`;
  }

  function verification(source) {
    const text = String(source || '');
    const missing = [];
    for (const id of additionalIds()) if (!text.includes(`${id}:{`)) missing.push(`species:${id}`);
    if (!text.includes('CritterSpeciesModels?.drawThirdPerson')) missing.push('third-person hook');
    if (!text.includes('CritterSpeciesModels?.drawFirstPerson')) missing.push('first-person hook');
    if (!text.includes('modelShape=window.CritterSpeciesModels?.proportions')) missing.push('species proportions');
    if (!text.includes(MARKER)) missing.push('runtime marker');
    return Object.freeze({ complete:missing.length === 0, missing:Object.freeze(missing) });
  }

  function assertPatchedSource(source) {
    const result = verification(source);
    report.lastVerification = result;
    if (!result.complete) {
      const error = new Error(`All-39 runtime patch incomplete: ${result.missing.join(', ')}`);
      error.name = 'CritterModelPatchError';
      report.lastError = error.message;
      throw error;
    }
    return source;
  }

  function patchSource(source) {
    report.attempted += 1;
    report.replacements = [];
    report.missing = [];
    let output = String(source || '');
    if (!output) return output;
    if (output.includes(MARKER)) {
      report.lastVerification = verification(output);
      return output;
    }
    output = injectSpeciesDatabase(output, appendSource());
    output = once(output,'species proportions',HEAD_PROFILE,HEAD_PROFILE_PATCHED);
    output = once(output,'third-person species recipes',DRAW_CHAIN,DRAW_CHAIN_PATCHED);
    output = once(output,'first-person profile',FIRST_PERSON_PROFILE,FIRST_PERSON_PROFILE_PATCHED);
    output = once(output,'first-person species details',FIRST_PERSON_PART,FIRST_PERSON_PART_PATCHED);
    output += `\n/* ${MARKER} ${JSON.stringify(report.replacements)} */\n`;
    report.applied += 1;
    report.lastVerification = verification(output);
    return output;
  }

  function PatchedBlob(parts = [], options = {}) {
    let next = parts;
    try {
      const type = String(options?.type || '').toLowerCase();
      if (type.includes('javascript') && Array.isArray(parts) && parts.every(part => typeof part === 'string')) {
        const source = parts.join('');
        if (source.includes('const SPECIES')) next = [assertPatchedSource(patchSource(source))];
      }
    } catch (error) {
      report.lastError = error?.message || String(error);
      console.error('[Issue #62] Generated runtime model patch failed.',error);
    }
    return new NativeBlob(next,options);
  }

  Object.setPrototypeOf(PatchedBlob,NativeBlob);
  PatchedBlob.prototype = NativeBlob.prototype;
  Object.defineProperty(PatchedBlob,'__ISSUE_62_PATCHED_BLOB__',{ value:true });
  window.Blob = PatchedBlob;

  const resolve = path => window.CritterPaths?.resolve?.(path) || `./${path}`;
  function loadScript(id,path,required=true) {
    return new Promise((resolvePromise,rejectPromise) => {
      const existing = document.getElementById(id);
      if (existing?.dataset.loaded === 'true') return resolvePromise(existing);
      if (existing) {
        existing.addEventListener('load',() => resolvePromise(existing),{ once:true });
        existing.addEventListener('error',event => required ? rejectPromise(event) : resolvePromise(null),{ once:true });
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = resolve(path);
      script.async = false;
      script.addEventListener('load',() => { script.dataset.loaded='true'; resolvePromise(script); },{ once:true });
      script.addEventListener('error',() => required ? rejectPromise(new Error(`Could not load ${path}.`)) : resolvePromise(null),{ once:true });
      document.head.appendChild(script);
    });
  }

  window.__CRITTER_ISSUE_62_READY__ = (async () => {
    try {
      await loadScript('issue-62-species-models-loader','core/rendering/species-models.js?v=1.1.0-distinct-39');
      await loadScript('issue-62-model-runtime-loader','core/rendering/model-runtime.js?v=2.1.0-distinct-39');
      await loadScript('issue-62-live-roster-loader','core/ui/issue-62-live-roster.js?v=2.1.0-distinct-39');
      await loadScript('issue-62-live-copy-loader','core/ui/issue-62-live-copy.js?v=1.1.0-distinct-39');
      await loadScript('critter-codes-otter-loader','core/rewards/critter-codes-otter.js?v=1.0.0',false);
      return true;
    } catch (error) {
      report.lastError = error?.message || String(error);
      console.error('[Issue #62] Required all-39 model integration failed.',error);
      throw error;
    }
  })();

  const appendBeforeIssue62Delay = HTMLHeadElement.prototype.appendChild;
  HTMLHeadElement.prototype.appendChild = function issue62Append(node) {
    const src = node?.tagName === 'SCRIPT' ? String(node.src || '') : '';
    if (this === document.head && /\/core\/game\/game-runtime\.js(?:[?#]|$)/.test(src) && !node.dataset.issue62Ready && location.protocol !== 'file:') {
      const target = this;
      const original = src;
      node.dataset.issue62Ready = 'waiting';
      report.delayedRuntime = true;
      window.__CRITTER_ISSUE_62_READY__.then(async () => {
        const response = await fetch(original,{ cache:'no-store' });
        if (!response.ok) throw new Error(`Could not load generated game runtime: HTTP ${response.status}`);
        const baseSource = await response.text();
        const rewardSource = window.__CRITTER_CODE_RUNTIME_INTERCEPTOR__?.patch?.(baseSource) || baseSource;
        const modeledSource = assertPatchedSource(patchSource(rewardSource));
        const blobUrl = URL.createObjectURL(new NativeBlob([modeledSource],{ type:'text/javascript' }));
        node.src = blobUrl;
        node.dataset.issue62Ready = 'true';
        node.dataset.critterCodesPatched = 'true';
        report.directRuntime = true;
        node.addEventListener('load',() => URL.revokeObjectURL(blobUrl),{ once:true });
        node.addEventListener('error',() => URL.revokeObjectURL(blobUrl),{ once:true });
        appendBeforeIssue62Delay.call(target,node);
      }).catch(error => {
        report.lastError = error?.message || String(error);
        node.dataset.issue62Ready = 'failed';
        console.error('[Issue #62] Direct all-39 runtime build failed; trying the compatibility path.',error);
        node.src = original;
        appendBeforeIssue62Delay.call(target,node);
      });
      return node;
    }
    if (this === document.head && /\/core\/game\/game-runtime\.js(?:[?#]|$)/.test(src) && !node.dataset.issue62Ready) {
      const target = this;
      node.dataset.issue62Ready = 'waiting';
      report.delayedRuntime = true;
      window.__CRITTER_ISSUE_62_READY__.then(() => {
        node.dataset.issue62Ready = 'true';
        appendBeforeIssue62Delay.call(target,node);
      }).catch(error => {
        report.lastError = error?.message || String(error);
        node.dataset.issue62Ready = 'failed';
        appendBeforeIssue62Delay.call(target,node);
      });
      return node;
    }
    return appendBeforeIssue62Delay.call(this,node);
  };

  window.NewCritterRuntimePatch = Object.freeze({ patchSource, appendSource, verification, assertPatchedSource, report });
  window.CritterIssue62RuntimePatch = window.NewCritterRuntimePatch;
})();

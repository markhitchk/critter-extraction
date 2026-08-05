(() => {
  'use strict';

  window.CritterBuildInfo = Object.freeze({ buildId: '3391f2959d123859', channel: 'github-pages', generatedAt: '2026-08-05T03:50:19.284Z' });
  const BUILD_ID = window.CritterBuildInfo.buildId;

  /*
   * Complete critter/item models use a real leaf primitive for weapon details,
   * Moonberry foliage, and environment decoration. Install that primitive in
   * both renderers before the generated game runtime executes. This is native
   * model support, not a substitute shape: WebGL receives indexed 3D geometry
   * and the Canvas renderer receives its own leaf path and center vein.
   */
  if (!window.__CRITTER_RENDERER_LEAF_MESH__) {
    const NativeBlob = window.Blob;
    const leafReport = { attempted: 0, applied: 0, missing: [], lastError: '' };
    const MARKER = '__CRITTER_RENDERER_LEAF_MESH__';
    const CRYSTAL_BUILDER = 'function makeCrystalData(sides=6) {';
    const MESH_REGISTRY = 'this.meshes={cube:this.makeMesh(makeCubeData()),wedge:this.makeMesh(makeWedgeData())};';
    const MESH_REGISTRY_WITH_LEAF = 'this.meshes={cube:this.makeMesh(makeCubeData()),wedge:this.makeMesh(makeWedgeData()),leaf:this.makeMesh(makeLeafData())};';
    const WEBGL_LOOKUP = "fixed=meshName==='cube'||meshName==='wedge',mesh=this.meshes[fixed?meshName:`${meshName}_${profile.key}`];";
    const WEBGL_LOOKUP_WITH_LEAF = "fixed=meshName==='cube'||meshName==='wedge'||meshName==='leaf',mesh=this.meshes[fixed?meshName:`${meshName}_${profile.key}`];";
    const CANVAS_CRYSTAL = "else if(o.mesh==='crystal'){";
    const LEAF_BUILDER = `function makeLeafData() {
    const p=[],n=[],idx=[];
    const add=(a,b,c)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1,k=p.length/3;p.push(...a,...b,...c);for(let i=0;i<3;i++)n.push(nx/l,ny/l,nz/l);idx.push(k,k+1,k+2);};
    const top=[0,.5,0],right=[.5,0,0],bottom=[0,-.5,0],left=[-.5,0,0],front=[0,0,.12],back=[0,0,-.12];
    add(front,top,right);add(front,right,bottom);add(front,bottom,left);add(front,left,top);
    add(back,right,top);add(back,bottom,right);add(back,left,bottom);add(back,top,left);
    return {p,n,idx};
  }`;
    const CANVAS_LEAF = `else if(o.mesh==='leaf'){c.save();c.translate(o.p.x,o.p.y);c.rotate(-o.ry*.18+(o.rz||0));c.beginPath();c.moveTo(0,-h*.5);c.quadraticCurveTo(w*.55,-h*.10,0,h*.5);c.quadraticCurveTo(-w*.55,-h*.10,0,-h*.5);c.closePath();c.fill();c.stroke();c.globalAlpha=Math.max(.16,alpha*.42);c.beginPath();c.moveTo(0,-h*.42);c.lineTo(0,h*.42);c.stroke();c.restore();c.globalAlpha=Math.max(.08,alpha);}`;

    function replaceRequired(source, search, replacement, name) {
      if (source.includes(replacement)) return source;
      if (!source.includes(search)) {
        leafReport.missing.push(name);
        return source;
      }
      return source.replace(search, replacement);
    }

    function patchRendererSource(source) {
      const text = String(source || '');
      if (!text.includes('class Renderer')) return text;
      leafReport.attempted += 1;
      leafReport.missing = [];
      if (text.includes(MARKER)) return text;

      let output = text;
      output = replaceRequired(output, CRYSTAL_BUILDER, `${LEAF_BUILDER}\n  ${CRYSTAL_BUILDER}`, 'WebGL leaf geometry');
      output = replaceRequired(output, MESH_REGISTRY, MESH_REGISTRY_WITH_LEAF, 'WebGL leaf registration');
      output = replaceRequired(output, WEBGL_LOOKUP, WEBGL_LOOKUP_WITH_LEAF, 'WebGL leaf lookup');
      output = replaceRequired(output, CANVAS_CRYSTAL, `${CANVAS_LEAF}${CANVAS_CRYSTAL}`, 'Canvas leaf drawing');

      if (leafReport.missing.length) {
        leafReport.lastError = `Renderer leaf integration incomplete: ${leafReport.missing.join(', ')}`;
        return `throw Object.assign(new Error(${JSON.stringify(leafReport.lastError)}),{name:'CritterRendererMeshError',code:'CE-RENDER-MESH-001'});\n${output}`;
      }

      leafReport.applied += 1;
      leafReport.lastError = '';
      return `${output}\n/* ${MARKER} */\n`;
    }

    if (typeof NativeBlob === 'function') {
      function RendererLeafBlob(parts = [], options = {}) {
        let next = parts;
        try {
          const type = String(options?.type || '').toLowerCase();
          if (type.includes('javascript') && Array.isArray(parts) && parts.every(part => typeof part === 'string')) {
            next = [patchRendererSource(parts.join(''))];
          }
        } catch (error) {
          leafReport.lastError = error?.message || String(error);
          console.error('[Critter Extraction] Native leaf mesh integration failed.', error);
          throw error;
        }
        return new NativeBlob(next, options);
      }
      Object.setPrototypeOf(RendererLeafBlob, NativeBlob);
      RendererLeafBlob.prototype = NativeBlob.prototype;
      Object.defineProperty(RendererLeafBlob, MARKER, { value: true });
      window.Blob = RendererLeafBlob;
    }

    window.__CRITTER_RENDERER_LEAF_MESH__ = Object.freeze({
      buildId: BUILD_ID,
      patchSource: patchRendererSource,
      report: leafReport
    });
  }

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
        window.__CRITTER_RENDERER_LEAF_MESH__ &&
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

(() => {
  'use strict';

  const BASE_LOADER_URL = './core/loader/game-loader-base.js?v=2026-08-03-live-network-fix';
  const nativeFetch = window.fetch.bind(window);
  const patches = [
    {
      name: 'preserve queued co-op mouse shots',
      find: String.raw`fire:!!msg.fire,fireQueued:shot.advanced?1:0,shotSeq:shot.value`,
      replace: String.raw`fire:!!msg.fire,fireQueued:Math.min(4,(guestInputs[sourceId]?.fireQueued||0)+(shot.advanced?1:0)),shotSeq:shot.value`
    },
    {
      name: 'smooth local guest snapshot reconciliation',
      find: String.raw`const p=players[id],keepLook=id===localPlayerId?{yaw:p.yaw,pitch:p.pitch}:null;Object.assign(p,data);if(keepLook){p.yaw=keepLook.yaw;p.pitch=keepLook.pitch;}`,
      replace: String.raw`const p=players[id],keepLocal=id===localPlayerId?{x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,velocityY:p.velocityY,grounded:p.grounded}:null;Object.assign(p,data);if(keepLocal){const ax=Number.isFinite(Number(data.x))?Number(data.x):keepLocal.x,ay=Number.isFinite(Number(data.y))?Number(data.y):keepLocal.y,az=Number.isFinite(Number(data.z))?Number(data.z):keepLocal.z,error=Math.hypot(ax-keepLocal.x,az-keepLocal.z);if(error<3.5){p.x=lerp(keepLocal.x,ax,.18);p.y=lerp(keepLocal.y,ay,.25);p.z=lerp(keepLocal.z,az,.18);p.velocityY=keepLocal.velocityY;p.grounded=keepLocal.grounded;}p.yaw=keepLocal.yaw;p.pitch=keepLocal.pitch;}`
    }
  ];

  function patchRequired(source, patch) {
    const first = source.indexOf(patch.find);
    if (first < 0) throw new Error(`Live patch target missing: ${patch.name}`);
    if (source.indexOf(patch.find, first + patch.find.length) >= 0) {
      throw new Error(`Live patch target is ambiguous: ${patch.name}`);
    }
    return source.slice(0, first) + patch.replace + source.slice(first + patch.find.length);
  }

  window.fetch = function patchedFetch(input, init) {
    const requestUrl = typeof input === 'string' ? input : String(input?.url || '');
    const responsePromise = nativeFetch(input, init);
    if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(requestUrl)) return responsePromise;

    return responsePromise.then(async response => {
      if (!response.ok) return response;
      let source = await response.text();
      for (const patch of patches) source = patchRequired(source, patch);
      return new Response(source, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    });
  };

  const baseScript = document.createElement('script');
  baseScript.src = BASE_LOADER_URL;
  baseScript.onload = () => { window.fetch = nativeFetch; };
  baseScript.onerror = () => {
    window.fetch = nativeFetch;
    const error = new Error('The live base loader could not be loaded');
    console.error('Critter Extraction live network hotfix failed', error);
    window.__critterBootReport?.('failure', error.message);
  };
  document.head.appendChild(baseScript);
})();

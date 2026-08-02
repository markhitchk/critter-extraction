(() => {
  'use strict';

  const upstreamFetch = window.fetch.bind(window);
  const PEA_LODS = Object.freeze({
    high: './assets/models/weapons/pea_popper/pea_popper_lod0.glb',
    medium: './assets/models/weapons/pea_popper/pea_popper_lod1.glb',
    low: './assets/models/weapons/pea_popper/pea_popper_lod2.glb'
  });

  function replaceRequired(source, find, replacement, label) {
    if (!source.includes(find)) {
      console.warn(`High-end LOD patch skipped: ${label}`);
      return source;
    }
    return source.replace(find, replacement);
  }

  function patchLodSource(source) {
    const originalInstall = "if(rendererMode==='webgl')window.HarleyHighEndRuntime?.install(renderer).then(({loaded})=>{if(loaded&&dom.rendererBadge)dom.rendererBadge.textContent=`WEBGL • ${graphicsProfile().label} • ${loaded} AUTHORED ASSETS`;});";
    const lodInstall = "if(rendererMode==='webgl')window.HarleyHighEndRuntime?.install(renderer).then(async({loaded})=>{const profile=graphicsProfile(),compat=!!activeAccount().settings.compatibilityMode,tier=compat||profile.key==='low'?'low':profile.key==='medium'?'medium':'high',path=window.HarleyHighEndLodPatches?.peaLods?.[tier];try{if(tier!=='high'&&path){const parts=await window.HarleyHighEndRuntime.loadAsset('weapon.pea_popper.'+tier,path);renderer.installAuthoredGroup('weapon.pea_popper',parts);}document.documentElement.dataset.peaPopperLod=tier;if(loaded&&dom.rendererBadge)dom.rendererBadge.textContent=`WEBGL • ${profile.label} • ${loaded} AUTHORED ASSETS • PEA ${tier.toUpperCase()}`;}catch(error){console.warn('Pea Popper LOD selection failed; keeping LOD0',error);document.documentElement.dataset.peaPopperLod='high-fallback';if(loaded&&dom.rendererBadge)dom.rendererBadge.textContent=`WEBGL • ${profile.label} • ${loaded} AUTHORED ASSETS`;}});";
    return replaceRequired(source, originalInstall, lodInstall, 'Pea Popper quality-tier selection');
  }

  window.fetch = async function(input, init) {
    const response = await upstreamFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(url)) return response;
    const source = patchLodSource(await response.text());
    return new Response(source, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.HarleyHighEndLodPatches = Object.freeze({
    peaLods: PEA_LODS,
    patchLodSource
  });
})();

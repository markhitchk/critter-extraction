(() => {
  'use strict';

  const upstreamFetch = window.fetch.bind(window);
  const ROCK_ID = 'rock.pine_valley_cover';
  const ROCK_URL = './assets/models/rocks/pine_valley_rock/pine_valley_rock_lod0.glb';

  function replaceRequired(source, find, replacement, label) {
    if (!source.includes(find)) {
      console.warn(`High-end rock patch skipped: ${label}`);
      return source;
    }
    return source.replace(find, replacement);
  }

  function patchRockSource(source) {
    const rendererReady = '  document.documentElement.dataset.renderer = rendererMode;';
    const loadRock = `  if(rendererMode==='webgl')window.HarleyHighEndRuntime?.loadAsset('${ROCK_ID}','${ROCK_URL}').then(parts=>{renderer.installAuthoredGroup?.('${ROCK_ID}',parts);document.documentElement.dataset.authoredRocks='ready';}).catch(error=>{console.warn('Authored Pine Valley rock unavailable',error);document.documentElement.dataset.authoredRocks='fallback';});\n\n${rendererReady}`;
    source = replaceRequired(source, rendererReady, loadRock, 'authored rock preload');

    const proceduralRock = "else{renderer.draw('sphere',o.x,.38*o.s,o.z,1.5*o.s,.8*o.s,1.2*o.s,o.hue>.5?map.rockA:map.rockB,o.rot,0,o.rot*.3);}}";
    const authoredRock = "else{const usedAuthoredRock=map.id==='pine-valley'&&renderer.drawAuthored?.('rock.pine_valley_cover',o.x,0,o.z,o.s,o.s,o.s,o.rot,0,0);if(!usedAuthoredRock)renderer.draw('sphere',o.x,.38*o.s,o.z,1.5*o.s,.8*o.s,1.2*o.s,o.hue>.5?map.rockA:map.rockB,o.rot,0,o.rot*.3);}}";
    source = replaceRequired(source, proceduralRock, authoredRock, 'Pine Valley authored rocks');

    return source;
  }

  window.fetch = async function(input, init) {
    const response = await upstreamFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(url)) return response;
    const source = patchRockSource(await response.text());
    return new Response(source, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.HarleyHighEndRockPatches = Object.freeze({
    assetId: ROCK_ID,
    assetUrl: ROCK_URL,
    patchRockSource
  });
})();

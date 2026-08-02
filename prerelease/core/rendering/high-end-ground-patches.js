(() => {
  'use strict';

  const upstreamFetch = window.fetch.bind(window);
  const GRASS_ID = 'vegetation.pine_grass';
  const GRASS_URL = './assets/models/vegetation/pine_grass/pine_grass_cluster.glb';
  const RAIL_ID = 'rail.pine_track_set';
  const RAIL_URL = './assets/models/railway/pine_rail_segment/pine_rail_segment.glb';

  function replaceRequired(source, find, replacement, label) {
    if (!source.includes(find)) {
      console.warn(`High-end ground patch skipped: ${label}`);
      return source;
    }
    return source.replace(find, replacement);
  }

  function patchGroundSource(source) {
    const rendererReady = '  document.documentElement.dataset.renderer = rendererMode;';
    const preload = `  if(rendererMode==='webgl')Promise.all([\n    window.HarleyHighEndRuntime?.loadAsset('${GRASS_ID}','${GRASS_URL}').then(parts=>renderer.installAuthoredGroup?.('${GRASS_ID}',parts)),\n    window.HarleyHighEndRuntime?.loadAsset('${RAIL_ID}','${RAIL_URL}').then(parts=>renderer.installAuthoredGroup?.('${RAIL_ID}',parts))\n  ]).then(()=>{document.documentElement.dataset.authoredGround='ready';}).catch(error=>{console.warn('Authored Pine Valley ground assets unavailable',error);document.documentElement.dataset.authoredGround='fallback';});\n\n${rendererReady}`;
    source = replaceRequired(source, rendererReady, preload, 'grass and railway preload');

    const oldGrass = `  function drawGrassClump(x,z,s=1,color='#467f46'){\n    for(let i=-1;i<=1;i++)renderer.draw('cube',x+i*.16*s,.23*s,z+(i%2)*.08*s,.06*s,.48*s,.08*s,color,i*.38,0,i*.22);\n  }`;
    const newGrass = `  function drawGrassClump(x,z,s=1,color='#467f46'){\n    const yaw=((x*12.9898+z*78.233)%6.28318+6.28318)%6.28318;\n    if(world?.map?.id==='pine-valley'&&renderer.drawAuthored?.('${GRASS_ID}',x,0,z,s,s,s,yaw,0,0))return;\n    for(let i=-1;i<=1;i++)renderer.draw('cube',x+i*.16*s,.23*s,z+(i%2)*.08*s,.06*s,.48*s,.08*s,color,i*.38,0,i*.22);\n  }`;
    source = replaceRequired(source, oldGrass, newGrass, 'Pine Valley authored grass');

    const oldRail = `    const rail=world.map?.rail||{x:-13,z:0,rot:0},r=rail.rot||0,right=[Math.cos(r),-Math.sin(r)],front=[Math.sin(r),Math.cos(r)];\n    for(const off of [-1.35,1.35])renderer.draw('cube',rail.x+right[0]*off,.03,rail.z+right[1]*off,.12,.08,38,'#2b3033',r);\n    for(let along=-19;along<=19;along+=1.25)renderer.draw('cube',rail.x+front[0]*along,.015,rail.z+front[1]*along,4.0,.08,.18,'#77543c',r);`;
    const newRail = `    const rail=world.map?.rail||{x:-13,z:0,rot:0},r=rail.rot||0,right=[Math.cos(r),-Math.sin(r)],front=[Math.sin(r),Math.cos(r)];\n    const authoredRailReady=world.map?.id==='pine-valley'&&renderer.authoredGroups?.has('${RAIL_ID}');\n    if(authoredRailReady){for(let along=-18;along<=18;along+=6)renderer.drawAuthored('${RAIL_ID}',rail.x+front[0]*along,0,rail.z+front[1]*along,1,1,1,r+Math.PI/2,0,0);}\n    else{for(const off of [-1.35,1.35])renderer.draw('cube',rail.x+right[0]*off,.03,rail.z+right[1]*off,.12,.08,38,'#2b3033',r);for(let along=-19;along<=19;along+=1.25)renderer.draw('cube',rail.x+front[0]*along,.015,rail.z+front[1]*along,4.0,.08,.18,'#77543c',r);}`;
    source = replaceRequired(source, oldRail, newRail, 'Pine Valley authored railway');

    return source;
  }

  window.fetch = async function(input, init) {
    const response = await upstreamFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(url)) return response;
    const source = patchGroundSource(await response.text());
    return new Response(source, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.HarleyHighEndGroundPatches = Object.freeze({
    grass: { id: GRASS_ID, url: GRASS_URL },
    rail: { id: RAIL_ID, url: RAIL_URL },
    patchGroundSource
  });
})();

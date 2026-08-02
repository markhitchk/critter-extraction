(() => {
  'use strict';

  const upstreamFetch = window.fetch.bind(window);
  const ASSETS = Object.freeze({
    'real.weapon.honey_carbine': './assets/models/third_party/quaternius/toon-shooter/weapons/ak.glb',
    'real.weapon.carrot_scatter': './assets/models/third_party/quaternius/toon-shooter/weapons/shotgun.glb',
    'real.weapon.moonbeam': './assets/models/third_party/quaternius/toon-shooter/weapons/sniper.glb',
    'real.vegetation.pine_tree': './assets/models/third_party/quaternius/toon-shooter/environment/tree.glb',
    'real.loot.supply_crate': './assets/models/third_party/quaternius/toon-shooter/environment/crate.glb',
    'real.environment.shipping_container': './assets/models/third_party/quaternius/toon-shooter/environment/shipping_container.glb',
    'real.environment.barrier': './assets/models/third_party/quaternius/toon-shooter/environment/barrier.glb'
  });

  function replaceRequired(source, find, replacement, label) {
    if (!source.includes(find)) {
      console.warn(`Real CC0 runtime patch skipped: ${label}`);
      return source;
    }
    return source.replace(find, replacement);
  }

  function patchRealAssets(source) {
    const rendererReady = '  document.documentElement.dataset.renderer = rendererMode;';
    const preload = `  if(rendererMode==='webgl')Promise.all(Object.entries(window.CritterRealCc0Assets||{}).map(async([id,url])=>{const parts=await window.HarleyHighEndRuntime.loadAsset(id,url);renderer.installAuthoredGroup(id,parts);})).then(()=>{document.documentElement.dataset.realCc0Runtime='ready';window.dispatchEvent(new CustomEvent('critter-real-cc0-assets-ready',{detail:{count:Object.keys(window.CritterRealCc0Assets||{}).length}}));}).catch(error=>{console.warn('Real CC0 runtime assets unavailable',error);document.documentElement.dataset.realCc0Runtime='fallback';});\n\n${rendererReady}`;
    source = replaceRequired(source, rendererReady, preload, 'real CC0 asset preload');

    // The earlier world bridge still references the old generated groups. Swap
    // those draw IDs after all previous source patches have run.
    source = source.replaceAll("'vegetation.pine_tree'", "'real.vegetation.pine_tree'");
    source = source.replaceAll("'loot.supply_crate'", "'real.loot.supply_crate'");

    const honeyThird = "    }else if(p.weaponId==='honey_carbine'){\n      part('wedge',-.54,0,.00,.52,.40,.78,'#4a3d2a');part('cube',-.05,0,.02,.52,.38,1.04,w.color);part('cylinder',.04,0,-.34,.34,.48,.34,'#b86b24',yaw,pitch,0);part('cube',.55,0,.04,.20,.19,.94,'#42382d');part('cone',.95,0,.04,.20,.48,.20,'#f5c75d',yaw,pitch+Math.PI/2);part('cube',-.08,0,.36,.48,.12,.44,'#5d401f');part('crystal',.12,0,.48,.18,.26,.18,'#fff0a5',yaw,pitch,0,.45);\n    }";
    const honeyThirdReal = "    }else if(p.weaponId==='honey_carbine'){\n      const q=point(-.05,0,.02);if(!renderer.drawAuthored?.('real.weapon.honey_carbine',q[0],q[1],q[2],.74*s,.74*s,.74*s,p.yaw-Math.PI/2,-p.pitch,0)){part('wedge',-.54,0,.00,.52,.40,.78,'#4a3d2a');part('cube',-.05,0,.02,.52,.38,1.04,w.color);part('cylinder',.04,0,-.34,.34,.48,.34,'#b86b24',yaw,pitch,0);part('cube',.55,0,.04,.20,.19,.94,'#42382d');part('cone',.95,0,.04,.20,.48,.20,'#f5c75d',yaw,pitch+Math.PI/2);part('cube',-.08,0,.36,.48,.12,.44,'#5d401f');part('crystal',.12,0,.48,.18,.26,.18,'#fff0a5',yaw,pitch,0,.45);}\n    }";
    source = replaceRequired(source, honeyThird, honeyThirdReal, 'third-person Honeycomb Carbine');

    const carrotThird = "    }else if(p.weaponId==='carrot_scatter'){\n      part('wedge',-.56,0,-.01,.60,.44,.82,'#68442f');part('cube',-.08,0,.02,.48,.38,.76,w.color);part('cylinder',.53,-.13,.08,.17,1.04,.17,'#253b35',yaw,pitch+Math.PI/2);part('cylinder',.53,.13,.08,.17,1.04,.17,'#253b35',yaw,pitch+Math.PI/2);part('cone',.24,0,-.33,.38,.62,.38,'#ff9a55',yaw,pitch,0);part('wedge',.12,0,.38,.42,.22,.36,'#76bf67');part('cube',-.18,0,-.34,.22,.52,.24,'#4f3428',yaw,pitch,0);\n    }";
    const carrotThirdReal = "    }else if(p.weaponId==='carrot_scatter'){\n      const q=point(-.08,0,.02);if(!renderer.drawAuthored?.('real.weapon.carrot_scatter',q[0],q[1],q[2],.74*s,.74*s,.74*s,p.yaw-Math.PI/2,-p.pitch,0)){part('wedge',-.56,0,-.01,.60,.44,.82,'#68442f');part('cube',-.08,0,.02,.48,.38,.76,w.color);part('cylinder',.53,-.13,.08,.17,1.04,.17,'#253b35',yaw,pitch+Math.PI/2);part('cylinder',.53,.13,.08,.17,1.04,.17,'#253b35',yaw,pitch+Math.PI/2);part('cone',.24,0,-.33,.38,.62,.38,'#ff9a55',yaw,pitch,0);part('wedge',.12,0,.38,.42,.22,.36,'#76bf67');part('cube',-.18,0,-.34,.22,.52,.24,'#4f3428',yaw,pitch,0);}\n    }";
    source = replaceRequired(source, carrotThird, carrotThirdReal, 'third-person Carrot Scatter');

    const moonThird = "    }else if(p.weaponId==='moonbeam'){\n      part('wedge',-.70,0,.00,.48,.34,1.04,'#303755');part('cube',-.16,0,.03,.44,.34,.88,w.color);part('crystal',.02,0,.02,.24,.46,.24,'#73eaf2',yaw,pitch,0,.6);part('cube',.60,0,.04,.16,.15,1.26,'#222a3d');part('cone',1.20,0,.04,.18,.42,.18,'#8cecf4',yaw,pitch+Math.PI/2,0,.35);part('cube',-.04,0,.42,.58,.11,.58,'#171d2e');part('capsule',-.04,0,.54,.20,.32,.20,'#a491ff',yaw,pitch,0,.45);part('cube',-.22,0,-.35,.19,.58,.23,'#202638',yaw,pitch,.10);\n    }";
    const moonThirdReal = "    }else if(p.weaponId==='moonbeam'){\n      const q=point(-.16,0,.03);if(!renderer.drawAuthored?.('real.weapon.moonbeam',q[0],q[1],q[2],.72*s,.72*s,.72*s,p.yaw-Math.PI/2,-p.pitch,0)){part('wedge',-.70,0,.00,.48,.34,1.04,'#303755');part('cube',-.16,0,.03,.44,.34,.88,w.color);part('crystal',.02,0,.02,.24,.46,.24,'#73eaf2',yaw,pitch,0,.6);part('cube',.60,0,.04,.16,.15,1.26,'#222a3d');part('cone',1.20,0,.04,.18,.42,.18,'#8cecf4',yaw,pitch+Math.PI/2,0,.35);part('cube',-.04,0,.42,.58,.11,.58,'#171d2e');part('capsule',-.04,0,.54,.20,.32,.20,'#a491ff',yaw,pitch,0,.45);part('cube',-.22,0,-.35,.19,.58,.23,'#202638',yaw,pitch,.10);}\n    }";
    source = replaceRequired(source, moonThird, moonThirdReal, 'third-person Moonbeam');

    const honeyFirst = "    else if(p.weaponId==='honey_carbine'){part(-.55,0,.01,.42,.30,.62,'#4a3d2a',0,'wedge');part(-.15,0,.02,.40,.32,.84,w.color);part(-.02,0,-.29,.28,.42,.28,'#b86b24',0,'cylinder');part(.38,0,.04,.15,.14,.78,'#42382d');part(.78,0,.04,.16,.18,.26,'#f5c75d',0,'cone');part(-.04,0,.34,.36,.10,.34,'#5d401f');part(.08,0,.43,.14,.20,.14,'#fff0a5',0,'crystal',.45);}";
    const honeyFirstReal = "    else if(p.weaponId==='honey_carbine'){const q=point(-.15,0,.02);if(!renderer.drawAuthored?.('real.weapon.honey_carbine',q[0],q[1],q[2],.68,.68,.68,p.yaw-Math.PI/2,-p.pitch,0)){part(-.55,0,.01,.42,.30,.62,'#4a3d2a',0,'wedge');part(-.15,0,.02,.40,.32,.84,w.color);part(-.02,0,-.29,.28,.42,.28,'#b86b24',0,'cylinder');part(.38,0,.04,.15,.14,.78,'#42382d');part(.78,0,.04,.16,.18,.26,'#f5c75d',0,'cone');part(-.04,0,.34,.36,.10,.34,'#5d401f');part(.08,0,.43,.14,.20,.14,'#fff0a5',0,'crystal',.45);}}";
    source = replaceRequired(source, honeyFirst, honeyFirstReal, 'first-person Honeycomb Carbine');

    const carrotFirst = "    else if(p.weaponId==='carrot_scatter'){part(-.56,0,.00,.46,.34,.66,'#68442f',0,'wedge');part(-.15,0,.02,.40,.32,.62,w.color);part(.34,-.11,.07,.13,.13,.78,'#253b35');part(.34,.11,.07,.13,.13,.78,'#253b35');part(.02,0,-.29,.32,.46,.32,'#ff9a55',0,'cone');part(.06,0,.32,.34,.17,.30,'#76bf67',0,'wedge');}";
    const carrotFirstReal = "    else if(p.weaponId==='carrot_scatter'){const q=point(-.15,0,.02);if(!renderer.drawAuthored?.('real.weapon.carrot_scatter',q[0],q[1],q[2],.68,.68,.68,p.yaw-Math.PI/2,-p.pitch,0)){part(-.56,0,.00,.46,.34,.66,'#68442f',0,'wedge');part(-.15,0,.02,.40,.32,.62,w.color);part(.34,-.11,.07,.13,.13,.78,'#253b35');part(.34,.11,.07,.13,.13,.78,'#253b35');part(.02,0,-.29,.32,.46,.32,'#ff9a55',0,'cone');part(.06,0,.32,.34,.17,.30,'#76bf67',0,'wedge');}}";
    source = replaceRequired(source, carrotFirst, carrotFirstReal, 'first-person Carrot Scatter');

    const moonFirst = "    else if(p.weaponId==='moonbeam'){part(-.70,0,.01,.38,.28,.82,'#303755',0,'wedge');part(-.22,0,.03,.36,.29,.70,w.color);part(-.02,0,.03,.19,.34,.19,'#73eaf2',0,'crystal',.6);part(.40,0,.04,.12,.12,1.02,'#222a3d');part(.88,0,.04,.14,.16,.28,'#8cecf4',0,'cone',.35);part(-.06,0,.38,.48,.09,.48,'#171d2e');part(-.06,0,.48,.16,.27,.16,'#a491ff',0,'capsule',.45);}";
    const moonFirstReal = "    else if(p.weaponId==='moonbeam'){const q=point(-.22,0,.03);if(!renderer.drawAuthored?.('real.weapon.moonbeam',q[0],q[1],q[2],.66,.66,.66,p.yaw-Math.PI/2,-p.pitch,0)){part(-.70,0,.01,.38,.28,.82,'#303755',0,'wedge');part(-.22,0,.03,.36,.29,.70,w.color);part(-.02,0,.03,.19,.34,.19,'#73eaf2',0,'crystal',.6);part(.40,0,.04,.12,.12,1.02,'#222a3d');part(.88,0,.04,.14,.16,.28,'#8cecf4',0,'cone',.35);part(-.06,0,.38,.48,.09,.48,'#171d2e');part(-.06,0,.48,.16,.27,.16,'#a491ff',0,'capsule',.45);}}";
    source = replaceRequired(source, moonFirst, moonFirstReal, 'first-person Moonbeam');

    const containerOld = "  function drawContainerCover(c){\n    renderer.draw('cube',c.x,c.h*.5,c.z,c.w,c.h,c.d,c.color,c.rot);\n    const co=Math.cos(c.rot),si=Math.sin(c.rot);for(let i=-3;i<=3;i++){const off=i*c.w/7;renderer.draw('cube',c.x+co*off,c.h*.52,c.z-si*off,.08,c.h*.82,c.d*1.01,'#5d3c31',c.rot);}\n    renderer.draw('cube',c.x,c.h+.08,c.z,c.w*1.02,.16,c.d*1.02,'#3f4749',c.rot);\n  }";
    const containerReal = "  function drawContainerCover(c){\n    if(renderer.drawAuthored?.('real.environment.shipping_container',c.x,0,c.z,c.w/4.2,c.h/2.2,c.d/2.1,c.rot,0,0))return;\n    renderer.draw('cube',c.x,c.h*.5,c.z,c.w,c.h,c.d,c.color,c.rot);\n    const co=Math.cos(c.rot),si=Math.sin(c.rot);for(let i=-3;i<=3;i++){const off=i*c.w/7;renderer.draw('cube',c.x+co*off,c.h*.52,c.z-si*off,.08,c.h*.82,c.d*1.01,'#5d3c31',c.rot);}\n    renderer.draw('cube',c.x,c.h+.08,c.z,c.w*1.02,.16,c.d*1.02,'#3f4749',c.rot);\n  }";
    source = replaceRequired(source, containerOld, containerReal, 'real shipping-container cover');

    const crateWallOld = "  function drawCrateWall(c){\n    for(let row=0;row<2;row++)for(let col=-2;col<=2;col++){const xx=c.x+Math.cos(c.rot)*col*1.05,zz=c.z-Math.sin(c.rot)*col*1.05;renderer.draw('cube',xx,.55+row*1.05,zz,1,1,1.48,c.color,c.rot);renderer.draw('cube',xx,.55+row*1.05,zz,1.03,.10,1.51,'#d7ab6a',c.rot);}\n  }";
    const crateWallReal = "  function drawCrateWall(c){\n    for(let row=0;row<2;row++)for(let col=-2;col<=2;col++){const xx=c.x+Math.cos(c.rot)*col*1.05,zz=c.z-Math.sin(c.rot)*col*1.05;if(!renderer.drawAuthored?.('real.loot.supply_crate',xx,row*1.02,zz,.95,.95,.95,c.rot,0,0)){renderer.draw('cube',xx,.55+row*1.05,zz,1,1,1.48,c.color,c.rot);renderer.draw('cube',xx,.55+row*1.05,zz,1.03,.10,1.51,'#d7ab6a',c.rot);}}\n  }";
    source = replaceRequired(source, crateWallOld, crateWallReal, 'real crate-wall models');

    return source;
  }

  window.CritterRealCc0Assets = ASSETS;
  window.fetch = async function(input, init) {
    const response = await upstreamFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(url)) return response;
    const source = patchRealAssets(await response.text());
    return new Response(source, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.CritterRealCc0RuntimePatches = Object.freeze({ assets: ASSETS, patchRealAssets });
})();

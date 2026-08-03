(() => {
  'use strict';

  const upstreamFetch = window.fetch.bind(window);
  const ACORN_ID = 'weapon.acorn_sprayer';
  const ACORN_URL = './assets/models/third_party/quaternius/toon-shooter/weapons/smg.glb';

  function replaceRequired(source, find, replacement, label) {
    if (!source.includes(find)) {
      console.warn(`Real authored Acorn Sprayer patch skipped: ${label}`);
      return source;
    }
    return source.replace(find, replacement);
  }

  function patchAcornSource(source) {
    const rendererReady = '  document.documentElement.dataset.renderer = rendererMode;';
    const preload = `  if(rendererMode==='webgl')window.HarleyHighEndRuntime?.loadAsset('${ACORN_ID}','${ACORN_URL}').then(parts=>{renderer.installAuthoredGroup?.('${ACORN_ID}',parts);document.documentElement.dataset.acornSprayerModel='real-cc0';}).catch(error=>{console.warn('Real authored Acorn Sprayer unavailable',error);document.documentElement.dataset.acornSprayerModel='fallback';});\n\n${rendererReady}`;
    source = replaceRequired(source, rendererReady, preload, 'real authored Acorn Sprayer preload');

    const oldThirdPerson = "    if(p.weaponId==='acorn_sprayer'){\n      part('wedge',-.44,0,.02,.48,.34,.58,'#34434c');part('cube',-.08,0,.02,.48,.42,.72,w.color);part('sphere',.04,0,-.30,.44,.46,.24,'#6d4b32');part('cube',.48,-.10,.06,.12,.12,.78,'#252e35');part('cube',.48,.10,.06,.12,.12,.78,'#252e35');part('cone',.78,0,.06,.23,.48,.23,'#7c5839',yaw,pitch+Math.PI/2);part('cube',-.16,.20,-.30,.14,.46,.18,'#26333b');part('wedge',-.02,0,.38,.30,.15,.30,'#151e24');\n    }";
    const newThirdPerson = "    if(p.weaponId==='acorn_sprayer'){\n      const acornX=x+frontX*(-.08)*s,acornY=y+.02*s,acornZ=z+frontZ*(-.08)*s;if(!renderer.drawAuthored?.('weapon.acorn_sprayer',acornX,acornY,acornZ,.78*s,.78*s,.78*s,p.yaw-Math.PI/2,-p.pitch,0)){part('wedge',-.44,0,.02,.48,.34,.58,'#34434c');part('cube',-.08,0,.02,.48,.42,.72,w.color);part('sphere',.04,0,-.30,.44,.46,.24,'#6d4b32');part('cube',.48,-.10,.06,.12,.12,.78,'#252e35');part('cube',.48,.10,.06,.12,.12,.78,'#252e35');part('cone',.78,0,.06,.23,.48,.23,'#7c5839',yaw,pitch+Math.PI/2);part('cube',-.16,.20,-.30,.14,.46,.18,'#26333b');part('wedge',-.02,0,.38,.30,.15,.30,'#151e24');}\n    }";
    source = replaceRequired(source, oldThirdPerson, newThirdPerson, 'third-person real authored Acorn Sprayer');

    const oldFirstPerson = "    if(p.weaponId==='acorn_sprayer'){part(-.48,0,.02,.38,.28,.48,'#34434c',0,'wedge');part(-.16,0,.02,.38,.34,.62,w.color);part(-.02,0,-.27,.36,.36,.20,'#6d4b32',0,'sphere');part(.34,-.08,.05,.09,.10,.62,'#252e35');part(.34,.08,.05,.09,.10,.62,'#252e35');part(.70,0,.05,.18,.20,.24,'#7c5839',0,'cone');part(-.12,0,.30,.26,.10,.24,'#151e24',0,'wedge');}";
    const newFirstPerson = "    if(p.weaponId==='acorn_sprayer'){const authoredPoint=point(-.16,0,.02);if(!renderer.drawAuthored?.('weapon.acorn_sprayer',authoredPoint[0],authoredPoint[1],authoredPoint[2],.70,.70,.70,p.yaw-Math.PI/2,-p.pitch,0)){part(-.48,0,.02,.38,.28,.48,'#34434c',0,'wedge');part(-.16,0,.02,.38,.34,.62,w.color);part(-.02,0,-.27,.36,.36,.20,'#6d4b32',0,'sphere');part(.34,-.08,.05,.09,.10,.62,'#252e35');part(.34,.08,.05,.09,.10,.62,'#252e35');part(.70,0,.05,.18,.20,.24,'#7c5839',0,'cone');part(-.12,0,.30,.26,.10,.24,'#151e24',0,'wedge');}}";
    source = replaceRequired(source, oldFirstPerson, newFirstPerson, 'first-person real authored Acorn Sprayer');

    return source;
  }

  window.fetch = async function(input, init) {
    const response = await upstreamFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(url)) return response;
    const source = patchAcornSource(await response.text());
    return new Response(source, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.HarleyHighEndAcornPatches = Object.freeze({
    assetId: ACORN_ID,
    assetUrl: ACORN_URL,
    source: 'Quaternius Toon Shooter Game Kit (CC0-1.0)',
    patchAcornSource
  });
})();

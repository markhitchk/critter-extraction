(() => {
  'use strict';

  const upstreamFetch = window.fetch.bind(window);

  function replaceRequired(source, find, replacement, label) {
    if (!source.includes(find)) {
      console.warn(`High-end world patch skipped: ${label}`);
      return source;
    }
    return source.replace(find, replacement);
  }

  function patchWorldSource(source) {
    const oldStatics = "    for(const o of world.statics){if(o.type==='tree'){renderer.draw('cone',o.x,.92*o.s,o.z,.68*o.s,1.84*o.s,.68*o.s,'#7b523b',o.rot);renderer.draw('capsule',o.x,2.08*o.s,o.z,2.28*o.s,1.90*o.s,2.28*o.s,o.hue>.5?map.treeA:map.treeB,o.rot);if(gp.secondaryCanopy)renderer.draw('capsule',o.x+.66*o.s,2.32*o.s,o.z-.31*o.s,1.36*o.s,1.34*o.s,1.36*o.s,map.treeC);if(gp.extraCharacterParts)renderer.draw('capsule',o.x-.58*o.s,2.22*o.s,o.z+.40*o.s,.88*o.s,.78*o.s,.88*o.s,map.patchA);}else{renderer.draw('sphere',o.x,.38*o.s,o.z,1.5*o.s,.8*o.s,1.2*o.s,o.hue>.5?map.rockA:map.rockB,o.rot,0,o.rot*.3);}}";
    const newStatics = "    for(const o of world.statics){if(o.type==='tree'){const authoredPine=map.id==='pine-valley'&&renderer.drawAuthored?.('vegetation.pine_tree',o.x,0,o.z,o.s,o.s,o.s,o.rot,0,0);if(!authoredPine){renderer.draw('cone',o.x,.92*o.s,o.z,.68*o.s,1.84*o.s,.68*o.s,'#7b523b',o.rot);renderer.draw('capsule',o.x,2.08*o.s,o.z,2.28*o.s,1.90*o.s,2.28*o.s,o.hue>.5?map.treeA:map.treeB,o.rot);if(gp.secondaryCanopy)renderer.draw('capsule',o.x+.66*o.s,2.32*o.s,o.z-.31*o.s,1.36*o.s,1.34*o.s,1.36*o.s,map.treeC);if(gp.extraCharacterParts)renderer.draw('capsule',o.x-.58*o.s,2.22*o.s,o.z+.40*o.s,.88*o.s,.78*o.s,.88*o.s,map.patchA);}}else{renderer.draw('sphere',o.x,.38*o.s,o.z,1.5*o.s,.8*o.s,1.2*o.s,o.hue>.5?map.rockA:map.rockB,o.rot,0,o.rot*.3);}}";
    source = replaceRequired(source, oldStatics, newStatics, 'Pine Valley authored trees');

    const oldSupplyCrate = "    renderer.draw('cube',ch.x,.38,ch.z,1.25,.7,.9,ch.opened?'#7a694d':'#b77b50',0);renderer.draw('cube',ch.x,.8,ch.z-.12,1.28,.3,.92,ch.opened?'#8b7858':'#d19460',0,ch.opened?-.65:0);renderer.draw('cube',ch.x,.43,ch.z+.48,.22,.24,.08,'#ffd36f');";
    const newSupplyCrate = "    if(!renderer.drawAuthored?.('loot.supply_crate',ch.x,.32,ch.z,1,1,1,0,0,0)){renderer.draw('cube',ch.x,.38,ch.z,1.25,.7,.9,ch.opened?'#7a694d':'#b77b50',0);renderer.draw('cube',ch.x,.8,ch.z-.12,1.28,.3,.92,ch.opened?'#8b7858':'#d19460',0,ch.opened?-.65:0);renderer.draw('cube',ch.x,.43,ch.z+.48,.22,.24,.08,'#ffd36f');}";
    source = replaceRequired(source, oldSupplyCrate, newSupplyCrate, 'authored supply crates');

    return source;
  }

  window.fetch = async function(input, init) {
    const response = await upstreamFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(url)) return response;
    const source = patchWorldSource(await response.text());
    return new Response(source, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.HarleyHighEndWorldPatches = Object.freeze({ patchWorldSource });
})();

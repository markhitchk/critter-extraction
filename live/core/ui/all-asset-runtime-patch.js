/* Harley's Studios — generated-runtime hooks for unique critter, weapon, environment, structure, prop, and pickup models. */
(() => {
  'use strict';
  if (window.__CRITTER_ALL_ASSET_RUNTIME_PATCH_V1__) return;
  window.__CRITTER_ALL_ASSET_RUNTIME_PATCH_V1__ = true;

  const MARKER='__ALL_ASSET_MODELS_RUNTIME_V1__';
  const report={attempted:0,applied:[],missing:[],lastVerification:null};
  const mark=(bucket,name)=>{if(!bucket.includes(name))bucket.push(name);};
  function once(source,name,search,replacement){
    if(source.includes(replacement)){mark(report.applied,`${name}:already`);return source;}
    if(!source.includes(search)){mark(report.missing,name);return source;}
    mark(report.applied,name);return source.replace(search,replacement);
  }

  const WEAPON_START="function drawWeaponModel(p, baseY, frontX, frontZ, rightX, rightZ, viewScale=1) {\n    const w=weaponFor(p),";
  const WEAPON_PATCH="function drawWeaponModel(p, baseY, frontX, frontZ, rightX, rightZ, viewScale=1) {\n    const completeWeapon=weaponFor(p);if(window.CritterAllAssetModels?.drawWeapon?.({renderer,p,baseY,frontX,frontZ,rightX,rightZ,viewScale,weapon:completeWeapon}))return;\n    const w=completeWeapon,";

  const PICKUP_START="function drawPickup(pu){\n    pu.spin+=.025;";
  const PICKUP_PATCH="function drawPickup(pu){\n    if(window.CritterAllAssetModels?.drawPickup?.({renderer,pu,itemDefinition:ITEMS[pu.item.id],pickupColor:pickupColor(pu.item.id)}))return;\n    pu.spin+=.025;";

  const CHEST_START="function drawChest(ch){\n    if(ch.kind==='deathbox'){";
  const CHEST_PATCH="function drawChest(ch){\n    if(window.CritterAllAssetModels?.drawChest?.({renderer,ch}))return;\n    if(ch.kind==='deathbox'){";

  const FEATURE_START="function drawRegionFeature(feature){\n    if(!feature)return;";
  const FEATURE_PATCH="function drawRegionFeature(feature){\n    if(window.CritterAllAssetModels?.drawRegionFeature?.({renderer,feature,map:world.map||MAP_VARIANTS[0]}))return;\n    if(!feature)return;";

  const DECOR_START="function drawRegionDecor(o,map){\n    const s=o.s||1,r=o.rot||0;";
  const DECOR_PATCH="function drawRegionDecor(o,map){\n    if(window.CritterAllAssetModels?.drawRegionDecor?.({renderer,o,map}))return;\n    const s=o.s||1,r=o.rot||0;";

  const PINE_START="function drawPine(x,z,s=1){";
  const PINE_PATCH="function drawPine(x,z,s=1){if(window.CritterAllAssetModels?.drawPine?.({renderer,pine:{x,z,s}}))return;";

  const STATIC_LOOP="for(const o of world.statics){if(o.type==='tree'){renderer.draw('cone',o.x,.92*o.s,o.z,.68*o.s,1.84*o.s,.68*o.s,'#7b523b',o.rot);renderer.draw('capsule',o.x,2.08*o.s,o.z,2.28*o.s,1.90*o.s,2.28*o.s,o.hue>.5?map.treeA:map.treeB,o.rot);if(gp.secondaryCanopy)renderer.draw('capsule',o.x+.66*o.s,2.32*o.s,o.z-.31*o.s,1.36*o.s,1.34*o.s,1.36*o.s,map.treeC);if(gp.extraCharacterParts)renderer.draw('capsule',o.x-.58*o.s,2.22*o.s,o.z+.40*o.s,.88*o.s,.78*o.s,.88*o.s,map.patchA);}else{renderer.draw('sphere',o.x,.38*o.s,o.z,1.5*o.s,.8*o.s,1.2*o.s,o.hue>.5?map.rockA:map.rockB,o.rot,0,o.rot*.3);}}";
  const STATIC_PATCH="for(const o of world.statics){if(window.CritterAllAssetModels?.drawStatic?.({renderer,o,map,graphicsProfile:gp}))continue;if(o.type==='tree'){renderer.draw('cone',o.x,.92*o.s,o.z,.68*o.s,1.84*o.s,.68*o.s,'#7b523b',o.rot);renderer.draw('capsule',o.x,2.08*o.s,o.z,2.28*o.s,1.90*o.s,2.28*o.s,o.hue>.5?map.treeA:map.treeB,o.rot);if(gp.secondaryCanopy)renderer.draw('capsule',o.x+.66*o.s,2.32*o.s,o.z-.31*o.s,1.36*o.s,1.34*o.s,1.36*o.s,map.treeC);if(gp.extraCharacterParts)renderer.draw('capsule',o.x-.58*o.s,2.22*o.s,o.z+.40*o.s,.88*o.s,.78*o.s,.88*o.s,map.patchA);}else{renderer.draw('sphere',o.x,.38*o.s,o.z,1.5*o.s,.8*o.s,1.2*o.s,o.hue>.5?map.rockA:map.rockB,o.rot,0,o.rot*.3);}}";

  const COVER_LOOP="for(const c of world.cover||[]){if(c.type==='train')drawTrainCar(c);else if(c.type==='freight')drawFreightCover(c);else if(c.type==='container')drawContainerCover(c);else if(c.type==='cratewall')drawCrateWall(c);else renderer.draw('sphere',c.x,c.h*.42,c.z,c.w,c.h,c.d,c.color,c.rot,.15,.08);}";
  const COVER_PATCH="for(const c of world.cover||[]){if(window.CritterAllAssetModels?.drawCover?.({renderer,c,map:world.map||MAP_VARIANTS[0]}))continue;if(c.type==='train')drawTrainCar(c);else if(c.type==='freight')drawFreightCover(c);else if(c.type==='container')drawContainerCover(c);else if(c.type==='cratewall')drawCrateWall(c);else renderer.draw('sphere',c.x,c.h*.42,c.z,c.w,c.h,c.d,c.color,c.rot,.15,.08);}";

  const CAMP_CRATES="for(const crate of map.campCrates||[]){const r=crate.rot||0,front=[Math.sin(r),Math.cos(r)];renderer.draw('cube',crate.x,.55,crate.z,1.6,1.1,1.6,'#a66f42',r);renderer.draw('cube',crate.x+front[0]*.82,.58,crate.z+front[1]*.82,1.4,.12,.08,'#dfb36c',r);renderer.draw('cube',crate.x-front[0]*.82,.58,crate.z-front[1]*.82,1.4,.12,.08,'#dfb36c',r);}";
  const CAMP_CRATES_PATCH="for(const crate of map.campCrates||[]){if(window.CritterAllAssetModels?.drawCampCrate?.({renderer,crate,map}))continue;const r=crate.rot||0,front=[Math.sin(r),Math.cos(r)];renderer.draw('cube',crate.x,.55,crate.z,1.6,1.1,1.6,'#a66f42',r);renderer.draw('cube',crate.x+front[0]*.82,.58,crate.z+front[1]*.82,1.4,.12,.08,'#dfb36c',r);renderer.draw('cube',crate.x-front[0]*.82,.58,crate.z-front[1]*.82,1.4,.12,.08,'#dfb36c',r);}";

  const CLIFFS="for(const cliff of map.cliffs||[]){const s=cliff.s;renderer.draw('sphere',cliff.x,1.4*s,cliff.z,2.4*s,2.8*s,2.0*s,map.rockA||'#596474',0,.15,.25);if(graphicsProfile().key==='high')renderer.draw('sphere',cliff.x+1.1*s,2.2*s,cliff.z-.5*s,1.35*s,1.8*s,1.2*s,map.rockB||'#6d7683');}";
  const CLIFFS_PATCH="for(const cliff of map.cliffs||[]){if(window.CritterAllAssetModels?.drawCliff?.({renderer,cliff,map}))continue;const s=cliff.s;renderer.draw('sphere',cliff.x,1.4*s,cliff.z,2.4*s,2.8*s,2.0*s,map.rockA||'#596474',0,.15,.25);if(graphicsProfile().key==='high')renderer.draw('sphere',cliff.x+1.1*s,2.2*s,cliff.z-.5*s,1.35*s,1.8*s,1.2*s,map.rockB||'#6d7683');}";

  function verification(source){
    const text=String(source||''),missing=[];
    for(const token of ['CritterAllAssetModels?.drawWeapon','CritterAllAssetModels?.drawStatic','CritterAllAssetModels?.drawCover','CritterAllAssetModels?.drawRegionFeature','CritterAllAssetModels?.drawRegionDecor','CritterAllAssetModels?.drawPickup','CritterAllAssetModels?.drawChest'])if(!text.includes(token))missing.push(token);
    if(!text.includes(MARKER))missing.push('runtime marker');
    return Object.freeze({complete:missing.length===0,missing:Object.freeze(missing)});
  }

  function patchSource(source){
    report.attempted+=1;report.applied=[];report.missing=[];let output=String(source||'');
    if(!output||output.includes(MARKER)){report.lastVerification=verification(output);return output;}
    output=once(output,'unique weapon models',WEAPON_START,WEAPON_PATCH);
    output=once(output,'unique pickup models',PICKUP_START,PICKUP_PATCH);
    output=once(output,'unique chest models',CHEST_START,CHEST_PATCH);
    output=once(output,'unique landmark models',FEATURE_START,FEATURE_PATCH);
    output=once(output,'unique map decor models',DECOR_START,DECOR_PATCH);
    output=once(output,'unique decorative pine model',PINE_START,PINE_PATCH);
    output=once(output,'unique tree and rock models',STATIC_LOOP,STATIC_PATCH);
    output=once(output,'unique tactical cover models',COVER_LOOP,COVER_PATCH);
    output=once(output,'unique camp crate model',CAMP_CRATES,CAMP_CRATES_PATCH);
    output=once(output,'unique cliff model',CLIFFS,CLIFFS_PATCH);
    output+=`\n/* ${MARKER} ${JSON.stringify(report.applied)} */\n`;report.lastVerification=verification(output);return output;
  }

  function assertPatchedSource(source){const result=verification(source);report.lastVerification=result;if(!result.complete)throw new Error(`All-asset model patch incomplete: ${result.missing.join(', ')}`);return source;}

  window.CritterAllAssetRuntimePatch=Object.freeze({patchSource,verification,assertPatchedSource,report});
})();

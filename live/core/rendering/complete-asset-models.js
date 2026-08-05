/* Harley's Studios — unique model recipes for every visible gameplay asset category. */
(() => {
  'use strict';
  if (window.CritterAllAssetModels) return;

  const CRITTER_IDS = Object.freeze([...(window.HARLEYS_GAME_ASSETS?.speciesOrder || [])]);
  const WEAPON_IDS = Object.freeze(['pea_popper','acorn_sprayer','honey_carbine','carrot_scatter','moonbeam']);
  const MAP_IDS = Object.freeze(['pine-valley','amber-junction','moonberry-marsh','clover-highlands','frostflower-ridge','redwood-run']);
  const COVER_IDS = Object.freeze(['train','freight','container','cratewall','boulder']);
  const FEATURE_IDS = Object.freeze(['pine-camp','amber-silo','marsh-dock','clover-windmill','frost-crystal','redwood-gate']);
  const DECOR_IDS = Object.freeze(['pine-marker','hay-bale','marsh-reeds','wildflowers','ice-shard','redwood-stump']);
  const PROP_IDS = Object.freeze(['camp-crate','decorative-pine','cliff','loot-chest','deathbox','pickup']);

  const MODEL_IDS = Object.freeze({
    critters:CRITTER_IDS,
    weapons:WEAPON_IDS,
    trees:Object.freeze(MAP_IDS.flatMap(id => [`${id}-tree-a`,`${id}-tree-b`])),
    rocks:Object.freeze(MAP_IDS.map(id => `${id}-rock`)),
    cover:COVER_IDS,
    features:FEATURE_IDS,
    decor:DECOR_IDS,
    props:PROP_IDS
  });

  const MODEL_SIGNATURES = new Map();
  for (const [category,ids] of Object.entries(MODEL_IDS)) for (const id of ids) MODEL_SIGNATURES.set(`${category}:${id}`,`${category}/${id}`);

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const shade=(hex,amount)=>{
    const raw=String(hex||'#808080').replace('#','');
    if(!/^[0-9a-f]{6}$/i.test(raw))return hex;
    const number=parseInt(raw,16),r=clamp((number>>16)+amount,0,255),g=clamp(((number>>8)&255)+amount,0,255),b=clamp((number&255)+amount,0,255);
    return `#${[r,g,b].map(channel=>Math.round(channel).toString(16).padStart(2,'0')).join('')}`;
  };

  function worldPart(renderer,origin,mesh,side,up,forward,sx,sy,sz,color,ry=origin.rot||0,rx=0,rz=0,emission=0){
    const rot=origin.rot||0,rightX=Math.cos(rot),rightZ=-Math.sin(rot),frontX=Math.sin(rot),frontZ=Math.cos(rot),scale=origin.scale||1;
    renderer.draw(mesh,
      origin.x+(rightX*side+frontX*forward)*scale,
      (origin.y||0)+up*scale,
      origin.z+(rightZ*side+frontZ*forward)*scale,
      sx*scale,sy*scale,sz*scale,color,ry,rx,rz,emission);
  }

  function drawWeapon({renderer,p,baseY,frontX,frontZ,rightX,rightZ,viewScale=1,weapon}){
    const id=String(p?.weaponId||weapon?.id||'pea_popper'),w=weapon||{},kick=(p?.weaponKick||0)*.16,yaw=p?.yaw||0,pitch=-(p?.pitch||0)*.28;
    const origin={x:p.x+frontX*(.84-kick)+rightX*.43,y:baseY+1.26+(p.weaponKick||0)*.07,z:p.z+frontZ*(.84-kick)+rightZ*.43,rot:yaw,scale:viewScale};
    const part=(mesh,fo,ri,up,sx,sy,sz,color,ry=yaw,rx=pitch,rz=0,em=0)=>worldPart(renderer,origin,mesh,ri,up,fo,sx,sy,sz,color,ry,rx,rz,em);
    const main=w.color||'#ffd36f',dark=w.dark||'#374654';
    part('sphere',.10,-.22,-.02,.18,.20,.18,'#d8b18e');part('sphere',.10,.22,-.02,.18,.20,.18,'#d8b18e');
    if(id==='pea_popper'){
      part('wedge',-.34,0,.02,.42,.33,.52,'#5c4d70');part('capsule',.02,0,.03,.46,.34,.82,main);part('cylinder',.46,0,.04,.16,.72,.16,dark,yaw,pitch+Math.PI/2);part('sphere',.78,0,.04,.20,.20,.20,'#8fd45d');part('cube',-.06,0,-.30,.18,.46,.19,'#40533f');part('leaf',.13,.20,.30,.24,.34,.08,'#73b45f',yaw,pitch,.25);
    }else if(id==='acorn_sprayer'){
      part('wedge',-.44,0,.02,.48,.34,.58,'#34434c');part('cube',-.08,0,.02,.48,.42,.72,main);part('sphere',.04,0,-.30,.44,.46,.24,'#6d4b32');part('cube',.48,-.10,.06,.12,.12,.78,'#252e35');part('cube',.48,.10,.06,.12,.12,.78,'#252e35');part('cone',.78,0,.06,.23,.48,.23,'#7c5839',yaw,pitch+Math.PI/2);part('cube',-.16,.20,-.30,.14,.46,.18,'#26333b');part('wedge',-.02,0,.38,.30,.15,.30,'#151e24');
    }else if(id==='honey_carbine'){
      part('wedge',-.54,0,.00,.52,.40,.78,'#4a3d2a');part('cube',-.05,0,.02,.52,.38,1.04,main);part('cylinder',.04,0,-.34,.34,.48,.34,'#b86b24',yaw,pitch,0);part('cube',.55,0,.04,.20,.19,.94,'#42382d');part('cone',.95,0,.04,.20,.48,.20,'#f5c75d',yaw,pitch+Math.PI/2);part('cube',-.08,0,.36,.48,.12,.44,'#5d401f');part('crystal',.12,0,.48,.18,.26,.18,'#fff0a5',yaw,pitch,0,.45);
    }else if(id==='carrot_scatter'){
      part('wedge',-.52,0,.00,.56,.42,.82,'#416048');part('cube',-.08,0,.02,.48,.42,.90,main);part('cylinder',.47,-.12,.04,.13,.94,.13,'#2e4234',yaw,pitch+Math.PI/2);part('cylinder',.47,.12,.04,.13,.94,.13,'#2e4234',yaw,pitch+Math.PI/2);part('cone',.98,0,.04,.28,.44,.28,'#ffb05d',yaw,pitch+Math.PI/2);part('leaf',-.20,.25,.31,.30,.46,.09,'#5ea455',yaw,pitch,.45);
    }else if(id==='moonbeam'){
      part('wedge',-.62,0,.00,.56,.38,.92,'#303755');part('cube',-.10,0,.03,.40,.35,1.18,main);part('cylinder',.61,0,.04,.13,1.25,.13,'#272d4a',yaw,pitch+Math.PI/2);part('crystal',1.15,0,.04,.20,.58,.20,'#d7c8ff',yaw,pitch+Math.PI/2,0,.85);part('cylinder',-.04,0,.42,.22,.50,.22,'#20283e',yaw,pitch,0);part('crystal',-.04,0,.58,.16,.28,.16,'#72ecff',yaw,pitch,0,.65);part('cube',-.24,0,-.31,.17,.50,.22,'#252a43');
    }else return false;
    return true;
  }

  function drawTree({renderer,o,map}){
    const s=o.s||1,variant=o.hue>.5?'b':'a',id=`${map.id||'pine-valley'}-tree-${variant}`,origin={x:o.x,y:0,z:o.z,rot:o.rot||0,scale:s};
    const trunk=map.id==='redwood-run'?'#6d4134':map.id==='moonberry-marsh'?'#5b4938':'#76503a',a=variant==='b'?(map.treeB||'#58bd7d'):(map.treeA||'#4cae78'),b=map.treeC||shade(a,14);
    if(map.id==='pine-valley'){
      worldPart(renderer,origin,'cylinder',0,1.25,0,.34,2.50,.34,trunk);for(let layer=0;layer<3;layer++)worldPart(renderer,origin,'cone',0,1.55+layer*.72,0,1.45-layer*.20,1.45,1.45-layer*.20,layer%2?a:b,o.rot||0);
    }else if(map.id==='amber-junction'){
      worldPart(renderer,origin,'cylinder',0,1.10,0,.42,2.20,.42,trunk);for(const [side,forward,up,scale] of [[0,0,2.15,1.35],[-.65,.15,2.00,.88],[.62,-.10,2.18,.92],[.05,.62,2.35,.78]])worldPart(renderer,origin,'sphere',side,up,forward,scale,scale*.82,scale,a);
    }else if(map.id==='moonberry-marsh'){
      worldPart(renderer,origin,'cylinder',0,1.30,0,.38,2.60,.38,trunk,origin.rot,0,.06);worldPart(renderer,origin,'sphere',0,2.65,0,1.45,.72,1.45,a);for(const side of [-1,-.5,0,.5,1])worldPart(renderer,origin,'capsule',side*.75,1.75,.18,.18,1.85,.18,b,origin.rot,0,side*.18);
    }else if(map.id==='clover-highlands'){
      worldPart(renderer,origin,'cylinder',0,1.18,0,.40,2.36,.40,trunk);for(let i=0;i<6;i++){const angle=i/6*Math.PI*2;worldPart(renderer,origin,'sphere',Math.sin(angle)*.70,2.35+(i%2)*.25,Math.cos(angle)*.52,.82,.72,.82,i%2?a:b);}
    }else if(map.id==='frostflower-ridge'){
      worldPart(renderer,origin,'cylinder',0,1.20,0,.30,2.40,.30,'#5f6268');for(let layer=0;layer<4;layer++)worldPart(renderer,origin,'cone',0,1.35+layer*.58,0,1.32-layer*.18,1.20,1.32-layer*.18,layer%2?a:b);worldPart(renderer,origin,'crystal',0,3.52,0,.25,.70,.25,'#c9f6ff',origin.rot,0,0,.5);
    }else{
      worldPart(renderer,origin,'cylinder',0,2.35,0,.58,4.70,.58,trunk);for(let layer=0;layer<3;layer++)worldPart(renderer,origin,'cone',0,3.55+layer*.78,0,1.65-layer*.25,1.80,1.65-layer*.25,layer%2?a:b);for(const side of [-1,1])worldPart(renderer,origin,'cylinder',side*.42,.65,.18,.24,1.10,.24,shade(trunk,10),origin.rot,0,side*.72);
    }
    return id;
  }

  function drawRock({renderer,o,map}){
    const s=o.s||1,origin={x:o.x,y:0,z:o.z,rot:o.rot||0,scale:s},base=o.hue>.5?(map.rockA||'#8b91a1'):(map.rockB||'#a5a28f');
    if(map.id==='amber-junction'){worldPart(renderer,origin,'wedge',0,.48,0,1.35,.92,1.15,base,origin.rot,.15,.22);worldPart(renderer,origin,'sphere',.38,.62,-.18,.66,.52,.55,shade(base,12),origin.rot,.10,.18);}
    else if(map.id==='moonberry-marsh'){worldPart(renderer,origin,'sphere',0,.38,0,1.32,.70,1.12,base,origin.rot,.15,.08);worldPart(renderer,origin,'sphere',-.42,.68,.18,.52,.44,.50,'#4f8c78');}
    else if(map.id==='frostflower-ridge'){worldPart(renderer,origin,'sphere',0,.42,0,1.24,.78,1.10,base,origin.rot,.12,.20);worldPart(renderer,origin,'crystal',.22,1.15,.05,.30,1.10,.30,'#b9f4ff',origin.rot,.12,.12,.45);}
    else if(map.id==='redwood-run'){worldPart(renderer,origin,'sphere',0,.44,0,1.45,.88,1.22,base,origin.rot,.24,.15);worldPart(renderer,origin,'sphere',-.48,.68,.22,.62,.55,.58,shade(base,-12),origin.rot,.10,.26);}
    else{worldPart(renderer,origin,'sphere',0,.38,0,1.45,.80,1.18,base,origin.rot,.15,.18);worldPart(renderer,origin,'sphere',.38,.70,-.12,.58,.48,.56,shade(base,10),origin.rot,.08,.28);}
    return `${map.id||'pine-valley'}-rock`;
  }

  function drawStatic(ctx){
    if(!ctx?.renderer||!ctx?.o||!ctx?.map)return false;
    if(ctx.o.type==='tree'){drawTree(ctx);return true;}
    if(ctx.o.type==='rock'){drawRock(ctx);return true;}
    return false;
  }

  function drawCover({renderer,c}){
    if(!renderer||!c)return false;const origin={x:c.x,y:0,z:c.z,rot:c.rot||0,scale:1},color=c.color||'#6b7781';
    if(c.type==='train'){
      worldPart(renderer,origin,'cube',0,1.78,0,c.w,c.h*.78,c.d,color,origin.rot);worldPart(renderer,origin,'capsule',0,3.05,0,c.w*1.02,.42,c.d*1.01,'#303940',origin.rot);for(const side of [-1,1])for(const along of [-.34,.34])worldPart(renderer,origin,'cylinder',side*c.w*.42,.42,along*c.d*.72,.42,.24,.42,'#20252a',origin.rot,Math.PI/2);worldPart(renderer,origin,'cube',0,2.05,c.d*.51,c.w*.42,.80,.08,'#b9e9ee',origin.rot);
    }else if(c.type==='freight'){
      worldPart(renderer,origin,'cube',0,c.h*.48,0,c.w,c.h,c.d,color,origin.rot);for(let i=-2;i<=2;i++)worldPart(renderer,origin,'cube',i*c.w*.18,c.h*.52,c.d*.51,.08,c.h*.72,.08,shade(color,18),origin.rot);worldPart(renderer,origin,'wedge',0,c.h+.16,0,c.w*1.02,.26,c.d*1.02,'#3e464d',origin.rot);
    }else if(c.type==='container'){
      worldPart(renderer,origin,'cube',0,c.h*.50,0,c.w,c.h,c.d,color,origin.rot);for(let i=-3;i<=3;i++)worldPart(renderer,origin,'cube',i*c.w*.12,c.h*.52,c.d*.505,.06,c.h*.80,.04,shade(color,-18),origin.rot);worldPart(renderer,origin,'cube',0,c.h+.08,0,c.w*1.02,.16,c.d*1.02,'#3f4749',origin.rot);
    }else if(c.type==='cratewall'){
      for(let row=0;row<2;row++)for(let col=-2;col<=2;col++){worldPart(renderer,origin,'cube',col*1.05,.55+row*1.05,0,1,1,1.48,color,origin.rot);worldPart(renderer,origin,'cube',col*1.05,.55+row*1.05,.75,1.03,.10,.05,'#d7ab6a',origin.rot);}
    }else if(c.type==='boulder'){
      worldPart(renderer,origin,'sphere',0,c.h*.42,0,c.w,c.h,c.d,color,origin.rot,.15,.08);worldPart(renderer,origin,'sphere',c.w*.28,c.h*.68,-c.d*.18,c.w*.42,c.h*.44,c.d*.36,shade(color,12),origin.rot,.08,.25);
    }else return false;
    return true;
  }

  function drawCampCrate({renderer,crate}){
    if(!renderer||!crate)return false;const origin={x:crate.x,y:0,z:crate.z,rot:crate.rot||0,scale:1};worldPart(renderer,origin,'cube',0,.55,0,1.6,1.1,1.6,'#a66f42',origin.rot);for(const side of [-1,1])worldPart(renderer,origin,'cube',0,.58,side*.82,1.4,.12,.08,'#dfb36c',origin.rot);worldPart(renderer,origin,'cube',0,1.08,0,1.45,.08,1.45,'#7f5336',origin.rot);return true;
  }
  function drawPine({renderer,pine}){
    if(!renderer||!pine)return false;const origin={x:pine.x,y:0,z:pine.z,rot:pine.rot||0,scale:pine.s||1};worldPart(renderer,origin,'cylinder',0,.80,0,.24,1.60,.24,'#704a35');for(let i=0;i<3;i++)worldPart(renderer,origin,'cone',0,1.05+i*.55,0,1.05-i*.16,1.15,1.05-i*.16,i%2?'#3d8d5b':'#4eaa69');return true;
  }
  function drawCliff({renderer,cliff,map}){
    if(!renderer||!cliff)return false;const origin={x:cliff.x,y:0,z:cliff.z,rot:cliff.rot||0,scale:cliff.s||1},base=map?.rockA||'#596474';worldPart(renderer,origin,'sphere',0,1.4,0,2.4,2.8,2.0,base,origin.rot,.15,.25);worldPart(renderer,origin,'sphere',1.1,2.2,-.5,1.35,1.8,1.2,map?.rockB||shade(base,15),origin.rot,.08,.18);worldPart(renderer,origin,'wedge',-1.15,.72,.45,.85,1.10,.72,shade(base,-10),origin.rot,.12,.28);return true;
  }

  function drawRegionDecor({renderer,o,map}){
    if(!renderer||!o||!map)return false;const s=o.s||1,r=o.rot||0,origin={x:o.x,y:0,z:o.z,rot:r,scale:s};
    if(o.type==='pine-marker'){drawPine({renderer,pine:{x:o.x,z:o.z,s:.48*s,rot:r}});worldPart(renderer,origin,'sphere',.42,.18,.25,.22,.32,.22,'#8c5b3a');}
    else if(o.type==='hay-bale'){worldPart(renderer,origin,'cylinder',0,.48,0,1.05,.96,1.05,'#d7b458',r,Math.PI/2);worldPart(renderer,origin,'cube',0,.48,0,.12,1.02,1.08,'#9d713e',r);}
    else if(o.type==='marsh-reeds'){worldPart(renderer,origin,'cylinder',0,.01,0,2.0,.04,1.5,[.25,.58,.72,.36]);for(let i=-2;i<=2;i++){worldPart(renderer,origin,'cube',i*.18,.55,(i%2)*.16,.06,1.1,.06,map.grassA,r,0,i*.16);worldPart(renderer,origin,'sphere',i*.18,1.12,(i%2)*.16,.10,.25,.10,'#6a4d39');}}
    else if(o.type==='wildflowers'){for(let i=0;i<7;i++){const a=i/7*Math.PI*2,rad=.45+(i%2)*.18;worldPart(renderer,origin,'cylinder',Math.sin(a)*rad,.28,Math.cos(a)*rad,.04,.56,.04,'#4f8e4e');worldPart(renderer,origin,'sphere',Math.sin(a)*rad,.62,Math.cos(a)*rad,.19,.15,.19,i%3===0?'#ffd36f':i%3===1?'#ff8eaa':'#a491ff',0,0,0,.25);}}
    else if(o.type==='ice-shard'){for(let i=0;i<3;i++){const a=r+i*2.1,rad=i*.25;worldPart(renderer,origin,'crystal',Math.sin(a)*rad,.62+i*.18,Math.cos(a)*rad,.42,1.24+i*.36,.42,i%2?'#a7e7ed':'#d2f7ff',a,.16,a*.2,.55);}}
    else if(o.type==='redwood-stump'){worldPart(renderer,origin,'cylinder',0,.47,0,1.15,.94,1.15,'#80513b',r);worldPart(renderer,origin,'cylinder',0,.96,0,1.18,.10,1.18,'#c09268',r);for(let i=0;i<4;i++){const a=i/4*Math.PI*2;worldPart(renderer,origin,'sphere',Math.sin(a)*.75,.18,Math.cos(a)*.75,.25,.20,.25,map.grassA);}}
    else return false;
    return true;
  }

  function drawRegionFeature({renderer,feature}){
    if(!renderer||!feature)return false;const {x,z,type}=feature,s=feature.s||1,r=feature.rot||0,origin={x,y:0,z,rot:r,scale:s};
    if(type==='pine-camp'){
      for(const side of [-1,1])worldPart(renderer,origin,'cylinder',side*.78,1.05,1.25,.16,2.1,.16,'#604532',r);worldPart(renderer,origin,'cube',0,1.62,1.35,1.9,.66,.18,'#8c623f',r);worldPart(renderer,origin,'cube',0,1.62,1.45,1.18,.12,.08,'#78e4ce',r,0,-.1);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;worldPart(renderer,origin,'sphere',Math.sin(a)*.58,.17,-.75+Math.cos(a)*.58,.34,.24,.34,'#6f6b68');}worldPart(renderer,origin,'cone',0,.68,-.75,.36,1.20,.36,'#ff9b4f',r,0,0,.7);
    }else if(type==='amber-silo'){
      worldPart(renderer,origin,'cylinder',0,2.0,0,2.2,4.0,2.2,'#9f7048',r);worldPart(renderer,origin,'cone',0,4.55,0,2.45,1.35,2.45,'#5e4a3d',r);for(let i=0;i<5;i++)worldPart(renderer,origin,'cube',-1.08+i*.54,3.65,1.02,.09,.75,.09,'#4b3b34',r);worldPart(renderer,origin,'cylinder',1.45,2.1,.25,.16,3.2,.16,'#756351',r);
    }else if(type==='marsh-dock'){
      worldPart(renderer,origin,'cube',0,.42,0,4.4,.34,3.4,'#765b43',r);for(const side of [-1,1])for(const forward of [-1,1])worldPart(renderer,origin,'cylinder',side*1.75,.65,forward*1.20,.20,1.30,.20,'#554333',r);worldPart(renderer,origin,'cube',0,1.15,-1.35,3.8,.18,.30,'#8d7354',r);worldPart(renderer,origin,'sphere',0,.25,1.45,2.2,.12,1.2,[.35,.76,.78,.45],r,0,0,.25);
    }else if(type==='clover-windmill'){
      worldPart(renderer,origin,'cylinder',0,1.8,0,1.45,3.6,1.45,'#ddd2b3',r);worldPart(renderer,origin,'cone',0,4.08,0,1.70,1.10,1.70,'#6c4b36',r);for(let blade=0;blade<4;blade++){const angle=blade*Math.PI/2;worldPart(renderer,origin,'cube',Math.cos(angle)*1.2,3.25,1.22+Math.sin(angle)*1.2,.25,2.25,.16,'#8e694a',r,0,angle);}worldPart(renderer,origin,'sphere',0,3.25,1.22,.42,.42,.42,'#4b3b34',r);
    }else if(type==='frost-crystal'){
      worldPart(renderer,origin,'cylinder',0,.07,0,4.4,.10,4.4,[.75,.91,1,.34],r,0,0,.4);for(let i=0;i<7;i++){const a=i/7*Math.PI*2,rad=i%2?1.25:.55,h=1.6+(i%3)*.55;worldPart(renderer,origin,'crystal',Math.sin(a)*rad,h*.48,Math.cos(a)*rad,.74,h,.74,i%2?'#8fddea':'#b9f4ff',a,.18,a*.25,.7);}worldPart(renderer,origin,'crystal',0,2.8,0,.82,1.12,.82,'#a491ff',0,0,0,1);
    }else if(type==='redwood-gate'){
      for(const side of [-1,1]){worldPart(renderer,origin,'cone',side*1.65,2.65,0,1.05,5.3,1.05,'#7f4936',r);worldPart(renderer,origin,'cone',side*1.65,5.45,0,2.35,2.8,2.35,'#396a4b',r);}worldPart(renderer,origin,'cube',0,3.75,0,4.4,.55,.66,'#6b3d30',r);worldPart(renderer,origin,'cube',0,3.77,.37,2.2,.16,.09,'#74dfc6',r);for(const side of [-1,1])worldPart(renderer,origin,'cylinder',side*2.75,.45,-1.25,1.2,.9,1.2,'#8c573c',r);
    }else return false;
    return true;
  }

  function drawPickup({renderer,pu,itemDefinition,pickupColor}){
    if(!renderer||!pu?.item)return false;pu.spin=(pu.spin||0)+.025;const id=pu.item.id,c=pickupColor||'#fff',bob=Math.sin(pu.spin*2)*.1,y=pu.y+bob,origin={x:pu.x,y,z:pu.z,rot:pu.spin,scale:1};
    const equipment=itemDefinition?.equipment;
    if(equipment==='weapon'){
      const fake={x:pu.x,y:y-1.26,z:pu.z,yaw:pu.spin,pitch:0,weaponKick:0,weaponId:itemDefinition.weaponId};
      return drawWeapon({renderer,p:fake,baseY:y-1.26,frontX:Math.sin(pu.spin),frontZ:Math.cos(pu.spin),rightX:Math.cos(pu.spin),rightZ:-Math.sin(pu.spin),viewScale:.62,weapon:{id:itemDefinition.weaponId,color:c,dark:'#374654'}});
    }
    if(id==='moonberry'){worldPart(renderer,origin,'sphere',0,0,0,.42,.42,.42,c,pu.spin,0,0,.75);for(let i=0;i<5;i++)worldPart(renderer,origin,'leaf',Math.sin(i*1.26)*.28,.08,Math.cos(i*1.26)*.28,.14,.28,.05,'#7ddf92',pu.spin,0,i*.5);}
    else if(id==='crystal'){worldPart(renderer,origin,'crystal',0,.10,0,.46,.92,.46,c,pu.spin,.12,.18,.75);}
    else if(id==='seed_cache'){worldPart(renderer,origin,'capsule',0,0,0,.82,.70,.66,'#466b55',pu.spin);worldPart(renderer,origin,'cylinder',0,.34,0,.74,.14,.74,'#795b3d',pu.spin);worldPart(renderer,origin,'crystal',0,.18,.34,.13,.20,.06,'#d8ffe0',pu.spin,0,0,.45);}
    else if(id==='scrap'){worldPart(renderer,origin,'wedge',-.18,-.08,0,.42,.46,.36,'#7f858b',pu.spin,pu.spin*.3);worldPart(renderer,origin,'cylinder',.19,.02,0,.22,.54,.22,'#b7aa8f',pu.spin,.42,.32);worldPart(renderer,origin,'cube',.04,.17,.16,.44,.13,.12,c,pu.spin,0,.38);}
    else if(equipment==='armor'){worldPart(renderer,origin,'wedge',0,0,0,.64,.72,.32,c,pu.spin);worldPart(renderer,origin,'cube',0,.12,.22,.54,.42,.08,shade(c,-30),pu.spin);}
    else{worldPart(renderer,origin,'cube',0,0,0,.52,.52,.52,c,pu.spin,pu.spin*.3);worldPart(renderer,origin,'sphere',0,.22,.18,.18,.18,.18,shade(c,22),pu.spin);}
    renderer.draw('cylinder',pu.x,.05,pu.z,.65,.03,.65,[.15,.18,.28,.3]);return true;
  }

  function drawChest({renderer,ch}){
    if(!renderer||!ch)return false;const origin={x:ch.x,y:0,z:ch.z,rot:ch.rot||0,scale:1};
    if(ch.kind==='deathbox'){
      const base=ch.opened?'#4b5059':'#2d343d',trim=ch.opened?'#6b727e':'#bd5b48';worldPart(renderer,origin,'cube',0,.29,0,1.34,.52,.92,base);worldPart(renderer,origin,'cube',0,.58,-.08,1.38,.22,.96,trim,0,ch.opened?-.48:0);worldPart(renderer,origin,'cube',0,.35,.49,.22,.22,.08,'#ffb04e');worldPart(renderer,origin,'cube',0,.62,.13,.11,.31,.08,'#f3e2c6');worldPart(renderer,origin,'cube',0,.62,.13,.31,.11,.08,'#f3e2c6');
    }else{
      const base=ch.opened?'#6d5e4d':'#8c623f',trim=ch.opened?'#8f806c':'#e0b86d';worldPart(renderer,origin,'cube',0,.32,0,1.18,.58,.86,base);worldPart(renderer,origin,'capsule',0,.68,-.05,1.20,.28,.88,trim,origin.rot,0,ch.opened?-.58:0);worldPart(renderer,origin,'cube',0,.42,.44,.20,.26,.07,'#ffd36f');for(const side of [-1,1])worldPart(renderer,origin,'cube',side*.44,.32,.44,.08,.48,.06,shade(base,-25));
    }
    return true;
  }

  function validateModels(){
    const counts=Object.fromEntries(Object.entries(MODEL_IDS).map(([category,ids])=>[category,ids.length]));
    const total=Object.values(counts).reduce((sum,count)=>sum+count,0),unique=new Set(MODEL_SIGNATURES.values()).size;
    return Object.freeze({ok:CRITTER_IDS.length===39&&WEAPON_IDS.length===5&&unique===total,total,unique,counts:Object.freeze(counts)});
  }

  window.CritterAllAssetModels=Object.freeze({
    modelIds:MODEL_IDS,signatures:MODEL_SIGNATURES,drawWeapon,drawStatic,drawCover,drawCampCrate,drawPine,drawCliff,drawRegionDecor,drawRegionFeature,drawPickup,drawChest,validateModels
  });
})();

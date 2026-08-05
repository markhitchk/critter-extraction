/* Harley's Studios — complete full-body procedural models for all 39 critters.
   Every species owns a distinct silhouette recipe instead of inheriting the Puppy body. */
(() => {
  'use strict';
  if (window.CritterCompleteModels) return;

  const catalog = window.HARLEYS_GAME_ASSETS;
  if (!catalog) throw new Error('The model catalog must load before species-complete-models.js.');

  const R = Object.freeze({
    puppy:{stance:'standard',body:[.94,1.08,.76],chest:[.82,.74,.66],head:[1.08,.98,.94,2.05,.02],legs:[.30,.78,.30,.25],arms:[.25,.76,.25,.55],ears:'floppy',face:'canine',tail:'dog',limb:'paw',signature:'puppy'},
    bunny:{stance:'spring',body:[.82,1.02,.68],chest:[.70,.78,.58],head:[.96,1.04,.88,2.09,.00],legs:[.28,.86,.29,.27],arms:[.22,.70,.22,.50],ears:'long',face:'rabbit',tail:'puff',limb:'paw',signature:'bunny'},
    kitty:{stance:'agile',body:[.82,1.04,.67],chest:[.72,.74,.58],head:[1.00,.92,.86,2.05,.04],legs:[.26,.82,.27,.24],arms:[.22,.74,.22,.53],ears:'triangle',face:'feline',tail:'cat',limb:'paw',signature:'kitty'},
    fox:{stance:'agile',body:[.80,1.00,.66],chest:[.70,.72,.56],head:[.98,.90,.82,2.06,.08],legs:[.26,.84,.26,.25],arms:[.22,.72,.21,.53],ears:'large-triangle',face:'fox',tail:'brush',limb:'paw',signature:'fox'},
    panda:{stance:'round',body:[1.10,1.12,.88],chest:[.98,.86,.76],head:[1.18,1.02,1.02,2.05,.00],legs:[.34,.74,.36,.31],arms:[.31,.72,.31,.65],ears:'round',face:'bear',tail:'stub',limb:'paw',signature:'panda'},
    bear:{stance:'heavy',body:[1.16,1.18,.92],chest:[1.04,.90,.80],head:[1.22,.98,1.04,2.08,.00],legs:[.37,.76,.39,.34],arms:[.34,.78,.34,.67],ears:'round-small',face:'bear',tail:'bear',limb:'paw',signature:'bear'},
    raccoon:{stance:'standard',body:[.88,1.04,.72],chest:[.78,.76,.62],head:[1.04,.94,.90,2.05,.03],legs:[.28,.78,.29,.25],arms:[.24,.74,.24,.55],ears:'round-small',face:'raccoon',tail:'ringed',limb:'paw',signature:'raccoon'},
    redpanda:{stance:'agile',body:[.86,1.02,.70],chest:[.76,.74,.60],head:[1.04,.93,.89,2.05,.05],legs:[.27,.80,.28,.25],arms:[.23,.72,.23,.54],ears:'triangle',face:'redpanda',tail:'ringed-big',limb:'paw',signature:'redpanda'},
    penguin:{stance:'bird',body:[.96,1.30,.84],chest:[.84,1.02,.72],head:[.98,.88,.88,2.16,.02],legs:[.24,.48,.28,.28],arms:[.28,.90,.13,.68],ears:'none',face:'beak-short',tail:'feather',limb:'flipper',signature:'penguin'},
    crow:{stance:'bird-slim',body:[.74,1.20,.62],chest:[.64,.92,.54],head:[.86,.80,.78,2.17,.04],legs:[.18,.62,.18,.20],arms:[.34,.94,.12,.62],ears:'crest',face:'beak-long',tail:'feather-long',limb:'wing',signature:'crow'},
    frog:{stance:'amphibian',body:[1.14,.74,.92],chest:[1.02,.58,.82],head:[1.22,.66,.92,1.87,.10],legs:[.38,.48,.38,.42],arms:[.28,.56,.27,.66],ears:'frog-eyes',face:'frog',tail:'none',limb:'webbed',signature:'frog'},
    arcticfox:{stance:'agile',body:[.84,1.02,.70],chest:[.72,.74,.58],head:[1.00,.92,.84,2.07,.08],legs:[.27,.84,.28,.25],arms:[.23,.74,.22,.54],ears:'large-triangle',face:'fox',tail:'brush-white',limb:'paw',signature:'arcticfox'},
    capybara:{stance:'barrel',body:[1.10,1.02,.94],chest:[.98,.78,.82],head:[1.14,.82,1.00,1.99,.10],legs:[.32,.66,.34,.31],arms:[.27,.66,.28,.63],ears:'tiny-round',face:'capybara',tail:'none',limb:'paw',signature:'capybara'},
    axolotl:{stance:'aquatic-upright',body:[.94,1.02,.78],chest:[.82,.78,.68],head:[1.14,.78,.92,2.00,.04],legs:[.28,.62,.30,.30],arms:[.25,.68,.24,.60],ears:'gills',face:'axolotl',tail:'fin',limb:'webbed',signature:'axolotl'},
    otter:{stance:'long',body:[.82,1.24,.70],chest:[.72,.98,.60],head:[.96,.80,.84,2.16,.06],legs:[.25,.72,.27,.24],arms:[.23,.82,.22,.54],ears:'tiny-round',face:'mustelid',tail:'otter',limb:'webbed',signature:'otter'},
    wolf:{stance:'tall',body:[.92,1.14,.72],chest:[.82,.84,.62],head:[1.02,.96,.88,2.14,.10],legs:[.29,.90,.29,.27],arms:[.25,.80,.24,.57],ears:'upright',face:'wolf',tail:'wolf',limb:'paw',signature:'wolf'},
    deer:{stance:'hoof-tall',body:[.76,1.12,.62],chest:[.66,.78,.54],head:[.88,.86,.76,2.27,.10],legs:[.22,1.04,.23,.22],arms:[.20,.76,.20,.48],ears:'antlers',face:'deer',tail:'deer',limb:'hoof',signature:'deer'},
    koala:{stance:'round',body:[1.02,1.02,.84],chest:[.90,.78,.72],head:[1.18,.98,1.00,2.04,.01],legs:[.32,.66,.33,.30],arms:[.29,.72,.30,.65],ears:'koala',face:'koala',tail:'stub',limb:'paw',signature:'koala'},
    hedgehog:{stance:'compact',body:[1.02,.94,.86],chest:[.90,.72,.74],head:[.96,.78,.82,1.96,.10],legs:[.29,.60,.30,.28],arms:[.25,.62,.25,.58],ears:'tiny-round',face:'hedgehog',tail:'stub',limb:'claw',signature:'hedgehog'},
    squirrel:{stance:'spring',body:[.80,1.02,.66],chest:[.70,.76,.56],head:[.94,.86,.82,2.04,.04],legs:[.27,.84,.28,.26],arms:[.22,.68,.22,.50],ears:'pointed-small',face:'rodent',tail:'curl-huge',limb:'paw',signature:'squirrel'},
    bat:{stance:'winged',body:[.68,1.00,.56],chest:[.58,.72,.48],head:[.82,.76,.72,2.04,.02],legs:[.18,.62,.18,.20],arms:[.44,1.14,.10,.76],ears:'bat',face:'bat',tail:'none',limb:'wing',signature:'bat'},
    owl:{stance:'bird-round',body:[1.08,1.18,.92],chest:[.96,.92,.80],head:[1.16,.98,1.00,2.20,.00],legs:[.20,.50,.22,.24],arms:[.36,.92,.14,.72],ears:'owl',face:'owl',tail:'feather',limb:'wing',signature:'owl'},
    mouse:{stance:'tiny',body:[.66,.86,.56],chest:[.58,.64,.48],head:[.82,.74,.72,1.88,.05],legs:[.21,.66,.22,.21],arms:[.18,.58,.18,.43],ears:'mouse',face:'mouse',tail:'thin-long',limb:'paw',signature:'mouse'},
    hamster:{stance:'round-small',body:[.92,.92,.80],chest:[.84,.70,.70],head:[1.00,.82,.88,1.96,.03],legs:[.27,.58,.28,.26],arms:[.23,.58,.24,.55],ears:'round-small',face:'hamster',tail:'stub',limb:'paw',signature:'hamster'},
    ferret:{stance:'long',body:[.74,1.34,.62],chest:[.64,1.08,.52],head:[.90,.76,.78,2.18,.08],legs:[.23,.72,.24,.22],arms:[.20,.82,.20,.47],ears:'tiny-round',face:'mustelid',tail:'ferret',limb:'paw',signature:'ferret'},
    duck:{stance:'bird',body:[.92,1.16,.82],chest:[.82,.90,.72],head:[.98,.82,.88,2.13,.02],legs:[.22,.54,.24,.26],arms:[.30,.84,.13,.65],ears:'none',face:'bill',tail:'feather',limb:'wing',signature:'duck'},
    seal:{stance:'seal',body:[1.18,.86,1.20],chest:[1.04,.66,1.02],head:[1.08,.74,.96,1.72,.34],legs:[.00,.00,.00,.00],arms:[.32,.72,.16,.76],ears:'none',face:'seal',tail:'seal',limb:'flipper',signature:'seal'},
    polarbear:{stance:'heavy',body:[1.20,1.20,.96],chest:[1.08,.92,.84],head:[1.24,1.00,1.06,2.10,.00],legs:[.38,.78,.40,.35],arms:[.35,.80,.35,.70],ears:'round-small',face:'bear',tail:'bear',limb:'paw',signature:'polarbear'},
    sloth:{stance:'long-arms',body:[.90,1.04,.76],chest:[.80,.78,.66],head:[1.06,.90,.92,2.04,.00],legs:[.28,.70,.29,.26],arms:[.23,1.08,.22,.68],ears:'tiny-round',face:'sloth',tail:'stub',limb:'claw',signature:'sloth'},
    chameleon:{stance:'reptile',body:[1.08,.76,.86],chest:[.96,.58,.76],head:[.98,.70,.84,1.88,.16],legs:[.26,.56,.24,.38],arms:[.24,.60,.22,.66],ears:'crest',face:'chameleon',tail:'spiral',limb:'claw',signature:'chameleon'},
    beaver:{stance:'barrel',body:[1.04,1.00,.90],chest:[.94,.76,.78],head:[1.10,.84,.96,1.99,.08],legs:[.31,.66,.32,.29],arms:[.27,.66,.27,.62],ears:'tiny-round',face:'beaver',tail:'paddle',limb:'paw',signature:'beaver'},
    goat:{stance:'hoof-tall',body:[.82,1.08,.66],chest:[.72,.78,.56],head:[.94,.88,.80,2.19,.10],legs:[.24,.98,.25,.23],arms:[.21,.72,.21,.51],ears:'horns',face:'goat',tail:'goat',limb:'hoof',signature:'goat'},
    possum:{stance:'slender',body:[.76,1.08,.62],chest:[.66,.80,.52],head:[.88,.78,.74,2.10,.13],legs:[.24,.82,.25,.23],arms:[.20,.72,.20,.48],ears:'round',face:'possum',tail:'naked',limb:'paw',signature:'possum'},
    lemur:{stance:'agile',body:[.78,1.10,.64],chest:[.68,.82,.54],head:[.92,.82,.78,2.11,.04],legs:[.25,.86,.26,.24],arms:[.21,.76,.21,.50],ears:'round',face:'lemur',tail:'ringed-long',limb:'paw',signature:'lemur'},
    alpaca:{stance:'long-neck',body:[.84,1.02,.68],chest:[.74,.74,.58],head:[.86,.76,.72,2.58,.12],legs:[.24,1.02,.25,.23],arms:[.21,.70,.21,.52],ears:'upright-small',face:'alpaca',tail:'alpaca',limb:'hoof',signature:'alpaca'},
    meerkat:{stance:'upright-slim',body:[.66,1.16,.54],chest:[.58,.88,.46],head:[.82,.74,.70,2.13,.08],legs:[.21,.82,.22,.20],arms:[.18,.76,.18,.43],ears:'round-small',face:'meerkat',tail:'thin',limb:'claw',signature:'meerkat'},
    platypus:{stance:'low',body:[1.04,.88,.94],chest:[.94,.66,.84],head:[1.06,.72,.94,1.90,.18],legs:[.29,.58,.30,.31],arms:[.26,.60,.25,.62],ears:'none',face:'platypus',tail:'paddle',limb:'webbed',signature:'platypus'},
    tiger:{stance:'power',body:[.98,1.14,.78],chest:[.88,.84,.68],head:[1.08,.94,.92,2.12,.05],legs:[.31,.86,.32,.28],arms:[.27,.80,.27,.60],ears:'round',face:'tiger',tail:'cat-long',limb:'claw',signature:'tiger'},
    snowleopard:{stance:'power-agile',body:[.92,1.10,.74],chest:[.82,.80,.64],head:[1.04,.92,.88,2.10,.06],legs:[.29,.86,.30,.27],arms:[.25,.78,.25,.57],ears:'round-small',face:'snowleopard',tail:'snow-long',limb:'claw',signature:'snowleopard'}
  });

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const shade=(hex,amount)=>{
    const raw=String(hex||'#808080').replace('#','');
    if(!/^[0-9a-f]{6}$/i.test(raw))return hex;
    const value=parseInt(raw,16),r=clamp((value>>16)+amount,0,255),g=clamp(((value>>8)&255)+amount,0,255),b=clamp((value&255)+amount,0,255);
    return `#${[r,g,b].map(n=>Math.round(n).toString(16).padStart(2,'0')).join('')}`;
  };
  const entryFor=id=>catalog.getSpecies(id);
  const profileFor=id=>R[catalog.normalizeId?.(id)||String(id||'').replace(/[^a-z0-9]/gi,'').toLowerCase()]||R.puppy;

  function point(ctx,lateral=0,forward=0,up=0){return [ctx.p.x+ctx.rightX*lateral+ctx.frontX*forward,ctx.baseY+up,ctx.p.z+ctx.rightZ*lateral+ctx.frontZ*forward];}
  function draw(ctx,mesh,lateral,forward,up,sx,sy,sz,color,ry=ctx.p.yaw,rx=0,rz=0,emission=0){const q=point(ctx,lateral,forward,up);ctx.renderer.draw(mesh,q[0],q[1],q[2],sx,sy,sz,color,ry,rx,rz,emission);}

  function drawBase(ctx,recipe,entry){
    const body=ctx.ap.bodyColor||entry.colors.body,accent=ctx.ap.accentColor||entry.colors.accent,paw=entry.colors.paw,vest=entry.colors.vest;
    const [bw,bh,bd]=recipe.body,[cw,ch,cd]=recipe.chest,[hw,hh,hd,headY,headF]=recipe.head;
    const [lw,lh,ld,stance]=recipe.legs,[aw,ah,ad,spread]=recipe.arms;
    const walk=Number(ctx.walk||0),walkOpp=Number(ctx.walkOpp||0);

    if(recipe.stance==='seal'){
      draw(ctx,'capsule',0,-.06,.78,bw,bh,bd,body,ctx.p.yaw,Math.PI/2);
      draw(ctx,'capsule',0,.42,1.24,cw,ch,cd,paw,ctx.p.yaw,Math.PI/2);
      for(const side of [-1,1])draw(ctx,'capsule',side*.70,.12,.76,aw,ah,ad,accent,ctx.p.yaw,0,side*.48);
      draw(ctx,'capsule',0,.46,headY,hw,hh,hd,body,ctx.p.yaw);
      return;
    }

    if(recipe.stance==='amphibian'||recipe.stance==='reptile'||recipe.stance==='low'){
      draw(ctx,'capsule',0,0,.88,bw,bh,bd,body,ctx.p.yaw);
      draw(ctx,'capsule',0,.16,1.20,cw,ch,cd,paw,ctx.p.yaw);
    }else if(recipe.stance==='long-neck'){
      draw(ctx,'capsule',0,0,.98,bw,bh,bd,body,ctx.p.yaw);
      draw(ctx,'capsule',0,.03,1.72,.34,1.44,.34,paw,ctx.p.yaw);
      draw(ctx,'capsule',0,.05,1.30,cw,ch,cd,body,ctx.p.yaw);
    }else{
      draw(ctx,'capsule',0,0,.92,bw,bh,bd,body,ctx.p.yaw);
      draw(ctx,'capsule',0,.06,1.34,cw,ch,cd,recipe.stance.includes('bird')?paw:body,ctx.p.yaw);
    }

    if(recipe.stance.includes('bird')){
      for(const side of [-1,1]){
        draw(ctx,'cylinder',side*.23,.04,.22,.07,.50,.07,shade(accent,-35),ctx.p.yaw,0,0);
        draw(ctx,'wedge',side*.23,.28,.06,.26,.12,.42,paw,ctx.p.yaw,0,side*.04);
      }
    }else{
      for(const side of [-1,1]){
        const phase=side<0?walk:walkOpp;
        const mesh=recipe.limb==='hoof'?'cube':'capsule';
        draw(ctx,mesh,side*stance,.04+.10*phase,.48,lw,lh,ld,body,ctx.p.yaw,phase*.42,0);
        draw(ctx,recipe.limb==='hoof'?'cube':recipe.limb==='webbed'?'wedge':'capsule',side*stance,.27,.08,lw*1.28,recipe.limb==='hoof'?.18:.24,ld*1.42,recipe.limb==='hoof'?shade(accent,-38):paw,ctx.p.yaw,0,side*(recipe.limb==='webbed'?.08:0));
      }
    }

    for(const side of [-1,1]){
      if(recipe.limb==='wing'){
        draw(ctx,'wedge',side*spread,.12,1.34,aw,ah,ad,body,ctx.p.yaw,0,side*.48);
      }else if(recipe.limb==='flipper'){
        draw(ctx,'capsule',side*spread,.18,1.28,aw,ah,ad,accent,ctx.p.yaw,0,side*.46);
      }else{
        draw(ctx,'capsule',side*spread,.20,1.34,aw,ah,ad,body,ctx.p.yaw,(side<0?walkOpp:walk)*.18,side*.22);
        draw(ctx,recipe.limb==='hoof'?'cube':recipe.limb==='webbed'?'wedge':'capsule',side*spread,.50,1.16,aw*1.18,.24,ad*1.20,recipe.limb==='hoof'?shade(accent,-36):paw,ctx.p.yaw,0,side*(recipe.limb==='webbed'?.08:0));
      }
    }

    draw(ctx,'capsule',0,headF,headY,hw,hh,hd,body,ctx.p.yaw);
    draw(ctx,'capsule',0,.03,1.37,cw*1.02,ch*.64,cd*1.02,vest,ctx.p.yaw);
  }

  function drawEars(ctx,recipe,entry){
    const accent=ctx.ap.accentColor||entry.colors.accent,body=ctx.ap.bodyColor||entry.colors.body,paw=entry.colors.paw;
    const y=recipe.head[3],f=recipe.head[4],t=recipe.ears;
    if(t==='none')return;
    if(t==='floppy')for(const side of [-1,1])draw(ctx,'capsule',side*.52,f-.04,y+.20,.30,.84,.26,accent,ctx.p.yaw,0,side*.40);
    else if(t==='long')for(const side of [-1,1])draw(ctx,'capsule',side*.30,f-.04,y+.78,.25,1.22,.21,accent,ctx.p.yaw,0,side*.13);
    else if(['triangle','large-triangle','upright','pointed-small','upright-small'].includes(t)){
      const big=t==='large-triangle'||t==='upright',small=t==='pointed-small'||t==='upright-small';
      for(const side of [-1,1])draw(ctx,'wedge',side*(small?.31:.39),f-.02,y+(big?.56:small?.35:.43),big?.36:small?.22:.30,big?.82:small?.48:.62,.18,accent,ctx.p.yaw,0,side*.18);
    }else if(['round','round-small','tiny-round'].includes(t)){
      const s=t==='round'?.38:t==='round-small'?.29:.20;for(const side of [-1,1])draw(ctx,'sphere',side*(.43+s*.20),f-.03,y+.28,s,s,s,accent);
    }else if(t==='mouse')for(const side of [-1,1]){draw(ctx,'sphere',side*.48,f-.03,y+.32,.42,.42,.24,accent);draw(ctx,'sphere',side*.48,f+.10,y+.32,.26,.26,.10,paw);}
    else if(t==='koala')for(const side of [-1,1]){draw(ctx,'sphere',side*.55,f-.03,y+.30,.47,.47,.28,accent);draw(ctx,'sphere',side*.55,f+.08,y+.30,.28,.28,.12,paw);}
    else if(t==='gills')for(const side of [-1,1])for(let i=-1;i<=1;i++)draw(ctx,'capsule',side*(.59+Math.abs(i)*.05),f-.03,y+i*.24,.10,.52,.09,accent,ctx.p.yaw,0,side*(.56+i*.12));
    else if(t==='antlers')for(const side of [-1,1]){draw(ctx,'cylinder',side*.33,f-.04,y+.57,.08,.72,.08,accent,ctx.p.yaw,0,side*.12);draw(ctx,'cylinder',side*.47,f-.04,y+.84,.06,.44,.06,accent,ctx.p.yaw,0,side*.72);draw(ctx,'cylinder',side*.22,f-.04,y+.89,.06,.38,.06,accent,ctx.p.yaw,0,side*-.58);}
    else if(t==='horns')for(const side of [-1,1])draw(ctx,'cone',side*.36,f,y+.53,.18,.72,.18,accent,ctx.p.yaw,0,side*.38);
    else if(t==='bat')for(const side of [-1,1])draw(ctx,'wedge',side*.36,f-.01,y+.50,.38,.88,.16,accent,ctx.p.yaw,0,side*.28);
    else if(t==='owl')for(const side of [-1,1])draw(ctx,'wedge',side*.37,f,y+.35,.32,.50,.16,accent,ctx.p.yaw,0,side*.13);
    else if(t==='crest')for(let i=-2;i<=2;i++)draw(ctx,'cone',i*.13,f-.04,y+.48-Math.abs(i)*.04,.11,.44,.11,i%2?body:accent,ctx.p.yaw,0,i*.12);
    else if(t==='frog-eyes')for(const side of [-1,1]){draw(ctx,'sphere',side*.36,f+.18,y+.36,.28,.32,.27,body);draw(ctx,'sphere',side*.36,f+.38,y+.37,.10,.13,.07,'#111827',ctx.p.yaw,0,0,.3);}
  }

  function drawFace(ctx,recipe,entry){
    const body=ctx.ap.bodyColor||entry.colors.body,accent=ctx.ap.accentColor||entry.colors.accent,paw=entry.colors.paw,dark='#242633';
    const y=recipe.head[3],f=recipe.head[4],face=recipe.face;
    const eyeY=y+.05,eyeF=f+.48,eyeX=recipe.head[0]*.36;
    if(!['frog','owl','chameleon'].includes(face))for(const side of [-1,1])draw(ctx,'sphere',side*eyeX,eyeF,eyeY,.075,.10,.055,dark,ctx.p.yaw,0,0,.20);
    if(['canine','wolf','fox'].includes(face)){
      draw(ctx,'cone',0,f+.60,y-.16,.40,face==='wolf'?.68:.58,.36,paw,ctx.p.yaw,Math.PI/2);draw(ctx,'sphere',0,f+.91,y-.10,.14,.12,.13,dark);
    }else if(face==='rabbit'){
      draw(ctx,'capsule',0,f+.53,y-.17,.52,.27,.38,paw,ctx.p.yaw,Math.PI/2);draw(ctx,'sphere',0,f+.78,y-.11,.11,.10,.10,'#eaa2ad');
    }else if(['feline','tiger','snowleopard'].includes(face)){
      draw(ctx,'capsule',0,f+.49,y-.17,.49,.25,.34,paw,ctx.p.yaw,Math.PI/2);draw(ctx,'wedge',0,f+.72,y-.10,.16,.15,.14,dark,ctx.p.yaw,Math.PI/2);
      for(const side of [-1,1])for(let i=-1;i<=1;i++)draw(ctx,'cube',side*(.25+i*.07),f+.74,y-.17+i*.05,.25,.018,.018,'#f4f2e8',ctx.p.yaw,0,side*.05);
    }else if(['bear','raccoon','redpanda','koala','hamster'].includes(face)){
      draw(ctx,'capsule',0,f+.48,y-.17,.56,.31,.40,paw,ctx.p.yaw,Math.PI/2);draw(ctx,'sphere',0,f+.78,y-.10,.14,.12,.13,dark);
    }else if(face==='beak-short'||face==='beak-long'||face==='bill'){
      const color=face==='beak-long'?'#30343c':'#e88942';draw(ctx,face==='bill'?'wedge':'cone',0,f+.63,y-.13,face==='bill'?.58:.30,face==='beak-long'?.74:.50,face==='bill'?.40:.28,color,ctx.p.yaw,face==='bill'?0:Math.PI/2);
    }else if(face==='frog'){
      draw(ctx,'capsule',0,f+.48,y-.15,.64,.20,.36,paw,ctx.p.yaw,Math.PI/2);
    }else if(face==='axolotl'){
      draw(ctx,'capsule',0,f+.45,y-.12,.54,.22,.38,paw,ctx.p.yaw,Math.PI/2);draw(ctx,'sphere',0,f+.72,y-.08,.10,.09,.10,accent);
    }else if(['capybara','mouse','rodent','mustelid','hedgehog','possum','meerkat'].includes(face)){
      const len=face==='possum'||face==='meerkat'?.64:face==='capybara'?.48:.42;draw(ctx,'cone',0,f+.52,y-.16,.34,len,.31,paw,ctx.p.yaw,Math.PI/2);draw(ctx,'sphere',0,f+.82,y-.10,.12,.10,.11,face==='possum'?'#e69aa4':dark);
    }else if(face==='deer'||face==='goat'||face==='alpaca'){
      draw(ctx,'cone',0,f+.56,y-.17,.36,face==='alpaca'?.72:.62,.34,paw,ctx.p.yaw,Math.PI/2);draw(ctx,'sphere',0,f+.88,y-.10,.12,.10,.11,dark);
    }else if(face==='bat'){
      draw(ctx,'capsule',0,f+.43,y-.15,.40,.23,.30,paw,ctx.p.yaw,Math.PI/2);for(const side of [-1,1])draw(ctx,'cone',side*.12,f+.68,y-.20,.04,.18,.04,'#fff0db',ctx.p.yaw,Math.PI/2);
    }else if(face==='owl'){
      for(const side of [-1,1]){draw(ctx,'sphere',side*.27,f+.36,y+.04,.30,.33,.18,paw);draw(ctx,'sphere',side*.27,f+.54,y+.04,.09,.11,.05,dark,ctx.p.yaw,0,0,.30);}draw(ctx,'cone',0,f+.62,y-.15,.18,.32,.18,'#d8a64e',ctx.p.yaw,Math.PI/2);
    }else if(face==='seal'){
      draw(ctx,'capsule',0,f+.51,y-.13,.56,.28,.38,paw,ctx.p.yaw,Math.PI/2);draw(ctx,'sphere',0,f+.78,y-.08,.13,.11,.12,dark);for(const side of [-1,1])for(let i=-1;i<=1;i++)draw(ctx,'cube',side*(.28+i*.07),f+.73,y-.14+i*.05,.28,.018,.018,'#eef6f7',ctx.p.yaw,0,side*.06);
    }else if(face==='sloth'||face==='lemur'){
      draw(ctx,'capsule',0,f+.38,y-.06,.62,.57,.16,paw,ctx.p.yaw);draw(ctx,'sphere',0,f+.62,y-.17,.12,.10,.10,dark);
    }else if(face==='chameleon'){
      for(const side of [-1,1]){draw(ctx,'sphere',side*.38,f+.28,y+.14,.18,.22,.17,accent);draw(ctx,'sphere',side*.38,f+.47,y+.14,.07,.09,.05,dark,ctx.p.yaw,0,0,.35);}draw(ctx,'capsule',0,f+.44,y-.14,.56,.20,.38,paw,ctx.p.yaw,Math.PI/2);
    }else if(face==='beaver'){
      draw(ctx,'capsule',0,f+.48,y-.15,.56,.28,.40,paw,ctx.p.yaw,Math.PI/2);for(const side of [-1,1])draw(ctx,'cube',side*.10,f+.75,y-.28,.12,.24,.08,'#fff7df',ctx.p.yaw);
    }else if(face==='platypus'){
      draw(ctx,'wedge',0,f+.64,y-.18,.66,.22,.54,accent,ctx.p.yaw);draw(ctx,'cube',0,f+.83,y-.18,.48,.06,.42,shade(accent,-25),ctx.p.yaw);
    }
  }

  function drawTail(ctx,recipe,entry){
    const body=ctx.ap.bodyColor||entry.colors.body,accent=ctx.ap.accentColor||entry.colors.accent,paw=entry.colors.paw,t=recipe.tail;
    if(t==='none')return;
    if(['stub','bear','goat','deer','alpaca'].includes(t))draw(ctx,'sphere',0,-.57,1.00,t==='alpaca'?.34:.25,t==='alpaca'?.36:.27,t==='alpaca'?.32:.27,accent);
    else if(t==='puff')draw(ctx,'sphere',0,-.60,1.03,.46,.46,.46,'#fff8f6');
    else if(['dog','cat','cat-long','wolf','otter','ferret','thin','thin-long'].includes(t)){
      const length=t==='cat-long'||t==='otter'||t==='ferret'||t==='thin-long'?1.18:t==='wolf'?1.05:.88;draw(ctx,'capsule',.08,-.69,1.02,t==='wolf'?.27:.18,length,t==='wolf'?.26:.18,accent,ctx.p.yaw,.12,.69);
    }else if(t==='brush'||t==='brush-white'){
      draw(ctx,'capsule',.11,-.72,1.04,.36,1.12,.34,body,ctx.p.yaw,.18,.72);draw(ctx,'capsule',.17,-1.08,.77,.29,.60,.27,t==='brush-white'?'#ffffff':accent,ctx.p.yaw,.18,.72);
    }else if(t.startsWith('ringed')){
      const count=t==='ringed-long'?7:t==='ringed-big'?6:5;for(let i=0;i<count;i++)draw(ctx,'capsule',.12,-.62-i*.18,1.06-i*.10,.24,.38,.23,i%2?accent:body,ctx.p.yaw,.10,.74);
    }else if(t==='curl-huge'){
      for(let i=0;i<7;i++){const a=i*.70;draw(ctx,'capsule',Math.sin(a)*.48,-.66-Math.cos(a)*.34,1.12+Math.sin(a*.78)*.42,.25,.44,.24,i%2?accent:body,ctx.p.yaw,a*.10,.56);}
    }else if(t==='spiral'){
      for(let i=0;i<8;i++){const a=i*.68,r=.12+i*.045;draw(ctx,'capsule',Math.sin(a)*r,-.58-Math.cos(a)*r,1.01+Math.sin(a*.65)*.20,.12,.28,.11,accent,ctx.p.yaw,a*.10,.60);}
    }else if(t==='paddle')draw(ctx,'wedge',0,-.80,.82,.56,.86,.17,accent,ctx.p.yaw,.18,0);
    else if(t==='naked')draw(ctx,'capsule',.06,-.80,.94,.10,1.20,.10,'#d9a1a6',ctx.p.yaw,.10,.72);
    else if(t==='fin')draw(ctx,'wedge',0,-.74,.95,.26,.92,.48,accent,ctx.p.yaw,.12,0);
    else if(t==='seal'){for(const side of [-1,1])draw(ctx,'capsule',side*.22,-.98,.62,.24,.64,.16,accent,ctx.p.yaw,.10,side*.34);}
    else if(t.startsWith('feather')){const count=t==='feather-long'?5:3;for(let i=0;i<count;i++){const side=i-(count-1)/2;draw(ctx,'wedge',side*.15,-.64,1.02,.20,t==='feather-long'?.78:.58,.11,i%2?accent:paw,ctx.p.yaw,.18,side*.13);}}
    else if(t==='snow-long'){for(let i=0;i<7;i++)draw(ctx,'capsule',Math.sin(i*.38)*.24,-.62-i*.18,1.04-i*.07,.22,.42,.20,i%2?accent:body,ctx.p.yaw,.10,.66);}
  }

  function drawSignature(ctx,recipe,entry){
    const id=entry.id,body=ctx.ap.bodyColor||entry.colors.body,accent=ctx.ap.accentColor||entry.colors.accent,paw=entry.colors.paw,dark='#292741';
    if(id==='panda'){for(const side of [-1,1])draw(ctx,'capsule',side*.34,.47,2.12,.24,.31,.11,dark,ctx.p.yaw,0,side*.12);draw(ctx,'capsule',0,.30,1.40,.66,.80,.18,paw,ctx.p.yaw);}
    else if(id==='raccoon'||id==='redpanda'){draw(ctx,'capsule',0,.42,2.10,.76,.28,.11,dark,ctx.p.yaw,Math.PI/2);}
    else if(id==='penguin'){draw(ctx,'capsule',0,.32,1.35,.62,.94,.20,paw,ctx.p.yaw);}
    else if(id==='crow'){draw(ctx,'wedge',0,-.03,2.69,.28,.48,.20,accent,ctx.p.yaw);}
    else if(id==='hedgehog'){for(let row=0;row<4;row++)for(let i=-3;i<=3;i++)draw(ctx,'cone',i*.15,-.25,1.10+row*.28,.08,.38,.08,accent,ctx.p.yaw,0,i*.08);}
    else if(id==='bat'){for(const side of [-1,1])for(let i=0;i<3;i++)draw(ctx,'wedge',side*(.65+i*.15),.04-i*.03,1.30-i*.16,.28,.74,.09,i%2?accent:body,ctx.p.yaw,0,side*(.50+i*.08));}
    else if(id==='owl'){for(const side of [-1,1])draw(ctx,'sphere',side*.28,.39,2.20,.29,.31,.16,paw);}
    else if(id==='hamster'){for(const side of [-1,1])draw(ctx,'sphere',side*.42,.43,1.91,.30,.34,.18,paw);}
    else if(id==='sloth'){for(const side of [-1,1])draw(ctx,'capsule',side*.27,.44,2.08,.24,.33,.10,dark,ctx.p.yaw,0,side*.10);}
    else if(id==='alpaca'){for(let row=0;row<3;row++)for(let i=-2;i<=2;i++)draw(ctx,'sphere',i*.18,-.02,1.22+row*.30,.25,.27,.23,paw);}
    else if(id==='tiger'){for(let row=0;row<3;row++)for(let i=-2;i<=2;i++)if((row+i)%2===0)draw(ctx,'wedge',i*.18,.39,1.42+row*.34,.09,.34,.07,dark,ctx.p.yaw,0,i*.08);}
    else if(id==='snowleopard'){for(let row=0;row<3;row++)for(let i=-2;i<=2;i++)if((row+i)%2===0)draw(ctx,'sphere',i*.20,.39,1.40+row*.35,.09,.07,.05,accent);}
    else if(id==='wolf'){draw(ctx,'capsule',0,.36,1.42,.64,.78,.18,shade(body,24),ctx.p.yaw);}
    else if(id==='deer'){draw(ctx,'capsule',0,.32,1.42,.50,.66,.15,paw,ctx.p.yaw);}
    else if(id==='koala'){draw(ctx,'sphere',0,.58,1.99,.18,.27,.14,dark);}
    else if(id==='frog'){for(const side of [-1,1])for(let i=-1;i<=1;i++)draw(ctx,'wedge',side*(.24+i*.09),.32,.06,.09,.16,.04,paw,ctx.p.yaw,0,side*.08);}
    else if(id==='axolotl'){draw(ctx,'wedge',0,-.14,1.40,.16,.92,.38,accent,ctx.p.yaw,0,0);}
    else if(id==='capybara'){draw(ctx,'cube',0,.74,1.92,.22,.16,.18,dark,ctx.p.yaw);}
    else if(id==='chameleon'){for(let i=-2;i<=2;i++)draw(ctx,'cone',i*.15,-.03,2.28-Math.abs(i)*.05,.11,.42,.11,i%2?body:accent,ctx.p.yaw,0,i*.12);}
    else if(id==='lemur'){draw(ctx,'capsule',0,.34,2.08,.68,.27,.10,dark,ctx.p.yaw,Math.PI/2);}
    else if(id==='meerkat'){draw(ctx,'capsule',0,.30,1.38,.46,.70,.20,paw,ctx.p.yaw);}
    else if(id==='platypus'){draw(ctx,'wedge',0,.74,1.72,.62,.20,.52,accent,ctx.p.yaw);}
  }

  function drawCompleteThirdPerson(ctx){
    const entry=entryFor(ctx.ap?.species||'puppy'),recipe=profileFor(entry.id);
    drawBase(ctx,recipe,entry);drawEars(ctx,recipe,entry);drawFace(ctx,recipe,entry);drawTail(ctx,recipe,entry);drawSignature(ctx,recipe,entry);
    return true;
  }

  function silhouetteKey(id){const r=profileFor(id);return JSON.stringify([r.stance,r.body,r.chest,r.head,r.legs,r.arms,r.ears,r.face,r.tail,r.limb]);}
  function validateModels(){
    const ids=catalog.speciesOrder||Object.keys(R),missing=ids.filter(id=>!R[id]),keys=ids.map(silhouetteKey),unique=new Set(keys);
    return Object.freeze({ok:missing.length===0&&unique.size===ids.length,count:ids.length,unique:unique.size,missing:Object.freeze(missing)});
  }

  const validation=validateModels();
  if(!validation.ok)throw new Error(`Complete critter models invalid: ${validation.missing.join(', ')||`${validation.unique}/${validation.count} unique silhouettes`}`);

  window.CritterCompleteModels=Object.freeze({profiles:R,profile:profileFor,silhouetteKey,drawCompleteThirdPerson,validateModels});
})();

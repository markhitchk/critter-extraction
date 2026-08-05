/* Harley's Studios — procedural 3D recipes for all 39 Critter Extraction critters.
   Uses the existing browser renderer primitives and shared materials only. */
(() => {
  'use strict';
  if (window.CritterSpeciesModels) return;

  const catalog = window.HARLEYS_GAME_ASSETS;
  if (!catalog) throw new Error('The species model catalog must load before species-models.js.');

  const CORE_MODELED = new Set(['puppy','bunny','kitty','fox','panda','bear','raccoon','redpanda']);
  const PREDATORS = new Set(['puppy','kitty','fox','bear','raccoon','redpanda','wolf','ferret','polarbear','tiger','snowleopard','arcticfox','otter']);
  const SMALL = new Set(['mouse','hamster','meerkat','bat','frog']);
  const LARGE = new Set(['bear','polarbear','alpaca','goat','deer','capybara','seal']);
  const LONG_HEAD = new Set(['fox','arcticfox','wolf','deer','goat','alpaca','meerkat','possum','platypus']);
  const ROUND_HEAD = new Set(['panda','bear','polarbear','koala','hamster','owl','frog','seal']);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const shade = (hex, amount) => {
    const value = String(hex || '#808080').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
    const number = parseInt(value, 16);
    const r = clamp((number >> 16) + amount, 0, 255);
    const g = clamp(((number >> 8) & 255) + amount, 0, 255);
    const b = clamp((number & 255) + amount, 0, 255);
    return `#${[r,g,b].map(channel => Math.round(channel).toString(16).padStart(2,'0')).join('')}`;
  };

  function species(id) {
    return catalog.getSpecies(id);
  }

  function proportions(id) {
    const entry = species(id);
    const key = entry.id;
    let headWide = ROUND_HEAD.has(key) ? 1.16 : LONG_HEAD.has(key) ? 1.02 : 1.08;
    let headTall = SMALL.has(key) ? .88 : key === 'alpaca' ? 1.13 : key === 'owl' ? 1.03 : .98;
    let headDeep = LONG_HEAD.has(key) ? .90 : key === 'platypus' ? .86 : .96;
    let bodyScale = LARGE.has(key) ? 1.08 : SMALL.has(key) ? .88 : 1;
    if (key === 'hedgehog') { headWide = 1.04; headTall = .91; bodyScale = .96; }
    if (key === 'chameleon') { headWide = 1.02; headTall = .88; headDeep = .86; bodyScale = .92; }
    if (key === 'penguin') { headWide = 1.02; headTall = 1.00; bodyScale = .96; }
    if (key === 'crow' || key === 'duck') { headWide = .98; headTall = .96; bodyScale = .92; }
    return Object.freeze({ headWide, headTall, headDeep, bodyScale });
  }

  function firstPersonProfile(id) {
    const entry = species(id);
    const limb = entry.model.firstPersonLimb;
    return Object.freeze({
      limb,
      armColor: ['panda','raccoon','penguin','crow','bat','owl'].includes(entry.id) ? entry.colors.accent : entry.colors.body,
      pawMesh: limb === 'hoof' ? 'cube' : limb === 'wing' ? 'wedge' : limb === 'flipper' ? 'capsule' : 'sphere',
      pawW: limb === 'wing' ? .30 : limb === 'flipper' ? .27 : limb === 'hoof' ? .22 : SMALL.has(entry.id) ? .18 : LARGE.has(entry.id) ? .26 : .22,
      pawH: limb === 'wing' ? .15 : limb === 'flipper' ? .16 : limb === 'hoof' ? .18 : .19,
      pawD: limb === 'wing' ? .34 : limb === 'flipper' ? .38 : .23
    });
  }

  function at(ctx, lateral = 0, forward = 0, up = 0) {
    return [
      ctx.p.x + ctx.rightX * lateral + ctx.frontX * forward,
      ctx.baseY + up,
      ctx.p.z + ctx.rightZ * lateral + ctx.frontZ * forward
    ];
  }

  function draw(ctx, mesh, lateral, forward, up, sx, sy, sz, color, ry = ctx.p.yaw, rx = 0, rz = 0, emission = 0) {
    const point = at(ctx, lateral, forward, up);
    ctx.renderer.draw(mesh, point[0], point[1], point[2], sx, sy, sz, color, ry, rx, rz, emission);
  }

  function drawEars(ctx, entry) {
    const body = ctx.ap.bodyColor;
    const accent = ctx.ap.accentColor;
    const type = entry.model.ears;
    if (type === 'upright') {
      for (const side of [-1,1]) draw(ctx,'capsule',side*.32,.02,2.76,.25,.90,.21,accent,ctx.p.yaw,0,side*.13);
    } else if (type === 'floppy') {
      for (const side of [-1,1]) draw(ctx,'capsule',side*.51,-.02,2.30,.30,.78,.25,accent,ctx.p.yaw,0,side*.38);
    } else if (type === 'triangle') {
      for (const side of [-1,1]) draw(ctx,'wedge',side*.40,.02,2.58,.33,.64,.20,accent,ctx.p.yaw,0,side*.18);
    } else if (type === 'round' || type === 'small') {
      const scale = type === 'small' ? .27 : .38;
      for (const side of [-1,1]) draw(ctx,'sphere',side*.47,-.02,2.37,scale,scale,scale,accent);
    } else if (type === 'gills') {
      for (const side of [-1,1]) for (let index=-1; index<=1; index++) draw(ctx,'capsule',side*(.55+Math.abs(index)*.05),-.02,2.18+index*.24,.10,.50,.09,accent,ctx.p.yaw,0,side*(.55+index*.12));
    } else if (type === 'antler') {
      for (const side of [-1,1]) {
        draw(ctx,'cylinder',side*.35,-.03,2.72,.09,.65,.09,accent,ctx.p.yaw,0,side*.15);
        draw(ctx,'cylinder',side*.48,-.03,2.93,.07,.42,.07,accent,ctx.p.yaw,0,side*.72);
        draw(ctx,'cylinder',side*.25,-.03,3.00,.07,.38,.07,accent,ctx.p.yaw,0,side*-.58);
      }
    } else if (type === 'bat') {
      for (const side of [-1,1]) draw(ctx,'wedge',side*.42,.01,2.62,.40,.82,.17,accent,ctx.p.yaw,0,side*.28);
    } else if (type === 'owl') {
      for (const side of [-1,1]) draw(ctx,'wedge',side*.38,.02,2.46,.32,.50,.16,accent,ctx.p.yaw,0,side*.13);
    } else if (type === 'crow') {
      draw(ctx,'wedge',0,-.02,2.72,.32,.54,.22,accent,ctx.p.yaw,0,.04);
    } else if (type === 'crest') {
      for (let index=-1; index<=1; index++) draw(ctx,'cone',index*.16,-.04,2.74+Math.abs(index)*.05,.13,.46,.13,index ? body : accent,ctx.p.yaw,0,index*.18);
    } else if (type === 'horn') {
      for (const side of [-1,1]) draw(ctx,'cone',side*.37,.00,2.64,.18,.64,.18,accent,ctx.p.yaw,0,side*.36);
    }
  }

  function drawFace(ctx, entry) {
    const id = entry.id;
    const body = ctx.ap.bodyColor;
    const accent = ctx.ap.accentColor;
    const paw = entry.colors.paw;
    const head = entry.model.head;

    if (['bird'].includes(head)) {
      const beak = id === 'crow' ? '#30343c' : id === 'owl' ? '#d8a64e' : '#e88942';
      draw(ctx,'cone',0,.72,1.91,.34,.58,.32,beak,ctx.p.yaw,Math.PI/2);
    } else if (head === 'platypus') {
      draw(ctx,'wedge',0,.70,1.82,.66,.22,.54,accent,ctx.p.yaw,0,0);
      draw(ctx,'cube',0,.86,1.80,.48,.06,.42,shade(accent,-25),ctx.p.yaw);
    } else if (head === 'frog') {
      for (const side of [-1,1]) {
        draw(ctx,'sphere',side*.34,.39,2.40,.28,.34,.28,body);
        draw(ctx,'sphere',side*.34,.61,2.42,.10,.13,.07,'#111827',ctx.p.yaw,0,0,.25);
      }
      draw(ctx,'capsule',0,.55,1.79,.62,.23,.36,paw,ctx.p.yaw,Math.PI/2);
    } else if (head === 'seal') {
      draw(ctx,'capsule',0,.55,1.82,.60,.32,.42,paw,ctx.p.yaw,Math.PI/2);
      draw(ctx,'sphere',0,.84,1.91,.15,.12,.13,'#252938');
      for (const side of [-1,1]) for (let index=-1; index<=1; index++) draw(ctx,'cube',side*(.30+index*.08),.79,1.84+index*.05,.30,.02,.02,'#eef6f7',ctx.p.yaw,0,side*.08);
    } else if (head === 'axolotl') {
      draw(ctx,'capsule',0,.48,1.88,.52,.24,.40,paw,ctx.p.yaw,Math.PI/2);
      draw(ctx,'sphere',0,.76,1.92,.12,.10,.11,accent);
    } else if (['fox','canine','deer','goat','alpaca','meerkat','possum'].includes(head)) {
      const length = head === 'alpaca' ? .70 : head === 'deer' || head === 'goat' ? .62 : .56;
      draw(ctx,'cone',0,.60,1.85,.40,length,.36,paw,ctx.p.yaw,Math.PI/2);
      draw(ctx,'sphere',0,.88,1.91,.15,.12,.13,shade(accent,-40));
    } else if (['rodent','mustelid','koala','sloth','primate','hedgehog'].includes(head)) {
      draw(ctx,'capsule',0,.52,1.84,.55,.30,.40,paw,ctx.p.yaw,Math.PI/2);
      draw(ctx,'sphere',0,.82,1.91,.14,.12,.13,shade(accent,-35));
    } else if (head === 'reptile') {
      draw(ctx,'capsule',0,.48,1.88,.62,.26,.42,paw,ctx.p.yaw,Math.PI/2);
      for (const side of [-1,1]) draw(ctx,'sphere',side*.39,.33,2.20,.17,.22,.17,accent,ctx.p.yaw,0,0,.25);
    }
  }

  function drawTail(ctx, entry) {
    const tail = entry.model.tail;
    const accent = ctx.ap.accentColor;
    const body = ctx.ap.bodyColor;
    if (tail === 'none') return;
    if (tail === 'puff' || tail === 'stub' || tail === 'bear' || tail === 'goat') {
      draw(ctx,'sphere',0,-.60,1.03,tail === 'puff' ? .43 : .28,tail === 'puff' ? .43 : .30,tail === 'puff' ? .43 : .30,accent);
    } else if (tail === 'brush' || tail === 'wolf') {
      draw(ctx,'capsule',.12,-.72,1.02,.34,1.10,.32,body,ctx.p.yaw,.18,.72);
      draw(ctx,'capsule',.18,-1.07,.76,.28,.58,.26,entry.id === 'arcticfox' ? '#ffffff' : accent,ctx.p.yaw,.18,.72);
    } else if (tail === 'ringed') {
      for (let index=0; index<5; index++) draw(ctx,'capsule',.13,-.62-index*.18,1.05-index*.12,.25,.38,.24,index%2 ? accent : body,ctx.p.yaw,.12,.74);
    } else if (tail === 'curl') {
      for (let index=0; index<5; index++) {
        const angle=index*.78;
        draw(ctx,'capsule',Math.sin(angle)*.36,-.62-Math.cos(angle)*.25,1.10+Math.sin(angle*.8)*.32,.17,.38,.17,index%2 ? accent : body,ctx.p.yaw,angle*.12,.55);
      }
    } else if (tail === 'feather') {
      for (let index=-1; index<=1; index++) draw(ctx,'wedge',index*.18,-.62,1.04,.22,.64,.12,index ? accent : body,ctx.p.yaw,.18,index*.18);
    } else if (tail === 'beaver') {
      draw(ctx,'wedge',0,-.78,.88,.54,.82,.16,accent,ctx.p.yaw,.20,0);
    } else if (tail === 'snowleopard') {
      for (let index=0; index<6; index++) draw(ctx,'capsule',Math.sin(index*.42)*.25,-.62-index*.18,1.02-index*.08,.20,.42,.19,index%2 ? accent : body,ctx.p.yaw,.10,.66);
    } else {
      const length = ['otter','ferret','alpaca'].includes(tail) ? 1.10 : .88;
      draw(ctx,'capsule',.08,-.70,1.02,.19,length,.18,accent,ctx.p.yaw,.12,.68);
    }
  }

  function drawLimbs(ctx, entry) {
    const limb = entry.model.firstPersonLimb;
    const paw = entry.colors.paw;
    const accent = ctx.ap.accentColor;
    if (limb === 'wing') {
      for (const side of [-1,1]) {
        draw(ctx,'wedge',side*.70,.18,1.40,.38,.82,.15,ctx.ap.bodyColor,ctx.p.yaw,0,side*.38);
        for (let index=0; index<3; index++) draw(ctx,'wedge',side*(.73+index*.06),.25-index*.05,1.20-index*.12,.16,.46,.09,index%2 ? accent : paw,ctx.p.yaw,0,side*(.48+index*.08));
      }
    } else if (limb === 'flipper') {
      for (const side of [-1,1]) draw(ctx,'capsule',side*.69,.18,1.28,.25,.78,.18,accent,ctx.p.yaw,0,side*.42);
    } else if (limb === 'hoof') {
      for (const side of [-1,1]) {
        draw(ctx,'cube',side*.25,.12,.10,.37,.20,.46,shade(accent,-35),ctx.p.yaw);
        draw(ctx,'cube',side*.55,.45,1.14,.25,.26,.25,shade(accent,-28),ctx.p.yaw);
      }
    } else if (limb === 'claw') {
      for (const side of [-1,1]) for (let index=-1; index<=1; index++) draw(ctx,'cone',side*.49+index*.07,.55,1.14,.035,.15,.035,'#fff1d8',ctx.p.yaw,Math.PI/2);
    } else if (limb === 'webbed-paw') {
      for (const side of [-1,1]) for (let index=-1; index<=1; index++) draw(ctx,'wedge',side*.49+index*.06,.53,1.13,.08,.16,.04,paw,ctx.p.yaw,0,side*.12);
    }
  }

  function drawMarkings(ctx, entry) {
    const id = entry.id;
    const accent = ctx.ap.accentColor;
    const paw = entry.colors.paw;
    const body = ctx.ap.bodyColor;

    if (id === 'penguin') {
      draw(ctx,'capsule',0,.34,1.42,.64,.88,.28,paw,ctx.p.yaw);
      draw(ctx,'wedge',0,.61,1.90,.34,.48,.30,'#e89a3d',ctx.p.yaw,Math.PI/2);
    } else if (id === 'crow') {
      draw(ctx,'cone',0,.69,1.91,.31,.54,.30,'#323846',ctx.p.yaw,Math.PI/2);
      draw(ctx,'wedge',0,-.08,2.68,.28,.50,.18,accent,ctx.p.yaw,0,.04);
    } else if (id === 'arcticfox') {
      draw(ctx,'capsule',0,.46,1.85,.55,.29,.42,'#ffffff',ctx.p.yaw,Math.PI/2);
    } else if (id === 'capybara') {
      for (const side of [-1,1]) draw(ctx,'sphere',side*.48,.26,1.92,.20,.24,.18,accent);
    } else if (id === 'axolotl') {
      for (const side of [-1,1]) for (let index=-1; index<=1; index++) draw(ctx,'capsule',side*(.55+Math.abs(index)*.05),-.01,2.13+index*.24,.10,.48,.08,accent,ctx.p.yaw,0,side*(.58+index*.10));
    } else if (id === 'otter') {
      draw(ctx,'capsule',0,.48,1.83,.54,.28,.42,paw,ctx.p.yaw,Math.PI/2);
      draw(ctx,'capsule',0,.32,1.35,.62,.76,.28,shade(paw,18),ctx.p.yaw);
    } else if (id === 'wolf') {
      draw(ctx,'wedge',0,.44,2.30,.50,.46,.14,accent,ctx.p.yaw);
      draw(ctx,'capsule',0,.42,1.42,.56,.68,.25,paw,ctx.p.yaw);
    } else if (id === 'deer') {
      for (let side of [-1,1]) for (let index=0; index<3; index++) draw(ctx,'sphere',side*(.27+index*.11),-.02,2.18-index*.16,.08,.08,.05,paw);
      for (let index=-2; index<=2; index++) draw(ctx,'sphere',index*.15,-.18,1.45+Math.abs(index)*.10,.08,.08,.05,paw);
    } else if (id === 'koala') {
      draw(ctx,'capsule',0,.50,1.87,.48,.33,.36,paw,ctx.p.yaw,Math.PI/2);
      draw(ctx,'sphere',0,.79,1.95,.20,.25,.16,'#30343d');
    } else if (id === 'hedgehog') {
      for (let row=0; row<3; row++) for (let index=-3; index<=3; index++) draw(ctx,'cone',index*.15,-.28-row*.12,1.10+row*.40+Math.abs(index)*.03,.12,.52,.12,accent,ctx.p.yaw,0,index*.08);
    } else if (id === 'squirrel') {
      draw(ctx,'capsule',0,.34,1.38,.55,.72,.24,paw,ctx.p.yaw);
    } else if (id === 'bat') {
      draw(ctx,'capsule',0,.38,1.35,.48,.65,.23,accent,ctx.p.yaw);
    } else if (id === 'owl') {
      for (const side of [-1,1]) {
        draw(ctx,'sphere',side*.27,.42,2.12,.31,.37,.12,paw,ctx.p.yaw,0,0,.15);
        draw(ctx,'sphere',side*.27,.55,2.13,.10,.12,.06,'#151927',ctx.p.yaw,0,0,.25);
      }
      draw(ctx,'cone',0,.67,1.89,.21,.38,.20,'#d8a64e',ctx.p.yaw,Math.PI/2);
    } else if (id === 'mouse') {
      for (const side of [-1,1]) draw(ctx,'sphere',side*.47,.03,2.38,.37,.37,.28,paw);
      draw(ctx,'sphere',0,.84,1.91,.13,.11,.12,'#e99aa7');
    } else if (id === 'hamster') {
      for (const side of [-1,1]) draw(ctx,'sphere',side*.44,.34,1.92,.25,.28,.18,paw);
      draw(ctx,'capsule',0,.31,1.39,.55,.69,.24,paw,ctx.p.yaw);
    } else if (id === 'ferret') {
      draw(ctx,'capsule',0,.44,2.08,.72,.27,.11,accent,ctx.p.yaw,Math.PI/2);
      draw(ctx,'capsule',0,.34,1.38,.50,.73,.22,paw,ctx.p.yaw);
    } else if (id === 'duck') {
      draw(ctx,'wedge',0,.72,1.87,.52,.23,.45,accent,ctx.p.yaw);
      draw(ctx,'capsule',0,.31,1.40,.58,.78,.24,paw,ctx.p.yaw);
    } else if (id === 'seal') {
      draw(ctx,'capsule',0,.28,1.38,.62,.80,.26,paw,ctx.p.yaw);
    } else if (id === 'polarbear') {
      draw(ctx,'capsule',0,.49,1.82,.58,.34,.45,'#ffffff',ctx.p.yaw,Math.PI/2);
    } else if (id === 'sloth') {
      draw(ctx,'capsule',0,.43,2.09,.75,.31,.12,accent,ctx.p.yaw,Math.PI/2);
      for (const side of [-1,1]) draw(ctx,'sphere',side*.26,.53,2.10,.10,.13,.06,'#f2e1c9');
    } else if (id === 'chameleon') {
      for (const side of [-1,1]) draw(ctx,'sphere',side*.39,.34,2.22,.19,.22,.18,accent,ctx.p.yaw,0,0,.2);
      for (let index=-2; index<=2; index++) draw(ctx,'sphere',index*.15,.34,1.45+Math.abs(index)*.08,.09,.09,.07,index%2 ? accent : paw);
    } else if (id === 'beaver') {
      for (const side of [-1,1]) draw(ctx,'cube',side*.10,.79,1.70,.12,.23,.08,'#fff7df',ctx.p.yaw);
    } else if (id === 'goat') {
      draw(ctx,'wedge',0,.40,1.60,.25,.52,.18,paw,ctx.p.yaw,0,0);
    } else if (id === 'possum') {
      draw(ctx,'wedge',0,.46,2.12,.70,.25,.10,paw,ctx.p.yaw,Math.PI/2);
      draw(ctx,'sphere',0,.88,1.92,.14,.12,.12,'#e8a7ad');
    } else if (id === 'lemur') {
      draw(ctx,'capsule',0,.43,2.08,.75,.29,.11,accent,ctx.p.yaw,Math.PI/2);
      draw(ctx,'capsule',0,.32,1.39,.56,.72,.24,paw,ctx.p.yaw);
    } else if (id === 'alpaca') {
      for (let index=-2; index<=2; index++) draw(ctx,'sphere',index*.18,-.02,2.47-Math.abs(index)*.06,.28,.31,.25,paw);
      for (let row=0; row<2; row++) for (let index=-2; index<=2; index++) draw(ctx,'sphere',index*.18,-.05,1.35+row*.35,.26,.28,.24,paw);
    } else if (id === 'meerkat') {
      draw(ctx,'capsule',0,.44,2.08,.70,.25,.10,accent,ctx.p.yaw,Math.PI/2);
      draw(ctx,'capsule',0,.31,1.38,.50,.73,.22,paw,ctx.p.yaw);
    } else if (id === 'platypus') {
      draw(ctx,'wedge',0,.72,1.82,.65,.22,.54,accent,ctx.p.yaw);
    } else if (id === 'tiger') {
      for (let index=-2; index<=2; index++) {
        draw(ctx,'wedge',index*.18,.39,2.25-Math.abs(index)*.08,.10,.35,.08,accent,ctx.p.yaw,0,index*.10);
        draw(ctx,'cube',index*.18,.45,1.45,.07,.46,.08,accent,ctx.p.yaw,0,index*.08);
      }
    } else if (id === 'snowleopard') {
      for (let row=0; row<3; row++) for (let index=-2; index<=2; index++) if ((row+index)%2===0) draw(ctx,'sphere',index*.20,.39,1.40+row*.35,.09,.07,.05,accent);
      for (const side of [-1,1]) draw(ctx,'sphere',side*.29,.47,2.10,.10,.08,.05,accent);
    }
  }

  function drawThirdPerson(ctx) {
    const entry = species(ctx.ap?.species);
    if (CORE_MODELED.has(entry.id)) return false;
    drawEars(ctx, entry);
    drawFace(ctx, entry);
    drawTail(ctx, entry);
    drawLimbs(ctx, entry);
    drawMarkings(ctx, entry);
    return true;
  }

  function drawAccessory(ctx) {
    const entry = species(ctx.ap?.species);
    const accessory = String(ctx.ap?.accessory || 'none');
    if (accessory === 'none') return true;
    const anchor = entry.anchors.accessory;
    const lateral = Number(anchor.position[0] || 0);
    const up = Number(anchor.position[1] || 2.82);
    const forward = Number(anchor.position[2] || 0);
    const scale = Number(anchor.scale || 1);
    const color = ctx.ap.accentColor;

    if (accessory === 'cap') {
      draw(ctx,'sphere',lateral,forward,up,.82*scale,.28*scale,.72*scale,color);
      draw(ctx,'cube',lateral,forward+.45*scale,up-.08*scale,.68*scale,.09*scale,.34*scale,color,ctx.p.yaw);
    } else if (accessory === 'headband') {
      draw(ctx,'cylinder',lateral,forward,up-.18*scale,.83*scale,.12*scale,.83*scale,color,ctx.p.yaw);
      draw(ctx,'wedge',lateral+.46*scale,forward-.08*scale,up-.18*scale,.22*scale,.40*scale,.12*scale,color,ctx.p.yaw,0,.36);
    } else if (accessory === 'bandana') {
      draw(ctx,'cylinder',0,-.01,1.63,.79,.15,.79,color,ctx.p.yaw);
      draw(ctx,'wedge',.18,-.57,1.54,.20,.48,.11,color,ctx.p.yaw,0,.35);
      draw(ctx,'wedge',-.12,-.60,1.52,.18,.42,.10,shade(color,-12),ctx.p.yaw,0,-.28);
    } else if (accessory === 'helmet') {
      draw(ctx,'sphere',lateral,forward,up-.14*scale,.88*scale,.45*scale,.78*scale,color,ctx.p.yaw);
      draw(ctx,'wedge',lateral,forward+.47*scale,up-.22*scale,.72*scale,.15*scale,.34*scale,shade(color,-30),ctx.p.yaw);
      draw(ctx,'cube',lateral,forward+.59*scale,up-.20*scale,.62*scale,.08*scale,.18*scale,'#8cecf4',ctx.p.yaw,0,0,.35);
    } else if (accessory === 'headphones') {
      for (const side of [-1,1]) draw(ctx,'sphere',lateral+side*.57*scale,forward,up-.42*scale,.18*scale,.42*scale,.19*scale,'#64e8ea');
      draw(ctx,'cylinder',lateral,forward,up-.04*scale,.08*scale,1.10*scale,.08*scale,'#262b4c',ctx.p.yaw,0,Math.PI/2);
    } else if (accessory === 'antenna' || accessory === 'antennas') {
      const sides = accessory === 'antennas' ? [-1,1] : [0];
      for (const side of sides) {
        draw(ctx,'cylinder',lateral+side*.22*scale,forward,up+.20*scale,.06*scale,.56*scale,.06*scale,color,ctx.p.yaw,0,side*.18);
        draw(ctx,'sphere',lateral+side*.27*scale,forward,up+.51*scale,.14*scale,.14*scale,.14*scale,'#63dff5',ctx.p.yaw,0,0,.75);
      }
    } else if (accessory === 'crown') {
      for (let index=-2; index<=2; index++) draw(ctx,'cone',lateral+index*.17*scale,forward,up+.05*scale,.12*scale,(index%2 ? .36 : .48)*scale,.12*scale,'#ffd36f',ctx.p.yaw,0,index*.05,0.25);
      draw(ctx,'cylinder',lateral,forward,up-.10*scale,.70*scale,.13*scale,.70*scale,'#d9a62e',ctx.p.yaw);
    }
    return true;
  }

  function drawFirstPerson(ctx) {
    const entry = species(ctx.ap?.species);
    const limb = entry.model.firstPersonLimb;
    const points = [ctx.leftPaw, ctx.rightPaw];
    const accent = ctx.ap.accentColor;
    const paw = entry.colors.paw;
    const renderer = ctx.renderer;
    const yaw = ctx.p.yaw;
    const pitch = -ctx.p.pitch;

    const tip = (point, side, mesh, sx, sy, sz, color, offset = .10, rz = 0) => {
      renderer.draw(mesh,
        point[0] + ctx.f[0]*offset + ctx.r[0]*side*.03,
        point[1] + ctx.f[1]*offset + ctx.r[1]*side*.03,
        point[2] + ctx.f[2]*offset + ctx.r[2]*side*.03,
        sx,sy,sz,color,yaw,pitch,rz);
    };

    points.forEach((point, hand) => {
      const handSide = hand ? 1 : -1;
      if (limb === 'hoof') {
        tip(point,handSide,'cube',.18,.10,.16,shade(accent,-35),.08);
        tip(point,handSide,'cube',.06,.11,.17,'#2d3038',.15,-.05);
      } else if (limb === 'wing') {
        for (let feather=-1; feather<=1; feather++) tip(point,handSide,'wedge',.10,.24,.06,feather ? accent : paw,.10+feather*.025,handSide*(.25+feather*.06));
      } else if (limb === 'flipper') {
        tip(point,handSide,'capsule',.22,.12,.34,accent,.10,handSide*.18);
      } else if (limb === 'webbed-paw') {
        for (let digit=-1; digit<=1; digit++) tip(point,handSide,'wedge',.07,.14,.04,paw,.11+digit*.01,handSide*(.12+digit*.03));
      } else if (limb === 'claw' || PREDATORS.has(entry.id)) {
        for (let digit=-1; digit<=1; digit++) tip(point,handSide,'cone',.035,.12,.035,'#fff1d8',.13+digit*.005,Math.PI/2);
      } else if (entry.id === 'hedgehog') {
        for (let digit=-1; digit<=1; digit++) tip(point,handSide,'cone',.04,.13,.04,accent,.09+digit*.01,Math.PI/2);
      } else {
        tip(point,handSide,'sphere',.11,.09,.07,accent,.10);
      }
    });
    return true;
  }

  function previewDataUri(id) {
    const entry = species(id);
    const body = entry.colors.body;
    const accent = entry.colors.accent;
    const paw = entry.colors.paw;
    const ear = entry.model.ears;
    const head = entry.model.head;
    const tail = entry.model.tail;
    const safeName = entry.name.replace(/[&<>"']/g, '');

    const earSvg = (() => {
      if (ear === 'upright') return `<ellipse cx="78" cy="49" rx="15" ry="34" fill="${accent}" transform="rotate(-12 78 49)"/><ellipse cx="142" cy="49" rx="15" ry="34" fill="${accent}" transform="rotate(12 142 49)"/>`;
      if (ear === 'triangle' || ear === 'bat') return `<path d="M60 72 76 25 96 76Z" fill="${accent}"/><path d="M124 76 144 25 160 72Z" fill="${accent}"/>`;
      if (ear === 'floppy') return `<ellipse cx="68" cy="78" rx="18" ry="39" fill="${accent}" transform="rotate(26 68 78)"/><ellipse cx="152" cy="78" rx="18" ry="39" fill="${accent}" transform="rotate(-26 152 78)"/>`;
      if (ear === 'antler') return `<path d="M77 60 67 28M69 42 55 33M70 49 84 34M143 60 153 28M151 42 165 33M150 49 136 34" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>`;
      if (ear === 'gills') return `<path d="M67 73 43 53M65 82 38 82M67 91 43 111M153 73 177 53M155 82 182 82M153 91 177 111" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>`;
      if (ear === 'horn') return `<path d="M78 61 67 27 91 53ZM142 61 153 27 129 53Z" fill="${accent}"/>`;
      if (ear === 'crest' || ear === 'crow') return `<path d="M92 58 100 24 110 54 120 20 130 59Z" fill="${accent}"/>`;
      if (ear === 'none' || ear === 'duck' || ear === 'penguin') return '';
      return `<circle cx="72" cy="65" r="22" fill="${accent}"/><circle cx="148" cy="65" r="22" fill="${accent}"/>`;
    })();

    const faceSvg = head === 'bird'
      ? `<path d="M94 103 110 123 126 103Z" fill="#e89a3d"/>`
      : head === 'platypus'
        ? `<rect x="75" y="100" width="70" height="25" rx="12" fill="${accent}"/>`
        : `<ellipse cx="110" cy="108" rx="38" ry="25" fill="${paw}"/><ellipse cx="110" cy="101" rx="8" ry="6" fill="#292741"/>`;

    const tailSvg = tail === 'ringed' || tail === 'snowleopard'
      ? `<path d="M164 165c43 2 40 48 10 47-23 0-20-25-4-26" fill="none" stroke="${accent}" stroke-width="15" stroke-linecap="round"/>`
      : tail === 'brush' || tail === 'wolf' || tail === 'curl'
        ? `<path d="M164 164c48-16 47 37 15 43" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>`
        : tail === 'beaver'
          ? `<ellipse cx="178" cy="185" rx="18" ry="34" fill="${accent}" transform="rotate(-30 178 185)"/>`
          : '';

    const markings = entry.id === 'tiger'
      ? `<path d="M78 82 96 95M142 82 124 95M84 136 101 145M136 136 119 145" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`
      : entry.id === 'snowleopard'
        ? `<g fill="${accent}"><circle cx="80" cy="96" r="5"/><circle cx="140" cy="91" r="5"/><circle cx="91" cy="145" r="6"/><circle cx="130" cy="153" r="5"/></g>`
        : entry.id === 'owl'
          ? `<circle cx="88" cy="88" r="20" fill="${paw}"/><circle cx="132" cy="88" r="20" fill="${paw}"/>`
          : entry.id === 'penguin'
            ? `<ellipse cx="110" cy="148" rx="35" ry="47" fill="${paw}"/>`
            : '';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 240"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#202645"/><stop offset="1" stop-color="#0c1021"/></linearGradient></defs><rect width="220" height="240" rx="28" fill="url(#bg)"/><circle cx="110" cy="118" r="84" fill="#64e8ea" opacity=".08"/>${tailSvg}${earSvg}<ellipse cx="110" cy="154" rx="61" ry="65" fill="${body}"/><ellipse cx="110" cy="88" rx="61" ry="52" fill="${body}"/>${markings}<circle cx="88" cy="86" r="7" fill="#141827"/><circle cx="132" cy="86" r="7" fill="#141827"/>${faceSvg}<path d="M76 157h68v39c-18 15-50 15-68 0Z" fill="${entry.colors.vest}"/><text x="110" y="224" fill="#f5f8ff" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="800">${safeName}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function validateModels() {
    const errors = [];
    for (const id of catalog.speciesOrder) {
      const entry = species(id);
      const shape = proportions(id);
      const fp = firstPersonProfile(id);
      if (!entry.model.head || !entry.model.ears || !entry.model.tail || !entry.model.firstPersonLimb) errors.push(`${id}: incomplete model recipe`);
      if (![shape.headWide,shape.headTall,shape.headDeep,shape.bodyScale].every(Number.isFinite)) errors.push(`${id}: invalid proportions`);
      if (!fp.pawMesh || !Number.isFinite(fp.pawW) || !Number.isFinite(fp.pawH)) errors.push(`${id}: invalid first-person model`);
      if (!previewDataUri(id).startsWith('data:image/svg+xml')) errors.push(`${id}: invalid preview`);
    }
    return Object.freeze({ ok: errors.length === 0, errors, count: catalog.speciesOrder.length });
  }

  const api = Object.freeze({
    version: '1.0.0-all-39',
    proportions,
    firstPersonProfile,
    drawThirdPerson,
    drawAccessory,
    drawFirstPerson,
    previewDataUri,
    validateModels
  });

  window.CritterSpeciesModels = api;
  window.__CRITTER_SPECIES_MODEL_REPORT__ = api.validateModels();
  if (!window.__CRITTER_SPECIES_MODEL_REPORT__.ok) console.error('[Issue #62] Species model validation failed.', window.__CRITTER_SPECIES_MODEL_REPORT__.errors);
  window.dispatchEvent(new CustomEvent('critter:species-models-ready', { detail: window.__CRITTER_SPECIES_MODEL_REPORT__ }));
})();

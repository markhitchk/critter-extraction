(() => {
  'use strict';

  const CORE_PATH = /(?:^|\/)core\/game\/game-core\.js(?:[?#]|$)/;

  const warn = label => console.warn(`[Critter Graphics] Could not apply ${label}; the base game remains usable.`);

  const replaceOnce = (source, find, replacement, label) => {
    if (!source.includes(find)) {
      warn(label);
      return source;
    }
    return source.replace(find, replacement);
  };

  const replaceSection = (source, start, end, replacement, label) => {
    const startIndex = source.indexOf(start);
    if (startIndex < 0) {
      warn(label);
      return source;
    }
    const endIndex = source.indexOf(end, startIndex + start.length);
    if (endIndex < 0) {
      warn(label);
      return source;
    }
    return source.slice(0, startIndex) + replacement + source.slice(endIndex + end.length);
  };

  const enhancedFragmentShader = `precision mediump float;
  varying vec3 vN;
  varying vec3 vW;
  uniform vec4 uColor;
  uniform vec3 uLight;
  uniform vec3 uCamera;
  uniform vec3 uFogColor;
  uniform float uFog;
  uniform float uEmissive;
  void main(){
    vec3 n=normalize(vN);
    vec3 l=normalize(-uLight);
    vec3 v=normalize(uCamera-vW);
    vec3 h=normalize(l+v);
    float rawLight=dot(n,l);
    float wrapped=clamp((rawLight+.34)/1.34,0.0,1.0);
    float toon=floor(wrapped*5.0+.18)/4.0;
    float sky=.5+.5*n.y;
    float ground=.5-.5*n.y;
    float rim=pow(1.0-max(dot(n,v),0.0),2.05);
    float spec=pow(max(dot(n,h),0.0),26.0)*(.10+.24*max(rawLight,0.0));
    float heightLift=clamp(vW.y/6.0,0.0,1.0);
    float shade=.30+toon*.50+sky*.16-ground*.025+rim*.15+heightLift*.025;
    vec3 warm=vec3(1.0,.92,.74)*max(rawLight,0.0)*.065;
    vec3 cool=vec3(.18,.32,.48)*(1.0-max(rawLight,0.0))*.055;
    vec3 col=uColor.rgb*shade+warm+cool+vec3(spec)+uColor.rgb*uEmissive*.58;
    col+=vec3(.045,.075,.11)*rim;
    float distanceFog=clamp(length(vW-uCamera)*uFog,0.0,.92);
    float heightFog=clamp((1.55-vW.y)*uFog*1.55,0.0,.15);
    float fogAmount=clamp(distanceFog+heightFog,0.0,.94);
    col=mix(col,uFogColor,fogAmount);
    col=pow(max(col,vec3(0.0)),vec3(.92));
    col=(col-.5)*1.055+.5;
    gl_FragColor=vec4(col,uColor.a);
  }`;

  const enhancedAtmosphereFunction = `  function drawEnhancedAtmosphere(p,map,gp){
    const settings=activeAccount().settings;
    if(!p||gp.key==='low'||settings.compatibilityMode||settings.reducedMotion)return;
    const time=performance.now()*.001,seed=((world.seed||1)%997)*.017,count=gp.key==='high'?30:12;
    for(let i=0;i<count;i++){
      const base=i*2.399963+seed,orbit=base+time*(i%3===0?.055:.022),radius=4.5+(i%10)*2.35;
      const x=p.x+Math.sin(orbit)*radius,z=p.z+Math.cos(orbit*.91)*radius,y=.38+(i%7)*.22+Math.sin(time*.72+base)*.18;
      const size=gp.key==='high'?(i%4===0?.09:.055):.045,color=i%5===0?[.40,1,.88,.30]:[1,.93,.62,.24];
      renderer.draw('sphere',x,y,z,size,size,size,color,0,0,0,.75);
    }
    if(gp.key==='high'&&world.extract){
      for(let i=0;i<9;i++){
        const a=i/9*Math.PI*2+time*.08,rad=2.2+(i%3)*.55,y=.45+(i%4)*.34+Math.sin(time+i)*.12;
        renderer.draw('sphere',world.extract.x+Math.sin(a)*rad,y,world.extract.z+Math.cos(a)*rad,.075,.075,.075,[1,.72,.28,.30],0,0,0,.9);
      }
    }
  }

`;

  const enhancedEffectFunction = `  function drawEffect(fx){
    const profile=graphicsProfile();
    if(fx.type==='tracer'){
      const x=fx.x+fx.dx*fx.len/2,y=fx.y+fx.dy*fx.len/2,z=fx.z+fx.dz*fx.len/2,yaw=Math.atan2(fx.dx,fx.dz),pitch=-Math.asin(clamp(fx.dy,-1,1)),color=fx.color||'#fff4aa';
      if(profile.key!=='low'){const glow=hexColor(color);renderer.draw('cube',x,y,z,.085,.085,fx.len,[glow[0],glow[1],glow[2],.20],yaw,pitch,0,.65);}
      renderer.draw('cube',x,y,z,.035,.035,fx.len,color,yaw,pitch,0,1);
    }else if(fx.type==='impact'){
      const s=Math.max(.05,fx.life*1.8),color=fx.color||'#fff';
      renderer.draw('sphere',fx.x,fx.y,fx.z,s,s,s,color,0,0,0,1);
      if(profile.key!=='low'){
        const glow=hexColor(color),sparks=profile.key==='high'?7:4,reach=.18+Math.max(0,.5-fx.life)*.85;
        renderer.draw('sphere',fx.x,fx.y,fx.z,s*1.75,s*1.75,s*1.75,[glow[0],glow[1],glow[2],.16],0,0,0,.8);
        for(let i=0;i<sparks;i++){
          const a=i/sparks*Math.PI*2+fx.x*.17+fx.z*.11,up=.12+(i%3)*.08;
          renderer.draw('cube',fx.x+Math.sin(a)*reach,fx.y+up+Math.cos(a*1.7)*.07,fx.z+Math.cos(a)*reach,.025,.025,.18,[glow[0],glow[1],glow[2],.72],a,0,0,1);
        }
      }
    }
  }`;

  function patchCoreSource(source) {
    if (typeof source !== 'string' || !source.includes('class Renderer')) return source;
    let patched = source;

    patched = replaceSection(
      patched,
      "    high: {\n      key: 'high',",
      "\n    }\n  };",
      `    high: {\n      key: 'high', sphereLat: 22, sphereLon: 30, cylinderSides: 24, coneSides: 20, capsuleRings: 6, capsuleSides: 20, crystalSides: 10,\n      patchStep: 5.5, secondaryCanopy: true, extraCharacterParts: true,\n      label: 'HIGH DETAIL', note: 'High adds smoother cartoon models, enhanced lighting, denser terrain detail, atmospheric particles, brighter effects, and sharper rendering.'\n    }\n  };`,
      'high-detail geometry profile'
    );

    patched = replaceOnce(
      patched,
      "    const profile = GRAPHICS_PROFILES[value] || GRAPHICS_PROFILES.medium;\n    if (dom.graphicsDetailText) dom.graphicsDetailText.textContent = profile.note;",
      "    const profile = GRAPHICS_PROFILES[value] || GRAPHICS_PROFILES.medium;\n    document.documentElement.dataset.graphicsQuality = profile.key;\n    if (dom.graphicsDetailText) dom.graphicsDetailText.textContent = profile.note;",
      'quality-state synchronization'
    );

    patched = replaceSection(
      patched,
      '      const fs=`',
      '`;\n      this.program=this.createProgram',
      `      const fs=\`${enhancedFragmentShader}\`;\n      this.program=this.createProgram`,
      'enhanced WebGL material shader'
    );

    patched = replaceOnce(
      patched,
      '      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);\n      this.resize();',
      '      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DITHER);gl.depthFunc(gl.LEQUAL);\n      this.resize();',
      'renderer quality flags'
    );

    patched = replaceSection(
      patched,
      '    resize(){const compat=',
      '\n    begin(camera){',
      "    resize(){const compat=!!activeAccount().settings.compatibilityMode,scale=compat?Math.min(.9,activeAccount().settings.renderScale||.85):(activeAccount().settings.renderScale||1),quality=activeAccount().settings.quality,dpr=Math.min(devicePixelRatio||1,compat?1.1:(quality==='high'?2.2:quality==='medium'?1.55:1.2));const w=Math.max(2,Math.floor(this.canvas.clientWidth*dpr*scale)),h=Math.max(2,Math.floor(this.canvas.clientHeight*dpr*scale));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);}\n    begin(camera){",
      'higher-resolution WebGL scaling'
    );

    patched = replaceSection(
      patched,
      '    begin(camera){',
      '\n    draw(meshName',
      "    begin(camera){this.resize();const gl=this.gl,map=world?.map||{},sky=hexColor(map.skyTop||'#59a8d1'),horizon=hexColor(map.skyHorizon||'#8acbd0'),quality=graphicsProfile().key,time=performance.now()*.00005,clearMix=quality==='high'?.22:.30,clear=[lerp(sky[0],horizon[0],clearMix),lerp(sky[1],horizon[1],clearMix),lerp(sky[2],horizon[2],clearMix)],fogColor=[lerp(horizon[0],.52,.22),lerp(horizon[1],.75,.22),lerp(horizon[2],.78,.22)];gl.clearColor(clear[0],clear[1],clear[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.camera=camera;this.view=M4.lookAt(camera.eye,camera.target);this.proj=M4.perspective(camera.fov*Math.PI/180,this.canvas.width/this.canvas.height,.05,150);this.proj[0]*=-1;gl.useProgram(this.program);gl.uniform3f(this.loc.light,-.42+Math.sin(time)*.055,-1,-.22+Math.cos(time)*.045);gl.uniform3fv(this.loc.camera,camera.eye);gl.uniform3fv(this.loc.fogColor,fogColor);gl.uniform1f(this.loc.fog,activeAccount().settings.fogEnabled?(quality==='high'?.0095:quality==='medium'?.011:.013):0);}\n    draw(meshName",
      'regional lighting and atmosphere'
    );

    patched = replaceOnce(
      patched,
      '  function drawWorld() {',
      enhancedAtmosphereFunction + '  function drawWorld() {',
      'ambient particle renderer'
    );

    patched = replaceOnce(
      patched,
      '    for(const fx of world.effects)drawEffect(fx);',
      '    drawEnhancedAtmosphere(p,map,gp);for(const fx of world.effects)drawEffect(fx);',
      'atmosphere draw pass'
    );

    patched = replaceSection(
      patched,
      '  function drawEffect(fx){',
      '\n  function updateEffects',
      enhancedEffectFunction + '\n  function updateEffects',
      'enhanced tracer and impact effects'
    );

    patched = patched
      .replace('`WEBGL • ${graphicsProfile().label}`', '`WEBGL • ${graphicsProfile().label}${graphicsProfile().key===\'high\'?\' • ENHANCED\':\'\'}`')
      .replace('`${engine} • ${profile.label}`', '`${engine} • ${profile.label}${profile.key===\'high\'?\' • ENHANCED\':\'\'}`');

    return patched;
  }

  function enhanceSettingsControls() {
    const renderScale = document.getElementById('renderScale');
    if (renderScale) {
      for (const [value, label] of [['1.15', '115% — sharper'], ['1.25', '125% — cinematic']]) {
        if (renderScale.querySelector(`option[value="${value}"]`)) continue;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        renderScale.appendChild(option);
      }
    }

    const quality = document.getElementById('quality');
    const high = quality?.querySelector('option[value="high"]');
    const highLabel = 'High — enhanced lighting & detail';
    if (high && high.textContent !== highLabel) high.textContent = highLabel;
  }

  function initializeVisualLayer() {
    // The settings controls are already present in the canonical page. Run
    // once instead of observing the entire document, which previously let a
    // label update trigger its own MutationObserver forever during startup.
    enhanceSettingsControls();
  }

  window.CritterGraphicsEnhancements = Object.freeze({
    corePath: CORE_PATH,
    patchCoreSource
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeVisualLayer, { once: true });
  else initializeVisualLayer();
})();

(() => {
  'use strict';

  const upstreamFetch = window.fetch.bind(window);
  const DIRT_TEXTURE = './assets/textures/terrain/pine_valley/dirt_basecolor.webp';

  function replaceRequired(source, find, replacement, label) {
    if (!source.includes(find)) {
      console.warn(`High-end terrain patch skipped: ${label}`);
      return source;
    }
    return source.replace(find, replacement);
  }

  function patchTerrainSource(source) {
    const oldFragment = "      const fs=`precision mediump float;varying vec3 vN;varying vec3 vW;uniform vec4 uColor;uniform vec3 uLight;uniform vec3 uCamera;uniform vec3 uFogColor;uniform float uFog;uniform float uEmissive;void main(){vec3 n=normalize(vN);vec3 l=normalize(-uLight);vec3 v=normalize(uCamera-vW);float diff=max(dot(n,l),0.0);float band=floor(diff*3.0+.5)/3.0;float hemi=.5+.5*n.y;float rim=pow(1.0-max(dot(n,v),0.0),1.7);float shade=.38+band*.43+hemi*.12+rim*.18+uEmissive;vec3 col=uColor.rgb*shade+vec3(.04,.065,.09)*rim;float fd=clamp(length(vW-uCamera)*uFog,0.0,.88);col=mix(col,uFogColor,fd);gl_FragColor=vec4(col,uColor.a);}`;";
    const newFragment = "      const fs=`precision mediump float;varying vec3 vN;varying vec3 vW;uniform vec4 uColor;uniform vec3 uLight;uniform vec3 uCamera;uniform vec3 uFogColor;uniform float uFog;uniform float uEmissive;uniform sampler2D uGroundTexture;uniform float uUseGroundTexture;void main(){vec3 n=normalize(vN);vec3 l=normalize(-uLight);vec3 v=normalize(uCamera-vW);float diff=max(dot(n,l),0.0);float band=floor(diff*3.0+.5)/3.0;float hemi=.5+.5*n.y;float rim=pow(1.0-max(dot(n,v),0.0),1.7);float shade=.38+band*.43+hemi*.12+rim*.18+uEmissive;vec3 dirt=texture2D(uGroundTexture,vW.xz*.075).rgb;vec3 base=mix(uColor.rgb,dirt,uUseGroundTexture*.78);vec3 col=base*shade+vec3(.04,.065,.09)*rim;float fd=clamp(length(vW-uCamera)*uFog,0.0,.88);col=mix(col,uFogColor,fd);gl_FragColor=vec4(col,uColor.a);}`;";
    source = replaceRequired(source, oldFragment, newFragment, 'textured terrain fragment shader');

    const oldLocationEnd = "emissive:gl.getUniformLocation(this.program,'uEmissive')};";
    const newLocationEnd = "emissive:gl.getUniformLocation(this.program,'uEmissive'),groundTexture:gl.getUniformLocation(this.program,'uGroundTexture'),useGroundTexture:gl.getUniformLocation(this.program,'uUseGroundTexture')};";
    source = replaceRequired(source, oldLocationEnd, newLocationEnd, 'terrain shader uniform locations');

    const oldBlend = "      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);\n      this.resize();";
    const newBlend = `      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);\n      this.groundPass=false;this.groundTextureReady=false;this.groundTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.groundTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([108,78,51,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(this.loc.groundTexture,0);const groundImage=new Image();groundImage.decoding='async';groundImage.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,this.groundTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,groundImage);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);this.groundTextureReady=true;document.documentElement.dataset.pineDirtTexture='ready';};groundImage.onerror=()=>{document.documentElement.dataset.pineDirtTexture='fallback';};groundImage.src='${DIRT_TEXTURE}';\n      this.resize();`;
    source = replaceRequired(source, oldBlend, newBlend, 'terrain texture initialization');

    const oldBeginProgram = "gl.useProgram(this.program);gl.uniform3f(this.loc.light,-.4,-1,-.25);";
    const newBeginProgram = "gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.groundTexture);gl.uniform1i(this.loc.groundTexture,0);gl.uniform1f(this.loc.useGroundTexture,0);gl.uniform3f(this.loc.light,-.4,-1,-.25);";
    source = replaceRequired(source, oldBeginProgram, newBeginProgram, 'terrain texture frame binding');

    const oldDrawUniforms = "gl.uniform4fv(this.loc.color,c);gl.uniform1f(this.loc.emissive,emissive);";
    const newDrawUniforms = "gl.uniform4fv(this.loc.color,c);gl.uniform1f(this.loc.emissive,emissive);gl.uniform1f(this.loc.useGroundTexture,this.groundTextureReady&&this.groundPass?1:0);";
    source = replaceRequired(source, oldDrawUniforms, newDrawUniforms, 'terrain texture draw selection');

    const oldEnd = '    end(){}';
    const newEnd = "    drawGround(...args){this.groundPass=world?.map?.id==='pine-valley';try{return this.draw(...args);}finally{this.groundPass=false;this.gl.uniform1f(this.loc.useGroundTexture,0);}}\n    end(){}";
    source = replaceRequired(source, oldEnd, newEnd, 'textured ground draw method');

    const oldTiles = "renderer.draw('cube',x,-.035,z,tile,.03,tile,c);";
    const newTiles = "renderer.drawGround('cube',x,-.035,z,tile,.03,tile,c);";
    source = replaceRequired(source, oldTiles, newTiles, 'textured terrain tiles');

    const oldPatches = "for(const patch of map.terrainPatches||[])renderer.draw('cube',patch.x,-.012,patch.z,patch.w,.018,patch.d,patch.color,patch.rot||0);";
    const newPatches = "for(const patch of map.terrainPatches||[])renderer.drawGround('cube',patch.x,-.012,patch.z,patch.w,.018,patch.d,patch.color,patch.rot||0);";
    source = replaceRequired(source, oldPatches, newPatches, 'textured terrain patches');

    return source;
  }

  window.fetch = async function(input, init) {
    const response = await upstreamFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!/core\/game\/game-core\.js(?:[?#]|$)/.test(url)) return response;
    const source = patchTerrainSource(await response.text());
    return new Response(source, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  window.HarleyHighEndTerrainPatches = Object.freeze({
    dirtTexture: DIRT_TEXTURE,
    patchTerrainSource
  });
})();

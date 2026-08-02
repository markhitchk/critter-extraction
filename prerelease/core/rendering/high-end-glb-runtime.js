(() => {
  'use strict';

  const ASSETS = Object.freeze({
    'weapon.pea_popper': './assets/models/weapons/pea_popper/pea_popper_lod0.glb',
    'loot.supply_crate': './assets/models/loot/supply_crate/supply_crate.glb',
    'vegetation.pine_tree': './assets/models/vegetation/pine_tree/pine_tree_lod0.glb'
  });

  const nativeFetch = window.fetch.bind(window);
  const cache = new Map();
  const componentConstructors = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
  };
  const componentSizes = { 5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4 };
  const typeSizes = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT2:4, MAT3:9, MAT4:16 };

  const identity = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const multiply = (a,b) => {
    const out = new Array(16).fill(0);
    for (let c=0;c<4;c++) for (let r=0;r<4;r++) {
      out[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    }
    return out;
  };
  const quatMatrix = (q=[0,0,0,1]) => {
    const [x,y,z,w] = q, x2=x+x, y2=y+y, z2=z+z;
    const xx=x*x2, xy=x*y2, xz=x*z2, yy=y*y2, yz=y*z2, zz=z*z2;
    const wx=w*x2, wy=w*y2, wz=w*z2;
    return [
      1-(yy+zz), xy+wz, xz-wy, 0,
      xy-wz, 1-(xx+zz), yz+wx, 0,
      xz+wy, yz-wx, 1-(xx+yy), 0,
      0,0,0,1
    ];
  };
  const nodeMatrix = node => {
    if (Array.isArray(node?.matrix) && node.matrix.length===16) return node.matrix.slice();
    const t=node?.translation||[0,0,0], s=node?.scale||[1,1,1], m=quatMatrix(node?.rotation||[0,0,0,1]);
    m[0]*=s[0];m[1]*=s[0];m[2]*=s[0];
    m[4]*=s[1];m[5]*=s[1];m[6]*=s[1];
    m[8]*=s[2];m[9]*=s[2];m[10]*=s[2];
    m[12]=t[0];m[13]=t[1];m[14]=t[2];
    return m;
  };
  const transformPoint = (m,x,y,z) => [
    m[0]*x+m[4]*y+m[8]*z+m[12],
    m[1]*x+m[5]*y+m[9]*z+m[13],
    m[2]*x+m[6]*y+m[10]*z+m[14]
  ];
  const transformNormal = (m,x,y,z) => {
    const nx=m[0]*x+m[4]*y+m[8]*z, ny=m[1]*x+m[5]*y+m[9]*z, nz=m[2]*x+m[6]*y+m[10]*z;
    const length=Math.hypot(nx,ny,nz)||1;
    return [nx/length,ny/length,nz/length];
  };
  const gameAxes = ([x,y,z]) => [x,z,-y];

  function readAccessor(json, bin, accessorIndex) {
    const accessor=json.accessors?.[accessorIndex];
    if (!accessor) throw new Error(`Missing accessor ${accessorIndex}`);
    const view=json.bufferViews?.[accessor.bufferView];
    if (!view) throw new Error(`Accessor ${accessorIndex} has no buffer view`);
    const Ctor=componentConstructors[accessor.componentType], componentSize=componentSizes[accessor.componentType], itemSize=typeSizes[accessor.type];
    if (!Ctor || !componentSize || !itemSize) throw new Error(`Unsupported accessor ${accessorIndex}`);
    const count=accessor.count||0, stride=view.byteStride||itemSize*componentSize;
    const offset=(view.byteOffset||0)+(accessor.byteOffset||0);
    const output=new Ctor(count*itemSize);
    if (stride===itemSize*componentSize && offset%componentSize===0) {
      output.set(new Ctor(bin, offset, count*itemSize));
      return output;
    }
    const data=new DataView(bin);
    const readers={
      5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'
    };
    const reader=readers[accessor.componentType];
    for(let i=0;i<count;i++) for(let j=0;j<itemSize;j++) {
      const byteOffset=offset+i*stride+j*componentSize;
      output[i*itemSize+j]=componentSize===1?data[reader](byteOffset):data[reader](byteOffset,true);
    }
    return output;
  }

  function calculateNormals(positions, indices) {
    const normals=new Float32Array(positions.length);
    for(let i=0;i<indices.length;i+=3){
      const ia=indices[i]*3, ib=indices[i+1]*3, ic=indices[i+2]*3;
      const ax=positions[ia],ay=positions[ia+1],az=positions[ia+2];
      const bx=positions[ib],by=positions[ib+1],bz=positions[ib+2];
      const cx=positions[ic],cy=positions[ic+1],cz=positions[ic+2];
      const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      for(const p of [ia,ib,ic]){normals[p]+=nx;normals[p+1]+=ny;normals[p+2]+=nz;}
    }
    for(let i=0;i<normals.length;i+=3){const l=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=l;normals[i+1]/=l;normals[i+2]/=l;}
    return normals;
  }

  function parseGlb(buffer) {
    const view=new DataView(buffer);
    if (view.getUint32(0,true)!==0x46546c67) throw new Error('Not a GLB file');
    if (view.getUint32(4,true)!==2) throw new Error('Only GLB 2.0 is supported');
    let offset=12,json=null,bin=null;
    while(offset<buffer.byteLength){
      const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true),start=offset+8;
      if(type===0x4e4f534a) json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,start,length)).replace(/\0+$/,''));
      else if(type===0x004e4942) bin=buffer.slice(start,start+length);
      offset=start+length;
    }
    if(!json||!bin) throw new Error('GLB is missing JSON or binary data');
    const parts=[];
    const visit=(nodeIndex,parentMatrix) => {
      const node=json.nodes?.[nodeIndex]||{}, world=multiply(parentMatrix,nodeMatrix(node));
      if(Number.isInteger(node.mesh)){
        const mesh=json.meshes?.[node.mesh];
        for(const primitive of mesh?.primitives||[]){
          if((primitive.mode??4)!==4 || primitive.attributes?.POSITION===undefined) continue;
          const sourcePositions=readAccessor(json,bin,primitive.attributes.POSITION);
          const vertexCount=sourcePositions.length/3;
          let sourceNormals=primitive.attributes.NORMAL===undefined?null:readAccessor(json,bin,primitive.attributes.NORMAL);
          let indices=primitive.indices===undefined?Uint32Array.from({length:vertexCount},(_,i)=>i):readAccessor(json,bin,primitive.indices);
          if(vertexCount>65535) throw new Error('Authored mesh exceeds the WebGL1 16-bit vertex limit');
          const positions=new Float32Array(sourcePositions.length), normals=new Float32Array(sourcePositions.length);
          for(let i=0;i<vertexCount;i++){
            const p=gameAxes(transformPoint(world,sourcePositions[i*3],sourcePositions[i*3+1],sourcePositions[i*3+2]));
            positions.set(p,i*3);
            if(sourceNormals){const n=gameAxes(transformNormal(world,sourceNormals[i*3],sourceNormals[i*3+1],sourceNormals[i*3+2]));normals.set(n,i*3);}
          }
          if(!sourceNormals) normals.set(calculateNormals(positions,indices));
          const base=json.materials?.[primitive.material]?.pbrMetallicRoughness?.baseColorFactor||[0.78,0.78,0.78,1];
          parts.push({p:Array.from(positions),n:Array.from(normals),idx:Array.from(indices),color:base.slice(0,4)});
        }
      }
      for(const child of node.children||[]) visit(child,world);
    };
    const roots=json.scenes?.[json.scene||0]?.nodes||json.nodes?.map((_,i)=>i)||[];
    for(const nodeIndex of roots) visit(nodeIndex,identity());
    if(!parts.length) throw new Error('GLB contains no triangle primitives');
    return parts;
  }

  async function loadAsset(id,url=ASSETS[id]) {
    if(cache.has(id)) return cache.get(id);
    const promise=nativeFetch(url,{cache:'force-cache'}).then(response=>{
      if(!response.ok) throw new Error(`${id} failed with HTTP ${response.status}`);
      return response.arrayBuffer();
    }).then(parseGlb);
    cache.set(id,promise);
    return promise;
  }

  async function install(renderer) {
    if(!renderer?.installAuthoredGroup) return {loaded:0,failed:Object.keys(ASSETS).length};
    let loaded=0,failed=0;
    await Promise.all(Object.entries(ASSETS).map(async([id,url])=>{
      try{renderer.installAuthoredGroup(id,await loadAsset(id,url));loaded++;}
      catch(error){failed++;console.warn(`Authored asset unavailable: ${id}`,error);}
    }));
    document.documentElement.dataset.authoredAssets=String(loaded);
    window.dispatchEvent(new CustomEvent('critter-authored-assets-ready',{detail:{loaded,failed}}));
    return {loaded,failed};
  }

  function replaceRequired(source,find,replacement,label){
    if(!source.includes(find)){console.warn(`High-end asset patch skipped: ${label}`);return source;}
    return source.replace(find,replacement);
  }

  function patchGameSource(source){
    source=replaceRequired(source,
      "      this.meshes={cube:this.makeMesh(makeCubeData()),wedge:this.makeMesh(makeWedgeData())};",
      "      this.meshes={cube:this.makeMesh(makeCubeData()),wedge:this.makeMesh(makeWedgeData())};this.authoredGroups=new Map();",
      'renderer authored group storage');

    const oldMake="    makeMesh(d){const gl=this.gl;const mesh={count:d.idx.length};mesh.pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d.p),gl.STATIC_DRAW);mesh.nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh.nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d.n),gl.STATIC_DRAW);mesh.ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(d.idx),gl.STATIC_DRAW);return mesh;}";
    const newMake=oldMake+"\n    installAuthoredGroup(name,parts){if(!name||!Array.isArray(parts))return false;this.authoredGroups.set(name,parts.map((part,index)=>({mesh:this.makeMesh(part),color:Array.isArray(part.color)?part.color:[.8,.8,.8,1],index})));return true;}\n    drawAuthored(name,x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0,emissive=0){const parts=this.authoredGroups?.get(name);if(!parts?.length)return false;const gl=this.gl,model=M4.compose(x,y,z,sx,sy,sz,ry,rx,rz),mvp=M4.multiply(this.proj,M4.multiply(this.view,model));gl.uniformMatrix4fv(this.loc.model,false,model);gl.uniformMatrix4fv(this.loc.mvp,false,mvp);gl.uniform1f(this.loc.emissive,emissive);for(const part of parts){gl.uniform4fv(this.loc.color,part.color);gl.bindBuffer(gl.ARRAY_BUFFER,part.mesh.pb);gl.enableVertexAttribArray(this.loc.pos);gl.vertexAttribPointer(this.loc.pos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,part.mesh.nb);gl.enableVertexAttribArray(this.loc.normal);gl.vertexAttribPointer(this.loc.normal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.mesh.ib);gl.drawElements(gl.TRIANGLES,part.mesh.count,gl.UNSIGNED_SHORT,0);}return true;}";
    source=replaceRequired(source,oldMake,newMake,'renderer authored draw methods');

    const rendererReady="  }\n\n  document.documentElement.dataset.renderer = rendererMode;";
    source=replaceRequired(source,rendererReady,"  }\n  if(rendererMode==='webgl')window.HarleyHighEndRuntime?.install(renderer).then(({loaded})=>{if(loaded&&dom.rendererBadge)dom.rendererBadge.textContent=`WEBGL • ${graphicsProfile().label} • ${loaded} AUTHORED ASSETS`;});\n\n  document.documentElement.dataset.renderer = rendererMode;",'authored asset preload');

    const thirdPerson="    }else if(p.weaponId==='pea_popper'||!WEAPONS[p.weaponId]){\n      part('wedge',-.48,0,.00,.50,.38,.66,w.dark);part('cube',-.08,0,.02,.46,.38,.78,w.color);part('sphere',.12,0,-.27,.38,.42,.24,'#76a94c');part('capsule',.48,0,.05,.18,.84,.18,'#313644',yaw,pitch+Math.PI/2);part('cone',.86,0,.05,.22,.46,.22,'#8fd466',yaw,pitch+Math.PI/2);part('sphere',.24,0,.31,.28,.20,.24,'#b5ee86');part('cube',-.15,0,-.34,.20,.50,.22,'#4a3a31',yaw,pitch,.08);\n    }";
    const thirdReplacement="    }else if(p.weaponId==='pea_popper'||!WEAPONS[p.weaponId]){\n      const authoredPoint=point(-.08,0,.02);if(!renderer.drawAuthored?.('weapon.pea_popper',authoredPoint[0],authoredPoint[1],authoredPoint[2],.68,.68,.68,p.yaw-Math.PI/2,-p.pitch,0)){part('wedge',-.48,0,.00,.50,.38,.66,w.dark);part('cube',-.08,0,.02,.46,.38,.78,w.color);part('sphere',.12,0,-.27,.38,.42,.24,'#76a94c');part('capsule',.48,0,.05,.18,.84,.18,'#313644',yaw,pitch+Math.PI/2);part('cone',.86,0,.05,.22,.46,.22,'#8fd466',yaw,pitch+Math.PI/2);part('sphere',.24,0,.31,.28,.20,.24,'#b5ee86');part('cube',-.15,0,-.34,.20,.50,.22,'#4a3a31',yaw,pitch,.08);}\n    }";
    source=replaceRequired(source,thirdPerson,thirdReplacement,'third-person Pea Popper');

    const firstPerson="    else if(p.weaponId==='pea_popper'||!WEAPONS[p.weaponId]){part(-.50,0,.01,.40,.30,.54,w.dark,0,'wedge');part(-.16,0,.02,.38,.31,.64,w.color);part(-.02,0,-.25,.32,.35,.21,'#76a94c',0,'sphere');part(.34,0,.05,.14,.14,.70,'#313644');part(.70,0,.05,.18,.20,.24,'#8fd466',0,'cone');part(.12,0,.28,.24,.16,.20,'#b5ee86',0,'sphere');}";
    const firstReplacement="    else if(p.weaponId==='pea_popper'||!WEAPONS[p.weaponId]){const authoredPoint=point(-.12,0,.02);if(!renderer.drawAuthored?.('weapon.pea_popper',authoredPoint[0],authoredPoint[1],authoredPoint[2],.60,.60,.60,p.yaw-Math.PI/2,-p.pitch,0)){part(-.50,0,.01,.40,.30,.54,w.dark,0,'wedge');part(-.16,0,.02,.38,.31,.64,w.color);part(-.02,0,-.25,.32,.35,.21,'#76a94c',0,'sphere');part(.34,0,.05,.14,.14,.70,'#313644');part(.70,0,.05,.18,.20,.24,'#8fd466',0,'cone');part(.12,0,.28,.24,.16,.20,'#b5ee86',0,'sphere');}}";
    source=replaceRequired(source,firstPerson,firstReplacement,'first-person Pea Popper');
    return source;
  }

  window.HarleyHighEndRuntime=Object.freeze({ASSETS,parseGlb,loadAsset,install,patchGameSource});

  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    const url=typeof input==='string'?input:input?.url||'';
    if(!/core\/game\/game-core\.js(?:[?#]|$)/.test(url)) return response;
    const source=patchGameSource(await response.text());
    return new Response(source,{status:response.status,statusText:response.statusText,headers:response.headers});
  };
})();

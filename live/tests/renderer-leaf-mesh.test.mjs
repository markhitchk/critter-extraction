import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const buildInfoPath = path.resolve(here, '../core/config/build-info.js');
const source = fs.readFileSync(buildInfoPath, 'utf8');

class FakeBlob {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || '';
  }
}

const windowObject = {
  Blob: FakeBlob,
  __CRITTER_MODEL_RUNTIME_GATE__: Object.freeze({ alreadyLoaded: true })
};
const context = vm.createContext({
  window: windowObject,
  Blob: FakeBlob,
  console,
  Object,
  JSON
});
windowObject.window = windowObject;

vm.runInContext(source, context, { filename: buildInfoPath });

const leafSupport = windowObject.__CRITTER_RENDERER_LEAF_MESH__;
assert.ok(leafSupport, 'native leaf mesh support should initialize before the model runtime gate exits');
assert.equal(typeof leafSupport.patchSource, 'function');

const generatedRuntime = `
function makeCubeData(){return {p:[0],n:[0],idx:[0]};}
function makeWedgeData(){return {p:[0],n:[0],idx:[0]};}
function makeCrystalData(sides=6) { return {p:[sides],n:[0],idx:[0]}; }
class Renderer {
  makeMesh(data){ return {pb:data.p,nb:data.n,ib:data.idx,count:data.idx.length}; }
  constructor(){ this.meshes={cube:this.makeMesh(makeCubeData()),wedge:this.makeMesh(makeWedgeData())}; }
  draw(meshName){
    const profile={key:'high'},fixed=meshName==='cube'||meshName==='wedge',mesh=this.meshes[fixed?meshName:\`${'${meshName}'}_${'${profile.key}'}\`];
    return mesh;
  }
}
class SoftwareRenderer {
  end(){const c=this.ctx;for(const o of this.commands){const w=20,h=30,alpha=1;if(o.mesh==='crystal'){c.fill();}else{c.fill();}}}
}
globalThis.RendererForTest=Renderer;
globalThis.SoftwareRendererForTest=SoftwareRenderer;
`;

const patched = leafSupport.patchSource(generatedRuntime);
assert.match(patched, /function makeLeafData\(\)/);
assert.match(patched, /leaf:this\.makeMesh\(makeLeafData\(\)\)/);
assert.match(patched, /meshName==='leaf'/);
assert.match(patched, /o\.mesh==='leaf'/);
assert.match(patched, /__CRITTER_RENDERER_LEAF_MESH__/);
assert.doesNotMatch(patched, /MESH_FALLBACK/);

const runtimeContext = vm.createContext({});
vm.runInContext(patched, runtimeContext);
const renderer = new runtimeContext.RendererForTest();
const leaf = renderer.draw('leaf');
assert.ok(leaf, 'WebGL renderer should register a real leaf mesh');
assert.equal(leaf.pb.length > 0, true);
assert.equal(leaf.nb.length, leaf.pb.length, 'leaf geometry should provide one normal per vertex');
assert.equal(leaf.count > 0, true);

const blob = new windowObject.Blob([generatedRuntime], { type: 'text/javascript' });
const blobSource = blob.parts.join('');
assert.match(blobSource, /leaf:this\.makeMesh\(makeLeafData\(\)\)/);
assert.match(blobSource, /o\.mesh==='leaf'/);
assert.equal(leafSupport.report.applied >= 1, true);
assert.deepEqual(leafSupport.report.missing, []);

console.log('Native WebGL and Canvas leaf mesh regression passed.');

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
  Object
});
windowObject.window = windowObject;

vm.runInContext(source, context, { filename: buildInfoPath });

const fallback = windowObject.__CRITTER_RENDERER_MESH_FALLBACK__;
assert.ok(fallback, 'renderer mesh fallback should initialize before the model runtime gate exits');
assert.equal(typeof fallback.patchSource, 'function');

const generatedRuntime = `
class Renderer {
  constructor(){ this.meshes={wedge:{pb:'fallback'},cube:{pb:'cube'},sphere_high:{pb:'sphere'}}; }
  draw(meshName){
    const profile={key:'high'},fixed=meshName==='cube'||meshName==='wedge',mesh=this.meshes[fixed?meshName:\`${'${meshName}'}_${'${profile.key}'}\`];
    return mesh.pb;
  }
}
globalThis.RendererForTest=Renderer;
`;

const patched = fallback.patchSource(generatedRuntime);
assert.match(patched, /\|\|this\.meshes\.wedge\|\|this\.meshes\.cube/);
assert.match(patched, /__CRITTER_RENDERER_MESH_FALLBACK__/);

const runtimeContext = vm.createContext({});
vm.runInContext(patched, runtimeContext);
const renderer = new runtimeContext.RendererForTest();
assert.equal(renderer.draw('sphere'), 'sphere', 'known procedural meshes should remain unchanged');
assert.equal(renderer.draw('leaf'), 'fallback', 'unknown decorative meshes should use the wedge fallback instead of throwing');

const blob = new windowObject.Blob([generatedRuntime], { type: 'text/javascript' });
assert.match(blob.parts.join(''), /\|\|this\.meshes\.wedge\|\|this\.meshes\.cube/);
assert.equal(fallback.report.applied >= 1, true);

console.log('Renderer mesh fallback regression passed.');

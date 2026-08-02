import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const text = relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
};
const bytes = relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return Buffer.alloc(0);
  }
  return fs.readFileSync(absolutePath);
};

const core = text('core/game/game-core.js');
const patch = text('core/rendering/high-end-terrain-patches.js');
const modelLibrary = text('core/rendering/model-library.js');
const dirtPath = 'assets/textures/terrain/pine_valley/dirt_basecolor.webp';
const dirt = bytes(dirtPath);

for (const marker of [
  "const DIRT_TEXTURE = './assets/textures/terrain/pine_valley/dirt_basecolor.webp'",
  'uniform sampler2D uGroundTexture',
  'uniform float uUseGroundTexture',
  'texture2D(uGroundTexture',
  'this.groundTextureReady',
  'drawGround(...args)',
  "world?.map?.id==='pine-valley'",
  "renderer.drawGround('cube'",
  'patchTerrainSource(source)'
]) {
  if (!patch.includes(marker)) errors.push(`Terrain runtime patch is missing marker: ${marker}`);
}

for (const anchor of [
  'const fs=`precision mediump float;',
  "emissive:gl.getUniformLocation(this.program,'uEmissive')};",
  'gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);',
  'gl.uniform4fv(this.loc.color,c);gl.uniform1f(this.loc.emissive,emissive);',
  "renderer.draw('cube',x,-.035,z,tile,.03,tile,c);",
  "for(const patch of map.terrainPatches||[])renderer.draw('cube'",
  '    end(){}'
]) {
  if (!core.includes(anchor)) errors.push(`game-core.js no longer contains terrain patch anchor: ${anchor}`);
}

if (!modelLibrary.includes('high-end-terrain-patches.js')) {
  errors.push('model-library.js does not load high-end-terrain-patches.js');
}
if (!modelLibrary.includes(dirtPath)) {
  errors.push(`model-library.js does not register ${dirtPath}`);
}

if (dirt.length) {
  if (dirt.length < 16) errors.push(`${dirtPath} is too small to be a valid WebP image`);
  if (dirt.toString('ascii', 0, 4) !== 'RIFF') errors.push(`${dirtPath} is missing its RIFF header`);
  if (dirt.toString('ascii', 8, 12) !== 'WEBP') errors.push(`${dirtPath} is missing its WEBP signature`);
}

if (errors.length) {
  console.error(`Pine Valley terrain validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Textured Pine Valley terrain runtime and WebP asset OK');

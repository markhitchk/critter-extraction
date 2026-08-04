/* Registers Critter Code species inside the generated game runtime before execution. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_RUNTIME_PATCH_V1__) return;
  window.__NEW_CRITTER_RUNTIME_PATCH_V1__ = true;
  const NativeBlob = window.Blob;
  if (typeof NativeBlob !== 'function') return;
  const marker = '__NEW_CRITTER_SPECIES_RUNTIME_V1__';
  const anchor = "redpanda:{name:'Red Panda',role:'Moon Tracker',body:'#bd5b3e',accent:'#f6e0c5',paw:'#f6e0c5',vest:'#77466b',asset:characterAsset('redpanda')}";
  const replacement = `${anchor},\n    penguin:{name:'Penguin',role:'Frozen Explorer',body:'#26364b',accent:'#f4f7fb',paw:'#26364b',vest:'#5eb8d6',asset:characterAsset('penguin')},\n    crow:{name:'Crow',role:'Shiny Collector',body:'#202430',accent:'#515a70',paw:'#202430',vest:'#685c9b',asset:characterAsset('crow')},\n    frog:{name:'Frog',role:'Marsh Jumper',body:'#71b85a',accent:'#d6ee8e',paw:'#8ed56f',vest:'#3f7f68',asset:characterAsset('frog')},\n    arcticfox:{name:'Arctic Fox',role:'Winter Pathfinder',body:'#eef5fb',accent:'#b9d4e8',paw:'#f7fbff',vest:'#5f83a8',asset:characterAsset('arcticfox')},\n    capybara:{name:'Capybara',role:'Relaxed Support',body:'#ad7651',accent:'#6d4734',paw:'#d4a27e',vest:'#d48752',asset:characterAsset('capybara')},\n    axolotl:{name:'Axolotl',role:'Aquatic Scout',body:'#f1a9bd',accent:'#cf638f',paw:'#ffd5df',vest:'#588fb2',asset:characterAsset('axolotl')}`;
  function patchSource(source) {
    let output = String(source || '');
    if (output.includes(marker) || !output.includes(anchor)) return output;
    output = output.replace(anchor, replacement);
    return `${output}\n/* ${marker} */\n`;
  }
  function PatchedBlob(parts = [], options = {}) {
    let next = parts;
    try {
      const type = String(options?.type || '').toLowerCase();
      if (type.includes('javascript') && Array.isArray(parts) && parts.every(part => typeof part === 'string')) {
        const source = parts.join('');
        if (source.includes('const SPECIES') && source.includes(anchor)) next = [patchSource(source)];
      }
    } catch (error) { console.warn('New critter runtime registration could not inspect a script blob.', error); }
    return new NativeBlob(next, options);
  }
  Object.setPrototypeOf(PatchedBlob, NativeBlob);
  PatchedBlob.prototype = NativeBlob.prototype;
  Object.defineProperty(PatchedBlob, '__NEW_CRITTER_PATCHED_BLOB__', { value:true });
  window.Blob = PatchedBlob;
  window.NewCritterRuntimePatch = Object.freeze({ patchSource });
})();

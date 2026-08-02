(() => {
  'use strict';

  const MANIFEST_PATH = 'assets/manifest/high-end-assets.json';
  const VALID_QUALITY = new Set(['low', 'medium', 'high']);
  let manifestPromise = null;
  let manifestValue = null;
  let assetIndex = new Map();

  const projectUrl = relativePath => {
    if (window.CritterPaths?.resolve) return window.CritterPaths.resolve(relativePath);
    return new URL(String(relativePath || '').replace(/^\/+/, ''), document.baseURI).href;
  };

  const normalizeQuality = quality => VALID_QUALITY.has(String(quality || '').toLowerCase())
    ? String(quality).toLowerCase()
    : 'medium';

  const assertManifest = manifest => {
    if (!manifest || typeof manifest !== 'object') throw new Error('The high-end asset manifest is not an object.');
    if (!Array.isArray(manifest.assets)) throw new Error('The high-end asset manifest has no asset list.');
    if (manifest.project !== 'Critter Extraction') throw new Error('The asset manifest belongs to a different project.');
    return manifest;
  };

  const indexManifest = manifest => {
    const nextIndex = new Map();
    for (const asset of manifest.assets) {
      if (!asset?.id || nextIndex.has(asset.id)) continue;
      nextIndex.set(asset.id, Object.freeze({ ...asset }));
    }
    assetIndex = nextIndex;
    manifestValue = Object.freeze({ ...manifest, assets: Object.freeze([...nextIndex.values()]) });
    return manifestValue;
  };

  async function load(options = {}) {
    const force = Boolean(options.force);
    if (manifestValue && !force) return manifestValue;
    if (manifestPromise && !force) return manifestPromise;

    manifestPromise = fetch(projectUrl(MANIFEST_PATH), {
      cache: force ? 'reload' : 'default',
      credentials: 'same-origin'
    })
      .then(response => {
        if (!response.ok) throw new Error(`Asset manifest request failed (${response.status}).`);
        return response.json();
      })
      .then(assertManifest)
      .then(indexManifest)
      .finally(() => {
        manifestPromise = null;
      });

    return manifestPromise;
  }

  function get(id) {
    return assetIndex.get(String(id || '')) || null;
  }

  function all(category = '') {
    const assets = [...assetIndex.values()];
    if (!category) return assets;
    return assets.filter(asset => asset.category === category);
  }

  function chooseLod(asset, quality) {
    const normalized = normalizeQuality(quality);
    const preferredLod = normalized === 'high' ? 'lod0' : normalized === 'low' ? 'lod2' : 'lod1';
    return asset?.lods?.[preferredLod]
      || asset?.runtimePath
      || asset?.lods?.lod0
      || asset?.lods?.lod1
      || asset?.lods?.lod2
      || '';
  }

  function resolve(id, quality = 'medium', options = {}) {
    const asset = get(id);
    if (!asset) return null;

    const modelPath = options.firstPerson && asset.firstPersonPath
      ? asset.firstPersonPath
      : chooseLod(asset, quality);

    return Object.freeze({
      ...asset,
      quality: normalizeQuality(quality),
      modelPath,
      modelUrl: modelPath ? projectUrl(modelPath) : '',
      collisionUrl: asset.collisionPath ? projectUrl(asset.collisionPath) : '',
      textureUrls: Object.freeze(Object.fromEntries(
        Object.entries(asset.textures || {}).map(([name, texturePath]) => [name, projectUrl(texturePath)])
      )),
      fallbackUrl: asset.currentFallback ? projectUrl(asset.currentFallback) : ''
    });
  }

  function ready(category = '') {
    return all(category).filter(asset => asset.status === 'ready');
  }

  function clear() {
    manifestPromise = null;
    manifestValue = null;
    assetIndex = new Map();
  }

  window.CritterHighEndAssets = Object.freeze({
    manifestPath: MANIFEST_PATH,
    load,
    get,
    all,
    ready,
    resolve,
    normalizeQuality,
    clear
  });
})();

(() => {
  'use strict';
  // This tiny fallback is replaced by scripts/build-fastboot.mjs.
  // Keeping the file present lets the loader use one stable URL while the
  // generated prebuilt runtime is produced by GitHub Actions.
  window.__CRITTER_PREBUILT_RUNTIME__ = false;
})();

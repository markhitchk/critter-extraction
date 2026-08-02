(() => {
  'use strict';
  const catalog = {
    'CE-BOOT-JS-001': { title:'Startup JavaScript error', severity:'fatal', system:'boot' },
    'CE-BOOT-FILE-001': { title:'Required file missing', severity:'fatal', system:'boot' },
    'CE-BOOT-TIMEOUT-001': { title:'Startup timed out', severity:'fatal', system:'boot' },
    'CE-WEB-404': { title:'Page not found', severity:'error', system:'web' },
    'CE-RENDER-WEBGL-001': { title:'WebGL unavailable', severity:'warning', system:'render' },
    'CE-RENDER-CANVAS-001': { title:'Canvas renderer failed', severity:'fatal', system:'render' },
    'CE-UNKNOWN-001': { title:'Unknown error', severity:'error', system:'unknown' }
  };
  window.CritterErrorCatalog = Object.freeze(catalog);
})();

(() => {
  'use strict';

  const { one } = window.__CRITTER_PATCH_UTILS__;

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const recoveryAnchor = /if\(state\.strikes>=12\)\{sendNet\(\{type:'fairPlayRemoved',code\},sourceId\);toast\(([^;]+)\);setTimeout\(\(\)=>hostChannels\.get\(sourceId\)\?\.close\(\),180\);\}/;
    if (recoveryAnchor.test(source)) return source;

    return one(
      source,
      'normalize Fair Play removal for recovery protection',
      /if\(code!==\'FP-INPUT-KEYS\'&&state\.strikes>=12\)\{sendNet\(\{type:'fairPlayRemoved',code\},sourceId\);toast\(([^;]+)\);setTimeout\(\(\)=>hostChannels\.get\(sourceId\)\?\.close\(\),180\);\}/,
      (match, toastExpression) => `if(code==='FP-INPUT-KEYS'&&state.strikes>=12)return false;if(state.strikes>=12){sendNet({type:'fairPlayRemoved',code},sourceId);toast(${toastExpression});setTimeout(()=>hostChannels.get(sourceId)?.close(),180);}`
    );
  });
})();

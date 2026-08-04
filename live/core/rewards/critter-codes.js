/* Critter Codes production loader v2.0.0. The runtime payload is gzip-packed across opaque script fragments. */
(() => {
  'use strict';
  const paths=['core/rewards/critter-codes.payload.1.js?v=2.0.0','core/rewards/critter-codes.payload.2.js?v=2.0.0','core/rewards/critter-codes.payload.3.js?v=2.0.0','core/rewards/critter-codes.payload.4.js?v=2.0.0','core/rewards/critter-codes.payload.5.js?v=2.0.0','core/rewards/critter-codes.payload.6.js?v=2.0.0','core/rewards/critter-codes.payload.7.js?v=2.0.0'];
  const resolve=path=>window.CritterPaths?.resolve?.(path)||`./${path}`;
  const load=path=>new Promise((ok,fail)=>{
    const script=document.createElement('script');script.async=false;script.src=resolve(path);
    script.onload=()=>ok();script.onerror=()=>fail(new Error(`Could not load Critter Codes payload fragment: ${path}`));document.head.appendChild(script);
  });
  async function boot(){
    if(!globalThis.DecompressionStream)throw new Error('Critter Codes requires a modern browser with DecompressionStream support.');
    window.__CRITTER_CODE_PAYLOAD__=[];
    for(const path of paths)await load(path);
    const payload=window.__CRITTER_CODE_PAYLOAD__.join('');delete window.__CRITTER_CODE_PAYLOAD__;
    const bytes=Uint8Array.from(atob(payload),character=>character.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const source=await new Response(stream).text(),url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const runtime=document.createElement('script');runtime.dataset.critterCodesRuntime='2.0.0';runtime.src=url;
    runtime.onload=()=>URL.revokeObjectURL(url);runtime.onerror=()=>{URL.revokeObjectURL(url);console.warn('Critter Codes runtime could not initialize.');};
    document.head.appendChild(runtime);
  }
  boot().catch(error=>console.warn('Critter Codes production bundle could not be unpacked.',error));
})();

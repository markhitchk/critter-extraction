(() => {
  'use strict';
  const BASE='./core/loader/game-loader-base.js?v=2026-08-03-multiplayer-chat-ping-1';
  const MODULES=['./core/loader/live-arena-patch-1.js?v=2026-08-03-multiplayer-chat-ping-1','./core/loader/live-arena-patch-2.js?v=2026-08-03-multiplayer-chat-ping-1','./core/loader/live-arena-patch-3.js?v=2026-08-03-multiplayer-chat-ping-1','./core/loader/live-multiplayer-ui-patch.js?v=2026-08-03-multiplayer-chat-ping-1'];
  const nativeFetch=window.fetch.bind(window);
  window.__CRITTER_ARENA_PATCHES__=[];
  function one(source,name,pattern,replacement,required=true){
    const flags=pattern.flags.includes('g')?pattern.flags:pattern.flags+'g';
    const matches=[...source.matchAll(new RegExp(pattern.source,flags))];
    if(name==='hide arena beacon'&&!matches.length){console.warn('Optional LIVE patch missing: hide arena beacon; VS beacon is already moved off-map');return source;}
    if(name==='dynamic match badge'&&matches.length){
      return source.replace(new RegExp(pattern.source,flags),(...args)=>typeof replacement==='function'?replacement(...args):replacement);
    }
    if(matches.length!==1){
      if(required)throw new Error(`LIVE patch ${matches.length?'ambiguous':'missing'}: ${name}`);
      console.warn(`Optional LIVE patch ${matches.length?'ambiguous':'missing'}: ${name}`);
      return source;
    }
    return source.replace(pattern,(...args)=>typeof replacement==='function'?replacement(...args):replacement);
  }
  function all(source,name,pattern,replacement,required=true){const matches=[...source.matchAll(new RegExp(pattern.source,pattern.flags.includes('g')?pattern.flags:pattern.flags+'g'))];if(!matches.length){if(required)throw new Error(`LIVE patch missing: ${name}`);console.warn(`Optional LIVE patch missing: ${name}`);return source;}return source.replace(new RegExp(pattern.source,pattern.flags.includes('g')?pattern.flags:pattern.flags+'g'),()=>replacement);}
  window.__CRITTER_PATCH_UTILS__={one,all};
  const load=url=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.onload=resolve;script.onerror=()=>reject(new Error(`Could not load ${url}`));document.head.appendChild(script);});
  (async()=>{try{for(const url of MODULES)await load(url);window.__CRITTER_ARENA_UI__?.();window.fetch=(input,init)=>{const url=typeof input==='string'?input:String(input?.url||''),request=nativeFetch(input,init);if(!/core\/game\/game-core\.js(?:[?#]|$)/.test(url))return request;return request.then(async response=>{if(!response.ok)return response;let source=await response.text();for(const patch of window.__CRITTER_ARENA_PATCHES__)source=patch(source);return new Response(source,{status:response.status,statusText:response.statusText,headers:response.headers});});};await load(BASE);window.fetch=nativeFetch;}catch(error){window.fetch=nativeFetch;console.error('Critter Extraction live arena hotfix failed',error);window.__critterBootReport?.('failure',error?.message||String(error));}})();
})();

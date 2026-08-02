(() => {
  'use strict';
  const escape = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function mount(title, message, details, slow = false) {
    let host=document.getElementById('studioBoot')||document.getElementById('errorApp');
    if(!host){host=document.createElement('div');document.body.appendChild(host);} host.hidden=false; host.innerHTML=''; host.className='ce-error-host';
    host.innerHTML='<section class="ce-error-card"><p class="ce-kicker">'+(slow?'RECOVERY OPTIONS':'STARTUP ERROR')+'</p><h1>'+escape(title)+'</h1><p>'+escape(message)+'</p><pre>'+escape(details)+'</pre><div class="ce-actions"><button data-reload>Retry Loading</button><button data-copy>Copy Support Report</button><a href="'+escape((window.CritterPaths?CritterPaths.resolve('index.html'):'../../index.html'))+'">Main Menu</a></div><p data-status aria-live="polite"></p></section>';
    host.querySelector('[data-reload]').onclick=()=>location.reload();
    host.querySelector('[data-copy]').onclick=async()=>{const report=window.__CRITTER_LAST_ERROR__;const text=window.CritterErrors?CritterErrors.stringify(report):JSON.stringify(report,null,2);try{await navigator.clipboard.writeText(text);host.querySelector('[data-status]').textContent='Support report copied.';}catch(_){host.querySelector('[data-status]').textContent='Copy failed. Select the report text manually.';}};
  }
  function show(entry){window.__CRITTER_LAST_ERROR__=entry;mount('Critter Extraction could not finish loading',entry.message,entry.code+'\n'+entry.sourceDisplay+(entry.line?'\nLine '+entry.line+':'+entry.column:''));}
  function showSlow(state){mount('Critter Extraction is taking longer than expected','The game has not reported ready yet. You may retry or keep waiting.','STATUS: '+state.stage+'\nELAPSED: '+Math.round(state.detectedElapsedMs()/1000)+' seconds',true);}
  window.CritterErrorUI=Object.freeze({show,showSlow,mount});
})();

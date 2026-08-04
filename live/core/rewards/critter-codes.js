/* Critter Codes production loader v2.0.1. Valid codes are never stored in this file. */
(() => {
  'use strict';

  const VERSION='2.0.1';
  const paths=['core/rewards/critter-codes.payload.1.js?v=2.0.0','core/rewards/critter-codes.payload.2.js?v=2.0.0','core/rewards/critter-codes.payload.3.js?v=2.0.0','core/rewards/critter-codes.payload.4.js?v=2.0.0','core/rewards/critter-codes.payload.5.js?v=2.0.0','core/rewards/critter-codes.payload.6.js?v=2.0.0','core/rewards/critter-codes.payload.7.js?v=2.0.0'];
  const resolve=path=>window.CritterPaths?.resolve?.(path)||`./${path}`;
  const state={status:'loading',detail:'Loading secure reward terminal…'};
  let uiScheduled=false;

  function ensureStyles(){
    if(document.getElementById('critterCodesEntryStyles'))return;
    const style=document.createElement('style');
    style.id='critterCodesEntryStyles';
    style.textContent=`
      .critter-codes-entry-button{position:relative;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
      .critter-codes-entry-button .cc-entry-dot{width:8px;height:8px;border-radius:50%;background:#ffd36f;box-shadow:0 0 10px #ffd36f;flex:0 0 auto}
      .critter-codes-entry-button[data-state="ready"] .cc-entry-dot{background:#72f2bd;box-shadow:0 0 12px #72f2bd}
      .critter-codes-entry-button[data-state="error"] .cc-entry-dot{background:#ff7f9f;box-shadow:0 0 12px #ff7f9f}
      .critter-codes-entry-panel{position:relative;overflow:hidden;border-color:rgba(100,232,234,.48)!important;background:linear-gradient(145deg,rgba(20,34,59,.96),rgba(11,22,39,.96))!important}
      .critter-codes-entry-panel:before{content:"";position:absolute;inset:-45% 40% 35% -20%;background:radial-gradient(circle,rgba(100,232,234,.22),transparent 68%);pointer-events:none}
      .critter-codes-entry-panel>*{position:relative;z-index:1}
      .cc-entry-mark{display:grid;place-items:center;width:48px;height:48px;border:1px solid rgba(100,232,234,.55);border-radius:16px;background:rgba(100,232,234,.12);font-size:24px;box-shadow:0 0 24px rgba(100,232,234,.13)}
      .cc-entry-copy{margin:8px 0 16px;color:var(--muted,#b9c4d6)}
      .cc-entry-status{display:flex;align-items:center;gap:8px;margin-top:12px;color:var(--muted,#b9c4d6);font-size:.82rem}
      .cc-entry-status i{width:8px;height:8px;border-radius:50%;background:#ffd36f;box-shadow:0 0 9px currentColor}
      .cc-entry-status[data-state="ready"] i{background:#72f2bd}.cc-entry-status[data-state="error"] i{background:#ff7f9f}
      .cc-entry-card{width:min(560px,calc(100vw - 28px));border:1px solid rgba(100,232,234,.5)!important;background:linear-gradient(155deg,#111a2d,#0a1221)!important}
      .cc-entry-form{display:grid;gap:12px;padding:4px 0}
      .cc-entry-form label{display:grid;gap:7px;color:#dffcff;font-weight:800;letter-spacing:.06em;font-size:.78rem}
      .cc-entry-form input{width:100%;box-sizing:border-box;padding:15px 16px;border:1px solid rgba(100,232,234,.42);border-radius:14px;background:#070d19;color:#fff;font:800 1rem/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;outline:none}
      .cc-entry-form input:focus{border-color:#64e8ea;box-shadow:0 0 0 3px rgba(100,232,234,.13)}
      .cc-entry-actions{display:grid;grid-template-columns:1fr auto;gap:10px}
      .cc-entry-message{min-height:24px;margin:0;color:#b9c4d6}.cc-entry-message.success{color:#72f2bd}.cc-entry-message.error{color:#ff9dad}
      @media(max-width:760px){.critter-codes-entry-button .cc-entry-label{display:none}.cc-entry-actions{grid-template-columns:1fr}.critter-codes-entry-panel{grid-column:1/-1}}
      @media(prefers-reduced-motion:reduce){.critter-codes-entry-panel:before{display:none}.critter-codes-entry-button .cc-entry-dot,.cc-entry-status i{box-shadow:none}}
    `;
    document.head.appendChild(style);
  }

  function createButton(id,label,className){
    const button=document.createElement('button');
    button.id=id;button.type='button';button.className=className;
    button.innerHTML=`<span class="cc-entry-dot" aria-hidden="true"></span><span class="cc-entry-label">${label}</span>`;
    button.addEventListener('click',openTerminal);
    return button;
  }

  function ensureDialog(){
    let dialog=document.getElementById('critterCodesEntryModal');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='critterCodesEntryModal';dialog.className='modal cc-entry-dialog';
    dialog.innerHTML=`
      <div class="modal-card cc-entry-card">
        <header><div><span class="eyebrow">REWARDS TERMINAL</span><h2>Critter Codes</h2></div><button type="button" class="icon-close" data-cc-entry-close aria-label="Close">×</button></header>
        <p>Enter a Critter Code to unlock animals, cosmetics, Petals, crates, titles, trails, effects, and other account rewards.</p>
        <form class="cc-entry-form" novalidate>
          <label>CRITTER CODE<input id="critterCodesEntryInput" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ENTER CODE" aria-describedby="critterCodesEntryMessage"></label>
          <p id="critterCodesEntryMessage" class="cc-entry-message" aria-live="polite">Loading secure reward terminal…</p>
          <div class="cc-entry-actions"><button type="submit" class="primary">Redeem Code</button><button type="button" class="secondary" data-cc-entry-rewards>View Rewards</button></div>
        </form>
      </div>`;
    dialog.querySelector('[data-cc-entry-close]').addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-cc-entry-rewards]').addEventListener('click',()=>{
      if(window.CritterCodes?.openRewards){dialog.close();window.CritterCodes.openRewards();}
      else setMessage(state.detail,state.status==='error'?'error':'');
    });
    dialog.querySelector('form').addEventListener('submit',redeemFromEntry);
    document.body.appendChild(dialog);
    return dialog;
  }

  function setMessage(message,tone=''){
    const node=document.getElementById('critterCodesEntryMessage');
    if(!node)return;node.textContent=message;node.className=`cc-entry-message ${tone}`.trim();
  }

  function syncUi(){
    for(const button of document.querySelectorAll('.critter-codes-entry-button'))button.dataset.state=state.status;
    const status=document.getElementById('critterCodesEntryStatus');
    if(status){status.dataset.state=state.status;const text=status.querySelector('span');if(text)text.textContent=state.detail;}
    if(document.getElementById('critterCodesEntryModal')?.open)setMessage(state.detail,state.status==='error'?'error':'');
  }

  function setState(status,detail){state.status=status;state.detail=detail;syncUi();}

  function ensureEntryUi(){
    if(!document.body)return;
    ensureStyles();ensureDialog();
    const top=document.querySelector('.top-actions');
    if(top&&!document.getElementById('critterCodesTopEntry')){
      const button=createButton('critterCodesTopEntry','Critter Codes','ghost critter-codes-entry-button');
      top.insertBefore(button,document.getElementById('topPetalsBtn')||null);
    }
    const dashboard=document.querySelector('#menuScreen .dashboard');
    if(dashboard&&!document.getElementById('critterCodesDashboardEntry')){
      const panel=document.createElement('article');panel.id='critterCodesDashboardEntry';panel.className='panel critter-codes-entry-panel';
      panel.innerHTML=`
        <div class="panel-heading"><div><span class="eyebrow">ACCOUNT REWARDS</span><h2>Critter Codes</h2></div><span class="cc-entry-mark" aria-hidden="true">✦</span></div>
        <p class="cc-entry-copy">Redeem promotional and event codes for permanent critters, cosmetics, Petals, crates, trails, titles, and more.</p>
        <button type="button" class="primary full critter-codes-entry-button"><span class="cc-entry-dot" aria-hidden="true"></span><span class="cc-entry-label">Open Critter Codes</span></button>
        <div id="critterCodesEntryStatus" class="cc-entry-status"><i aria-hidden="true"></i><span>Loading secure reward terminal…</span></div>`;
      panel.querySelector('button').addEventListener('click',openTerminal);dashboard.appendChild(panel);
    }
    syncUi();
  }

  function scheduleUi(){
    if(uiScheduled)return;uiScheduled=true;
    requestAnimationFrame(()=>{uiScheduled=false;ensureEntryUi();});
  }

  function openDialog(dialog){
    if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();}
    else dialog.setAttribute('open','');
  }

  function openTerminal(){
    if(window.CritterCodes?.open){window.CritterCodes.open();return;}
    const dialog=ensureDialog();setMessage(state.detail,state.status==='error'?'error':'');openDialog(dialog);
    setTimeout(()=>document.getElementById('critterCodesEntryInput')?.focus(),0);
  }

  async function redeemFromEntry(event){
    event.preventDefault();
    const input=document.getElementById('critterCodesEntryInput'),button=event.currentTarget.querySelector('button[type="submit"]');
    const code=String(input?.value||'').trim();
    if(!code){setMessage('Enter a Critter Code first.','error');input?.focus();return;}
    if(!window.CritterCodes?.redeem){setMessage(state.detail,state.status==='error'?'error':'');return;}
    button.disabled=true;setMessage('Checking code…');
    try{
      await window.CritterCodes.redeem(code);input.value='';setMessage('Code redeemed. Your rewards were added to this profile.','success');
    }catch(error){
      const messages={invalid_code:'That Critter Code is not valid.',already_redeemed:'This profile already redeemed that code.',expired_code:'That Critter Code has expired.',disabled_code:'That Critter Code is disabled.',not_active:'That Critter Code is not active yet.',version_locked:'Update Critter Extraction before using this code.',profile_corrupt:'The active profile could not safely store rewards.',reward_definition_missing:'This reward bundle is temporarily unavailable.'};
      setMessage(messages[error?.message]||'The code could not be redeemed. Try again.','error');
    }finally{button.disabled=false;}
  }

  function load(path){
    return new Promise((ok,fail)=>{
      const script=document.createElement('script');script.async=false;script.src=resolve(path);
      script.onload=()=>ok();script.onerror=()=>fail(new Error(`Could not load Critter Codes payload fragment: ${path}`));document.head.appendChild(script);
    });
  }

  function waitForApi(timeoutMs=15000){
    return new Promise((resolveReady,reject)=>{
      const started=performance.now();
      const check=()=>{
        if(window.CritterCodes?.open&&window.CritterCodes?.redeem)return resolveReady(window.CritterCodes);
        if(performance.now()-started>=timeoutMs)return reject(new Error('Critter Codes loaded but the user interface did not initialize.'));
        setTimeout(check,60);
      };check();
    });
  }

  async function bootRuntime(){
    if(!globalThis.DecompressionStream)throw new Error('This browser cannot unpack the Critter Codes interface. Use a current Chrome, Edge, Firefox, or Safari version.');
    window.__CRITTER_CODE_PAYLOAD__=[];
    for(const path of paths)await load(path);
    const payload=window.__CRITTER_CODE_PAYLOAD__.join('');delete window.__CRITTER_CODE_PAYLOAD__;
    const bytes=Uint8Array.from(atob(payload),character=>character.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const source=await new Response(stream).text(),url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    await new Promise((ok,fail)=>{
      const runtime=document.createElement('script');runtime.dataset.critterCodesRuntime=VERSION;runtime.src=url;
      runtime.onload=()=>{URL.revokeObjectURL(url);ok();};runtime.onerror=()=>{URL.revokeObjectURL(url);fail(new Error('Critter Codes runtime could not initialize.'));};
      document.head.appendChild(runtime);
    });
    await waitForApi();
    setState('ready','Critter Codes ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureEntryUi,{once:true});else ensureEntryUi();
  const observer=new MutationObserver(scheduleUi);observer.observe(document.documentElement,{childList:true,subtree:true});
  window.CritterCodesEntry=Object.freeze({version:VERSION,open:openTerminal,state:()=>({...state})});
  bootRuntime().catch(error=>{console.warn('Critter Codes production bundle could not be started.',error);setState('error',error.message||'Critter Codes could not load.');});
})();

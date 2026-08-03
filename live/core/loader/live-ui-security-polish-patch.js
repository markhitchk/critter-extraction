(() => {
  'use strict';

  const utils = window.__CRITTER_PATCH_UTILS__;
  if (!utils || !Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('UI/security polish patch loaded before the Critter patch runtime');
  }
  const { one } = utils;

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    source = one(
      source,
      'room chat bad-word censorship',
      /  function cleanRoomChatText\(value\)\{[^\n]*\}/,
      `  const ROOM_CHAT_BAD_WORDS=Object.freeze(['fuck','fucker','fucking','motherfucker','shit','bullshit','bitch','bastard','asshole','dick','cock','cunt','pussy','whore','slut','nigger','nigga','faggot','retard']);
  function roomChatPattern(word){const escaped=[...word].join('[^a-z0-9]*');return new RegExp('(^|[^a-z0-9])('+escaped+')(?=$|[^a-z0-9])','gi');}
  function censorRoomChatText(value){let text=String(value||'').replace(/[<>\\u0000-\\u001f\\u007f]/g,' ').replace(/\\s+/g,' ').trim().slice(0,180);for(const word of ROOM_CHAT_BAD_WORDS)text=text.replace(roomChatPattern(word),(match,prefix,body)=>prefix+'*'.repeat(Math.min(14,Math.max(3,body.replace(/[^a-z0-9]/gi,'').length))));return text.replace(/\\bkill\\s+yourself\\b/gi,'*************');}
  function cleanRoomChatText(value){return censorRoomChatText(value);}`
    );

    source = one(
      source,
      'secure profile XML v7 version',
      /const PROFILE_XML_VERSION = 6;/,
      'const PROFILE_XML_VERSION = 7;'
    );

    source = one(
      source,
      'session backup password manager',
      /    function promptProfilePassword\(mode\) \{[\s\S]*?\n      return first;\n    \}/,
      `    function profilePasswordKey(account=activeAccount()) {
      const id=String(account?.securityId||account?.id||'active').replace(/[^A-Za-z0-9_-]/g,'').slice(0,96)||'active';
      return 'critter-profile-password-v7:'+id;
    }
    function storedProfilePassword(account=activeAccount()) { try{return sessionStorage.getItem(profilePasswordKey(account))||'';}catch(_){return '';} }
    function rememberProfilePassword(password,account=activeAccount()) { try{sessionStorage.setItem(profilePasswordKey(account),String(password||''));}catch(_){} window.dispatchEvent(new CustomEvent('critter-profile-password-change')); return password; }
    function forgetProfilePassword(account=activeAccount()) { try{sessionStorage.removeItem(profilePasswordKey(account));}catch(_){} window.dispatchEvent(new CustomEvent('critter-profile-password-change')); }
    function promptProfilePassword(mode, account=activeAccount()) {
      if(mode==='export'){const saved=storedProfilePassword(account);if(saved.length>=PROFILE_PASSWORD_MIN)return saved;}
      const verb = mode === 'import' ? 'unlock' : 'protect';
      const first = prompt(\`Enter a backup password to \${verb} this Critter Extraction profile.\\n\\nUse at least \${PROFILE_PASSWORD_MIN} characters. The plaintext password is never stored in the XML.\`);
      if (first == null) throw new Error('Profile operation cancelled');
      if (first.length < PROFILE_PASSWORD_MIN) throw new Error(\`Backup password must be at least \${PROFILE_PASSWORD_MIN} characters\`);
      if (mode !== 'import') {
        const second = prompt('Enter the same backup password again.');
        if (second == null) throw new Error('Profile operation cancelled');
        if (first !== second) throw new Error('Backup passwords did not match');
        rememberProfilePassword(first,account);
      }
      return first;
    }
    window.CritterProfilePasswordUI={
      min:PROFILE_PASSWORD_MIN,
      get:()=>storedProfilePassword(activeAccount()),
      set:value=>{const password=String(value||'');if(password.length<PROFILE_PASSWORD_MIN)throw new Error(\`Backup password must be at least \${PROFILE_PASSWORD_MIN} characters\`);rememberProfilePassword(password,activeAccount());return true;},
      clear:()=>forgetProfilePassword(activeAccount()),
      account:()=>({id:activeAccount()?.id||'',name:activeAccount()?.displayName||'Active account'})
    };`
    );

    source = one(
      source,
      'v6 and v7 secure export trust check',
      /const strictSecure = account\.securityTrust === 'encrypted-v6' &&/,
      "const strictSecure = /^encrypted-v[67]$/.test(account.securityTrust) &&"
    );

    source = one(
      source,
      'v6 and v7 validated export trust check',
      /if \(account\.securityTrust === 'encrypted-v6'\) return false;/,
      "if (/^encrypted-v[67]$/.test(account.securityTrust)) return false;"
    );

    source = one(
      source,
      'export uses active account password',
      /const password = suppliedPassword \|\| promptProfilePassword\('export'\);/,
      "const password = suppliedPassword || promptProfilePassword('export', account);"
    );

    source = one(
      source,
      'v7 encrypted payload type',
      /type:'critter-account-xml-v6', version:PROFILE_XML_VERSION/,
      "type:'critter-account-xml-v7', version:PROFILE_XML_VERSION"
    );

    source = one(
      source,
      'accept v6 and v7 metadata',
      /if \(aad\.type !== 'critter-profile-aad-v1' \|\| aad\.version !== PROFILE_XML_VERSION \|\| aad\.securityVersion !== PROFILE_SECURITY_VERSION\)/,
      "if (aad.type !== 'critter-profile-aad-v1' || ![6,PROFILE_XML_VERSION].includes(aad.version) || aad.securityVersion !== PROFILE_SECURITY_VERSION)"
    );

    source = one(
      source,
      'accept v6 and v7 encrypted payloads',
      /if \(!pack \|\| pack\.type !== 'critter-account-xml-v6' \|\| pack\.version !== PROFILE_XML_VERSION \|\| !pack\.account\)/,
      "if (!pack || !['critter-account-xml-v6','critter-account-xml-v7'].includes(pack.type) || ![6,PROFILE_XML_VERSION].includes(pack.version) || !pack.account)"
    );

    source = one(
      source,
      'v7 export trust label',
      /account\.securityTrust = 'encrypted-v6';(?=\n      account\.securityRevision)/,
      "account.securityTrust = 'encrypted-v7';"
    );

    source = one(
      source,
      'remember imported secure profile password',
      /pack\.account\.securityTrust = 'encrypted-v6'; pack\.account\.securityVersion = PROFILE_SECURITY_VERSION; pack\.account\.securityLastVerifiedAt = Date\.now\(\);/,
      "pack.account.securityTrust=pack.version>=7?'encrypted-v7':'encrypted-v6'; pack.account.securityVersion=PROFILE_SECURITY_VERSION; pack.account.securityLastVerifiedAt=Date.now(); rememberProfilePassword(password,pack.account);"
    );

    source = one(
      source,
      'v7 backup code prefix',
      /dom\.backupCode\.readOnly = true; dom\.backupCode\.value = 'CE6\.' \+ encodeUtf8Base64Url\(xml\);/,
      "dom.backupCode.readOnly = true; dom.backupCode.value = 'CE7.' + encodeUtf8Base64Url(xml);"
    );

    source = one(
      source,
      'accept CE6 and CE7 backup codes',
      /if \(raw\.startsWith\('CE6\.'\)\) \{\n          await importProfileXmlText\(decodeUtf8Base64Url\(raw\.slice\(4\)\)\); dom\.backupModal\.close\(\); return;\n        \}/,
      "if (/^CE[67]\\./.test(raw)) {\n          await importProfileXmlText(decodeUtf8Base64Url(raw.slice(4))); dom.backupModal.close(); return;\n        }"
    );

    source = source
      .replace('This CE6 backup contains AES-256-GCM encrypted XML.', 'This CE7 backup contains AES-256-GCM encrypted XML.')
      .replace('Paste a CE6 encrypted backup code.', 'Paste a CE7 or CE6 encrypted backup code.');

    return source;
  });

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectUiSecurityPolish() {
    previousUi?.();

    const hostCard=document.querySelector('#hostModal .simple-network-card');
    if(hostCard&&!hostCard.querySelector('.host-fold')){
      const status=hostCard.querySelector(':scope > .network-status');
      const lobby=hostCard.querySelector(':scope > .lobby-panel');
      const loadout=hostCard.querySelector(':scope > .arena-loadout-action');
      const rules=hostCard.querySelector(':scope > .host-rules-panel');
      const fair=hostCard.querySelector(':scope > .fair-play-note');
      const code=hostCard.querySelector(':scope > .simple-room-code');
      const codeHelp=hostCard.querySelector(':scope > .network-code-only');
      const actions=hostCard.querySelector(':scope > .host-room-actions');
      const note=hostCard.querySelector(':scope > .account-note');
      const fold=(title,subtitle,nodes,open=false)=>{const details=document.createElement('details');details.className='host-fold';details.open=open;const summary=document.createElement('summary');summary.innerHTML='<span><strong>'+title+'</strong><small>'+subtitle+'</small></span><b aria-hidden="true">⌄</b>';details.append(summary,...nodes.filter(Boolean));return details;};
      const playerFold=fold('Players & Match Loadout','Roster, open slots, and your selected kit',[lobby,loadout],true);
      const rulesFold=fold('Match Rules','Co-op, VS Arena, teams, score, timer, and respawn',[rules,fair],false);
      const inviteFold=fold('Invite Friends','Room code and one-click sharing',[code,codeHelp],true);
      const helpFold=fold('Connection Help','How online room matchmaking works',[note],false);
      status?.insertAdjacentElement('afterend',playerFold);
      playerFold.insertAdjacentElement('afterend',rulesFold);
      rulesFold.insertAdjacentElement('afterend',inviteFold);
      inviteFold.insertAdjacentElement('afterend',helpFold);
      if(actions)hostCard.append(actions);
    }

    const accountsCard=document.querySelector('#accountsModal .modal-card');
    if(accountsCard&&!document.getElementById('accountBackupSecurity')){
      const panel=document.createElement('section');panel.id='accountBackupSecurity';panel.className='account-backup-security';panel.innerHTML='<div><span class="eyebrow">PROFILE SECURITY V7</span><strong>Backup Password</strong><small id="accountBackupPasswordStatus">Set a password for encrypted account exports.</small></div><label><span>Current tab password</span><input id="accountBackupPasswordView" type="password" readonly placeholder="Not set for this tab"></label><div class="account-backup-actions"><button class="ghost" id="showBackupPasswordBtn" type="button">Show</button><button class="secondary" id="changeBackupPasswordBtn" type="button">Set / Change</button><button class="ghost" id="forgetBackupPasswordBtn" type="button">Forget</button></div><p>The password is kept only in this browser tab/session so it can be shown here and reused for exports. It is never written into the XML backup. Changing it affects new backups; older backups still require their original password.</p>';
      const note=accountsCard.querySelector('.account-note');note?.insertAdjacentElement('afterend',panel);
      const input=panel.querySelector('#accountBackupPasswordView'),status=panel.querySelector('#accountBackupPasswordStatus'),show=panel.querySelector('#showBackupPasswordBtn'),change=panel.querySelector('#changeBackupPasswordBtn'),forget=panel.querySelector('#forgetBackupPasswordBtn');
      const refresh=()=>{const api=window.CritterProfilePasswordUI,password=api?.get?.()||'',account=api?.account?.();input.value=password;input.type='password';show.textContent='Show';show.disabled=!password;forget.disabled=!password;status.textContent=password?('Password ready for '+(account?.name||'the active account')+'.'):('No backup password is saved for '+(account?.name||'the active account')+'.');};
      show.onclick=()=>{if(!input.value)return;const showing=input.type==='text';input.type=showing?'password':'text';show.textContent=showing?'Show':'Hide';};
      change.onclick=()=>{const api=window.CritterProfilePasswordUI;if(!api)return alert('Profile security is still loading.');const first=prompt('Enter a new backup password. Use at least '+api.min+' characters.');if(first==null)return;if(first.length<api.min)return alert('Backup password must be at least '+api.min+' characters.');const second=prompt('Enter the same backup password again.');if(second==null)return;if(first!==second)return alert('Backup passwords did not match.');try{api.set(first);refresh();}catch(error){alert(error?.message||'Could not save the backup password.');}};
      forget.onclick=()=>{window.CritterProfilePasswordUI?.clear?.();refresh();};
      document.getElementById('accountsBtn')?.addEventListener('click',()=>setTimeout(refresh,0));
      accountsCard.addEventListener('click',()=>setTimeout(refresh,0));
      window.addEventListener('critter-profile-password-change',refresh);
      setTimeout(refresh,0);
    }

    if(document.getElementById('uiSecurityPolishStyles'))return;
    const style=document.createElement('style');style.id='uiSecurityPolishStyles';style.textContent=`
/* Smaller, immediate minimap */
.minimap-hud{width:180px!important;padding:7px!important;right:12px!important;top:48px!important}
.minimap-title{height:24px!important;font-size:10px!important;margin-bottom:5px!important}
.minimap-title:after{font-size:6px!important}
.minimap-map{width:164px!important;height:128px!important;border-radius:10px!important}
.revamp-map-marker{transition:none!important;will-change:left,top,transform}
.minimap-stats{margin-top:5px!important;padding:4px 2px!important;font-size:8px!important}
.minimap-stats span{padding:4px 2px!important}
.mission-list{gap:3px!important;padding:6px 6px 7px!important;max-height:150px!important;overflow:auto!important}
.mission-list .objective-row{padding:3px 4px!important;gap:5px!important}.mission-list .objective-row b{font-size:8px!important}.mission-list .objective-row small{font-size:7px!important}
@media(max-width:1050px){.minimap-hud{width:164px!important}.minimap-map{width:148px!important;height:112px!important}.mission-list .objective-row small{display:none!important}}

/* Compact host lobby with collapsible sections */
#hostModal .simple-network-card{width:min(760px,calc(100vw - 14px))!important;max-height:calc(100dvh - 14px)!important;padding:14px!important;overflow:auto!important}
#hostModal .simple-network-card>header{padding-bottom:10px!important}#hostModal .simple-network-card h2{font-size:23px!important}
#hostModal .network-status{margin:10px 0!important;padding:9px!important}
.host-fold{margin:7px 0;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.025);overflow:hidden}
.host-fold>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;cursor:pointer;list-style:none;background:rgba(255,255,255,.035)}.host-fold>summary::-webkit-details-marker{display:none}.host-fold>summary span{display:grid;gap:2px}.host-fold>summary strong{font-size:12px}.host-fold>summary small{font-size:8px;color:var(--muted)}.host-fold>summary>b{font-size:16px;transition:transform .15s}.host-fold[open]>summary>b{transform:rotate(180deg)}
.host-fold>.lobby-panel,.host-fold>.host-rules-panel,.host-fold>.simple-room-code,.host-fold>.network-code-only,.host-fold>.fair-play-note,.host-fold>.account-note,.host-fold>.arena-loadout-action{margin:8px!important}
#hostModal .lobby-roster{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important;max-height:212px!important;overflow:auto!important}
#hostModal .lobby-player,#hostModal .lobby-empty{min-height:48px!important;padding:7px 8px!important}
#hostModal .arena-loadout-action{width:calc(100% - 16px)!important;margin-top:3px!important}
#hostModal .host-rules-panel{padding:10px!important;gap:8px!important}.host-rules-heading small{max-width:260px!important}.host-mode-card,.host-friendly-fire{padding:9px!important}.host-mode-card small,.host-friendly-fire small{font-size:9px!important}
#hostModal .host-arena-limits{grid-template-columns:1.2fr repeat(3,.72fr)!important;padding:9px!important;gap:6px!important}.host-arena-limits select{padding:6px!important}
#hostModal .fair-play-note{padding:8px 9px!important}
#hostModal .simple-room-code{padding:11px!important;gap:7px!important}.simple-room-code .room-pin{font-size:42px!important}.network-code-only{font-size:9px!important}.network-code-only p{margin:4px 0!important}
#hostModal .host-room-actions{position:sticky;bottom:-14px;z-index:10;display:grid!important;grid-template-columns:auto 1fr!important;gap:8px!important;margin:10px -2px -2px!important;padding:10px 2px 2px!important;background:linear-gradient(transparent,#171932 24%)}
@media(max-width:620px){#hostModal .lobby-roster{grid-template-columns:1fr!important}.host-mode-grid{grid-template-columns:1fr!important}#hostModal .host-arena-limits{grid-template-columns:1fr 1fr!important}.simple-room-code .room-pin{font-size:34px!important}}

/* Smaller loadout chooser */
dialog#loadoutModal.modal[open]{position:fixed!important;inset:0!important;margin:auto!important;max-width:100vw!important;max-height:100dvh!important}
#loadoutModal .loadout-card{box-sizing:border-box!important;width:min(1040px,calc(100vw - 14px))!important;height:min(740px,calc(100dvh - 14px))!important;max-height:calc(100dvh - 14px)!important;padding:12px!important;overflow:hidden!important;display:grid!important;grid-template-rows:auto auto auto minmax(0,1fr) auto!important}
#loadoutModal .loadout-card>header{padding-bottom:8px!important}#loadoutModal .loadout-card h2{font-size:22px!important}#loadoutModal .modal-intro{margin:7px 0!important;font-size:10px!important}
#loadoutModal .custom-loadout-toolbar{padding:9px!important;margin-bottom:7px!important}.custom-loadout-toolbar small{font-size:8px!important}
#loadoutModal .loadout-grid{min-height:0!important;max-height:none!important;overflow:auto!important;grid-template-columns:repeat(5,minmax(130px,1fr))!important;gap:7px!important;padding:2px 4px 7px 2px!important}
#loadoutModal .loadout-choice{min-height:0!important;padding:9px!important;gap:6px!important;border-radius:13px!important}.loadout-choice img{max-height:72px!important}.loadout-choice h3{font-size:13px!important;margin:0!important}.loadout-choice p,.loadout-choice small{font-size:8px!important;line-height:1.3!important}.loadout-choice .loadout-items{gap:3px!important}
#loadoutModal .loadout-card>footer{margin-top:6px!important;padding-top:6px!important}
@media(max-width:900px){#loadoutModal .loadout-grid{grid-template-columns:repeat(3,minmax(130px,1fr))!important}}@media(max-width:620px){#loadoutModal .loadout-card{overflow:auto!important;display:flex!important;flex-direction:column!important}#loadoutModal .loadout-grid{grid-template-columns:repeat(2,minmax(125px,1fr))!important;overflow:visible!important}}

/* Keep inventory and Account Stash inside the viewport */
#inventoryModal .inventory-card{width:min(1120px,calc(100vw - 12px))!important;height:min(740px,calc(100dvh - 12px))!important;max-height:calc(100dvh - 12px)!important;padding:10px!important}
#inventoryModal .inventory-layout,#inventoryModal.custom-loadout-mode .inventory-layout{grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr)!important;gap:8px!important}
#inventoryModal .inventory-section,#inventoryModal .side-storage,#inventoryModal .equipment-panel{padding:8px!important}
#inventoryModal .backpack-grid{grid-template-columns:repeat(6,minmax(42px,1fr))!important}#inventoryModal .side-grid,#inventoryModal.custom-loadout-mode .side-grid{grid-template-columns:repeat(8,minmax(38px,1fr))!important}
#inventoryModal .backpack-grid,#inventoryModal .side-grid{overflow:auto!important;min-height:0!important;max-height:none!important;align-content:start!important}
#inventoryModal .equipment-panel{max-height:210px!important}#inventoryModal .item-details{min-height:52px!important;max-height:82px!important}
@media(max-height:700px) and (min-width:901px){#inventoryModal .inventory-card{height:calc(100dvh - 6px)!important;max-height:calc(100dvh - 6px)!important;padding:6px!important}#inventoryModal .inventory-summary>div{min-height:34px!important}#inventoryModal .inventory-layout,#inventoryModal.custom-loadout-mode .inventory-layout{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)!important}#inventoryModal .backpack-grid{grid-template-columns:repeat(8,minmax(34px,1fr))!important}#inventoryModal .side-grid,#inventoryModal.custom-loadout-mode .side-grid{grid-template-columns:repeat(10,minmax(32px,1fr))!important}#inventoryModal .equipment-panel{max-height:150px!important}}
@media(max-width:900px){#inventoryModal .inventory-card{overflow:auto!important;height:calc(100dvh - 8px)!important}#inventoryModal .inventory-layout,#inventoryModal.custom-loadout-mode .inventory-layout{grid-template-columns:1fr!important}#inventoryModal .backpack-grid,#inventoryModal .side-grid{max-height:38dvh!important}}

/* Account backup password controls */
.account-backup-security{display:grid;grid-template-columns:1.1fr 1fr auto;gap:10px;align-items:end;margin:12px 0;padding:12px;border:1px solid rgba(126,247,212,.3);border-radius:14px;background:linear-gradient(135deg,rgba(126,247,212,.08),rgba(99,223,245,.035))}.account-backup-security>div:first-child{display:grid;gap:3px}.account-backup-security>div:first-child small,.account-backup-security p{color:var(--muted);font-size:9px;line-height:1.4}.account-backup-security label{display:grid;gap:5px;font-size:9px;font-weight:800;color:#dff}.account-backup-security input{padding:8px!important;font-family:ui-monospace,monospace}.account-backup-actions{display:flex;gap:5px}.account-backup-actions button{padding:8px 9px!important;font-size:9px!important}.account-backup-security p{grid-column:1/-1;margin:0}
@media(max-width:760px){.account-backup-security{grid-template-columns:1fr}.account-backup-security p{grid-column:auto}.account-backup-actions{flex-wrap:wrap}}
`;
    document.head.appendChild(style);
  };
})();

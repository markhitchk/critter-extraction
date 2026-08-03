(() => {
  'use strict';
  const S=window.CritterSecurityRuntime;if(!S)return;
  const parse=data=>{try{return {message:typeof data==='string'?JSON.parse(data):data,string:typeof data==='string'};}catch(_){return {message:null,string:typeof data==='string'};}};
  const encode=p=>p.string?JSON.stringify(p.message):p.message;
  const isGlobalBan=b=>b?.banType==='global'||b?.source==='remote'||S.remote().bans.some(item=>item.id===b?.id||item.id===b?.banId);
  function ensureStyles(){
    if(document.getElementById('critterSecurityBlockStyles'))return;
    const style=document.createElement('style');style.id='critterSecurityBlockStyles';style.textContent=`
.critter-security-block-screen{position:fixed;inset:0;width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:clamp(14px,3vw,34px);border:0;background:linear-gradient(145deg,rgba(7,9,18,.98),rgba(18,20,42,.98));color:#fff;z-index:2147483646}
.critter-security-block-screen::backdrop{background:#05060c}
.critter-security-block-screen[open]{display:grid;place-items:center}
.critter-security-block-card{width:min(720px,100%);padding:clamp(22px,4vw,38px);border:1px solid rgba(100,232,234,.55);border-radius:24px;background:rgba(18,22,43,.96);box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 38px rgba(100,232,234,.12)}
.critter-security-block-card.host-block{border-color:rgba(255,185,92,.72);box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 38px rgba(255,185,92,.12)}
.critter-security-block-card h2{margin:.25rem 0 .65rem;font-size:clamp(1.8rem,5vw,3rem)}
.critter-security-block-card .scope-note{padding:12px 14px;border-radius:14px;background:rgba(100,232,234,.09);line-height:1.55}
.critter-security-block-card.host-block .scope-note{background:rgba(255,185,92,.1)}
.critter-security-block-card code{display:block;overflow-wrap:anywhere;margin-top:14px;padding:10px;border-radius:10px;background:rgba(0,0,0,.28)}
.critter-security-block-card footer{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
`;document.head.append(style);
  }
  function dialog(b={}){
    ensureStyles();
    const global=isGlobalBan(b),id=global?'critterGlobalBanDialog':'critterHostBanDialog';
    let d=document.getElementById(id);
    if(!d){
      d=document.createElement('dialog');d.id=id;d.className='critter-security-block-screen';
      d.innerHTML='<div class="critter-security-block-card"><header><div><span class="eyebrow ban-eyebrow"></span><h2 class="ban-title"></h2></div></header><div class="account-note"><strong class="reason"></strong><p class="scope-note"></p><p class="expiry"></p><code class="ban-id"></code><p><a class="appeal" target="_blank" rel="noopener noreferrer" hidden>Open appeal information</a></p></div><footer><button class="primary close-ban" type="button"></button></footer></div>';
      document.body.append(d);d.querySelector('.close-ban').onclick=()=>d.close();
    }
    const card=d.querySelector('.critter-security-block-card');
    card.classList.toggle('host-block',!global);
    d.querySelector('.ban-eyebrow').textContent=global?'GLOBAL MULTIPLAYER SECURITY':'HOST-LOCAL MULTIPLAYER SECURITY';
    d.querySelector('.ban-title').textContent=global?'Global Multiplayer Ban':'Blocked by This Host';
    d.querySelector('.scope-note').textContent=global?'This restriction applies to multiplayer rooms across Critter Extraction. Solo play remains available.':'This host has blocked this profile from rooms created by this host. This is not a global Critter Extraction ban, and other hosts may still allow the profile to join.';
    d.querySelector('.reason').textContent=S.text(b.reason||'This profile is blocked from multiplayer.',240);
    const expires=b.expiresAt?Date.parse(b.expiresAt):NaN;d.querySelector('.expiry').textContent=Number.isFinite(expires)?`Restriction expires ${new Date(expires).toLocaleString()}.`:'This restriction has no automatic expiration.';
    d.querySelector('.ban-id').textContent=`${global?'Global':'Host'} Ban ID: ${S.text(b.banId||b.id||'security-ban',80)}`;
    const a=d.querySelector('.appeal'),url=String(b.appealUrl||'');if(/^https?:\/\//i.test(url)){a.href=url;a.hidden=false;}else{a.removeAttribute('href');a.hidden=true;}
    d.querySelector('.close-ban').textContent=global?'Return to Menu':'Close Host Notice';
    if(typeof d.showModal==='function'){if(!d.open)d.showModal();}else d.setAttribute('open','');
  }
  const notice=b=>({type:'securityBan',banId:S.text(b?.id||'security-ban',80),banType:isGlobalBan(b)?'global':'host',source:S.text(b?.source||'',32),reason:S.text(b?.reason||'Multiplayer access restricted.',240),expiresAt:b?.expiresAt||null,appealUrl:b?.appealUrl||'',securityVersion:S.VERSION});
  function reject(conn,ban,stage){if(!conn||conn.__critterSecurityRejected)return;conn.__critterSecurityRejected=true;S.log('connection-blocked',{stage,banId:ban.id,banType:isGlobalBan(ban)?'global':'host',reason:ban.reason});const finish=()=>{try{conn.send(JSON.stringify(notice(ban)));}catch(_){}setTimeout(()=>{try{conn.close();}catch(_){}},180);};if(conn.open)finish();else conn.on?.('open',finish);}
  function wrapConnection(conn,direction='unknown'){
    if(!conn||conn.__critterSecurityWrapped)return conn;conn.__critterSecurityWrapped=true;conn.__critterSecurityDirection=direction;
    const metadata=S.identity(conn.metadata?.security||{});if(metadata.securityId||metadata.installHash||metadata.username)conn.__critterSecurityIdentity=metadata;
    const send=typeof conn.send==='function'?conn.send.bind(conn):null;
    if(send)conn.send=function(data){const p=parse(data),m=p.message;if(m&&typeof m==='object'){
      if(m.type==='profile'&&m.profile&&typeof m.profile==='object')m.profile.security=S.identity();
      if(m.type==='fairPlayWarning')S.log('fair-play-warning-sent',{code:m.code||'FP',strikes:Number(m.strikes)||0});
      if(m.type==='fairPlayRemoved'&&!conn.__critterFairPlayBanCreated){conn.__critterFairPlayBanCreated=true;const ban=S.autoBan(conn.__critterSecurityIdentity||metadata,m.code||'FP-REMOVED');S.log('fair-play-removal',{code:m.code||'FP-REMOVED',banId:ban?.id||'',autoBanCreated:!!ban});}
      return send(encode(p));}return send(data);};
    const on=typeof conn.on==='function'?conn.on.bind(conn):null;
    if(on)conn.on=function(event,callback){if(event!=='data'||typeof callback!=='function')return on(event,callback);return on('data',data=>{const p=parse(data),m=p.message;
      if(m?.type==='securityBan'){S.log('ban-notice-received',{banId:m.banId||'',banType:m.banType||'host',reason:m.reason||''});dialog(m);setTimeout(()=>{try{conn.close();}catch(_){}},50);return;}
      if(m?.type==='profile'&&m.profile&&typeof m.profile==='object'){const id=S.identity(m.profile.security||{});conn.__critterSecurityIdentity=id;Promise.race([S.ready(),new Promise(r=>setTimeout(r,1500))]).then(()=>{const ban=S.find(id);if(ban)reject(conn,ban,'profile');else if(!conn.__critterSecurityRejected)callback(data);});return;}
      if(!conn.__critterSecurityRejected)callback(data);});};
    return conn;
  }
  function statics(target,source){for(const key of Object.getOwnPropertyNames(source)){if(['length','name','prototype'].includes(key))continue;try{Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key));}catch(_){}}}
  function wrapPeer(PeerCtor){if(typeof PeerCtor!=='function'||PeerCtor.__critterSecurityWrappedConstructor)return PeerCtor;
    function SecurePeer(...args){const selfBan=S.find(S.identity(),{remoteOnly:true});if(selfBan){S.log('local-multiplayer-blocked',{banId:selfBan.id,banType:'global',reason:selfBan.reason});dialog({...selfBan,banType:'global'});throw new Error('Critter Extraction multiplayer access is restricted for this profile.');}
      const peer=Reflect.construct(PeerCtor,args,PeerCtor),requested=args[0];if(!peer||peer.__critterSecurityWrapped)return peer;peer.__critterSecurityWrapped=true;peer.__critterSecurityHost=/^harleys-critter-\d{6}$/i.test(String(requested||''));
      if(typeof peer.connect==='function'){const connect=peer.connect.bind(peer);peer.connect=(peerId,options={})=>wrapConnection(connect(peerId,{...(options||{}),metadata:{...(options?.metadata||{}),security:S.identity(),securityVersion:S.VERSION}}),'guest-outbound');}
      if(typeof peer.on==='function'){const on=peer.on.bind(peer);peer.on=function(event,callback){if(event!=='connection'||typeof callback!=='function')return on(event,callback);return on('connection',conn=>{wrapConnection(conn,'host-inbound');Promise.race([S.ready(),new Promise(r=>setTimeout(r,1500))]).then(()=>{const id=conn.__critterSecurityIdentity||S.identity(conn.metadata?.security||{});conn.__critterSecurityIdentity=id;const ban=S.find(id);if(ban)reject(conn,ban,'metadata');else callback(conn);});});};}
      return peer;}
    SecurePeer.prototype=PeerCtor.prototype;try{Object.setPrototypeOf(SecurePeer,PeerCtor);}catch(_){}statics(SecurePeer,PeerCtor);Object.defineProperty(SecurePeer,'__critterSecurityWrappedConstructor',{value:true});return SecurePeer;
  }
  function install(){let value=typeof window.Peer==='function'?wrapPeer(window.Peer):window.Peer;try{Object.defineProperty(window,'Peer',{configurable:true,enumerable:true,get(){return value;},set(v){value=wrapPeer(v);}});}catch(_){const timer=setInterval(()=>{if(typeof window.Peer==='function'&&!window.Peer.__critterSecurityWrappedConstructor)window.Peer=wrapPeer(window.Peer);},100);setTimeout(()=>clearInterval(timer),120000);}}
  S.showBanDialog=dialog;S.wrapSecurityConnection=wrapConnection;install();
})();
(() => {
  'use strict';
  const S=window.CritterSecurityRuntime;if(!S)return;
  const parse=data=>{try{return {message:typeof data==='string'?JSON.parse(data):data,string:typeof data==='string'};}catch(_){return {message:null,string:typeof data==='string'};}};
  const encode=p=>p.string?JSON.stringify(p.message):p.message;
  function dialog(b={}){
    let d=document.getElementById('critterSecurityBanDialog');
    if(!d){d=document.createElement('dialog');d.id='critterSecurityBanDialog';d.className='modal';d.innerHTML='<div class="modal-card compact-card"><header><div><span class="eyebrow">MULTIPLAYER SECURITY</span><h2>Access Restricted</h2></div></header><div class="account-note"><strong class="reason"></strong><p class="expiry"></p><code class="ban-id"></code><p><a class="appeal" target="_blank" rel="noopener noreferrer" hidden>Open appeal information</a></p></div><footer><button class="primary close-ban" type="button">Close</button></footer></div>';document.body.append(d);d.querySelector('.close-ban').onclick=()=>d.close();}
    d.querySelector('.reason').textContent=S.text(b.reason||'This profile is blocked from multiplayer.',240);
    const expires=b.expiresAt?Date.parse(b.expiresAt):NaN;d.querySelector('.expiry').textContent=Number.isFinite(expires)?`Restriction expires ${new Date(expires).toLocaleString()}.`:'This restriction has no automatic expiration.';
    d.querySelector('.ban-id').textContent=`Ban ID: ${S.text(b.banId||b.id||'security-ban',80)}`;
    const a=d.querySelector('.appeal'),url=String(b.appealUrl||'');if(/^https?:\/\//i.test(url)){a.href=url;a.hidden=false;}else{a.removeAttribute('href');a.hidden=true;}
    if(typeof d.showModal==='function'){if(!d.open)d.showModal();}else d.setAttribute('open','');
  }
  const notice=b=>({type:'securityBan',banId:S.text(b?.id||'security-ban',80),reason:S.text(b?.reason||'Multiplayer access restricted.',240),expiresAt:b?.expiresAt||null,appealUrl:b?.appealUrl||'',securityVersion:S.VERSION});
  function reject(conn,ban,stage){if(!conn||conn.__critterSecurityRejected)return;conn.__critterSecurityRejected=true;S.log('connection-blocked',{stage,banId:ban.id,reason:ban.reason});const finish=()=>{try{conn.send(JSON.stringify(notice(ban)));}catch(_){}setTimeout(()=>{try{conn.close();}catch(_){}},180);};if(conn.open)finish();else conn.on?.('open',finish);}
  function wrapConnection(conn,direction='unknown'){
    if(!conn||conn.__critterSecurityWrapped)return conn;conn.__critterSecurityWrapped=true;conn.__critterSecurityDirection=direction;
    const metadata=S.identity(conn.metadata?.security||{});if(metadata.securityId||metadata.installHash||metadata.username)conn.__critterSecurityIdentity=metadata;
    const send=typeof conn.send==='function'?conn.send.bind(conn):null;
    if(send)conn.send=function(data){const p=parse(data),m=p.message;if(m&&typeof m==='object'){
      if(m.type==='profile'&&m.profile&&typeof m.profile==='object')m.profile.security=S.identity();
      if(m.type==='fairPlayWarning')S.log('fair-play-warning-sent',{code:m.code||'FP',strikes:Number(m.strikes)||0});
      if(m.type==='fairPlayRemoved'){const ban=S.autoBan(conn.__critterSecurityIdentity||metadata,m.code||'FP-REMOVED');S.log('fair-play-removal',{code:m.code||'FP-REMOVED',banId:ban?.id||''});}
      return send(encode(p));}return send(data);};
    const on=typeof conn.on==='function'?conn.on.bind(conn):null;
    if(on)conn.on=function(event,callback){if(event!=='data'||typeof callback!=='function')return on(event,callback);return on('data',data=>{const p=parse(data),m=p.message;
      if(m?.type==='securityBan'){S.log('ban-notice-received',{banId:m.banId||'',reason:m.reason||''});dialog(m);setTimeout(()=>{try{conn.close();}catch(_){}},50);return;}
      if(m?.type==='profile'&&m.profile&&typeof m.profile==='object'){const id=S.identity(m.profile.security||{});conn.__critterSecurityIdentity=id;Promise.race([S.ready(),new Promise(r=>setTimeout(r,1500))]).then(()=>{const ban=S.find(id);if(ban)reject(conn,ban,'profile');else if(!conn.__critterSecurityRejected)callback(data);});return;}
      if(!conn.__critterSecurityRejected)callback(data);});};
    return conn;
  }
  function statics(target,source){for(const key of Object.getOwnPropertyNames(source)){if(['length','name','prototype'].includes(key))continue;try{Object.defineProperty(target,key,Object.getOwnPropertyDescriptor(source,key));}catch(_){}}}
  function wrapPeer(PeerCtor){if(typeof PeerCtor!=='function'||PeerCtor.__critterSecurityWrappedConstructor)return PeerCtor;
    function SecurePeer(...args){const selfBan=S.find(S.identity(),{remoteOnly:true});if(selfBan){S.log('local-multiplayer-blocked',{banId:selfBan.id,reason:selfBan.reason});dialog(selfBan);throw new Error('Critter Extraction multiplayer access is restricted for this profile.');}
      const peer=Reflect.construct(PeerCtor,args,PeerCtor),requested=args[0];if(!peer||peer.__critterSecurityWrapped)return peer;peer.__critterSecurityWrapped=true;peer.__critterSecurityHost=/^harleys-critter-\d{6}$/i.test(String(requested||''));
      if(typeof peer.connect==='function'){const connect=peer.connect.bind(peer);peer.connect=(peerId,options={})=>wrapConnection(connect(peerId,{...(options||{}),metadata:{...(options?.metadata||{}),security:S.identity(),securityVersion:S.VERSION}}),'guest-outbound');}
      if(typeof peer.on==='function'){const on=peer.on.bind(peer);peer.on=function(event,callback){if(event!=='connection'||typeof callback!=='function')return on(event,callback);return on('connection',conn=>{wrapConnection(conn,'host-inbound');Promise.race([S.ready(),new Promise(r=>setTimeout(r,1500))]).then(()=>{const id=conn.__critterSecurityIdentity||S.identity(conn.metadata?.security||{});conn.__critterSecurityIdentity=id;const ban=S.find(id);if(ban)reject(conn,ban,'metadata');else callback(conn);});});};}
      return peer;}
    SecurePeer.prototype=PeerCtor.prototype;try{Object.setPrototypeOf(SecurePeer,PeerCtor);}catch(_){}statics(SecurePeer,PeerCtor);Object.defineProperty(SecurePeer,'__critterSecurityWrappedConstructor',{value:true});return SecurePeer;
  }
  function install(){let value=typeof window.Peer==='function'?wrapPeer(window.Peer):window.Peer;try{Object.defineProperty(window,'Peer',{configurable:true,enumerable:true,get(){return value;},set(v){value=wrapPeer(v);}});}catch(_){const timer=setInterval(()=>{if(typeof window.Peer==='function'&&!window.Peer.__critterSecurityWrappedConstructor)window.Peer=wrapPeer(window.Peer);},100);setTimeout(()=>clearInterval(timer),120000);}}
  S.showBanDialog=dialog;S.wrapSecurityConnection=wrapConnection;install();
})();

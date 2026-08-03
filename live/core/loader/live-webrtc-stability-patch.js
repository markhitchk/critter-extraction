(() => {
  'use strict';

  const { one } = window.__CRITTER_PATCH_UTILS__;

  const stablePingRuntime = `  function multiplayerPeerConnected(peerId){
    if(networkRole==='host')return hostChannels.get(peerId)?.readyState==='open';
    if(peerId==='host')return guestChannel?.readyState==='open';
    return !!currentRoster()?.[peerId];
  }
  function multiplayerPingInfo(peerId){
    const connected=multiplayerPeerConnected(peerId),direct=networkRole==='host'?GUEST_IDS.includes(peerId):peerId==='host';
    if(!connected)return {icon:'○',label:'OFFLINE',rtt:null,quality:'offline'};
    if(!direct)return {icon:'●',label:'ONLINE',rtt:null,quality:'online'};
    const sample=multiplayerPingSamples.get(peerId),now=performance.now();
    if(!sample||now-sample.at>10000)return {icon:'…',label:document.visibilityState==='visible'?'MEASURING':'PAUSED',rtt:null,quality:'waiting'};
    const rtt=clamp(Math.round(sample.rtt),0,9999);
    if(rtt<=90)return {icon:'▂▄▆',label:rtt+' ms',rtt,quality:'excellent'};
    if(rtt<=180)return {icon:'▂▄',label:rtt+' ms',rtt,quality:'good'};
    if(rtt<=350)return {icon:'▂',label:rtt+' ms',rtt,quality:'fair'};
    return {icon:'◇',label:rtt+' ms',rtt,quality:'high'};
  }
  function multiplayerPingLabel(peerId=''){
    if(peerId)return multiplayerPingInfo(peerId).label;
    const ids=networkRole==='host'?GUEST_IDS.filter(id=>hostChannels.get(id)?.readyState==='open'):['host'],values=[];
    for(const id of ids){const info=multiplayerPingInfo(id);if(info.rtt!=null)values.push(info.rtt);}
    return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length)+' ms':'-- ms';
  }
  function makeNetworkPeerRow(peerId,profile,roleLabel){
    const info=multiplayerPingInfo(peerId),row=document.createElement('span'),identity=document.createElement('b'),signal=document.createElement('i');
    row.className='network-peer-row quality-'+info.quality;
    identity.textContent=roleLabel+' '+safeText(profile?.displayName||peerId,24);
    signal.textContent=info.icon+' '+info.label;
    row.append(identity,signal);return row;
  }
  function updateMultiplayerHud(force=false){
    const now=performance.now();if(!force&&now-multiplayerLastUiPaint<240)return;multiplayerLastUiPaint=now;
    const panel=document.getElementById('arenaNetworkHud'),chat=document.getElementById('multiplayerChatHud'),active=!!match&&match.role!=='solo';
    if(panel)panel.hidden=!active;if(chat)chat.hidden=!active;if(!active)return;
    if(panel){
      const local=getLocalPlayer(),title=document.createElement('strong'),status=document.createElement('span'),peers=document.createElement('span'),roster=currentRoster();
      title.textContent=match.mode==='pvp'?(match.teamMode&&local?.team?teamName(local.team)+' NETWORK':'VS NETWORK'):(match.role==='host'?'♛ HOST NETWORK':'● CO-OP NETWORK');
      status.className='network-summary';
      if(match.mode==='pvp')status.textContent=match.teamMode&&local?.team?Object.values(players).filter(p=>p.team===local.team).length+' ON YOUR TEAM':'ARENA CONNECTION';
      else status.textContent=Object.keys(players).length+'/'+MAX_PLAYERS+' CONNECTED';
      peers.className='network-peer-list';
      if(networkRole==='host'){
        for(const id of GUEST_IDS)if(hostChannels.get(id)?.readyState==='open')peers.append(makeNetworkPeerRow(id,roster[id]||players[id]?.profile,'●'));
        if(!peers.childElementCount){const waiting=document.createElement('span');waiting.className='network-peer-row quality-waiting';waiting.textContent='… WAITING FOR PLAYERS';peers.append(waiting);}
      }else peers.append(makeNetworkPeerRow('host',roster.host||players.host?.profile,'♛'));
      panel.replaceChildren(title,status,peers);
    }
    const mode=document.getElementById('multiplayerChatMode');
    if(mode)mode.textContent=match.mode==='pvp'&&match.teamMode?'TEAM CHAT':'ROOM CHAT';
  }`;

  const stableLobbyRoster = `  function renderLobbyRoster(){
    const roster=currentRoster(),ids=['host',...GUEST_IDS],localId=networkRole==='host'?'host':(assignedGuestId||'guest1'),teamMode=roomRules.mode==='pvp'&&roomRules.teamMode;
    for(const [root,count] of [[dom.hostLobbyRoster,dom.hostLobbyCount],[dom.joinLobbyRoster,dom.joinLobbyCount]]){
      if(!root)continue;root.innerHTML='';let used=0;
      for(const id of ids){
        const profile=roster[id];
        if(profile){
          used++;const row=document.createElement('div');row.className='lobby-player';
          const av=document.createElement('span');av.className='avatar';setAvatar(av,profile);
          const info=document.createElement('div');info.className='lobby-player-info';
          const strong=document.createElement('strong');strong.textContent=profile.displayName;
          const small=document.createElement('small'),kit=LOADOUTS[profile.loadoutId]?.name||'Selected Loadout';small.textContent=(profile.username?'@'+profile.username+' • ':'')+kit;
          info.append(strong,small);
          const badge=document.createElement('span'),directPing=(networkRole==='host'&&id!=='host')||(networkRole==='guest'&&id==='host'),ping=directPing?multiplayerPingInfo(id):null;
          badge.className=id==='host'?'lobby-host':(id===localId?'lobby-you':'lobby-ready');
          if(ping)badge.classList.add('lobby-ping','quality-'+ping.quality);
          const role=id==='host'?'♛ HOST'+(id===localId?' • YOU':''):id===localId?'● YOU':teamMode?teamName(teamForPlayerId(id)):'● PLAYER';
          badge.textContent=ping?role+' • '+ping.icon+' '+ping.label:role;
          row.append(av,info,badge);root.append(row);
        }else{
          const empty=document.createElement('div');empty.className='lobby-empty';empty.textContent='Open player slot';root.append(empty);
        }
      }
      if(count)count.textContent=used+' / '+MAX_PLAYERS;
    }
  }
  function broadcastRoster`;

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    source = one(
      source,
      'allow lobby ping measurements',
      /function sendMultiplayerPings\(\)\{\n    if\(!match\|\|match\.role==='solo'\|\|!networkConnected\(\)\)return;/,
      "function sendMultiplayerPings(){\n    if(networkRole==='solo'||!networkConnected())return;",
      false
    );

    source = one(
      source,
      'ignore throttled background ping samples',
      /  function recordMultiplayerPong\(msg,sourceId\)\{[\s\S]*?\n  \}/,
      `  function recordMultiplayerPong(msg,sourceId){
    const token=String(msg.token||''),pending=multiplayerPingPending.get(token);
    if(!pending||pending.peerId!==sourceId)return;
    multiplayerPingPending.delete(token);
    const rawRtt=Math.round(performance.now()-pending.sentAt);
    if(document.visibilityState!=='visible'||rawRtt<0||rawRtt>2000)return;
    const rtt=clamp(rawRtt,0,1999),previous=multiplayerPingSamples.get(sourceId)?.rtt;
    multiplayerPingSamples.set(sourceId,{rtt:previous==null?rtt:Math.round(previous*.65+rtt*.35),at:performance.now()});
    updateMultiplayerHud(true);renderLobbyRoster();
  }`,
      false
    );

    source = one(
      source,
      'icon ping multiplayer status',
      /  function multiplayerPingLabel\(\)\{[\s\S]*?\n  \}\n  function updateMultiplayerHud\(force=false\)\{[\s\S]*?\n  \}/,
      stablePingRuntime,
      false
    );

    source = one(
      source,
      'icon ping lobby roster',
      /  function renderLobbyRoster\(\)\{[\s\S]*?\n  function broadcastRoster/,
      stableLobbyRoster,
      false
    );

    source = one(
      source,
      'remove snapshot age poor rating',
      /  function updateArenaNetworkHud\(\)\{[\s\S]*?\n  \}/,
      `  function updateArenaNetworkHud(){
    updateMultiplayerHud(true);
  }`,
      false
    );

    source = one(
      source,
      'keep open webrtc guest in match during delayed snapshots',
      /    if\(match\.role==='guest'&&!match\.ended\)\{\n      if\(document\.visibilityState!=='visible'\)match\.netLastSnapshotAt=now;\n      else if\(!match\.netLastSnapshotAt\)match\.netLastSnapshotAt=now;\n      else if\(now-match\.netLastSnapshotAt>10000\)\{\n        toast\('Host disconnected — returning to main menu',3200\);\n        endMatch\(false,'Host disconnected\.',true,null,true\);\n        return;\n      \}\n    \}/,
      `    if(match.role==='guest'&&!match.ended){
      if(document.visibilityState!=='visible'){
        match.netLastSnapshotAt=now;match.netSyncGraceUntil=now+30000;
      }else if(!match.netLastSnapshotAt){
        match.netLastSnapshotAt=now;match.netSyncGraceUntil=now+30000;
      }else if(guestChannel?.readyState==='open'&&now-match.netLastSnapshotAt>8000&&now>(match.netSyncGraceUntil||0)){
        if(now-(match.netSyncNoticeAt||0)>10000){match.netSyncNoticeAt=now;toast('Host sync is delayed — WebRTC is still connected',2400);}
      }
    }`,
      false
    );

    source = one(
      source,
      'reset network timers after tab visibility changes',
      /document\.addEventListener\('visibilitychange',\(\)=>\{if\(document\.hidden&&match&&!pauseMenuOpen\)openPauseMenu\(\);\}\);/,
      "document.addEventListener('visibilitychange',()=>{multiplayerPingPending.clear();if(match?.role==='guest'){const now=performance.now();match.netLastSnapshotAt=now;match.netSyncGraceUntil=now+30000;match.netSyncNoticeAt=0;}if(document.hidden&&match&&!pauseMenuOpen)openPauseMenu();});",
      false
    );

    source = one(
      source,
      'clear delayed sync notice after snapshot',
      /match\.netLastSnapshotAt=performance\.now\(\);if\(Number\.isFinite\(Number\(msg\.elapsed\)\)\)/,
      "match.netLastSnapshotAt=performance.now();match.netSyncNoticeAt=0;if(Number.isFinite(Number(msg.elapsed)))",
      false
    );

    return source;
  });

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectStableWebrtcUi() {
    previousUi?.();
    if (document.getElementById('liveWebrtcStabilityStyles')) return;
    const style = document.createElement('style');
    style.id = 'liveWebrtcStabilityStyles';
    style.textContent = `
#arenaNetworkHud{min-width:190px!important;max-width:290px!important;gap:5px!important}
#arenaNetworkHud>.network-summary{font-size:9px;color:#b8d3dc}
.network-peer-list{display:grid!important;width:100%;gap:3px!important;margin-top:2px}
.network-peer-row{display:flex!important;align-items:center;justify-content:space-between;gap:10px;width:100%;font-size:9px!important}
.network-peer-row b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e9ffff;font-size:9px}
.network-peer-row i{font-style:normal;font-weight:900;white-space:nowrap;color:#8ff5df}
.quality-excellent i,.lobby-ping.quality-excellent{color:#7ef7d4!important}
.quality-good i,.lobby-ping.quality-good{color:#a9f0d1!important}
.quality-fair i,.lobby-ping.quality-fair{color:#ffe08a!important}
.quality-high i,.lobby-ping.quality-high{color:#ffbd7a!important}
.quality-waiting i,.lobby-ping.quality-waiting{color:#a7c5cf!important}
.quality-offline i,.lobby-ping.quality-offline{color:#ff8f9f!important}
.lobby-player .lobby-ping{font-variant-numeric:tabular-nums;white-space:nowrap}
@media(max-width:700px){#arenaNetworkHud{min-width:175px!important;max-width:230px!important}.network-peer-row{font-size:8px!important}.network-peer-row b{font-size:8px}}
`;
    document.head.appendChild(style);
  };
})();

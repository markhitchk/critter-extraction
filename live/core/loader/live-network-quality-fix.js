(() => {
  'use strict';

  const { one } = window.__CRITTER_PATCH_UTILS__;

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    source = one(
      source,
      'record every guest snapshot heartbeat',
      /function applySnapshot\(msg\)\{if\(!match\|\|match\.role!=='guest'\)return;/,
      matchText => `${matchText}match.netLastSnapshotAt=performance.now();`,
      false
    );

    source = one(
      source,
      'prevent false guest self disconnects',
      /    if\(match\.role==='guest'&&!match\.ended\)\{\n      if\(document\.visibilityState!=='visible'\)match\.netLastSnapshotAt=now;\n      else if\(!match\.netLastSnapshotAt\)match\.netLastSnapshotAt=now;\n      else if\(now-match\.netLastSnapshotAt>10000\)\{\n        toast\('Host disconnected — returning to main menu',3200\);\n        endMatch\(false,'Host disconnected\.',true,null,true\);\n        return;\n      \}\n    \}/,
      `    if(match.role==='guest'&&!match.ended){
      const guestLinkOpen=guestChannel?.readyState==='open';
      if(document.visibilityState!=='visible'||!match.netLastSnapshotAt)match.netLastSnapshotAt=now;
      else if(!guestLinkOpen&&now-match.netLastSnapshotAt>18000){
        toast('Host disconnected — returning to main menu',3200);
        endMatch(false,'Host disconnected.',true,null,true);
        return;
      }
    }`,
      false
    );

    source = one(
      source,
      'allow lobby ping checks before match start',
      /function sendMultiplayerPings\(\)\{\n    if\(!match\|\|match\.role==='solo'\|\|!networkConnected\(\)\)return;/,
      `function sendMultiplayerPings(){
    if(networkRole==='solo'||!networkConnected())return;`,
      false
    );

    source = one(
      source,
      'stabilize ping samples before rating them',
      /const rtt=clamp\(Math\.round\(performance\.now\(\)-pending\.sentAt\),0,9999\),previous=multiplayerPingSamples\.get\(sourceId\)\?\.rtt;\n    multiplayerPingSamples\.set\(sourceId,\{rtt:previous==null\?rtt:Math\.round\(previous\*\.65\+rtt\*\.35\),at:performance\.now\(\)\}\);\n    updateMultiplayerHud\(true\);/,
      `const rtt=clamp(Math.round(performance.now()-pending.sentAt),0,9999),prior=multiplayerPingSamples.get(sourceId),previous=prior?.rtt;
    multiplayerPingSamples.set(sourceId,{rtt:previous==null?rtt:Math.round(previous*.72+rtt*.28),at:performance.now(),count:(prior?.count||0)+1});
    updateMultiplayerHud(true);renderLobbyRoster();`,
      false
    );

    source = one(
      source,
      'replace aggregate ping with per player icon status',
      /  function multiplayerPingLabel\(\)\{[\s\S]*?\n  window\.__CRITTER_MULTIPLAYER_CHAT_OPEN__=/,
      `  function multiplayerPingInfo(peerId,isLocal=false){
    if(isLocal)return {rtt:0,label:'LOCAL',quality:'local',icon:'◆'};
    const sample=multiplayerPingSamples.get(peerId),age=sample?performance.now()-sample.at:Infinity;
    if(!sample||age>12000)return {rtt:null,label:'MEASURING',quality:'waiting',icon:'◌'};
    if((sample.count||0)<2)return {rtt:sample.rtt,label:'MEASURING',quality:'waiting',icon:'◌'};
    if(sample.rtt<=80)return {rtt:sample.rtt,label:'EXCELLENT',quality:'excellent',icon:'▂▄▆█'};
    if(sample.rtt<=180)return {rtt:sample.rtt,label:'GOOD',quality:'good',icon:'▂▄▆'};
    if(sample.rtt<=350)return {rtt:sample.rtt,label:'OK',quality:'ok',icon:'▂▄'};
    return {rtt:sample.rtt,label:'HIGH LATENCY',quality:'high',icon:'▂'};
  }
  function multiplayerPeerInfo(playerId){
    const effectiveLocalId=networkRole==='host'?'host':(networkRole==='guest'?(assignedGuestId||'guest1'):localPlayerId);
    if(playerId===effectiveLocalId)return multiplayerPingInfo('',true);
    if(networkRole==='host')return multiplayerPingInfo(playerId,false);
    if(playerId==='host')return multiplayerPingInfo('host',false);
    return {rtt:null,label:'VIA HOST',quality:'relay',icon:'↔'};
  }
  function multiplayerPingLabel(){
    const ids=networkRole==='host'?GUEST_IDS.filter(id=>hostChannels.get(id)?.readyState==='open'):['host'];
    const values=ids.map(id=>multiplayerPingInfo(id,false)).filter(info=>Number.isFinite(info.rtt)).map(info=>info.rtt);
    return values.length?\`\${Math.round(values.reduce((a,b)=>a+b,0)/values.length)} ms\`:'-- ms';
  }
  function makeNetworkPeerRow(playerId,profile){
    const info=multiplayerPeerInfo(playerId),row=document.createElement('span'),role=document.createElement('b'),name=document.createElement('em'),signal=document.createElement('i'),ping=document.createElement('small');
    row.className=\`network-peer-row quality-\${info.quality}\`;
    role.className=playerId==='host'?'network-role-icon is-host':'network-role-icon is-guest';role.textContent=playerId==='host'?'★':'●';
    name.textContent=\`\${safeText(profile?.displayName||playerId,24)}\${playerId===localPlayerId?' • YOU':playerId==='host'?' • HOST':''}\`;
    signal.className='network-signal-icon';signal.textContent=info.icon;
    ping.textContent=info.rtt==null?info.label:\`\${info.rtt} ms • \${info.label}\`;
    row.append(role,name,signal,ping);return row;
  }
  function updateMultiplayerHud(force=false){
    const now=performance.now();if(!force&&now-multiplayerLastUiPaint<240)return;multiplayerLastUiPaint=now;
    const panel=document.getElementById('arenaNetworkHud'),chat=document.getElementById('multiplayerChatHud'),active=!!match&&match.role!=='solo';
    if(panel)panel.hidden=!active;if(chat)chat.hidden=!active;if(!active)return;
    if(panel){
      const local=getLocalPlayer(),title=document.createElement('strong'),summary=document.createElement('span'),list=document.createElement('div');
      title.className='network-panel-title';
      title.textContent=match.mode==='pvp'?(match.teamMode&&local?.team?\`\${teamName(local.team)} NETWORK\`:'VS NETWORK'):(match.role==='host'?'HOST NETWORK':'CO-OP NETWORK');
      summary.className='network-panel-summary';
      summary.textContent=match.mode==='pvp'?(match.teamMode&&local?.team?\`\${Object.values(players).filter(p=>p.team===local.team).length} ON YOUR TEAM\`:'ARENA CONNECTION'):\`\${Object.keys(players).length}/\${MAX_PLAYERS} CONNECTED\`;
      list.className='network-peer-list';
      const visible=Object.values(players).filter(player=>!isPvpMatch()||!match.teamMode||player.id===localPlayerId||player.team===local?.team||networkRole==='host');
      visible.sort((a,b)=>['host',...GUEST_IDS].indexOf(a.id)-['host',...GUEST_IDS].indexOf(b.id));
      for(const player of visible)list.append(makeNetworkPeerRow(player.id,player.profile));
      panel.replaceChildren(title,summary,list);
    }
    const mode=document.getElementById('multiplayerChatMode');
    if(mode)mode.textContent=match.mode==='pvp'&&match.teamMode?'TEAM CHAT':'ROOM CHAT';
  }
  window.__CRITTER_MULTIPLAYER_CHAT_OPEN__=`,
      false
    );

    source = one(
      source,
      'remove poor snapshot label from arena status',
      /  function updateArenaNetworkHud\(\)\{[\s\S]*?hud\.innerHTML=`[\s\S]*?`;\n  \}/,
      `  function updateArenaNetworkHud(){if(!isPvpMatch())return;updateMultiplayerHud(true);}`,
      false
    );

    source = one(
      source,
      'lobby player icons and individual ping',
      /  function renderLobbyRoster\(\)\{[\s\S]*?\n  function broadcastRoster\(\)/,
      `  function renderLobbyRoster(){
    const roster=currentRoster(),ids=['host',...GUEST_IDS],localId=networkRole==='host'?'host':(assignedGuestId||'guest1');
    for(const [root,count] of [[dom.hostLobbyRoster,dom.hostLobbyCount],[dom.joinLobbyRoster,dom.joinLobbyCount]]){
      if(!root)continue;root.innerHTML='';let used=0;
      for(const id of ids){
        const profile=roster[id];
        if(profile){
          used++;
          const row=document.createElement('div');row.className='lobby-player';row.dataset.playerId=id;
          const role=document.createElement('span');role.className=id==='host'?'lobby-role-icon is-host':'lobby-role-icon is-guest';role.textContent=id==='host'?'★':'●';role.title=id==='host'?'Room host':'Connected player';
          const av=document.createElement('span');av.className='avatar';setAvatar(av,profile);
          const info=document.createElement('div');info.className='lobby-player-info';
          const strong=document.createElement('strong');strong.textContent=profile.displayName;
          const small=document.createElement('small');small.textContent=profile.username?('@'+profile.username):(id==='host'?'Room host':'Connected player');info.append(strong,small);
          const net=multiplayerPeerInfo(id),network=document.createElement('span'),netIcon=document.createElement('i'),netText=document.createElement('b');
          network.className='lobby-network quality-'+net.quality;netIcon.textContent=net.icon;netText.textContent=net.rtt==null?net.label:(net.rtt+' ms');network.append(netIcon,netText);
          const badge=document.createElement('span');badge.className=id===localId?'lobby-you':(id==='host'?'lobby-host':'lobby-ready');badge.textContent=id===localId?'YOU':(id==='host'?'HOST':'READY');
          row.append(role,av,info,network,badge);root.append(row);
        }else{
          const empty=document.createElement('div');empty.className='lobby-empty';empty.textContent='Open player slot';root.append(empty);
        }
      }
      if(count)count.textContent=used+' / '+MAX_PLAYERS;
    }
  }
  function broadcastRoster()`,
      false
    );

    return source;
  });

  const networkQualityCss=`
#arenaNetworkHud>.network-panel-title{font-size:10px;letter-spacing:.11em;color:#e9ffff}
.network-panel-summary{font-size:9px;color:#b8d3dc}
.network-peer-list{display:grid;width:100%;gap:4px;margin-top:3px}
.network-peer-row{display:grid;grid-template-columns:14px minmax(0,1fr) auto auto;align-items:center;gap:5px;padding:4px 5px;border-radius:7px;background:rgba(255,255,255,.045);font-size:9px}
.network-peer-row em{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e8f7fa;font-style:normal}
.network-peer-row small{color:#b8d3dc;font-size:8px;white-space:nowrap}
.network-role-icon{font-size:10px;font-style:normal}
.network-role-icon.is-host{color:#ffd36f}
.network-role-icon.is-guest{color:#67f0ef}
.network-signal-icon{font-size:9px;font-style:normal;letter-spacing:-1px;color:#8ff5df}
.quality-high .network-signal-icon,.quality-high small{color:#ffb36b!important}
.quality-waiting .network-signal-icon,.quality-waiting small{color:#9aaab0!important}
.quality-local .network-signal-icon,.quality-local small{color:#ffd36f!important}
.quality-relay .network-signal-icon,.quality-relay small{color:#a491ff!important}
.lobby-player{grid-template-columns:auto auto minmax(0,1fr) auto auto!important}
.lobby-role-icon{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;font-size:10px}
.lobby-role-icon.is-host{color:#ffd36f;background:rgba(255,211,111,.12)}
.lobby-role-icon.is-guest{color:#67f0ef;background:rgba(103,240,239,.10)}
.lobby-network{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:999px;background:rgba(255,255,255,.055);white-space:nowrap}
.lobby-network i{font-style:normal;font-size:9px;letter-spacing:-1px;color:#8ff5df}
.lobby-network b{font-size:8px;color:#cce3e8}
.lobby-network.quality-high i,.lobby-network.quality-high b{color:#ffb36b}
.lobby-network.quality-waiting i,.lobby-network.quality-waiting b{color:#9aaab0}
.lobby-network.quality-local i,.lobby-network.quality-local b{color:#ffd36f}
.lobby-network.quality-relay i,.lobby-network.quality-relay b{color:#a491ff}
@media(max-width:700px){.network-peer-row{grid-template-columns:12px minmax(0,1fr) auto}.network-peer-row small{grid-column:2/4}.lobby-player{grid-template-columns:auto auto minmax(0,1fr) auto!important}.lobby-network{grid-column:2/5}.lobby-player>.lobby-ready,.lobby-player>.lobby-host,.lobby-player>.lobby-you{grid-column:4}}
`;
  const previousUi=window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__=function injectNetworkQualityUi(){
    previousUi?.();
    if(document.getElementById('liveNetworkQualityStyles'))return;
    const style=document.createElement('style');style.id='liveNetworkQualityStyles';style.textContent=networkQualityCss;document.head.appendChild(style);
  };

})();

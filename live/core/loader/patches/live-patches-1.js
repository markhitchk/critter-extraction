(() => {
  'use strict';
  const patches = window.__CRITTER_LIVE_PATCHES__ || (window.__CRITTER_LIVE_PATCHES__ = []);
  patches.push(
    {
      name: "eight player room rules and arena helpers",
      find: "  const PLAYER_SPAWNS = {host:[-3,0],guest1:[-1,2],guest2:[1,2],guest3:[3,0]};\n  const DEFAULT_ROOM_RULES = Object.freeze({mode:'coop',friendlyFire:false});\n  const FAIR_PLAY_VERSION = '1.0';\n  let roomRules = {...DEFAULT_ROOM_RULES};\n  function normalizeRoomRules(value={}){\n    const mode=value?.mode==='pvp'?'pvp':'coop';\n    return {mode,friendlyFire:mode==='pvp'||!!value?.friendlyFire};\n  }\n  function isPvpMatch(){return match?.mode==='pvp';}",
      replace: "  const PLAYER_SPAWNS = {host:[-30,-21],guest1:[30,-21],guest2:[-30,-7],guest3:[30,-7],guest4:[-30,7],guest5:[30,7],guest6:[-30,21],guest7:[30,21]};\n  const DEFAULT_ROOM_RULES = Object.freeze({mode:'coop',friendlyFire:false,teams:'ffa'});\n  const FAIR_PLAY_VERSION = '1.1';\n  let roomRules = {...DEFAULT_ROOM_RULES};\n  function normalizeRoomRules(value={}){\n    const mode=value?.mode==='pvp'?'pvp':'coop',teams=mode==='pvp'&&value?.teams==='teams'?'teams':'ffa';\n    return {mode,friendlyFire:mode==='pvp'||!!value?.friendlyFire,teams};\n  }\n  function isPvpMatch(){return match?.mode==='pvp';}\n  const ARENA_SPAWNS=[{x:-30,z:-21},{x:30,z:-21},{x:-30,z:-7},{x:30,z:-7},{x:-30,z:7},{x:30,z:7},{x:-30,z:21},{x:30,z:21}];\n  function pvpTeamsEnabled(rules=roomRules){return normalizeRoomRules(rules).mode==='pvp'&&normalizeRoomRules(rules).teams==='teams';}\n  function playerSlotIndex(id){return Math.max(0,['host',...GUEST_IDS].indexOf(id));}\n  function teamForPlayerId(id,rules=roomRules){return pvpTeamsEnabled(rules)?(playerSlotIndex(id)%2===0?'A':'B'):'';}\n  function configureVsArena(){\n    world.enemies=[];world.safeZones=[];world.pickups=[];world.chests=[];world.landmarks=[];world.statics=[];world.blockers=[];\n    world.spawnPoints=ARENA_SPAWNS.map(p=>({...p}));world.spawn={...ARENA_SPAWNS[0]};world.extract={x:999,z:999};\n    world.route=[{x:-32,z:0},{x:0,z:0},{x:32,z:0}];\n    world.cover=[\n      {type:'container',x:-19,z:-15,w:5.8,d:2.7,h:2.5,rot:0,color:'#b86b3e'},\n      {type:'container',x:19,z:-15,w:5.8,d:2.7,h:2.5,rot:0,color:'#55738b'},\n      {type:'container',x:-19,z:15,w:5.8,d:2.7,h:2.5,rot:0,color:'#55738b'},\n      {type:'container',x:19,z:15,w:5.8,d:2.7,h:2.5,rot:0,color:'#b86b3e'},\n      {type:'cratewall',x:-10,z:0,w:5.4,d:1.8,h:2,rot:Math.PI/2,color:'#9b6c3f'},\n      {type:'cratewall',x:10,z:0,w:5.4,d:1.8,h:2,rot:Math.PI/2,color:'#9b6c3f'},\n      {type:'freight',x:0,z:-18,w:4.2,d:8.4,h:2.7,rot:Math.PI/2,color:'#6f8050'},\n      {type:'freight',x:0,z:18,w:4.2,d:8.4,h:2.7,rot:Math.PI/2,color:'#6f8050'},\n      {type:'boulder',x:0,z:-7,w:3.2,d:2.8,h:2.3,rot:.25,color:'#626c78'},\n      {type:'boulder',x:0,z:7,w:3.2,d:2.8,h:2.3,rot:-.25,color:'#626c78'}\n    ];\n    world.map={...(world.map||{}),id:'vs-arena',name:'Moonmeadow VS Arena',baseName:'VS Arena',layoutName:pvpTeamsEnabled()?'Team Arena':'Free-for-All Arena',feature:null,themeDecor:[],rail:{x:0,z:0,rot:Math.PI/2},treeA:'#31483f',treeB:'#3f554a',treeC:'#4b6154',grassA:'#334c43',grassB:'#3b574b'};\n  }\n  function setArenaObjectiveVisibility(arena){\n    const mission=document.querySelector('.mission-list');if(mission)mission.hidden=!!arena;\n    if(dom.minimapExtract)dom.minimapExtract.hidden=!!arena;\n    if(dom.minimapTitle)dom.minimapTitle.textContent=arena?'VS ARENA':(world.map?.baseName||world.map?.name||'MOONMEADOW').toUpperCase();\n  }"
    },
    {
      name: "dedicated no-loot arena state",
      find: "    const pvp = role !== 'solo' && roomRules.mode === 'pvp';\n    if(pvp){world.enemies=[];world.safeZones=[];}",
      replace: "    const pvp = role !== 'solo' && roomRules.mode === 'pvp';\n    if(pvp)configureVsArena();"
    },
    {
      name: "eight player symmetric arena spawns",
      find: "    const spawnIds=['host','guest1','guest2','guest3'],routeHeading=Math.atan2((world.route?.[1]?.x??world.extract.x)-world.spawn.x,(world.route?.[1]?.z??world.extract.z)-world.spawn.z);\n    const spawnFor=id=>world.spawnPoints?.[Math.max(0,spawnIds.indexOf(id))]||world.spawn||{x:0,z:0};",
      replace: "    const spawnIds=['host',...GUEST_IDS],routeHeading=pvp?0:Math.atan2((world.route?.[1]?.x??world.extract.x)-world.spawn.x,(world.route?.[1]?.z??world.extract.z)-world.spawn.z);\n    const spawnFor=id=>world.spawnPoints?.[Math.max(0,spawnIds.indexOf(id))]||world.spawn||{x:0,z:0};"
    },
    {
      name: "assign arena teams to roster players",
      find: "      const spawn=spawnFor(id),player=createPlayer(id,spawn.x,spawn.z,profile,id!==localPlayerId);player.yaw=routeHeading;players[id]=player;",
      replace: "      const spawn=spawnFor(id),player=createPlayer(id,spawn.x,spawn.z,profile,id!==localPlayerId);player.team=pvp?teamForPlayerId(id):'';player.yaw=pvp?(player.team==='A'?Math.PI/2:player.team==='B'?-Math.PI/2:(playerSlotIndex(id)/MAX_PLAYERS)*Math.PI*2):routeHeading;players[id]=player;"
    },
    {
      name: "assign arena team to fallback local player",
      find: "    if(!players[localPlayerId]){const spawn=spawnFor(localPlayerId),player=createPlayer(localPlayerId,spawn.x,spawn.z,profilePacket(),false);player.yaw=routeHeading;players[localPlayerId]=player;}",
      replace: "    if(!players[localPlayerId]){const spawn=spawnFor(localPlayerId),player=createPlayer(localPlayerId,spawn.x,spawn.z,profilePacket(),false);player.team=pvp?teamForPlayerId(localPlayerId):'';player.yaw=pvp?(player.team==='A'?Math.PI/2:player.team==='B'?-Math.PI/2:0):routeHeading;players[localPlayerId]=player;}"
    },
    {
      name: "remove all objectives from vs arena",
      find: "    const contracts=pvp?{\n      primary:{id:'pvp-last-standing',title:'Last Critter Standing',type:'pvp',target:1,description:'Eliminate rival players and survive.',done:false},\n      bonus:{id:'pvp-eliminations',title:'Rival Eliminations',type:'kills',target:2,description:'Eliminate two rival critters.',done:false}\n    }:chooseContracts(seed>>>0,role!=='solo');\n    resetFairPlayForMatch(Object.keys(players));\n    match = { role, mode:pvp?'pvp':'coop', friendlyFire:pvp||roomRules.friendlyFire, fairPlay:{version:FAIR_PLAY_VERSION,authority:role==='solo'?'local':'host'}, timer:300, elapsed:0, ended:false, start:performance.now(), seed:seed>>>0, extracted:false, shots:0, hintUntil:performance.now()+9000, metrics:{chestsOpened:0,headshotKills:0,enemyRespawns:0,landmarksVisited:[]}, objectives:{foundExtract:pvp,berriesReady:false,extracted:false,primary:contracts.primary,bonus:contracts.bonus} };",
      replace: "    const contracts=pvp?null:chooseContracts(seed>>>0,role!=='solo');\n    resetFairPlayForMatch(Object.keys(players));\n    match = { role, mode:pvp?'pvp':'coop', friendlyFire:pvp||roomRules.friendlyFire, teams:pvp?roomRules.teams:'ffa', fairPlay:{version:FAIR_PLAY_VERSION,authority:role==='solo'?'local':'host'}, timer:300, elapsed:0, ended:false, start:performance.now(), seed:seed>>>0, extracted:false, shots:0, hintUntil:performance.now()+9000, metrics:{chestsOpened:0,headshotKills:0,enemyRespawns:0,landmarksVisited:[]}, objectives:pvp?null:{foundExtract:false,berriesReady:false,extracted:false,primary:contracts.primary,bonus:contracts.bonus} };"
    },
    {
      name: "live network badge uses eight player direct webrtc status",
      find: "    document.body.classList.add('in-match'); dom.menuScreen.classList.remove('active'); dom.gameScreen.classList.add('active'); dom.networkBadge.textContent = role === 'solo' ? 'SOLO • FAIR PLAY' : `${pvp?'PVP':(role === 'host' ? 'HOST' : 'CO-OP')} • ${Object.keys(players).length}/4 • FAIR PLAY`;",
      replace: "    document.body.classList.add('in-match'); dom.menuScreen.classList.remove('active'); dom.gameScreen.classList.add('active'); dom.networkBadge.textContent = role === 'solo' ? 'SOLO • FAIR PLAY' : `${pvp?(pvpTeamsEnabled()?'PVP TEAMS':'PVP FFA'):(role === 'host' ? 'HOST CO-OP' : 'CO-OP')} • ${Object.keys(players).length}/${MAX_PLAYERS} • DIRECT WEBRTC • FAIR PLAY`;"
    },
    {
      name: "eight player guest ids",
      find: "  // -------------------- Code-only online WebRTC co-op (up to four players) --------------------\n  const MAX_PLAYERS=4, GUEST_IDS=['guest1','guest2','guest3'];",
      replace: "  // -------------------- Code-only online WebRTC multiplayer (up to eight players) --------------------\n  const MAX_PLAYERS=8, GUEST_IDS=['guest1','guest2','guest3','guest4','guest5','guest6','guest7'];"
    }
  );
})();

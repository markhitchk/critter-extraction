(() => {
  'use strict';
  const patches = window.__CRITTER_LIVE_PATCHES__ || (window.__CRITTER_LIVE_PATCHES__ = []);
  patches.push(
    {
      name: "squad network badge eight players",
      find: "    if(match.role!=='solo')dom.networkBadge.textContent=`${match.mode==='pvp'?'PVP':(match.role==='host'?'HOST':'CO-OP')} • ${Object.keys(players).length}/4 • FAIR PLAY`;",
      replace: "    if(match.role!=='solo')dom.networkBadge.textContent=`${match.mode==='pvp'?(match.teams==='teams'?`PVP TEAM ${local.team||'-'}`:'PVP FFA'):(match.role==='host'?'HOST CO-OP':'CO-OP GUEST')} • ${Object.keys(players).length}/${MAX_PLAYERS} • DIRECT WEBRTC • FAIR PLAY`;"
    },
    {
      name: "team-aware vs arena results",
      find: "  function pvpResult(won){\n    const p=getLocalPlayer(),kills=p?.kills||0,xp=(won?80:25)+kills*15,a=activeAccount();\n    a.stats.kills+=kills;a.xp+=xp;finishCustomDrop(a);saveDB();\n    return {berries:0,xp,petalsEarned:0,overflow:0};\n  }\n  function finishPvpClient(winnerId,reason){\n    if(!match||match.ended)return;\n    const won=winnerId===localPlayerId;\n    endMatch(won,reason,false,pvpResult(won),true);\n  }\n  function concludePvp(reason='PvP skirmish complete.'){\n    if(!isPvpMatch()||match.ended)return;\n    const entries=Object.values(players),alive=entries.filter(p=>p.alive);\n    const ranked=[...entries].sort((a,b)=>(Number(b.alive)-Number(a.alive))||((b.kills||0)-(a.kills||0))||((b.hp+b.shield)-(a.hp+a.shield)));\n    const winner=alive.length===1?alive[0]:ranked[0],winnerId=winner?.id||'host',winnerName=winner?.profile?.displayName||'A critter';\n    const finalReason=`${winnerName} wins the Player vs Player skirmish. ${reason}`;\n    if(match.role==='host'&&networkConnected())for(const id of GUEST_IDS)if(hostChannels.get(id)?.readyState==='open')sendNet({type:'pvpEnd',winnerId,reason:finalReason},id);\n    finishPvpClient(winnerId,finalReason);\n  }\n  function checkPvpVictory(){\n    if(!isPvpMatch()||match.ended||(match.elapsed||0)<3||Object.keys(players).length<2)return;\n    if(Object.values(players).filter(p=>p.alive).length<=1)concludePvp('Last critter standing.');\n  }",
      replace: "  function pvpResult(won){\n    const p=getLocalPlayer(),kills=p?.kills||0,xp=(won?80:25)+kills*15,a=activeAccount();\n    a.stats.kills+=kills;a.xp+=xp;finishCustomDrop(a);saveDB();\n    return {berries:0,xp,petalsEarned:0,overflow:0};\n  }\n  function finishPvpClient(winnerIds,reason){\n    if(!match||match.ended)return;\n    const ids=Array.isArray(winnerIds)?winnerIds:[winnerIds],won=ids.includes(localPlayerId);\n    endMatch(won,reason,false,pvpResult(won),true);\n  }\n  function concludePvp(reason='VS Arena complete.'){\n    if(!isPvpMatch()||match.ended)return;\n    const entries=Object.values(players),alive=entries.filter(p=>p.alive),teamMode=match.teams==='teams';\n    let winnerIds=[],winnerName='A critter';\n    if(teamMode){\n      const score=team=>{const members=entries.filter(p=>p.team===team);return {team,alive:members.filter(p=>p.alive).length,kills:members.reduce((n,p)=>n+(p.kills||0),0),health:members.reduce((n,p)=>n+Math.max(0,p.hp+p.shield),0)};};\n      const winning=[score('A'),score('B')].sort((a,b)=>(b.alive-a.alive)||(b.kills-a.kills)||(b.health-a.health))[0];\n      winnerIds=entries.filter(p=>p.team===winning.team).map(p=>p.id);winnerName=`Team ${winning.team}`;\n    }else{\n      const ranked=[...entries].sort((a,b)=>(Number(b.alive)-Number(a.alive))||((b.kills||0)-(a.kills||0))||((b.hp+b.shield)-(a.hp+a.shield))),winner=alive.length===1?alive[0]:ranked[0];\n      winnerIds=[winner?.id||'host'];winnerName=winner?.profile?.displayName||'A critter';\n    }\n    const finalReason=`${winnerName} wins the VS Arena. ${reason}`;\n    if(match.role==='host'&&networkConnected())for(const id of GUEST_IDS)if(hostChannels.get(id)?.readyState==='open')sendNet({type:'pvpEnd',winnerIds,reason:finalReason},id);\n    finishPvpClient(winnerIds,finalReason);\n  }\n  function checkPvpVictory(){\n    if(!isPvpMatch()||match.ended||(match.elapsed||0)<3||Object.keys(players).length<2)return;\n    const alive=Object.values(players).filter(p=>p.alive);\n    if(match.teams==='teams'){if(new Set(alive.map(p=>p.team).filter(Boolean)).size<=1)concludePvp('The opposing team was eliminated.');}\n    else if(alive.length<=1)concludePvp('Last critter standing.');\n  }"
    },
    {
      name: "guest receives team winner list",
      find: "    if(msg.type==='pvpEnd'&&networkRole==='guest'){finishPvpClient(msg.winnerId,msg.reason||'PvP skirmish complete.');return;}",
      replace: "    if(msg.type==='pvpEnd'&&networkRole==='guest'){finishPvpClient(msg.winnerIds||msg.winnerId,msg.reason||'VS Arena complete.');return;}"
    },
    {
      name: "prevent item dropping in vs arena",
      find: "  function dropSelectedItem() {\n    const data = selectedData(); if (!data || data.source !== 'backpack' || !match) return;",
      replace: "  function dropSelectedItem() {\n    if(isPvpMatch())return toast('VS Arena loadouts cannot be dropped');\n    const data = selectedData(); if (!data || data.source !== 'backpack' || !match) return;"
    }
  );
})();

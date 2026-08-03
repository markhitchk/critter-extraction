(() => {
  'use strict';

  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('All-player ping fix loaded before the Critter patch runtime');
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    if (source.includes('__CRITTER_NETWORK_ALL_PINGS__')) return source;

    const runtimeAnchor = '  function updateMultiplayerHud(force=false){';
    if (!source.includes(runtimeAnchor)) {
      console.warn('Optional LIVE patch missing: all-player ping runtime anchor');
      return source;
    }

    const runtime = `  let multiplayerRemotePingRoster=[];\n  function multiplayerPingName(id){const profile=players?.[id]?.profile||lobbyProfiles?.[id]||{};return safeText(profile.displayName||profile.username||(id==='host'?'Host':id),24)||(id==='host'?'Host':id);}\n  function multiplayerPingLocalId(){return networkRole==='host'?'host':(assignedGuestId||'guest1');}\n  function multiplayerFreshPing(id){const sample=multiplayerPingSamples.get(id),now=performance.now();return sample&&now-sample.at<8000?clamp(Math.round(sample.rtt),0,9999):null;}\n  function multiplayerHostPingRoster(){const rows=[{id:'host',name:multiplayerPingName('host'),role:'host',local:true,ping:0,pingLabel:'LOCAL'}];for(const id of GUEST_IDS){const channel=hostChannels.get(id);if(!channel||channel.readyState!=='open')continue;const ping=multiplayerFreshPing(id);rows.push({id,name:multiplayerPingName(id),role:'guest',local:false,ping,pingLabel:Number.isFinite(ping)?ping+' ms':'-- ms'});}return rows;}\n  function broadcastMultiplayerPingRoster(){if(networkRole!=='host'||!networkConnected())return;sendNet({type:'networkPingSnapshot',rows:multiplayerHostPingRoster().map(row=>({id:row.id,name:row.name,role:row.role,ping:Number.isFinite(row.ping)?row.ping:null}))});}\n  function multiplayerAllPingRoster(){\n    if(networkRole==='solo')return [];\n    if(networkRole==='host')return multiplayerHostPingRoster();\n    const localId=multiplayerPingLocalId(),byId=new Map();\n    for(const raw of multiplayerRemotePingRoster){if(!raw||!['host',...GUEST_IDS].includes(raw.id))continue;const ping=Number.isFinite(raw.ping)?clamp(Math.round(raw.ping),0,9999):null;byId.set(raw.id,{id:raw.id,name:safeText(raw.name||multiplayerPingName(raw.id),24)||multiplayerPingName(raw.id),role:raw.id==='host'?'host':'guest',local:false,ping,pingLabel:Number.isFinite(ping)?ping+' ms':'-- ms'});}\n    const hostPing=multiplayerFreshPing('host'),hostRow=byId.get('host')||{id:'host',name:multiplayerPingName('host'),role:'host',local:false,ping:null,pingLabel:'-- ms'};hostRow.ping=hostPing;hostRow.pingLabel=Number.isFinite(hostPing)?hostPing+' ms':'-- ms';byId.set('host',hostRow);\n    const localRow=byId.get(localId)||{id:localId,name:multiplayerPingName(localId),role:'guest',local:true,ping:0,pingLabel:'LOCAL'};localRow.local=true;localRow.ping=0;localRow.pingLabel='LOCAL';byId.set(localId,localRow);\n    return ['host',...GUEST_IDS].map(id=>byId.get(id)).filter(Boolean);\n  }\n  window.__CRITTER_NETWORK_ALL_PINGS__=()=>multiplayerAllPingRoster().map(row=>({...row}));\n  setInterval(()=>{if(document.visibilityState==='visible')broadcastMultiplayerPingRoster();},1000);\n`;

    source = source.replace(runtimeAnchor, runtime + runtimeAnchor);

    const handlerAnchor = "  function handleNet(msg,sourceId='host'){\n";
    if (source.includes(handlerAnchor)) {
      const handler = `    if(msg.type==='networkPingSnapshot'){\n      if(networkRole!=='host'&&sourceId==='host'){\n        multiplayerRemotePingRoster=(Array.isArray(msg.rows)?msg.rows:[]).slice(0,4).map(raw=>{const id=safeText(raw?.id||'',12);if(!['host',...GUEST_IDS].includes(id))return null;const ping=Number.isFinite(raw?.ping)?clamp(Math.round(raw.ping),0,9999):null;return {id,name:safeText(raw?.name||id,24)||id,role:id==='host'?'host':'guest',ping};}).filter(Boolean);\n      }\n      return;\n    }\n`;
      source = source.replace(handlerAnchor, handlerAnchor + handler);
    } else {
      console.warn('Optional LIVE patch missing: network ping snapshot handler anchor');
    }

    return source;
  });

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectAllPlayerPings() {
    previousUi?.();

    if (!document.getElementById('allPlayerPingsStyles')) {
      const style = document.createElement('style');
      style.id = 'allPlayerPingsStyles';
      style.textContent = `
/* Replace the earlier host-only average list with one row per player. */
.network-peer-pings{display:none!important}
.network-all-pings{display:grid;gap:4px;min-width:0;padding-top:4px;border-top:1px solid rgba(255,255,255,.08)}
.network-all-pings[hidden]{display:none!important}
.network-all-pings-title{font-size:6px;color:#8fa8b3;letter-spacing:.11em;font-weight:900}
.network-all-ping-row{display:grid;grid-template-columns:7px minmax(0,1fr) auto auto;gap:5px;align-items:center;min-width:0;padding:5px 6px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.035)}
.network-all-ping-dot{width:7px;height:7px;border-radius:50%;background:#7ef7d4;box-shadow:0 0 7px rgba(126,247,212,.58)}
.network-all-ping-row strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:#e9ffff}
.network-all-ping-role{padding:2px 4px;border-radius:5px;background:rgba(99,223,245,.11);color:#9deeff;font-size:6px;font-weight:900;letter-spacing:.06em;white-space:nowrap}
.network-all-ping-row em{font-style:normal;font-size:8px;font-weight:900;color:#8ff5df;white-space:nowrap}
.network-all-ping-row[data-quality="waiting"] .network-all-ping-dot{background:#ffd36f;box-shadow:0 0 6px rgba(255,211,111,.5)}
.network-all-ping-row[data-quality="waiting"] em{color:#ffd36f}
.network-all-ping-row[data-quality="high"] .network-all-ping-dot{background:#ff9b73;box-shadow:0 0 6px rgba(255,155,115,.55)}
.network-all-ping-row[data-quality="high"] em{color:#ffb091}
.network-all-ping-row[data-local="true"]{border-color:rgba(126,247,212,.22);background:rgba(126,247,212,.055)}
.network-all-ping-row[data-local="true"] .network-all-ping-role{background:rgba(126,247,212,.13);color:#9affdf}
#multiplayerNetworkPanel .network-all-pings{max-height:132px;overflow:auto;scrollbar-width:thin}
.network-all-pings-lobby{margin:6px 0 0;padding:7px;border:1px solid rgba(99,223,245,.18);border-radius:10px;background:rgba(4,10,18,.22);grid-template-columns:repeat(2,minmax(0,1fr))}
.network-all-pings-lobby .network-all-pings-title{grid-column:1/-1}
@media(max-width:700px){.network-all-pings-lobby{grid-template-columns:1fr}.network-all-ping-row{grid-template-columns:7px minmax(0,1fr) auto auto}}
`;
      document.head.appendChild(style);
    }

    const createList = (parent, lobby = false) => {
      if (!parent) return null;
      let list = parent.querySelector(':scope > .network-all-pings');
      if (list) return list;
      list = document.createElement('div');
      list.className = `network-all-pings${lobby ? ' network-all-pings-lobby' : ''}`;
      list.hidden = true;
      const title = document.createElement('span');
      title.className = 'network-all-pings-title';
      title.textContent = 'ALL PLAYER PINGS';
      list.appendChild(title);
      if (lobby) parent.insertAdjacentElement('afterend', list);
      else parent.appendChild(list);
      return list;
    };

    const panel = document.getElementById('multiplayerNetworkPanel');
    const gameList = createList(panel);
    const hostList = createList(document.querySelector('#hostModal .network-status-strip'), true);
    const joinList = createList(document.querySelector('#joinModal .network-status-strip'), true);

    const quality = row => {
      if (row.local) return 'local';
      if (!Number.isFinite(row.ping)) return 'waiting';
      if (row.ping > 220) return 'high';
      return 'normal';
    };

    const renderList = (list, rows, visible) => {
      if (!list) return;
      list.hidden = !visible;
      if (!visible) return;
      const title = list.querySelector('.network-all-pings-title') || document.createElement('span');
      list.replaceChildren(title);
      if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'network-all-ping-row';
        empty.dataset.quality = 'waiting';
        empty.innerHTML = '<i class="network-all-ping-dot"></i><strong>Waiting for network data</strong><span class="network-all-ping-role">WAIT</span><em>-- ms</em>';
        list.appendChild(empty);
        return;
      }
      for (const row of rows) {
        const item = document.createElement('div');
        item.className = 'network-all-ping-row';
        item.dataset.quality = quality(row);
        item.dataset.local = row.local ? 'true' : 'false';
        const dot = document.createElement('i'); dot.className = 'network-all-ping-dot';
        const name = document.createElement('strong'); name.textContent = row.name || row.id;
        const role = document.createElement('span'); role.className = 'network-all-ping-role'; role.textContent = row.local ? 'YOU' : (row.role === 'host' ? 'HOST' : 'GUEST');
        const ping = document.createElement('em'); ping.textContent = row.local ? 'LOCAL' : (row.pingLabel || '-- ms');
        item.append(dot, name, role, ping);
        list.appendChild(item);
      }
    };

    const render = () => {
      const telemetry = window.__CRITTER_NETWORK_TELEMETRY__?.();
      const rows = window.__CRITTER_NETWORK_ALL_PINGS__?.() || [];
      const active = !!telemetry?.active;
      renderList(gameList, rows, active && !!telemetry?.inMatch);
      renderList(hostList, rows, active && telemetry?.role === 'host' && !!document.getElementById('hostModal')?.open);
      renderList(joinList, rows, active && telemetry?.role === 'guest' && !!document.getElementById('joinModal')?.open);
    };

    render();
    const timer = window.setInterval(render, 200);
    window.addEventListener('pagehide', () => window.clearInterval(timer), { once:true });
  };
})();

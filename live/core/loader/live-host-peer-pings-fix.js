(() => {
  'use strict';

  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Host peer ping fix loaded before the Critter patch runtime');
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const anchor = '  function updateMultiplayerHud(force=false){';
    if (!source.includes(anchor)) {
      console.warn('Optional LIVE patch missing: host peer ping telemetry anchor');
      return source;
    }

    const telemetry = `  window.__CRITTER_NETWORK_PEER_PINGS__=()=>{\n    if(networkRole!=='host')return [];\n    const now=performance.now();\n    return GUEST_IDS.map(id=>{\n      const channel=hostChannels.get(id);\n      if(!channel||channel.readyState!=='open')return null;\n      const sample=multiplayerPingSamples.get(id),fresh=!!sample&&now-sample.at<8000;\n      const ping=fresh?clamp(Math.round(sample.rtt),0,9999):null;\n      const profile=players?.[id]?.profile||lobbyProfiles?.[id]||{};\n      return {id,name:safeText(profile.displayName||profile.username||id,24)||id,ping,pingLabel:Number.isFinite(ping)?ping+' ms':'-- ms',state:channel.readyState};\n    }).filter(Boolean);\n  };\n`;

    return source.replace(anchor, telemetry + anchor);
  });

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectHostPeerPings() {
    previousUi?.();

    if (!document.getElementById('hostPeerPingsStyles')) {
      const style = document.createElement('style');
      style.id = 'hostPeerPingsStyles';
      style.textContent = `
.network-peer-pings{display:grid;gap:4px;min-width:0}
.network-peer-pings[hidden]{display:none!important}
.network-peer-pings-title{font-size:6px;color:#8fa8b3;letter-spacing:.11em;font-weight:900}
.network-peer-ping-row{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:6px;align-items:center;min-width:0;padding:5px 6px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.035)}
.network-peer-ping-dot{width:7px;height:7px;border-radius:50%;background:#7ef7d4;box-shadow:0 0 7px rgba(126,247,212,.6)}
.network-peer-ping-row strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:#e9ffff}
.network-peer-ping-row em{font-style:normal;font-size:8px;font-weight:900;color:#8ff5df;white-space:nowrap}
.network-peer-ping-row[data-quality="waiting"] .network-peer-ping-dot{background:#ffd36f;box-shadow:0 0 6px rgba(255,211,111,.55)}
.network-peer-ping-row[data-quality="waiting"] em{color:#ffd36f}
.network-peer-ping-row[data-quality="high"] .network-peer-ping-dot{background:#ff9b73;box-shadow:0 0 6px rgba(255,155,115,.55)}
.network-peer-ping-row[data-quality="high"] em{color:#ffb091}
#multiplayerNetworkPanel .network-peer-pings{padding-top:3px;border-top:1px solid rgba(255,255,255,.08)}
#hostModal .network-peer-pings-lobby{margin:6px 0 0;padding:7px;border:1px solid rgba(99,223,245,.18);border-radius:10px;background:rgba(4,10,18,.22);grid-template-columns:repeat(3,minmax(0,1fr))}
#hostModal .network-peer-pings-lobby .network-peer-pings-title{grid-column:1/-1}
@media(max-width:700px){#hostModal .network-peer-pings-lobby{grid-template-columns:1fr}}
`;
      document.head.appendChild(style);
    }

    const makeList = (root, lobby = false) => {
      if (!root) return null;
      let list = root.querySelector(':scope > .network-peer-pings');
      if (list) return list;
      list = document.createElement('div');
      list.className = `network-peer-pings${lobby ? ' network-peer-pings-lobby' : ''}`;
      list.hidden = true;
      const title = document.createElement('span');
      title.className = 'network-peer-pings-title';
      title.textContent = 'CONNECTED PLAYER PINGS';
      list.appendChild(title);
      if (lobby) root.insertAdjacentElement('afterend', list);
      else root.appendChild(list);
      return list;
    };

    const inGamePanel = document.getElementById('multiplayerNetworkPanel');
    const inGameList = makeList(inGamePanel);
    const hostStrip = document.querySelector('#hostModal .network-status-strip');
    const lobbyList = makeList(hostStrip, true);

    const quality = ping => {
      if (!Number.isFinite(ping)) return 'waiting';
      if (ping > 220) return 'high';
      return 'normal';
    };

    const renderList = (list, peers, visible) => {
      if (!list) return;
      list.hidden = !visible;
      if (!visible) return;
      const title = list.querySelector('.network-peer-pings-title');
      list.replaceChildren(title || document.createElement('span'));
      if (!peers.length) {
        const row = document.createElement('div');
        row.className = 'network-peer-ping-row';
        row.dataset.quality = 'waiting';
        const dot = document.createElement('i'); dot.className = 'network-peer-ping-dot';
        const name = document.createElement('strong'); name.textContent = 'Waiting for non-host players';
        const ping = document.createElement('em'); ping.textContent = '-- ms';
        row.append(dot, name, ping); list.appendChild(row); return;
      }
      for (const peer of peers) {
        const row = document.createElement('div');
        row.className = 'network-peer-ping-row';
        row.dataset.quality = quality(peer.ping);
        const dot = document.createElement('i'); dot.className = 'network-peer-ping-dot';
        const name = document.createElement('strong'); name.textContent = peer.name;
        const ping = document.createElement('em'); ping.textContent = peer.pingLabel;
        row.append(dot, name, ping); list.appendChild(row);
      }
    };

    const render = () => {
      const base = window.__CRITTER_NETWORK_TELEMETRY__?.();
      const peers = window.__CRITTER_NETWORK_PEER_PINGS__?.() || [];
      const hostActive = base?.role === 'host';
      renderList(inGameList, peers, !!hostActive && !!base?.inMatch);
      renderList(lobbyList, peers, !!hostActive && !!document.getElementById('hostModal')?.open);
    };

    render();
    const timer = window.setInterval(render, 250);
    window.addEventListener('pagehide', () => window.clearInterval(timer), { once:true });
  };
})();

(() => {
  'use strict';

  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Network status panel fix loaded before the Critter patch runtime');
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const pingGate = "    if(!match||match.role==='solo'||!networkConnected())return;";
    if (source.includes(pingGate)) {
      source = source.replace(pingGate, "    if(networkRole==='solo'||!networkConnected())return;");
    } else {
      console.warn('Optional LIVE patch missing: lobby network ping gate');
    }

    const anchor = '  function updateMultiplayerHud(force=false){';
    if (!source.includes(anchor)) {
      console.warn('Optional LIVE patch missing: multiplayer network telemetry anchor');
      return source;
    }

    const telemetry = `  window.__CRITTER_NETWORK_TELEMETRY__=()=>{\n    const role=networkRole||'solo';\n    const hostOpen=role==='host'?[...hostChannels.values()].filter(channel=>channel?.readyState==='open').length:0;\n    const guestState=guestChannel?.readyState||'closed';\n    const connected=role==='host'?hostOpen>0:guestState==='open';\n    const signaling=peer?.open?'ready':(peer?'connecting':'offline');\n    const channelState=role==='host'?(hostOpen>0?'open':(peer?.open?'waiting':(peer?'connecting':'closed'))):guestState;\n    let playerCount=1;\n    try{playerCount=match&&match.role!=='solo'?Object.keys(players||{}).length:(role==='host'?1+hostOpen:Math.max(1,connectedCount()));}catch(_){playerCount=connected?2:1;}\n    const pingText=typeof multiplayerPingLabel==='function'?multiplayerPingLabel():'-- ms';\n    const pingValue=Number.parseInt(pingText,10);\n    const status=connected?'connected':((channelState==='connecting'||signaling==='connecting')?'connecting':(role==='host'&&peer?.open?'waiting':'offline'));\n    return {\n      version:1,active:role!=='solo',inMatch:!!match&&match.role!=='solo',role,connected,status,channelState,signaling,\n      peerState:peer?.open?'open':(peer?.disconnected?'disconnected':(peer?'opening':'closed')),\n      players:playerCount,maxPlayers:MAX_PLAYERS,ping:Number.isFinite(pingValue)?pingValue:null,\n      pingLabel:Number.isFinite(pingValue)?pingValue+' ms':'-- ms',room:String(roomPin||'')\n    };\n  };\n`;

    return source.replace(anchor, telemetry + anchor);
  });

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectNetworkStatusPanelFix() {
    previousUi?.();

    if (!document.getElementById('networkStatusPanelFixStyles')) {
      const style = document.createElement('style');
      style.id = 'networkStatusPanelFixStyles';
      style.textContent = `
.multiplayer-network-panel{
  position:absolute;left:18px;top:162px;z-index:27;width:218px;box-sizing:border-box;
  display:grid;gap:7px;padding:9px 10px;border:1px solid rgba(99,223,245,.52);
  border-radius:13px;background:linear-gradient(145deg,rgba(5,13,22,.78),rgba(15,19,40,.66));
  -webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);box-shadow:0 10px 30px rgba(0,0,0,.32);
  color:#efffff;pointer-events:none;text-shadow:0 1px 4px rgba(0,0,0,.8)
}
.multiplayer-network-panel[hidden]{display:none!important}
.network-panel-head{display:grid;grid-template-columns:29px minmax(0,1fr) 10px;gap:8px;align-items:center}
.network-radio-icon{display:grid;place-items:center;width:29px;height:29px;border:1px solid rgba(99,223,245,.42);border-radius:9px;background:rgba(99,223,245,.1);font-size:18px;color:#8ff5ef}
.network-panel-title{display:grid;gap:1px;min-width:0}.network-panel-title strong{font-size:9px;letter-spacing:.11em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.network-panel-title small{font-size:7px;color:#9eb9c3;letter-spacing:.08em}
.network-state-dot{width:9px;height:9px;border-radius:50%;background:#6f7b8d;box-shadow:0 0 0 3px rgba(111,123,141,.13)}
.multiplayer-network-panel[data-state="connected"] .network-state-dot,.network-status-strip[data-state="connected"] .network-state-dot{background:#7ef7d4;box-shadow:0 0 0 3px rgba(126,247,212,.15),0 0 12px rgba(126,247,212,.8)}
.multiplayer-network-panel[data-state="waiting"] .network-state-dot,.network-status-strip[data-state="waiting"] .network-state-dot{background:#ffd36f;box-shadow:0 0 0 3px rgba(255,211,111,.15)}
.multiplayer-network-panel[data-state="connecting"] .network-state-dot,.network-status-strip[data-state="connecting"] .network-state-dot{background:#63dff5;box-shadow:0 0 0 3px rgba(99,223,245,.15);animation:networkPulse 1s ease-in-out infinite}
.multiplayer-network-panel[data-state="offline"] .network-state-dot,.network-status-strip[data-state="offline"] .network-state-dot{background:#ff6f91;box-shadow:0 0 0 3px rgba(255,111,145,.14)}
.network-panel-metrics{display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:5px}
.network-metric{display:grid;gap:2px;min-width:0;padding:5px 6px;border:1px solid rgba(255,255,255,.09);border-radius:8px;background:rgba(255,255,255,.035)}
.network-metric span{font-size:6px;color:#8fa8b3;letter-spacing:.1em}.network-metric strong{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.network-signal-row{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center}.network-signal-bars{height:15px;display:flex;align-items:end;gap:2px}.network-signal-bars i{display:block;width:3px;border-radius:2px;background:#40505d}.network-signal-bars i:nth-child(1){height:4px}.network-signal-bars i:nth-child(2){height:7px}.network-signal-bars i:nth-child(3){height:11px}.network-signal-bars i:nth-child(4){height:15px}
.network-signal-bars[data-quality="1"] i:nth-child(-n+1),.network-signal-bars[data-quality="2"] i:nth-child(-n+2),.network-signal-bars[data-quality="3"] i:nth-child(-n+3),.network-signal-bars[data-quality="4"] i:nth-child(-n+4){background:#7ef7d4;box-shadow:0 0 6px rgba(126,247,212,.45)}
.network-signal-row small{font-size:7px;line-height:1.25;color:#9fb6bf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.network-status-strip{display:grid;grid-template-columns:auto repeat(4,minmax(0,1fr));gap:5px;align-items:center;margin:6px 0 0;padding:6px;border:1px solid rgba(99,223,245,.2);border-radius:10px;background:rgba(4,10,18,.26)}
.network-status-strip[hidden]{display:none!important}.network-status-strip .network-state-dot{margin:0 3px}.network-status-chip{display:grid;gap:1px;min-width:0;padding:4px 5px;border-radius:7px;background:rgba(255,255,255,.035)}.network-status-chip span{font-size:6px;color:#8fa8b3;letter-spacing:.08em}.network-status-chip strong{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@keyframes networkPulse{50%{opacity:.38;transform:scale(.78)}}
@media(max-height:620px){.multiplayer-network-panel{left:10px;top:106px;width:205px;padding:7px 8px;gap:5px}.network-panel-metrics{gap:3px}.network-metric{padding:4px 5px}}
@media(max-width:700px){.multiplayer-network-panel{left:8px;top:82px;width:190px}.network-status-strip{grid-template-columns:auto repeat(2,minmax(0,1fr))}.network-status-chip:nth-of-type(3),.network-status-chip:nth-of-type(4){display:none}}
`;
      document.head.appendChild(style);
    }

    const shell = document.querySelector('.game-shell');
    let panel = document.getElementById('multiplayerNetworkPanel');
    if (shell && !panel) {
      panel = document.createElement('section');
      panel.id = 'multiplayerNetworkPanel';
      panel.className = 'multiplayer-network-panel';
      panel.hidden = true;
      panel.setAttribute('aria-label', 'Multiplayer network status');
      panel.setAttribute('aria-live', 'polite');
      panel.innerHTML = '<div class="network-panel-head"><span class="network-radio-icon" aria-hidden="true">⌁</span><div class="network-panel-title"><strong data-network-title>MULTIPLAYER NETWORK</strong><small data-network-subtitle>WEBRTC DIRECT CONNECTION</small></div><i class="network-state-dot" aria-hidden="true"></i></div><div class="network-panel-metrics"><div class="network-metric"><span>STATUS</span><strong data-network-state>OFFLINE</strong></div><div class="network-metric"><span>PLAYERS</span><strong data-network-players>1/4</strong></div><div class="network-metric"><span>PING</span><strong data-network-ping>-- ms</strong></div></div><div class="network-signal-row"><span class="network-signal-bars" data-network-bars data-quality="0"><i></i><i></i><i></i><i></i></span><small data-network-detail>No multiplayer connection</small></div>';
      shell.appendChild(panel);
    }

    const makeLobbyStrip = modalId => {
      const modal = document.getElementById(modalId);
      const status = modal?.querySelector('.network-status');
      if (!modal || !status) return null;
      let strip = modal.querySelector('.network-status-strip');
      if (strip) return strip;
      strip = document.createElement('div');
      strip.className = 'network-status-strip';
      strip.hidden = true;
      strip.innerHTML = '<i class="network-state-dot" aria-hidden="true"></i><div class="network-status-chip"><span>ROLE</span><strong data-network-role>--</strong></div><div class="network-status-chip"><span>TRANSPORT</span><strong>WEBRTC</strong></div><div class="network-status-chip"><span>PLAYERS</span><strong data-network-players>1/4</strong></div><div class="network-status-chip"><span>PING</span><strong data-network-ping>-- ms</strong></div>';
      status.insertAdjacentElement('afterend', strip);
      return strip;
    };

    const hostStrip = makeLobbyStrip('hostModal');
    const joinStrip = makeLobbyStrip('joinModal');

    const qualityForPing = ping => {
      if (!Number.isFinite(ping)) return 0;
      if (ping <= 60) return 4;
      if (ping <= 120) return 3;
      if (ping <= 220) return 2;
      return 1;
    };

    const stateLabel = telemetry => {
      if (telemetry.connected) return 'CONNECTED';
      if (telemetry.status === 'waiting') return 'ROOM OPEN';
      if (telemetry.status === 'connecting') return 'CONNECTING';
      return 'OFFLINE';
    };

    const detailLabel = telemetry => {
      if (telemetry.connected) return 'Secure direct WebRTC channel open';
      if (telemetry.status === 'waiting') return 'Signaling ready • waiting for players';
      if (telemetry.status === 'connecting') return 'Opening multiplayer peer connection';
      return 'No multiplayer connection';
    };

    const renderRoot = (root, telemetry, compact = false) => {
      if (!root) return;
      root.dataset.state = telemetry.status || 'offline';
      root.querySelector('[data-network-role]')?.replaceChildren(document.createTextNode((telemetry.role || 'solo').toUpperCase()));
      root.querySelector('[data-network-title]')?.replaceChildren(document.createTextNode(telemetry.role === 'host' ? 'HOST NETWORK' : 'GUEST NETWORK'));
      root.querySelector('[data-network-state]')?.replaceChildren(document.createTextNode(stateLabel(telemetry)));
      root.querySelectorAll('[data-network-players]').forEach(node => { node.textContent = `${telemetry.players}/${telemetry.maxPlayers}`; });
      root.querySelectorAll('[data-network-ping]').forEach(node => { node.textContent = telemetry.pingLabel; });
      const bars = root.querySelector('[data-network-bars]');
      if (bars) bars.dataset.quality = String(qualityForPing(telemetry.ping));
      const detail = root.querySelector('[data-network-detail]');
      if (detail) detail.textContent = detailLabel(telemetry);
      if (!compact) root.setAttribute('aria-label', `${stateLabel(telemetry)}, ${telemetry.players} of ${telemetry.maxPlayers} players, ping ${telemetry.pingLabel}`);
    };

    const render = () => {
      const getter = window.__CRITTER_NETWORK_TELEMETRY__;
      const telemetry = typeof getter === 'function' ? getter() : null;
      if (!telemetry) {
        if (panel) panel.hidden = true;
        if (hostStrip) hostStrip.hidden = true;
        if (joinStrip) joinStrip.hidden = true;
        return;
      }

      if (panel) {
        panel.hidden = !telemetry.active || !telemetry.inMatch;
        if (!panel.hidden) renderRoot(panel, telemetry);
      }

      if (hostStrip) {
        hostStrip.hidden = telemetry.role !== 'host';
        if (!hostStrip.hidden) renderRoot(hostStrip, telemetry, true);
      }
      if (joinStrip) {
        joinStrip.hidden = telemetry.role !== 'guest';
        if (!joinStrip.hidden) renderRoot(joinStrip, telemetry, true);
      }
    };

    render();
    const timer = window.setInterval(render, 250);
    window.addEventListener('pagehide', () => window.clearInterval(timer), { once:true });
  };
})();

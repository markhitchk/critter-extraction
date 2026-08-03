(() => {
  'use strict';
  const S = window.CritterSecurityRuntime;
  if (!S) return;

  const parse = data => {
    try {
      return { message: typeof data === 'string' ? JSON.parse(data) : data, string: typeof data === 'string' };
    } catch (_) {
      return { message: null, string: typeof data === 'string' };
    }
  };
  const encode = packet => packet.string ? JSON.stringify(packet.message) : packet.message;
  const isGlobalBan = ban => ban?.banType === 'global' || ban?.source === 'remote' ||
    S.remote().bans.some(item => item.id === ban?.id || item.id === ban?.banId);

  function ensureStyles() {
    if (document.getElementById('critterSecurityBlockStyles')) return;
    const style = document.createElement('style');
    style.id = 'critterSecurityBlockStyles';
    style.textContent = `
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
`;
    document.head.append(style);
  }

  function showBlockScreen(ban = {}) {
    ensureStyles();
    const global = isGlobalBan(ban);
    const id = global ? 'critterGlobalBanDialog' : 'critterHostBanDialog';
    let dialog = document.getElementById(id);
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = id;
      dialog.className = 'critter-security-block-screen';
      dialog.innerHTML = '<div class="critter-security-block-card"><header><div><span class="eyebrow ban-eyebrow"></span><h2 class="ban-title"></h2></div></header><div class="account-note"><strong class="reason"></strong><p class="scope-note"></p><p class="expiry"></p><code class="ban-id"></code><p><a class="appeal" target="_blank" rel="noopener noreferrer" hidden>Open appeal information</a></p></div><footer><button class="primary close-ban" type="button"></button></footer></div>';
      document.body.append(dialog);
      dialog.querySelector('.close-ban').onclick = () => dialog.close();
    }

    const card = dialog.querySelector('.critter-security-block-card');
    card.classList.toggle('host-block', !global);
    dialog.querySelector('.ban-eyebrow').textContent = global ? 'GLOBAL MULTIPLAYER SECURITY' : 'HOST-LOCAL MULTIPLAYER SECURITY';
    dialog.querySelector('.ban-title').textContent = global ? 'Global Multiplayer Ban' : 'Blocked by This Host';
    dialog.querySelector('.scope-note').textContent = global
      ? 'This restriction applies to multiplayer rooms across Critter Extraction. Solo play remains available.'
      : 'This host has blocked this profile from rooms created by this host. This is not a global Critter Extraction ban, and other hosts may still allow the profile to join.';
    dialog.querySelector('.reason').textContent = S.text(ban.reason || 'This profile is blocked from multiplayer.', 240);

    const expires = ban.expiresAt ? Date.parse(ban.expiresAt) : NaN;
    dialog.querySelector('.expiry').textContent = Number.isFinite(expires)
      ? `Restriction expires ${new Date(expires).toLocaleString()}.`
      : 'This restriction has no automatic expiration.';
    dialog.querySelector('.ban-id').textContent = `${global ? 'Global' : 'Host'} Ban ID: ${S.text(ban.banId || ban.id || 'security-ban', 80)}`;

    const appeal = dialog.querySelector('.appeal');
    const url = String(ban.appealUrl || '');
    if (/^https?:\/\//i.test(url)) {
      appeal.href = url;
      appeal.hidden = false;
    } else {
      appeal.removeAttribute('href');
      appeal.hidden = true;
    }
    dialog.querySelector('.close-ban').textContent = global ? 'Return to Menu' : 'Close Host Notice';
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute('open', '');
  }

  const notice = ban => ({
    type: 'securityBan',
    banId: S.text(ban?.id || 'security-ban', 80),
    banType: isGlobalBan(ban) ? 'global' : 'host',
    source: S.text(ban?.source || '', 32),
    reason: S.text(ban?.reason || 'Multiplayer access restricted.', 240),
    expiresAt: ban?.expiresAt || null,
    appealUrl: ban?.appealUrl || '',
    securityVersion: S.VERSION
  });

  function reject(connection, ban, stage) {
    if (!connection || connection.__critterSecurityRejected) return;
    connection.__critterSecurityRejected = true;
    S.log('connection-blocked', {
      stage,
      banId: ban.id,
      banType: isGlobalBan(ban) ? 'global' : 'host',
      reason: ban.reason
    });
    const finish = () => {
      try { connection.send(JSON.stringify(notice(ban))); } catch (_) {}
      setTimeout(() => { try { connection.close(); } catch (_) {} }, 180);
    };
    if (connection.open) finish();
    else connection.on?.('open', finish);
  }

  function wrapConnection(connection, direction = 'unknown') {
    if (!connection || connection.__critterSecurityWrapped) return connection;
    connection.__critterSecurityWrapped = true;
    connection.__critterSecurityDirection = direction;
    const metadata = S.identity(connection.metadata?.security || {});
    if (metadata.securityId || metadata.installHash || metadata.username) connection.__critterSecurityIdentity = metadata;

    const nativeSend = typeof connection.send === 'function' ? connection.send.bind(connection) : null;
    if (nativeSend) connection.send = function (data) {
      const packet = parse(data), message = packet.message;
      if (message && typeof message === 'object') {
        if (message.type === 'profile' && message.profile && typeof message.profile === 'object') message.profile.security = S.identity();
        if (message.type === 'fairPlayWarning') S.log('fair-play-warning-sent', { code: message.code || 'FP', strikes: Number(message.strikes) || 0 });
        if (message.type === 'fairPlayRemoved' && !connection.__critterFairPlayBanCreated) {
          connection.__critterFairPlayBanCreated = true;
          const ban = S.autoBan(connection.__critterSecurityIdentity || metadata, message.code || 'FP-REMOVED');
          S.log('fair-play-removal', { code: message.code || 'FP-REMOVED', banId: ban?.id || '', autoBanCreated: !!ban });
        }
        return nativeSend(encode(packet));
      }
      return nativeSend(data);
    };

    const nativeOn = typeof connection.on === 'function' ? connection.on.bind(connection) : null;
    if (nativeOn) connection.on = function (event, callback) {
      if (event !== 'data' || typeof callback !== 'function') return nativeOn(event, callback);
      return nativeOn('data', data => {
        const packet = parse(data), message = packet.message;
        if (message?.type === 'securityBan') {
          S.log('ban-notice-received', { banId: message.banId || '', banType: message.banType || 'host', reason: message.reason || '' });
          showBlockScreen(message);
          setTimeout(() => { try { connection.close(); } catch (_) {} }, 50);
          return;
        }
        if (message?.type === 'profile' && message.profile && typeof message.profile === 'object') {
          const identity = S.identity(message.profile.security || {});
          connection.__critterSecurityIdentity = identity;
          Promise.race([S.ready(), new Promise(resolve => setTimeout(resolve, 1500))]).then(() => {
            const ban = S.find(identity);
            if (ban) reject(connection, ban, 'profile');
            else if (!connection.__critterSecurityRejected) callback(data);
          });
          return;
        }
        if (!connection.__critterSecurityRejected) callback(data);
      });
    };
    return connection;
  }

  function copyStatics(target, source) {
    for (const key of Object.getOwnPropertyNames(source)) {
      if (['length', 'name', 'prototype'].includes(key)) continue;
      try { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); } catch (_) {}
    }
  }

  function wrapPeer(PeerConstructor) {
    if (typeof PeerConstructor !== 'function' || PeerConstructor.__critterSecurityWrappedConstructor) return PeerConstructor;
    function SecurePeer(...args) {
      const selfBan = S.find(S.identity(), { remoteOnly: true });
      if (selfBan) {
        S.log('local-multiplayer-blocked', { banId: selfBan.id, banType: 'global', reason: selfBan.reason });
        showBlockScreen({ ...selfBan, banType: 'global' });
        throw new Error('Critter Extraction multiplayer access is restricted for this profile.');
      }
      const peer = Reflect.construct(PeerConstructor, args, PeerConstructor), requested = args[0];
      if (!peer || peer.__critterSecurityWrapped) return peer;
      peer.__critterSecurityWrapped = true;
      peer.__critterSecurityHost = /^harleys-critter-\d{6}$/i.test(String(requested || ''));

      if (typeof peer.connect === 'function') {
        const connect = peer.connect.bind(peer);
        peer.connect = (peerId, options = {}) => wrapConnection(connect(peerId, {
          ...(options || {}),
          metadata: { ...(options?.metadata || {}), security: S.identity(), securityVersion: S.VERSION }
        }), 'guest-outbound');
      }
      if (typeof peer.on === 'function') {
        const on = peer.on.bind(peer);
        peer.on = function (event, callback) {
          if (event !== 'connection' || typeof callback !== 'function') return on(event, callback);
          return on('connection', connection => {
            wrapConnection(connection, 'host-inbound');
            Promise.race([S.ready(), new Promise(resolve => setTimeout(resolve, 1500))]).then(() => {
              const identity = connection.__critterSecurityIdentity || S.identity(connection.metadata?.security || {});
              connection.__critterSecurityIdentity = identity;
              const ban = S.find(identity);
              if (ban) reject(connection, ban, 'metadata');
              else callback(connection);
            });
          });
        };
      }
      return peer;
    }
    SecurePeer.prototype = PeerConstructor.prototype;
    try { Object.setPrototypeOf(SecurePeer, PeerConstructor); } catch (_) {}
    copyStatics(SecurePeer, PeerConstructor);
    Object.defineProperty(SecurePeer, '__critterSecurityWrappedConstructor', { value: true });
    return SecurePeer;
  }

  function install() {
    let value = typeof window.Peer === 'function' ? wrapPeer(window.Peer) : window.Peer;
    try {
      Object.defineProperty(window, 'Peer', {
        configurable: true,
        enumerable: true,
        get() { return value; },
        set(next) { value = wrapPeer(next); }
      });
    } catch (_) {
      const timer = setInterval(() => {
        if (typeof window.Peer === 'function' && !window.Peer.__critterSecurityWrappedConstructor) window.Peer = wrapPeer(window.Peer);
      }, 100);
      setTimeout(() => clearInterval(timer), 120000);
    }
  }

  S.showBanDialog = showBlockScreen;
  S.wrapSecurityConnection = wrapConnection;
  install();
})();

(() => {
  'use strict';

  const { one } = window.__CRITTER_PATCH_UTILS__;
  const bodyOf = fn => {
    const source = fn.toString();
    return source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'));
  };

  function injectedRecoveryRuntime() {
    const RECOVERY_NOTIFICATION_LIMIT = 30;
    let recoveryLastCheckpointAt = 0;
    let recoveryLastSignature = '';
    let recoveryUiReady = false;

    function ensureRecoveryAccount(account = activeAccount()) {
      if (!account) return null;
      if (!Array.isArray(account.notifications)) account.notifications = [];
      account.notifications = account.notifications
        .filter(note => note && typeof note === 'object')
        .slice(-RECOVERY_NOTIFICATION_LIMIT);
      for (const note of account.notifications) {
        if (note.status === 'claiming') note.status = 'ready';
        note.unread = note.unread === true;
      }
      if (account.activeRecovery && typeof account.activeRecovery !== 'object') account.activeRecovery = null;
      return account;
    }

    function recoveryCompactItems(slots, account = activeAccount()) {
      const kit = LOADOUTS[account?.loadoutId] || LOADOUTS[defaultLoadoutId];
      const normalized = normalizeSlots(slots, SLOT_COUNT);
      const issued = Object.create(null);
      const totals = Object.create(null);
      if (!kit.custom) {
        for (const entry of kit.items || []) {
          const id = String(entry?.[0] || '');
          const qty = Math.max(0, Math.floor(Number(entry?.[1]) || 0));
          if (ITEMS[id] && qty) issued[id] = (issued[id] || 0) + qty;
        }
      }
      for (const item of normalized) {
        if (!item || !ITEMS[item.id]) continue;
        if (!kit.custom && ITEMS[item.id].ammo) continue;
        let qty = Math.max(0, Math.floor(Number(item.qty) || 0));
        if (!kit.custom) {
          const excluded = Math.min(qty, issued[item.id] || 0);
          issued[item.id] = Math.max(0, (issued[item.id] || 0) - excluded);
          qty -= excluded;
        }
        if (qty) totals[item.id] = (totals[item.id] || 0) + qty;
      }
      return Object.entries(totals).map(([id, qty]) => ({ id, qty }));
    }

    function recoverySignature(items) {
      return JSON.stringify((items || []).map(item => [item.id, item.qty]));
    }

    function addRecoveryNotification(account, note) {
      account = ensureRecoveryAccount(account);
      if (!account) return null;
      const dedupeKey = String(note.dedupeKey || '');
      if (dedupeKey) {
        const existing = account.notifications.find(entry => entry.dedupeKey === dedupeKey);
        if (existing) return existing;
      }
      const entry = {
        id: `notice-${uid()}`,
        type: 'info',
        title: 'Notification',
        body: '',
        createdAt: Date.now(),
        unread: true,
        status: 'ready',
        items: [],
        ...note
      };
      entry.title = safeText(entry.title, 80) || 'Notification';
      entry.body = safeText(entry.body, 240);
      entry.items = Array.isArray(entry.items)
        ? entry.items.filter(item => item && ITEMS[item.id] && Number(item.qty) > 0).map(item => ({ id:item.id, qty:Math.floor(Number(item.qty)) }))
        : [];
      account.notifications.push(entry);
      account.notifications = account.notifications.slice(-RECOVERY_NOTIFICATION_LIMIT);
      return entry;
    }

    function beginRecoverySnapshot(account, role, rules) {
      account = ensureRecoveryAccount(account);
      if (!account) return false;
      const normalizedRules = normalizeRoomRules(rules || {});
      if (role !== 'solo' && normalizedRules.mode === 'pvp') {
        account.activeRecovery = null;
        return false;
      }
      const items = recoveryCompactItems(backpack, account);
      account.activeRecovery = {
        id: `drop-${uid()}`,
        accountId: account.id,
        state: 'active',
        mode: role === 'solo' ? 'solo' : 'coop',
        role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items,
        protected: false,
        protectionReason: '',
        disqualified: false,
        interruptReason: ''
      };
      recoveryLastCheckpointAt = Date.now();
      recoveryLastSignature = recoverySignature(items);
      refreshRecoveryNotifications();
      return true;
    }

    function checkpointRecoverySnapshot(force = false, interruptReason = '') {
      if (!match || match.ended || match.mode === 'pvp') return false;
      const account = ensureRecoveryAccount(activeAccount());
      const snapshot = account?.activeRecovery;
      if (!snapshot || snapshot.disqualified) return false;
      const now = Date.now();
      if (!force && now - recoveryLastCheckpointAt < 1800) return false;
      const items = recoveryCompactItems(backpack, account);
      const signature = recoverySignature(items);
      recoveryLastCheckpointAt = now;
      if (!force && signature === recoveryLastSignature) return false;
      snapshot.items = items;
      snapshot.updatedAt = now;
      if (interruptReason) {
        snapshot.state = 'interrupted';
        snapshot.interruptReason = safeText(interruptReason, 180);
        snapshot.interruptedAt = now;
      }
      recoveryLastSignature = signature;
      return saveDB();
    }

    function queueRecoverySnapshot(account, snapshot, reason = '') {
      account = ensureRecoveryAccount(account);
      if (!account || !snapshot) return null;
      if (snapshot.disqualified || snapshot.mode === 'pvp') {
        account.activeRecovery = null;
        return null;
      }
      const items = Array.isArray(snapshot.items) ? snapshot.items : [];
      const modeLabel = snapshot.mode === 'solo' ? 'Solo Drop' : 'Co-op Drop';
      const protectedReason = reason || snapshot.protectionReason || snapshot.interruptReason || 'The previous run ended before it could finish.';
      const note = addRecoveryNotification(account, {
        type: items.length ? 'recovery' : 'info',
        title: items.length ? `${modeLabel} Recovery` : `${modeLabel} Interrupted`,
        body: items.length
          ? `${protectedReason} Your recoverable gear and loot are ready to restore to the Account Stash.`
          : `${protectedReason} No stash-eligible items were present at the latest checkpoint.`,
        createdAt: Date.now(),
        unread: true,
        status: items.length ? 'ready' : 'info',
        items,
        recoveryId: snapshot.id,
        dedupeKey: `recovery:${snapshot.id}`,
        mode: snapshot.mode,
        reason: safeText(protectedReason, 180)
      });
      account.activeRecovery = null;
      return note;
    }

    function recoveryReasonProtected(reason = '') {
      return /(disconnect|connection closed|connection lost|network error|host unavailable|host disconnected|session interrupted|fair play|cheat|timed out)/i.test(String(reason || ''));
    }

    function settleRecoveryBeforeMatchEnd(success, reason = '') {
      const account = ensureRecoveryAccount(activeAccount());
      const snapshot = account?.activeRecovery;
      if (!snapshot) return false;
      if (success || match?.mode === 'pvp' || snapshot.disqualified) {
        account.activeRecovery = null;
        saveDB();
        refreshRecoveryNotifications();
        return false;
      }
      if (snapshot.protected || recoveryReasonProtected(reason)) {
        checkpointRecoverySnapshot(true, reason || snapshot.protectionReason || 'The run was interrupted.');
        queueRecoverySnapshot(account, snapshot, reason);
      } else account.activeRecovery = null;
      saveDB();
      refreshRecoveryNotifications();
      return true;
    }

    function markRecoveryInterrupted(reason = 'The game or network session ended unexpectedly.') {
      if (!match || match.ended || match.mode === 'pvp') return false;
      const account = ensureRecoveryAccount(activeAccount());
      if (!account?.activeRecovery || account.activeRecovery.disqualified) return false;
      checkpointRecoverySnapshot(true, reason);
      return true;
    }

    function protectRecoverySnapshot(reason = 'Fair Play protected this run after another player was removed.') {
      if (!match || match.ended || match.mode === 'pvp') return false;
      const account = ensureRecoveryAccount(activeAccount());
      const snapshot = account?.activeRecovery;
      if (!snapshot || snapshot.disqualified) return false;
      checkpointRecoverySnapshot(true);
      snapshot.protected = true;
      snapshot.protectionReason = safeText(reason, 180);
      addRecoveryNotification(account, {
        type: 'info',
        title: 'Fair Play Protection Active',
        body: `${snapshot.protectionReason} If this solo/co-op run is interrupted or fails, the latest eligible inventory checkpoint can be restored from Notifications.`,
        createdAt: Date.now(),
        unread: true,
        status: 'info',
        dedupeKey: `protection:${snapshot.id}`
      });
      saveDB();
      refreshRecoveryNotifications();
      return true;
    }

    function disqualifyRecoverySnapshot(reason = 'Fair Play removal') {
      const account = ensureRecoveryAccount(activeAccount());
      if (!account?.activeRecovery) return false;
      account.activeRecovery.disqualified = true;
      account.activeRecovery.disqualifiedReason = safeText(reason, 120);
      account.activeRecovery.items = [];
      saveDB();
      return true;
    }

    function recoverInterruptedSnapshotForAccount(account = activeAccount()) {
      if (match) return false;
      account = ensureRecoveryAccount(account);
      const snapshot = account?.activeRecovery;
      if (!snapshot) return false;
      if (snapshot.disqualified || snapshot.mode === 'pvp') account.activeRecovery = null;
      else queueRecoverySnapshot(account, snapshot, snapshot.interruptReason || snapshot.protectionReason || 'The previous run stopped before a normal result was saved.');
      saveDB();
      return true;
    }

    function formatRecoveryDate(value) {
      try { return new Date(Number(value) || Date.now()).toLocaleString(); }
      catch (_) { return 'Recently'; }
    }

    function claimRecoveryNotification(id) {
      const account = ensureRecoveryAccount(activeAccount());
      const note = account?.notifications.find(entry => entry.id === id);
      if (!note || note.type !== 'recovery' || note.status !== 'ready') return false;
      const backup = deepCopy({ stash:account.stash, notifications:account.notifications });
      note.status = 'claiming';
      note.unread = false;
      if (!saveDB()) {
        account.stash = backup.stash;
        account.notifications = backup.notifications;
        toast('CE-RECOVERY-SAVE: Recovery could not start. No items changed.', 3600);
        return false;
      }
      let restored = 0;
      const remaining = [];
      for (const item of note.items || []) {
        if (!item || !ITEMS[item.id]) continue;
        const qty = Math.max(0, Math.floor(Number(item.qty) || 0));
        if (!qty) continue;
        const moved = addItem(account.stash, item.id, qty);
        restored += moved;
        if (moved < qty) remaining.push({ id:item.id, qty:qty - moved });
      }
      note.items = remaining;
      note.status = remaining.length ? 'ready' : 'claimed';
      note.claimedAt = Date.now();
      if (!saveDB()) {
        account.stash = backup.stash;
        account.notifications = backup.notifications;
        saveDB();
        toast('CE-RECOVERY-SAVE: Recovery was rolled back because the save failed.', 3800);
        refreshRecoveryNotifications();
        return false;
      }
      refreshAccountUI();
      refreshRecoveryNotifications();
      if (remaining.length) toast(`Restored ${restored} item${restored === 1 ? '' : 's'}. Make more Stash room to claim the rest.`, 3800);
      else toast(`Restored ${restored} item${restored === 1 ? '' : 's'} to the Account Stash.`, 3200);
      return true;
    }

    function dismissRecoveryNotification(id) {
      const account = ensureRecoveryAccount(activeAccount());
      const index = account?.notifications.findIndex(entry => entry.id === id) ?? -1;
      if (index < 0) return false;
      const note = account.notifications[index];
      if (note.type === 'recovery' && note.status === 'ready') return false;
      account.notifications.splice(index, 1);
      saveDB();
      refreshRecoveryNotifications();
      return true;
    }

    function refreshRecoveryNotifications() {
      const account = ensureRecoveryAccount(activeAccount());
      const notes = account?.notifications || [];
      const button = document.getElementById('recoveryNotificationsBtn');
      const badge = document.getElementById('recoveryNotificationsBadge');
      const list = document.getElementById('recoveryNotificationsList');
      const unread = notes.filter(note => note.unread).length;
      if (button) button.setAttribute('aria-label', `Notifications${unread ? `, ${unread} unread` : ''}`);
      if (badge) {
        badge.hidden = unread < 1;
        badge.textContent = unread > 99 ? '99+' : String(unread);
      }
      if (!list) return;
      list.textContent = '';
      if (!notes.length) {
        const empty = document.createElement('div');
        empty.className = 'recovery-notifications-empty';
        empty.innerHTML = '<strong>No notifications</strong><span>Interrupted solo/co-op recovery and Fair Play notices will appear here.</span>';
        list.append(empty);
        return;
      }
      for (const note of [...notes].reverse()) {
        const card = document.createElement('article');
        card.className = `recovery-notification-card${note.unread ? ' is-unread' : ''}${note.status === 'claimed' ? ' is-claimed' : ''}`;
        const heading = document.createElement('header');
        const titleWrap = document.createElement('div');
        const eyebrow = document.createElement('span');
        eyebrow.className = 'eyebrow';
        eyebrow.textContent = note.type === 'recovery' ? 'ITEM RECOVERY' : 'SYSTEM NOTICE';
        const title = document.createElement('h3');
        title.textContent = note.title || 'Notification';
        const time = document.createElement('time');
        time.textContent = formatRecoveryDate(note.createdAt);
        titleWrap.append(eyebrow, title);
        heading.append(titleWrap, time);
        const body = document.createElement('p');
        body.textContent = note.body || '';
        card.append(heading, body);
        if (note.type === 'recovery' && Array.isArray(note.items) && note.items.length) {
          const items = document.createElement('div');
          items.className = 'recovery-notification-items';
          for (const item of note.items) {
            const chip = document.createElement('span');
            chip.textContent = `${ITEMS[item.id]?.name || item.id} ×${item.qty}`;
            items.append(chip);
          }
          card.append(items);
        }
        const actions = document.createElement('footer');
        if (note.type === 'recovery' && note.status === 'ready') {
          const claim = document.createElement('button');
          claim.type = 'button';
          claim.className = 'primary';
          claim.dataset.recoveryClaim = note.id;
          claim.textContent = 'Restore to Stash';
          actions.append(claim);
        } else {
          const dismiss = document.createElement('button');
          dismiss.type = 'button';
          dismiss.className = 'secondary';
          dismiss.dataset.recoveryDismiss = note.id;
          dismiss.textContent = note.status === 'claimed' ? 'Remove' : 'Dismiss';
          actions.append(dismiss);
        }
        card.append(actions);
        list.append(card);
      }
    }

    function openRecoveryNotifications() {
      const account = ensureRecoveryAccount(activeAccount());
      for (const note of account?.notifications || []) note.unread = false;
      saveDB();
      refreshRecoveryNotifications();
      const modal = document.getElementById('recoveryNotificationsModal');
      if (modal && !modal.open) modal.showModal();
    }

    function initRecoveryNotifications() {
      if (recoveryUiReady) return;
      const topActions = document.querySelector('.top-actions');
      if (!topActions) return;
      recoveryUiReady = true;

      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'recoveryNotificationsBtn';
      button.className = 'ghost recovery-notifications-button';
      button.innerHTML = '<span aria-hidden="true">🔔</span><span>Notifications</span><b id="recoveryNotificationsBadge" hidden>0</b>';
      button.addEventListener('click', openRecoveryNotifications);
      topActions.prepend(button);

      const modal = document.createElement('dialog');
      modal.id = 'recoveryNotificationsModal';
      modal.className = 'modal recovery-notifications-modal';
      modal.innerHTML = '<form method="dialog" class="recovery-notifications-shell"><header><div><span class="eyebrow">ACCOUNT INBOX</span><h2>Notifications</h2><p>One-time recovery for interrupted solo/co-op drops and Fair Play protection updates.</p></div><button class="icon-close" value="cancel" aria-label="Close notifications">×</button></header><div id="recoveryNotificationsList" class="recovery-notifications-list"></div><footer class="recovery-notifications-policy"><strong>Recovery rules</strong><span>No PvP/arena recovery. Voluntary exits still lose unextracted loot. Claims never add XP or Petals.</span></footer></form>';
      modal.addEventListener('click', event => {
        const claim = event.target.closest('[data-recovery-claim]');
        if (claim) { event.preventDefault(); claimRecoveryNotification(claim.dataset.recoveryClaim); return; }
        const dismiss = event.target.closest('[data-recovery-dismiss]');
        if (dismiss) { event.preventDefault(); dismissRecoveryNotification(dismiss.dataset.recoveryDismiss); }
      });
      document.body.append(modal);

      const style = document.createElement('style');
      style.id = 'recoveryNotificationsStyle';
      style.textContent = `
        .recovery-notifications-button{position:relative;display:inline-flex!important;align-items:center;gap:7px}
        .recovery-notifications-button>b{position:absolute;right:-5px;top:-6px;display:grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border:2px solid #11162a;border-radius:999px;background:#ff5f72;color:#fff;font-size:10px;line-height:1;font-weight:950;box-shadow:0 3px 10px rgba(0,0,0,.38)}
        .recovery-notifications-button>b[hidden]{display:none!important}
        body.in-match .recovery-notifications-button{display:none!important}
        .recovery-notifications-modal{width:min(760px,calc(100vw - 24px));max-height:min(84vh,760px);padding:0;border:1px solid rgba(103,240,239,.38);border-radius:20px;background:#11162a;color:#eefcff;box-shadow:0 28px 90px rgba(0,0,0,.62);overflow:hidden}
        .recovery-notifications-modal::backdrop{background:rgba(3,6,13,.76);backdrop-filter:blur(8px)}
        .recovery-notifications-shell{display:grid;grid-template-rows:auto minmax(160px,1fr) auto;max-height:min(84vh,760px)}
        .recovery-notifications-shell>header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(145deg,rgba(103,240,239,.09),rgba(164,145,255,.06))}
        .recovery-notifications-shell>header h2{margin:3px 0 5px;font-size:28px}.recovery-notifications-shell>header p{margin:0;max-width:560px;color:#aebfca;font-size:13px;line-height:1.5}
        .recovery-notifications-shell .icon-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.16);border-radius:11px;background:rgba(255,255,255,.06);color:#fff;font-size:25px;cursor:pointer}
        .recovery-notifications-list{display:grid;align-content:start;gap:12px;padding:18px 20px;overflow:auto}
        .recovery-notifications-empty{display:grid;place-items:center;gap:7px;min-height:210px;padding:28px;text-align:center;border:1px dashed rgba(255,255,255,.15);border-radius:15px;color:#8ea4af}.recovery-notifications-empty strong{color:#eaffff;font-size:17px}
        .recovery-notification-card{display:grid;gap:11px;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:rgba(4,9,18,.54);box-shadow:0 10px 28px rgba(0,0,0,.22)}
        .recovery-notification-card.is-unread{border-color:rgba(103,240,239,.58);box-shadow:0 0 0 1px rgba(103,240,239,.12),0 12px 34px rgba(0,0,0,.3)}
        .recovery-notification-card.is-claimed{opacity:.72}.recovery-notification-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.recovery-notification-card h3{margin:3px 0 0;font-size:17px}.recovery-notification-card time{color:#78909b;font-size:10px;white-space:nowrap}.recovery-notification-card p{margin:0;color:#bed0d8;font-size:12px;line-height:1.55}
        .recovery-notification-items{display:flex;flex-wrap:wrap;gap:6px}.recovery-notification-items span{padding:6px 8px;border:1px solid rgba(103,240,239,.22);border-radius:8px;background:rgba(103,240,239,.07);color:#dffefd;font-size:10px;font-weight:800}
        .recovery-notification-card>footer{display:flex;justify-content:flex-end}.recovery-notification-card>footer button{min-width:150px}
        .recovery-notifications-policy{display:grid;gap:3px;padding:14px 22px;border-top:1px solid rgba(255,255,255,.09);background:rgba(3,7,14,.55);color:#8fa5af;font-size:10px;line-height:1.4}.recovery-notifications-policy strong{color:#cfeff0;text-transform:uppercase;letter-spacing:.08em}
        @media(max-width:720px){.recovery-notifications-button>span:nth-child(2){display:none}.recovery-notifications-shell>header{padding:18px}.recovery-notifications-list{padding:13px}.recovery-notification-card>header{display:grid}.recovery-notification-card time{white-space:normal}.recovery-notification-card>footer button{width:100%}}
      `;
      document.head.append(style);
      recoverInterruptedSnapshotForAccount(activeAccount());
      refreshRecoveryNotifications();
      window.__CRITTER_RECOVERY__ = {
        notifications: () => deepCopy(ensureRecoveryAccount(activeAccount()).notifications),
        active: () => deepCopy(ensureRecoveryAccount(activeAccount()).activeRecovery),
        checkpoint: () => checkpointRecoverySnapshot(true),
        open: openRecoveryNotifications
      };
    }
  }

  const recoveryRuntime = bodyOf(injectedRecoveryRuntime);

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    source = one(
      source,
      'recovery notifications runtime',
      /  const formatPetals = value =>/,
      `${recoveryRuntime}\n\n  const formatPetals = value =>`
    );

    source = one(
      source,
      'begin non-pvp recovery checkpoint',
      /    account\.stats\.matches\+\+; saveDB\(\);/,
      `    account.stats.matches++; beginRecoverySnapshot(account, role, roomRules); saveDB();`
    );

    source = one(
      source,
      'refresh interrupted drop checkpoint',
      /      updateHUD\(\);\n    \}\n    drawWorld\(\);/,
      `      updateHUD();\n      checkpointRecoverySnapshot();\n    }\n    drawWorld();`
    );

    source = one(
      source,
      'settle recovery before match result',
      /    if \(!match \|\| match\.ended\) return;\n    if\(success&&match\.objectives\)/,
      `    if (!match || match.ended) return;\n    settleRecoveryBeforeMatchEnd(success, reason);\n    if(success&&match.objectives)`
    );

    source = one(
      source,
      'protect remaining players after fair play removal',
      /    if\(state\.strikes>=12\)\{sendNet\(\{type:'fairPlayRemoved',code\},sourceId\);toast\(([^;]+)\);setTimeout\(\(\)=>hostChannels\.get\(sourceId\)\?\.close\(\),180\);\}/,
      (match, toastExpression) => `    if(state.strikes>=12&&!state.removalIssued){state.removalIssued=true;protectRecoverySnapshot('Fair Play removed another player from this run.');sendNet({type:'recoveryProtection',reason:'Fair Play removed another player from this run.'});sendNet({type:'fairPlayRemoved',code},sourceId);toast(${toastExpression});setTimeout(()=>hostChannels.get(sourceId)?.close(),180);}`
    );

    source = one(
      source,
      'handle recovery protection and disqualify removed cheater',
      /    if\(msg\.type==='fairPlayRemoved'&&networkRole==='guest'\)\{toast\('Disconnected: Fair Play limits were repeatedly exceeded\.',4200\);try\{guestChannel\?\.close\(\);\}catch\(_\)\{\}return;\}/,
      `    if(msg.type==='recoveryProtection'&&networkRole==='guest'){protectRecoverySnapshot(safeText(msg.reason||'Fair Play protected this run.',180));return;}\n    if(msg.type==='fairPlayRemoved'&&networkRole==='guest'){disqualifyRecoverySnapshot('Fair Play removed this account from the run.');toast('Disconnected: Fair Play limits were repeatedly exceeded.',4200);try{guestChannel?.close();}catch(_){}return;}`
    );

    source = one(
      source,
      'refresh notification account context',
      /  function refreshAccountUI\(\) \{\n    const a = activeAccount\(\);/,
      `  function refreshAccountUI() {\n    const a = activeAccount();\n    ensureRecoveryAccount(a);\n    if(!match)recoverInterruptedSnapshotForAccount(a);\n    refreshRecoveryNotifications();`
    );

    source = one(
      source,
      'save recovery checkpoint on page exit',
      /  document\.addEventListener\('visibilitychange',\(\)=>\{if\(document\.hidden&&match&&!pauseMenuOpen\)openPauseMenu\(\);\}\);/,
      match => `${match}\n  window.addEventListener('pagehide',()=>markRecoveryInterrupted('The browser or network session ended before the run could finish.'));`
    );

    source = one(
      source,
      'initialize recovery notifications',
      /  renderCharacterRoster\(\); refreshAccountUI\(\); renderAccounts\(\); loadSettingsForm\(\); renderQuickbar\(\);/,
      `  renderCharacterRoster(); refreshAccountUI(); renderAccounts(); loadSettingsForm(); renderQuickbar(); initRecoveryNotifications();`
    );

    source = one(
      source,
      'recovery diagnostics',
      /    storageKey:STORAGE_KEY,/,
      `    storageKey:STORAGE_KEY,recoveryNotifications:()=>deepCopy(ensureRecoveryAccount(activeAccount()).notifications),activeRecovery:()=>deepCopy(ensureRecoveryAccount(activeAccount()).activeRecovery),`
    );

    return source;
  });
})();

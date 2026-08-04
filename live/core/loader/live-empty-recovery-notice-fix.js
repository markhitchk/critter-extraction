(() => {
  'use strict';

  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Empty recovery notice fix loaded before the Critter patch runtime');
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const notificationCleanupAnchor = `      account.notifications = account.notifications
        .filter(note => note && typeof note === 'object')
        .slice(-RECOVERY_NOTIFICATION_LIMIT);`;
    const notificationCleanupReplacement = `      account.notifications = account.notifications
        .filter(note => note && typeof note === 'object')
        .filter(note => !(
          note.type === 'info' &&
          (!Array.isArray(note.items) || note.items.length === 0) &&
          String(note.body || '').includes('No stash-eligible items were present at the latest checkpoint.')
        ))
        .slice(-RECOVERY_NOTIFICATION_LIMIT);`;

    if (!source.includes(notificationCleanupAnchor)) {
      throw new Error('LIVE patch missing: remove old empty recovery notices');
    }
    source = source.replace(notificationCleanupAnchor, notificationCleanupReplacement);

    const emptySnapshotAnchor = `      const items = Array.isArray(snapshot.items) ? snapshot.items : [];
      const modeLabel = snapshot.mode === 'solo' ? 'Solo Drop' : 'Co-op Drop';`;
    const emptySnapshotReplacement = `      const items = Array.isArray(snapshot.items) ? snapshot.items : [];
      if (!items.length) {
        account.activeRecovery = null;
        return null;
      }
      const modeLabel = snapshot.mode === 'solo' ? 'Solo Drop' : 'Co-op Drop';`;

    if (!source.includes(emptySnapshotAnchor)) {
      throw new Error('LIVE patch missing: suppress empty recovery notification');
    }
    return source.replace(emptySnapshotAnchor, emptySnapshotReplacement);
  });
})();

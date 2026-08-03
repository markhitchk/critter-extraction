(() => {
  'use strict';

  const { one } = window.__CRITTER_PATCH_UTILS__;

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    source = one(
      source,
      'guest returns to menu when host connection closes',
      /conn\.on\('close',\(\)=>\{if\(guestChannel===adapter\)guestChannel=null;joinBusy=false;setNetworkStatus\('join','Connection closed','','Enter the room code again to reconnect\.'\);refreshJoinAction\(\);if\(match&&!match\.ended\)toast\('Disconnected from host'\);\}\);/,
      "conn.on('close',()=>{const wasActive=guestChannel===adapter;if(wasActive)guestChannel=null;if(!wasActive)return;joinBusy=false;if(match&&!match.ended&&match.role==='guest'){toast('Host disconnected — returning to main menu',3200);endMatch(false,'Host disconnected.',true,null,true);return;}setNetworkStatus('join','Connection closed','','Enter the room code again to reconnect.');refreshJoinAction();});",
      false
    );

    source = one(
      source,
      'guest host snapshot timeout watchdog',
      /    if \(!match\) return;\n    if \(!paused && !match\.ended\) \{/,
      `    if (!match) return;
    if(match.role==='guest'&&!match.ended){
      if(document.visibilityState!=='visible')match.netLastSnapshotAt=now;
      else if(!match.netLastSnapshotAt)match.netLastSnapshotAt=now;
      else if(now-match.netLastSnapshotAt>10000){
        toast('Host disconnected — returning to main menu',3200);
        endMatch(false,'Host disconnected.',true,null,true);
        return;
      }
    }
    if (!paused && !match.ended) {`,
      false
    );

    return source;
  });
})();

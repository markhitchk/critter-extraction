(() => {
  'use strict';

  const CORE_URL = './js/game-core.js?v=0.27.1-hotfix7';
  const patches = [
    {
      name: 'canonical join-code parser',
      find: String.raw`  function joinPinFromUrl(){try{const pin=String(new URL(location.href).searchParams.get('join')||'').trim();return /^\d{6}$/.test(pin)?pin:'';}catch(_){return '';}}`,
      replace: String.raw`  function joinPinFromUrl(){try{const url=new URL(location.href),join=String(url.searchParams.get('join')||'').trim(),fallback=String(url.searchParams.get('code')||url.searchParams.get('room')||url.searchParams.get('pin')||'').trim(),pin=/^\d{6}$/.test(join)?join:(/^\d{6}$/.test(fallback)?fallback:'');if(!pin)return '';if(join!==pin||url.searchParams.has('code')||url.searchParams.has('room')||url.searchParams.has('pin')){url.searchParams.set('join',pin);url.searchParams.delete('code');url.searchParams.delete('room');url.searchParams.delete('pin');history.replaceState({},'',url.pathname+url.search+url.hash);}return pin;}catch(_){return '';}}`
    },
    {
      name: 'canonical generated room URL',
      find: String.raw`  function joinUrlForPin(pin=roomPin){const clean=String(pin||'').replace(/\D/g,'').slice(0,6);if(!/^\d{6}$/.test(clean))return '';try{const url=new URL(location.href);url.searchParams.set('join',clean);url.hash='';return url.toString();}catch(_){return '';}}`,
      replace: String.raw`  function joinUrlForPin(pin=roomPin){const clean=String(pin||'').replace(/\D/g,'').slice(0,6);if(!/^\d{6}$/.test(clean))return '';try{const url=new URL(location.href);url.search='';url.searchParams.set('join',clean);url.hash='';return url.toString();}catch(_){return '';}}`
    },
    {
      name: 'matching account import overwrite and duplicate cleanup',
      find: String.raw`  function installImportedAccount(account) {
    const a = normalizeImportedAccount(account), previousActiveId = db.activeId;
    db.accounts.push(a); db.activeId = a.id;
    if (!saveDB()) {
      db.accounts = db.accounts.filter(x => x.id !== a.id); db.activeId = previousActiveId;
      toast('Account restore failed: browser storage may be full'); return false;
    }
    refreshAccountUI(); renderAccounts(); toast('Separate account restored'); return true;
  }`,
      replace: String.raw`  function installImportedAccount(account) {
    const source = account && typeof account === 'object' ? deepCopy(account) : {}, previousDb = deepCopy(db);
    const cleanUsername = value => safeText(value, 18).replace(/[^A-Za-z0-9_-]/g, '');
    const importedUsername = cleanUsername(source.username), importedLower = importedUsername.toLowerCase();
    const sameProgressIdentity = candidate => {
      if (!candidate) return false;
      const sameName = String(candidate.displayName || '').trim().toLowerCase() === String(source.displayName || '').trim().toLowerCase();
      const sameXp = Math.max(0, Number(candidate.xp) || 0) === Math.max(0, Number(source.xp) || 0);
      const sameExtracts = Math.max(0, Number(candidate.stats?.extracts) || 0) === Math.max(0, Number(source.stats?.extracts) || 0);
      return sameName && sameXp && sameExtracts;
    };
    let canonicalUsername = importedUsername, targetIndex = -1;
    const underscoreIndex = importedUsername.lastIndexOf('_');
    if (underscoreIndex > 0) {
      const suffixText = importedUsername.slice(underscoreIndex + 1), suffixNumber = Number(suffixText);
      if (suffixText && Number.isInteger(suffixNumber) && suffixNumber >= 2 && String(suffixNumber) === suffixText) {
        const baseLower = importedUsername.slice(0, underscoreIndex).toLowerCase();
        const baseIndex = db.accounts.findIndex(x => String(x.username || '').trim().toLowerCase() === baseLower);
        if (baseIndex >= 0 && sameProgressIdentity(db.accounts[baseIndex])) {
          targetIndex = baseIndex;
          canonicalUsername = db.accounts[baseIndex].username;
        }
      }
    }
    if (targetIndex < 0 && source.id) targetIndex = db.accounts.findIndex(x => x.id === source.id);
    if (targetIndex < 0 && importedLower) targetIndex = db.accounts.findIndex(x => String(x.username || '').trim().toLowerCase() === importedLower);
    const target = targetIndex >= 0 ? db.accounts[targetIndex] : null;
    if (target && !canonicalUsername) canonicalUsername = target.username;
    const canonicalLower = String(canonicalUsername || '').toLowerCase();
    const aliasPrefix = canonicalLower ? canonicalLower + '_' : '';
    const removeIndexes = new Set();
    if (targetIndex >= 0) removeIndexes.add(targetIndex);
    if (aliasPrefix) db.accounts.forEach((candidate, index) => {
      const candidateName = String(candidate.username || '').trim().toLowerCase();
      const aliasText = candidateName.startsWith(aliasPrefix) ? candidateName.slice(aliasPrefix.length) : '';
      const aliasNumber = Number(aliasText);
      const isNumberedAlias = aliasText && Number.isInteger(aliasNumber) && aliasNumber >= 2 && String(aliasNumber) === aliasText;
      if (index !== targetIndex && isNumberedAlias && sameProgressIdentity(candidate)) removeIndexes.add(index);
    });
    const removedDuplicates = Math.max(0, removeIndexes.size - (targetIndex >= 0 ? 1 : 0));
    db.accounts = db.accounts.filter((_, index) => !removeIndexes.has(index));
    if (canonicalUsername) source.username = canonicalUsername;
    const a = normalizeImportedAccount(source);
    if (target) a.id = target.id;
    const insertAt = targetIndex >= 0 ? Math.min(targetIndex, db.accounts.length) : db.accounts.length;
    db.accounts.splice(insertAt, 0, a); db.activeId = a.id;
    if (!saveDB()) {
      db = previousDb; refreshAccountUI(); renderAccounts();
      toast('Account restore failed: browser storage may be full'); return false;
    }
    refreshAccountUI(); renderAccounts();
    toast(target ? (removedDuplicates ? 'Account overwritten; duplicate device account removed' : 'Existing account overwritten from import') : 'Separate account restored');
    return true;
  }`
    },
    {
      name: 'import help explains overwrite behavior',
      find: String.raw`    dom.backupTitle.textContent = 'Import Account'; dom.backupHelp.textContent = 'Paste a Critter Extraction account backup code. It restores a separate local account with its profile, progress, stash, loadout, currency, settings, and statistics.';`,
      replace: String.raw`    dom.backupTitle.textContent = 'Import Account'; dom.backupHelp.textContent = 'Paste a Critter Extraction account backup code. Any matching username or account ID is overwritten instead of creating _2 or another duplicate; different usernames restore as separate accounts.';`
    },
    {
      name: 'enemy aggro on damage',
      find: String.raw`        const damage=weapon.damage*target.multiplier;target.enemy.hp-=damage;hitAny=true;hitKind='enemy';headshot=headshot||target.part==='head';`,
      replace: String.raw`        const damage=weapon.damage*target.multiplier;target.enemy.hp-=damage;target.enemy.aggroTargetId=p.id;target.enemy.aggroUntil=performance.now()+60000;target.enemy.reactionAt=performance.now()+180;target.enemy.patrolTarget=null;target.enemy.patrolWait=0;target.enemy.attack=0;hitAny=true;hitKind='enemy';headshot=headshot||target.part==='head';`
    },
    {
      name: 'training enemy retaliates when attacked',
      find: String.raw`      if(e.training){e.moveBlend=0;continue;}`,
      replace: String.raw`      if(e.training&&!(e.aggroUntil>performance.now())){e.moveBlend=0;continue;}`
    },
    {
      name: 'enemy retaliation target selection',
      find: String.raw`      let target=null,best=Infinity;for(const p of Object.values(players)){if(!p.alive||activeSafeZoneAt(p.x,p.z))continue;const d=dist2(e,p);if(d<best){best=d;target=p;}}
      if(!target||best>tune.detect){`,
      replace: String.raw`      const aggroNow=performance.now(),enemyWeapon=WEAPONS[e.weaponId]||WEAPONS.acorn_sprayer;
      let target=e.aggroUntil>aggroNow?players[e.aggroTargetId]:null,best=target&&target.alive&&!activeSafeZoneAt(target.x,target.z)?dist2(e,target):Infinity;
      const alerted=!!target&&Number.isFinite(best);
      if(!alerted){e.aggroTargetId='';e.aggroUntil=0;e.reactionAt=0;target=null;best=Infinity;for(const p of Object.values(players)){if(!p.alive||activeSafeZoneAt(p.x,p.z))continue;const d=dist2(e,p);if(d<best){best=d;target=p;}}}else e.aggroUntil=Math.max(e.aggroUntil,aggroNow+15000);
      const detectRange=alerted?140:tune.detect;
      if(!target||best>detectRange){`
    },
    {
      name: 'attacked training enemy pursuit speed',
      find: String.raw`      const fx=dx/d,fz=dz/d,rx=fz,rz=-fx,nx=fx*move+rx*strafe,nz=fz*move+rz*strafe,nextX=e.x+nx*e.speed*tune.move*dt,nextZ=e.z+nz*e.speed*tune.move*dt;
      e.moveBlend=Math.abs(move)+Math.abs(strafe)>.08?1:0;if(e.moveBlend)e.walkTime=(e.walkTime||0)+dt*7;
      if(!activeSafeZoneAt(nextX,nextZ))moveEntityWithCollisions(e,nx*e.speed*tune.move*dt,nz*e.speed*tune.move*dt,.45);`,
      replace: String.raw`      const effectiveSpeed=e.training&&alerted?1.65:e.speed,fx=dx/d,fz=dz/d,rx=fz,rz=-fx,nx=fx*move+rx*strafe,nz=fz*move+rz*strafe,nextX=e.x+nx*effectiveSpeed*tune.move*dt,nextZ=e.z+nz*effectiveSpeed*tune.move*dt;
      e.moveBlend=Math.abs(move)+Math.abs(strafe)>.08?1:0;if(e.moveBlend)e.walkTime=(e.walkTime||0)+dt*7;
      if(!activeSafeZoneAt(nextX,nextZ))moveEntityWithCollisions(e,nx*effectiveSpeed*tune.move*dt,nz*effectiveSpeed*tune.move*dt,.45);`
    },
    {
      name: 'enemy retaliation shooting range',
      find: String.raw`      if(best<tune.shoot&&!blocked&&e.attack<=0){e.attack=tune.coolMin+Math.random()*(tune.coolMax-tune.coolMin);enemyShoot(e,target,best,tune.damage);}else if(best<1.2&&e.attack<=0){`,
      replace: String.raw`      const shootRange=alerted?Math.max(tune.shoot,enemyWeapon.range*.92):tune.shoot,retaliationReady=!alerted||aggroNow>=(e.reactionAt||0);
      if(best<shootRange&&!blocked&&e.attack<=0&&retaliationReady){e.attack=tune.coolMin+Math.random()*(tune.coolMax-tune.coolMin);enemyShoot(e,target,best,tune.damage);if(alerted)e.aggroUntil=Math.max(e.aggroUntil,aggroNow+15000);}else if(best<1.2&&e.attack<=0){`
    }
  ];

  function reportFailure(error) {
    console.error('Critter Extraction hotfix loader failed', error);
    window.__critterBootReport?.('failure', `Hotfix loader failed: ${error?.message || error}`);
  }

  fetch(CORE_URL, { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`Could not load game core (HTTP ${response.status})`);
      return response.text();
    })
    .then(source => {
      let patched = source;
      for (const patch of patches) {
        if (!patched.includes(patch.find)) throw new Error(`Patch target missing: ${patch.name}`);
        patched = patched.replace(patch.find, patch.replace);
      }
      const blob = new Blob([`${patched}\n//# sourceURL=js/game-core.hotfixed.js`], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => URL.revokeObjectURL(url);
      script.onerror = () => {
        URL.revokeObjectURL(url);
        reportFailure(new Error('The patched game core could not execute'));
      };
      document.head.appendChild(script);
    })
    .catch(reportFailure);
})();

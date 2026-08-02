(() => {
  'use strict';

  const CORE_URL = './js/game-core.js?v=0.27.1-hotfix2';
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
      name: 'enemy aggro on damage',
      find: String.raw`        const damage=weapon.damage*target.multiplier;target.enemy.hp-=damage;hitAny=true;hitKind='enemy';headshot=headshot||target.part==='head';`,
      replace: String.raw`        const damage=weapon.damage*target.multiplier;target.enemy.hp-=damage;target.enemy.aggroTargetId=p.id;target.enemy.aggroUntil=performance.now()+15000;target.enemy.reactionAt=performance.now()+180;target.enemy.patrolTarget=null;target.enemy.attack=0;hitAny=true;hitKind='enemy';headshot=headshot||target.part==='head';`
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
      if(!alerted){e.aggroTargetId='';e.aggroUntil=0;e.reactionAt=0;target=null;best=Infinity;for(const p of Object.values(players)){if(!p.alive||activeSafeZoneAt(p.x,p.z))continue;const d=dist2(e,p);if(d<best){best=d;target=p;}}}
      const detectRange=alerted?Math.max(tune.detect,Math.min(72,enemyWeapon.range*.92)):tune.detect;
      if(!target||best>detectRange){`
    },
    {
      name: 'enemy retaliation shooting range',
      find: String.raw`      if(best<tune.shoot&&!blocked&&e.attack<=0){e.attack=tune.coolMin+Math.random()*(tune.coolMax-tune.coolMin);enemyShoot(e,target,best,tune.damage);}else if(best<1.2&&e.attack<=0){`,
      replace: String.raw`      const shootRange=alerted?Math.max(tune.shoot,Math.min(68,enemyWeapon.range*.88)):tune.shoot,retaliationReady=!alerted||aggroNow>=(e.reactionAt||0);
      if(best<shootRange&&!blocked&&e.attack<=0&&retaliationReady){e.attack=tune.coolMin+Math.random()*(tune.coolMax-tune.coolMin);enemyShoot(e,target,best,tune.damage);if(alerted)e.aggroUntil=Math.max(e.aggroUntil,aggroNow+5000);}else if(best<1.2&&e.attack<=0){`
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

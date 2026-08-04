/* Harley's Studios — Appearance scrolling and Critter Code locks v4. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_APPEARANCE_V4__) return;
  window.__NEW_CRITTER_APPEARANCE_V4__ = true;

  const STORAGE_KEY = 'critterExtractionInventory';
  const STARTERS = new Set(['puppy','bunny','kitty','fox','panda','bear']);
  const REWARDS = Object.freeze({
    raccoon:{name:'Raccoon',body:'#8f98a3',accent:'#353846',asset:'raccoon.svg',keys:['raccoon','critter_raccoon','b04']},
    redpanda:{name:'Red Panda',body:'#bd5b3e',accent:'#f6e0c5',asset:'redpanda.svg',keys:['redpanda','red_panda','critter_red_panda','b06']},
    penguin:{name:'Penguin',body:'#26364b',accent:'#f4f7fb',asset:'penguin.svg',keys:['penguin','critter_penguin','b02']},
    crow:{name:'Crow',body:'#202430',accent:'#515a70',asset:'crow.svg',keys:['crow','critter_crow','b03']},
    frog:{name:'Frog',body:'#71b85a',accent:'#d6ee8e',asset:'frog.svg',keys:['frog','critter_frog','b05']},
    arcticfox:{name:'Arctic Fox',body:'#eef5fb',accent:'#b9d4e8',asset:'arcticfox.svg',keys:['arcticfox','arctic_fox','critter_arctic_fox','b07']},
    capybara:{name:'Capybara',body:'#ad7651',accent:'#6d4734',asset:'capybara.svg',keys:['capybara','critter_capybara','b08']},
    axolotl:{name:'Axolotl',body:'#f1a9bd',accent:'#cf638f',asset:'axolotl.svg',keys:['axolotl','critter_axolotl','b09']}
  });
  const OWNERSHIP_KEY = /owned|ownership|unlock|redeem|claim|reward|code|bundle/i;
  let queued = false;

  const normalize = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const compact = value => normalize(value).replace(/_/g,'');

  function readDb() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch (_) { return null; }
  }

  function activeAccount(db = readDb()) {
    return db?.accounts?.find(item => item?.id === db.activeId) || db?.accounts?.[0] || null;
  }

  function addTokens(value, tokens, seen = new Set()) {
    if (value == null) return;
    if (typeof value !== 'object') {
      const normal = normalize(value);
      if (normal) { tokens.add(normal); tokens.add(compact(normal)); }
      return;
    }
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(item => addTokens(item, tokens, seen));
      return;
    }
    Object.entries(value).forEach(([key,item]) => {
      const normal = normalize(key);
      if (normal) { tokens.add(normal); tokens.add(compact(normal)); }
      addTokens(item, tokens, seen);
    });
  }

  function ownershipTokens(account = activeAccount()) {
    const tokens = new Set();
    if (!account || typeof account !== 'object') return tokens;
    Object.entries(account).forEach(([key,value]) => {
      if (OWNERSHIP_KEY.test(key)) addTokens(value, tokens);
    });
    return tokens;
  }

  function owns(id) {
    id = String(id || '').toLowerCase();
    if (STARTERS.has(id)) return true;
    const reward = REWARDS[id];
    if (!reward) return false;
    const tokens = ownershipTokens();
    return reward.keys.some(key => tokens.has(normalize(key)) || tokens.has(compact(key)));
  }

  function validColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
  }

  function assetUrl(file) {
    return window.CritterPaths?.resolve?.(`assets/characters/${file}`) || `./assets/characters/${file}`;
  }

  function persistControls() {
    const species = document.getElementById('species');
    const body = document.getElementById('bodyColor');
    const accent = document.getElementById('accentColor');
    const accessory = document.getElementById('accessory');
    const eyes = document.getElementById('eyeStyle');
    if (!species || !body || !accent || !accessory || !eyes || !owns(species.value)) return false;
    const db = readDb(), account = activeAccount(db);
    if (!db || !account) return false;
    const id = String(species.value || 'puppy').toLowerCase();
    const reward = REWARDS[id] || {};
    account.appearance = {
      ...(account.appearance || {}),
      species:id,
      bodyColor:validColor(body.value, reward.body || '#d9a06f'),
      accentColor:validColor(accent.value, reward.accent || '#7b4d35'),
      accessory:String(accessory.value || 'none'),
      eyeStyle:String(eyes.value || 'dot')
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      window.dispatchEvent(new CustomEvent('critter-appearance-updated', { detail:{ ...account.appearance } }));
      return true;
    } catch (_) { return false; }
  }

  function updatePreview() {
    const select = document.getElementById('species');
    const body = document.getElementById('bodyColor');
    const accent = document.getElementById('accentColor');
    const preview = document.getElementById('critterPreviewAsset');
    const shell = document.getElementById('critterPreview');
    if (!select) return;
    const id = String(select.value || '').toLowerCase(), reward = REWARDS[id];
    if (reward && owns(id) && preview) {
      preview.src = assetUrl(reward.asset);
      preview.alt = `${reward.name} critter preview`;
    }
    shell?.style.setProperty('--critter-body-color', validColor(body?.value, reward?.body || '#d9a06f'));
    shell?.style.setProperty('--critter-accent-color', validColor(accent?.value, reward?.accent || '#7b4d35'));
  }

  function setLocked(button, locked, name) {
    button.disabled = locked;
    button.classList.toggle('reward-locked', locked);
    button.setAttribute('aria-disabled', String(locked));
    button.title = locked ? 'Redeem the matching Critter Code to unlock this critter.' : '';
    let badge = button.querySelector('.critter-code-lock');
    if (locked && !badge) {
      badge = document.createElement('span');
      badge.className = 'critter-code-lock';
      badge.setAttribute('aria-hidden','true');
      badge.textContent = '🔒 CODE';
      button.appendChild(badge);
    }
    if (badge) badge.hidden = !locked;
    if (locked) {
      button.classList.remove('active');
      button.setAttribute('aria-label', `${name} — locked Critter Code reward`);
    }
  }

  function syncRoster() {
    const roster = document.getElementById('characterRoster');
    if (!roster) return;
    roster.querySelectorAll('.character-choice[data-species]').forEach(button => {
      const id = String(button.dataset.species || '').toLowerCase();
      const reward = REWARDS[id];
      setLocked(button, Boolean(reward && !owns(id)), reward?.name || id);
    });
  }

  function refreshNow() {
    queued = false;
    const select = document.getElementById('species');
    if (!select) return;
    Object.entries(REWARDS).forEach(([id,reward]) => {
      let option = [...select.options].find(item => item.value === id);
      if (!option) {
        option = document.createElement('option');
        option.value = id;
        select.appendChild(option);
      }
      const unlocked = owns(id);
      option.disabled = !unlocked;
      option.textContent = unlocked ? reward.name : `🔒 ${reward.name} — Critter Code`;
    });
    if (!owns(select.value)) select.value = 'puppy';
    syncRoster();
    updatePreview();
  }

  function refresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refreshNow);
  }

  function onSpeciesChange() {
    const select = document.getElementById('species');
    const id = String(select?.value || '').toLowerCase();
    if (!owns(id)) {
      if (select) select.value = 'puppy';
      refresh();
      return;
    }
    const reward = REWARDS[id];
    if (reward) {
      const body = document.getElementById('bodyColor');
      const accent = document.getElementById('accentColor');
      if (body) body.value = reward.body;
      if (accent) accent.value = reward.accent;
    }
    setTimeout(() => { persistControls(); updatePreview(); }, 0);
  }

  function install() {
    if (!document.getElementById('newCritterAppearanceStyles')) {
      const style = document.createElement('style');
      style.id = 'newCritterAppearanceStyles';
      style.textContent = `
        #customizeModal .customize-controls{min-height:0;overflow-y:auto!important;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:8px}
        #characterRoster{max-height:none!important;overflow:visible!important;align-content:start;padding-right:0}
        #customizeModal .character-choice{position:relative}
        #customizeModal .character-choice.reward-locked{opacity:.62;cursor:not-allowed;border-color:rgba(255,211,111,.3);background:linear-gradient(180deg,rgba(255,211,111,.08),rgba(15,18,36,.96))}
        #customizeModal .character-choice.reward-locked img{filter:grayscale(.85) brightness(.58)}
        #customizeModal .critter-code-lock{position:absolute;top:9px;right:9px;z-index:2;padding:4px 7px;border:1px solid rgba(255,211,111,.55);border-radius:999px;background:rgba(10,12,25,.92);color:#ffd36f;font-size:9px;font-weight:900;letter-spacing:.08em;box-shadow:0 5px 14px rgba(0,0,0,.32)}
        #customizeModal .critter-code-lock[hidden]{display:none}
        .critter-preview{background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--critter-accent-color,#64e8ea) 28%,transparent),transparent 58%),linear-gradient(145deg,color-mix(in srgb,var(--critter-body-color,#26364b) 18%,#11182a),#0a1020)!important}
        .customize-controls input[type="color"],.customize-controls select{pointer-events:auto!important;opacity:1!important;filter:none!important}
        .customize-controls input[type="color"]{min-height:46px;cursor:pointer}
        @media(max-width:760px){.expanded-customize{grid-template-columns:1fr!important}.critter-preview{min-height:210px}#customizeModal .customize-controls{overflow:visible!important;padding-right:0}}
      `;
      document.head.appendChild(style);
    }

    const form = document.getElementById('customizeForm');
    const species = document.getElementById('species');
    species?.addEventListener('change', onSpeciesChange);
    ['bodyColor','accentColor','accessory','eyeStyle'].forEach(id => {
      const control = document.getElementById(id);
      control?.addEventListener('input', () => { updatePreview(); setTimeout(persistControls, 0); });
      control?.addEventListener('change', () => { updatePreview(); setTimeout(persistControls, 0); });
    });
    form?.addEventListener('submit', event => {
      if (!species || owns(species.value)) return void persistControls();
      event.preventDefault();
      event.stopImmediatePropagation();
      species.value = 'puppy';
      refresh();
    }, true);

    const roster = document.getElementById('characterRoster');
    if (roster) new MutationObserver(refresh).observe(roster, { childList:true });

    ['storage','focus','critter-code-redeemed','critter-codes-redeemed','critter-code-unlocks-changed','critter-codes-api-ready']
      .forEach(name => window.addEventListener(name, refresh));
    document.addEventListener('critter-code-redeemed', refresh);
    document.addEventListener('critter-codes-redeemed', refresh);
    refresh();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', install, { once:true })
    : install();

  window.NewCritterAppearance = Object.freeze({ definitions:REWARDS, owns, refresh, save:persistControls, ownershipTokens });
})();

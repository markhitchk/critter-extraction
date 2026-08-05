/* Harley's Studios — all-39 Appearance, ownership, preview, and save bridge. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_APPEARANCE_V8__) return;
  window.__NEW_CRITTER_APPEARANCE_V8__ = true;

  const STORAGE_KEY = 'critterExtractionInventory';
  const REWARDS = Object.freeze({
    raccoon:{ keys:['raccoon','critter_raccoon','b04'] },
    redpanda:{ keys:['redpanda','red_panda','critter_red_panda','b06'] },
    penguin:{ keys:['penguin','critter_penguin','b02'] },
    crow:{ keys:['crow','critter_crow','b03'] },
    frog:{ keys:['frog','critter_frog','b05'] },
    arcticfox:{ keys:['arcticfox','arctic_fox','critter_arctic_fox','b07'] },
    capybara:{ keys:['capybara','critter_capybara','b08'] },
    axolotl:{ keys:['axolotl','critter_axolotl','b09'] },
    otter:{ keys:['otter','critter_otter','b11'] }
  });
  const OWNERSHIP_KEY = /owned|ownership|unlock|redeem|claim|reward|code|bundle/i;
  let queued = false;

  const normalize = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const compact = value => normalize(value).replace(/_/g,'');

  function runtime() { return window.CritterModelRuntime; }
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
    if (Array.isArray(value)) return value.forEach(item => addTokens(item,tokens,seen));
    Object.entries(value).forEach(([key,item]) => {
      const normal = normalize(key);
      if (normal) { tokens.add(normal); tokens.add(compact(normal)); }
      addTokens(item,tokens,seen);
    });
  }

  function ownershipTokens(account = activeAccount()) {
    const tokens = new Set();
    if (!account || typeof account !== 'object') return tokens;
    Object.entries(account).forEach(([key,value]) => {
      if (OWNERSHIP_KEY.test(key)) addTokens(value,tokens);
    });
    return tokens;
  }

  function owns(id) {
    id = runtime()?.sanitizeLiveSpecies?.(id) || compact(id);
    const reward = REWARDS[id];
    if (!reward) return runtime()?.isLiveSpecies?.(id) === true;
    const tokens = ownershipTokens();
    return reward.keys.some(key => tokens.has(normalize(key)) || tokens.has(compact(key)));
  }

  const validColor = (value,fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;

  function definition(id) {
    return runtime()?.runtimeDefinition?.(id) || runtime()?.runtimeDefinition?.('puppy');
  }

  function ensureAccessoryOptions() {
    const select = document.getElementById('accessory');
    if (!select) return;
    const options = {
      none:'None', cap:'Tiny cap', headband:'Scout headband', bandana:'Explorer bandana',
      helmet:'Critter helmet', headphones:'Studio headphones', antennas:'Signal antennas',
      antenna:'Signal antenna', crown:'Pocket crown'
    };
    Object.entries(options).forEach(([value,label]) => {
      if ([...select.options].some(option => option.value === value)) return;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  function ensureSpeciesOptions() {
    const select = document.getElementById('species');
    const modelRuntime = runtime();
    if (!select || !modelRuntime) return;
    modelRuntime.liveRuntimeIds.forEach(id => {
      const entry = modelRuntime.runtimeDefinition(id);
      let option = [...select.options].find(item => item.value === id);
      if (!option) {
        option = document.createElement('option');
        option.value = id;
        select.appendChild(option);
      }
      const unlocked = owns(id);
      option.disabled = !unlocked;
      option.textContent = unlocked ? `${entry.name} — ${entry.role}` : `🔒 ${entry.name} — Critter Code`;
    });
  }

  function persistControls() {
    const modelRuntime = runtime();
    const speciesControl = document.getElementById('species');
    const body = document.getElementById('bodyColor');
    const accent = document.getElementById('accentColor');
    const accessory = document.getElementById('accessory');
    const eyes = document.getElementById('eyeStyle');
    if (!modelRuntime || !speciesControl || !body || !accent || !accessory || !eyes || !owns(speciesControl.value)) return false;

    const db = readDb();
    const account = activeAccount(db);
    if (!db || !account) return false;
    const id = modelRuntime.sanitizeLiveSpecies(speciesControl.value);
    const entry = modelRuntime.runtimeDefinition(id);
    account.appearance = {
      ...(account.appearance || {}),
      species:id,
      bodyColor:validColor(body.value,entry.body),
      accentColor:validColor(accent.value,entry.accent),
      accessory:String(accessory.value || entry.defaultAccessory),
      eyeStyle:String(eyes.value || 'dot'),
      rewardCritterId:REWARDS[id] ? `critter_${id}` : ''
    };
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
      window.dispatchEvent(new CustomEvent('critter-appearance-updated',{ detail:{...account.appearance} }));
      return true;
    } catch (_) { return false; }
  }

  function updatePreview() {
    const modelRuntime = runtime();
    const select = document.getElementById('species');
    const body = document.getElementById('bodyColor');
    const accent = document.getElementById('accentColor');
    const preview = document.getElementById('critterPreviewAsset');
    const shell = document.getElementById('critterPreview');
    if (!modelRuntime || !select) return;
    const id = modelRuntime.sanitizeLiveSpecies(select.value);
    const entry = modelRuntime.runtimeDefinition(id);
    if (preview) {
      preview.src = modelRuntime.previewAsset(id);
      preview.alt = `${entry.name}, ${entry.role} critter preview`;
    }
    shell?.style.setProperty('--critter-body-color',validColor(body?.value,entry.body));
    shell?.style.setProperty('--critter-accent-color',validColor(accent?.value,entry.accent));
  }

  function setLocked(button, locked, entry) {
    button.disabled = locked;
    button.classList.toggle('reward-locked',locked);
    button.setAttribute('aria-disabled',String(locked));
    button.title = locked ? 'Redeem the matching Critter Code to unlock this critter.' : `${entry.name} — ${entry.role}`;
    let badge = button.querySelector('.critter-code-lock');
    if (locked && !badge) {
      badge = document.createElement('span');
      badge.className = 'critter-code-lock';
      badge.setAttribute('aria-hidden','true');
      badge.textContent = '🔒 CODE';
      button.appendChild(badge);
    }
    if (badge) badge.hidden = !locked;
    if (locked) button.classList.remove('active');
  }

  function syncRoster() {
    const modelRuntime = runtime();
    const roster = document.getElementById('characterRoster');
    if (!modelRuntime || !roster) return;
    roster.querySelectorAll('.character-choice[data-species]').forEach(button => {
      const id = modelRuntime.sanitizeLiveSpecies(button.dataset.species);
      setLocked(button,!owns(id),modelRuntime.runtimeDefinition(id));
    });
  }

  function refreshNow() {
    queued = false;
    const modelRuntime = runtime();
    const select = document.getElementById('species');
    if (!modelRuntime || !select) return;
    ensureAccessoryOptions();
    ensureSpeciesOptions();
    if (!owns(select.value)) select.value = 'puppy';
    syncRoster();
    updatePreview();
  }

  function refresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refreshNow);
  }

  function selectSpecies(id, useDefaults = true) {
    const modelRuntime = runtime();
    const select = document.getElementById('species');
    if (!modelRuntime || !select) return false;
    id = modelRuntime.sanitizeLiveSpecies(id);
    if (!owns(id)) return false;
    const entry = modelRuntime.runtimeDefinition(id);
    select.value = id;
    if (useDefaults) {
      const body = document.getElementById('bodyColor');
      const accent = document.getElementById('accentColor');
      const accessory = document.getElementById('accessory');
      if (body) body.value = entry.body;
      if (accent) accent.value = entry.accent;
      if (accessory && [...accessory.options].some(option => option.value === entry.defaultAccessory)) accessory.value = entry.defaultAccessory;
    }
    select.dispatchEvent(new Event('change',{ bubbles:true }));
    return true;
  }

  function onSpeciesChange() {
    const select = document.getElementById('species');
    if (!select || !owns(select.value)) {
      if (select) select.value = 'puppy';
      refresh();
      return;
    }
    updatePreview();
    setTimeout(persistControls,0);
  }

  function ensureStyles() {
    if (document.getElementById('newCritterAppearanceStyles')) return;
    const style = document.createElement('style');
    style.id = 'newCritterAppearanceStyles';
    style.textContent = `
      #customizeModal{overflow:visible}
      #customizeModal .customize-card{display:grid!important;grid-template-rows:auto minmax(0,1fr) auto!important;width:min(1220px,calc(100vw - 20px))!important;height:min(92dvh,780px)!important;max-height:calc(100dvh - 16px)!important;overflow:hidden!important}
      #customizeModal .customize-grid{grid-template-columns:minmax(220px,280px) minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;min-width:0;min-height:0!important;height:100%!important;align-items:stretch!important;overflow:hidden!important;padding:10px 0!important}
      #customizeModal .critter-preview{width:100%;min-width:0;min-height:0!important;height:100%!important;max-height:100%!important}
      #customizeModal .critter-preview img{display:block;width:100%;height:100%;object-fit:contain;object-position:center}
      #customizeModal .customize-controls{min-width:0;min-height:0!important;height:auto!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;scrollbar-gutter:stable;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:2px 10px 24px 2px}
      #characterRoster{max-height:none!important;overflow:visible!important;align-content:start;padding-right:0}
      #customizeModal .character-choice{position:relative}
      #customizeModal .character-choice.reward-locked{opacity:.62;cursor:not-allowed;border-color:rgba(255,211,111,.3);background:linear-gradient(180deg,rgba(255,211,111,.08),rgba(15,18,36,.96))}
      #customizeModal .character-choice.reward-locked img{filter:grayscale(.85) brightness(.58)}
      #customizeModal .critter-code-lock{position:absolute;top:8px;right:8px;z-index:3;padding:4px 7px;border:1px solid rgba(255,211,111,.55);border-radius:999px;background:rgba(10,12,25,.92);color:#ffd36f;font-size:9px;font-weight:900;letter-spacing:.08em}
      #customizeModal .critter-code-lock[hidden]{display:none}
      .critter-preview{background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--critter-accent-color,#64e8ea) 28%,transparent),transparent 58%),linear-gradient(145deg,color-mix(in srgb,var(--critter-body-color,#26364b) 18%,#11182a),#0a1020)!important}
      @media(max-width:760px){#customizeModal .customize-card{width:calc(100vw - 6px)!important;height:calc(100dvh - 6px)!important;max-height:calc(100dvh - 6px)!important}#customizeModal .customize-grid{grid-template-columns:1fr!important;grid-template-rows:minmax(140px,25dvh) minmax(0,1fr)!important}#customizeModal .critter-preview{height:auto!important;min-height:140px!important;max-height:25dvh!important}#customizeModal .customize-controls{padding:0 7px 24px 0!important}}
      @media(max-width:420px){#customizeModal .customize-grid{grid-template-rows:minmax(110px,20dvh) minmax(0,1fr)!important}#customizeModal .critter-preview{min-height:110px!important;max-height:20dvh!important}#customizeModal .character-roster{grid-template-columns:repeat(2,minmax(90px,1fr))!important}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    if (!runtime()) {
      window.addEventListener('critter:model-runtime-ready',install,{ once:true });
      return;
    }
    ensureStyles();
    ensureAccessoryOptions();
    ensureSpeciesOptions();
    const form = document.getElementById('customizeForm');
    const speciesControl = document.getElementById('species');
    speciesControl?.addEventListener('change',onSpeciesChange);
    ['bodyColor','accentColor','accessory','eyeStyle'].forEach(id => {
      const control = document.getElementById(id);
      control?.addEventListener('input',() => { updatePreview(); setTimeout(persistControls,0); });
      control?.addEventListener('change',() => { updatePreview(); setTimeout(persistControls,0); });
    });
    form?.addEventListener('submit',event => {
      if (speciesControl && owns(speciesControl.value)) { persistControls(); return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (speciesControl) speciesControl.value = 'puppy';
      refresh();
    },true);
    const roster = document.getElementById('characterRoster');
    if (roster) new MutationObserver(refresh).observe(roster,{ childList:true,subtree:true });
    ['storage','focus','critter-code-redeemed','critter-codes-redeemed','critter-code-unlocks-changed','critter-codes-api-ready'].forEach(name => window.addEventListener(name,refresh));
    refresh();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',install,{ once:true }) : install();
  window.NewCritterAppearance = Object.freeze({ definitions:REWARDS, owns, refresh, save:persistControls, selectSpecies, ownershipTokens });
})();

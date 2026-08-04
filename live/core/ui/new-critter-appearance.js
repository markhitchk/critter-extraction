/* Harley's Studios — Critter Code Appearance integration v3. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_APPEARANCE_V3__) return;
  window.__NEW_CRITTER_APPEARANCE_V3__ = true;

  const STORAGE_KEY = 'critterExtractionInventory';
  const STARTERS = new Set(['puppy','bunny','kitty','fox','panda','bear','raccoon','redpanda']);
  const DEFINITIONS = Object.freeze({
    penguin:{name:'Penguin',body:'#26364b',accent:'#f4f7fb',asset:'penguin.svg',aliases:['penguin','penguinparty','critter_penguin']},
    crow:{name:'Crow',body:'#202430',accent:'#515a70',asset:'crow.svg',aliases:['crow','crowcollector','critter_crow']},
    frog:{name:'Frog',body:'#71b85a',accent:'#d6ee8e',asset:'frog.svg',aliases:['frog','froggyfriday','critter_frog']},
    arcticfox:{name:'Arctic Fox',body:'#eef5fb',accent:'#b9d4e8',asset:'arcticfox.svg',aliases:['arcticfox','arctic_fox','arcticadventure','critter_arctic_fox']},
    capybara:{name:'Capybara',body:'#ad7651',accent:'#6d4734',asset:'capybara.svg',aliases:['capybara','capybarachill','critter_capybara']},
    axolotl:{name:'Axolotl',body:'#f1a9bd',accent:'#cf638f',asset:'axolotl.svg',aliases:['axolotl','axolotlaqua','critter_axolotl']}
  });
  const controlIds = ['species','bodyColor','accentColor','accessory','eyeStyle'];
  let refreshQueued = false;

  function readDb() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch (_) { return null; }
  }
  function activeAccount(db = readDb()) {
    return db?.accounts?.find(item => item?.id === db.activeId) || db?.accounts?.[0] || null;
  }
  function flatten(value, seen = new Set()) {
    if (value == null) return '';
    if (typeof value !== 'object') return String(value).toLowerCase();
    if (seen.has(value)) return '';
    seen.add(value);
    return Object.entries(value).map(([key,item]) => `${key} ${flatten(item, seen)}`).join(' ').toLowerCase();
  }
  function owns(id) {
    id = String(id || '').toLowerCase();
    if (STARTERS.has(id)) return true;
    const def = DEFINITIONS[id];
    if (!def) return false;
    const haystack = flatten(activeAccount());
    return def.aliases.some(alias => haystack.includes(alias));
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
    if (!species || !body || !accent || !accessory || !eyes) return false;
    const id = String(species.value || 'puppy').toLowerCase();
    if (!owns(id)) return false;
    const db = readDb(), account = activeAccount(db);
    if (!db || !account) return false;
    const def = DEFINITIONS[id] || {};
    account.appearance = {
      ...(account.appearance || {}),
      species:id,
      bodyColor:validColor(body.value, def.body || '#d9a06f'),
      accentColor:validColor(accent.value, def.accent || '#7b4d35'),
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
    const id = String(select.value || '').toLowerCase(), def = DEFINITIONS[id];
    if (def && owns(id) && preview) {
      const src = assetUrl(def.asset);
      if (preview.src !== src) preview.src = src;
      preview.alt = `${def.name} critter preview`;
    }
    if (shell) {
      shell.style.setProperty('--critter-body-color', validColor(body?.value, def?.body || '#d9a06f'));
      shell.style.setProperty('--critter-accent-color', validColor(accent?.value, def?.accent || '#7b4d35'));
    }
  }
  function refreshNow() {
    refreshQueued = false;
    const select = document.getElementById('species');
    if (!select) return;
    for (const [id,def] of Object.entries(DEFINITIONS)) {
      let option = [...select.options].find(item => item.value === id);
      if (!option) {
        option = document.createElement('option');
        option.value = id;
        select.appendChild(option);
      }
      const unlocked = owns(id);
      option.disabled = !unlocked;
      option.textContent = unlocked ? def.name : `🔒 ${def.name} — Critter Code`;
    }
    for (const id of controlIds) {
      const control = document.getElementById(id);
      if (control && id !== 'species') control.disabled = false;
    }
    updatePreview();
  }
  function refresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(refreshNow);
  }
  function onSpeciesChange() {
    const select = document.getElementById('species');
    const def = DEFINITIONS[String(select?.value || '').toLowerCase()];
    if (def && owns(select.value)) {
      const body = document.getElementById('bodyColor');
      const accent = document.getElementById('accentColor');
      if (body) body.value = def.body;
      if (accent) accent.value = def.accent;
    }
    setTimeout(() => { persistControls(); updatePreview(); }, 0);
  }
  function install() {
    if (!document.getElementById('newCritterAppearanceStyles')) {
      const style = document.createElement('style');
      style.id = 'newCritterAppearanceStyles';
      style.textContent = `#characterRoster{max-height:min(44vh,430px);overflow:auto;align-content:start;padding-right:5px;scrollbar-gutter:stable}.critter-preview{background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--critter-accent-color,#64e8ea) 28%,transparent),transparent 58%),linear-gradient(145deg,color-mix(in srgb,var(--critter-body-color,#26364b) 18%,#11182a),#0a1020)!important}.customize-controls input[type="color"],.customize-controls select{pointer-events:auto!important;opacity:1!important;filter:none!important}.customize-controls input[type="color"]{min-height:46px;cursor:pointer}@media(max-width:760px){#characterRoster{max-height:38vh}.expanded-customize{grid-template-columns:1fr!important}.critter-preview{min-height:210px}}`;
      document.head.appendChild(style);
    }
    const form = document.getElementById('customizeForm');
    const species = document.getElementById('species');
    species?.addEventListener('change', onSpeciesChange);
    for (const id of ['bodyColor','accentColor','accessory','eyeStyle']) {
      const control = document.getElementById(id);
      control?.addEventListener('input', () => { updatePreview(); setTimeout(persistControls, 0); });
      control?.addEventListener('change', () => { updatePreview(); setTimeout(persistControls, 0); });
    }
    form?.addEventListener('submit', event => {
      if (!species || owns(species.value)) {
        persistControls();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      species.value = 'puppy';
      refresh();
    }, true);
    addEventListener('storage', refresh);
    addEventListener('focus', refresh);
    addEventListener('critter-code-redeemed', refresh);
    document.addEventListener('critter-code-redeemed', refresh);
    refresh();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once:true }) : install();
  window.NewCritterAppearance = Object.freeze({ definitions:DEFINITIONS, owns, refresh, save:persistControls });
})();

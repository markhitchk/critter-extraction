/* Harley's Studios — new Critter Code character Appearance integration. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_APPEARANCE_V1__) return;
  window.__NEW_CRITTER_APPEARANCE_V1__ = true;

  const NEW_CRITTERS = Object.freeze({
    penguin: { name:'Penguin', role:'Frozen Explorer', body:'#26364b', accent:'#f4f7fb', paw:'#26364b', vest:'#5eb8d6', asset:'penguin.svg', aliases:['penguin','penguinparty','critter_penguin'] },
    crow: { name:'Crow', role:'Shiny Collector', body:'#202430', accent:'#515a70', paw:'#202430', vest:'#685c9b', asset:'crow.svg', aliases:['crow','crowcollector','critter_crow'] },
    frog: { name:'Frog', role:'Marsh Jumper', body:'#71b85a', accent:'#d6ee8e', paw:'#8ed56f', vest:'#3f7f68', asset:'frog.svg', aliases:['frog','froggyfriday','critter_frog'] },
    arcticfox: { name:'Arctic Fox', role:'Winter Pathfinder', body:'#eef5fb', accent:'#b9d4e8', paw:'#f7fbff', vest:'#5f83a8', asset:'arcticfox.svg', aliases:['arcticfox','arctic_fox','arcticadventure','critter_arctic_fox'] },
    capybara: { name:'Capybara', role:'Relaxed Support', body:'#ad7651', accent:'#6d4734', paw:'#d4a27e', vest:'#d48752', asset:'capybara.svg', aliases:['capybara','capybarachill','critter_capybara'] },
    axolotl: { name:'Axolotl', role:'Aquatic Scout', body:'#f1a9bd', accent:'#cf638f', paw:'#ffd5df', vest:'#588fb2', asset:'axolotl.svg', aliases:['axolotl','axolotlaqua','critter_axolotl'] }
  });
  const STARTERS = new Set(['puppy','bunny','kitty','fox','panda','bear','raccoon','redpanda']);
  const STORAGE_KEY = 'critterExtractionInventory';

  function readDatabase() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch (_) { return null; }
  }
  function activeAccount() {
    const db = readDatabase();
    if (!db || !Array.isArray(db.accounts)) return null;
    return db.accounts.find(account => account?.id === db.activeId) || db.accounts[0] || null;
  }
  function flattened(value, seen = new Set()) {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
    if (typeof value !== 'object' || seen.has(value)) return '';
    seen.add(value);
    if (Array.isArray(value)) return value.map(item => flattened(item, seen)).join(' ');
    return Object.entries(value).map(([key, item]) => `${key.toLowerCase()} ${flattened(item, seen)}`).join(' ');
  }
  function owns(species) {
    if (STARTERS.has(species)) return true;
    const def = NEW_CRITTERS[species];
    const account = activeAccount();
    if (!def || !account) return false;
    const haystack = flattened(account);
    return def.aliases.some(alias => haystack.includes(alias));
  }
  function assetUrl(def) {
    return window.CritterPaths?.resolve?.(`assets/characters/${def.asset}`) || `./assets/characters/${def.asset}`;
  }
  function ensureOptions() {
    const select = document.getElementById('species');
    if (!select) return;
    for (const [id, def] of Object.entries(NEW_CRITTERS)) {
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
  }
  function speciesFromCard(card) {
    const direct = card?.dataset?.species || card?.dataset?.character || card?.getAttribute?.('data-value');
    if (direct) return String(direct).toLowerCase().replace(/[^a-z]/g, '');
    const text = String(card?.textContent || '').toLowerCase();
    return Object.entries(NEW_CRITTERS).find(([, def]) => text.includes(def.name.toLowerCase()))?.[0] || '';
  }
  function decorateRoster() {
    const roster = document.getElementById('characterRoster');
    if (!roster) return;
    const cards = [...roster.querySelectorAll('button,[role="option"],label,.character-card,.character-option')];
    for (const card of cards) {
      const id = speciesFromCard(card);
      if (!NEW_CRITTERS[id]) continue;
      const unlocked = owns(id);
      card.dataset.species = id;
      card.dataset.critterLocked = unlocked ? 'false' : 'true';
      card.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
      card.classList.toggle('critter-locked', !unlocked);
      if (!unlocked && !card.querySelector('.new-critter-lock')) {
        const lock = document.createElement('span');
        lock.className = 'new-critter-lock';
        lock.innerHTML = '<b>🔒</b><small>Unlock with a Critter Code</small>';
        card.appendChild(lock);
      }
    }
  }
  function syncPreview() {
    const select = document.getElementById('species');
    const id = String(select?.value || '').toLowerCase();
    const def = NEW_CRITTERS[id];
    if (!def || !owns(id)) return;
    const preview = document.getElementById('critterPreviewAsset');
    if (preview) {
      preview.src = assetUrl(def);
      preview.alt = `${def.name} critter preview`;
    }
    const body = document.getElementById('bodyColor');
    const accent = document.getElementById('accentColor');
    if (body && !body.dataset.userChanged) body.value = def.body;
    if (accent && !accent.dataset.userChanged) accent.value = def.accent;
  }
  function refresh() {
    ensureOptions();
    decorateRoster();
    syncPreview();
  }
  function rejectLocked(event) {
    const card = event.target.closest?.('[data-critter-locked="true"]');
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.CritterCodes?.open?.();
  }
  function validateSave(event) {
    const select = document.getElementById('species');
    if (!select || owns(select.value)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    select.value = 'puppy';
    refresh();
  }
  function install() {
    const style = document.createElement('style');
    style.id = 'newCritterAppearanceStyles';
    style.textContent = `
      #characterRoster{max-height:min(44vh,430px);overflow:auto;align-content:start;padding-right:5px;scrollbar-gutter:stable}
      #characterRoster [data-critter-locked="true"]{position:relative;filter:saturate(.35);opacity:.68;cursor:not-allowed!important}
      .new-critter-lock{position:absolute;inset:auto 7px 7px;display:grid;place-items:center;gap:1px;padding:5px 7px;border:1px solid rgba(255,255,255,.22);border-radius:9px;background:rgba(7,10,20,.88);color:#fff;pointer-events:none;text-align:center}
      .new-critter-lock b{font-size:13px}.new-critter-lock small{font-size:8px;line-height:1.15;letter-spacing:.04em}
      @media(max-width:760px){#characterRoster{max-height:38vh}.expanded-customize{grid-template-columns:1fr!important}.critter-preview{min-height:210px}}
    `;
    if (!document.getElementById(style.id)) document.head.appendChild(style);
    document.addEventListener('click', rejectLocked, true);
    document.getElementById('customizeForm')?.addEventListener('submit', validateSave, true);
    document.getElementById('species')?.addEventListener('change', syncPreview);
    document.getElementById('bodyColor')?.addEventListener('input', event => event.currentTarget.dataset.userChanged = 'true');
    document.getElementById('accentColor')?.addEventListener('input', event => event.currentTarget.dataset.userChanged = 'true');
    new MutationObserver(refresh).observe(document.body, { childList:true, subtree:true });
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('critter-codes-api-ready', refresh);
    window.addEventListener('critter-codes-runtime-exported', refresh);
    window.addEventListener('critter-code-redeemed', refresh);
    document.addEventListener('critter-code-redeemed', refresh);
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
  window.NewCritterAppearance = Object.freeze({ definitions:NEW_CRITTERS, owns, refresh });
})();

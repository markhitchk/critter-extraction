/* Harley's Studios — new Critter Code character Appearance integration. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_APPEARANCE_V2__) return;
  window.__NEW_CRITTER_APPEARANCE_V2__ = true;

  const DEFINITIONS = Object.freeze({
    penguin:{name:'Penguin',body:'#26364b',accent:'#f4f7fb',asset:'penguin.svg',aliases:['penguin','penguinparty','critter_penguin']},
    crow:{name:'Crow',body:'#202430',accent:'#515a70',asset:'crow.svg',aliases:['crow','crowcollector','critter_crow']},
    frog:{name:'Frog',body:'#71b85a',accent:'#d6ee8e',asset:'frog.svg',aliases:['frog','froggyfriday','critter_frog']},
    arcticfox:{name:'Arctic Fox',body:'#eef5fb',accent:'#b9d4e8',asset:'arcticfox.svg',aliases:['arcticfox','arctic_fox','arcticadventure','critter_arctic_fox']},
    capybara:{name:'Capybara',body:'#ad7651',accent:'#6d4734',asset:'capybara.svg',aliases:['capybara','capybarachill','critter_capybara']},
    axolotl:{name:'Axolotl',body:'#f1a9bd',accent:'#cf638f',asset:'axolotl.svg',aliases:['axolotl','axolotlaqua','critter_axolotl']}
  });
  const STARTERS = new Set(['puppy','bunny','kitty','fox','panda','bear','raccoon','redpanda']);
  const STORAGE_KEY = 'critterExtractionInventory';
  let scheduled = false;

  function account() {
    try {
      const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return db?.accounts?.find(item => item?.id === db.activeId) || db?.accounts?.[0] || null;
    } catch (_) { return null; }
  }
  function flatten(value, seen = new Set()) {
    if (value == null) return '';
    if (typeof value !== 'object') return String(value).toLowerCase();
    if (seen.has(value)) return '';
    seen.add(value);
    return Object.entries(value).map(([key, item]) => `${key} ${flatten(item, seen)}`).join(' ').toLowerCase();
  }
  function owns(id) {
    if (STARTERS.has(id)) return true;
    const def = DEFINITIONS[id];
    if (!def) return false;
    const haystack = flatten(account());
    return def.aliases.some(alias => haystack.includes(alias));
  }
  function assetUrl(file) {
    return window.CritterPaths?.resolve?.(`assets/characters/${file}`) || `./assets/characters/${file}`;
  }
  function cardSpecies(card) {
    const direct = card?.dataset?.species || card?.dataset?.character || card?.getAttribute?.('data-value');
    if (direct) return String(direct).toLowerCase().replace(/[^a-z]/g, '');
    const text = String(card?.textContent || '').toLowerCase();
    return Object.entries(DEFINITIONS).find(([, def]) => text.includes(def.name.toLowerCase()))?.[0] || '';
  }
  function refreshNow() {
    scheduled = false;
    const select = document.getElementById('species');
    if (!select) return;
    for (const [id, def] of Object.entries(DEFINITIONS)) {
      let option = [...select.options].find(item => item.value === id);
      if (!option) {
        option = document.createElement('option');
        option.value = id;
        select.appendChild(option);
      }
      const unlocked = owns(id);
      const label = unlocked ? def.name : `🔒 ${def.name} — Critter Code`;
      if (option.disabled !== !unlocked) option.disabled = !unlocked;
      if (option.textContent !== label) option.textContent = label;
    }

    const roster = document.getElementById('characterRoster');
    if (roster) {
      for (const card of roster.querySelectorAll('button,[role="option"],label,.character-card,.character-option')) {
        const id = cardSpecies(card);
        if (!DEFINITIONS[id]) continue;
        const locked = !owns(id);
        if (card.dataset.critterLocked !== String(locked)) card.dataset.critterLocked = String(locked);
        card.setAttribute('aria-disabled', String(locked));
        card.classList.toggle('critter-locked', locked);
        let badge = card.querySelector('.new-critter-lock');
        if (locked && !badge) {
          badge = document.createElement('span');
          badge.className = 'new-critter-lock';
          badge.innerHTML = '<b>🔒</b><small>Unlock with a Critter Code</small>';
          card.appendChild(badge);
        } else if (!locked && badge) badge.remove();
      }
    }

    const id = String(select.value || '').toLowerCase();
    const def = DEFINITIONS[id];
    if (def && owns(id)) {
      const preview = document.getElementById('critterPreviewAsset');
      if (preview && !preview.src.endsWith(`/assets/characters/${def.asset}`)) {
        preview.src = assetUrl(def.asset);
        preview.alt = `${def.name} critter preview`;
      }
    }
  }
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refreshNow);
  }
  function install() {
    if (!document.getElementById('newCritterAppearanceStyles')) {
      const style = document.createElement('style');
      style.id = 'newCritterAppearanceStyles';
      style.textContent = `#characterRoster{max-height:min(44vh,430px);overflow:auto;align-content:start;padding-right:5px;scrollbar-gutter:stable}#characterRoster [data-critter-locked="true"]{position:relative;filter:saturate(.35);opacity:.68;cursor:not-allowed!important}.new-critter-lock{position:absolute;inset:auto 7px 7px;display:grid;place-items:center;gap:1px;padding:5px 7px;border:1px solid rgba(255,255,255,.22);border-radius:9px;background:rgba(7,10,20,.88);color:#fff;pointer-events:none;text-align:center}.new-critter-lock small{font-size:8px;line-height:1.15}@media(max-width:760px){#characterRoster{max-height:38vh}.expanded-customize{grid-template-columns:1fr!important}.critter-preview{min-height:210px}}`;
      document.head.appendChild(style);
    }
    document.addEventListener('click', event => {
      const locked = event.target.closest?.('[data-critter-locked="true"]');
      if (!locked) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.CritterCodes?.open?.();
    }, true);
    document.getElementById('customizeForm')?.addEventListener('submit', event => {
      const select = document.getElementById('species');
      if (!select || owns(select.value)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      select.value = 'puppy';
      refresh();
    }, true);
    document.getElementById('species')?.addEventListener('change', refresh);
    new MutationObserver(refresh).observe(document.body, { childList:true, subtree:true });
    addEventListener('storage', refresh);
    addEventListener('focus', refresh);
    addEventListener('critter-codes-api-ready', refresh);
    addEventListener('critter-codes-runtime-exported', refresh);
    addEventListener('critter-code-redeemed', refresh);
    document.addEventListener('critter-code-redeemed', refresh);
    refresh();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once:true }) : install();
  window.NewCritterAppearance = Object.freeze({ definitions:DEFINITIONS, owns, refresh });
})();

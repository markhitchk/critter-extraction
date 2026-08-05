/* Harley's Studios — Appearance scrolling and Critter Code locks v6. */
(() => {
  'use strict';
  if (window.__NEW_CRITTER_APPEARANCE_V6__) return;
  window.__NEW_CRITTER_APPEARANCE_V6__ = true;

  const STORAGE_KEY = 'critterExtractionInventory';
  const STARTERS = new Set(['puppy', 'bunny', 'kitty', 'fox', 'panda', 'bear']);
  const REWARDS = Object.freeze({
    raccoon: { name: 'Raccoon', body: '#8f98a3', accent: '#353846', asset: 'raccoon.svg', keys: ['raccoon', 'critter_raccoon', 'b04'] },
    redpanda: { name: 'Red Panda', body: '#bd5b3e', accent: '#f6e0c5', asset: 'redpanda.svg', keys: ['redpanda', 'red_panda', 'critter_red_panda', 'b06'] },
    penguin: { name: 'Penguin', body: '#26364b', accent: '#f4f7fb', asset: 'penguin.svg', keys: ['penguin', 'critter_penguin', 'b02'] },
    crow: { name: 'Crow', body: '#202430', accent: '#515a70', asset: 'crow.svg', keys: ['crow', 'critter_crow', 'b03'] },
    frog: { name: 'Frog', body: '#71b85a', accent: '#d6ee8e', asset: 'frog.svg', keys: ['frog', 'critter_frog', 'b05'] },
    arcticfox: { name: 'Arctic Fox', body: '#eef5fb', accent: '#b9d4e8', asset: 'arcticfox.svg', keys: ['arcticfox', 'arctic_fox', 'critter_arctic_fox', 'b07'] },
    capybara: { name: 'Capybara', body: '#ad7651', accent: '#6d4734', asset: 'capybara.svg', keys: ['capybara', 'critter_capybara', 'b08'] },
    axolotl: { name: 'Axolotl', body: '#f1a9bd', accent: '#cf638f', asset: 'axolotl.svg', keys: ['axolotl', 'critter_axolotl', 'b09'] },
    otter: { name: 'Otter', body: '#765039', accent: '#d7aa7c', asset: 'otter.svg', keys: ['otter', 'critter_otter', 'b11'] }
  });

  const OWNERSHIP_KEY = /owned|ownership|unlock|redeem|claim|reward|code|bundle/i;
  let queued = false;

  const normalize = value => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const compact = value => normalize(value).replace(/_/g, '');

  function readDb() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function activeAccount(db = readDb()) {
    return db?.accounts?.find(item => item?.id === db.activeId) || db?.accounts?.[0] || null;
  }

  function addTokens(value, tokens, seen = new Set()) {
    if (value == null) return;
    if (typeof value !== 'object') {
      const normal = normalize(value);
      if (normal) {
        tokens.add(normal);
        tokens.add(compact(normal));
      }
      return;
    }
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(item => addTokens(item, tokens, seen));
      return;
    }
    Object.entries(value).forEach(([key, item]) => {
      const normal = normalize(key);
      if (normal) {
        tokens.add(normal);
        tokens.add(compact(normal));
      }
      addTokens(item, tokens, seen);
    });
  }

  function ownershipTokens(account = activeAccount()) {
    const tokens = new Set();
    if (!account || typeof account !== 'object') return tokens;
    Object.entries(account).forEach(([key, value]) => {
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

  function loadOtterRewardExtension() {
    if (window.CritterCodesOtter || document.getElementById('critter-codes-otter-loader')) return;
    const script = document.createElement('script');
    script.id = 'critter-codes-otter-loader';
    script.async = false;
    script.src = window.CritterPaths?.resolve?.('core/rewards/critter-codes-otter.js?v=1.0.0') || '../rewards/critter-codes-otter.js?v=1.0.0';
    script.addEventListener('error', () => console.warn('The Otter Critter Code extension could not be loaded.'), { once: true });
    document.head.appendChild(script);
  }

  function persistControls() {
    const species = document.getElementById('species');
    const body = document.getElementById('bodyColor');
    const accent = document.getElementById('accentColor');
    const accessory = document.getElementById('accessory');
    const eyes = document.getElementById('eyeStyle');
    if (!species || !body || !accent || !accessory || !eyes || !owns(species.value)) return false;

    const db = readDb();
    const account = activeAccount(db);
    if (!db || !account) return false;

    const id = String(species.value || 'puppy').toLowerCase();
    const reward = REWARDS[id] || {};
    account.appearance = {
      ...(account.appearance || {}),
      species: id,
      bodyColor: validColor(body.value, reward.body || '#d9a06f'),
      accentColor: validColor(accent.value, reward.accent || '#7b4d35'),
      accessory: String(accessory.value || 'none'),
      eyeStyle: String(eyes.value || 'dot'),
      rewardCritterId: REWARDS[id] ? `critter_${id}` : ''
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      window.dispatchEvent(new CustomEvent('critter-appearance-updated', { detail: { ...account.appearance } }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function updatePreview() {
    const select = document.getElementById('species');
    const body = document.getElementById('bodyColor');
    const accent = document.getElementById('accentColor');
    const preview = document.getElementById('critterPreviewAsset');
    const shell = document.getElementById('critterPreview');
    if (!select) return;

    const id = String(select.value || '').toLowerCase();
    const reward = REWARDS[id];
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
      badge.setAttribute('aria-hidden', 'true');
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

    Object.entries(REWARDS).forEach(([id, reward]) => {
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
    setTimeout(() => {
      persistControls();
      updatePreview();
    }, 0);
  }

  function ensureLayoutStyles() {
    let style = document.getElementById('newCritterAppearanceStyles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'newCritterAppearanceStyles';
      document.head.appendChild(style);
    }

    style.textContent = `
      #customizeModal {
        overflow: visible;
      }

      #customizeModal .customize-card {
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) auto !important;
        width: min(1180px, calc(100vw - 28px)) !important;
        height: min(90dvh, 720px) !important;
        max-height: calc(100dvh - 24px) !important;
        overflow: hidden !important;
      }

      #customizeModal .customize-card > header,
      #customizeModal .customize-card > footer {
        min-height: 0;
      }

      #customizeModal .customize-grid {
        grid-template-columns: minmax(210px, 260px) minmax(0, 1fr) !important;
        min-width: 0;
        min-height: 0 !important;
        height: 100% !important;
        align-items: stretch !important;
        overflow: hidden !important;
        padding: 12px 0 !important;
      }

      #customizeModal .critter-preview {
        width: 100%;
        min-width: 0;
        min-height: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
      }

      #customizeModal .critter-preview img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
      }

      #customizeModal .customize-controls {
        min-width: 0;
        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        padding: 2px 10px 22px 2px;
      }

      #characterRoster {
        max-height: none !important;
        overflow: visible !important;
        align-content: start;
        padding-right: 0;
      }

      #customizeModal .character-choice {
        position: relative;
      }

      #customizeModal .character-choice.reward-locked {
        opacity: .62;
        cursor: not-allowed;
        border-color: rgba(255, 211, 111, .3);
        background: linear-gradient(180deg, rgba(255, 211, 111, .08), rgba(15, 18, 36, .96));
      }

      #customizeModal .character-choice.reward-locked img {
        filter: grayscale(.85) brightness(.58);
      }

      #customizeModal .critter-code-lock {
        position: absolute;
        top: 9px;
        right: 9px;
        z-index: 2;
        padding: 4px 7px;
        border: 1px solid rgba(255, 211, 111, .55);
        border-radius: 999px;
        background: rgba(10, 12, 25, .92);
        color: #ffd36f;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .08em;
        box-shadow: 0 5px 14px rgba(0, 0, 0, .32);
      }

      #customizeModal .critter-code-lock[hidden] {
        display: none;
      }

      .critter-preview {
        background:
          radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--critter-accent-color, #64e8ea) 28%, transparent), transparent 58%),
          linear-gradient(145deg, color-mix(in srgb, var(--critter-body-color, #26364b) 18%, #11182a), #0a1020) !important;
      }

      .customize-controls input[type="color"],
      .customize-controls select {
        pointer-events: auto !important;
        opacity: 1 !important;
        filter: none !important;
      }

      .customize-controls input[type="color"] {
        min-height: 46px;
        cursor: pointer;
      }

      @media (min-width: 761px) and (max-height: 820px) {
        #customizeModal .customize-card {
          height: calc(100dvh - 20px) !important;
          max-height: calc(100dvh - 20px) !important;
        }

        #customizeModal .customize-grid {
          grid-template-columns: minmax(190px, 235px) minmax(0, 1fr) !important;
          gap: 16px !important;
          padding: 10px 0 !important;
        }

        #customizeModal .character-choice {
          min-height: 112px;
        }
      }

      @media (max-width: 760px) {
        #customizeModal .customize-card {
          width: calc(100vw - 6px) !important;
          height: calc(100dvh - 6px) !important;
          max-height: calc(100dvh - 6px) !important;
          overflow: hidden !important;
        }

        #customizeModal .customize-grid {
          grid-template-columns: 1fr !important;
          grid-template-rows: minmax(150px, 28dvh) minmax(0, 1fr) !important;
          align-items: stretch !important;
          overflow: hidden !important;
          padding: 10px 0 !important;
        }

        #customizeModal .critter-preview {
          height: auto !important;
          min-height: 150px !important;
          max-height: 28dvh !important;
        }

        #customizeModal .customize-controls {
          height: auto !important;
          max-height: none !important;
          overflow-y: auto !important;
          padding: 0 8px 22px 0 !important;
        }
      }

      @media (max-width: 420px), (max-height: 560px) {
        #customizeModal .customize-grid {
          grid-template-rows: minmax(120px, 22dvh) minmax(0, 1fr) !important;
        }

        #customizeModal .critter-preview {
          min-height: 120px !important;
          max-height: 22dvh !important;
        }

        #customizeModal .character-roster {
          grid-template-columns: repeat(2, minmax(90px, 1fr)) !important;
        }
      }
    `;
  }

  function install() {
    loadOtterRewardExtension();
    ensureLayoutStyles();

    const form = document.getElementById('customizeForm');
    const species = document.getElementById('species');
    species?.addEventListener('change', onSpeciesChange);

    ['bodyColor', 'accentColor', 'accessory', 'eyeStyle'].forEach(id => {
      const control = document.getElementById(id);
      control?.addEventListener('input', () => {
        updatePreview();
        setTimeout(persistControls, 0);
      });
      control?.addEventListener('change', () => {
        updatePreview();
        setTimeout(persistControls, 0);
      });
    });

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

    const roster = document.getElementById('characterRoster');
    if (roster) new MutationObserver(refresh).observe(roster, { childList: true });

    ['storage', 'focus', 'critter-code-redeemed', 'critter-codes-redeemed', 'critter-code-unlocks-changed', 'critter-codes-api-ready']
      .forEach(name => window.addEventListener(name, refresh));
    document.addEventListener('critter-code-redeemed', refresh);
    document.addEventListener('critter-codes-redeemed', refresh);
    refresh();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', install, { once: true })
    : install();

  window.NewCritterAppearance = Object.freeze({
    definitions: REWARDS,
    owns,
    refresh,
    save: persistControls,
    ownershipTokens
  });
})();

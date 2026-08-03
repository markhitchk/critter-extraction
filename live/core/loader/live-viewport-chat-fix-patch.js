(() => {
  'use strict';

  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Viewport/chat fix loaded before the Critter patch runtime');
  }

  window.__CRITTER_ARENA_PATCHES__.push(source => {
    const pattern = /  function cleanRoomChatText\(value\)\{[^\n]*\}/;
    if (!pattern.test(source)) {
      console.warn('Optional LIVE patch missing: room chat cleaner');
      return source;
    }

    const replacement = `  const ROOM_CHAT_FILTER_WORDS=Object.freeze(['motherfucker','motherfuckers','fucking','fucker','fuckers','bullshit','asshole','assholes','bastard','bastards','bitch','bitches','cunt','cunts','dick','dicks','cock','cocks','pussy','pussies','whore','whores','slut','sluts','nigger','niggers','nigga','niggas','faggot','faggots','retard','retards','shit','shits','fuck']);
  const ROOM_CHAT_FILTER_PHRASES=Object.freeze(['kill yourself','kys']);
  const ROOM_CHAT_LEET=Object.freeze({a:'[a@4]',b:'[b8]',e:'[e3]',g:'[g69]',i:'[i1!|]',l:'[l1|]',o:'[o0]',s:'[s5$]',t:'[t7+]'});
  function roomChatFilterPattern(word){const body=[...String(word).toLowerCase().replace(/[^a-z0-9]/g,'')].map(ch=>ROOM_CHAT_LEET[ch]||ch).join('[^a-z0-9]*');return new RegExp('(^|[^a-z0-9])('+body+')(?=$|[^a-z0-9])','gi');}
  function cleanRoomChatText(value){let text=String(value||'').replace(/[<>\\u0000-\\u001f\\u007f]/g,' ').replace(/\\s+/g,' ').trim().slice(0,180);for(const phrase of ROOM_CHAT_FILTER_PHRASES)text=text.replace(roomChatFilterPattern(phrase),(match,prefix,body)=>prefix+'*'.repeat(Math.max(3,body.replace(/[^a-z0-9]/gi,'').length)));for(const word of ROOM_CHAT_FILTER_WORDS)text=text.replace(roomChatFilterPattern(word),(match,prefix,body)=>prefix+'*'.repeat(Math.max(3,body.replace(/[^a-z0-9]/gi,'').length)));return text;}`;

    return source.replace(pattern, replacement);
  });

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectViewportChatFix() {
    previousUi?.();
    if (document.getElementById('viewportChatFixStyles')) return;

    const style = document.createElement('style');
    style.id = 'viewportChatFixStyles';
    style.textContent = `
/* Full-screen inventory management for short Chromebook/browser viewports. */
@media (max-height:560px) {
  dialog#inventoryModal.modal[open] {
    position:fixed!important;
    inset:0!important;
    z-index:2147483000!important;
    box-sizing:border-box!important;
    width:100vw!important;
    height:100dvh!important;
    max-width:none!important;
    max-height:none!important;
    margin:0!important;
    padding:3px!important;
    overflow:hidden!important;
  }
  #inventoryModal .inventory-card {
    box-sizing:border-box!important;
    width:100%!important;
    height:100%!important;
    max-width:none!important;
    max-height:none!important;
    margin:0!important;
    padding:5px 7px!important;
    border-radius:11px!important;
    overflow:hidden!important;
    display:grid!important;
    grid-template-rows:34px minmax(0,1fr) 34px!important;
    gap:0!important;
  }
  #inventoryModal .inventory-card>header {
    grid-row:1!important;
    min-height:0!important;
    padding:0 0 4px!important;
    align-items:center!important;
  }
  #inventoryModal .inventory-card>header .eyebrow,
  #inventoryModal .custom-loadout-notice,
  #inventoryModal .inventory-summary,
  #inventoryModal .inventory-help,
  #inventoryModal .equipment-panel {
    display:none!important;
  }
  #inventoryModal .inventory-card>header h2 {
    margin:0!important;
    font-size:17px!important;
    line-height:1!important;
  }
  #inventoryModal .icon-close {
    width:30px!important;
    height:30px!important;
    border-radius:8px!important;
    font-size:18px!important;
  }
  #inventoryModal .inventory-layout,
  #inventoryModal.custom-loadout-mode .inventory-layout {
    grid-row:2!important;
    width:100%!important;
    height:100%!important;
    min-width:0!important;
    min-height:0!important;
    max-width:none!important;
    margin:0!important;
    overflow:hidden!important;
    display:grid!important;
    grid-template-columns:minmax(285px,.72fr) minmax(0,1.28fr)!important;
    gap:6px!important;
  }

  #inventoryModal.inventory-ingame:not(.inventory-loot-open) .inventory-layout {
    grid-template-columns:1fr!important;
  }
  #inventoryModal.inventory-ingame:not(.inventory-loot-open) .inventory-side {
    display:none!important;
  }
  #inventoryModal .inventory-section {
    grid-row:auto!important;
    min-width:0!important;
    min-height:0!important;
    padding:5px!important;
    overflow:hidden!important;
    display:grid!important;
    grid-template-rows:25px minmax(0,1fr)!important;
  }
  #inventoryModal .inventory-side {
    grid-row:auto!important;
    min-width:0!important;
    min-height:0!important;
    padding:0!important;
    overflow:hidden!important;
    display:grid!important;
    grid-template-rows:minmax(0,1fr) 55px!important;
    gap:5px!important;
  }
  #inventoryModal .side-storage {
    min-width:0!important;
    min-height:0!important;
    padding:5px!important;
    overflow:hidden!important;
    display:grid!important;
    grid-template-rows:25px minmax(0,1fr)!important;
  }
  #inventoryModal .inventory-heading {
    min-width:0!important;
    min-height:0!important;
    margin:0!important;
    align-items:center!important;
  }
  #inventoryModal .inventory-heading .eyebrow {display:none!important}
  #inventoryModal .inventory-heading h3 {margin:0!important;font-size:12px!important;line-height:1!important}
  #inventoryModal .inventory-heading .mini {padding:4px 7px!important;font-size:8px!important}
  #inventoryModal .backpack-grid,
  #inventoryModal .side-grid,
  #inventoryModal.custom-loadout-mode .side-grid {
    box-sizing:border-box!important;
    width:100%!important;
    height:100%!important;
    min-width:0!important;
    min-height:0!important;
    max-height:none!important;
    overflow:auto!important;
    overscroll-behavior:contain!important;
    scrollbar-gutter:stable!important;
    align-content:start!important;
    padding:2px 4px 5px 2px!important;
    gap:4px!important;
  }
  #inventoryModal .backpack-grid {grid-template-columns:repeat(8,minmax(34px,1fr))!important}
  #inventoryModal .side-grid,
  #inventoryModal.custom-loadout-mode .side-grid {grid-template-columns:repeat(10,minmax(32px,1fr))!important}
  #inventoryModal .item-slot,
  #inventoryModal .item-tile {
    min-width:0!important;
    min-height:0!important;
    aspect-ratio:1!important;
  }
  #inventoryModal .item-details {
    min-width:0!important;
    min-height:0!important;
    height:55px!important;
    max-height:55px!important;
    padding:5px 7px!important;
    overflow:auto!important;
  }
  #inventoryModal .item-details .eyebrow {display:none!important}
  #inventoryModal .item-details h3 {margin:0 0 2px!important;font-size:11px!important}
  #inventoryModal .item-details p {margin:0!important;font-size:8px!important;line-height:1.25!important}
  #inventoryModal .item-details-icon {width:38px!important;height:38px!important;min-width:38px!important}
  #inventoryModal .inventory-card>footer {
    grid-row:3!important;
    position:static!important;
    min-height:0!important;
    height:34px!important;
    margin:0!important;
    padding:4px 0 0!important;
    border-top:1px solid var(--line)!important;
    display:flex!important;
    align-items:end!important;
    justify-content:flex-end!important;
    flex-wrap:nowrap!important;
    gap:5px!important;
    background:#171932!important;
  }
  #inventoryModal .inventory-card>footer button {
    flex:0 1 auto!important;
    min-width:0!important;
    padding:5px 8px!important;
    border-radius:8px!important;
    font-size:8px!important;
    white-space:nowrap!important;
  }
}
@media (max-height:560px) and (max-width:760px) {
  #inventoryModal .inventory-layout,
  #inventoryModal.custom-loadout-mode .inventory-layout {
    grid-template-columns:minmax(220px,.85fr) minmax(0,1.15fr)!important;
  }
  #inventoryModal .backpack-grid {grid-template-columns:repeat(5,minmax(32px,1fr))!important}
  #inventoryModal .side-grid,
  #inventoryModal.custom-loadout-mode .side-grid {grid-template-columns:repeat(6,minmax(30px,1fr))!important}
}
`;
    document.head.appendChild(style);
  };
})();

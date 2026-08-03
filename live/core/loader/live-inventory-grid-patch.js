(() => {
  'use strict';
  const previousUi=window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__=function injectInventoryGridRevamp(){
    previousUi?.();
    if(document.getElementById('inventoryGridRevampStyles'))return;
    const style=document.createElement('style');style.id='inventoryGridRevampStyles';style.textContent=`
dialog#inventoryModal.modal[open]{position:fixed!important;inset:0!important;margin:auto!important;width:auto!important;height:auto!important;max-width:100vw!important;max-height:100dvh!important;overflow:visible!important}
#inventoryModal .inventory-card{box-sizing:border-box!important;width:min(1220px,calc(100vw - 12px))!important;height:min(820px,calc(100dvh - 12px))!important;max-height:calc(100dvh - 12px)!important;margin:0 auto!important;padding:12px!important;overflow:hidden!important;display:grid!important;grid-template-rows:auto auto minmax(0,1fr) auto!important;gap:0!important}
#inventoryModal .inventory-card>header{padding-bottom:7px!important}
#inventoryModal .inventory-summary{display:grid!important;grid-template-columns:1.45fr repeat(3,1fr)!important;gap:7px!important;padding:7px 0!important}
#inventoryModal .inventory-summary>div{min-height:49px!important;padding:7px 9px!important}
#inventoryModal .inventory-summary span{font-size:7px!important}#inventoryModal .inventory-summary strong{font-size:14px!important}#inventoryModal .inventory-summary small{font-size:7px!important}
#inventoryModal .inventory-layout{height:auto!important;min-height:0!important;overflow:hidden!important;display:grid!important;grid-template-columns:minmax(410px,1fr) minmax(410px,1fr)!important;gap:10px!important}
#inventoryModal .inventory-section,#inventoryModal .inventory-side,#inventoryModal .equipment-panel,#inventoryModal .side-storage,#inventoryModal .item-details{min-width:0!important;min-height:0!important}
#inventoryModal .inventory-section{overflow:hidden!important;display:grid!important;grid-template-rows:auto minmax(0,1fr) auto!important;padding:10px!important}
#inventoryModal .inventory-side{overflow:hidden!important;display:grid!important;grid-template-rows:auto minmax(0,1fr) auto!important;gap:8px!important;align-content:stretch!important}
#inventoryModal .equipment-panel{overflow:auto!important;padding:9px!important}
#inventoryModal .side-storage{overflow:hidden!important;display:grid!important;grid-template-rows:auto minmax(0,1fr)!important;padding:10px!important}
#inventoryModal .inventory-heading{margin-bottom:7px!important}
#inventoryModal .backpack-grid,#inventoryModal .side-grid{box-sizing:border-box!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;overflow:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important;align-content:start!important;padding:3px 5px 8px 3px!important}
#inventoryModal .backpack-grid{grid-template-columns:repeat(5,minmax(46px,1fr))!important}
#inventoryModal .side-grid{grid-template-columns:repeat(8,minmax(42px,1fr))!important}
#inventoryModal .item-slot,#inventoryModal .item-tile{min-width:0!important;min-height:0!important;aspect-ratio:1!important}
#inventoryModal .item-details{overflow:auto!important;min-height:68px!important;max-height:110px!important;padding:9px!important}
#inventoryModal .inventory-card>footer{position:static!important;bottom:auto!important;min-height:0!important;margin-top:7px!important;padding-top:7px!important;flex-wrap:wrap!important;background:none!important}
#inventoryModal.inventory-ingame:not(.inventory-loot-open) .inventory-layout{grid-template-columns:1fr!important;max-width:760px!important;margin:0 auto!important;width:100%!important}
#inventoryModal.inventory-ingame:not(.inventory-loot-open) .inventory-side{grid-row:1!important;grid-template-rows:auto!important;overflow:visible!important}
#inventoryModal.inventory-ingame:not(.inventory-loot-open) .inventory-section{grid-row:2!important;min-height:260px!important}
#inventoryModal.inventory-ingame:not(.inventory-loot-open) .side-storage{display:none!important}
#inventoryModal.custom-loadout-mode .inventory-layout{grid-template-columns:minmax(410px,.9fr) minmax(500px,1.1fr)!important}
#inventoryModal.custom-loadout-mode .side-grid{grid-template-columns:repeat(8,minmax(42px,1fr))!important}
@media(max-height:700px) and (min-width:701px){
 #inventoryModal .inventory-card{width:calc(100vw - 6px)!important;height:calc(100dvh - 6px)!important;max-height:calc(100dvh - 6px)!important;padding:7px 9px!important}
 #inventoryModal .inventory-card>header{padding-bottom:4px!important}#inventoryModal .inventory-card h2{font-size:19px!important}
 #inventoryModal .inventory-summary{grid-template-columns:1.35fr repeat(3,1fr)!important;gap:4px!important;padding:4px 0!important}
 #inventoryModal .inventory-summary>div{min-height:36px!important;padding:4px 6px!important}#inventoryModal .inventory-summary strong{font-size:11px!important}#inventoryModal .inventory-summary small{display:none!important}
 #inventoryModal .inventory-layout{grid-template-columns:minmax(350px,.85fr) minmax(500px,1.15fr)!important;gap:7px!important}
 #inventoryModal .inventory-section,#inventoryModal .equipment-panel,#inventoryModal .side-storage,#inventoryModal .item-details{padding:7px!important}
 #inventoryModal .backpack-grid{grid-template-columns:repeat(10,minmax(34px,1fr))!important}
 #inventoryModal .side-grid,#inventoryModal.custom-loadout-mode .side-grid{grid-template-columns:repeat(10,minmax(34px,1fr))!important}
 #inventoryModal .equipment-slots{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important}
 #inventoryModal .equipment-slot{padding:5px!important;min-height:44px!important}
 #inventoryModal .item-details{min-height:45px!important;max-height:70px!important}
 #inventoryModal .inventory-card>footer{margin-top:4px!important;padding-top:4px!important}
 #inventoryModal.inventory-ingame:not(.inventory-loot-open) .inventory-layout{grid-template-columns:1fr!important}
}
@media(max-width:900px){
 #inventoryModal .inventory-layout,#inventoryModal.custom-loadout-mode .inventory-layout{grid-template-columns:1fr!important;overflow:visible!important}
 #inventoryModal .inventory-card{overflow-y:auto!important;display:flex!important;flex-direction:column!important}
 #inventoryModal .inventory-section,#inventoryModal .inventory-side,#inventoryModal .side-storage{overflow:visible!important}
 #inventoryModal .backpack-grid,#inventoryModal .side-grid{height:auto!important;max-height:42dvh!important}
}
@media(max-width:700px){
 dialog#inventoryModal.modal[open]{max-width:calc(100vw - 2px)!important;max-height:calc(100dvh - 2px)!important}
 #inventoryModal .inventory-card{width:calc(100vw - 4px)!important;height:calc(100dvh - 4px)!important;max-height:calc(100dvh - 4px)!important;padding:8px!important}
 #inventoryModal .inventory-summary{grid-template-columns:1fr 1fr!important}#inventoryModal .inventory-summary>div:first-child{grid-column:1/-1!important}
 #inventoryModal .backpack-grid,#inventoryModal .side-grid,#inventoryModal.custom-loadout-mode .side-grid{grid-template-columns:repeat(5,minmax(42px,1fr))!important;max-height:44dvh!important}
 #inventoryModal .inventory-card>footer{position:sticky!important;bottom:-8px!important;z-index:5!important;background:#171932!important;justify-content:stretch!important}
 #inventoryModal .inventory-card>footer button{flex:1 1 42%!important;min-width:0!important}
}
@media(max-width:390px){#inventoryModal .backpack-grid,#inventoryModal .side-grid,#inventoryModal.custom-loadout-mode .side-grid{grid-template-columns:repeat(4,minmax(42px,1fr))!important}}
`;
    document.head.appendChild(style);
  };
})();

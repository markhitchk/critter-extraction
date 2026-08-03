(() => {
  'use strict';

  if (!Array.isArray(window.__CRITTER_ARENA_PATCHES__)) {
    throw new Error('Inventory modal final fix loaded before the Critter patch runtime');
  }

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectInventoryModalFinalFix() {
    previousUi?.();

    if (!document.getElementById('inventoryModalFinalFixStyles')) {
      const style = document.createElement('style');
      style.id = 'inventoryModalFinalFixStyles';
      style.textContent = `
/* The older centered-dialog rule used translate(-50%,-50%). On short
   screens that transform survived the full-screen override and moved half
   of Inventory / Account Stash outside the viewport. */
@media (max-height:620px) {
  dialog#inventoryModal.modal[open] {
    position:fixed!important;
    inset:0!important;
    top:0!important;
    left:0!important;
    right:0!important;
    bottom:0!important;
    transform:none!important;
    translate:none!important;
    box-sizing:border-box!important;
    display:block!important;
    width:100vw!important;
    min-width:100vw!important;
    max-width:100vw!important;
    height:100dvh!important;
    min-height:100dvh!important;
    max-height:100dvh!important;
    margin:0!important;
    padding:0!important;
    overflow:hidden!important;
  }

  #inventoryModal .inventory-card,
  #inventoryModal.inventory-ingame .inventory-card,
  #inventoryModal.custom-loadout-mode .inventory-card {
    position:absolute!important;
    inset:3px!important;
    top:3px!important;
    left:3px!important;
    right:3px!important;
    bottom:3px!important;
    transform:none!important;
    translate:none!important;
    box-sizing:border-box!important;
    width:auto!important;
    min-width:0!important;
    max-width:none!important;
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    margin:0!important;
    overflow:hidden!important;
  }

  #inventoryModal .inventory-layout,
  #inventoryModal .inventory-section,
  #inventoryModal .inventory-side,
  #inventoryModal .side-storage,
  #inventoryModal .backpack-grid,
  #inventoryModal .side-grid {
    min-width:0!important;
    min-height:0!important;
    max-width:none!important;
  }
}
`;
      document.head.appendChild(style);
    }

    const modal = document.getElementById('inventoryModal');
    if (!modal || modal.dataset.finalViewportReset === '1') return;
    modal.dataset.finalViewportReset = '1';

    const resetScroll = () => {
      if (!modal.open && !modal.hasAttribute('open')) return;
      const nodes = [
        modal,
        modal.querySelector('.inventory-card'),
        modal.querySelector('.inventory-layout'),
        modal.querySelector('.inventory-section'),
        modal.querySelector('.inventory-side'),
        modal.querySelector('.side-storage'),
        modal.querySelector('.backpack-grid'),
        modal.querySelector('.side-grid')
      ];
      for (const node of nodes) {
        if (!node) continue;
        node.scrollTop = 0;
        node.scrollLeft = 0;
      }
    };

    const resetAfterOpen = () => {
      resetScroll();
      requestAnimationFrame(() => {
        resetScroll();
        requestAnimationFrame(resetScroll);
      });
    };

    new MutationObserver(mutations => {
      if (mutations.some(entry => entry.attributeName === 'open')) resetAfterOpen();
    }).observe(modal, { attributes:true, attributeFilter:['open'] });

    modal.addEventListener('close', resetScroll);
    window.addEventListener('resize', () => {
      if (modal.open) resetAfterOpen();
    }, { passive:true });
  };
})();
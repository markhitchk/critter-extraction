(() => {
  'use strict';

  const previousUi = window.__CRITTER_ARENA_UI__;
  window.__CRITTER_ARENA_UI__ = function injectLoadoutViewportFix() {
    previousUi?.();
    if (document.getElementById('loadoutModalViewportFixStyles')) return;

    const style = document.createElement('style');
    style.id = 'loadoutModalViewportFixStyles';
    style.textContent = `
@media (max-height: 680px) {
  dialog#loadoutModal.modal[open] {
    position: fixed !important;
    inset: 0 !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    min-width: 0 !important;
    max-width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    min-height: 0 !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    translate: none !important;
    overflow: hidden !important;
    display: block !important;
  }

  #loadoutModal .loadout-card {
    position: absolute !important;
    inset: 4px !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 10px 12px !important;
    transform: none !important;
    translate: none !important;
    overflow: hidden !important;
    border-radius: 14px !important;
    display: grid !important;
    grid-template-rows: auto auto auto minmax(0, 1fr) auto !important;
  }

  #loadoutModal .loadout-card > header {
    min-width: 0 !important;
    padding-bottom: 7px !important;
  }

  #loadoutModal .loadout-card > header h2 {
    font-size: 21px !important;
  }

  #loadoutModal .modal-intro {
    margin: 6px 0 !important;
    font-size: 10px !important;
    line-height: 1.35 !important;
  }

  #loadoutModal .custom-loadout-toolbar {
    min-width: 0 !important;
    margin: 0 0 7px !important;
    padding: 7px 9px !important;
    gap: 8px !important;
  }

  #loadoutModal .custom-loadout-toolbar strong {
    font-size: 10px !important;
  }

  #loadoutModal .custom-loadout-toolbar small {
    font-size: 8px !important;
    line-height: 1.3 !important;
  }

  #loadoutModal .custom-loadout-toolbar button {
    padding: 7px 10px !important;
    font-size: 9px !important;
  }

  #loadoutModal .loadout-grid {
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    width: 100% !important;
    height: 100% !important;
    grid-template-columns: repeat(5, minmax(150px, 1fr)) !important;
    gap: 8px !important;
    padding: 2px 2px 8px !important;
    align-items: start !important;
    overflow: auto !important;
    overscroll-behavior: contain !important;
    scrollbar-width: thin !important;
  }

  #loadoutModal .loadout-choice {
    min-width: 0 !important;
    min-height: 275px !important;
    padding: 9px !important;
    gap: 6px !important;
    border-radius: 13px !important;
  }

  #loadoutModal .loadout-choice img {
    max-height: 82px !important;
  }

  #loadoutModal .loadout-choice h3 {
    margin: 0 !important;
    font-size: 13px !important;
  }

  #loadoutModal .loadout-choice p,
  #loadoutModal .loadout-choice small {
    font-size: 8px !important;
    line-height: 1.3 !important;
  }

  #loadoutModal .loadout-card > footer {
    margin-top: 0 !important;
    padding-top: 7px !important;
    background: rgba(18, 21, 43, .96) !important;
  }

  #loadoutModal .loadout-card > footer .primary {
    padding: 8px 17px !important;
  }
}

@media (max-width: 900px) and (max-height: 760px) {
  #loadoutModal .loadout-grid {
    grid-template-columns: repeat(3, minmax(150px, 1fr)) !important;
  }
}

@media (max-width: 620px) {
  dialog#loadoutModal.modal[open] {
    position: fixed !important;
    inset: 0 !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    translate: none !important;
    overflow: hidden !important;
    display: block !important;
  }

  #loadoutModal .loadout-card {
    position: absolute !important;
    inset: 3px !important;
    width: auto !important;
    height: auto !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    transform: none !important;
    translate: none !important;
    display: grid !important;
    grid-template-rows: auto auto auto minmax(0, 1fr) auto !important;
    overflow: hidden !important;
  }

  #loadoutModal .loadout-grid {
    grid-template-columns: repeat(2, minmax(138px, 1fr)) !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: auto !important;
  }
}
`;
    document.head.appendChild(style);

    const modal = document.getElementById('loadoutModal');
    const resetScroll = () => {
      if (!modal?.open) return;
      modal.scrollTop = 0;
      modal.scrollLeft = 0;
      const card = modal.querySelector('.loadout-card');
      if (card) {
        card.scrollTop = 0;
        card.scrollLeft = 0;
      }
      const grid = modal.querySelector('.loadout-grid');
      if (grid) {
        grid.scrollTop = 0;
        grid.scrollLeft = 0;
      }
    };

    if (modal) {
      new MutationObserver(() => {
        if (!modal.open) return;
        resetScroll();
        requestAnimationFrame(resetScroll);
      }).observe(modal, { attributes: true, attributeFilter: ['open'] });
    }

    window.addEventListener('resize', resetScroll);
  };
})();

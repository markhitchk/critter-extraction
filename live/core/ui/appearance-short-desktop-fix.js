/* YOUR CRITTER / Appearance viewport and scrolling correction v2. */
(() => {
  'use strict';

  if (window.__CRITTER_APPEARANCE_VIEWPORT_FIX_V2__) return;
  window.__CRITTER_APPEARANCE_VIEWPORT_FIX_V2__ = true;

  const ROOT_HEIGHT_PROPERTY = '--critter-appearance-viewport-height';

  function syncViewportHeight() {
    const viewportHeight = Math.max(
      240,
      Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0)
    );
    document.documentElement.style.setProperty(ROOT_HEIGHT_PROPERTY, `${viewportHeight}px`);
  }

  function syncDialogAccessibility() {
    const controls = document.querySelector('#customizeModal .customize-controls');
    if (!controls) return;
    if (!controls.hasAttribute('tabindex')) controls.tabIndex = 0;
    if (!controls.hasAttribute('role')) controls.setAttribute('role', 'region');
    if (!controls.hasAttribute('aria-label')) controls.setAttribute('aria-label', 'Critter appearance choices');
  }

  function install() {
    syncViewportHeight();
    syncDialogAccessibility();

    let style = document.getElementById('critterAppearanceViewportFix');
    if (!style) {
      style = document.createElement('style');
      style.id = 'critterAppearanceViewportFix';
      document.head.appendChild(style);
    }

    style.textContent = `
      /* The native dialog owns the whole visible viewport. This avoids the
         older centered-dialog max-height rules clipping the card in ChromeOS,
         browser zoom, and forum iframe layouts. */
      #customizeModal[open] {
        position: fixed !important;
        inset: 0 !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: var(${ROOT_HEIGHT_PROPERTY}, 100dvh) !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 8px !important;
        transform: none !important;
        display: grid !important;
        place-items: center !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }

      #customizeModal .customize-card {
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: 1220px !important;
        height: 100% !important;
        max-height: 780px !important;
        margin: 0 !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) auto !important;
        overflow: hidden !important;
      }

      #customizeModal .customize-card > header,
      #customizeModal .customize-card > footer {
        min-width: 0 !important;
        flex: none !important;
      }

      #customizeModal .customize-grid {
        display: grid !important;
        grid-template-columns: minmax(210px, 280px) minmax(0, 1fr) !important;
        grid-template-rows: minmax(0, 1fr) !important;
        min-width: 0 !important;
        min-height: 0 !important;
        width: 100% !important;
        height: auto !important;
        align-items: stretch !important;
        gap: 16px !important;
        padding: 12px 0 !important;
        overflow: hidden !important;
      }

      #customizeModal .critter-preview {
        grid-column: 1 !important;
        grid-row: 1 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        align-self: stretch !important;
        overflow: hidden !important;
      }

      #customizeModal .critter-preview > img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        object-position: center !important;
      }

      /* Exactly one element owns vertical scrolling. */
      #customizeModal .customize-controls {
        grid-column: 2 !important;
        grid-row: 1 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        align-self: stretch !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        scrollbar-gutter: stable !important;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        padding: 2px 12px 28px 2px !important;
      }

      #customizeModal #characterRoster,
      #customizeModal .character-roster {
        max-height: none !important;
        overflow: visible !important;
        align-content: start !important;
      }

      /* Short desktop and Chromebook browser windows stay side by side. */
      @media (min-width: 761px) and (max-height: 700px) {
        #customizeModal[open] {
          padding: 4px !important;
        }

        #customizeModal .customize-card {
          max-height: none !important;
          padding: 10px 14px !important;
        }

        #customizeModal .customize-card > header {
          padding-bottom: 9px !important;
        }

        #customizeModal .customize-card > footer {
          margin-top: 0 !important;
          padding-top: 9px !important;
        }

        #customizeModal .customize-grid {
          grid-template-columns: minmax(170px, 220px) minmax(0, 1fr) !important;
          grid-template-rows: minmax(0, 1fr) !important;
          gap: 10px !important;
          padding: 8px 0 !important;
        }

        #customizeModal .character-roster {
          grid-template-columns: repeat(4, minmax(70px, 1fr)) !important;
          gap: 7px !important;
          margin: 6px 0 10px !important;
        }

        #customizeModal .character-choice {
          min-height: 0 !important;
          padding: 5px !important;
        }

        #customizeModal .character-choice img {
          max-height: 70px !important;
        }

        #customizeModal .form-grid {
          gap: 8px !important;
        }

        #customizeModal input,
        #customizeModal select {
          padding: 7px !important;
        }
      }

      /* Narrow screens stack the preview above the independently scrollable
         controls while the header and Save Look footer remain visible. */
      @media (max-width: 760px) {
        #customizeModal[open] {
          padding: 3px !important;
        }

        #customizeModal .customize-card {
          max-width: none !important;
          max-height: none !important;
          padding: 9px !important;
        }

        #customizeModal .customize-card > header {
          padding-bottom: 9px !important;
        }

        #customizeModal .customize-card > footer {
          margin-top: 0 !important;
          padding-top: 9px !important;
        }

        #customizeModal .customize-grid {
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-rows: clamp(96px, 22dvh, 170px) minmax(0, 1fr) !important;
          gap: 8px !important;
          padding: 8px 0 !important;
        }

        #customizeModal .critter-preview {
          grid-column: 1 !important;
          grid-row: 1 !important;
          min-height: 0 !important;
          max-height: none !important;
        }

        #customizeModal .customize-controls {
          grid-column: 1 !important;
          grid-row: 2 !important;
          padding: 0 7px 24px 0 !important;
        }

        #customizeModal .character-roster {
          grid-template-columns: repeat(2, minmax(90px, 1fr)) !important;
        }
      }

      @media (max-height: 480px) {
        #customizeModal .customize-card {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }

        #customizeModal .customize-card > header {
          padding-bottom: 6px !important;
        }

        #customizeModal .customize-card > footer {
          padding-top: 6px !important;
        }

        #customizeModal .modal-card h2 {
          font-size: 22px !important;
        }
      }
    `;
  }

  const observer = new MutationObserver(() => syncDialogAccessibility());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      install();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }, { once: true });
  } else {
    install();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener('resize', syncViewportHeight, { passive: true });
  window.visualViewport?.addEventListener('resize', syncViewportHeight, { passive: true });
})();

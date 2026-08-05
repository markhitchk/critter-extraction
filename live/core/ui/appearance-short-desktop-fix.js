/* Issue #63 — short desktop and browser-zoom Appearance layout correction v1. */
(() => {
  'use strict';

  if (window.__CRITTER_APPEARANCE_SHORT_DESKTOP_FIX_V1__) return;
  window.__CRITTER_APPEARANCE_SHORT_DESKTOP_FIX_V1__ = true;

  function install() {
    let style = document.getElementById('critterAppearanceShortDesktopFix');
    if (!style) {
      style = document.createElement('style');
      style.id = 'critterAppearanceShortDesktopFix';
      document.head.appendChild(style);
    }

    style.textContent = `
      /* Desktop Appearance always has one content row. This overrides the
         accidental max-height:560px mobile row split at high browser zoom. */
      @media (min-width: 761px) {
        #customizeModal .customize-grid {
          grid-template-rows: minmax(0, 1fr) !important;
          grid-auto-rows: minmax(0, 1fr) !important;
        }

        #customizeModal .critter-preview {
          grid-column: 1 !important;
          grid-row: 1 !important;
          min-height: 0 !important;
          height: 100% !important;
          max-height: 100% !important;
        }

        #customizeModal .customize-controls {
          grid-column: 2 !important;
          grid-row: 1 !important;
          min-height: 0 !important;
          height: auto !important;
          overflow-y: auto !important;
        }
      }

      @media (min-width: 761px) and (max-height: 600px) {
        #customizeModal .customize-card {
          height: calc(100dvh - 8px) !important;
          max-height: calc(100dvh - 8px) !important;
          padding: 10px 14px !important;
        }

        #customizeModal .customize-grid {
          grid-template-columns: minmax(180px, 220px) minmax(0, 1fr) !important;
          gap: 12px !important;
          padding: 8px 0 !important;
        }

        #customizeModal .character-roster {
          grid-template-columns: repeat(4, minmax(72px, 1fr)) !important;
          gap: 7px !important;
          margin: 6px 0 10px !important;
        }

        #customizeModal .character-choice {
          min-height: 0 !important;
          padding: 5px !important;
        }

        #customizeModal .character-choice img {
          max-height: 72px !important;
        }

        #customizeModal .form-grid {
          gap: 8px !important;
        }

        #customizeModal input,
        #customizeModal select {
          padding: 7px !important;
        }
      }
    `;
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', install, { once: true })
    : install();
})();

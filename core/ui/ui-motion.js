(() => {
  'use strict';

  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  const REVEAL_SELECTOR = [
    '.hero',
    '.dashboard > .panel',
    '.studio-footer',
    '.profile-panel',
    '.stats-panel',
    '.loadout-panel',
    '.modal-card > header',
    '.modal-card > footer',
    '.modal-card > .account-note',
    '.settings-overview > span',
    '.accounts-dashboard > article',
    '.settings-category-panel > label',
    '.account-row',
    '.character-card',
    '.loadout-option',
    '.inventory-slot',
    '.inventory-item',
    '.merchant-item',
    '.trade-card',
    '.issue-row',
    '.feedback-card'
  ].join(',');

  const GENERATED_SELECTOR = [
    '.account-row',
    '.issue-row',
    '.inventory-item',
    '.inventory-slot',
    '.merchant-item',
    '.trade-card',
    '.squad-member',
    '.world-labels > *',
    '.feedback-card'
  ].join(',');

  const VALUE_SELECTOR = [
    '.stat-grid strong',
    '.petals-chip strong',
    '.profile-petals strong',
    '.ammo strong',
    '.timer',
    '#lootText',
    '#aliveCount',
    '#hudKills',
    '#cameraTag',
    '#rendererBadge',
    '#safeZoneBadge'
  ].join(',');

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  let observer = null;

  const isReduced = () => reducedMotion.matches;

  const isVisible = (element) => {
    if (!(element instanceof Element) || element.hidden) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };

  const restartClass = (element, className) => {
    if (!(element instanceof Element) || isReduced() || !isVisible(element)) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    element.addEventListener('animationend', () => {
      element.classList.remove(className);
    }, { once: true });
  };

  const animateCollection = (elements, className, step = 42, limit = 28) => {
    if (isReduced()) return;
    [...elements]
      .filter(isVisible)
      .slice(0, limit)
      .forEach((element, index) => {
        element.style.setProperty('--ui-stagger', `${Math.min(index, 12) * step}ms`);
        restartClass(element, className);
      });
  };

  const animateScreen = (screen) => {
    if (!(screen instanceof Element) || !screen.classList.contains('active')) return;
    restartClass(screen, 'ui-motion-screen-enter');
    animateCollection(screen.querySelectorAll(REVEAL_SELECTOR), 'ui-motion-reveal');
  };

  const animateDialog = (dialog) => {
    if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return;
    const card = dialog.querySelector('.modal-card') || dialog.firstElementChild;
    restartClass(card, 'ui-motion-dialog-enter');
    if (card) animateCollection(card.querySelectorAll(REVEAL_SELECTOR), 'ui-motion-reveal', 34, 20);
  };

  const animateGeneratedNode = (node) => {
    if (!(node instanceof Element)) return;
    const matches = [];
    if (node.matches(GENERATED_SELECTOR)) matches.push(node);
    node.querySelectorAll?.(GENERATED_SELECTOR).forEach((element) => matches.push(element));

    matches.slice(0, 24).forEach((element, index) => {
      element.style.setProperty('--ui-stagger', `${Math.min(index, 10) * 30}ms`);
      restartClass(element, 'ui-motion-new');
    });
  };

  const animateValue = (node) => {
    const element = node instanceof Element ? node : node.parentElement;
    const target = element?.closest?.(VALUE_SELECTOR);
    if (target) restartClass(target, 'ui-motion-confirm');
  };

  const makePointerBurst = (event) => {
    if (isReduced() || event.button > 0) return;
    const interactive = event.target.closest?.('button, a, [role="button"], input, select, textarea');
    if (!interactive || interactive.disabled) return;

    const burst = document.createElement('span');
    burst.className = 'ui-pointer-burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = `${event.clientX}px`;
    burst.style.top = `${event.clientY}px`;
    document.body.appendChild(burst);
    burst.addEventListener('animationend', () => burst.remove(), { once: true });
  };

  const animateControlChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLSelectElement) &&
        !(target instanceof HTMLTextAreaElement)) return;

    const container = target.closest(
      'label, .setting-card, .settings-category-panel, .inventory-slot, .loadout-option, .account-row'
    ) || target;
    restartClass(container, 'ui-motion-confirm');
  };

  const watchInterface = () => {
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'childList') {
          record.addedNodes.forEach(animateGeneratedNode);
          if (record.target.matches?.(VALUE_SELECTOR)) animateValue(record.target);
          continue;
        }

        if (record.type === 'characterData') {
          animateValue(record.target);
          continue;
        }

        const target = record.target;
        if (!(target instanceof Element)) continue;

        if (record.attributeName === 'class') {
          const previousClasses = new Set((record.oldValue || '').split(/\s+/).filter(Boolean));
          const becameActive = target.classList.contains('active') && !previousClasses.has('active');
          const becameSelected = target.classList.contains('selected') && !previousClasses.has('selected');

          if (target.matches('.screen.active') && becameActive) animateScreen(target);
          if (target.matches(VALUE_SELECTOR)) animateValue(target);
          if (!target.matches('.screen') && (becameActive || becameSelected)) {
            restartClass(target, 'ui-motion-confirm');
          }
        }

        if (record.attributeName === 'open' && target instanceof HTMLDialogElement) {
          animateDialog(target);
        }

        if (record.attributeName === 'hidden' && !target.hidden) {
          restartClass(target, 'ui-motion-reveal');
        }

        if (record.attributeName === 'aria-selected' && target.getAttribute('aria-selected') === 'true') {
          restartClass(target, 'ui-motion-confirm');
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'open', 'hidden', 'aria-selected'],
      attributeOldValue: true
    });
  };

  const initialize = () => {
    document.documentElement.classList.add('ui-motion-enabled');

    document.querySelectorAll('.screen.active').forEach(animateScreen);
    document.querySelectorAll('dialog[open]').forEach(animateDialog);

    document.addEventListener('pointerdown', makePointerBurst, { passive: true });
    document.addEventListener('change', animateControlChange);
    watchInterface();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener('pagehide', () => observer?.disconnect(), { once: true });
})();

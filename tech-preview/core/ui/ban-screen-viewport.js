(() => {
  'use strict';

  let frame = 0;

  function visibleViewport() {
    const viewport = window.visualViewport;
    return {
      width: Math.max(1, Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth || 1)),
      height: Math.max(1, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 1)),
      scale: Number(viewport?.scale || 1)
    };
  }

  function classify(width, height) {
    if (height <= 500) return 'short';
    if (width <= 560) return 'phone';
    if (width <= 860) return 'tablet';
    if (height <= 820) return 'laptop';
    return 'desktop';
  }

  function applyViewport() {
    frame = 0;
    const { width, height, scale } = visibleViewport();
    const root = document.documentElement;
    root.style.setProperty('--ban-viewport-width', `${width}px`);
    root.style.setProperty('--ban-viewport-height', `${height}px`);
    root.style.setProperty('--ban-viewport-scale', String(scale));

    const screen = document.getElementById('critter-ban-screen');
    if (!screen) return;

    const mode = classify(width, height);
    screen.dataset.banViewport = mode === 'short' || height <= 640 ? 'short' : mode;
    screen.dataset.banViewportWidth = String(width);
    screen.dataset.banViewportHeight = String(height);
    screen.style.setProperty('--ban-viewport-width', `${width}px`);
    screen.style.setProperty('--ban-viewport-height', `${height}px`);
  }

  function queueViewportUpdate() {
    if (frame) return;
    frame = window.requestAnimationFrame(applyViewport);
  }

  queueViewportUpdate();
  window.addEventListener('resize', queueViewportUpdate, { passive: true });
  window.addEventListener('orientationchange', queueViewportUpdate, { passive: true });
  window.visualViewport?.addEventListener('resize', queueViewportUpdate, { passive: true });
  window.visualViewport?.addEventListener('scroll', queueViewportUpdate, { passive: true });

  const observer = new MutationObserver(queueViewportUpdate);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

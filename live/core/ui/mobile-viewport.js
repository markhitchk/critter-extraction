/**
 * Critter Extraction — mobile/tablet viewport manager.
 * Keeps layout detection separate from gameplay input handling.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const media = {
    coarse: matchMedia('(pointer: coarse)'),
    fine: matchMedia('(pointer: fine)'),
    anyCoarse: matchMedia('(any-pointer: coarse)'),
    anyFine: matchMedia('(any-pointer: fine)'),
    hover: matchMedia('(hover: hover)'),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)')
  };

  let currentState = null;
  let frameRequest = 0;

  function viewport() {
    const vv = window.visualViewport;
    const width = Math.max(1, Math.round(vv?.width || innerWidth || root.clientWidth));
    const height = Math.max(1, Math.round(vv?.height || innerHeight || root.clientHeight));
    return {
      width,
      height,
      layoutWidth: Math.max(1, Math.round(root.clientWidth || innerWidth || width)),
      layoutHeight: Math.max(1, Math.round(innerHeight || root.clientHeight || height)),
      scale: vv?.scale || 1,
      offsetTop: vv?.offsetTop || 0,
      offsetLeft: vv?.offsetLeft || 0
    };
  }

  function inputProfile() {
    const touchPoints = navigator.maxTouchPoints || 0;
    const touchCapable = touchPoints > 0 || media.coarse.matches || media.anyCoarse.matches;
    const primaryCoarse = media.coarse.matches;
    const primaryFine = media.fine.matches;
    const anyFine = media.anyFine.matches;
    const hover = media.hover.matches;

    let mode = 'mouse';
    if (touchCapable && (primaryCoarse || !hover)) mode = 'touch';
    else if (touchCapable && (primaryFine || anyFine || hover)) mode = 'hybrid';

    return { mode, touchCapable, touchPoints, primaryCoarse, primaryFine, hover };
  }

  function deviceProfile(view, input) {
    const shortSide = Math.min(view.width, view.height);
    const longSide = Math.max(view.width, view.height);

    if (!input.touchCapable) return 'desktop';
    if (shortSide <= 600 || (shortSide <= 700 && longSide <= 1000)) return 'phone';
    if (shortSide <= 1100 && longSide <= 1800) return 'tablet';
    return 'desktop';
  }

  function sizeBucket(width) {
    if (width < 360) return 'xxs';
    if (width < 480) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1440) return 'lg';
    return 'xl';
  }

  function keyboardOpen(view, input) {
    if (!input.touchCapable || !window.visualViewport) return false;
    const difference = view.layoutHeight - view.height;
    return difference > 140 && difference > view.layoutHeight * 0.18;
  }

  function uiScale(device, view) {
    const shortSide = Math.min(view.width, view.height);
    if (device === 'phone') {
      if (shortSide <= 360) return 0.82;
      if (shortSide <= 430) return 0.9;
      return 0.96;
    }
    if (device === 'tablet') return shortSide <= 700 ? 0.94 : 1;
    return 1;
  }

  function exclusive(classes, active) {
    classes.forEach(name => root.classList.toggle(name, name === active));
  }

  function applyState() {
    frameRequest = 0;
    const view = viewport();
    const input = inputProfile();
    const device = deviceProfile(view, input);
    const orientation = view.width >= view.height ? 'landscape' : 'portrait';
    const size = sizeBucket(view.width);
    const keyboard = keyboardOpen(view, input);

    const state = {
      device,
      orientation,
      size,
      input: input.mode,
      width: view.width,
      height: view.height,
      layoutWidth: view.layoutWidth,
      layoutHeight: view.layoutHeight,
      shortSide: Math.min(view.width, view.height),
      longSide: Math.max(view.width, view.height),
      touchCapable: input.touchCapable,
      touchPoints: input.touchPoints,
      keyboardOpen: keyboard,
      reducedMotion: media.reducedMotion.matches,
      devicePixelRatio: window.devicePixelRatio || 1,
      uiScale: uiScale(device, view)
    };

    exclusive(['device-phone', 'device-tablet', 'device-desktop'], `device-${device}`);
    exclusive(['orientation-portrait', 'orientation-landscape'], `orientation-${orientation}`);
    exclusive(['input-touch', 'input-hybrid', 'input-mouse'], `input-${input.mode}`);
    exclusive(['viewport-xxs', 'viewport-xs', 'viewport-sm', 'viewport-md', 'viewport-lg', 'viewport-xl'], `viewport-${size}`);

    root.classList.toggle('touch-capable', input.touchCapable);
    root.classList.toggle('screen-short', view.height <= 520);
    root.classList.toggle('screen-very-short', view.height <= 400);
    root.classList.toggle('screen-compact', view.width <= 760);
    root.classList.toggle('keyboard-open', keyboard);
    root.classList.toggle('reduced-motion', media.reducedMotion.matches);

    root.dataset.device = device;
    root.dataset.orientation = orientation;
    root.dataset.input = input.mode;
    root.dataset.viewport = size;

    root.style.setProperty('--ce-vw', `${view.width}px`);
    root.style.setProperty('--ce-vh', `${view.height}px`);
    root.style.setProperty('--ce-layout-width', `${view.layoutWidth}px`);
    root.style.setProperty('--ce-layout-height', `${view.layoutHeight}px`);
    root.style.setProperty('--ce-viewport-offset-top', `${view.offsetTop}px`);
    root.style.setProperty('--ce-viewport-offset-left', `${view.offsetLeft}px`);
    root.style.setProperty('--ce-ui-scale', String(state.uiScale));
    root.style.setProperty('--ce-dpr', String(state.devicePixelRatio));

    const changed = !currentState || Object.keys(state).some(key => currentState[key] !== state[key]);
    currentState = state;
    window.CRITTER_DEVICE = Object.freeze({ ...state });

    if (changed) {
      dispatchEvent(new CustomEvent('critter:viewportchange', { detail: { ...state } }));
    }
  }

  function requestUpdate() {
    if (frameRequest) return;
    frameRequest = requestAnimationFrame(applyState);
  }

  function observeGameUI() {
    const gameScreen = document.getElementById('gameScreen');
    const touchControls = document.getElementById('touchControls');

    const sync = () => {
      root.classList.toggle('gameplay-active', !!gameScreen?.classList.contains('active'));
      root.classList.toggle('touch-ui-active', !!touchControls && !touchControls.hidden);
    };

    sync();
    const observer = new MutationObserver(sync);
    if (gameScreen) observer.observe(gameScreen, { attributes: true, attributeFilter: ['class', 'hidden'] });
    if (touchControls) observer.observe(touchControls, { attributes: true, attributeFilter: ['hidden', 'class'] });
  }

  window.CritterViewport = Object.freeze({
    refresh: requestUpdate,
    getState: () => currentState ? { ...currentState } : null,
    isPhone: () => currentState?.device === 'phone',
    isTablet: () => currentState?.device === 'tablet',
    isDesktop: () => currentState?.device === 'desktop',
    isTouch: () => !!currentState?.touchCapable,
    isPortrait: () => currentState?.orientation === 'portrait',
    isLandscape: () => currentState?.orientation === 'landscape'
  });

  applyState();

  addEventListener('resize', requestUpdate, { passive: true });
  addEventListener('orientationchange', requestUpdate, { passive: true });
  addEventListener('pageshow', requestUpdate, { passive: true });
  addEventListener('fullscreenchange', requestUpdate, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', requestUpdate, { passive: true });
    window.visualViewport.addEventListener('scroll', requestUpdate, { passive: true });
  }

  Object.values(media).forEach(query => query.addEventListener?.('change', requestUpdate));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeGameUI, { once: true });
  } else {
    observeGameUI();
  }
})();

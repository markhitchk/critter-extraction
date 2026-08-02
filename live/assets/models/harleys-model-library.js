/* Generated compatibility loader. Canonical source: core/rendering/model-library.js */
(() => {
  const current = document.currentScript && document.currentScript.src;
  const script = document.createElement('script');
  script.src = new URL('../../core/rendering/model-library.js', current || location.href).href;
  script.dataset.compatibilityLoader = 'true';
  document.head.appendChild(script);
})();

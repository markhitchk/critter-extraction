/* Keep visible live-build copy aligned with issue #62's all-39 roster. */
(() => {
  'use strict';
  if (window.__ISSUE_62_LIVE_COPY__) return;
  window.__ISSUE_62_LIVE_COPY__ = true;

  function update() {
    const hero = document.querySelector('#menuScreen .hero-copy > p');
    if (hero) hero.textContent = 'Play as one of 39 Harley’s Studios critters with distinct procedural low-poly models, species details, first-person limbs, tactical colors, accessories, five blasters, and custom loadouts. Every drop rolls a new region, layout, landmark, extraction point, contracts, enemy patrol, and loot arrangement. Every species uses the same fair combat hitboxes.';

    const boot = document.getElementById('bootStatus');
    if (boot && /critters/i.test(boot.textContent || '')) boot.textContent = 'Loading 39 modeled critters, regional maps, weapons, multiplayer, and HUD…';

    document.querySelectorAll('#helpModal p').forEach(paragraph => {
      const text = paragraph.textContent || '';
      if (text.includes('First-person shows species-colored paws')) paragraph.textContent = 'First-person shows each species’ matching paws, wings, flippers, webbed feet, claws, or hooves with the equipped weapon. Third-person shows the complete procedural model and species silhouette.';
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',update,{ once:true }) : update();
  window.addEventListener('critter:model-runtime-ready',update);
})();

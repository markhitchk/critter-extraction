(() => {
  'use strict';
  function mount() {
    if (document.getElementById('critter-github-feedback')) return;
    const api = window.CritterIssueAPI;
    if (!api) return;
    const panel = document.createElement('details');
    panel.id = 'critter-github-feedback';
    panel.innerHTML = '<summary>Feedback</summary><div class="critter-feedback-menu"><a href="' + api.createUrl + '" target="_blank" rel="noopener noreferrer">Report an issue</a><a href="' + api.viewerUrl + '" target="_blank" rel="noopener noreferrer">View issues</a></div>';
    const style = document.createElement('style');
    style.textContent = '#critter-github-feedback{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;font:700 13px/1.2 system-ui,sans-serif;color:#f7fbff}#critter-github-feedback summary{list-style:none;cursor:pointer;padding:10px 14px;border:1px solid rgba(100,232,234,.7);border-radius:999px;background:#11152a;box-shadow:0 8px 28px rgba(0,0,0,.38)}#critter-github-feedback summary::-webkit-details-marker{display:none}#critter-github-feedback[open] summary{border-radius:12px 12px 0 0}.critter-feedback-menu{display:grid;gap:6px;min-width:170px;padding:8px;border:1px solid rgba(100,232,234,.7);border-top:0;border-radius:0 0 12px 12px;background:#11152a;box-shadow:0 12px 32px rgba(0,0,0,.45)}.critter-feedback-menu a{display:block;padding:9px 10px;border-radius:8px;color:#dffeff;text-decoration:none;background:rgba(100,232,234,.09)}.critter-feedback-menu a:hover,.critter-feedback-menu a:focus-visible{background:rgba(100,232,234,.2);outline:2px solid #64e8ea;outline-offset:1px}@media(max-height:520px){#critter-github-feedback{bottom:6px;right:6px}.critter-feedback-menu{max-height:160px;overflow:auto}}';
    document.head.appendChild(style);
    document.body.appendChild(panel);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();

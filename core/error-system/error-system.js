(() => {
  'use strict';
  const params = window.CritterErrorRouter ? CritterErrorRouter.safeParams() : new URLSearchParams(location.search);
  const code = params.get('code') || 'CE-UNKNOWN-001';
  const catalog = window.CritterErrorCatalog || {};
  const meta = catalog[code] || { title:'Critter Extraction error', severity:'error', system:'unknown' };
  const report = window.CritterErrors.capture({ code, severity:meta.severity, system:meta.system, stage:params.get('stage')||'error-center', message:meta.title, sourceRaw:params.get('source')||'', line:params.get('line')||0, column:params.get('column')||0 });
  window.__CRITTER_LAST_ERROR__=report;
  addEventListener('DOMContentLoaded',()=>CritterErrorUI.mount(meta.title, params.get('missingPath') ? 'The requested page was not found: '+params.get('missingPath') : 'Use the report below when requesting support.', CritterErrors.stringify(report)));
})();

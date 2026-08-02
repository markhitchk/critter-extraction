(() => {
  'use strict';
  const params = window.CritterErrorRouter ? CritterErrorRouter.safeParams() : new URLSearchParams(location.search);
  const code = params.get('code') || 'CE-UNKNOWN-001';
  const catalog = window.CritterErrorCatalog || {};
  const meta = catalog[code] || { title:'Critter Extraction error', severity:'error', system:'unknown' };
  const report = window.CritterErrors.capture({
    code,
    severity: meta.severity,
    system: meta.system,
    stage: params.get('stage') || 'error-center',
    message: meta.title,
    sourceRaw: params.get('source') || '',
    line: params.get('line') || 0,
    column: params.get('column') || 0
  });
  window.__CRITTER_LAST_ERROR__ = report;
  addEventListener('DOMContentLoaded', () => {
    let detail = 'Use the report below when requesting support.';
    if (params.get('missingPath')) {
      detail = 'The requested page was not found: ' + params.get('missingPath');
      if (params.get('missingQuery')) detail += ' · Query keys: ' + params.get('missingQuery');
      if (params.get('missingHash')) detail += ' · Hash: ' + params.get('missingHash');
      detail += ' Original query and hash values were captured only in this browser session and are not included in the support report.';
    }
    CritterErrorUI.mount(meta.title, detail, CritterErrors.stringify(report));
  });
})();

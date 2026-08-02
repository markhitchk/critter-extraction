(() => {
  'use strict';
  const createUrl = 'https://github.com/markhitchk/critter-extraction/issues/new';
  const viewerUrl = 'https://github.com/markhitchk/critter-extraction/issues';
  function open(url) {
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (popup) popup.opener = null;
    return popup;
  }
  window.CritterIssueAPI = Object.freeze({
    createUrl,
    viewerUrl,
    createIssue: () => open(createUrl),
    viewIssues: () => open(viewerUrl)
  });
})();

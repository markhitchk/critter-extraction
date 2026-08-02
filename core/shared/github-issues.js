(() => {
  'use strict';

  const OWNER = 'markhitchk';
  const REPO = 'critter-extraction';
  const repositoryUrl = `https://github.com/${OWNER}/${REPO}`;
  const createUrl = `${repositoryUrl}/issues/new`;
  const viewerUrl = `${repositoryUrl}/issues`;
  const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const draftKey = 'critter-feedback-draft-v1';

  const cleanText = (value, max = 8000) => String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

  const browserLabel = () => {
    const ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'Microsoft Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Chrome\//.test(ua)) return 'Chrome or Chromium';
    if (/Safari\//.test(ua)) return 'Safari';
    return 'Unknown modern browser';
  };

  const environment = () => ({
    version: window.CritterVersion && window.CritterVersion.displayVersion || 'v0.22.0',
    browser: browserLabel(),
    viewport: `${Math.max(0, window.innerWidth || 0)}×${Math.max(0, window.innerHeight || 0)}`,
    screen: `${Math.max(0, window.screen && screen.width || 0)}×${Math.max(0, window.screen && screen.height || 0)}`,
    online: navigator.onLine !== false,
    page: `${location.origin}${location.pathname}`
  });

  const normalizeIssue = issue => ({
    number: Number(issue.number || 0),
    title: cleanText(issue.title, 300),
    body: cleanText(issue.body, 12000),
    state: issue.state === 'closed' ? 'closed' : 'open',
    stateReason: cleanText(issue.state_reason, 80),
    url: cleanText(issue.html_url, 1000),
    comments: Number(issue.comments || 0),
    createdAt: issue.created_at || '',
    updatedAt: issue.updated_at || '',
    closedAt: issue.closed_at || '',
    author: cleanText(issue.user && issue.user.login, 100),
    labels: Array.isArray(issue.labels) ? issue.labels.map(label => ({
      name: cleanText(typeof label === 'string' ? label : label.name, 80),
      color: cleanText(typeof label === 'object' && label.color || '64e8ea', 6)
    })) : []
  });

  async function request(path, { signal } = {}) {
    const controller = signal ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), 12000) : 0;
    try {
      const response = await fetch(`${apiBase}${path}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: signal || controller.signal,
        cache: 'no-store'
      });
      if (!response.ok) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const error = new Error(response.status === 403 && remaining === '0'
          ? 'GitHub’s public API limit was reached. Try refreshing later.'
          : `GitHub returned ${response.status}.`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  async function listIssues({ state = 'open', page = 1, perPage = 30, signal } = {}) {
    const safeState = ['open', 'closed', 'all'].includes(state) ? state : 'open';
    const safePage = Math.max(1, Math.min(10, Number(page) || 1));
    const safeCount = Math.max(1, Math.min(50, Number(perPage) || 30));
    const items = await request(`/issues?state=${safeState}&sort=updated&direction=desc&per_page=${safeCount}&page=${safePage}`, { signal });
    return items.filter(item => !item.pull_request).map(normalizeIssue);
  }

  async function getIssue(number, { signal } = {}) {
    const value = Math.max(1, Number(number) || 0);
    return normalizeIssue(await request(`/issues/${value}`, { signal }));
  }

  async function getComments(number, { signal } = {}) {
    const value = Math.max(1, Number(number) || 0);
    const comments = await request(`/issues/${value}/comments?per_page=50`, { signal });
    return comments.map(comment => ({
      id: Number(comment.id || 0),
      author: cleanText(comment.user && comment.user.login, 100),
      body: cleanText(comment.body, 12000),
      createdAt: comment.created_at || '',
      updatedAt: comment.updated_at || ''
    }));
  }

  function buildReport(input = {}) {
    const env = environment();
    return {
      type: ['bug', 'feature', 'question'].includes(input.type) ? input.type : 'bug',
      title: cleanText(input.title, 180),
      category: cleanText(input.category, 100) || 'Other',
      details: cleanText(input.details, 6000),
      steps: cleanText(input.steps, 4000),
      expected: cleanText(input.expected, 3000),
      diagnostics: input.diagnostics === false ? null : env,
      createdAt: new Date().toISOString()
    };
  }

  function reportTitle(report) {
    const prefix = report.type === 'feature' ? '[Feature]' : report.type === 'question' ? '[Question]' : '[Bug]';
    return `${prefix}: ${report.title || 'Critter Extraction feedback'}`.slice(0, 240);
  }

  function reportBody(report) {
    const lines = [
      '## Feedback from Critter Extraction',
      '',
      `**Type:** ${report.type}`,
      `**Category:** ${report.category}`,
      '',
      '## What happened or should change?',
      report.details || '_No details supplied._'
    ];
    if (report.steps) lines.push('', '## Steps to reproduce', report.steps);
    if (report.expected) lines.push('', '## Expected result', report.expected);
    if (report.diagnostics) {
      lines.push('', '## Privacy-safe environment',
        `- Version: ${report.diagnostics.version}`,
        `- Browser: ${report.diagnostics.browser}`,
        `- Viewport: ${report.diagnostics.viewport}`,
        `- Screen: ${report.diagnostics.screen}`,
        `- Online: ${report.diagnostics.online ? 'yes' : 'no'}`,
        `- Page: ${report.diagnostics.page}`);
    }
    lines.push('', '> Generated inside the Critter Extraction Feedback Center. Account XML, room payloads, IP addresses, inventory contents, tokens, and browser-storage values are intentionally excluded.');
    return lines.join('\n').slice(0, 64000);
  }

  function createDraftUrl(input) {
    const report = buildReport(input);
    const url = new URL(createUrl);
    url.searchParams.set('title', reportTitle(report));
    url.searchParams.set('body', reportBody(report));
    url.searchParams.set('labels', report.type === 'feature' ? 'enhancement' : report.type === 'bug' ? 'bug' : 'question');
    return url.toString();
  }

  function openDraft(input) {
    const url = createDraftUrl(input);
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (popup) popup.opener = null;
    return { popup, url };
  }

  function loadDraft() {
    try {
      const value = JSON.parse(localStorage.getItem(draftKey) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function saveDraft(value) {
    try {
      localStorage.setItem(draftKey, JSON.stringify(value || {}));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearDraft() {
    try { localStorage.removeItem(draftKey); } catch (_) {}
  }

  async function submit(input) {
    const report = buildReport(input);
    const endpoint = cleanText(window.CRITTER_FEEDBACK_ENDPOINT, 1000);
    if (endpoint) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      if (!response.ok) throw new Error(`Feedback service returned ${response.status}.`);
      return { mode: 'api', result: await response.json() };
    }
    return { mode: 'github-handoff', report, url: createDraftUrl(report) };
  }

  window.CritterIssueAPI = Object.freeze({
    owner: OWNER,
    repository: REPO,
    repositoryUrl,
    createUrl,
    viewerUrl,
    apiBase,
    environment,
    listIssues,
    getIssue,
    getComments,
    buildReport,
    reportTitle,
    reportBody,
    createDraftUrl,
    openDraft,
    loadDraft,
    saveDraft,
    clearDraft,
    submit
  });
})();

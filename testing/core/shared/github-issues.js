(() => {
  'use strict';

  const OWNER = 'markhitchk';
  const REPO = 'critter-extraction';
  const repositoryUrl = `https://github.com/${OWNER}/${REPO}`;
  const createUrl = `${repositoryUrl}/issues/new`;
  const viewerUrl = `${repositoryUrl}/issues`;
  const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const draftKey = 'critter-feedback-draft-v1';
  let githubAccessToken = '';

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

  function activeAccountIdentity() {
    const profileDialog = document.getElementById('profileModal');
    const editingUsername = cleanText(document.getElementById('usernameInput') && document.getElementById('usernameInput').value, 18);
    const editingDisplayName = cleanText(document.getElementById('displayNameInput') && document.getElementById('displayNameInput').value, 24);
    const handleText = cleanText(document.getElementById('profileHandle') && document.getElementById('profileHandle').textContent, 24);
    const profileName = cleanText(document.getElementById('profileName') && document.getElementById('profileName').textContent, 24);
    const topName = cleanText(document.getElementById('topName') && document.getElementById('topName').textContent, 24);
    const requiredSetupOpen = !!(profileDialog && profileDialog.open && profileDialog.classList.contains('required-account-setup'));
    const usernameSource = requiredSetupOpen && editingUsername ? editingUsername : handleText.replace(/^@+/, '') || editingUsername;
    const username = cleanText(usernameSource, 18).replace(/[^A-Za-z0-9_-]/g, '');
    const displayName = cleanText(requiredSetupOpen && editingDisplayName ? editingDisplayName : profileName || topName || editingDisplayName, 24);
    if (!username && !displayName) return null;
    return { username, displayName };
  }

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

  async function githubRequest(path, options = {}) {
    if (!githubAccessToken) throw new Error('Connect GitHub in the review screen before direct sending.');
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${githubAccessToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      cache: 'no-store'
    });
    if (!response.ok) {
      let message = '';
      try {
        const payload = await response.json();
        message = cleanText(payload && payload.message, 300);
      } catch (_) {}
      const friendly = response.status === 401
        ? 'The GitHub access token was not accepted.'
        : response.status === 403
          ? 'This GitHub account or token cannot create issues in this repository.'
          : response.status === 410
            ? 'GitHub Issues are disabled for this repository.'
            : response.status === 422
              ? 'GitHub rejected the issue details. Check the title and try again.'
              : `GitHub returned ${response.status}.`;
      const error = new Error(message && message !== 'Bad credentials' ? `${friendly} ${message}` : friendly);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
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
    const suppliedAccount = input.account && typeof input.account === 'object' ? input.account : activeAccountIdentity();
    const account = suppliedAccount ? {
      username: cleanText(suppliedAccount.username, 18).replace(/[^A-Za-z0-9_-]/g, ''),
      displayName: cleanText(suppliedAccount.displayName, 24)
    } : null;
    return {
      type: ['bug', 'feature', 'question'].includes(input.type) ? input.type : 'bug',
      title: cleanText(input.title, 180),
      category: cleanText(input.category, 100) || 'Other',
      details: cleanText(input.details, 6000),
      steps: cleanText(input.steps, 4000),
      expected: cleanText(input.expected, 3000),
      account: account && (account.username || account.displayName) ? account : null,
      diagnostics: input.diagnostics === false ? null : env,
      createdAt: input.createdAt || new Date().toISOString()
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
      `**Category:** ${report.category}`
    ];
    if (report.account) {
      lines.push('', '## Critter account');
      if (report.account.username) lines.push(`- Username: @${report.account.username}`);
      if (report.account.displayName) lines.push(`- Display name: ${report.account.displayName}`);
    }
    lines.push('', '## What happened or should change?', report.details || '_No details supplied._');
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
    lines.push('', '> Generated inside the Critter Extraction Feedback Center. Only the active Critter username and display name are included; account XML, room payloads, IP addresses, inventory contents, access tokens, and other browser-storage values are intentionally excluded.');
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

  function setGitHubToken(value) {
    githubAccessToken = cleanText(value, 500);
    return !!githubAccessToken;
  }

  function clearGitHubToken() {
    githubAccessToken = '';
  }

  function hasGitHubToken() {
    return !!githubAccessToken;
  }

  async function validateGitHubToken() {
    const user = await githubRequest('/user');
    return {
      login: cleanText(user && user.login, 100),
      name: cleanText(user && user.name, 160)
    };
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
    if (githubAccessToken) {
      const issue = await githubRequest(`/repos/${OWNER}/${REPO}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title: reportTitle(report),
          body: reportBody(report)
        })
      });
      return {
        mode: 'api',
        provider: 'github',
        result: issue,
        issueNumber: Number(issue && issue.number || 0),
        url: cleanText(issue && issue.html_url, 1000)
      };
    }
    return { mode: 'github-handoff', report, url: createDraftUrl(report) };
  }

  function installDirectSubmitControls() {
    let attempts = 0;
    const install = () => {
      if (document.getElementById('cfc-github-auth')) return;
      const review = document.getElementById('cfc-report-review');
      if (!review) {
        attempts += 1;
        if (attempts < 120) setTimeout(install, 100);
        return;
      }
      const note = review.querySelector('.cfc-note');
      if (note) note.textContent = 'Direct sending uses a secure owner endpoint when configured. Otherwise, connect GitHub below for this tab only. Without either connection, Publish Report opens GitHub’s final confirmation as a fallback.';

      const panel = document.createElement('section');
      panel.id = 'cfc-github-auth';
      panel.innerHTML = `
        <div class="cfc-auth-heading">
          <div><span class="cfc-eyebrow">DIRECT ISSUE SENDING</span><strong>GitHub connection</strong></div>
          <span id="cfc-github-auth-state">Not connected</span>
        </div>
        <p>A GitHub access token can create the issue without leaving the game. It is kept only in memory for this open tab, is never added to the report, and is sent only to api.github.com.</p>
        <div class="cfc-auth-controls">
          <input id="cfc-github-token" type="password" autocomplete="off" spellcheck="false" aria-label="GitHub access token" placeholder="Paste GitHub access token">
          <button type="button" class="cfc-button cfc-button-muted" id="cfc-github-connect">Connect</button>
          <button type="button" class="cfc-button cfc-button-muted" id="cfc-github-disconnect" hidden>Disconnect</button>
        </div>
        <small id="cfc-github-auth-help">Use an OAuth, GitHub App, or compatible token that can create issues in this public repository.</small>
        <div class="cfc-status" id="cfc-github-auth-status" role="status" aria-live="polite"></div>`;
      const preview = review.querySelector('#cfc-report-preview');
      if (preview) preview.insertAdjacentElement('afterend', panel);
      else review.prepend(panel);

      const style = document.createElement('style');
      style.id = 'cfc-github-auth-styles';
      style.textContent = '#cfc-github-auth{margin-top:14px;padding:14px;border:1px solid rgba(100,232,234,.28);border-radius:14px;background:rgba(100,232,234,.055)}.cfc-auth-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.cfc-auth-heading strong{display:block;font-size:15px}.cfc-auth-heading>span{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.07);color:#aeb7d4;font-size:10px;font-weight:800}.cfc-auth-heading>span.is-connected{background:rgba(126,247,212,.13);color:#9ff9df}#cfc-github-auth p{margin:9px 0;color:#c1c8df;font-size:12px}.cfc-auth-controls{display:grid;grid-template-columns:minmax(180px,1fr) auto auto;gap:8px;align-items:center}#cfc-github-auth small{display:block;margin-top:8px;color:#929dbd}@media(max-width:640px){.cfc-auth-controls{grid-template-columns:1fr 1fr}.cfc-auth-controls input{grid-column:1/-1}}';
      document.head.appendChild(style);

      const endpoint = cleanText(window.CRITTER_FEEDBACK_ENDPOINT, 1000);
      const state = panel.querySelector('#cfc-github-auth-state');
      const status = panel.querySelector('#cfc-github-auth-status');
      const tokenInput = panel.querySelector('#cfc-github-token');
      const connect = panel.querySelector('#cfc-github-connect');
      const disconnect = panel.querySelector('#cfc-github-disconnect');
      const help = panel.querySelector('#cfc-github-auth-help');
      const setConnected = (connected, text) => {
        state.textContent = text || (connected ? 'Connected' : 'Not connected');
        state.classList.toggle('is-connected', connected);
        disconnect.hidden = !connected;
      };

      if (endpoint) {
        tokenInput.hidden = true;
        connect.hidden = true;
        help.textContent = 'A secure direct-feedback service is configured for this build.';
        setConnected(true, 'Direct service ready');
        status.textContent = 'Publish Report will send from inside the game.';
      }

      connect.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        if (!token) {
          status.textContent = 'Paste a GitHub access token first.';
          status.classList.add('is-error');
          return;
        }
        connect.disabled = true;
        status.classList.remove('is-error');
        status.textContent = 'Checking GitHub access…';
        setGitHubToken(token);
        tokenInput.value = '';
        try {
          const user = await validateGitHubToken();
          setConnected(true, user.login ? `@${user.login}` : 'Connected');
          status.textContent = 'Connected. Publish Report will create the issue without leaving Critter Extraction.';
        } catch (error) {
          clearGitHubToken();
          setConnected(false);
          status.textContent = error.message || 'GitHub connection failed.';
          status.classList.add('is-error');
        } finally {
          connect.disabled = false;
        }
      });

      disconnect.addEventListener('click', () => {
        clearGitHubToken();
        setConnected(false);
        status.classList.remove('is-error');
        status.textContent = 'GitHub disconnected. The token was removed from memory.';
      });
    };
    setTimeout(install, 0);
  }

  window.CritterIssueAPI = Object.freeze({
    owner: OWNER,
    repository: REPO,
    repositoryUrl,
    createUrl,
    viewerUrl,
    apiBase,
    environment,
    activeAccountIdentity,
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
    setGitHubToken,
    clearGitHubToken,
    hasGitHubToken,
    validateGitHubToken,
    submit
  });

  installDirectSubmitControls();
})();

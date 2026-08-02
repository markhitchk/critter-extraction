(() => {
  'use strict';

  const q = (root, selector) => root.querySelector(selector);
  const qa = (root, selector) => Array.from(root.querySelectorAll(selector));
  const formatDate = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };
  const copyText = async text => {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  };
  const downloadText = (name, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  function mount() {
    if (document.getElementById('critter-feedback-center')) return;
    const api = window.CritterIssueAPI;
    if (!api) return;

    const launcher = document.createElement('button');
    launcher.id = 'critter-feedback-launcher';
    launcher.type = 'button';
    launcher.innerHTML = '<span aria-hidden="true">✦</span><span>Feedback</span>';
    launcher.setAttribute('aria-haspopup', 'dialog');

    const dialog = document.createElement('dialog');
    dialog.id = 'critter-feedback-center';
    dialog.setAttribute('aria-labelledby', 'critter-feedback-title');
    dialog.innerHTML = `
      <div class="cfc-shell">
        <header class="cfc-header">
          <div>
            <span class="cfc-eyebrow">HARLEY’S STUDIOS SUPPORT</span>
            <h2 id="critter-feedback-title">Feedback Center</h2>
            <p>Send a report or read known issues without leaving Critter Extraction.</p>
          </div>
          <button class="cfc-icon-button" type="button" data-cfc-close aria-label="Close Feedback Center">×</button>
        </header>

        <nav class="cfc-tabs" aria-label="Feedback Center sections">
          <button type="button" class="is-active" data-cfc-tab="report" aria-selected="true">Send Feedback</button>
          <button type="button" data-cfc-tab="issues" aria-selected="false">Issues & Updates</button>
        </nav>

        <section class="cfc-page is-active" data-cfc-page="report">
          <form id="cfc-report-form" novalidate>
            <div class="cfc-form-grid">
              <label><span>Feedback type</span><select name="type"><option value="bug">Bug report</option><option value="feature">Feature idea</option><option value="question">Question</option></select></label>
              <label><span>Affected area</span><select name="category"><option>Startup or loading</option><option>Accounts and profiles</option><option>Inventory, stash, or loadout</option><option>Solo gameplay</option><option>Multiplayer or room links</option><option>Enemy AI</option><option>Maps, quests, or objectives</option><option>Graphics or rendering</option><option>Touch or mobile controls</option><option>Invite or reset page</option><option>Portable build</option><option selected>Other</option></select></label>
            </div>
            <label><span>Short title</span><input name="title" maxlength="180" required placeholder="Example: Join link does not fill the room code"></label>
            <label><span>What happened or should change?</span><textarea name="details" rows="5" maxlength="6000" required placeholder="Describe the exact screen, action, and result."></textarea></label>
            <div class="cfc-form-grid">
              <label><span>Steps to reproduce</span><textarea name="steps" rows="4" maxlength="4000" placeholder="1. Open…&#10;2. Select…&#10;3. Observe…"></textarea></label>
              <label><span>Expected result</span><textarea name="expected" rows="4" maxlength="3000" placeholder="Explain what should have happened."></textarea></label>
            </div>
            <label class="cfc-check"><input type="checkbox" name="diagnostics" checked><span>Include privacy-safe version, browser, viewport, and page-path details.</span></label>
            <label class="cfc-check cfc-privacy"><input type="checkbox" name="privacy" required><span>I did not include account XML, room payloads, IP addresses, tokens, private images, or inventory contents.</span></label>
            <div class="cfc-status" id="cfc-report-status" role="status" aria-live="polite"></div>
            <footer class="cfc-actions">
              <button type="button" class="cfc-button cfc-button-muted" data-cfc-save>Save Draft</button>
              <button type="button" class="cfc-button cfc-button-muted" data-cfc-clear>Clear</button>
              <button type="submit" class="cfc-button cfc-button-primary">Review Report</button>
            </footer>
          </form>

          <section id="cfc-report-review" hidden>
            <div class="cfc-review-heading"><div><span class="cfc-eyebrow">REVIEW BEFORE PUBLISHING</span><h3 id="cfc-review-title"></h3></div><button type="button" class="cfc-button cfc-button-muted" data-cfc-edit>Edit</button></div>
            <pre id="cfc-report-preview"></pre>
            <p class="cfc-note">Critter Extraction is a static GitHub Pages game, so it cannot safely store a GitHub write token. The report stays inside this UI until the final GitHub confirmation page opens with every field already filled in.</p>
            <div class="cfc-status" id="cfc-review-status" role="status" aria-live="polite"></div>
            <footer class="cfc-actions">
              <button type="button" class="cfc-button cfc-button-muted" data-cfc-copy>Copy Report</button>
              <button type="button" class="cfc-button cfc-button-muted" data-cfc-download>Download Report</button>
              <button type="button" class="cfc-button cfc-button-primary" data-cfc-publish>Publish Report</button>
            </footer>
          </section>
        </section>

        <section class="cfc-page" data-cfc-page="issues" hidden>
          <div class="cfc-issue-toolbar">
            <label><span>Search issues</span><input id="cfc-issue-search" type="search" placeholder="Search title, number, label, or text"></label>
            <label><span>Status</span><select id="cfc-issue-state"><option value="open">Open</option><option value="closed">Closed</option><option value="all">All</option></select></label>
            <button type="button" class="cfc-button cfc-button-muted" data-cfc-refresh>Refresh</button>
          </div>
          <div class="cfc-status" id="cfc-issue-status" role="status" aria-live="polite"></div>
          <div class="cfc-issue-layout">
            <div id="cfc-issue-list" class="cfc-issue-list" aria-label="Repository issues"></div>
            <article id="cfc-issue-detail" class="cfc-issue-detail">
              <div class="cfc-empty"><strong>Select an issue</strong><span>Its description and public discussion will appear here inside the game.</span></div>
            </article>
          </div>
          <p class="cfc-note">Issue data is loaded read-only from GitHub’s public API. Pull requests are excluded from this list.</p>
        </section>
      </div>`;

    const style = document.createElement('style');
    style.id = 'critter-feedback-styles';
    style.textContent = `
      #critter-feedback-launcher{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:2147482000;display:flex;align-items:center;gap:8px;padding:11px 15px;border:1px solid rgba(100,232,234,.75);border-radius:999px;background:linear-gradient(145deg,#1d2140,#11152a);box-shadow:0 12px 36px rgba(0,0,0,.42);color:#f4feff;font:800 13px/1 system-ui,sans-serif;cursor:pointer}#critter-feedback-launcher:hover,#critter-feedback-launcher:focus-visible{transform:translateY(-2px);outline:2px solid #64e8ea;outline-offset:2px}#critter-feedback-launcher span:first-child{color:#7ef7d4}
      #critter-feedback-center{width:min(1100px,calc(100vw - 24px));max-width:none;height:min(780px,calc(100dvh - 24px));max-height:none;margin:auto;padding:0;border:1px solid rgba(100,232,234,.48);border-radius:24px;background:#11152a;color:#f7fbff;box-shadow:0 30px 100px rgba(0,0,0,.75);font:14px/1.45 system-ui,sans-serif;overflow:hidden}#critter-feedback-center::backdrop{background:rgba(3,5,14,.78);backdrop-filter:blur(8px)}#critter-feedback-center[open]{display:block}
      .cfc-shell{display:grid;grid-template-rows:auto auto 1fr;height:100%;background:radial-gradient(circle at top right,rgba(100,232,234,.12),transparent 32%),linear-gradient(160deg,#191d38,#0d1022)}.cfc-header{display:flex;justify-content:space-between;gap:20px;padding:22px 24px 16px;border-bottom:1px solid rgba(255,255,255,.08)}.cfc-header h2{margin:0;font:800 clamp(25px,4vw,38px)/1.05 system-ui,sans-serif}.cfc-header p{margin:7px 0 0;color:#aeb7d4}.cfc-eyebrow{display:block;margin-bottom:5px;color:#7ef7d4;font-size:10px;font-weight:900;letter-spacing:.16em}.cfc-icon-button{align-self:flex-start;width:40px;height:40px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;font-size:25px;cursor:pointer}.cfc-icon-button:hover,.cfc-icon-button:focus-visible{background:rgba(255,255,255,.13);outline:2px solid #64e8ea}
      .cfc-tabs{display:flex;gap:8px;padding:12px 24px;border-bottom:1px solid rgba(255,255,255,.08)}.cfc-tabs button{padding:10px 14px;border:1px solid transparent;border-radius:12px;background:transparent;color:#aeb7d4;font-weight:800;cursor:pointer}.cfc-tabs button.is-active{border-color:rgba(100,232,234,.4);background:rgba(100,232,234,.12);color:#eaffff}.cfc-page{min-height:0;padding:20px 24px 24px;overflow:auto}.cfc-page:not(.is-active){display:none}
      #cfc-report-form,.cfc-page label{display:grid;gap:7px}.cfc-page label>span{color:#d8ddf1;font-size:12px;font-weight:800}.cfc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.cfc-page input,.cfc-page select,.cfc-page textarea{width:100%;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:11px 12px;background:#0d1125;color:#f7fbff;outline:none;resize:vertical}.cfc-page input:focus,.cfc-page select:focus,.cfc-page textarea:focus{border-color:#64e8ea;box-shadow:0 0 0 3px rgba(100,232,234,.12)}#cfc-report-form>label{margin-bottom:14px}.cfc-check{grid-template-columns:auto 1fr!important;align-items:start!important;gap:10px!important;padding:11px 12px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035)}.cfc-check input{width:18px;height:18px;margin:1px 0 0}.cfc-privacy{border-color:rgba(255,211,111,.32);background:rgba(255,211,111,.06)}
      .cfc-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;margin-top:16px}.cfc-button{border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 14px;color:#f7fbff;font-weight:850;cursor:pointer}.cfc-button-muted{background:rgba(255,255,255,.06)}.cfc-button-primary{border-color:transparent;background:linear-gradient(135deg,#7ef7d4,#63dff5);color:#0b1222}.cfc-button:hover,.cfc-button:focus-visible{filter:brightness(1.1);outline:2px solid #64e8ea;outline-offset:2px}.cfc-status{min-height:22px;margin-top:8px;color:#9fece5;font-size:12px}.cfc-status.is-error{color:#ff9daf}.cfc-note{margin:14px 0;color:#aeb7d4;font-size:12px;line-height:1.55}.cfc-review-heading{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.cfc-review-heading h3{margin:0;font-size:22px}#cfc-report-preview{max-height:430px;overflow:auto;margin:16px 0 0;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:#080b18;color:#dffcff;white-space:pre-wrap;word-break:break-word;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}
      .cfc-issue-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 150px auto;align-items:end;gap:10px}.cfc-issue-layout{display:grid;grid-template-columns:minmax(280px,.8fr) minmax(360px,1.2fr);gap:14px;min-height:430px;margin-top:10px}.cfc-issue-list,.cfc-issue-detail{min-height:0;max-height:520px;overflow:auto;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(5,8,20,.5)}.cfc-issue-card{display:grid;gap:7px;width:100%;padding:14px;border:0;border-bottom:1px solid rgba(255,255,255,.08);background:transparent;color:inherit;text-align:left;cursor:pointer}.cfc-issue-card:last-child{border-bottom:0}.cfc-issue-card:hover,.cfc-issue-card:focus-visible,.cfc-issue-card.is-active{background:rgba(100,232,234,.1);outline:none}.cfc-issue-card strong{font-size:14px;line-height:1.35}.cfc-issue-meta{display:flex;gap:7px;flex-wrap:wrap;color:#9da8ca;font-size:10px}.cfc-state{padding:3px 6px;border-radius:999px;background:rgba(126,247,212,.1);color:#9ff9df}.cfc-state.is-closed{background:rgba(142,130,255,.15);color:#c4bcff}.cfc-label-row{display:flex;gap:5px;flex-wrap:wrap}.cfc-label{padding:3px 6px;border:1px solid rgba(100,232,234,.35);border-radius:999px;color:#dffeff;font-size:9px}.cfc-issue-detail{padding:18px}.cfc-issue-detail h3{margin:0 0 8px;font-size:20px;line-height:1.3}.cfc-issue-body,.cfc-comment-body{white-space:pre-wrap;word-break:break-word;color:#d8ddf1}.cfc-issue-body{margin:18px 0;padding:14px;border-radius:12px;background:rgba(255,255,255,.04)}.cfc-comments{display:grid;gap:9px;margin-top:18px}.cfc-comment{padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035)}.cfc-comment header{display:flex;justify-content:space-between;gap:10px;margin-bottom:7px;color:#9da8ca;font-size:10px}.cfc-empty{display:grid;place-items:center;align-content:center;gap:7px;min-height:220px;padding:30px;text-align:center;color:#9da8ca}.cfc-empty strong{color:#f7fbff;font-size:18px}
      @media(max-width:760px){#critter-feedback-center{width:100vw;height:100dvh;border-radius:0;border:0}.cfc-header{padding:17px 16px 13px}.cfc-tabs{padding:9px 16px}.cfc-page{padding:15px 16px 22px}.cfc-form-grid,.cfc-issue-layout{grid-template-columns:1fr}.cfc-issue-toolbar{grid-template-columns:1fr 120px}.cfc-issue-toolbar .cfc-button{grid-column:1/-1}.cfc-issue-list{max-height:260px}.cfc-issue-detail{max-height:none}.cfc-actions .cfc-button{flex:1 1 130px}#critter-feedback-launcher{right:8px;bottom:8px}}
      @media(max-height:520px) and (orientation:landscape){#critter-feedback-center{height:100dvh;width:100vw;border-radius:0}.cfc-header{padding:10px 16px}.cfc-header p{display:none}.cfc-tabs{padding:7px 16px}.cfc-page{padding:10px 16px}.cfc-issue-layout{min-height:280px}.cfc-issue-list,.cfc-issue-detail{max-height:300px}#critter-feedback-launcher span:last-child{display:none}}
    `;

    document.head.appendChild(style);
    document.body.append(launcher, dialog);

    const form = q(dialog, '#cfc-report-form');
    const review = q(dialog, '#cfc-report-review');
    const reportStatus = q(dialog, '#cfc-report-status');
    const reviewStatus = q(dialog, '#cfc-review-status');
    const preview = q(dialog, '#cfc-report-preview');
    const reviewTitle = q(dialog, '#cfc-review-title');
    const issueList = q(dialog, '#cfc-issue-list');
    const issueDetail = q(dialog, '#cfc-issue-detail');
    const issueStatus = q(dialog, '#cfc-issue-status');
    const issueSearch = q(dialog, '#cfc-issue-search');
    const issueState = q(dialog, '#cfc-issue-state');
    let currentReport = null;
    let issues = [];
    let issuesLoaded = false;
    let saveTimer = 0;
    let issueController = null;

    const setStatus = (node, message, error = false) => {
      node.textContent = message || '';
      node.classList.toggle('is-error', error);
    };
    const values = () => ({
      type: form.elements.type.value,
      category: form.elements.category.value,
      title: form.elements.title.value,
      details: form.elements.details.value,
      steps: form.elements.steps.value,
      expected: form.elements.expected.value,
      diagnostics: form.elements.diagnostics.checked
    });
    const restoreDraft = () => {
      const draft = api.loadDraft();
      if (!draft) return;
      ['type', 'category', 'title', 'details', 'steps', 'expected'].forEach(name => {
        if (draft[name] != null && form.elements[name]) form.elements[name].value = draft[name];
      });
      if (typeof draft.diagnostics === 'boolean') form.elements.diagnostics.checked = draft.diagnostics;
      setStatus(reportStatus, 'Saved draft restored from this browser.');
    };
    const saveDraft = (announce = false) => {
      const saved = api.saveDraft(values());
      if (announce) setStatus(reportStatus, saved ? 'Draft saved on this device.' : 'This browser could not save the draft.', !saved);
    };
    const scheduleSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveDraft(false), 450);
    };

    const setTab = name => {
      qa(dialog, '[data-cfc-tab]').forEach(button => {
        const active = button.dataset.cfcTab === name;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
      });
      qa(dialog, '[data-cfc-page]').forEach(page => {
        const active = page.dataset.cfcPage === name;
        page.classList.toggle('is-active', active);
        page.hidden = !active;
      });
      if (name === 'issues' && !issuesLoaded) loadIssues();
    };

    const showReview = report => {
      currentReport = api.buildReport(report);
      reviewTitle.textContent = api.reportTitle(currentReport);
      preview.textContent = api.reportBody(currentReport);
      form.hidden = true;
      review.hidden = false;
      setStatus(reviewStatus, 'Review the report before publishing.');
    };

    const renderIssueList = () => {
      const term = issueSearch.value.trim().toLowerCase();
      const filtered = issues.filter(issue => {
        if (!term) return true;
        const haystack = [issue.number, issue.title, issue.body, issue.author, ...issue.labels.map(label => label.name)].join(' ').toLowerCase();
        return haystack.includes(term);
      });
      issueList.replaceChildren();
      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'cfc-empty';
        empty.innerHTML = '<strong>No matching issues</strong><span>Change the search or status filter.</span>';
        issueList.appendChild(empty);
        return;
      }
      filtered.forEach(issue => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cfc-issue-card';
        button.dataset.issueNumber = String(issue.number);
        const title = document.createElement('strong');
        title.textContent = `#${issue.number} ${issue.title}`;
        const meta = document.createElement('div');
        meta.className = 'cfc-issue-meta';
        const state = document.createElement('span');
        state.className = `cfc-state${issue.state === 'closed' ? ' is-closed' : ''}`;
        state.textContent = issue.state;
        const updated = document.createElement('span');
        updated.textContent = `Updated ${formatDate(issue.updatedAt)}`;
        const comments = document.createElement('span');
        comments.textContent = `${issue.comments} comment${issue.comments === 1 ? '' : 's'}`;
        meta.append(state, updated, comments);
        const labels = document.createElement('div');
        labels.className = 'cfc-label-row';
        issue.labels.slice(0, 6).forEach(item => {
          const tag = document.createElement('span');
          tag.className = 'cfc-label';
          tag.textContent = item.name;
          tag.style.borderColor = `#${item.color}`;
          labels.appendChild(tag);
        });
        button.append(title, meta, labels);
        button.addEventListener('click', () => openIssue(issue.number, button));
        issueList.appendChild(button);
      });
    };

    const loadIssues = async () => {
      if (issueController) issueController.abort();
      issueController = new AbortController();
      setStatus(issueStatus, 'Loading repository issues…');
      issueList.innerHTML = '<div class="cfc-empty"><strong>Loading…</strong><span>Reading the public GitHub issue feed.</span></div>';
      try {
        issues = await api.listIssues({ state: issueState.value, perPage: 50, signal: issueController.signal });
        issuesLoaded = true;
        setStatus(issueStatus, `${issues.length} ${issueState.value} issue${issues.length === 1 ? '' : 's'} loaded inside the game.`);
        renderIssueList();
      } catch (error) {
        if (error.name === 'AbortError') return;
        setStatus(issueStatus, error.message || 'Issues could not be loaded.', true);
        issueList.innerHTML = '<div class="cfc-empty"><strong>Could not load issues</strong><span>Check the connection or try Refresh.</span></div>';
      }
    };

    const openIssue = async (number, button) => {
      qa(issueList, '.cfc-issue-card').forEach(card => card.classList.toggle('is-active', card === button));
      issueDetail.innerHTML = '<div class="cfc-empty"><strong>Loading issue…</strong><span>Reading description and comments.</span></div>';
      try {
        const [issue, comments] = await Promise.all([api.getIssue(number), api.getComments(number)]);
        issueDetail.replaceChildren();
        const title = document.createElement('h3');
        title.textContent = `#${issue.number} ${issue.title}`;
        const meta = document.createElement('div');
        meta.className = 'cfc-issue-meta';
        meta.textContent = `${issue.state.toUpperCase()} • opened by ${issue.author || 'unknown'} • updated ${formatDate(issue.updatedAt)}`;
        const labels = document.createElement('div');
        labels.className = 'cfc-label-row';
        issue.labels.forEach(item => {
          const tag = document.createElement('span');
          tag.className = 'cfc-label';
          tag.textContent = item.name;
          tag.style.borderColor = `#${item.color}`;
          labels.appendChild(tag);
        });
        const body = document.createElement('div');
        body.className = 'cfc-issue-body';
        body.textContent = issue.body || 'No description was provided.';
        const heading = document.createElement('strong');
        heading.textContent = `Public discussion (${comments.length})`;
        const commentList = document.createElement('div');
        commentList.className = 'cfc-comments';
        if (!comments.length) {
          const empty = document.createElement('div');
          empty.className = 'cfc-comment';
          empty.textContent = 'No comments yet.';
          commentList.appendChild(empty);
        }
        comments.forEach(comment => {
          const item = document.createElement('article');
          item.className = 'cfc-comment';
          const header = document.createElement('header');
          const author = document.createElement('strong');
          author.textContent = comment.author || 'unknown';
          const date = document.createElement('span');
          date.textContent = formatDate(comment.createdAt);
          header.append(author, date);
          const text = document.createElement('div');
          text.className = 'cfc-comment-body';
          text.textContent = comment.body;
          item.append(header, text);
          commentList.appendChild(item);
        });
        const actions = document.createElement('footer');
        actions.className = 'cfc-actions';
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'cfc-button cfc-button-muted';
        copy.textContent = 'Copy Issue Reference';
        copy.addEventListener('click', async () => {
          await copyText(`#${issue.number} ${issue.title}\n${issue.url}`);
          setStatus(issueStatus, `Issue #${issue.number} copied.`);
        });
        actions.appendChild(copy);
        issueDetail.append(title, meta, labels, body, heading, commentList, actions);
      } catch (error) {
        issueDetail.innerHTML = '<div class="cfc-empty"><strong>Could not load issue</strong><span>Try selecting it again.</span></div>';
        setStatus(issueStatus, error.message || 'Issue details could not be loaded.', true);
      }
    };

    launcher.addEventListener('click', () => {
      dialog.showModal();
      q(dialog, '[data-cfc-tab].is-active').focus();
    });
    q(dialog, '[data-cfc-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    qa(dialog, '[data-cfc-tab]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.cfcTab)));
    form.addEventListener('input', scheduleSave);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.elements.title.value.trim() || !form.elements.details.value.trim()) {
        setStatus(reportStatus, 'Add a title and description before reviewing.', true);
        return;
      }
      if (!form.elements.privacy.checked) {
        setStatus(reportStatus, 'Confirm the privacy checklist before reviewing.', true);
        return;
      }
      saveDraft(false);
      showReview(values());
    });
    q(dialog, '[data-cfc-save]').addEventListener('click', () => saveDraft(true));
    q(dialog, '[data-cfc-clear]').addEventListener('click', () => {
      form.reset();
      api.clearDraft();
      setStatus(reportStatus, 'Draft cleared.');
    });
    q(dialog, '[data-cfc-edit]').addEventListener('click', () => {
      review.hidden = true;
      form.hidden = false;
      form.elements.title.focus();
    });
    q(dialog, '[data-cfc-copy]').addEventListener('click', async () => {
      if (!currentReport) return;
      await copyText(`${api.reportTitle(currentReport)}\n\n${api.reportBody(currentReport)}`);
      setStatus(reviewStatus, 'Report copied.');
    });
    q(dialog, '[data-cfc-download]').addEventListener('click', () => {
      if (!currentReport) return;
      downloadText(`critter-extraction-feedback-${Date.now()}.txt`, `${api.reportTitle(currentReport)}\n\n${api.reportBody(currentReport)}`);
      setStatus(reviewStatus, 'Report downloaded.');
    });
    q(dialog, '[data-cfc-publish]').addEventListener('click', async () => {
      if (!currentReport) return;
      setStatus(reviewStatus, 'Preparing publication…');
      try {
        const result = await api.submit(currentReport);
        if (result.mode === 'api') {
          api.clearDraft();
          setStatus(reviewStatus, 'Feedback published successfully.');
          return;
        }
        const popup = window.open(result.url, '_blank', 'noopener,noreferrer');
        if (popup) {
          popup.opener = null;
          setStatus(reviewStatus, 'The final GitHub confirmation opened with the report filled in.');
        } else {
          await copyText(`${api.reportTitle(currentReport)}\n\n${api.reportBody(currentReport)}`);
          setStatus(reviewStatus, 'The browser blocked the final confirmation window, so the report was copied instead.', true);
        }
      } catch (error) {
        setStatus(reviewStatus, error.message || 'The report could not be prepared.', true);
      }
    });
    q(dialog, '[data-cfc-refresh]').addEventListener('click', loadIssues);
    issueState.addEventListener('change', loadIssues);
    issueSearch.addEventListener('input', renderIssueList);

    restoreDraft();
    window.CritterFeedbackCenter = Object.freeze({ open: () => dialog.showModal(), close: () => dialog.close(), refresh: loadIssues });
    try {
      if (new URL(location.href).searchParams.get('feedback') === '1') dialog.showModal();
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();

/* Harley's Studios — issue #62 all-39 Character roster controller. */
(() => {
  'use strict';
  if (window.__ISSUE_62_LIVE_ROSTER_V2__) return;
  window.__ISSUE_62_LIVE_ROSTER_V2__ = true;

  const runtime = window.CritterModelRuntime;
  if (!runtime) {
    window.addEventListener('critter:model-runtime-ready',() => location.reload(),{ once:true });
    return;
  }

  const FILTERS = Object.freeze([
    ['all','All 39'],['starter','Starter'],['new','New'],['owned','Owned'],['locked','Locked'],
    ['forest','Forest'],['tiny','Tiny'],['water','Water'],['winter','Winter'],['night','Night']
  ]);
  let activeFilter = 'all';
  let scheduled = false;
  let observer = null;

  function ensureStyles() {
    if (document.getElementById('issue-62-roster-styles')) return;
    const style = document.createElement('style');
    style.id = 'issue-62-roster-styles';
    style.textContent = `
      .issue62-roster-tools{display:grid;gap:10px;margin:2px 0 14px;padding:12px;border:1px solid rgba(100,232,234,.22);border-radius:16px;background:linear-gradient(145deg,rgba(100,232,234,.065),rgba(15,19,39,.58))}
      .issue62-roster-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.issue62-roster-heading strong{color:#f4f7ff;font-size:13px}.issue62-roster-heading small{color:#8f9abd;text-align:right;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
      .issue62-roster-filters{display:flex;flex-wrap:wrap;gap:7px}.issue62-roster-filter{min-height:34px;padding:7px 11px;border:1px solid rgba(132,145,188,.3);border-radius:999px;color:#bdc6e2;background:rgba(255,255,255,.035);font:inherit;font-size:11px;font-weight:900;cursor:pointer}.issue62-roster-filter:hover,.issue62-roster-filter:focus-visible{border-color:rgba(100,232,234,.7);color:#efffff;outline:none}.issue62-roster-filter.active{border-color:#64e8ea;color:#071315;background:#64e8ea;box-shadow:0 0 18px rgba(100,232,234,.2)}
      #characterRoster{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(126px,1fr))!important;gap:10px!important}
      #characterRoster .character-choice{position:relative;display:grid;grid-template-rows:88px auto;gap:7px;min-width:0;min-height:132px;padding:9px;border:1px solid rgba(129,142,187,.26);border-radius:15px;color:#edf2ff;background:linear-gradient(165deg,rgba(255,255,255,.055),rgba(8,12,27,.78));text-align:left;cursor:pointer;overflow:hidden}
      #characterRoster .character-choice:hover,#characterRoster .character-choice:focus-visible{border-color:rgba(100,232,234,.72);outline:none;transform:translateY(-1px)}#characterRoster .character-choice.active{border-color:#64e8ea;box-shadow:0 0 0 1px rgba(100,232,234,.24),0 10px 28px rgba(0,0,0,.26);background:linear-gradient(165deg,rgba(100,232,234,.12),rgba(8,12,27,.88))}
      #characterRoster .character-choice img{display:block;width:100%;height:88px;object-fit:contain;border-radius:10px;background:rgba(5,8,18,.42)}#characterRoster .character-choice strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}#characterRoster .character-choice .issue62-role{display:block;margin-top:3px;color:#9ca7c8;font-size:10px;font-weight:700;line-height:1.25}#characterRoster .character-choice.active .issue62-role{color:#bffcff}
      #characterRoster .character-choice.issue62-hidden{display:none!important}#characterRoster .character-choice .issue62-species-state{position:absolute;left:8px;top:8px;z-index:2;padding:3px 6px;border:1px solid rgba(100,232,234,.34);border-radius:999px;color:#9eeef0;background:rgba(7,12,25,.86);font-size:8px;font-weight:900;letter-spacing:.08em}#characterRoster .character-choice.reward-locked .issue62-species-state{border-color:rgba(255,211,111,.48);color:#ffd36f}
      .issue62-roster-empty{grid-column:1/-1;padding:22px 16px;border:1px dashed rgba(132,145,188,.34);border-radius:15px;color:#9aa5c5;text-align:center}
      @media(max-width:620px){.issue62-roster-heading{align-items:flex-start;flex-direction:column}.issue62-roster-heading small{text-align:left}.issue62-roster-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.issue62-roster-filter{min-width:0;padding-inline:5px}#characterRoster{grid-template-columns:repeat(2,minmax(100px,1fr))!important}}
      @media(max-width:400px){.issue62-roster-filters{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  const selectedSpeciesId = () => runtime.sanitizeLiveSpecies(document.getElementById('species')?.value || 'puppy');
  const isLocked = button => button.disabled || button.classList.contains('reward-locked') || button.getAttribute('aria-disabled') === 'true';

  function createButton(id) {
    const entry = runtime.runtimeDefinition(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-choice';
    button.dataset.species = id;
    button.setAttribute('role','option');
    button.innerHTML = `<img alt=""><span class="issue62-copy"><strong></strong><span class="issue62-role"></span></span>`;
    button.querySelector('img').src = runtime.previewAsset(id);
    button.querySelector('img').alt = `${entry.name} critter preview`;
    button.querySelector('strong').textContent = entry.name;
    button.querySelector('.issue62-role').textContent = entry.role;
    button.addEventListener('click',() => {
      if (isLocked(button)) return;
      window.NewCritterAppearance?.selectSpecies?.(id,true);
      syncActive(document.getElementById('characterRoster'));
    });
    return button;
  }

  function ensureRosterButtons(roster) {
    runtime.liveRuntimeIds.forEach(id => {
      let button = roster.querySelector(`.character-choice[data-species="${CSS.escape(id)}"]`);
      if (!button) {
        button = createButton(id);
        roster.appendChild(button);
      }
      const entry = runtime.runtimeDefinition(id);
      button.dataset.issue62Model = entry.model.head;
      const image = button.querySelector('img');
      if (image && (!image.getAttribute('src') || entry.generatedPreview)) image.src = runtime.previewAsset(id);
      const name = button.querySelector('strong,b,.character-name');
      if (name) name.textContent = entry.name;
    });
  }

  function categoriesFor(button, entry) {
    const categories = new Set(entry.categories || []);
    categories.add(isLocked(button) ? 'locked' : 'owned');
    return categories;
  }

  function annotateButton(button) {
    const id = runtime.sanitizeLiveSpecies(button.dataset.species);
    const entry = runtime.runtimeDefinition(id);
    const categories = categoriesFor(button,entry);
    button.dataset.issue62Categories = [...categories].join(' ');
    button.dataset.issue62Role = entry.role;
    button.dataset.issue62Stage = 'gameplay';
    let role = button.querySelector('.issue62-role');
    if (!role) {
      role = document.createElement('span');
      role.className = 'issue62-role';
      (button.querySelector('strong,b,.character-name')?.parentElement || button).appendChild(role);
    }
    role.textContent = entry.role;
    let state = button.querySelector('.issue62-species-state');
    if (!state) {
      state = document.createElement('span');
      state.className = 'issue62-species-state';
      state.setAttribute('aria-hidden','true');
      button.appendChild(state);
    }
    state.textContent = isLocked(button) ? 'CODE' : '3D';
    button.setAttribute('aria-label',`${entry.name}, ${entry.role}, ${isLocked(button) ? 'locked Critter Code reward' : 'playable modeled critter'}`);
  }

  function ensureTools(roster) {
    const parent = roster.parentElement;
    if (!parent) return null;
    let tools = parent.querySelector(':scope > .issue62-roster-tools');
    if (tools) return tools;
    tools = document.createElement('section');
    tools.className = 'issue62-roster-tools';
    tools.setAttribute('aria-label','Character roster filters');
    tools.innerHTML = `<div class="issue62-roster-heading"><strong>Choose Your Critter</strong><small>39 playable procedural 3D models • shared fair hitboxes</small></div><div class="issue62-roster-filters" role="toolbar" aria-label="Filter critters"></div>`;
    const host = tools.querySelector('.issue62-roster-filters');
    FILTERS.forEach(([id,label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'issue62-roster-filter';
      button.dataset.filter = id;
      button.textContent = label;
      button.setAttribute('aria-pressed',String(id === activeFilter));
      button.classList.toggle('active',id === activeFilter);
      button.addEventListener('click',() => {
        activeFilter = id;
        host.querySelectorAll('.issue62-roster-filter').forEach(item => {
          const active = item.dataset.filter === activeFilter;
          item.classList.toggle('active',active);
          item.setAttribute('aria-pressed',String(active));
        });
        applyFilter(roster);
      });
      host.appendChild(button);
    });
    parent.insertBefore(tools,roster);
    return tools;
  }

  function visibleButtons(roster) {
    return [...roster.querySelectorAll('.character-choice[data-species]')].filter(button => !button.classList.contains('issue62-hidden'));
  }

  function ensureEmptyState(roster,count) {
    let empty = roster.querySelector('.issue62-roster-empty');
    if (!count && !empty) {
      empty = document.createElement('p');
      empty.className = 'issue62-roster-empty';
      empty.textContent = 'No critters match this filter.';
      roster.appendChild(empty);
    }
    if (empty) empty.hidden = count > 0;
  }

  function syncActive(roster) {
    if (!roster) return;
    const selected = selectedSpeciesId();
    roster.querySelectorAll('.character-choice[data-species]').forEach(button => {
      const active = button.dataset.species === selected;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  function applyFilter(roster) {
    const selected = selectedSpeciesId();
    let visible = 0;
    roster.querySelectorAll('.character-choice[data-species]').forEach(button => {
      const id = runtime.sanitizeLiveSpecies(button.dataset.species);
      const categories = new Set(String(button.dataset.issue62Categories || '').split(/\s+/).filter(Boolean));
      const matches = activeFilter === 'all' || categories.has(activeFilter) || id === selected;
      button.classList.toggle('issue62-hidden',!matches);
      button.setAttribute('aria-hidden',String(!matches));
      if (matches) visible += 1;
    });
    ensureEmptyState(roster,visible);
    syncActive(roster);
  }

  function installKeyboardNavigation(roster) {
    if (roster.dataset.issue62Keyboard === 'true') return;
    roster.dataset.issue62Keyboard = 'true';
    roster.addEventListener('keydown',event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' '].includes(event.key)) return;
      if (event.key === 'Enter' || event.key === ' ') {
        if (document.activeElement?.matches?.('.character-choice')) { event.preventDefault(); document.activeElement.click(); }
        return;
      }
      const buttons = visibleButtons(roster);
      if (!buttons.length) return;
      const current = Math.max(0,buttons.indexOf(document.activeElement));
      const columns = Math.max(1,Math.round(roster.clientWidth / Math.max(126,buttons[0]?.offsetWidth || 126)));
      let next = current;
      if (event.key === 'ArrowLeft') next -= 1;
      if (event.key === 'ArrowRight') next += 1;
      if (event.key === 'ArrowUp') next -= columns;
      if (event.key === 'ArrowDown') next += columns;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      next = Math.max(0,Math.min(buttons.length-1,next));
      event.preventDefault();
      buttons[next].focus();
    });
  }

  function refreshNow() {
    scheduled = false;
    const roster = document.getElementById('characterRoster');
    if (!roster) return false;
    if (observer) observer.disconnect();
    ensureStyles();
    ensureRosterButtons(roster);
    ensureTools(roster);
    roster.querySelectorAll('.character-choice[data-species]').forEach(annotateButton);
    installKeyboardNavigation(roster);
    applyFilter(roster);
    roster.dataset.issue62Ready = 'true';
    observer ||= new MutationObserver(refresh);
    observer.observe(roster,{ childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled','aria-disabled'] });
    return true;
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refreshNow);
  }

  function start() {
    if (!refreshNow()) return setTimeout(start,60);
    document.getElementById('species')?.addEventListener('change',refresh);
    window.addEventListener('critter-appearance-updated',refresh);
    window.addEventListener('storage',event => { if (event.key === 'critterExtractionInventory') refresh(); });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',start,{ once:true }) : start();
  window.CritterIssue62Roster = Object.freeze({ refresh, get activeFilter(){ return activeFilter; } });
})();

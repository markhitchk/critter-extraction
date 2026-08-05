/* Issue #59 — hashed Otter reward extension v1.1.0. */
(() => {
  'use strict';

  const VERSION = '1.1.0';
  if (window.CritterCodesOtter?.version === VERSION) return;

  const CODE_HASH = '417e7c28427463e569bd23ab945bf7bf5bb8c389f78bc3dd5d7aca971db9b433';
  const BUNDLE_ID = 'b11';
  const REWARD_ID = 'critter_otter';
  const DB_KEYS = ['critterExtractionInventory', 'critterExtraction3DInventory'];
  const state = { wrapped:false, attempts:0, lastError:'' };
  let timer = 0;
  let originalRedeem = null;
  let originalOpenRewards = null;

  const normalize = value => String(value || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 64);

  async function sha256(value) {
    if (!globalThis.crypto?.subtle) throw new Error('secure_hash_unavailable');
    const bytes = new TextEncoder().encode(String(value || ''));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function databaseKeys() {
    const keys = [...DB_KEYS];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith('critterExtraction3DInventory_') && !keys.includes(key)) keys.push(key);
      }
    } catch (_) { }
    return keys;
  }

  function findProfile() {
    let best = null;
    let score = -Infinity;
    for (const key of databaseKeys()) {
      try {
        const db = JSON.parse(localStorage.getItem(key) || 'null');
        const account = db?.accounts?.find(item => item?.id === db.activeId) || db?.accounts?.find(Boolean);
        if (!db || !account) continue;
        const candidateScore = (key === DB_KEYS[0] ? 2 : key === DB_KEYS[1] ? 1 : 0) * 1e15 + (Number(db.updatedAt) || 0);
        if (candidateScore > score) {
          best = { key, db, account };
          score = candidateScore;
        }
      } catch (_) { }
    }
    return best;
  }

  function ownsOtter(account) {
    if (!account || typeof account !== 'object') return false;
    if (account.rewardOwnership?.[REWARD_ID] || account.rewardOwnership?.otter) return true;
    if (Array.isArray(account.critterCodeUnlocks) && account.critterCodeUnlocks.some(value =>
      [BUNDLE_ID, 'otter', REWARD_ID].includes(String(value).toLowerCase()))) return true;
    return Array.isArray(account.redeemedCritterCodes) && account.redeemedCritterCodes.some(entry => {
      const value = typeof entry === 'object' ? entry?.id || entry?.bundleId || entry?.hash : entry;
      return value === BUNDLE_ID || value === CODE_HASH;
    });
  }

  function uniquePush(array, value) {
    if (!array.some(item => String(item).toLowerCase() === String(value).toLowerCase())) array.push(value);
  }

  function addNotification(account, redeemedAt) {
    if (!Array.isArray(account.notifications)) account.notifications = [];
    const dedupeKey = `critter-code:${BUNDLE_ID}`;
    if (account.notifications.some(note => note?.dedupeKey === dedupeKey)) return;
    account.notifications.push({
      id:`notice-otter-${redeemedAt}`,
      type:'info',
      title:'Otter Unlocked',
      body:'Your cuddly two-tone brown Otter is ready in the Character menu.',
      createdAt:redeemedAt,
      unread:true,
      status:'ready',
      items:[],
      dedupeKey,
      rewardId:REWARD_ID,
      bundleId:BUNDLE_ID
    });
    account.notifications = account.notifications.slice(-30);
  }

  function syncNotificationBadge(account) {
    const unread = (Array.isArray(account?.notifications) ? account.notifications : []).filter(note => note?.unread === true).length;
    const badge = document.getElementById('recoveryNotificationsBadge');
    const button = document.getElementById('recoveryNotificationsBtn');
    if (badge) {
      badge.hidden = unread < 1;
      badge.textContent = unread > 99 ? '99+' : String(unread);
    }
    if (button) button.setAttribute('aria-label', `Notifications${unread ? `, ${unread} unread` : ''}`);
  }

  function ensureStyles() {
    if (document.getElementById('otterRewardStyles')) return;
    const style = document.createElement('style');
    style.id = 'otterRewardStyles';
    style.textContent = `
      #otterRewardDialog,#otterCodeDialog{border:0;padding:0;background:transparent;color:#f4fbff}
      #otterRewardDialog::backdrop,#otterCodeDialog::backdrop{background:rgba(3,8,16,.82);backdrop-filter:blur(10px)}
      .otter-reward-card,.otter-code-card{width:min(590px,calc(100vw - 28px));overflow:hidden;border:1px solid rgba(118,235,236,.45);border-radius:26px;background:linear-gradient(150deg,#12243a,#0a1424 65%,#1f1820);box-shadow:0 30px 90px rgba(0,0,0,.58)}
      .otter-reward-hero{position:relative;display:grid;grid-template-columns:220px minmax(0,1fr);gap:22px;align-items:center;padding:28px;overflow:hidden}.otter-reward-hero:before{content:"";position:absolute;inset:-40% 45% 15% -20%;background:radial-gradient(circle,rgba(118,235,236,.24),transparent 66%)}.otter-reward-hero>*{position:relative;z-index:1}
      .otter-reward-art{display:grid;place-items:center;min-height:220px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:radial-gradient(circle at 50% 35%,rgba(215,170,124,.28),transparent 58%),rgba(255,255,255,.035)}.otter-reward-art img{width:190px;max-width:90%;filter:drop-shadow(0 18px 24px rgba(0,0,0,.32))}
      .otter-reward-copy .eyebrow,.otter-code-copy .eyebrow{color:#76ebec;font-size:10px;font-weight:900;letter-spacing:.16em}.otter-reward-copy h2,.otter-code-copy h2{margin:7px 0 9px;font-size:38px;line-height:1}.otter-reward-copy p,.otter-code-copy p{margin:0;color:#bfcbdb;line-height:1.6}.otter-reward-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:17px}.otter-reward-tags span{padding:6px 9px;border:1px solid rgba(255,255,255,.12);border-radius:999px;color:#e8f7f8;font-size:10px;font-weight:800}
      .otter-reward-actions,.otter-code-actions{display:flex;justify-content:flex-end;gap:9px;padding:16px 20px;border-top:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.12)}.otter-reward-actions button,.otter-code-actions button{min-height:44px;padding:0 16px;border-radius:12px;font-weight:900;cursor:pointer}.otter-reward-actions .primary,.otter-code-actions .primary{color:#061519;border:1px solid #8ff7e2;background:linear-gradient(135deg,#8ff7e2,#67dbe4)}.otter-reward-actions .secondary,.otter-code-actions .secondary{color:#f4fbff;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.055)}
      .otter-code-copy{padding:26px 26px 8px}.otter-code-form{display:grid;gap:12px;padding:14px 26px 26px}.otter-code-form label{display:grid;gap:7px;color:#dffcff;font-size:.78rem;font-weight:800;letter-spacing:.06em}.otter-code-form input{width:100%;box-sizing:border-box;padding:15px 16px;border:1px solid rgba(100,232,234,.42);border-radius:14px;background:#070d19;color:#fff;font:800 1rem/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;outline:none}.otter-code-form input:focus{border-color:#64e8ea;box-shadow:0 0 0 3px rgba(100,232,234,.13)}.otter-code-message{min-height:24px;margin:0;color:#b9c4d6}.otter-code-message.success{color:#72f2bd}.otter-code-message.error{color:#ff9dad}
      @media(max-width:600px){.otter-reward-hero{grid-template-columns:1fr;padding:22px}.otter-reward-art{min-height:190px}.otter-reward-art img{width:165px}.otter-reward-copy h2,.otter-code-copy h2{font-size:32px}.otter-reward-actions,.otter-code-actions{display:grid;grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){#otterRewardDialog::backdrop,#otterCodeDialog::backdrop{backdrop-filter:none}}
    `;
    document.head.appendChild(style);
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute('open', '');
  }

  function ensureRewardDialog() {
    let dialog = document.getElementById('otterRewardDialog');
    if (dialog) return dialog;
    ensureStyles();
    dialog = document.createElement('dialog');
    dialog.id = 'otterRewardDialog';
    dialog.setAttribute('aria-labelledby', 'otterRewardTitle');
    const asset = window.CritterPaths?.resolve?.('assets/characters/otter.svg') || './assets/characters/otter.svg';
    dialog.innerHTML = `
      <section class="otter-reward-card">
        <div class="otter-reward-hero">
          <div class="otter-reward-art"><img src="${asset}" alt="Two-tone brown Otter reward"></div>
          <div class="otter-reward-copy"><span class="eyebrow">SPECIAL CRITTER UNLOCKED</span><h2 id="otterRewardTitle">Otter</h2><p>A cuddly two-tone otter ready to dive into the extraction zone.</p><div class="otter-reward-tags"><span>PLAYABLE CRITTER</span><span>TWO-TONE BROWN</span><span>PERMANENT REWARD</span></div></div>
        </div>
        <footer class="otter-reward-actions"><button type="button" class="secondary" data-otter-close>Continue</button><button type="button" class="primary" data-otter-equip>Choose Otter</button></footer>
      </section>`;
    dialog.querySelector('[data-otter-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-otter-equip]').addEventListener('click', () => {
      dialog.close();
      document.querySelector('[data-open="customizeModal"]')?.click();
      setTimeout(() => {
        const species = document.getElementById('species');
        if (!species) return;
        species.value = 'otter';
        species.dispatchEvent(new Event('change', { bubbles:true }));
      }, 80);
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function showReward() {
    openDialog(ensureRewardDialog());
  }

  function messageFor(error) {
    return ({
      invalid_code:'That Critter Code is not valid.',
      already_redeemed:'This profile already redeemed that code.',
      expired_code:'That Critter Code has expired.',
      disabled_code:'That Critter Code is disabled.',
      not_active:'That Critter Code is not active yet.',
      version_locked:'Update Critter Extraction before using this code.',
      profile_corrupt:'The active profile could not safely store rewards.',
      reward_definition_missing:'This reward bundle is temporarily unavailable.',
      secure_hash_unavailable:'This browser cannot securely verify that Critter Code.'
    })[error?.message] || 'The code could not be redeemed. Try again.';
  }

  function ensureCodeDialog() {
    let dialog = document.getElementById('otterCodeDialog');
    if (dialog) return dialog;
    ensureStyles();
    dialog = document.createElement('dialog');
    dialog.id = 'otterCodeDialog';
    dialog.setAttribute('aria-labelledby', 'otterCodeTitle');
    dialog.innerHTML = `
      <section class="otter-code-card">
        <div class="otter-code-copy"><span class="eyebrow">REWARDS TERMINAL</span><h2 id="otterCodeTitle">Critter Codes</h2><p>Enter a promotional or event code to add permanent rewards to this profile.</p></div>
        <form class="otter-code-form" novalidate>
          <label>CRITTER CODE<input id="otterAwareCritterCodeInput" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ENTER CODE" aria-describedby="otterCodeMessage"></label>
          <p id="otterCodeMessage" class="otter-code-message" aria-live="polite">Critter Codes ready.</p>
          <div class="otter-code-actions"><button type="button" class="secondary" data-code-rewards>View Rewards</button><button type="button" class="secondary" data-code-close>Close</button><button type="submit" class="primary">Redeem Code</button></div>
        </form>
      </section>`;
    const message = dialog.querySelector('#otterCodeMessage');
    const input = dialog.querySelector('#otterAwareCritterCodeInput');
    const submit = dialog.querySelector('button[type="submit"]');
    dialog.querySelector('[data-code-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-code-rewards]').addEventListener('click', () => {
      dialog.close();
      originalOpenRewards?.();
    });
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const code = String(input.value || '').trim();
      if (!code) {
        message.textContent = 'Enter a Critter Code first.';
        message.className = 'otter-code-message error';
        input.focus();
        return;
      }
      submit.disabled = true;
      message.textContent = 'Checking code…';
      message.className = 'otter-code-message';
      try {
        const result = await redeemCode(code);
        input.value = '';
        const count = Array.isArray(result?.rewards) ? result.rewards.length : 0;
        message.textContent = count ? `Code redeemed. ${count} reward${count === 1 ? '' : 's'} added to this profile.` : 'Code redeemed. Your rewards were added to this profile.';
        message.className = 'otter-code-message success';
      } catch (error) {
        message.textContent = messageFor(error);
        message.className = 'otter-code-message error';
      } finally {
        submit.disabled = false;
      }
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function openTerminal() {
    const dialog = ensureCodeDialog();
    openDialog(dialog);
    setTimeout(() => dialog.querySelector('#otterAwareCritterCodeInput')?.focus(), 0);
  }

  function dispatchUnlock(detail) {
    for (const name of ['critter-code-redeemed', 'critter-codes-redeemed', 'critter-code-unlocks-changed']) {
      window.dispatchEvent(new CustomEvent(name, { detail }));
      document.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  function grantOtter() {
    const profile = findProfile();
    if (!profile) throw new Error('profile_corrupt');
    const { key, db, account } = profile;
    if (ownsOtter(account)) throw new Error('already_redeemed');

    const redeemedAt = Date.now();
    if (!Array.isArray(account.critterCodeUnlocks)) account.critterCodeUnlocks = [];
    uniquePush(account.critterCodeUnlocks, BUNDLE_ID);
    uniquePush(account.critterCodeUnlocks, 'otter');
    uniquePush(account.critterCodeUnlocks, REWARD_ID);
    account.rewardOwnership = account.rewardOwnership && typeof account.rewardOwnership === 'object' ? account.rewardOwnership : {};
    account.rewardOwnership.otter = true;
    account.rewardOwnership[REWARD_ID] = true;
    if (!Array.isArray(account.redeemedCritterCodes)) account.redeemedCritterCodes = [];
    account.redeemedCritterCodes.push({ id:BUNDLE_ID, hash:CODE_HASH, redeemedAt, rewards:[REWARD_ID] });
    addNotification(account, redeemedAt);
    db.updatedAt = redeemedAt;

    try { localStorage.setItem(key, JSON.stringify(db)); }
    catch (_) { throw new Error('profile_corrupt'); }

    const result = {
      codeId:BUNDLE_ID,
      bundleId:BUNDLE_ID,
      rewards:[{ id:REWARD_ID, name:'Otter', type:'critter', rarity:'Special', description:'A cuddly two-tone otter ready to dive into the extraction zone.' }],
      insurance:{ stash:0, delivery:0 },
      redeemedAt
    };
    syncNotificationBadge(account);
    dispatchUnlock(result);
    showReward();
    return result;
  }

  async function redeemCode(code) {
    const hash = await sha256(normalize(code));
    if (hash === CODE_HASH) return grantOtter();
    if (typeof originalRedeem !== 'function') throw new Error('invalid_code');
    return originalRedeem(code);
  }

  function readRedeem(api) {
    if (typeof api?.redeemCode === 'function') return api.redeemCode.bind(api);
    if (typeof api?.redeem === 'function') return api.redeem.bind(api);
    return null;
  }

  function readOpen(api) {
    if (typeof api?.openRewards === 'function') return api.openRewards.bind(api);
    if (typeof api?.open === 'function') return api.open.bind(api);
    return null;
  }

  function wrapApi() {
    state.attempts += 1;
    const api = window.CritterCodes;
    if (!api) return false;
    if (api.__OTTER_REWARD_EXTENSION_V110__) {
      state.wrapped = true;
      return true;
    }
    const nextRedeem = readRedeem(api);
    if (!nextRedeem) return false;
    originalRedeem = nextRedeem;
    originalOpenRewards = readOpen(api);

    const wrapped = {
      ...api,
      ready:true,
      redeem:redeemCode,
      redeemCode,
      open:openTerminal,
      openRewards:originalOpenRewards || api.openRewards,
      __OTTER_REWARD_EXTENSION_V110__:true
    };
    window.CritterCodes = wrapped;
    state.wrapped = true;
    return true;
  }

  function start() {
    if (wrapApi()) return;
    if (timer) return;
    timer = window.setInterval(() => {
      if (wrapApi() || state.attempts >= 600) {
        clearInterval(timer);
        timer = 0;
      }
    }, 50);
  }

  window.CritterCodesOtter = Object.freeze({
    version:VERSION,
    rewardId:REWARD_ID,
    bundleId:BUNDLE_ID,
    owns:() => ownsOtter(findProfile()?.account),
    open:showReward,
    openTerminal,
    redeem:redeemCode,
    refresh:wrapApi,
    state:() => ({ ...state })
  });

  window.addEventListener('critter-codes-api-ready', start);
  window.addEventListener('critter-codes-runtime-exported', start);
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once:true })
    : start();
})();

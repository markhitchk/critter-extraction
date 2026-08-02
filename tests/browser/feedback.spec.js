const { test, expect } = require('@playwright/test');

const repoApi = 'https://api.github.com/repos/markhitchk/critter-extraction';

async function blockRequiredProfileModal(page) {
  await page.addInitScript(() => {
    const neutralize = dialog => {
      if (!dialog || dialog.id !== 'profileModal') return false;
      try {
        if (dialog.open && typeof dialog.close === 'function') dialog.close();
      } catch (_) {}
      dialog.removeAttribute('open');
      dialog.style.setProperty('display', 'none', 'important');
      dialog.style.setProperty('pointer-events', 'none', 'important');
      return true;
    };

    const install = () => {
      if (window.HTMLDialogElement) {
        const prototype = window.HTMLDialogElement.prototype;
        const originalShow = prototype.show;
        const originalShowModal = prototype.showModal;

        prototype.show = function (...args) {
          if (neutralize(this)) return undefined;
          return originalShow.apply(this, args);
        };

        prototype.showModal = function (...args) {
          if (neutralize(this)) return undefined;
          return originalShowModal.apply(this, args);
        };
      }

      const closeProfileModal = () => neutralize(document.getElementById('profileModal'));
      closeProfileModal();

      const observer = new MutationObserver(closeProfileModal);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['open']
      });

      window.setInterval(closeProfileModal, 50);
    };

    if (document.documentElement) install();
    else window.addEventListener('DOMContentLoaded', install, { once: true });
  });
}

test.beforeEach(async ({ page }) => {
  await blockRequiredProfileModal(page);

  await page.route(`${repoApi}/issues?**`, async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      {
        number: 42,
        title: 'Room code does not fill automatically',
        body: 'The shared room URL should fill the six-digit code inside the Join screen.',
        state: 'open',
        state_reason: null,
        html_url: 'https://github.com/markhitchk/critter-extraction/issues/42',
        comments: 1,
        created_at: '2026-08-01T10:00:00Z',
        updated_at: '2026-08-02T10:00:00Z',
        closed_at: null,
        user: { login: 'tester' },
        labels: [{ name: 'bug', color: 'd73a4a' }]
      },
      {
        number: 43,
        title: 'Pull request excluded',
        body: 'This should not render.',
        state: 'open',
        html_url: 'https://github.com/markhitchk/critter-extraction/pull/43',
        comments: 0,
        user: { login: 'bot' },
        labels: [],
        pull_request: { url: 'https://api.github.com/example' }
      }
    ])
  }));
  await page.route(`${repoApi}/issues/42`, async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      number: 42,
      title: 'Room code does not fill automatically',
      body: 'The shared room URL should fill the six-digit code inside the Join screen.',
      state: 'open',
      state_reason: null,
      html_url: 'https://github.com/markhitchk/critter-extraction/issues/42',
      comments: 1,
      created_at: '2026-08-01T10:00:00Z',
      updated_at: '2026-08-02T10:00:00Z',
      closed_at: null,
      user: { login: 'tester' },
      labels: [{ name: 'bug', color: 'd73a4a' }]
    })
  }));
  await page.route(`${repoApi}/issues/42/comments?**`, async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{
      id: 1,
      body: 'This is being investigated.',
      created_at: '2026-08-02T10:30:00Z',
      updated_at: '2026-08-02T10:30:00Z',
      user: { login: 'maintainer' }
    }])
  }));
});

test('feedback report is drafted and reviewed inside the game', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.querySelector('#profileHandle').textContent = '@meadow_ranger';
    document.querySelector('#profileName').textContent = 'Meadow Ranger';
    document.querySelector('#topName').textContent = 'Meadow Ranger';
  });
  await page.locator('#critter-feedback-launcher').click();
  await expect(page.locator('#critter-feedback-center')).toBeVisible();
  await expect(page.locator('#critter-feedback-center a')).toHaveCount(0);

  await page.locator('[name="title"]').fill('Crosshair is above the shot');
  await page.locator('[name="details"]').fill('Shots sometimes land above the center of the crosshair.');
  await page.locator('[name="steps"]').fill('1. Start solo\n2. Aim at a wall\n3. Fire');
  await page.locator('[name="privacy"]').check();
  await page.getByRole('button', { name: 'Review Report' }).click();

  await expect(page.locator('#cfc-report-review')).toBeVisible();
  await expect(page.locator('#cfc-review-title')).toContainText('[Bug]');
  await expect(page.locator('#cfc-review-title')).toContainText('Crosshair is above the shot');
  await expect(page.locator('#cfc-report-preview')).toContainText('Shots sometimes land above the center of the crosshair.');
  await expect(page.locator('#cfc-report-preview')).toContainText('Username: @meadow_ranger');
  await expect(page.locator('#cfc-report-preview')).toContainText('Display name: Meadow Ranger');
  await expect(page.locator('#cfc-report-preview')).toContainText('Privacy-safe environment');
  await expect(page.locator('#cfc-github-auth')).toBeVisible();
});

test('feedback can create a GitHub issue directly from the UI API', async ({ page }) => {
  let submitted = null;
  let authorization = '';
  await page.route(`${repoApi}/issues`, async route => {
    authorization = route.request().headers().authorization || '';
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        number: 88,
        html_url: 'https://github.com/markhitchk/critter-extraction/issues/88',
        title: submitted.title,
        body: submitted.body
      })
    });
  });

  await page.goto('/');
  const result = await page.evaluate(async () => {
    document.querySelector('#profileHandle').textContent = '@direct_tester';
    document.querySelector('#profileName').textContent = 'Direct Tester';
    window.CritterIssueAPI.setGitHubToken('test-access-token');
    return window.CritterIssueAPI.submit({
      type: 'bug',
      title: 'Direct send test',
      category: 'Other',
      details: 'Created without opening another page.',
      diagnostics: false
    });
  });

  expect(result.mode).toBe('api');
  expect(result.provider).toBe('github');
  expect(result.issueNumber).toBe(88);
  expect(authorization).toBe('Bearer test-access-token');
  expect(submitted.title).toBe('[Bug]: Direct send test');
  expect(submitted.body).toContain('Username: @direct_tester');
  expect(submitted.body).toContain('Created without opening another page.');
});

test('issues and comments are viewed inside the game', async ({ page }) => {
  await page.goto('/?feedback=1');
  await expect(page.locator('#critter-feedback-center')).toBeVisible();
  await page.getByRole('button', { name: 'Issues & Updates' }).click();

  await expect(page.locator('#cfc-issue-list')).toContainText('#42 Room code does not fill automatically');
  await expect(page.locator('#cfc-issue-list')).not.toContainText('Pull request excluded');
  await page.getByRole('button', { name: /#42 Room code/ }).click();

  await expect(page.locator('#cfc-issue-detail')).toContainText('The shared room URL should fill');
  await expect(page.locator('#cfc-issue-detail')).toContainText('This is being investigated.');
  await expect(page.locator('#cfc-issue-detail')).toContainText('maintainer');
});

test('issue draft URL is privacy safe and prefilled', async ({ page }) => {
  await page.goto('/?private-room-code=123456#secret');
  const result = await page.evaluate(() => {
    document.querySelector('#profileHandle').textContent = '@privacy_tester';
    document.querySelector('#profileName').textContent = 'Privacy Tester';
    const report = window.CritterIssueAPI.buildReport({
      type: 'bug',
      title: 'Test report',
      category: 'Other',
      details: 'Visible problem',
      diagnostics: true
    });
    const url = new URL(window.CritterIssueAPI.createDraftUrl(report));
    return {
      path: url.pathname,
      title: url.searchParams.get('title'),
      body: url.searchParams.get('body')
    };
  });
  expect(result.path).toBe('/markhitchk/critter-extraction/issues/new');
  expect(result.title).toContain('[Bug]');
  expect(result.body).toContain('Visible problem');
  expect(result.body).toContain('Username: @privacy_tester');
  expect(result.body).not.toContain('localStorage');
  expect(result.body).not.toContain('123456');
  expect(result.body).not.toContain('secret');
  expect(result.body).not.toContain('test-access-token');
});

const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');

const repositoryRoot = path.resolve(__dirname, '../..');

module.exports = defineConfig({
  testDir: '.',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tools/static-server.mjs',
    cwd: repositoryRoot,
    port: 4173,
    reuseExistingServer: true
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});

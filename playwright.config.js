// Playwright-tester mot en lokal PHP-server med syntetisk testdata (se e2e/fixture.js).
// Testdatan skapas här, en gång i huvudprocessen, eftersom webbservern startar före globalSetup;
// arbetsprocesserna ärver AKTIER_E2E_DIR och läser samma fixtur.
const path = require('node:path');
const {defineConfig, devices} = require('@playwright/test');
const {createFixture, newFixtureDir} = require('./e2e/fixture');

if (!process.env.AKTIER_E2E_DIR) {
  process.env.AKTIER_E2E_DIR = newFixtureDir();
  createFixture(process.env.AKTIER_E2E_DIR);
}
const PORT = 8766;

module.exports = defineConfig({
  testDir: 'e2e',
  globalTeardown: require.resolve('./e2e/global-teardown'),
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    trace: 'retain-on-failure',
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
  webServer: {
    command: `php -S 127.0.0.1:${PORT} -t public`,
    url: `http://127.0.0.1:${PORT}/login.php`,
    cwd: __dirname,
    env: {AKTIER_CONFIG: path.join(process.env.AKTIER_E2E_DIR, 'config.php')},
    reuseExistingServer: false,
    timeout: 20000,
  },
});

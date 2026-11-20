## 1. Setup

- [x] 1.1 Add `package.json` (private, script `test:e2e` = `playwright test`, devDependency `@playwright/test`); run `npm install` and `npx playwright install chromium`; add `node_modules/`, `test-results/` and `playwright-report/` to `.gitignore`
- [x] 1.2 Add `playwright.config.js`:
  - Chromium project
  - `testDir: 'e2e'`
  - creates the fixture once (because the web server starts before global setup)
  - global teardown
  - `webServer` on `127.0.0.1:8766` with `AKTIER_CONFIG` from the fixture

## 2. Fixture

- [x] 2.1 `e2e/fixture.js`:
  - temp directory
  - random password hashed with PHP
  - `config.php`
  - synthetic `aktier.csv` (3 `.ST` stocks), `aktiekop.csv` (2 purchases and 1 sale) and `aktievy.json`
  - fresh cache files
  - shared JSON with password and paths
- [x] 2.2 `e2e/global-teardown.js` removes the temp directory

## 3. Tests

- [x] 3.1 `e2e/smoke.spec.js` with a shared offline guard and console-error collector:
  - redirect to login
  - wrong password shows an error
  - login opens the app
  - chart traces, legend rows and sort buttons are present
  - `api/history.php` returns `needed: []`
  - the held stock shows `%/mån` and `%/år`
  - logout
  - phone viewport without horizontal scroll
- [x] 3.2 README section "Tester": how to install (`npm install`, `npx playwright install chromium`) and run (`npm run test:e2e`), and that the tests use synthetic data and never touch `private/data`

## 4. Kontroll

- [x] 4.1 Run `npm run test:e2e`:
  - all tests pass, twice in a row
  - break something on purpose (for example a wrong password in the test) to see a failure, then restore it
  - confirm with `shasum -c` that `private/data` is untouched
  - confirm that `./deploy.sh -n` lists no new files from `e2e/`, `node_modules/` or the root config files
- [x] 4.2 Write `verification.md`; `php private/tests/run.php` and `openspec validate add-playwright-smoke-tests --strict` pass

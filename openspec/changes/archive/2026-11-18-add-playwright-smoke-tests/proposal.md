## Why

The app is checked by PHP unit tests (`private/tests/run.php`) and by manual browser checks for each change. Nothing automatically catches a page that no longer loads, a broken login, or a JavaScript error after an edit to `chart.js` or `panel.js`.

A small set of Playwright smoke tests run locally before `./deploy.sh` would catch those breaks in about a minute. The tests use synthetic data and no network, so they give the same result every time and never touch the real `private/data`.

## What Changes

- **Playwright setup** (`@playwright/test`, Chromium only) as a local development tool:
  - `package.json`, `playwright.config.js` and an `e2e/` folder at the repository root
  - run with `npm run test:e2e`
- **Per-run fixture:** `playwright.config.js` creates a temporary data directory with:
  - a test `config.php` holding a password hash for a random test password
  - a synthetic `aktier.csv` with three Swedish stocks
  - a few transactions in `aktiekop.csv`
  - a fresh daily price cache for each stock, so the app never needs Yahoo

  It is removed after the run.
- **PHP server:** Playwright starts `php -S 127.0.0.1:<port> -t public` with `AKTIER_CONFIG` pointing to the fixture config.
- **Smoke tests:**
  - `index.php` without a session redirects to `login.php`
  - a wrong password shows an error
  - the right password opens the app
  - the chart draws one curve per fixture stock, the legend lists the stocks, and the sort buttons are present
  - a held stock shows `%/mån` and `%/år` in the legend
  - no console errors and no request leaves `127.0.0.1`
  - logout returns to the login page
  - at a phone viewport (390 px) the page loads without horizontal scrolling
- **Ignore and docs:**
  - `.gitignore` gets `node_modules/`, `test-results/` and `playwright-report/`
  - the README gets a short "Tester" section

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The app's behavior is unchanged, so no requirement in the `aktiediagram` spec changes, and the change is marked `skip_specs`.

## Impact

- **New files:** `package.json`, `package-lock.json`, `playwright.config.js`, `e2e/fixture.js`, `e2e/global-teardown.js`, `e2e/smoke.spec.js`.
- **Changed files:** `.gitignore` and `README.md`.
- **Dependencies:** a Node.js development dependency (`@playwright/test`) and the Playwright Chromium download on the developer's machine. No Python. Nothing is added to the hosted app.
- **Deploy:** `deploy.sh` uploads only `public/` and `private/`, so none of these files reach the web host.
- **App code:** unchanged.

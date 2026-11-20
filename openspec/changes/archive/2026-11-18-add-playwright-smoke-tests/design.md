## Context

See proposal.md for the motivation and scope.

- **Login:** `index.php` calls `Auth::requirePageLogin()`, which redirects to `login.php` without a session. The login form posts the password, and a failure shows `p.login-error`.
- **Config:** `app_config()` reads `getenv('AKTIER_CONFIG')` before `private/config.php`. The local unit tests and manual checks already use this to point at a temporary data directory. `require_https => false` and `login_delay_seconds => 0` make local logins quick.
- **Startup data flow:** `app.js` calls `GET api/history.php`, which lists the symbols needing history. It fetches those, then calls `api/chart.php`.
  - `Market::symbolsNeedingHistory` skips a symbol when its cache has `full_fetched_at` less than 20 h old and either reaches the latest closed date or has `checked_at` less than 30 minutes old.
  - The cache format is `{dates, close, full_fetched_at, checked_at}` in `data/cache/<symbol>.json`.
- **No Yahoo at start:** without `last_solo` there is no minute fetch at start. With only `.ST` stocks and SEK transactions, no FX symbol is needed.
- **Deploy:** `deploy.sh` uploads files under `public/` and `private/` only.

## Goals / Non-Goals

**Goals:**
- One command (`npm run test:e2e`) that starts the app on synthetic data and runs the smoke tests offline in Chromium.
- Never read or write `private/data` or `private/config.php`.

**Non-Goals:**
- No tests of solo/minute chart, import, CSV download, transaction registration or scale modes. Those may come in a later change.
- No CI setup.
- No other browsers.
- No change to app code.

## Decisions

### Layout outside `public/` and `private/`
- The tests live in `e2e/`, with `package.json` and `playwright.config.js` at the repository root.
- They are local development tools only. This follows the project's no-Python and hosting rules, because nothing here runs on one.com, and `deploy.sh` never sees them.

### Fixture created per run, before the web server starts
- Playwright starts `webServer` before `globalSetup`. Found during implementation in `createGlobalSetupTasks`, where plugin setup runs first.
- So the fixture is created in `playwright.config.js` itself, once in the main process: when `AKTIER_E2E_DIR` is unset, it calls `e2e/fixture.js` `createFixture()` and sets the variable. The workers inherit it and only read the fixture.
- **`e2e/fixture.js`** (Node):
  - creates `fs.mkdtemp(os.tmpdir()/aktier-e2e-)`
  - generates a random test password and hashes it with `php -r 'echo password_hash(...)'` through `execFileSync`, so the hash format matches the app's
  - writes `config.php` (`password_hash`, `data_dir`, `session_dir`, `require_https => false`, `login_delay_seconds => 0`)
  - writes `aktier.csv` with three `.ST` stocks, all visible
  - writes `aktiekop.csv` with two purchases and one sale, so one stock shows a monthly and an annual percent
  - writes `aktievy.json` with a date range
  - writes a cache file per stock: business days from two years ago to today, a smooth synthetic price, and `full_fetched_at`/`checked_at` set to now
  - writes `fixture.json`, with the password, the stocks and the held stock, for the tests
- **`e2e/global-teardown.js`** removes the directory. It only removes a directory named `aktier-e2e-*` under the system temp directory.
- *Alternative:* a fixture folder checked into the repository. It was rejected because the cache timestamps must be fresh on every run.

### Web server from Playwright
- `playwright.config.js` sets `webServer: {command: 'php -S 127.0.0.1:8766 -t public', env: {AKTIER_CONFIG: …}}`.
- It uses a port separate from the manual checks (8765) and `reuseExistingServer: false`, so a stray manual server is never reused.
- The config path is decided before the server starts, because the config file creates the fixture and sets `process.env.AKTIER_E2E_DIR`.

### Offline guard
- Each test routes every request whose host is not `127.0.0.1` to `abort()` and records it. A test fails if any were attempted.
- Server-side Yahoo calls are prevented by the fresh caches, and the test asserts that `api/history.php` returns `needed: []`.

### Assertions read app state, not pixels
- Chart: `.plotly-graph-div` data has one `meta.role === 'stock'` trace per fixture stock.
- Legend: `.stock-legend-row` count, the three sort buttons, and `%/mån` and `%/år` text for the held stock.
- Phone: viewport 390×844, then `document.documentElement.scrollWidth <= innerWidth`.
- Console: `page.on('console')` errors and `pageerror` are collected and must be empty.

## Risks / Trade-offs

- [The Playwright Chromium download is about 150 MB on the developer's machine] → It is a one-time `npx playwright install chromium`, documented in the README.
- [The cache rules change and the app starts fetching] → The `needed: []` assertion fails with a clear message.
- [`php` not on PATH] → Global setup fails early with a message.
- [The phone viewport differs from a real iPhone] → It is a smoke test only. Manual checks stay part of each change.

## Why

Solo and the minute chart are the parts of the app that change most often: auto-solo at start, restore on uncheck, the breakeven line, transaction markers, the pinned point and the CSV archive. The smoke tests from `add-playwright-smoke-tests` don't touch them, so a break there is only found by a manual check.

## What Changes

- **Synthetic minute data in the fixture (`e2e/fixture.js`):**
  - one-minute prices for the held test stock (`ALFA.ST`) on the last ten business days, 09:00–17:29 Swedish time
  - written as the app's minute cache, so `api/intraday.php` never calls Yahoo
  - one purchase with a time inside that window, so the minute chart has a marker
- **Fresh state for every test.** A helper resets `aktier.csv`, `aktievy.json` and the minute cache (`fetched_at` set to now) before each test. A test that toggles visibility or solo cannot affect the next one, and the five-minute minute cache never expires during a long UI-mode session.
- **New spec `e2e/solo.spec.js`:**
  - checking solo shows only that stock, opens the minute chart titled `Alfa Test – minutkurser` with the status `Senaste kurs …`, and saves `last_solo`
  - the minute chart shows the `Nollpunkt` line for the held stock and a purchase marker
  - `Vecka` and `Månad` change the visible range
  - clicking a point pins it: the popup shows time and price, `▶` moves one minute, and `Esc` closes it
  - `Ladda ner CSV` downloads an archive with the `time;close;currency` header
  - `Resultat` and `Transaktioner` are filtered to the solo stock
  - unchecking solo restores the earlier stocks, hides the minute chart and clears `last_solo`
  - a reload with `last_solo` set starts in solo; a reload after unchecking does not
  - a legend click during solo ends solo
  - the minute chart is first on the page at phone width
- **Shared helpers** (login, waiting for the app, offline guard, console errors) move from `smoke.spec.js` to `e2e/helpers.js`, and both specs use them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The app's behavior is unchanged, so the change is marked `skip_specs`.

## Impact

- **New files:** `e2e/solo.spec.js` and `e2e/helpers.js`.
- **Changed files:** `e2e/fixture.js` (minute cache, one more transaction, reset helper), `e2e/smoke.spec.js` (uses the helpers) and the README test section.
- **App code, dependencies and deploy:** unchanged. `deploy.sh` does not upload `e2e/`.

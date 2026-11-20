## Context

See proposal.md for the scope.

- **Minute data:** `Market::fetchMinutes($symbol)` returns `data/cache/minutes-<symbol>.json` when its `fetched_at` is less than 300 s old. Otherwise it calls Yahoo.
  - The cached shape is `{currency, times: ['Y-m-d H:i' Swedish time], close, warnings: [], fetched_at}`.
  - `api/intraday.php` adds `sekRate`, which is null for SEK, and appends complete data to `data/intraday/<symbol>.csv`, leaving out the current minute.
- **Solo state:**
  - `last_solo` is stored in `aktievy.json`.
  - Visibility is stored in `aktier.csv`, and a legend click writes it.
  - Both files live in the fixture's data directory.
- **The current fixture** (`e2e/fixture.js`, created once per run in `playwright.config.js`) has three `.ST` stocks and fresh daily caches. `ALFA.ST` has two purchases and one sale, all more than 30 business days back, so none lands in the minute window.
- **Minute chart DOM:**
  - `#intraday-panel` (hidden until solo), `#intraday-title`, `#intraday-status`
  - `#intraday-range` buttons `Vecka`/`Månad` with `aria-pressed`
  - `#intraday-download` (`Ladda ner CSV`) and `#intraday-archive`
  - `#intraday-pin` with `#intraday-pin-time`, `#intraday-pin-price` and `#intraday-pin-prev`/`-next`/`-close`
  - the Plotly graph inside the panel
- **List filter:** `#filter-solo-lists` is checked by default.

## Goals / Non-Goals

**Goals:**
- Test solo and the minute chart offline and deterministically.
- Keep tests independent of their order.

**Non-Goals:**
- No visual or pixel comparison.
- No measure modes or log scale in the minute chart.
- No change to app code.

## Decisions

### Minute series in the fixture
- `createFixture` writes `minutes-ALFA.ST.json` with every minute 09:00–17:29 on the last ten business days up to today. It uses a smooth price near the last daily close, with `currency: 'SEK'` and `warnings: []`.
- If today is a business day and it is earlier than 17:29, minutes only run up to the current minute, so no minute lies in the future.
- **Purchase marker:** one purchase of `ALFA.ST` three business days ago at 10:15 (`time` column `10:15`) is added to `aktiekop.csv`. The smoke test's `%/år` check still holds.
- **Wording:** the existing smoke assertions on names, traces and the history check are unaffected.

### Reset before each test
- **`resetState()`** in `fixture.js` rewrites `aktier.csv` (all visible), `aktievy.json` (date range and no `last_solo`) and the minute cache with `fetched_at = now`. It deletes `data/intraday/`.
- Both specs call it in `beforeEach`. `workers: 1` stays, so no two tests share the files at once.
- *Alternative:* a fresh fixture per test. It was rejected because the web server's config path is fixed for the run.

### Shared helpers
- `e2e/helpers.js` exports `login`, `waitForApp`, `useStandardGuards` (offline route and console-error collection, checked in `afterEach`) and `readView()`, which reads `aktievy.json` from the fixture. `smoke.spec.js` switches to them without changing its tests.

### Assertions through the DOM and app state
- **Solo state:** `window.getSoloTicker()` and `window.getVisibleTickers()`, plus the legend checkbox.
- **Minute chart:**
  - the title text and the status text (`/^Senaste kurs \d{4}-\d{2}-\d{2} \d{2}:\d{2}: [\d\s]+,\d{2} kr/`)
  - the shape and annotation in the panel's Plotly layout, with an annotation text starting with `Nollpunkt`
  - a trace with the purchase marker (`meta.role` or name, read from the graph data)
- **Range:** the x-axis range span after clicking `Vecka` (≤ 7 days) and `Månad` (> 7 days).
- **Pinned point:** clicking the middle of the plot area through `page.mouse`, then expecting `#intraday-pin` to be visible. `▶` changes `#intraday-pin-time` to a later minute, and `Escape` hides the popup.
- **Download:** `page.waitForEvent('download')` after clicking the link, then the first line of the file is read.
- **Phone:** viewport 390×844, then the panel's `getBoundingClientRect().top` is less than the main chart's.

## Risks / Trade-offs

- [Clicking a point depends on Plotly's hover distance] → The click is placed on the plot's center, where a line point is always within `hoverdistance`. The test reads the pinned time instead of assuming one.
- [A run that spans midnight or 17:29 changes "today"] → The fixture is built from the clock at the start of the run, and the cache is only refreshed, not rebuilt. An odd boundary run can only lose the last minute.
- [App DOM ids change] → The tests then fail clearly, which is the point. The ids used are listed here.

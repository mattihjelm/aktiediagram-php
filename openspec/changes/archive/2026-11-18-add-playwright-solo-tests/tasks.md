## 1. Fixture and helpers

- [x] 1.1 In `e2e/fixture.js`:
  - write the minute cache for `ALFA.ST` (last ten business days, 09:00–17:29, not past the current minute)
  - add the purchase three business days ago at 10:15
  - add `resetState()` (aktier.csv, aktievy.json, minute cache `fetched_at` now, remove `data/intraday/`)
- [x] 1.2 Add `e2e/helpers.js` with `login`, `waitForApp`, `useStandardGuards` and `readView`; switch `e2e/smoke.spec.js` to them and call `resetState()` before each test; the smoke tests still pass

## 2. Tests

- [x] 2.1 `e2e/solo.spec.js`:
  - solo shows only the stock, opens the minute chart (title and `Senaste kurs` status) and saves `last_solo`
  - `Nollpunkt` line and purchase marker
  - `Vecka`/`Månad`
  - pinned point with `▶` and `Esc`
  - `Ladda ner CSV` header
  - lists filtered to the solo stock
  - unchecking restores visibility, hides the panel and clears `last_solo`
  - start in solo from `last_solo`, and no solo after unchecking and reloading
  - a legend click ends solo
  - phone width: minute chart above the main chart
- [x] 2.2 README: mention that the tests also cover solo and the minute chart

## 3. Kontroll

- [x] 3.1 Run `npm run test:e2e` twice; all tests pass in both runs. Then:
  - run `solo.spec.js` alone and the smoke tests alone, to show the tests don't depend on order
  - break one assertion on purpose to see a failure, then restore it
  - confirm with `shasum -c` that `private/data` is untouched
  - confirm that `./deploy.sh -n` lists nothing from `e2e/`
- [x] 3.2 Write `verification.md`; `php private/tests/run.php` and `openspec validate add-playwright-solo-tests --strict` pass

## Why

The user wants the app to open the way they left it on every screen size. If a stock was solo when they left, it should be solo again at the next start, with its minute chart. Unchecking solo should bring back the stocks they had chosen before.

Today the saved solo stock (`last_solo` in `aktievy.json`) is selected automatically only in the phone layout. Unchecking solo does not clear it, so a phone always opens in solo, even when the user left the page without solo. Unchecking solo already restores the visibility from before the solo choice. That restore also works after an automatic solo at start, because solo never changes the visibility saved in `aktier.csv`.

## What Changes

- At page load on every screen size, the stock in `last_solo` is selected as solo when it is a stock in `aktier.csv`. Its minute chart is shown and the lists are filtered as for a manual solo.
- When solo ends, `last_solo` is cleared in `aktievy.json`, so the next start shows the chosen stocks without solo. Solo ends when the user unchecks it, and also when they click a stock name in the legend while solo is active. Choosing solo for another stock replaces the value as today.
- Unchecking solo after an automatic solo at start restores the stocks visible before it, which are the ones saved as visible in `aktier.csv`. This is today's restore behavior, now covered by a scenario.
- `api/view-range.php` accepts `last_solo: null` to clear the value.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`:
  - "Senast valda solo-aktie": the value is cleared when solo ends, and it is restored at start on every screen size.
  - "Layout på telefon": the automatic solo is no longer phone-only, so the "Bred skärm" scenario and the closing sentence change.

## Impact

- **Server:**
  - `public/api/view-range.php`: accept null.
  - `private/src/Chart.php` `saveView` docs.
  - `private/tests/run.php`
- **Browser:** `public/assets/chart.js` handles auto-solo at start without the phone check, and saves null when solo ends.
- **Data:** `aktievy.json` may contain `"last_solo": null`. `Chart::lastSolo` already ignores non-strings. The `aktier.csv` and `aktiekop.csv` formats are unchanged.

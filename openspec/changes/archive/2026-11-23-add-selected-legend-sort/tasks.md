## 1. Server

- [x] 1.1 In `private/src/Chart.php`:
  - add `'selected'` to `LEGEND_SORTS`
  - add `legend_selected` to `saveView()`'s key order after `legend_sort`
  - add `Chart::legendSelected(array $seriesKeys): ?array`, which drops unknown keys and duplicates
  - pass it as `meta.legendSelected` when it is set

  Add unit tests in `private/tests/run.php` for:
  - saving `legend_sort` `selected` and reading it back
  - key order with `legend_selected` present, with the other keys kept
  - filtering unknown keys and duplicates
  - a missing key versus an empty list

  Verify with `php private/tests/run.php`.
- [x] 1.2 In `public/api/view-range.php`, accept `legend_selected` as a list of series keys validated like `last_solo`. Reject non-lists, non-strings, unknown tickers, bad accounts and lists that are too long with 400. Add unit or API tests for valid and invalid payloads.

## 2. Browser

- [x] 2.1 In `public/assets/chart.js`:
  - add `['selected', 'Valda']` to `LEGEND_SORTS`
  - keep `legendSelected` from `meta.legendSelected`
  - in `setLegendSort('selected')`, create the group from the visible securities in the current display order when none is saved, and save `legend_sort` and `legend_selected` together
  - in `legendEntries()`, order the group first and the rest in `aktier.csv` order

  Verify with Playwright that:
  - the button is pressed
  - the visible securities are on top
  - `aktievy.json` holds both keys
  - the order survives a reload
- [x] 2.2 In `toggleSeries()`, while `legendSort === 'selected'`, append newly shown securities last in the group and remove hidden ones, then save `legend_selected`. Also do this when the click ends solo. Leave `setSolo()` unchanged. Verify with Playwright that:
  - showing a hidden security moves it to the end of the group
  - hiding one moves it down
  - solo leaves `legend_selected` unchanged
  - under another sort, toggles leave the group unchanged, and the next `Valda` click restores it

## 3. Verification

- [x] 3.1 Run the full unit and Playwright suites, and update the expectations that list five sort buttons. All must pass, including at phone width without sideways scroll.
- [x] 3.2 Manual check in the running app on a scratch copy of the real data, with the real `private/data` checked by `shasum -c` before and after:
  - `Valda` gathers the shown securities at the top
  - switching to `Total %` and back keeps the group
  - showing and hiding under `Valda` moves securities as specified
  - no console errors

  Record the results in `verification.md`.
- [x] 3.3 Run `openspec validate add-selected-legend-sort --strict` and confirm it is valid.

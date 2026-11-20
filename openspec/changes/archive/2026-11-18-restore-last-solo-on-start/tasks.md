## 1. Server

- [x] 1.1 In `public/api/view-range.php`, accept `last_solo: null` and store it; reject other non-ticker values as today; update the `saveView` docblock in `private/src/Chart.php`
- [x] 1.2 Tests in `private/tests/run.php`: `saveView(['last_solo' => null])` keeps the other keys and `lastSolo()` returns null; verify with `php private/tests/run.php`

## 2. Webbläsare

- [x] 2.1 In `public/assets/chart.js`:
  - remove the phone-only condition for the automatic solo at start, and update the comments
  - call `saveLastSolo(null)` when solo is unchecked and when a legend click ends solo

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data, at desktop width and at phone width:
  - with `last_solo` set, the page starts in solo with the minute chart
  - unchecking solo shows the stocks visible in `aktier.csv`, and `aktievy.json` has `last_solo: null`
  - reloading starts without solo
  - choosing solo and reloading starts in solo again
  - a legend click during solo ends solo and clears `last_solo`
  - `aktier.csv` visibility is unchanged by solo
  - no console errors
- [x] 3.2 Write `verification.md`; confirm that `private/data` is untouched; `php private/tests/run.php` and `openspec validate restore-last-solo-on-start --strict` pass

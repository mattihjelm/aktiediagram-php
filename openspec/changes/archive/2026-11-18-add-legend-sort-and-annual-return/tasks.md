## 1. Server

- [x] 1.1 In `public/api/view-range.php`, accept `legend_sort` (`none`, `name` or `monthly`) and reject other values; in `private/src/Chart.php`, add `legend_sort` to the `saveView` key order and `meta.legendSort` (only valid values)
- [x] 1.2 Tests in `private/tests/run.php`:
  - `legend_sort` is saved last and keeps the other keys
  - `meta.legendSort` is absent for an invalid saved value
  - verify with `php private/tests/run.php`

## 2. Webbläsare

- [x] 2.1 In `public/assets/chart.js` `refreshProfitLabel`:
  - store `meta.monthlyPercent` (number or null)
  - append `· <signed>%/år` from `(1 + m)^12 − 1` when the monthly value exists and is above −100
- [x] 2.2 In `public/assets/chart.js` `renderCustomLegend`:
  - add the buttons `Osorterad`, `Namn` and `%/mån` in the header, with `aria-pressed`
  - order the rows by the chosen sort (Swedish collation for names; highest monthly first, missing last, ties in `aktier.csv` order)
  - save the choice through `api/view-range.php`
  - start from `meta.legendSort`
- [x] 2.3 Styles in `public/assets/app.css` for the button group and the active button, at desktop and phone width

## 3. Kontroll

- [x] 3.1 Manual check on a copy of the data, at desktop and phone width:
  - the three orders are correct (compare the `%/mån` order with the labels; names with Å, Ä and Ö last)
  - the active button is marked
  - a reload keeps the order
  - `aktier.csv` and the curves are unchanged
  - the annual percent matches `(1 + m)^12 − 1` for two stocks
  - no annual percent for `—/mån`
  - solo and visibility toggling still work in a sorted legend
  - no console errors
- [x] 3.2 Write `verification.md`; confirm that `private/data` is untouched; `php private/tests/run.php` and `openspec validate add-legend-sort-and-annual-return --strict` pass

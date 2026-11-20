## 1. Webbläsare

- [x] 1.1 In `public/assets/app.css`:
  - make the legend about 20 % wider and its text about 20 % larger outside the phone layout
  - darken the return line to `#2b3646`
  - make sure the phone layout stays at 13 px
- [x] 1.2 In `public/assets/chart.js` `refreshProfitLabel`: move the total to the end in thousands with one decimal (`kkr` for kronor, `k<valuta>` otherwise)

## 2. Tester

- [x] 2.1 Update the `%/år` pattern in `e2e/smoke.spec.js` to the new order with `kkr` last; `npm run test:e2e` passes

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data:
  - desktop: the legend width and font sizes are as specified, and the chart still fits
  - phone width: 13 px text and no horizontal scroll
  - the label order and `kkr`, `kUSD` and `kEUR` for one stock each, compared with the old total
  - `—/mån` stocks
  - sorting on `%/mån` unchanged
  - no console errors
- [x] 3.2 Write `verification.md`; confirm that `private/data` is untouched; `php private/tests/run.php` and `openspec validate widen-legend-and-total-kkr --strict` pass

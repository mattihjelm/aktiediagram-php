## 1. Senast valda solo-aktie

- [x] 1.1 In `private/src/Chart.php` and `public/api/view-range.php`, add `last_solo` to `aktievy.json` (written last, kept when other keys change, validated against `aktier.csv`) and pass it as `meta.lastSolo` when the stock exists; in `public/assets/chart.js`, save it when solo is selected; add tests in `private/tests/run.php` for saving, keeping other keys, and an unknown ticker being ignored; verify with `php private/tests/run.php`

## 2. Diagrammet på alla skärmar

- [x] 2.1 Hide the linear y-axis title (`Chart.php` layout and `linearYAxisTitle`), move the end labels inside the plot (`xanchor: 'right'`, short leader line to the left) and reduce `margin.r`; verify in the browser on a copy of the data that labels sit inside the plot without overlapping, the leader lines point to the end points, the plot is wider, and log/measure titles are still shown

## 3. Telefonlayout

- [x] 3.1 Add the `@media (max-width: 600px)` CSS (minute chart first, then chart/legend, form, tables; 13 px text; no 92 px indents) and the load-time auto-solo of `last_solo` on phone width in `chart.js`; verify in the browser with the phone rules applied at a ~390 px page width, with and without a saved `last_solo`, and that desktop width does not auto-select solo

## 4. Uppföljning efter test på iPhone

- [x] 4.1 Use the phone query `(max-width: 600px), (pointer: coarse) and (max-height: 500px)` in CSS and for the auto-solo; in phone layout hide the minute chart's y-axis title, use a smaller left margin, and set both charts' axis tick fonts to 30 % of the default; reapply on orientation change; verify in a phone-width popup window that the title is gone and the tick fonts are about 4 px, and on desktop that nothing changed

## 5. Kontroll

- [x] 5.1 Manual check on a copy of the data: no horizontal page scroll on the phone width, minute chart features (pin, markers, break-even) still work at the top, desktop unchanged apart from the labels/title/margin; write `verification.md`; confirm that `private/data` is untouched; then `php private/tests/run.php` and `openspec validate improve-phone-layout --strict` pass

## 6. Andra uppföljningen

- [x] 6.1 Halve the page and minute-chart titles in the phone layout; move the archive text into its own span after `Ladda ner CSV` on the same row with the format `Arkiv: <first> – <last>, <n> nya.` (no minute count); show `Senaste kurs <time>: <price> <currency>` in the status line; verify in the browser (desktop and phone-width popup) and record the results in `verification.md`; then `php private/tests/run.php` and `openspec validate improve-phone-layout --strict` pass

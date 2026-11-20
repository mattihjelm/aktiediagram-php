## 1. Popup och markering

- [x] 1.1 Add the `#intraday-pin` popup markup (time, price, `◀`/`▶`/`×` buttons) inside `#intraday-panel` in `public/index.php` and its styles in `public/assets/app.css`; verify it is hidden by default and does not change the panel layout
- [x] 1.2 In `public/assets/intraday.js`, add pin state, a marker trace and vertical line shape, and popup positioning via the axis conversion with edge flipping; pin on `plotly_click` on the price trace; verify in the browser that clicking a point shows the marker and a popup with the matching time and price that stays when the pointer leaves

## 2. Stegning och stängning

- [x] 2.1 Add stepping by index from `◀`/`▶` and ArrowLeft/ArrowRight (document `keydown`, ignored in form fields, `preventDefault`), with disabled buttons at the first and last minute, `Esc`/`×` to close, and panning with the same range width when the pin leaves the visible range; verify in the browser stepping within a day, across a night/weekend, at the ends, and past the edge after a zoom
- [x] 2.2 Keep or close the pin on `Vecka`/`Månad` depending on whether its time is in the new range, close it in `showIntraday`/`hideIntraday`, and reposition the popup after zoom and resize; verify in the browser together with solo switch and solo off

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data: pin, step with keys and buttons, hover still works while pinned, arrow keys in the date fields and the transaction form are unaffected, main chart click-to-compare still works, narrow layout; then `php private/tests/run.php` and `openspec validate add-intraday-pinned-point --strict` pass

## 1. Persistence

- [x] 1.1 Add `Chart::viewSettings()` and make saving the view a read-modify-write under `LOCK_EX` that preserves the other keys (`start`, `end`, `log_scale`) in `aktievy.json`, and verify with tests in `private/tests/run.php` that a file with only `start`/`end` gives `log_scale` false and is byte-identical after a date save, and that saving the date keeps `log_scale` and vice versa
- [x] 1.2 Extend `api/view-range.php` with an optional `log_scale` (bool, validated) that updates only the keys sent, and verify with `curl` that a CSRF-protected POST changes the file and a non-bool value gives 400 without changing the file
- [x] 1.3 Set `layout.yaxis.type` and pass the setting to the figure in `Chart.php`/`api/chart.php`, and verify that `api/chart.php` returns `log` when the file has `log_scale: true`

## 2. Chart

- [x] 2.1 Introduce an axis-unit helper in `chart.js` and use it for `targetYRange` in `rebaseToVisibleStart` and `refreshVisibleView`, in `comparisonOverlays` and in `handleGraphClick`, and verify that the linear axis behaves exactly as before
- [x] 2.2 Add the checkbox `Logaritmisk skala` to the right of the start/end fields in `panel.js` and `app.css`; on change, relayout `yaxis.type`, run `refreshVisibleView` and save through `api/view-range.php`
- [x] 2.3 Verify manually in the running app: toggling log on and off, changing the date range on the log scale, end labels not overlapping, clicking a curve selecting the right one, comparisons and hover showing index values, a reload keeping the choice, and the layout on a narrow window
- [x] 2.4 Give each stock its own hidden log axis with a common span set by the most varying visible stock, and verify in the running app that the span follows date-range and visibility changes, that comparisons and end labels sit on the right curve, and that linear mode keeps the shared axis

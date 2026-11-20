## 1. Server

- [x] 1.1 In `private/src/Chart.php`, keep markers without a price on or before their date with `chart_price` null and null y in the purchase trace; add a test in `private/tests/run.php` if a price series can be set up there (otherwise verify in the browser); verify with `php private/tests/run.php`

## 2. Webbläsare

- [x] 2.1 In `public/assets/chart.js` (purchase y in `rebaseToVisibleStart`) and `public/assets/panel.js` (imported markers), keep y null for a null chart price; verify in the browser on a copy of the data with the fund's row in `aktier.csv` and test transactions before its price history in `aktiekop.csv`, in linear, log and a measure mode

## 3. Kontroll

- [x] 3.1 Manual check on a copy of the data: the fund's events before its price history are listed and counted in `Resultat` (compare quantity and GAV with a hand calculation from `aktiekop.csv`), no marker before the history starts, markers from then on; list any other stocks whose totals changed; write `verification.md`; confirm that `private/data` is untouched; then `php private/tests/run.php` and `openspec validate show-transactions-before-price-history --strict` pass

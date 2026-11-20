## 1. Vyinställning

- [x] 1.1 Extend `Chart::SCALES` with `drawdown`, `change63`, `log_drawdown`, `log_change63` and make `Chart::isLogScale` true for `log` and every `log_*` value; add tests in `private/tests/run.php` for saving and reading the new values and `log_scale` being true for `log_drawdown`; verify with `php private/tests/run.php`

## 2. Mått i diagrammet

- [x] 2.1 In `public/assets/chart.js`, generalise the deviation code into measures: `parseScale`, a `MEASURES` table (`ma200`, `drawdown`, `change63` with series, title and hover label), `measureSeries`/`measureAt` cached per trace and measure, `measureOnly()`/`measureOverlay()` replacing the `ma200`/`log_ma200` checks, and the overlay traces renamed to `measure` with their `y`, hover and axis title switched with the measure; verify in the browser that ma200 and log+ma200 behave as before and that drawdown and change63 values match an independent computation for BRK-B and a Swedish stock, alone and with log
- [x] 2.2 In `public/assets/panel.js`, add the `Fall från tidigare topp` and `Förändring över 3 månader` checkboxes and the rule that a measure clears `Linjär` and the other measures; verify in the browser each switch between measures with and without `Logaritmisk`, and that the choice is restored after a reload

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data: BRK-B's 2020 fall from the top, hover text and axis title per measure, markers and a comparison in drawdown mode, the first 63 days empty in change63, the break-even line hidden for a measure alone and shown with log; repeat the key checks from the deviation change; write `verification.md`; confirm that `private/data` is untouched; then `php private/tests/run.php` and `openspec validate add-drawdown-and-change-measures --strict` pass

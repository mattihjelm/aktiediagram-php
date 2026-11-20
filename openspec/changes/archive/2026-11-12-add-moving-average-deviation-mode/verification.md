## Verification

Results of the checks in tasks.md for `add-moving-average-deviation-mode`, run on 2026-11-12.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a fresh copy of `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory. The real `private/data` was never used.
- **Market data:** live Yahoo Finance history, through the app's normal cache.
- **Browser:** Chrome, driven through the browser automation tools. Values were read from the Plotly data and layout. Hover and comparison were checked with real mouse events and screenshots.

### Results – round 1 (selector, deviation only)

These checks were run with the first version, which had a `Skala` select. Rows 1 and 11 refer to that select; the round 2 table below covers the checkboxes that replaced it.

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Selector replaces the checkbox | `Skala` with `Linjär`, `Logaritmisk`, `Avvikelse från 200-dagars medel`. A view without a scale setting gives `Linjär` | Options as listed, value `linear` | ✓ |
| 2 | Switch to ma200 | Shared linear axis titled `Avvikelse från 200-dagars medel (%)`, ticks with ` %`, a 0 % line, hover `Avvikelse: %{y:+.1f} %`, no reload | All as expected | ✓ |
| 3 | Deviation values (BRK-B, full history) | Equal to an independent computation `(p / mean(last 200 p) − 1) × 100` over `customdata[0]` | Largest absolute difference 5.8e-13 | ✓ |
| 4 | First 199 days | No value | 199 nulls (2010-01-04 …), first value on 2010-10-18 | ✓ |
| 5 | Independent of the visible range | No y-value changes when the range goes from 2019-06-01 to 2024-01-01; only the axis refits | 0 values changed. y-range −51.27…81.68 → −26.29…80.49 | ✓ |
| 6 | BRK-B dips on one scale | The 2020 and 2025 dips are shown at their size relative to the moving average | 2020 minimum −17,8 % (2020-06-11), 2025 minimum −11,0 % (2025-08-04). See note 1 | ✓ |
| 7 | Transaction markers (a Swedish holding) | Each marker at the stock's deviation on its date | Every marker equal to the stock curve's value on its date | ✓ |
| 8 | Endpoint label | At the last visible point's deviation | The stock's label at 2026-10-21 (the visible end), at the curve's last deviation | ✓ |
| 9 | Break-even line with the holding solo | Hidden in ma200, shown again in linear and log | ma200: none. Linear and log: `Nollpunkt …` | ✓ |
| 10 | Linear and log after switching back | As before the change | Linear: title `Index (100 = synligt startdatum)`, no suffix, index hover. Log: `Egen logaritmisk skala per kurva`, log axis, index hover. No 0 % line | ✓ |
| 11 | Persistence | `aktievy.json` gets `scale` after `log_scale`, and a reload restores ma200 | `{"start": …, "end": …, "log_scale": false, "scale": "ma200"}`. After a reload the selector is `ma200` and the axis title is the deviation title | ✓ |
| 12 | Hover with a real mouse (ma200) | Date, price and deviation per stock | For example `<datum>`, `<aktie>: <kurs> kr`, `Avvikelse: +7,3 %` | ✓ |
| 13 | Comparison with real clicks (ma200, the holding, two points about a year apart) | The label shows the price change, and the lines are at the deviation values | `<aktie>: <±x,xx>% · <±x,xx>%/månad · 11,9 mån` (= the price ratio − 1). Lines at the curve's deviations on those dates | ✓ |
| 14 | Minute chart | Unchanged | Axis `Kurs (SEK)`, `▼ Nollpunkt …` as before, the archive status as before | ✓ |
| 15 | API rejects an unknown mode | 400 | `{"error":"Ogiltigt skalläge."}` with status 400 | ✓ |
| 16 | `php private/tests/run.php` | All pass, including the new `scale` tests (an old file with only `log_scale`, saving ma200, `scale` taking precedence, an unknown `scale` falling back) | "Alla 123 kontroller lyckades." | ✓ |
| 17 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 18 | `openspec validate add-moving-average-deviation-mode --strict` | Valid | Valid | ✓ |

### Results – round 2 (checkboxes and log + deviation)

Run after the plan revision, with the same environment.

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 19 | Checkbox rules | Log while linear → only log. Then deviation → log+ma200. Linear → only linear. Deviation → only ma200. Unchecking the last box → linear. Unchecking linear itself → stays linear | `log`, `log+ma200`, `linear`, `ma200`, `linear`, `linear` | ✓ |
| 20 | Axes per mode | linear: index title, no deviation axis. log: log title, no deviation axis. log+ma200: base title empty, deviation axis visible on the left. ma200: deviation title on the main axis | All as expected | ✓ |
| 21 | Deviation traces | One per stock, appended once, on their own axis. Visible only in log+ma200 and only for shown stocks | One trace per stock. 4 visible for the 4 shown stocks in log+ma200, 0 in the other modes | ✓ |
| 22 | Deviation curve values (the holding) | Equal to an independent 200-day computation | Largest difference 0 | ✓ |
| 23 | Deviation axis fit (2024-01-01 – 2026-10-21) | Visible deviations −21,44…75,64 plus 5 % padding | Range −26,29…80,49. Ticks −20 %, 0 %, 20 % … 80 % | ✓ (after fix 2) |
| 24 | Log curves in log+ma200 | As in log mode: own log axes, index hover, endpoint labels, markers on the index values | The holding on its own log axis, markers on that axis at price/base×100, endpoint labels for all 4 stocks | ✓ |
| 25 | Hover with a real mouse | Price, index and deviation | `<aktie>: <kurs> kr`, `Index: …`, `<aktie> avvikelse: …` | ✓ |
| 26 | Hide a stock in log+ma200 (in the legend) | The stock curve and its deviation curve hide and show together | Hidden: `legendonly` / `false`. Shown: `true` / `true` | ✓ |
| 27 | Solo on the holding in log+ma200 | Only its deviation curve, and the break-even line on the log axis | Deviation curves: the holding only. `Nollpunkt …` on its log axis | ✓ |
| 28 | Real click on the holding's deviation curve | Nothing happens | The form date and price are unchanged, and no `Punkt 1` annotation appears | ✓ |
| 29 | Comparison with real clicks on the log curve | Price change, lines on the log axis | `<aktie>: <±x,xx>% · <±x,xx>%/månad · 15,4 mån` (= the price ratio − 1). Lines on the holding's log axis | ✓ |
| 30 | Deviation only after the revision | As in round 1 | Stock y equals the deviation series, deviation title, 0 % line on `y`, deviation hover, no break-even line, deviation traces hidden | ✓ |
| 31 | Linear after the revision | As before | Index title, `Nollpunkt …`, no 0 % line | ✓ |
| 32 | Persistence | `scale` and `log_scale` written, and the mode restored after a reload | Reload in log+ma200 restored both boxes. The final `aktievy.json` in the copy has `"log_scale": false, "scale": "linear"` | ✓ |
| 33 | Minute chart | Unchanged | `▼ Nollpunkt …` as before | ✓ |
| 34 | Console | No errors | No errors after fixes 1 and 2 | ✓ |
| 35 | `php private/tests/run.php` | All pass, including `log_ma200` | "Alla 126 kontroller lyckades." | ✓ |
| 36 | Real data untouched | `shasum -c` OK | All OK | ✓ |

### Problems found and fixed in round 2

1. **The rebase crashed after the deviation traces were added.** `rebaseToVisibleStart` read `customdata` before it skipped the deviation traces, which have none. That stopped re-indexing in every mode. The skip now comes first in the loop.
2. **The deviation axis had uneven ticks** (78,1 / 75,7 / … / −17,5). Plotly gives overlaying axes `tickmode: sync` by default, which aligns them to the log base axis. The axis now uses `tickmode: 'auto'`.

### Notes

1. The deviation measures distance from the 200-day moving average, not the fall from the previous high. The main chart also shows Berkshire in kr, so the USD/SEK rate is part of the movement. That is why the 2020 dip shows as −17,8 % and not the roughly −25 % fall from the top in USD. The planned mode `Fall från tidigare topp` would show the latter.
2. The page heading still reads "Aktiernas utveckling (index 100 vid synligt startdatum)" in every mode. This is outside the spec and is mentioned to the user.

### Not verified

- **Adding a transaction while ma200 or log+ma200 is active.** The marker should be placed through the new rebase call in `panel.js`. The code path exists but was not exercised.
- **A stock with less than 200 days of history.** It should show an empty curve; no such stock is in the list.
- **Narrow layout** of the selector, at 900 px or less.
- **The hosted app.**

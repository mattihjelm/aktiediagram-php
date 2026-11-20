## Verification

Results of the checks in tasks.md for `add-drawdown-and-change-measures`, run on 2026-11-12.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a fresh copy of `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory. The real `private/data` was never used.
- **Market data:** live Yahoo Finance history, through the app's normal cache.
- **Browser:** Chrome, driven through the browser automation tools. Values were read from the Plotly data and layout, and comparisons were made with real mouse clicks.
- **Error capture:** `error` and `unhandledrejection` listeners on the page during scripted sequences.
- **Independent formulas:**
  - ma200: `(p / mean(last 200 p) − 1) × 100`
  - drawdown: `(p / running max − 1) × 100`
  - change63: `(p[i] / p[i−63] − 1) × 100`

  Each was computed from the stock trace's `customdata[0]`.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Checkboxes | `Linjär`, `Logaritmisk`, `Avvikelse från 200-dagars medel`, `Fall från tidigare topp`, `Förändring över 3 månader` | As listed | ✓ |
| 2 | Rules | A measure clears `Linjär` and the other measures. `Logaritmisk` can be combined with one measure. Unchecking the last box gives `Linjär` | From log+change63: drawdown → log+drawdown, change63 → log+change63, log → change63, drawdown → drawdown, ma200 → ma200, ma200 again → linear | ✓ |
| 3 | Axis titles and hover per measure | The measure's title on the main axis (alone) or the left overlay axis (with log). The hover names the measure | `Fall från tidigare topp (%)`, `Förändring över 3 månader (%)`, `Avvikelse från 200-dagars medel (%)`. Hover e.g. `Fall från topp: %{y:+.1f} %`, overlay `<aktie> förändring 3 mån: …` | ✓ |
| 4 | Values against the independent computation, BRK-B and a Swedish holding, each measure, alone and with log (12 cases) | Largest difference ≈ 0 | ma200 BRK-B 5.8e-13, all others 0 | ✓ |
| 5 | BRK-B fall from the top (kr) | The 2020 dip at its depth | 2020 minimum −27,4 % (2020-06-26). 2025 minimum −19,9 % (2025-08-04) | ✓ |
| 6 | change63 start | The first 63 values are empty | First value at index 63 | ✓ |
| 7 | Break-even with the Swedish holding solo | Hidden for a measure alone, shown with log + measure | change63 alone: none. log+change63: `▼ Nollpunkt …` | ✓ |
| 8 | Transaction markers (change63 alone, the same holding) | On the measure curve | All markers equal the curve's value on their date | ✓ |
| 9 | Comparison with real clicks (drawdown alone, the same holding, two points 12 days apart) | Price change; lines at the drawdown values | `<aktie>: +3,06% · +7,76%/månad · 0,4 mån` (= the price ratio − 1). Lines at the curve's drawdown values on the two dates | ✓ |
| 10 | Persistence | log+drawdown restored after a reload | Boxes `log` + `drawdown`, overlay axis `Fall från tidigare topp (%)`, 4 measure curves | ✓ |
| 11 | Stress sequence, 2 rounds × 19 steps | No errors. Steps: solo on/off, pinned point in the minute chart, every measure alone and with log, switching measure ↔ log+measure in both directions | No errors after fixes 1–4 | ✓ (after fixes) |
| 12 | `php private/tests/run.php` | All pass, including the new `scale` values | "Alla 131 kontroller lyckades." | ✓ |
| 13 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 14 | `openspec validate add-drawdown-and-change-measures --strict` | Valid | Valid | ✓ |

### Problems found and fixed

See design.md, "Problems found during verification":

1. The overlay traces had no initial values, so Plotly threw when their axis became visible.
2. Switching from a measure alone to log + measure produced a NaN label position and aborted the rebase. This defect was already in the archived deviation change.
3. Concurrent Plotly calls in `syncMeasureTraces`.
4. The minute chart was purged while a pin reset was still redrawing. This defect came from the pinned-point change and showed up depending on timing.

### Not verified

- **Adding a transaction while a measure is active.** It uses the rebase call added in the deviation change.
- **A stock with less than 64 days of history.**
- **Narrow layout** of the five checkboxes.


### Hosted check

- **2026-11-12:** The user uploaded the change to the web host and confirmed that it works.

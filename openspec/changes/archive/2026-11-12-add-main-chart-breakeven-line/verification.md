## Verification

Results of the checks in tasks.md for `add-main-chart-breakeven-line`, run on 2026-11-12.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a copy of `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory. The real `private/data` was never used.
- **Market data:** live Yahoo Finance prices, through the app's normal cache.
- **Browser:** Chrome, driven through the browser automation tools. Values were read from the Plotly layout (`graph.layout.shapes` / `annotations`), and the visual checks were done with screenshots.
- **How the expected index was computed:** from the curve itself, as `breakeven × y[k] / price[k]` for a visible point `k`. This is independent of `visibleBases`, which the implementation uses.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | No stock solo | No break-even shape or label | No shape, no label | ✓ |
| 2 | A Swedish holding solo, default range (linear) | Line at the expected index. The break-even is below the curve, so the label is at the bottom edge with `▼` | Shape on `y` at the expected index. Label `▼ Nollpunkt … kr` at `yref: paper`, y = 0. y-range fitted to the curve | ✓ |
| 3 | Visible range changed to 2024-08-01 – end | The line moves with the new base. The label is on the line when it is within the range | Shape at the new expected index. Label `Nollpunkt … kr` on `y` at the same index, within the y-range | ✓ |
| 4 | Logarithmic scale on, same range | The line is on the holding's own log axis at the same price. The label is at log10(index) | Shape on the holding's own log axis at the same index. Label at log10 of that index. A screenshot shows the line and the label at the same height | ✓ |
| 5 | Logarithmic scale off again | Same as check 3 | Shape and label at the same index on `y` | ✓ |
| 6 | Test purchase while the holding is solo (10 st × 500,00 kr, 0,00 kr courtage, 2026-11-11, in the copied data) | New break-even (localBasis + 5000 − dividendLocal) / (held + 10), in both charts, without a reload | Main chart: the new `Nollpunkt` at the expected index. Minute chart: the same new value with `▼` | ✓ |
| 7 | Solo off (the holding) | The line and the label disappear | No shape, no label | ✓ |
| 8 | A USD holding with dividends in SEK solo | The same value as in the minute chart, above the curve, so `▲` at the top edge | Shape at the expected index. Label `▲ Nollpunkt … USD` at `yref: paper`, y = 1 | ✓ |
| 9 | A stock with nothing held solo | No line | No shape, no label | ✓ |
| 10 | Comparison with real clicks while the holding's line is shown | The comparison is drawn as before, and the line stays | Comparison label with its lines. The break-even line and its label are still visible, as shown in a screenshot | ✓ |
| 11 | Minute chart after the shared `getBreakeven` refactor | Unchanged value for the holding | The same `▼ Nollpunkt` value before the test purchase as in `add-intraday-breakeven-line` | ✓ |
| 12 | Real data untouched | `shasum -c` OK for `aktier.csv`, `aktiekop.csv` and `aktievy.json` | All OK | ✓ |
| 13 | `php private/tests/run.php` | All pass | "Alla 119 kontroller lyckades." | ✓ |
| 14 | `openspec validate add-main-chart-breakeven-line --strict` | Valid | Valid | ✓ |

### Not verified

- **A missing exchange rate**, where no line should be shown. This cannot be triggered with the current data.
- **Transaction changes other than registering a purchase.** Editing, deleting and broker imports go through the same `renderPortfolioSummary` hook, but they were not exercised.
- **Narrow layout**, at 900 px or less.

### Hosted check

- **2026-11-12:** The user uploaded the change to the web host with `deploy.sh` and confirmed that it works. They did not report which stocks they checked.
- **2026-11-12, BRK-B:** The user confirmed on the hosted app that the main chart shows the break-even line at the expected value in kr, without the USD conversion used in the minute chart.

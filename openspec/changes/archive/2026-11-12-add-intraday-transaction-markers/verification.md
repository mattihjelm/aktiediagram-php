## Verification

Results of the checks in tasks.md for `add-intraday-transaction-markers`, run on 2026-11-12.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a fresh copy of `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory. Test purchases and sales were registered in this copy only; the real `private/data` was never used.
- **Market data:** live Yahoo Finance minute prices. The minute data started at 2026-10-14 09:00 for SEK stocks at the time of the check.
- **Browser:** Chrome, driven through the browser automation tools. Values were read from the minute chart's trace 2. Hover was checked with a real mouse.
- **Events in the real data within the minute range:** one dividend on a Swedish holding. A few recent purchases fall just before the start of the minute data.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | `getTransactions` | The same events as the transaction list | For the holding with the dividend: a purchase and the dividend, both matching the list | ✓ |
| 2 | Dividend on that holding | A diamond on the curve at the day's first minute | At 09:00 on the dividend date, y = the curve's close at that minute. Diamond in the stock color. Text `UTDELNING <antal> st à <belopp> kr · källskatt 0,00 kr` | ✓ |
| 3 | Event before the minute data (a purchase the day before it starts) | Not shown | 0 markers (the minute data starts the next day) | ✓ |
| 4 | Test purchase SEK while solo (a Swedish stock, 2026-11-12, 2 st à 600,00 kr) | A circle at 600,00 at 09:00, without refetching the minute prices | `2026-11-12 09:00`, 600,00, circle, `KÖP 2 st à 600,00 kr · courtage 1,00 kr`. 0 new requests to `intraday.php` | ✓ |
| 5 | Test purchase USD (Sirius XM, 2026-11-11, 3 st à 32,50 USD) | A circle at 32,50 at the US open (15:30 Swedish time) | `2026-11-11 15:30`, 32,50, `KÖP 3 st à 32,50 USD · courtage 1,00 USD`. 0 refetches | ✓ |
| 6 | Test purchase BRK-B in kr (2026-11-11, 1 st à 5 200 kr) | Converted to USD by the day's ratio, minute close / main-chart kr close | Placed at 527,35 USD, equal to 5200 × 588,28 / 5800,80 (USD/SEK 9,8606). Hover `KÖP 1 st à 5 200,00 kr · courtage 1,00 kr` with a real mouse | ✓ |
| 7 | The y-range includes purchase and sale markers | The marker is visible after load and after a new event | After a reload: 523,88–600,28 includes 527,35. After a test SÄLJ 2026-11-10 à 6 000 kr (612,42 USD, triangle-down): 523,10–616,67 | ✓ (after fix) |
| 8 | Pinned point with markers | Pin, Vecka/Månad and Esc work, and the markers stay | Pinned at 2026-11-10 17:54. Månad keeps the pin and the 2 markers. Vecka: 2 markers. Esc closes the pin, and the markers stay | ✓ |
| 9 | Break-even line | Still shown | `Nollpunkt …` visible together with the markers (screenshot) | ✓ |
| 10 | Console | No errors | No errors | ✓ |
| 11 | `php private/tests/run.php` | All pass | "Alla 126 kontroller lyckades." | ✓ |
| 12 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 13 | `openspec validate add-intraday-transaction-markers --strict` | Valid | Valid | ✓ |

### Problems found and fixed

1. **A new purchase could land outside the y-axis.** `refreshIntradayOverlays` only restyled the markers. It now also calls `relayoutX` on the current x-range, so that `fitY` includes the new price. See design.md, "Updates".

### Notes

- **Hover near a gap.** With `hovermode: 'x'`, hovering the BRK-B marker at 2026-11-11 15:30 shows the price label of the last minute before the overnight gap (2026-11-10 21:58), next to the marker's own text. This is how Plotly picks the nearest x across a rangebreak. The marker text is correct.
- **Clicking a marker.** A click on a marker pins the price curve at that minute, because the click also hits trace 0 at the same x. This is consistent with "click anywhere vertically" from the pinned-point change.

### Not verified

- **Editing, deleting and importing transactions while solo.** These use the same `renderPortfolioSummary` hook as the registration that was tested.
- **A real (non-test) USD transaction within 30 days.** There is none in the data.
- **Narrow layout.**
- **The hosted app.**

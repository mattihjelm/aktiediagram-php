## Verification

Results of the checks in tasks.md for `widen-legend-and-total-kkr`, run on 2026-11-18.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a copy of the local `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory.
- **Browser:**
  - Chrome, driven through the browser automation tools.
  - Wide window: 2221 px.
  - Medium popup: requested 1 400 px, reported 1 750 px by the browser.
  - Phone popup: 487 px, phone layout.
  - Each popup was opened by a real click.
- **Automated tests:** the Playwright suite.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Legend width, wide screen | ~20 % wider, at most 552 px (before: 460 px) | 552 px at 2221 px and at 1750 px; chart 1631 and 1160 px; no horizontal scroll | ✓ |
| 2 | Font sizes, wide screen | Names 17 px; return line, help and buttons 14.5 px | 17px, 14.5px, 14.5px, 14.5px | ✓ |
| 3 | Darker return line | `#2b3646` | `rgb(43, 54, 70)` in all three windows | ✓ |
| 4 | Phone layout | 13 px text, full width, no horizontal scroll | 13px for names, return line, help and buttons; legend 472 px in 487 px; no horizontal scroll | ✓ |
| 5 | Label order and `kkr` | Monthly, %/mån, %/år, then the total in thousands | A Swedish holding with a gain and one with a loss: the rates first and the total last in `kkr`, equal to the old total rounded to thousands | ✓ |
| 6 | Foreign currencies | `k<valuta>` | Two USD holdings end in `kUSD` and a EUR holding in `kEUR`, each equal to the old total rounded to thousands | ✓ |
| 7 | Rounding to zero | `0,0` with no sign | Node check: −30 → `0,0`, 120,00 → `+0,1`, −420,00 → `−0,4` | ✓ |
| 8 | Stocks without purchases | No return line | Empty, as before | ✓ |
| 9 | `%/mån` sort | Unchanged | Sorted descending, the stocks with a value first | ✓ |
| 10 | Console | No errors | No errors | ✓ |
| 11 | Playwright | All pass with the updated pattern | "16 passed (21.8s)" | ✓ |
| 12 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 13 | PHP unit tests and `openspec validate widen-legend-and-total-kkr --strict` | Pass | "Alla 171 kontroller lyckades."; valid | ✓ |

### Not verified

- **A stock with `—/mån`.** No stock in the data copy has purchases without a monthly value. The code path `—/mån · <total>` was checked by reading the code only.

### Hosted check

- **2026-11-18:** The user uploaded the change to the web host and confirmed that it works.

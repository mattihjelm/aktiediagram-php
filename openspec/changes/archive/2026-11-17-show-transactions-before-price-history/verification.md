## Verification

Results of the checks in tasks.md for `show-transactions-before-price-history`, run on 2026-11-17.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a copy of the local `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory. The real `private/data` was never used, and an open Emacs session on `private/data/aktier.csv` (`#aktier.csv#`) was left untouched. Added to the copy:
  - a row for a Swedish fund in `aktier.csv`, marked visible
  - four test events for the fund in `aktiekop.csv`: KÖP 2019-05-02 100 à 110,00; KÖP 2020-03-16 50 à 105,50; SÄLJ 2023-02-01 30 à 130,00; KÖP 2024-06-03 20 à 140,00. These are test values, not the user's real rows, which are only on the server.
  - `last_solo` set to the fund.
- **Prices:** Yahoo returned 429 to this machine's terminal, while the browser could reach it. The fund's cache in the copy was therefore filled with a synthetic daily series on business days from early 2022 (the fund's real Yahoo start, checked in the browser on 2026-11-16) to 2026-11-16. The behavior under test depends only on where the series starts.
- **Browser:** Chrome, driven through the browser automation tools.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | A marker before the series start is kept with `chart_price` null; after the start it gets the price; invalid rows are still skipped | "Alla 146 kontroller lyckades." (3 new) | ✓ |
| 2 | Purchase trace | The 2019 and 2020 events are present with y null; 2023 and 2024 get values | `[2019-05-02, null]`, `[2020-03-16, null]`, `[2023-02-01, 83.3]`, `[2024-06-03, 89.5]` | ✓ |
| 3 | Transaction list (solo on the fund) | All four events | 2024-06-03 KÖP, 2023-02-01 SÄLJ, 2020-03-16 KÖP, 2019-05-02 KÖP | ✓ |
| 4 | `Resultat` against a hand calculation | 140 shares. Basis: 11 000 + 5 275 = 16 275; minus 20 % for the sale = 13 020; plus 2 800 = 15 820. GAV 15 820 / 140 = 113,00. Realized 3 900 − 3 255 = 645 | Antal 140, GAV 113,00 kr. `holding`: `localBasis` 15820, `realizedSek` 645, `totalBuyCostSek` 19075 | ✓ |
| 5 | Chart y after the range is widened to 2018 | No marker before 2022 in linear, log, log+drawdown or drawdown | Linear `[null, null, 105.34, 113.18]`. Log and log+drawdown the same. Drawdown `[null, null, …]` | ✓ |
| 6 | Other stocks affected | List any with events before their history | Only the test fund (2 events) in this data copy | ✓ |
| 7 | Console | No app errors | One error, from the verification script itself, which ran before the chart had loaded. No app errors | ✓ |
| 8 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 9 | `openspec validate show-transactions-before-price-history --strict` | Valid | Valid | ✓ |

### Not verified

- **The user's real rows for the fund from the broker export.** They are only on the server.
- **Importing with the fund mapping in the browser.** The import code is unchanged. Imported rows already reached `aktiekop.csv`, and the open-view markers from an import now keep y null through the same rule.
- **Stocks on the server other than the fund**, whose totals may change if they have events before their price history.


### Hosted check

- **2026-11-17:** The user uploaded the change to the web host and confirmed that it works.

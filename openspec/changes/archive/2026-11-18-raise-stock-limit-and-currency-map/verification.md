## Verification

Results of the checks in tasks.md for `raise-stock-limit-and-currency-map`, run on 2026-11-18.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a copy of the local `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory. The copy had two additions:
  - the new rows in `aktier.csv`, more than 50 rows in total
  - one test purchase in `aktiekop.csv`: `2026-10-01;KÖP;TSLA;2;250,00;1,00`. This is a test value only and is not in the real file.
- **Prices:** live from Yahoo, through the PHP server. All histories loaded.
- **Browser:** Chrome, driven through the browser automation tools.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | New tests pass: currency, US market, 100/101 stocks | "Alla 165 kontroller lyckades." (19 new; the old limit test moved from 51 to 101) | ✓ |
| 2 | Page with more than 50 stocks | No limit error; all stocks drawn | One stock trace per row in `aktier.csv`; `meta.currencies` has one entry per stock | ✓ |
| 3 | `meta.currencies` | TSLA, NDAQ, 0P0000JSS5 → USD; BRK-B, .ST, funds → kr; RHM.DE → EUR | Matches; `stockCurrency('X')` → `''` | ✓ |
| 4 | Form total | TSLA in USD, fund in kr, RHM.DE in EUR | `21,00 USD`, `21,00 kr`, `21,00 EUR` | ✓ |
| 5 | TSLA in the lists | USD in Transaktioner and Resultat; SEK value converted with USD/SEK | Transaction `250,00 USD … 501,00 USD`. Resultat: GAV `250,50 USD`, value `760,22 USD` and `7 676,88 kr` (rate ≈ 10,10) | ✓ |
| 6 | `current-prices.php` | Current USD/EUR rate for TSLA, NDAQ and RHM.DE | Rates 10,14 for TSLA and NDAQ, 11,14 for RHM.DE | ✓ |
| 7 | Vontobel USD fund in the chart | History converted with USD/SEK | Last point 112,62 USD with rate 10,07 | ✓ |
| 8 | Existing stocks unchanged | Same currencies as before; BRK-B GAV as confirmed earlier by the user | NDAQ in USD, RHM.DE in EUR, BRK-B in kr with the GAV confirmed earlier; legend `USD/mån`, `EUR/mån` and `kr/mån` as before. The old and new currency mapping are identical for all previous tickers, which the unit tests also check | ✓ |
| 9 | Console | No errors | No errors, also after a reload | ✓ |
| 10 | Real data before step 3.1 | `shasum -c` OK | All OK | ✓ |
| 11 | Step 3.1 | Only `aktier.csv` changed; its original lines are unchanged; all stocks load with the real config | `diff` of the original lines empty. Only `aktier.csv` fails `shasum -c`. `Stocks::load()` returns every row | ✓ |
| 12 | `openspec validate raise-stock-limit-and-currency-map --strict` | Valid | Valid | ✓ |

### Not verified

- **The first load on the server.** It fetches the new histories from Yahoo. Locally all of them loaded, but one.com's connection and Yahoo's rate limits may differ.
- **The Vontobel fund's current price.** "Hämta aktuell kurs" returns no current price for `0P0000JSS5` ("ingen aktuell kurs hittades"), while a Swedish fund returns one. Yahoo has no intraday data for that fund. The daily closing price still works.
- **The TSLA closing-time rule in the browser.** It is checked only by unit tests (`latestClosedDate`).

### Hosted check

- **2026-11-18:** The user uploaded the code and `aktier.csv` to the web host and confirmed that it works.

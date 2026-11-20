## 1. Server: lagring och validering

- [x] 1.1 In `private/src/bootstrap.php`, add `account` last in `PURCHASE_FIELDS` and add `DEFAULT_ACCOUNT = 'T'`
- [x] 1.2 In `private/src/Purchases.php`:
  - `rowsFromText` defaults `account` to `T` and uppercases it
  - `withCurrentHeader` requires `account`
  - add `Purchases::account($value)`, accepting one letter A–Z
  - `entryFromForm` reads and validates `account`
- [x] 1.3 In `private/src/Import.php`:
  - the converted rows get the chosen account
  - `selectNew` keys known IDs by account and ID
  - `signature` includes the account
- [x] 1.4 Unit tests in `private/tests/run.php`:
  - an old file without `account` reads as `T` and gets the column on write
  - `account()` accepts `i` → `I` and rejects `''`, `TT`, `1` and `Å`
  - the same import on another account is all new, and on the same account all duplicates
  - row keys survive the header upgrade

## 2. Server: serier och API

- [x] 2.1 In `private/src/Chart.php`:
  - series per (ticker, account), with `meta.series`, `meta.ticker`, `meta.account` and `meta.displayName`
  - a colour per series, and `legendgroup` = the series key
  - customdata index 12 = the account
  - `meta.accounts` in the layout
  - the initial visibility from `series_visible`
  - `lastSolo` over series keys with the bare-ticker fallback
  - `saveView` handles `series_visible`
- [x] 2.2 `public/api/purchases.php`: accept and return `account` and `series`
- [x] 2.3 `public/api/import.php`:
  - require `account` in the preview step and keep it in the session
  - count the preview per display name
  - return `account` and `series` on the markers
- [x] 2.4 `public/api/stock-visibility.php`: accept `{series, visible}`. A series with an account saves to `aktievy.json` under `series_visible`; others save to `aktier.csv`
- [x] 2.5 Unit tests:
  - `Chart` series for one ticker on two accounts
  - display names
  - `lastSolo` with an exact key, a bare ticker and an unknown value
  - `series_visible` round trip
  - verify with `php private/tests/run.php`

## 3. Webbläsare

- [x] 3.1 In `public/assets/chart.js`:
  - `stockTraceBySeries` and `seriesOf`
  - visibility, solo, legend, profit labels, comparisons, measure traces and axis keys by `meta.series`
  - the visibility POST with `series`
  - a curve click fills `#purchase-account` from `meta.account`
- [x] 3.2 In `public/assets/panel.js`:
  - `portfolioTraces`, `getHolding`, `getTransactions`, `getBreakeven`, the list rows, filters and deletes by series
  - names from `displayName`
  - current-price updates go to every series of a ticker
  - the account in the POST and the in-place inserts, with customdata index 12
  - a reload with a stored status when a series is missing
- [x] 3.3 In `public/assets/intraday.js`: `showIntraday(series)`, fetching with the series' ticker and looking up transactions and holdings by series; the title from `displayName`
- [x] 3.4 In `public/assets/app.js`: show and clear `aktier.flash` after start; `refreshProfitLabel` per series
- [x] 3.5 In `public/index.php`, add:
  - `Konto` in `Registrera transaktion`
  - `Konto` beside `Importera transaktioner`
  - the shared `<datalist id="account-options">`
  - the height and phone layout as for other fields
- [x] 3.6 Grep every remaining `meta.ticker` and `.ticker` use in `public/assets/*.js` and confirm each is a real-ticker use: the currency, minute data, CSV download, current prices or the form

## 4. Tester

- [x] 4.1 In `e2e/fixture.js`, add a ticker with transactions on two accounts (one without the `account` column in the base file, so the `T` default is exercised). Done as the helpers `writeTransactions` and `baseTransactions`: the base file keeps its old header, so every test exercises the `T` default, and `accounts.spec.js` writes the two-account data per test. The fixture also gets `displayName` and `series` per stock
- [x] 4.2 Add `e2e/accounts.spec.js` covering:
  - two legend rows and curves named `<namn> (T)` and `<namn> (I)`
  - Resultat rows per account with separate quantities
  - `Transaktioner` names
  - solo of one account filters the lists and the minute-chart markers
  - hiding one account survives a reload, and `aktier.csv` is unchanged
  - registering on a new account reloads and shows the new series with the status
  - an invalid account gives the error
  - a curve click fills `Konto`
  - deleting on one account leaves the other
- [x] 4.3 Extend the import tests:
  - the preview shows the account
  - the same file on another account is all new, and on the same account all duplicates
  - an import without an account is refused
- [x] 4.4 Update existing tests that rely on names without an account or on `last_solo` being a bare ticker; `npm run test:e2e` passes

## 5. Kontroll

- [x] 5.1 Manual check on a copy of the real data:
  - all existing transactions show as `(T)`
  - results equal the totals before the change
  - add a test row on account `I` for an existing ticker in the copy and see the split
  - phone width
  - no console errors
- [x] 5.2 Write `verification.md`; confirm that `private/data` is untouched; `php private/tests/run.php` and `openspec validate add-account-per-transaction --strict` pass

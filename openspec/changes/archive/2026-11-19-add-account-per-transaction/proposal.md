## Why

The user will import securities transactions from a second broker account. Today `aktiekop.csv` has no account, so trades in the same security on two accounts would be merged into one holding, one curve and one result row. The user wants each account's holding of a security shown as its own security, marked with a one-letter account identifier, for example `Tele2 (T)` and `Tele2 (I)`.

## What Changes

- **Data:** a new last column `account` in `aktiekop.csv`, holding one letter `A`–`Z` (stored uppercase).
  - Existing rows without an account count as `T`. The next write fills in `T`, the same way older files get newer columns today.
  - `aktier.csv` is unchanged.
- **Series per security and account:**
  - A security with transactions gets one series per account that has transactions on it. Each series has its own curve, markers, legend row, result row, solo, comparison points and label.
  - A security without transactions stays one series without an account.
  - The price curve is the same for all series of a ticker. Only the transactions, holdings and results differ.
- **Display:** wherever a security name with an account is shown, the account follows in parentheses, for example `Tele2 (T)`. This covers the legend, curve-end labels, hover text, `Transaktioner`, `Resultat`, the minute-chart title, the solo label, status messages and comparison labels. A security without transactions is shown without parentheses.
- **Saved view:**
  - Visibility of a series with an account is saved in `aktievy.json` under `series_visible`. A series without an account still saves to `aktier.csv`.
  - `last_solo` holds the series. An older saved value that is a bare ticker selects that ticker's first series.
- **`Registrera transaktion`:** a required field `Konto` (one letter A–Z), suggesting the accounts already used.
  - Clicking a curve fills in that series' account.
  - The first transaction on a new account, or on a security without transactions, reloads the page so the new series appears.
- **Import:** a required field `Konto` beside `Importera transaktioner`.
  - The account applies to every row of the file and is shown in the preview.
  - The duplicate check is per account: the broker's transaction ID and the details of older rows without an ID are compared only within the same account.
  - If the import creates a new series, the page reloads after the confirmation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`:
  - **ADDED** "Konto per transaktion": the account column, the series per security and account, display in parentheses, the saved visibility and solo, and when the page reloads.
  - **MODIFIED** "Registrera och spara transaktioner": the `Konto` field and the `account` column.
  - **MODIFIED** "Konvertera mäklarens transaktionsexport": the account choice and the duplicate check per account.
  - **MODIFIED** "Kurvornas synlighet och legend" and "Senast valda solo-aktie": saving per series.

## Impact

- **Server:**
  - `private/src/bootstrap.php`: `PURCHASE_FIELDS` gets `account`, plus a default account constant.
  - `private/src/Purchases.php`: reading with default `T`, the header upgrade, and validating the form's account.
  - `private/src/Chart.php`: series per ticker and account, display names, customdata index 12, `series_visible`, and `last_solo` per series.
  - `private/src/Import.php`: the account on rows, and the duplicate check per account.
  - `public/api/purchases.php`, `public/api/import.php` and `public/api/stock-visibility.php` (per series).
  - `private/tests/run.php`.
- **Browser:**
  - `public/assets/chart.js`, `panel.js`, `intraday.js` and `app.js`: series key instead of ticker for identity; the real ticker for prices, currency and minute data.
  - `public/index.php`: the `Konto` fields.
- **Tests:** the Playwright fixture gets a second account, and new tests cover the split curves, the form, the import and the saved view.
- **Data:**
  - `aktiekop.csv` gains the `account` column on the next write. The real file is only changed by the app on the server.
  - `aktievy.json` may gain `series_visible`.

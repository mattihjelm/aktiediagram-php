## Why

Registering a transaction touches the form, `api/purchases.php`, `aktiekop.csv`, the chart markers, the legend's return label, `Resultat`, `Transaktioner` and, during solo, the minute chart. A break anywhere in that chain shows up only as wrong numbers. The Playwright suite currently covers login, the chart, the legend and solo, but no transaction is ever registered.

## What Changes

- **Fixture:**
  - `resetState()` also restores `aktiekop.csv` from a base copy written when the fixture is created, so every test starts from the same four transactions.
  - `e2e/helpers.js` gets `readTransactions()` (the rows of the fixture's `aktiekop.csv`) and `dailyClose(ticker, date)` (from the fixture cache).
- **New spec `e2e/transactions.spec.js`:**
  - **Suggestions:** picking a stock and date fills `Kurs` with that day's close, `Courtage` becomes 0,25 % of the amount, and `Totalbelopp` updates.
  - **Purchase with time:**
    - the status message confirms it
    - `aktiekop.csv` gets the exact row
    - `Transaktioner` lists it with date and `Tid`
    - `Resultat` shows the new holding
    - the legend shows `%/mån` and `%/år` for the stock
    - the chart's purchase trace has the new date
    - the form is cleared
  - **Sale:** `Antal` in `Resultat` drops by the sold quantity.
  - **Dividend:** the labels change to `Antal aktier`, `Utdelning per aktie …` and `Källskatt`, `Tid` is hidden, and the row is saved as `UTDELNING`. The status mentions `källskatt`, and `Totalbelopp` shows `Utdelning efter källskatt`.
  - **Validation:** a quantity of 0 and a date before the price history give the app's error messages and add no row.
  - **Persistence:** a registered transaction is still listed after a reload.
  - **During solo:** a purchase with a time inside the minute window adds a marker to the minute chart.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The app's behavior is unchanged, so the change is marked `skip_specs`.

## Impact

- **New file:** `e2e/transactions.spec.js`.
- **Changed files:** `e2e/fixture.js` (base copy and reset of `aktiekop.csv`), `e2e/helpers.js` (two readers) and the README test section.
- **App code, dependencies and deploy:** unchanged. `deploy.sh` does not upload `e2e/`.

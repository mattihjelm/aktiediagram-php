## Why

One holding's latest dividend is in `aktiekop.csv` twice:
- **Entered by hand:** as quantity × dividend per share, with no `source_id`.
- **From a later broker import:** a few days earlier, as one row with the total amount and the broker's transaction ID.

The import cannot see that these are the same, because the date and the row shape differ, so the dividend counts twice in `Resultat` and the legend.

The app has no way to remove a transaction. Today the user must edit `aktiekop.csv` on the server by hand. The user wants a delete button in `Transaktioner`.

## What Changes

- **New button:** a `Ta bort` button at the end of every row in `Transaktioner`.
  - The first click asks inline: the row shows `Bekräfta` and `Avbryt`.
  - `Bekräfta` removes exactly that row from `aktiekop.csv`.
- **Removing the right row:**
  - Each transaction carries a row key: its position in `aktiekop.csv` and a hash of its fields.
  - The server removes the row only if the row at that position still has the same content. Otherwise nothing is removed and the user is asked to reload.
  - So even identical rows are removed one at a time, the one shown.
- **After removing, without a reload:**
  - the marker leaves the main chart and the minute chart
  - `Transaktioner`, `Resultat` and the list's return are recalculated
  - the row keys of later rows are adjusted
- **Imported rows:** they can be removed the same way. A later import of the same export file would add the row again, which the spec states.
- **Fixing the current data:** the user can now remove the duplicated dividend row in the app.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`: "Visa transaktioner i diagram och lista" describes the delete button, the confirmation, the exact-row rule and the recalculation, with three new scenarios.

## Impact

- **Server:**
  - `private/src/Purchases.php`: `rowKey()` and `remove($key)` under the exclusive lock
  - `private/src/Chart.php`: the row key in the marker customdata (index 11)
  - `public/api/purchases.php`: `POST {action: "delete", key}`, because the web host blocks HTTP `DELETE`
  - `private/tests/run.php`
- **Browser:** `public/assets/panel.js`, for the button, the confirmation, the request and the in-place update of traces and lists.
- **Tests:** `e2e/transactions.spec.js` gets delete, cancel and stale-file tests.
- **Data:** the `aktiekop.csv` format is unchanged. Rows are only removed when the user confirms.

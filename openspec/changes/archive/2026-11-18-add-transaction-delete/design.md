## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **`Purchases`:**
  - `load()` returns the data rows of `aktiekop.csv` in file order under a shared lock.
  - `append($select)` rewrites the file under an exclusive lock, with `Storage::writeAtomic` and the header upgraded by `withCurrentHeader`.
- **`Chart`:**
  - builds one marker per valid row with `marker($row)`, skipping invalid rows
  - `markerCustomdata` is `[chart_price, price, quantity, ticker, currency, commission, type, sek_fx_rate, ticker_fx_rate, amount_currency, time]`
- **Browser:**
  - `panel.js` `renderPurchaseList` builds `Transaktioner` from the purchase traces' `x` and `customdata`
  - `refreshProfitLabel`, `renderPortfolioSummary`, `getTransactions` (minute chart) and the main chart all read the same traces
- **`api/purchases.php`** only accepts `POST` (register).
- **Duplicates:** neither the row content nor any existing ID is unique for manual rows. Two identical manual rows are possible.

## Goals / Non-Goals

**Goals:**
- Remove the one row the user clicked, safely, under the file lock.
- Update chart, lists and returns in place.

**Non-Goals:**
- No editing of rows.
- No undo. The confirmation step is the safeguard.
- No change to the import's duplicate rules.
- No bulk delete.

## Decisions

### Row key: position plus content hash
- **`Purchases::rowKey(int $index, array $row)`** returns `"<index>:<hash>"`:
  - `index` is the row's 0-based position among the data rows
  - `hash` is `substr(sha1(implode(';', fields in PURCHASE_FIELDS order)), 0, 12)`
- `Chart` passes the index into `marker()` and adds `row_key` as customdata index 11.
- **Why not content alone:** identical rows would be ambiguous.
- **Why not position alone:** an import or another tab could have changed the file.
- **Both together:** a stale key is detected and rejected.

### Removal on the server
- **`Purchases::remove(string $key): array`**, under `Storage::withLock($file, true)`:
  - read and header-upgrade the text, and parse the rows
  - check that the row at `index` exists and has the same hash, or throw `RuntimeException('Transaktionen har ändrats eller tagits bort. Ladda om sidan.')`
  - remove it, write with `Csv::write(PURCHASE_FIELDS, …, ';')` and `writeAtomic`, and return the removed row
- **`api/purchases.php`** accepts `POST` with JSON `{action: "delete", key}`:
  - success: `200 {removed: row}`
  - a stale key: `409` with the message
  - a malformed key: `400`
- CSRF and login checks come from `run_api` as for registering.
- **Why not HTTP `DELETE`:** the first version used `DELETE`. It worked locally, but on the web host the request never reached PHP. The web host answered with its own HTML page, and the browser showed `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`. Every other write in the app uses `POST`, so deletion does too.
- **Non-JSON answers:** the browser shows `Transaktionen kunde inte tas bort (servern svarade <status>).` for a response that is not JSON, instead of a parse error.

### Browser: confirmation inline, no modal dialog
- **Button:** a last, unnamed column holds a small button `Ta bort` with `aria-label="Ta bort transaktion <datum> <namn>"`.
- **Confirmation:** a click replaces it with `Bekräfta` and `Avbryt` in the same cell. Re-rendering the list resets every pending confirmation.
- **Why inline:** native `confirm()` blocks the page and the browser automation, and is awkward on phones.

### In-place update after removal
- **Trace:** in the purchase trace for the ticker, the point whose `customdata[11]` equals the key is removed from `x`, `y`, `customdata` and `marker.symbol` (one `Plotly.restyle`). `meta` is unchanged.
- **Later rows:** every purchase trace's `row_key` with an index above the removed one has its index decremented by 1. Their hashes are unchanged.
- **Recalculation:** the code then calls `rebaseVisibleStockGraph`, `refreshProfitLabel(ticker)`, `renderPurchaseList`, `renderPortfolioSummary` and, when the stock is solo, the minute chart's refresh of overlays (`refreshIntradayOverlays`), which already re-reads `getTransactions`.
- **Status:** `#import-events-status` shows `Transaktionen <datum> <namn> togs bort ur aktiekop.csv.`, or the error.

### Keys for new rows
- Rows added by the form or the import get a point in the chart without a reload, so they need a key too.
- `Purchases::append` computes `row_key` for each added row inside its lock, from the number of existing rows, and returns it.
- `api/purchases.php` returns it with the entry, and `import.php` passes it through `Chart::marker`.
- The browser puts it in `customdata[11]` for both paths.

### Identical rows
- Two rows that are identical in every field cannot be told apart. After one of them is removed, the old key of a later identical row's position still matches.
- Removing "the other one" gives the same file, so it is accepted. The risk is a double-submit removing two rows, so the browser disables `Bekräfta` as soon as it is clicked.
- A stale key is rejected whenever the row now at that position differs in any field. The unit tests cover both cases.

### Rows the chart skipped
- Invalid rows have no marker and so no button. They keep their index, so keys of valid rows still count them. Nothing changes for them.

## Risks / Trade-offs

- [Removing the wrong row] → The position and hash must both match under the exclusive lock, otherwise it fails. Identical rows are interchangeable; see "Identical rows". The tests cover identical rows and a file changed on disk.
- [The user removes an imported row, then imports the same file again] → The row comes back. That is stated in the spec, and the duplicate check is unchanged.
- [Several open tabs] → The other tab's keys go stale after a removal, and a delete there fails with "Ladda om sidan". No wrong row is removed.

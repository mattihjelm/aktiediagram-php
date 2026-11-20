## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **`chart.js` `setSolo(ticker, checked)`:**
  - On check, it stores a snapshot of all traces' visibility (unless one already exists), sets `soloTicker`, calls `saveLastSolo(ticker)`, shows the minute chart and makes only the stock's traces visible.
  - On uncheck of the same ticker, it applies the snapshot, hides the minute chart and clears `soloTicker`.
- **`toggleTicker(ticker)`:** a click on a stock name in the legend. When solo is active, it ends solo by restoring the snapshot with that stock toggled, hiding the minute chart and saving that stock's visibility. It does not touch `last_solo`.
- **Start:** `chart.js` (end of `initStockChart`) calls `setSolo(lastSolo, true)` only when `window.phoneLayoutQuery.matches`. The initial visibility comes from `show_initially` in `aktier.csv`, and solo never writes `aktier.csv`, so the snapshot taken at the automatic solo is the user's chosen set.
- **`api/view-range.php`:** `last_solo` must be a ticker in `aktier.csv`, or it returns 400. `Chart::saveView` merges keys, and `Chart::lastSolo` returns null for anything that is not a known ticker string.

## Goals / Non-Goals

**Goals:**
- Start in solo for the saved stock on every screen size.
- Clearing `last_solo` whenever solo ends, so that the start state follows how the user left the page.
- Keep the restore-on-uncheck behavior.

**Non-Goals:**
- No change to how visibility is saved in `aktier.csv`.
- No saving of the visible set separately from `aktier.csv`.
- No change to the minute chart, the measure modes or the list filters.

## Decisions

### Clear with null
- **`saveLastSolo(ticker)`** also takes `null`. `view-range.php` accepts `last_solo: null` and stores `"last_solo": null`. Any other non-ticker value still gets 400.
- `saveView` keeps the key order, and `lastSolo()` ignores null, so no reader needs to change.
- *Alternative:* removing the key from the file. This was rejected because `saveView` merges rather than deletes, and null reads the same.

### Where solo ends
- `setSolo(ticker, false)` (uncheck) and the solo branch of `toggleTicker` call `saveLastSolo(null)`.
- `setSolo(other, true)` while solo is active already saves the new ticker, which replaces the old one.
- Hiding the minute chart from other paths (`unpin`, `purge`) is not solo ending, so it does not clear.

### Auto-solo on every screen size
- The `phoneLayoutQuery.matches` condition is removed.
- The call keeps its `setTimeout(…, 50)`, so the first rebase has run before solo changes visibility. This is the same order that has worked on the phone.

## Risks / Trade-offs

- [The desktop start becomes slower when a solo stock fetches minute data] → This is the same fetch as a manual solo, and the main chart is drawn first.
- [A solo saved on one device opens solo on another] → That follows from `aktievy.json` being shared, and it is the requested behavior.
- [`saveLastSolo(null)` and visibility saves can arrive out of order] → They write different files (`aktievy.json` and `aktier.csv`), so order does not matter.

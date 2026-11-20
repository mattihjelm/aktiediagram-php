## Context

- **How `panel.js` builds the layout:**
  - `#transaction-tables` holds two sections, `#purchase-list` (`Transaktioner`) and `#portfolio-summary` (`Resultat`), each `display: contents`
  - since `add-unrealized-columns`, a one-column grid places their six parts with `grid-row` 1–6: `Resultat` first, then `Transaktioner`
  - before that change a two-column grid (`max-content minmax(0, 1fr)`) put `Resultat` on the left and `Transaktioner` on the right, with heading, controls and table on rows 1–3
- **Table widths:**
  - both tables are `width: max-content; max-width: 100%`, and the cells are `white-space: nowrap`, while the headers may wrap
  - `Resultat` is 1 284 px wide and `Transaktioner` 793 px with the user's real data
- **`syncTransactionListHeight()`:** sets the list's `max-height` to the header plus ten rows, and runs on resize and after both tables render.
- **The first version of this change:** moved `#purchase-list` into `#stock-chart-viewport` from 2000 px. It is replaced by this revision.

## Goals / Non-Goals

**Goals:**
- Side by side exactly when both tables fit at full width, whatever the data.
- No reload, and the same DOM elements, so an import preview and the scroll position survive.

**Non-Goals:**
- Placing `Transaktioner` beside the chart; the first version is removed.
- Squeezing `Resultat`, or wrapping its cells, to make room.

## Decisions

- **The fit check:**
  - `placeTransactionList()` measures each table's full width without layout constraints, through a small `fullWidth(table)` helper: it temporarily sets `maxWidth = 'none'` on the table, reads `getBoundingClientRect().width`, and restores it
  - it compares the sum plus the grid's column gap with `#transaction-tables.clientWidth`
  - **Why measure:** a fixed breakpoint would be wrong when names, the number of columns or the amounts change, and the user asked for "when there is room"
- **The class:** `placeTransactionList()` toggles `side-by-side` on `#transaction-tables`. It runs:
  - at the end of `renderPortfolioSummary` and `renderPurchaseList`
  - on `resize`, through `requestAnimationFrame`
- **Stability:** the measurement ignores the current layout, because `max-width` is lifted during it. Toggling the class therefore cannot flip the result, and the check settles in one pass.
- **CSS for `#transaction-tables.side-by-side`:**
  - `grid-template-columns: max-content minmax(0, 1fr)` and `column-gap: 24px`
  - `Resultat`'s heading, controls and table on column 1, rows 1–3, and `Transaktioner`'s on column 2, rows 1–3
  - the stacked layout's `margin-top` on the `Transaktioner` heading is reset to 0
- **Height:**
  - side by side, `syncTransactionListHeight()` sets `max-height = max(height of the Resultat table, header + ten rows)`
  - stacked, it keeps header + ten rows
  - it runs after `placeTransactionList()`
- **Removed:** the 2000 px `matchMedia` move into the chart row and its `@media (min-width: 2000px)` rules.

## Risks / Trade-offs

- [Measuring forces a layout on each render] → Two tables, measured only at the end of a render and on resize. That is negligible next to rebuilding the tables.
- [Header wrapping makes the real width smaller than the measured one] → The check is conservative: it may stack slightly before strictly necessary, but it never overflows.
- [A short `Resultat`, for example under solo, would give a short list] → The ten-row floor.

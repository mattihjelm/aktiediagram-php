## Context

See proposal.md for motivation and specs/aktiediagram/spec.md for the behavior.

- **`renderPurchaseList` in `public/assets/panel.js`:**
  - It builds the `Transaktioner` table header as an HTML string.
  - Each row's cells come from `[row.date, row.type, row.name, row.quantity, row.price, row.commission, row.total]`. Cells with `index > 1` get `class="number"` for right alignment.
  - `row.date` currently includes the time (`date + ' ' + time`).
  - The `Aktie` heading contains the sort button `#sort-purchases-by-stock`.
- **`renderPortfolioSummary`:** it builds the `Resultat` header as a string. Its cells use `index > 1` for `number`, and `index === 2` marks the italic current price.
- **`intraday.js` `computeTransactionMarkers`:** it builds the hover text as `TYPE … · courtage … [· kl. HH:MM]`.
- **CSS:**
  - `#purchase-list th, td` have `padding: 7px 9px; white-space: nowrap`.
  - `#portfolio-summary-content` uses `table-layout: fixed`, `width: 100%`, padding `5px 6px` and `white-space: normal`.

## Goals / Non-Goals

**Goals:**
- Shorter headings and a separate time column, with no change to values, alignment or interactions.

**Non-Goals:**
- No change to the number formats or the column order beyond the new `Tid` column.
- No responsive hiding of columns.

## Decisions

### Transaction list
- The row object gets `date` (date only) and `time` (`details[10] || ''`).
- The cell array becomes `[row.date, row.time, row.type, row.name, row.quantity, row.price, row.commission, row.total]`, and the `number` class applies from `index > 2`.
- The header becomes: `Datum`, `Tid`, `Typ`, the sort button `Aktie`, `Antal`, `Kurs`, `Avgår`, `Värde`. The sort button keeps its id and `aria-label`.
- *Alternative:* keeping the time inside the date cell. This was rejected because the user asked for its own column.

### Result table
- Only the header strings change: `Kurs`, `Avkastn`, `Tot avkastn` and `Tot avkastn (%)`. The cell order, the `number` class and the italic `index === 2` check are unchanged.

### Hover text in the minute chart
- When a purchase or sale has a time, the text becomes `${time} ${TYPE} … · courtage …`, with the time first and the trailing ` · kl. HH:MM` removed. Other events keep today's text.

### Layout (chosen after measuring)
- `#transaction-tables` uses `grid-template-columns: max-content minmax(0, 1fr)` instead of `2fr 1fr`.
- `#portfolio-summary-content table` uses `width: max-content; table-layout: auto` instead of `100%` and `fixed`, with `white-space: nowrap` in the cells, so that `Resultat` is as wide as its values and its row button.
- `max-width: 100%` and the existing `overflow-x: auto` on `.transaction-table-content` keep very wide content scrollable instead of breaking the layout.
- The narrow layout (≤ 900 px) already stacks the tables in one column and is unchanged.
- *Alternative:* keeping the 2:1 split. This was rejected by the user, because the result table would not get narrower at all with equal-width fixed columns.

### CSS
- `#purchase-list th, #purchase-list td` get `padding: 5px 6px`, the same as the result table.
- Headings (`#transaction-tables th`) get `white-space: normal` with `vertical-align: bottom`, so that a two-word heading can wrap. Data cells (`td`) keep `nowrap` in both tables, so that values stay on one line.

## Risks / Trade-offs

- [Headings like `Avkastn` are abbreviations] → The user chose them explicitly, and the spec states their meaning.
- [Wrapping headings make the header row taller] → The header stays sticky in the scrollable transaction list, and the tables become narrower.

## Notes from implementation

- **Sorting within a day.** The transaction list used to sort on `date + ' ' + time`, because the time was part of `row.date`. Now that `date` is date-only, the sort key is `${date} ${time}`, so that the newest time is still first within a day, and events without a time come last within their day.
- **Narrow layout (≤ 900 px).** `Resultat` no longer squeezes its columns with wrapped cell text. It keeps its content width and scrolls horizontally inside its own area, like `Transaktioner`. The page itself does not scroll sideways.

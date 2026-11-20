## Why

Since `add-unrealized-columns`, `Transaktioner` sits under `Resultat` at every width and shows about ten rows. On a wide screen the space to the right of `Resultat` stays empty, while the transactions are further down the page. The user wants them beside `Resultat` when they fit.

The first version of this change put `Transaktioner` right of the securities list, beside the chart, from 2000 px. After implementing it, the user clarified that the intended place is right of `Resultat`. This revision replaces that.

## What Changes

- **When both tables fit side by side at their full width:** the whole `Transaktioner` panel (heading, import controls and table) sits to the right of `Resultat`, under the chart, with both headings on one row.
  - The list is as tall as the `Resultat` table, but at least about ten rows, and scrolls vertically with the header kept on top.
- **Otherwise:** unchanged. `Resultat` is on top and `Transaktioner` under it, with about ten rows.
- **Switching:** the app measures whether the tables fit. It switches live when the window is resized or the tables' content changes, for example through a filter, an import or new prices, without a reload.
- **Unchanged behaviour:** import, delete, the dividend toggle, sorting and filters work the same in both positions.
- **Height:** the "at least ten rows" floor is an assumption, so a short `Resultat` (for example under solo) does not shrink the list to 3–4 rows, which the user disliked before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`: the requirement "Visa aktuell portföljställning bredvid transaktionslistan" gets the side-by-side layout when it fits, and two scenarios. The stacked-layout scenario applies when it does not fit.

## Impact

- **`public/assets/panel.js`:** a fit check toggles a class on `#transaction-tables`, and `syncTransactionListHeight` covers both layouts. The chart-row move from the first version is removed.
- **`public/assets/app.css`:** a two-column grid for the side-by-side class. The 2000 px chart-row rules from the first version are removed.
- **Tests:** `e2e/wide.spec.js` is rewritten for the new placement.
- **Unchanged:** data files and the server.

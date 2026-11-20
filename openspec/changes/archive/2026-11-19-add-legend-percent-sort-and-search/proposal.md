## Why

The securities list (`Värdepapperslistan`) has grown to almost 80 rows since accounts split securities into one row per account. Finding one security means scrolling. Ranking by total return in percent is also missing: `Total` ranks by kronor, which favours large holdings. The rows are also hard to read in their current colours.

## What Changes

- **Sort button:** a fifth sort button, `Total %`, ranks the list by total return in percent, highest first. It uses the same value as the `Tot avkastn (%)` column in `Resultat`. Securities without a value go last, in `aktier.csv` order. The choice is saved as `legend_sort` `total_percent` in `aktievy.json`, like the other sort orders.
- **Darker text:** the security name and the profit line under it get text colours 30 % darker than today:
  - the name goes from `#263448` to `#1b2432`
  - the profit line goes from `#2b3646` to `#1e2631`
  - hidden securities keep their reduced opacity
- **Search field:** a search field sits last in the list header, after the sort buttons. It filters the list rows to securities whose display name contains the typed text:
  - case does not matter
  - `glob` shows only the securities with `glob` somewhere in the name, and the account is part of the name, so `(I)` matches all securities on account `I`
  - the filter changes only which rows the list shows; curves, visibility, solo, sorting, `Transaktioner`, `Resultat` and saved files are unaffected
  - the search text is not saved and is empty after a reload
  - when nothing matches, the list says so

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`: the requirement "Kurvornas synlighet och legend" gets the `Total %` sort order, the darker text colours and the search field.

## Impact

- **`public/assets/chart.js`:**
  - `LEGEND_SORTS` and `legendEntries()` get the new sort order
  - `renderCustomLegend()` keeps the header with the search field between renders, so typing is not interrupted when the list is redrawn, and filters the rows
- **`public/assets/panel.js`:** exposes the total return in percent per series, computed as in `Resultat`, for the sort.
- **`public/assets/app.css`:** the legend colours and the search field's styles.
- **`private/src/Chart.php`:** `LEGEND_SORTS` accepts `total_percent`. `api/view-range.php` already validates against that list.
- **Tests:** PHP unit tests for the saved sort, and Playwright tests for the sort, colours and search.
- **Unchanged:** data files and the deploy script.

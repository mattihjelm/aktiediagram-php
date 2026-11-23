## Why

The securities list has about 80 rows. The securities the user actually follows, the ones shown in the chart, are spread across the list in every sort order, so they are hard to find among the hidden ones. The user wants one button that gathers them at the top. The group should be remembered, so that after trying `Namn` or `Total %` a click on the button brings the same group back.

## What Changes

- **New sort button:** a sixth sort button, `Valda`, after `Total %`. It puts the securities in a saved group of selected securities at the top of `Värdepapperslistan`, in the order they joined the group. The rest follow in `aktier.csv` order, like `Osorterad`.
- **The saved group:**
  - The first time `Valda` is chosen and no group is saved, the group becomes the securities shown in the chart at that moment, in the order of the list as it was displayed.
  - The group is saved in `aktievy.json` as `legend_selected`, a list of series keys (`TICKER` or `TICKER|KONTO`), and survives reloads and other sort orders.
  - When another sort is chosen, the group is kept unchanged. Showing or hiding securities then does not change it. The next click on `Valda` puts the same group at the top again.
- **While `Valda` is active:**
  - Showing a security by clicking its name adds it last in the group, so it moves up into the group at the top.
  - Hiding a security by clicking its name removes it from the group, so it moves down among the others.
  - Solo does not change the group, just as solo does not change the saved visibility.
- **Saved sort:** `legend_sort` gets the value `selected`. When the app opens with `Valda` saved, the list is shown with the saved group at the top.
- **Unchanged:** curves, colours, visibility, solo, search, `Transaktioner`, `Resultat` and `aktier.csv`. The sort only changes the order of the list.

Assumptions, since the request does not settle them:

- A security that is hidden under `Valda` leaves the group. Today's request only says that a newly shown security joins it.
- A security that joins the group is placed last in the group, not first. That keeps the existing order stable.
- Saved series keys that no longer exist in the chart are ignored.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`: the requirement "Kurvornas synlighet och legend" gets the `Valda` sort order and the saved group `legend_selected`.

## Impact

- **`public/assets/chart.js`:**
  - `LEGEND_SORTS` and `legendEntries()` get `selected`
  - `setLegendSort()` creates the group the first time
  - `toggleSeries()` updates and saves the group while `Valda` is active
- **`private/src/Chart.php`:**
  - `LEGEND_SORTS` gets `selected`
  - `legendSelected()` reads the group, and `meta.legendSelected` passes it to the page
  - `saveView()` writes `legend_selected` in a fixed key order
- **`public/api/view-range.php`:** accepts and validates `legend_selected` as a list of series keys for stocks in the app's list.
- **Tests:** PHP unit tests for saving, reading and validating the group, and Playwright tests for the button, the group, joining and leaving, and reloads.
- **Unchanged:** data file formats, `aktier.csv`, `aktiekop.csv` and the deploy script.

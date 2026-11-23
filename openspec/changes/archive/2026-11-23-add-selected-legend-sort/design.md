## Context

- **Sorting in the browser:** `chart.js` lists the buttons in `LEGEND_SORTS`. `legendEntries()` returns `[series, traceIndex]` pairs in display order, and `setLegendSort()` re-renders the list and posts `legend_sort` to `api/view-range.php`. The initial sort comes from `graph.layout.meta.legendSort`.
- **Sorting on the server:**
  - `Chart::LEGEND_SORTS` validates the value both in `view-range.php` and in `Chart::legendSort()`.
  - `Chart::saveView()` rewrites `aktievy.json` with a fixed key order: `start, end, log_scale, scale, last_solo, legend_sort, series_visible`. Keys outside that list are dropped on write.
- **Visibility:**
  - A click on a name goes through `toggleSeries(series)`, which flips the curve and saves the visibility.
  - Under solo, the click ends solo and restores the snapshot with the clicked security flipped.
  - `setSolo()` and `applyVisibility()` change visibility without saving it.
- **Validation of series keys:** `view-range.php` already validates `last_solo` as `TICKER` or `TICKER|K` with the ticker in `Stocks::load()`.

## Goals / Non-Goals

**Goals:**
- A `Valda` button that puts a remembered group of securities first.
- The group survives other sort orders and reloads.
- While `Valda` is active, name clicks add securities to the group or remove them.

**Non-Goals:**
- Changing which securities are visible when `Valda` is chosen. The sort only reorders the list.
- Manually reordering the group by drag and drop.
- A separate "reset group" control. Hiding and showing under `Valda` edits the group.

## Decisions

- **The group is an ordered list in `aktievy.json`:** it is stored as `legend_selected: ["ALFA.ST|T", …]`, next to `legend_sort`.
  - It belongs with the other view settings and uses the existing locked write.
  - An ordered list keeps a stable "order of joining" without timestamps.
  - Alternative considered: deriving the group from `series_visible` and `aktier.csv`. Rejected, because the user wants the group frozen while other sort orders are active, even when visibility changes.
- **Server:**
  - `saveView()` writes `legend_selected` after `legend_sort`, followed by `series_visible`.
  - `Chart::legendSelected(array $keys)` returns the saved list filtered to existing series keys, without duplicates. `meta.legendSelected` passes it to the page only when it is set. An empty list means "a group was saved but is empty"; a missing key means "no group yet".
  - `view-range.php` accepts `legend_selected` as a list of at most a few hundred strings, each validated like `last_solo`. Otherwise it returns 400.
- **Browser:**
  - `legendSelected` is `null` or an array, initialized from `meta.legendSelected`.
  - In `setLegendSort('selected')`, when `legendSelected === null` the group is created from the current `legendEntries()` order before the switch, filtered to visible stock traces. The group and the sort are then saved in one POST.
  - `legendEntries()` for `selected` takes the group members that exist, in group order, followed by the remaining entries in `aktier.csv` order.
- **Joining and leaving:** after `toggleSeries()` has saved the visibility, if `legendSort === 'selected'`:
  - a security that became visible is appended to the group, unless it is already there
  - a security that became hidden is removed from the group
  - the group is then saved with `{legend_selected}`

  The same applies when the click ends solo, since the click decides the clicked security's new visibility. `setSolo()` and its restore never touch the group.
- **Saving is fire-and-forget:** the save is queued like `setLegendSort`, and a failure logs a console warning. The list is already re-rendered from memory.

## Risks / Trade-offs

- **Hidden securities stay in the group:** if the user hides securities while another sort is active, they still sit at the top under `Valda`, shown dimmed. → This is what "the same group again" means. Hiding it under `Valda` removes it.
- **Removing on hide is an assumption:** it is not stated in the request, and it is recorded in the proposal. → Easy to change in one place if the user prefers that hidden securities stay in the group.
- **Account keys after imports:** an import may introduce new keys. They are not in the group until shown under `Valda`, which is the expected behaviour.

## Migration Plan

- No migration is needed. Existing `aktievy.json` files lack `legend_selected`, which means "no group yet".
- Older deployed code ignores the new key. One caveat: the old `saveView()` drops unknown keys on its next write, so a rollback would lose the group, which is harmless.
- Deploy with `./deploy.sh` as usual.

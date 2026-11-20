## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **`chart.js`:**
  - `LEGEND_SORTS` is `[['none','Osorterad'],['name','Namn'],['monthly','%/mån']]`, and `legendEntries()` orders the rows.
  - `refreshProfitLabel` computes `profit` in the stock's currency and stores `meta.monthlyPercent`.
  - The latest price row's `customdata` is `[price, shown price, factor, rate to SEK]`. For `BRK-B` the factor and rate make the price already SEK.
- **`Chart.php`:** `LEGEND_SORTS = ['none', 'name', 'monthly']`. `view-range.php` validates `legend_sort` against it.
- **Headings:**
  - `chart.js`: `stockHeading.textContent = 'Aktie / resultat'` and `aria-label` `Sortera aktielistan`
  - `panel.js`: `customLegend` `aria-label` `Aktielegend`, the `Resultat` header `<th>Aktie</th>`, and the `Transaktioner` header button `Aktie${… ' A–Z'}` with `aria-label="Sortera transaktioner på aktie"`

## Goals / Non-Goals

**Goals:**
- A `Total` sort comparable across currencies.
- "Värdepapper" in the three list and table headings, and the list's name.

**Non-Goals:**
- No visible list title.
- No change to the form field `Aktie`.
- No change to how the total is shown (`kkr`, `kUSD`, `kEUR`).

## Decisions

### Total in SEK for sorting only
- `refreshProfitLabel` stores `meta.totalSek = profit × rate`, where `rate` is the latest price row's `customdata[3]`. If that is missing or not positive, it uses 1 for SEK stocks and null otherwise. The value is null when there is no label (no purchases).
- `legendEntries()`, for `total`: sorted descending by `meta.totalSek`, missing values last. This is the same comparator as `monthly`, with a different key. `Array.prototype.sort` is stable, so ties keep `aktier.csv` order.
- **Why SEK:** `+0,3 kEUR` and `+8,2 kkr` must be comparable, and `Resultat` already shows `Tot avkastn` in SEK.

### Constants
- `Chart::LEGEND_SORTS` gets `'total'`.
- `chart.js` `LEGEND_SORTS` gets `['total', 'Total']`.
- The unit tests check that `total` is saved and read back.

### Naming
- `panel.js`: `aria-label` `Värdepapperslistan`, the `Resultat` `<th>Värdepapper</th>`, and the `Transaktioner` button text `Värdepapper${… ' A–Z'}` with `aria-label="Sortera transaktioner på värdepapper"`.
- `chart.js`: `Värdepapper / resultat` and `Sortera värdepapperslistan`.

### Tests
- `e2e/smoke.spec.js` expects the four sort buttons.
- A new test in `e2e/smoke.spec.js` uses the fixture:
  - the fixture's single holding (`Alfa Test`) must come first under `Total`, and the two others without returns follow in `aktier.csv` order
  - checks the headings `Värdepapper / resultat`, `Värdepapper` in both tables, and the list's `aria-label`.
- The manual check on real data compares the `Total` order with `Tot avkastn` in `Resultat`.

## Risks / Trade-offs

- [The latest rate for USD or EUR is missing] → `totalSek` is null and the stock sorts last. That is visible, not wrong.
- [`Tot avkastn` in `Resultat` uses another rate source (FX by date)] → The order can differ slightly for foreign stocks with nearly equal totals. That is acceptable for sorting.

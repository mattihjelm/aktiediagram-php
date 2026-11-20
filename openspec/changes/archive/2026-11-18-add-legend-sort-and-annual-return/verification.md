## Verification

Results of the checks in tasks.md for `add-legend-sort-and-annual-return`, run on 2026-11-18.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a copy of the local `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory.
- **Prices:** live from Yahoo through the PHP server.
- **Browser:**
  - Chrome, driven through the browser automation tools.
  - Desktop width: about 2200 px.
  - Phone width: a popup opened by a real click, 487 px, where `phoneLayoutQuery` matches.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | `legend_sort` saved last with the other keys kept; `legendSort()` reads a valid value and ignores an invalid one | "Alla 171 kontroller lyckades." (3 new) | ✓ |
| 2 | Annual percent | `(1 + m)^12 − 1` after `%/mån` | For a positive and a negative monthly value, the label equals the independent computation to two decimals | ✓ |
| 3 | No monthly value | No annual percent and no profit text | Stocks without purchases have an empty profit line, as before | ✓ |
| 4 | Start without `legend_sort` | `Osorterad` marked, order from `aktier.csv` | `Osorterad:true`; the rows follow `aktier.csv` | ✓ |
| 5 | `%/mån` (real click) | Highest first; the stocks with a value sorted descending; the rest in `aktier.csv` order; saved | The labels are in descending order; descending check true; tail equals the `aktier.csv` order; `aktievy.json` `"legend_sort": "monthly"` | ✓ |
| 6 | `Namn` (real click) | Swedish order, marked, saved | `localeCompare(…, 'sv')` order check true; alphabetical from A to V; `"legend_sort": "name"`. No current name starts with Å, Ä or Ö; the collation puts Ångel, Ärla, Öhman after Zeta | ✓ |
| 7 | Reload | The order is kept | After the reload `Namn:true` and the same first row | ✓ |
| 8 | `Osorterad` (real click) | Same order as `aktier.csv` | Row order equals the trace order | ✓ |
| 9 | Solo in a sorted legend | Solo and unchecking work; the order stays | Solo on one stock → only that stock visible, `Namn` still marked; uncheck → the stocks marked visible in `aktier.csv` | ✓ |
| 10 | Visibility click in a sorted legend | The curve toggles; the order stays | A hidden stock turned on; row not dimmed; `Namn` still marked | ✓ |
| 11 | Re-sort on recalculation | `%/mån` order holds after "Hämta aktuell kurs" | Values recalculated (in the fourth decimal); descending check true during and after the fetch | ✓ |
| 12 | Phone width | Buttons in 13 px, marked choice, no horizontal page scroll | 13 px; `%/mån:true`; legend 472 px wide in a 487 px window; no horizontal scroll; same order as on desktop | ✓ |
| 13 | Console | No errors | No errors | ✓ |
| 14 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 15 | `openspec validate add-legend-sort-and-annual-return --strict` | Valid | Valid | ✓ |

### Not verified

- **Yahoo timeouts.** During check 11, some current-price fetches timed out from this machine. This is unrelated to the change: the other stocks were updated and the sort held.

### Hosted check

- **2026-11-18:** The user uploaded the change to the web host and confirmed that it works.

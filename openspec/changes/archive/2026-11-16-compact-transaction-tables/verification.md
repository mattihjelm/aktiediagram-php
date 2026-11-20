## Verification

Results of the checks in tasks.md for `compact-transaction-tables`, run on 2026-11-12.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a fresh copy of `aktier.csv`, `aktiekop.csv` and `aktievy.json` in the session's scratch directory. Three test events were registered in the copy (KÖP 10:42, KÖP without a time, SÄLJ 14:05, all on 2026-11-12). The real `private/data` was never used.
- **Browser:** Chrome at a viewport width of 2221 CSS px, driven through the browser automation tools. Widths come from `getBoundingClientRect`.
- **"Before" measurement:** taken with the unchanged code on the same data, before any edit.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | `Resultat` headings | `Aktie`, `Antal`, `Kurs`, `GAV`, `Avkastn`, `Utdelning`, `Tot avkastn`, `Tot avkastn (%)`, `Värde`, `Värde SEK` (+ the row-button column) | As expected | ✓ |
| 2 | `Transaktioner` headings | `Datum`, `Tid`, `Typ`, `Aktie`, `Antal`, `Kurs`, `Avgår`, `Värde` | As expected | ✓ |
| 3 | `Tid` column | The time in its own column, `Datum` date-only, empty without a time | `2026-11-12 \| 14:05 \| SÄLJ …`, `2026-11-12 \| 10:42 \| KÖP …`, `2026-11-12 \|  \| KÖP …`, and an older `UTDELNING` row with an empty `Tid` | ✓ |
| 4 | Alignment | As before: `Datum`/`Tid`/`Typ` left, from `Aktie` right | Classes `-,-,-,number,number,number,number,number` | ✓ |
| 5 | Width of `Resultat` | Narrower, sized by content | Before 1398 px (11 × 136 px fixed columns). After 1039 px (columns 49–145 px) | ✓ |
| 6 | Width of `Transaktioner` | Fits without horizontal scrolling | Before 802 px in a ~707 px column, with the last column clipped. After 709 px in its container, no horizontal scroll | ✓ |
| 7 | Values on one line | No wrapped value cells | 0 value cells taller than one line. Header rows 28 px (none needed to wrap at this width) | ✓ |
| 8 | Sorting on `Aktie` | Alphabetical, then newest first | Rows ordered by name, and within one name the newest date first | ✓ |
| 9 | Hiding dividends | Only KÖP/SÄLJ rows | Types shown: `SÄLJ`, `KÖP` | ✓ |
| 10 | Minute-chart hover (the test stock) | The time first for events with a time; unchanged without | `10:42 KÖP 1 st à 600,00 kr · courtage 1,00 kr`, `KÖP 1 st à 605,00 kr · courtage 1,00 kr`, `14:05 SÄLJ 1 st à 610,00 kr · courtage 1,00 kr` | ✓ |
| 11 | Narrow layout (the ≤ 900 px rules injected, page 700 px wide) | Tables stacked, no page overflow | One column, 584 px wide. Each table scrolls horizontally inside its own area. The page does not scroll sideways | ✓ |
| 12 | `php private/tests/run.php` | All pass | "Alla 139 kontroller lyckades." | ✓ |
| 13 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 14 | `openspec validate compact-transaction-tables --strict` | Valid | Valid | ✓ |

### Notes

- **Layout change agreed with the user.** The layout change (content-sized `Resultat`) was agreed with the user during implementation, after measurement 5/6 showed that shorter headings alone would not narrow the fixed-layout result table. The spec, proposal and design were updated before the code.
- **Narrow layout.** `Resultat` now scrolls horizontally instead of wrapping cell text, as described in design.md.

### Not verified

- **A real narrow window.** The browser window could not be resized, so the narrow layout was simulated.


### Hosted check

- **2026-11-16:** The user uploaded the change to the web host and confirmed that it works.

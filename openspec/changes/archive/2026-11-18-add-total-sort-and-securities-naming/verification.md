## Verification

Results of the checks in tasks.md for `add-total-sort-and-securities-naming`, run on 2026-11-18.

### Environment

- **Playwright:** the suite in Chromium against the per-run fixture on `127.0.0.1:8766`.
- **Manual check:**
  - local `php -S 127.0.0.1:8765 -t public` on a copy of the local `aktier.csv`, `aktiekop.csv` and `aktievy.json`
  - Chrome, driven through the browser automation tools

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | `legend_sort: total` is saved and read back | "Alla 172 kontroller lyckades." (1 new) | ✓ |
| 2 | Playwright `Total` order | Higher total first, none last | The test adds an early Gamma purchase to the fixture. Order `Gamma Test`, `Alfa Test`, `Beta Test`; `totalSek` Gamma > Alfa; `legend_sort: total` saved; still marked after reload | ✓ |
| 3 | Headings | `Värdepapper / resultat`; `Värdepapper` in `Resultat` and `Transaktioner`; list named `Värdepapperslistan` | Asserted in Playwright and seen on real data (`aria-label` `Värdepapperslistan`, both table headings `Värdepapper`) | ✓ |
| 4 | Four sort buttons | `Osorterad`, `Namn`, `%/mån`, `Total` | Asserted in the smoke test | ✓ |
| 5 | Full suite twice | All pass | "42 passed (1.1m)" twice | ✓ |
| 6 | Real data `Total` order | Highest total in SEK first | All holdings ranked by their total in SEK, with the EUR holding converted; a reload kept `Total` | ✓ |
| 7 | Compared with `Tot avkastn` in `Resultat` | Same order | The same order except **one fully sold USD holding**, whose total in the list is much smaller than in `Resultat`. That difference was there before this change: the list and `Resultat` already calculated that holding differently. The sort follows the list's own total, as the spec says. The EUR holding differs slightly because the list uses the latest EUR rate | ⚠ known difference, not caused by this change |
| 8 | Console | No errors | No errors | ✓ |
| 9 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 10 | `openspec validate add-total-sort-and-securities-naming --strict` | Valid | Valid | ✓ |

### Not verified

- **Why that USD holding's total differs between the list and `Resultat`** (row 7). Not investigated. A possible cause is pre-split purchase prices, but that is not confirmed.

### Hosted check

- **2026-11-18:** The user uploaded the change to the web host and confirmed that it works.

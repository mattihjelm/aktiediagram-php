## Verification

Results of the checks in tasks.md for `add-legend-percent-sort-and-search`, run on 2026-11-19.

### Environment

- **Unit tests:** `php private/tests/run.php`.
- **Playwright:** the suite in Chromium against the per-run fixture.
- **Manual check:**
  - local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing at a fresh scratch copy of the real `aktier.csv`, `aktiekop.csv` and `aktievy.json`
  - driven by headless Chromium at 1400 × 1000 and 390 × 844 (phone)
  - the real `private/data` was checked with `shasum -c` before and after

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | `legend_sort` `total_percent` is saved and read back | "Alla 206 kontroller lyckades." (2 new) | ✓ |
| 2 | Playwright, `legend.spec.js` | `Total %` follows the `Tot avkastn (%)` column and survives a reload; text colours `rgb(27, 36, 50)` and `rgb(30, 38, 49)`, hidden rows at opacity 0.48; search by part of a name, by account `(i)`, no-match message, nothing else changed, focus and text kept across a re-render, a sort and a toggle, empty after reload; phone fits | 5 passed | ✓ |
| 3 | First run of the `Total %` reload test | Same order after a reload | After the reload all securities sorted as if they had no value. The first render runs while `panel.js` is still loading, before `window.totalReturnPercent` exists. `panel.js` now renders the list again after the first `Resultat`. design.md updated | ✓ after fix |
| 4 | Full suite | All pass; the smoke test now also expects `Total %` | "63 passed (1.8m)" | ✓ |
| 5 | Manual: `Total %` on the real data | Order equals `Resultat` | The securities with a value are in exactly the `Tot avkastn (%)` order. The securities without a value come after, in `aktier.csv` order | ✓ |
| 6 | Manual: colours | Darker name and profit line | `rgb(27, 36, 50)` and `rgb(30, 38, 49)`. The screenshot shows clearly darker text; hidden rows are still greyed | ✓ |
| 7 | Manual: search `glob` | Only names containing `glob` | Only matching rows, including a name where `glob` is inside a word (`Globala`) | ✓ |
| 8 | Manual: search `(t)` | Only securities on account `T` | Only rows ending in `(T)`, one per security with transactions | ✓ |
| 9 | Manual: phone width | Field fits, no sideways scroll | The field takes the legend width and the clear button shows. `scrollWidth` 390 | ✓ |
| 10 | Console | No errors | None, on desktop or phone | ✓ |
| 11 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 12 | `openspec validate add-legend-percent-sort-and-search --strict` | Valid | Valid | ✓ |
| 13 | Hosted after `./deploy.sh` | The app works on the web host | The user confirmed: "det är uppladdat och fungerar" | ✓ |

### Notes

- **Not caused by this change:** at 1400 px the page is 1439 px wide with the real data. That is the 39 px file chooser overflow noted in `add-account-per-transaction`.

### Not verified

- Nothing. The hosted app was confirmed by the user (row 13).

## Verification

Results of the checks in tasks.md for `add-wide-transactions-column`, run on 2026-11-19.

### History

- **First version:** put `Transaktioner` right of the securities list, beside the chart, from 2000 px. It was implemented and tested, then replaced before upload, after the user clarified that the intended place is right of `Resultat`. Its code and tests were removed (task 1.1), and the results below are for the revised version only.

### Environment

- **Unit tests:** `php private/tests/run.php`.
- **Playwright:** the suite in Chromium against the per-run fixture.
- **Manual check:**
  - local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing at a fresh scratch copy of the real `aktier.csv`, `aktiekop.csv` and `aktievy.json`
  - driven by headless Chromium, with the switch width found by bisection between 1400 and 2600 px
  - the real `private/data` was checked with `shasum -c` before and after

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | First version removed | No 2000 px `matchMedia` and no chart-row rules | grep finds neither | ✓ |
| 2 | Playwright, `wide.spec.js` | At 2600 px: side by side, headings on one row, tables at the same top, at least ten rows beside a short `Resultat`, scrolling with the header on top, no sideways scroll. Beside a tall `Resultat`, the list is as tall as `Resultat`. At 1400 px: stacked with ten rows. Resizing 2600 → 1400 → 2600 switches without a reload and keeps an import preview whose `Avbryt` still works | 4 passed, and 16 of 16 with `--repeat-each 4`. The tall-`Resultat` test first padded the rows too little (272 px against 369 px for ten rows) and was corrected | ✓ |
| 3 | Full suite | All pass | "Alla 206 kontroller lyckades.", "75 passed (1.8m)" | ✓ |
| 4 | Manual: switch width on the real data | Side by side exactly when it fits | It switches between 2216 and 2217 px: `Resultat` 1 284 px + 24 px gap + `Transaktioner` 793 px, plus the 92 px indent and page padding | ✓ |
| 5 | Manual at 2217 and 2400 px | Side by side | Headings both at y 1316. Tables both at y 1459. `Transaktioner` at x 1412, right of `Resultat`, which ends at 1388. The list is 553 px tall, equal to `Resultat`, with all transaction rows scrolling. The page is exactly as wide as the window | ✓ |
| 6 | Manual at 2216 and 1400 px | Stacked | `Transaktioner` under `Resultat`, with ten rows in 369 px. The page is as wide as the window | ✓ |
| 7 | Manual: solo on a holding with few transactions at 2400 px | Still side by side, no empty stretch | `Resultat` is 1 row, 63 px. `Transaktioner` holds the holding's few rows at their natural height; the ten-row floor is a maximum height, so fewer rows take less space | ✓ |
| 8 | Console | No errors | None | ✓ |
| 9 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 10 | `openspec validate add-wide-transactions-column --strict` | Valid | Valid | ✓ |
| 11 | Hosted after `./deploy.sh` (2026-11-20) | The layout works on the hosted app | The user confirmed: "funkar bra" | ✓ |

### Notes

- **Control rows side by side:** `Resultat`'s two filter boxes share a grid row with `Transaktioner`'s import controls, which are taller, so `Resultat`'s table starts a little lower than when stacked. This keeps both tables' tops aligned.

### Not verified

- Nothing. The hosted app was confirmed by the user (row 11).

## Verification

Results of the checks in tasks.md for `add-unrealized-columns`, run on 2026-11-19.

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
| 1 | Playwright, `unrealized.spec.js`: columns | Headers in spec order. Two buys and a sale give the unrealized amount and percent on the remaining 15 shares; `Avkastn` also holds the sale's profit. A dividend leaves both unchanged. A fully sold security shows `—` | 4 passed | ✓ |
| 2 | First manual check, side by side | `Transaktioner` readable beside `Resultat` at 1400 px | `Resultat` was 1 284 px, `Transaktioner` 0 px, and the page 1 661 px wide. Paused, and the user chose the stacked layout with about ten rows in `Transaktioner`. Spec, proposal, design and tasks updated (tasks 1.3 and 1.4 added) | ✓ after change |
| 3 | Playwright, layout | `Resultat` above `Transaktioner`, left-aligned, no sideways page scroll at 1400 px, 900 px and phone width; ten rows visible with 12 transactions, the last reached by scrolling, the sticky header still visible | 4 passed. The first run measured the sticky header on `thead` instead of the `th`; the test was corrected | ✓ |
| 4 | Full suite | All pass | "Alla 206 kontroller lyckades.", "71 passed (1.8m)" | ✓ |
| 5 | Manual: values on the real data | `Orealiserat` = value SEK − remaining basis | A foreign holding in EUR shows value SEK − remaining basis, slightly below `Tot avkastn (%)`, which includes its dividend. A holding with a dividend shows a negative `Orealiserat` while its total is positive. Fully sold holdings show `—`. Holdings without sales or dividends have `Orealiserat` equal to `Avkastn` | ✓ |
| 6 | Manual: layout at 1400 px | Stacked, ten rows, no sideways scroll | `Resultat` 1 284 px on top and `Transaktioner` 793 px below, with ten visible rows. The page is 1 400 px wide; the earlier 39 px overflow from the side-by-side layout is gone too | ✓ |
| 7 | Manual: phone width | Stacked, tables scroll inside their own area | `Resultat` is 374 px wide with a 1 071 px table scrolling inside it. `Transaktioner` shows ten rows. The page is 390 px wide | ✓ |
| 8 | Console | No errors | None | ✓ |
| 9 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 10 | `openspec validate add-unrealized-columns --strict` | Valid | Valid | ✓ |
| 11 | Hosted after `./deploy.sh` | The columns and the stacked layout work on the hosted app | The user confirmed: "ja det fungerar" | ✓ |

### Notes

- **The fund used for the Nordnet comparison** has no transactions in the local copy of `aktiekop.csv`; the server has imports the local copy lacks. The comparison with Nordnet's percentage needs the hosted app after upload. Expected: `Orealiserat` = price × remaining units − remaining basis, which with Nordnet's price gives Nordnet's amount and percentage.

### Not verified

- The exact figures for that fund on the hosted app were not reported back. The user confirmed the hosted app works (row 11).

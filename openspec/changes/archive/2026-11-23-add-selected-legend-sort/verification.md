## Verification

Results of the checks in tasks.md for `add-selected-legend-sort`, run on 2026-11-20.

### Environment

- **Unit tests:** `php private/tests/run.php`.
- **Playwright:** the suite in Chromium against the per-run fixture.
- **Manual check:**
  - local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing at a fresh scratch copy of the real `aktier.csv`, `aktiekop.csv`, `aktievy.json` and price cache
  - driven by headless Chromium at 1400 px
  - the real `private/data` was checked with `shasum -c` before and after

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests: `selected` sort, `legend_selected` saving, key order, filtering of unknown keys and duplicates, empty list versus missing, `Chart::isSeriesKey` | All pass | "Alla 219 kontroller lyckades." (13 new) | ✓ |
| 2 | Playwright, `selected.spec.js` | First `Valda` takes the visible securities in the displayed order (`Namn`) and saves both keys. The order survives a reload. Under `Total` toggles leave the group unchanged, and `Valda` restores it with the now hidden member still on top. Under `Valda` a shown security joins last, a hidden one leaves and moves down, solo leaves the group unchanged, and a name click that ends solo adds the security. The API rejects a string, an unknown ticker, a bad account, an object and a number with 400, and accepts duplicates (removed) and an empty list | 4 passed. The four files with the new tests passed in 3 of 3 repeated runs | ✓ |
| 3 | Full suite, with the sort button list in `smoke.spec.js` extended to `Valda` | All pass | "79 passed (2.0m)". A first full run lost its worker (SIGKILL) part way and was rerun | ✓ |
| 4 | Manual: buttons on the real data | Six buttons, `Valda` last | `Osorterad`, `Namn`, `%/mån`, `Total`, `Total %`, `Valda` | ✓ |
| 5 | Manual: first `Valda` | The visible securities on top, saved | Visible rows on top, then all hidden. `legend_sort` `selected` and one key per visible security in `legend_selected` | ✓ |
| 6 | Manual: `Total %` and back to `Valda` | Same group and order | Top rows and `legend_selected` unchanged | ✓ |
| 7 | Manual: show a hidden security, then hide the first selected | It joins at the end of the group, then the hidden one leaves | Shown right after the last group member, hidden one moved below the group. The group size is unchanged | ✓ |
| 8 | Manual: reload | Same order, `Valda` pressed | Same | ✓ |
| 9 | Console | No errors | None | ✓ |
| 10 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 11 | `openspec validate add-selected-legend-sort --strict` | Valid | Valid | ✓ |
| 12 | Hosted after `./deploy.sh` (2026-11-23) | The button works on the hosted app | The user confirmed it works | ✓ |
| 13 | Solo with `Valda` active (reported by the user, then withdrawn) | Solo on and off and a reload with solo keep `Valda` pressed, the order and `legend_selected` | Reproduced on the scratch copy: unchanged in all four states. The user then confirmed they had misread it | ✓ |

### Notes

- **Shared key check:** `Chart::isSeriesKey()` now validates both `last_solo` and `legend_selected` in `api/view-range.php`. Behaviour for `last_solo` is unchanged, and its existing tests pass.
- **Rollback caveat:** older code drops `legend_selected` on its next write to `aktievy.json`, as noted in design.md.

### Not verified

- Nothing. The hosted app was confirmed by the user (row 12).

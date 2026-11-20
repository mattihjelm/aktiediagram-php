## Verification

Results of the checks in tasks.md for `restore-last-solo-on-start`, run on 2026-11-18.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
- **Data:** a copy of the local `aktier.csv` (a few stocks marked visible, among them `SAAB-B.ST`), `aktiekop.csv` and `aktievy.json` in the session's scratch directory. `last_solo` was set to `SAAB-B.ST` in the copy.
- **Browser:**
  - Chrome, driven through the browser automation tools.
  - Desktop width: 2221 px.
  - Phone width: a popup opened by a real click, 487 px, where `phoneLayoutQuery` matches.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Unit tests | `last_solo: null` is stored, other keys are kept, `lastSolo()` → null | "Alla 168 kontroller lyckades." (3 new) | ✓ |
| 2 | Desktop start with `last_solo` | Saab is solo with the minute chart | solo `SAAB-B.ST`, visible `[SAAB-B.ST]`, "Saab – minutkurser" shown | ✓ |
| 3 | Uncheck solo (real click) | The stocks visible in `aktier.csv` come back; `last_solo` becomes null | The stocks marked visible in `aktier.csv` are shown; minute chart hidden; `aktievy.json` `"last_solo": null`, start and end unchanged | ✓ |
| 4 | Reload after unchecking | No solo | solo null, the same stocks visible | ✓ |
| 5 | Choose solo for another stock and reload | Starts in that stock's solo | solo and visible are that stock only | ✓ |
| 6 | Legend click on another visible stock during solo | Solo ends, that stock is toggled off, `last_solo` is null | solo null; the other visible stocks shown; `last_solo: null`; the stock's row saved with `false`, as for any legend click | ✓ |
| 7 | `aktier.csv` during solo | Unchanged by solo itself | Same `shasum` after steps 2–5; only the legend click in step 6 changed it, as intended | ✓ |
| 8 | Phone width start with `last_solo` | Saab is solo, minute chart at the top | phone true, solo `SAAB-B.ST`, minute chart `display: block` at top 0 | ✓ |
| 9 | Phone: uncheck and reload | The visible stocks come back; the reload is without solo | solo null, the visible stocks shown; after the reload solo null | ✓ |
| 10 | Console (desktop tab) | No errors | No errors | ✓ |
| 11 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 12 | `openspec validate restore-last-solo-on-start --strict` | Valid | Valid | ✓ |

### Not verified

- **Clicks in the phone popup** used the checkbox's `click()` from the opener, because the popup is outside the automation's tab group. The popup's console was not read.

### Hosted check

- **2026-11-18:** The user uploaded the change to the web host and confirmed that it works on both a phone and a Mac.

## Verification

Results of the checks in tasks.md for `uniform-control-height-and-transaction-heading`, run on 2026-11-18.

### Environment

- **Playwright:** the suite in Chromium against the per-run fixture on `127.0.0.1:8766`.
- **Manual check:**
  - local `php -S 127.0.0.1:8765 -t public` on a copy of the local `aktier.csv`, `aktiekop.csv` and `aktievy.json`
  - Chrome at 1659 px wide, driven through the browser automation tools
- **Screenshots:** Playwright screenshots of `#top-controls-row` at 1400 px and at 390 px (phone emulation).

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | Heights in Playwright | 35 px at 1400 and 800 px, 33 px at 390 px, for every field, drop-down and button in the form, `Kurser` and `Datumintervall` (checkboxes excluded) | All within 0.5 px in the new smoke test at the three widths | ✓ |
| 2 | Heights on real data | One height | 12 controls, all 35 px at 1659 px | ✓ |
| 3 | Alignment | `Kurser` and `Datumintervall` start at the form heading's left edge | Playwright: heading, `Kurser` and `Datumintervall` at 104/104/104 px at 1400 and 800 px, and 8/8/8 px at 390 px. Real data at 1659 px: heading and `Kurser` at 104 px, with `Datumintervall` beside `Kurser` at 427 px | ✓ |
| 4 | Texts | `Registrera transaktion`, `Lägg till transaktion` and `Importera transaktioner`; no "aktiehändelse" visible | Asserted in the smoke test; `document.body.innerText` contains no "aktiehändelse" on real data; the README also updated | ✓ |
| 5 | Quantity field width | Unchanged | 70 px (6ch + 20 px in border-box) | ✓ |
| 6 | Screenshots | No clipped text in buttons, date, time or drop-downs | Desktop and phone screenshots looked right. At 390 px the scale row only looked cut off because the screenshot covered `#top-controls-row`. Measured, it ends at 412 px in a 413 px layout viewport, and the page has no horizontal scroll | ✓ |
| 7 | Phone without horizontal scroll | No scroll | The existing phone smoke test (mobile emulation) passes. The new test first also checked scroll without mobile emulation; that showed the `Resultat`/`Transaktioner` tables and the chart SVG overflowing at 390 and 800 px desktop widths. That is unrelated to this change, so the check was dropped from the new test | ✓ |
| 8 | Full suite twice | All pass | "41 passed (1.1m)" and "41 passed (1.0m)" | ✓ |
| 9 | Console | No errors | No errors | ✓ |
| 10 | Real data untouched; deploy | `shasum -c` OK; deploy lists app files only | All OK; `./deploy.sh -n` lists `app.css`, `panel.js`, `index.php` and `Purchases.php` | ✓ |
| 11 | PHP unit tests and `openspec validate uniform-control-height-and-transaction-heading --strict` | Pass | "Alla 171 kontroller lyckades."; valid | ✓ |

### Not verified

- **Vertical alignment of the headings.** On wide screens `Kurser` and `Datumintervall` sit side by side, bottom-aligned as before, so the `Kurser` heading sits lower than `Datumintervall`'s, which has the `Start`/`Slut` labels under it. This was not part of the request.

### Hosted check

- **2026-11-18:** The user uploaded the change to the web host and confirmed that it works.

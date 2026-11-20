## Verification

Results of the checks in tasks.md for `improve-phone-layout`, run on 2026-11-16.

### Environment

- **Server:** local `php -S 127.0.0.1:8765 -t public` with `AKTIER_CONFIG` pointing to a test config.
  - The scratch directory had been cleaned, so the test `config.php` and password were recreated. A first server start before that pointed `AKTIER_CONFIG` at the missing file. The app then fails with "Konfigurationsfilen saknas" instead of falling back to `private/config.php`, and `shasum -c` confirmed that the real data was untouched.
- **Data:** a fresh copy of `aktier.csv`, `aktiekop.csv` and `aktievy.json`. The real `private/data` was never used.
- **Desktop:** Chrome at 2221 CSS px.
- **Phone:** `resize_window` had no effect on `innerWidth`, so the phone width was tested in a real popup window opened by a real click on a temporary test button: `window.open(…, 'width=390')`. Chrome made it 487 px wide (its minimum), which matches `(max-width: 600px)`. The popup is same-origin, so it was inspected from the opener.

### Results

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 1 | `last_solo` unit tests | Saved last with the other keys kept; read for a known stock; ignored for an unknown one; kept when the scale is saved | "Alla 143 kontroller lyckades." (4 new) | ✓ |
| 2 | Save on solo (desktop) | `aktievy.json` gets `last_solo`, kept when solo is turned off | `{"start": …, "end": …, "log_scale": false, "scale": "linear", "last_solo": "SAAB-B.ST"}` after solo on and off | ✓ |
| 3 | API with an unknown ticker | 400 | `400 {"error":"Aktien finns inte i appens lista."}` | ✓ |
| 4 | Labels inside the plot (desktop) | All end labels within the plot area, no overlap | 4 labels, all inside the plot area, 0 overlapping pairs | ✓ |
| 5 | Margins and plot width | Right margin ≈ 20 px, wider plot | `margin.r` 20, plot area 1623 of 1723 px | ✓ |
| 6 | Axis titles | Linear: none. Log and measures: as before | Linear `''`. Log `Egen logaritmisk skala per kurva`. Drawdown `Fall från tidigare topp (%)`. Log+drawdown overlay `Fall från tidigare topp (%)` | ✓ |
| 7 | Desktop load with `last_solo` saved | No auto-solo; order and fonts unchanged | Solo `null`, minute chart hidden, the title first at 24 px | ✓ |
| 8 | Phone load with `last_solo` = SAAB-B.ST | Saab auto-selected, minute chart first, the rest below | Solo `SAAB-B.ST`, legend checkbox checked. Order: `intraday-panel`, `stock-chart-title`, `stock-chart-viewport`, `top-controls-row`, `transaction-tables` | ✓ |
| 9 | Phone fonts | 13 px text, 16 px headings | Table cells, form labels and the legend 13 px. Minute-chart title and page title 16 px | ✓ |
| 10 | No horizontal page scroll (phone) | scrollWidth = clientWidth | 487 = 487 | ✓ |
| 11 | Minute chart at the top (phone) | Break-even line and pinned point work, and the popup stays inside | `▼ Nollpunkt …` shown. Pin shown at x 112–232 within a 487 px window. Chart 472 × 300 px | ✓ |
| 12 | Phone load without `last_solo` | No solo, phone order without the minute chart | Solo `null`, minute chart hidden. Order: title, chart, controls, tables. No page overflow | ✓ |
| 13 | Console | No errors | No errors | ✓ |
| 14 | Real data untouched | `shasum -c` OK | All OK | ✓ |
| 15 | `openspec validate improve-phone-layout --strict` | Valid | Valid | ✓ |

### Notes

- **The page title stays visible on the phone.** On the phone the page title `Aktiernas utveckling …` comes right after the minute chart and before the main chart. The spec lists the main chart, the legend, the form and the tables below the minute chart and does not mention the title.
- **Transaction markers in the minute chart.** Row 11 had none, because the fresh data copy has no events for that stock within the last 30 days. They were verified in `add-intraday-transaction-markers`.

### After the first upload (2026-11-16)

- **What the user saw.** On the iPhone, solo was not selected and the minute chart was still at the bottom. The diagnosis was that the asset URLs were not versioned, so Safari served the cached old `app.css` and `chart.js`. Fixed with `asset_url()`; see design.md.
- **Local checks after the fix.**
  - The rendered page links `assets/app.css?v=1794822485`, `chart.js?v=…`, `intraday.js?v=…`, `panel.js?v=…` and `app.js?v=…`, and the versioned CSS URL returns 200.
  - The page response still has `Cache-Control: no-store, no-cache, must-revalidate`.
  - "Alla 143 kontroller lyckades."
  - The real data is unchanged.

### Follow-up after testing on the iPhone (2026-11-16)

The user reported three points after the upload: the minute chart's `Kurs (SEK)` title should be hidden on the phone; the axis tick labels should be about 30 % of their size, on both charts on mobile only (the user chose this after being told that it gives about 4 px); and the minute chart should stay first in landscape.

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 16 | Desktop | Unchanged | Not phone, no auto-solo, tick labels 12 px on the main chart | ✓ |
| 17 | Phone popup (487 px) | Auto-solo; minute chart first; no `Kurs (SEK)`; tick labels 30 % (3.6 px) on both axes of both charts | Solo `SAAB-B.ST`. Order `intraday-panel`, `stock-chart-title`, … Minute chart y-title `''` with no title node, left margin 48. Ticks 3.6 px on x and y in both charts. No page overflow | ✓ |
| 18 | Layout switch without a reload (`resizeTo` on the popup, the same `change` event as a rotation) | Wide: desktop titles and ticks. Narrow again: phone values | Wide (1250 px): `Kurs (SEK)`, margin 92, ticks 12 px, title block first. Narrow (487 px): `''`, margin 48, ticks 3.6 px, minute chart first | ✓ |
| 19 | Tick-font relayout does not save the date range | No date-range POST | The only `view-range.php` POST was the auto-solo's `last_solo`; `start`/`end` unchanged | ✓ |
| 20 | Console / tests / data | No errors; all tests pass; real data unchanged | No errors; "Alla 143 kontroller lyckades."; `shasum -c` OK | ✓ |

### Second follow-up (2026-11-16): titles, status line, archive text

| # | Check | Expected | Observed | Result |
|---|-------|----------|----------|--------|
| 21 | Desktop status line | `Senaste kurs <time>: <price> <currency>` | `Senaste kurs 2026-11-16 11:20: 637,00 kr` (last close 637) | ✓ |
| 22 | Desktop archive text | On the link's line, after it, without the minute count, with the number of new minutes | `Arkiv: 2026-10-13 11:03 – 2026-11-16 11:19, 14 nya.` on the link's line | ✓ |
| 23 | Desktop titles | Unchanged | Page title 24 px, minute-chart title 19 px | ✓ |
| 24 | Phone titles | Half of the other phone headings | Page and minute-chart titles 8 px; other headings 16 px | ✓ |
| 25 | Phone archive text | Starts on the link's line, no page overflow | `Arkiv: 2026-10-13 11:03 – 2026-11-16 11:20, 1 ny.` on the link's line (1 line at 487 px). No page overflow. On narrower phones it may wrap, but it still starts on the link's line | ✓ |
| 26 | Console / tests / data | No errors; all tests pass; real data unchanged | No errors; "Alla 143 kontroller lyckades."; `shasum -c` OK | ✓ |

### Not verified

- **Landscape on a real phone.** It depends on `(pointer: coarse) and (max-height: 500px)`, which desktop Chrome cannot emulate here, because its pointer is `fine`. The media query is the same string in CSS and in JavaScript.
- **Readability of 3.6 px labels on the iPhone.** The size is the constant `PHONE_TICK_SIZE` in `chart.js` if it needs adjusting.
- A real iPhone (Safari) for this follow-up.
- The hosted app for this follow-up.

### Hosted check

- **2026-11-16:** The user uploaded the change, including both follow-ups, to the web host and confirmed that it works ("funkar").

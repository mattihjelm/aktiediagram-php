## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **`app.css`:**
  - `#stock-custom-legend` has `flex: 0 0 clamp(330px, 31vw, 460px)` and `font: 14px sans-serif`.
  - `.stock-legend-profit` is 12 px in `#435064`.
  - The header spans, help text and sort buttons are 12 px.
- **Narrow screens:**
  - At ≤ 900 px the legend sits under the chart at full width.
  - In the phone layout, `#stock-chart-layout *` sets every legend text to 13 px.
- **`chart.js` `refreshProfitLabel`** builds `${profitText} · ${monthText}`:
  - `profitText` is `<signed profit> <currency>`
  - `monthText` is `—/mån` or `<monthly profit> <currency>/mån · <monthly %>%/mån[ · <annual %>%/år]`
  - `currency` comes from `window.stockCurrency` (`kr`, `USD`, `EUR` or `''`)

## Goals / Non-Goals

**Goals:**
- A wider legend with larger, darker text on wide screens.
- The total return last on the line, in thousands.

**Non-Goals:**
- No change to the calculation, the sort order, `Resultat` or the phone layout.

## Decisions

### CSS
- `#stock-custom-legend`: `flex: 0 0 clamp(396px, 37vw, 552px)` and `font-size: 17px`.
- `.stock-legend-profit`, `.stock-legend-header span`, `.stock-legend-help` and `.stock-legend-sort button`: 14.5 px, with `#2b3646` for the profit line.
- The ≤ 900 px rule keeps `width: 100%`, so the legend fills the width under the chart as before.
- The phone block's `#stock-chart-layout *` 13 px rule wins on specificity, so the phone stays unchanged without new rules. The `!important` on `.stock-legend-help` is checked so it does not override the phone's 13 px; it is changed to a normal declaration if it does.
- The main chart takes the remaining width (`flex: 1 1 auto`). On a 1 400 px screen it shrinks by about 90 px.

### Label order and the thousands format
- `formatThousands(value, currency)`: `signed(value / 1000)` with one decimal, plus `kkr` for `kr`, `k<CUR>` for other codes, or a bare `k` when the currency is unknown.
- Amounts that round to zero show as `0,0`, with no sign and no `−0,0`. Otherwise the sign follows the rounded value, as in `signed()`.
- The label becomes `${monthText} · ${thousands}`, so a missing monthly value gives `—/mån · +1,2 kkr`.
- `meta.monthlyPercent` and the sort are unchanged.

### Test update
- `e2e/smoke.spec.js`'s pattern for the held stock changes to `/%\/mån · [+−-][\d\s]+,\d{2}%\/år · [+−-][\d\s]+,\d kkr$/`.

## Risks / Trade-offs

- [The main chart gets narrower on small laptops] → The legend's upper bound (552 px) and the `37vw` share keep the chart above 60 % of the width on screens of 1 000 px or more. Below 900 px the layout switches to stacked.
- [One decimal in `kkr` hides small amounts (under 50 kr)] → The user asked for a short total, and the exact value is still in `Resultat`.

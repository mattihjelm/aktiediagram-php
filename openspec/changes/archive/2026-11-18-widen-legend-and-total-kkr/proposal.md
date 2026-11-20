## Why

The stock legend right of the main chart is narrow and uses small, fairly light text. With many stocks and four figures per held stock, the return line is hard to read. The total return in kronor comes first on that line, but the user wants the rates first and the total last, in a shorter `kkr` form.

## What Changes

- **On wide screens (outside the phone layout):**
  - the legend is about 20 % wider: from `clamp(330px, 31vw, 460px)` to `clamp(396px, 37vw, 552px)`
  - its text is about 20 % larger: names 14 → 17 px; return line, header, help text and sort buttons 12 → 14,5 px
- **Everywhere:** the return line under each stock gets a darker color, from `#435064` to `#2b3646`.
- **New order on the return line:** the total return moves to the end and is shown in thousands with one decimal.
  - Before: `+8 234,50 kr · +500,00 kr/mån · +1,50%/mån · +19,56%/år`
  - After: `+500,00 kr/mån · +1,50%/mån · +19,56%/år · +8,2 kkr`
  - Kronor become `kkr`. Other currencies get a `k` prefix, such as `+0,2 kUSD` or `+0,3 kEUR`.
  - When the monthly value is missing, the line is `—/mån · <total>`.
- **Phone layout:** the 13 px text and full-width legend are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`:
  - "Beräkna resultat per aktie": the order of the figures, and the total in thousands at the end
  - "Kurvornas synlighet och legend": the legend's width, text size and darker return text on wide screens

## Impact

- **Browser:**
  - `public/assets/app.css`: legend width, font sizes and color
  - `public/assets/chart.js`: label order and the thousands format in `refreshProfitLabel`
- **Tests:** `e2e/smoke.spec.js` expects the line to end in `%/år`, so its pattern is updated to the new order.
- **Server and data:** no changes.

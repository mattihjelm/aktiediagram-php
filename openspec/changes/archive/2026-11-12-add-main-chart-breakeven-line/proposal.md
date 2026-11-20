## Why

The break-even line in the minute chart only covers the last 30 days. The user wants to see the same break-even price against the long-term price history in the main chart. This only makes sense when a single stock is shown, so the line is shown only while a stock is solo.

## What Changes

- While a stock is solo and held, the main chart shows a horizontal dashed line at the stock's break-even. The line is labelled `Nollpunkt <pris> <valuta>`.
  - The value is the same as in the minute chart: GAV − total net dividends after källskatt / number of shares held.
  - The currency is the main chart's currency for the stock. Berkshire is in kr, as the main chart already is, so no conversion is needed there.
- The main chart is indexed to 100 at the visible start date. The line is therefore drawn at `nollpunkt / kurs vid synligt startdatum × 100`, and it moves when the visible date range changes, just like the curve.
- The line works on both the linear and the logarithmic scale, on the solo stock's own axis.
- If the line is outside the visible y-range, the label is shown at the top or bottom edge with `▲`/`▼`, like in the minute chart. The y-axis keeps fitting the curve.
- No line is shown without a solo stock, without holdings, or when an exchange rate is missing. The line updates when transactions change, and it disappears when solo is turned off.
- Comparisons, endpoint labels, hover and `aktievy.json` are unchanged.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`: adds the requirement "Nollpunktslinje i huvuddiagrammet vid solo". The existing requirements "Nollpunktslinje i minutdiagrammet", "Logaritmisk skala" and "Kursinformation och jämförelsemarkeringar" are unchanged.

## Impact

- `public/assets/panel.js`: a shared `window.getBreakeven(ticker)` that returns the value and currency, used by both charts.
- `public/assets/intraday.js`: uses the shared function and keeps only the kr → USD conversion.
- `public/assets/chart.js`: the break-even shape and label are added in `comparisonOverlays`, and the chart is refreshed on solo changes and transaction changes.
- No server changes and no data changes.

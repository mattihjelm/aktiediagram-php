## Why

When looking at the minute chart for a stock the user owns, there is no way to see at which price the holding breaks even. The user wants a horizontal line at the break-even price: GAV minus the received dividends per held share. Above the line the holding is profitable including dividends.

## What Changes

- The minute chart shows a horizontal dashed line labelled `Nollpunkt <pris> <valuta>` when the solo stock is currently held.
- The line's value is GAV − (total net dividends after källskatt for the stock / number of shares held), in the minute chart's currency (the stock's trading currency).
  - GAV is the same value as in the `GAV` column of the portfolio table.
  - Net dividends are the stock's `UTDELNING` events after källskatt, as already summed in the portfolio table. Dividends booked in another currency, such as SEK imported from the broker for a USD stock, are converted at the rates of their dividend dates.
  - When the transactions are booked in kronor but the minute chart is in another currency (Berkshire: booked in kr, minute chart in USD), the value is converted at the latest exchange rate.
- If the line is outside the visible price range, the label is shown at the top or bottom edge with an arrow, so that the y-axis keeps fitting the prices.
- No line is shown when nothing is held or the value cannot be computed (missing exchange rate). The rest of the minute chart is unaffected.
- The line updates when transactions are added, changed, deleted or imported while the stock is solo.
- The pinned point (vertical line and popup) keeps working together with the new line.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`: adds the requirement "Nollpunktslinje i minutdiagrammet". The existing requirements "Minutkurser för solo-vald aktie", "Låst punkt i minutdiagrammet" and "Beräkna resultat per aktie" are unchanged.

## Impact

- `public/assets/panel.js`: the per-stock holding calculation in `renderPortfolioSummary` is extracted so that the minute chart can reuse it. The minute chart is notified when the summary is re-rendered.
- `public/assets/intraday.js`: break-even line, label and edge marker. The shapes are combined with the pinned point's vertical line.
- `public/api/intraday.php`: also returns the latest SEK rate for the minute chart's currency, used for the kr → USD conversion.
- `private/tests/run.php`: a check of the new response field if it is computed in PHP.
- No changes to data files, file formats or imports.

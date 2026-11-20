## Why

The minute chart shows the last 30 days of prices for the solo stock, but not the user's own transactions in that period. The main chart already marks purchases, sales and dividends. Seeing them in the minute chart as well makes it easy to compare a trade with how the price moved during those days.

## What Changes

- The minute chart marks the solo stock's `KÖP`, `SÄLJ` and `UTDELNING` events whose date has minute prices, which in practice means the last 30 days.
- Transactions have a date but no time, so each marker is placed at that day's first trading minute.
  - Purchases and sales are drawn at the transaction price, converted to the minute chart's currency.
  - Dividends have no share price, so they are drawn on the price curve at that minute.
- The symbols are the same as in the main chart: circle for a purchase, downward triangle for a sale, diamond for a dividend. The markers use the stock's color in the main chart.
- Hovering a marker shows the type, quantity, price or dividend per share, and courtage or källskatt.
- Events on days without minute prices (older than 30 days, or non-trading days) are not shown.
- The markers update when transactions are added, changed, deleted or imported while the stock is solo.
- The pinned point, the break-even line, Vecka/Månad, the archive and the main chart are unchanged.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`: adds the requirement "Transaktioner i minutdiagrammet". The existing requirements "Minutkurser för solo-vald aktie", "Låst punkt i minutdiagrammet" and "Nollpunktslinje i minutdiagrammet" are unchanged.

## Impact

- `public/assets/panel.js`: exposes the solo stock's transactions (date, type, price, quantity, courtage, rates and chart price) from the main chart's `purchase` trace, for example as `window.getTransactions(ticker)`.
- `public/assets/intraday.js`: a marker trace, conversion to the minute chart's currency, placement, hover, and an update hook next to `updateIntradayBreakeven`.
- No server changes and no data changes.

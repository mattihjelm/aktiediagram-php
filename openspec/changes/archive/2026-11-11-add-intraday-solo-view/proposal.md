## Why

The comparison chart only has daily closing prices, so it cannot show how a single stock has moved during the last few days. When the user focuses on one stock with solo, they want to see its price minute by minute for the last week, and be able to zoom out to the last month. Yahoo Finance offers 1-minute data for the last 30 days, which covers exactly that.

## What Changes

- When a stock is selected with solo, a separate minute chart appears below the main chart, showing that stock's actual price (in the stock's trading currency) minute by minute.
- The minute chart opens on the last week and has buttons `Vecka` and `Månad` to switch between the last 7 days and the last 30 days (the most Yahoo provides at 1-minute resolution).
- Time without trading (nights, weekends, holidays) is hidden on the time axis so trading days sit next to each other.
- The minute chart disappears when solo is turned off, and switches stock when solo moves to another stock.
- A new API endpoint fetches 1-minute prices for one stock from Yahoo Finance in several parallel requests (Yahoo allows at most 8 days per 1-minute request) and caches the result for a few minutes.
- The main chart, its daily data, the saved view and the CSV files are unchanged.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`: adds the requirement "Minutkurser för solo-vald aktie". The existing requirements "Kurvornas synlighet och legend" (solo) and "Historiska kurser och indexerat jämförelsediagram" keep their behavior; solo now also controls the minute chart.

## Impact

- `private/src/Market.php`: fetch and merge 1-minute data in 8-day windows over the last 30 days, with a short file cache in `data/cache`.
- New `public/api/intraday.php`: returns one stock's minute prices as JSON, after login, for tickers in `aktier.csv` only.
- `public/index.php`: a new section for the minute chart below the main chart.
- New `public/assets/intraday.js` plus hooks in `public/assets/chart.js` (solo on/off) and styles in `public/assets/app.css`.
- `private/tests/run.php`: tests for window splitting and merging of minute data.
- More Yahoo requests (about 5 per solo selection, cached). No new dependencies; runs on one.com shared hosting.

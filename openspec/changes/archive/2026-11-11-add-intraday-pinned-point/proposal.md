## Why

In the minute chart a month has about 10 000 points, so it is hard to pick out one exact minute with the pointer. The hover popup also disappears as soon as the pointer moves. The user wants to pin a point by clicking it, and then step through the prices one minute at a time with the arrow keys or with buttons.

## What Changes

- Clicking a point in the minute chart pins it:
  - a marker and a vertical line show the selected minute
  - a popup stays open with the time and the price in the stock's currency
- The popup has the buttons `◀` (one minute back), `▶` (one minute forward) and `×` (close). The left and right arrow keys do the same as `◀` and `▶`, and `Esc` closes the popup.
- "One minute" means the previous or next minute with a price. Time without trading (nights, weekends, holidays) and minutes without trades are skipped.
- If the pinned point moves outside the visible time range, the chart pans so that the point stays visible.
- Clicking another point moves the pin. Switching solo stock, turning solo off, and `Vecka`/`Månad` behave as described in the requirement.
- Hover over the minute chart keeps working as before.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`: adds the requirement "Låst punkt i minutdiagrammet". The existing requirement "Minutkurser för solo-vald aktie" is unchanged.

## Impact

- `public/assets/intraday.js`: click handling, pin state, marker, popup, key and button handling, and keeping the pin visible.
- `public/index.php`: popup markup inside `#intraday-panel`.
- `public/assets/app.css`: popup styles.
- No server or data changes. The main chart and its click-to-compare behavior are unaffected.

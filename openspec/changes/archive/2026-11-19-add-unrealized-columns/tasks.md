## 1. Columns

- [x] 1.1 In `public/assets/panel.js`, have `resultFrom` return `unrealizedSek` and `unrealizedPercent`, null when nothing is held, an FX rate is missing or the basis is zero. Verify with a Playwright test on a fixture with a buy, a sale and a dividend, checking the expected values computed in the test from the fixture's prices.
- [x] 1.2 Add the columns `Orealiserat` and `Orealiserat (%)` after `Tot avkastn (%)` in `renderPortfolioSummary`, formatted like their neighbours, with `—` when null. Verify with Playwright that the headers are in spec order, that a dividend leaves the unrealized values unchanged, and that a fully sold security shows `—`.

## 1b. Layout

- [x] 1.3 In `public/assets/app.css`, make `#transaction-tables` one column with `Resultat` above `Transaktioner` at every width, and let `#portfolio-summary-content` scroll sideways. Remove the 900 px overrides and the side-by-side `min-height` for these tables. Verify with Playwright at 1400 px, 900 px and phone width that `Resultat` is above `Transaktioner` and the page does not scroll sideways.
- [x] 1.4 In `panel.js`, make `syncTransactionListHeight` show the header plus ten rows. Verify with Playwright on a fixture with more than ten transactions that ten rows are visible, the eleventh is reached by scrolling, and the header stays visible.

## 2. Verification

- [x] 2.1 Run the full unit and Playwright suites, and update any expectation of the old header list. All must pass.
- [x] 2.2 Manual check in the running app on a scratch copy of the real data, with the real `private/data` checked by `shasum -c` before and after:
  - a fund with earlier sales shows `Orealiserat` equal to (price × remaining units − remaining basis) and `Orealiserat (%)` within the price difference of Nordnet's figure
  - a foreign holding shows (value SEK − basis SEK)
  - measure the widths of `Resultat` and `Transaktioner` at 1400 px and at phone width
  - no console errors

  Record the results in `verification.md`.
- [x] 2.3 Run `openspec validate add-unrealized-columns --strict` and confirm it is valid.

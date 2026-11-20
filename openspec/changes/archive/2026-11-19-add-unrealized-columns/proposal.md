## Why

`Tot avkastn (%)` in `Resultat` divides all profit by all purchases ever made, so it cannot be compared with Nordnet. Nordnet shows the unrealized profit on the current holding, relative to that holding's acquisition value. For example, for a fund with earlier sales (illustrative numbers):

| Source | Calculation | Result |
|---|---|---|
| App | 7 000 kr / 35 000 kr | 20,00 % |
| Nordnet | 5 000 kr / 20 000 kr | 25,00 % |

The user wants Nordnet's measure in the app, to reconcile holdings directly.

## What Changes

- **Two new columns in `Resultat`, `Orealiserat` and `Orealiserat (%)`,** placed after `Tot avkastn (%)` and before `Värde`.
- **`Orealiserat`:** the current holding's market value in SEK minus its remaining acquisition value in SEK. That is latest price × remaining quantity × latest FX rate, minus the weighted average acquisition value including courtage, converted at each purchase's FX rate.
  - Dividends and realized profit from sales are not included.
- **`Orealiserat (%)`:** `Orealiserat` divided by the remaining acquisition value, with two decimals.
- **Missing values:** both show `—` when nothing is held, or when an FX rate is missing.
- **Layout:** at every width, `Resultat` sits on top and `Transaktioner` directly below. Today they sit side by side on wide screens, and with the two extra columns `Transaktioner` no longer fits; this was found during implementation and chosen by the user.
  - `Resultat` scrolls sideways inside its own area when it is wider than the page
  - `Transaktioner` shows about ten rows and scrolls vertically, instead of being as tall as `Resultat`, which today gives 3–4 rows
- **Unchanged:** the existing columns and their calculations, the legend, and the data files.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`:
  - "Visa aktuell portföljställning bredvid transaktionslistan": what the table shows, how unrealized profit is computed, and the stacked layout with ten rows. The requirement keeps its name so the spec history stays traceable
  - "Kolumnrubriker i Resultat och Transaktioner": the header order
  - "Kurvornas synlighet och legend": drops the side-by-side sentence

## Impact

- **`public/assets/panel.js`:** `resultFrom` returns the unrealized amount and percent, and `renderPortfolioSummary` adds the two columns.
- **Tests:** Playwright tests for the headers and the values. The existing tests that read `Resultat` by header name or by the first eight columns are unaffected.
- **`public/assets/app.css`:** the `#transaction-tables` grid becomes one column, with `Resultat` first, and the old 900 px overrides for these tables go.
- **`panel.js` `syncTransactionListHeight`:** it sizes the list to the header plus ten rows, instead of the height of `Resultat`.

## Context

- **Where `Resultat` is built:** `panel.js` `renderPortfolioSummary()`, from `resultFrom(trace, stock)`, which wraps `holdingFrom(trace)`.
- **`holdingFrom` already tracks:**
  - `held`: the remaining quantity
  - `sekBasis`: the remaining acquisition value in SEK, with the weighted average including courtage, each buy converted at its own FX rate, and reduced proportionally on each sale
  - `fxMissing`: set when a buy or sale lacks an FX rate
- **What `resultFrom` adds:** `latestPrice`, `currentFx` and `validFx`. Today's `profitExDividendSek` is `realizedSek + latestPrice × currentFx × held − sekBasis`.
- **Column order:** the header is one `innerHTML` string, and the cells are an array in the same order.
- **Tests:** the Playwright tests read `Resultat` cells by header name (`cell(page, …, 'Antal')`) or by index 0–7 (`legend.spec.js` reads `Tot avkastn (%)` at index 7).

## Goals / Non-Goals

**Goals:**
- Numbers that reconcile with Nordnet's `Avkast. SEK` and `Avkast. %` per holding, apart from price and FX source differences.

**Non-Goals:**
- Changing `Avkastn`, `Tot avkastn` or `Tot avkastn (%)`.
- Using the broker's actual exchange rates or fees; the FX rates still come from Yahoo.
- Totals rows, sorting on the new columns, or showing the measure in the legend.

## Decisions

- **Amount:** `resultFrom` adds `unrealizedSek = validFx && !fxMissing && held > 0 ? latestPrice × currentFx × held − sekBasis : null`.
  - This is exactly the unrealized part of `profitExDividendSek`, so the two cannot drift.
- **Percent:** `unrealizedPercent = unrealizedSek !== null && sekBasis > 0 ? unrealizedSek / sekBasis × 100 : null`.
- **Formatting:**
  - same as the neighbouring columns: `formatKr` for the amount, and the `+x,xx%` format of `Tot avkastn (%)` for the percent
  - `—` when null
  - both cells get the `number` class
- **Placement:**
  - after `Tot avkastn (%)` and before `Värde`, so they sit next to the other return columns
  - indices 0–7 are unchanged, so the existing tests and `Total %` keep working
- **Alternative rejected:** changing `Tot avkastn (%)` to Nordnet's measure. That would lose the "all profit over all purchases" view and change the legend's `Total %` sort.

### Stacked layout (chosen after the first manual check)
- **The grid:** `#transaction-tables` becomes a single column at every width:
  1. the `Resultat` heading
  2. its controls
  3. the table
  4. the `Transaktioner` heading
  5. its controls
  6. the list

  The 900 px media block's placements for these tables, which put `Transaktioner` first, are removed, and so is the side-by-side `min-height` that aligned the two control rows.
- **`Resultat`:** `#portfolio-summary-content` gets `max-width: 100%` and `overflow-x: auto`. The table keeps `width: max-content` and scrolls inside its box, so the page never scrolls sideways.
- **Ten rows:** `syncTransactionListHeight` sets the list's `max-height` to the sticky header's height plus ten times the first body row's height, plus 1 px for the border. With no rows it falls back to 320 px. It still runs on resize and after each render. A CSS line count was rejected because the row height depends on font size and wrapping.

## Risks / Trade-offs

- [`Resultat` gets wider] → The manual check found it at 1 284 px at 1400 px, which pushed `Transaktioner` to 0 px and made the page 1 661 px wide. The user chose the stacked layout below.
- [Price and FX source differ from Nordnet: daily close from Yahoo versus Nordnet's latest price] → Documented. The amounts reconcile when the price is the same, as in the fund example in the spec.

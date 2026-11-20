## Why

The `Resultat` and `Transaktioner` tables are wide because of long column headings, so they take more room than needed next to each other. The time of a trade, added in `add-transaction-time`, is shown after the date in the transaction list and last in the minute-chart hover, where it is easy to miss. The user wants the time in its own column and first in the hover, and shorter headings so that the tables become narrower.

## What Changes

- **Minute chart:** the hover over a purchase or sale with a time begins with the time, for example `10:42 KÖP 1 st à 600,00 kr · courtage 1,00 kr`. Events without a time, and dividends, are shown as today.
- **`Transaktioner`:** a separate column `Tid` after `Datum`. It is empty when there is no time, and `Datum` shows only the date.
- **New headings:**

  | Table | Old heading | New heading |
  |-------|-------------|-------------|
  | `Resultat` | `Senaste kurs` | `Kurs` |
  | `Resultat` | `Resultat exkl utd` | `Avkastn` |
  | `Resultat` | `Resultat (kr)` | `Tot avkastn` |
  | `Resultat` | `Resultat (%)` | `Tot avkastn (%)` |
  | `Transaktioner` | `Kurs/belopp` | `Kurs` |
  | `Transaktioner` | `Courtage/källskatt` | `Avgår` |
  | `Transaktioner` | `Total/nettobelopp` | `Värde` |

- **Narrower columns:** the cell padding in `Transaktioner` is reduced to the same as in `Resultat`. The headings are allowed to wrap onto two lines in both tables, while the values stay on one line.
- **Layout:** `Resultat` is sized by its content instead of taking two thirds of the width with equal-width columns, and `Transaktioner` gets the remaining width. The user chose this after the first measurement. Before, `Resultat` stretched every column to 136 px, and the 802 px transaction table was clipped in its ~700 px third.
- The column contents, the calculations, the sorting, the filters and the row buttons are unchanged.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`:
  - The requirement "Klockslag för köp och sälj" is modified: the time is shown in its own column `Tid`, and first in the minute-chart hover.
  - The requirement "Kolumnrubriker i Resultat och Transaktioner" is added, stating the exact headings.
  - The requirement "Visa aktuell portföljställning bredvid transaktionslistan" is modified: `Resultat` is as wide as its content, instead of having more space than the transaction list.
  - The requirement "Konvertera mäklarens transaktionsexport" describes the content, not the heading texts, and is unchanged.

## Impact

- `public/assets/panel.js`: the heading strings in `renderPortfolioSummary` and `renderPurchaseList`, a separate `Tid` cell, and an adjusted cell-index check for the numeric right alignment.
- `public/assets/intraday.js`: the order of the hover text.
- `public/assets/app.css`: padding and heading wrapping for both tables, the grid columns of `#transaction-tables`, and an automatic table layout for `Resultat`.
- No server or data changes.

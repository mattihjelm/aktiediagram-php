## Context

See proposal.md for the scope.

- **Form (`#purchase-form`):**
  - fields `#purchase-type` (`KÖP`/`SÄLJ`/`UTDELNING`), `#purchase-ticker`, `#purchase-date`, `#purchase-time`, `#purchase-quantity`, `#purchase-price` and `#purchase-commission`
  - the total `#purchase-total` and the status `#purchase-status`
- **Suggestions:**
  - Changing stock or date calls `suggestPurchasePrice()`, which uses the last close on or before the date.
  - Quantity and price input sets the commission to 0,25 % of the amount, rounded to öre.
  - A dividend relabels the fields, hides `Tid` and clears price and commission.
- **Submit:** `POST api/purchases.php`. On success:
  - a row is appended to `aktiekop.csv`
  - a point is added to the stock's purchase trace
  - the legend label, `Transaktioner` and `Resultat` are refreshed
  - the status text is set and the fields are cleared

  Errors come from `Purchases::entryFromForm` (for example `Antalet måste vara större än noll.`) and `api/purchases.php` (`Det finns ingen kursdata före köpdatumet.`), and are shown in the status.
- **Lists:**
  - `Transaktioner` (`#purchase-list-content`) has the columns `Datum`, `Tid`, `Typ`, `Aktie`, `Antal`, `Kurs`, `Avgår` and `Värde`.
  - `Resultat` (`#portfolio-summary-content`) has `Aktie` and `Antal`, among others.
- **Fixture:**
  - `aktiekop.csv` is written once in `createFixture` with four `ALFA.ST` rows. `resetState()` does not touch it today.
  - `BETA.ST` has no transactions.
  - The daily caches cover two years.
- **No edit or delete:** the app has no such controls, so they are out of scope.

## Goals / Non-Goals

**Goals:**
- Cover the register-transaction chain end to end, offline and independent of order.

**Non-Goals:**
- No editing or deleting of transactions, since the app has none.
- No broker import.
- No foreign currencies.
- No changes to app code.

## Decisions

### Reset `aktiekop.csv` per test
- `createFixture` writes the four rows to `aktiekop-base.csv` in the fixture directory.
- `resetState()` copies it over `data/aktiekop.csv` before each test, which keeps the smoke and solo tests unchanged.

### Readers in the helpers
- **`readTransactions()`** returns the data rows of the fixture's `aktiekop.csv` as arrays split on `;`.
- **`dailyClose(ticker, date)`** reads the fixture cache and returns the last close on or before the date, so a test can compute the expected suggestion instead of hard-coding it.

### Expected values from the inputs
- **Suggested price:** formatted as `toLocaleString('sv-SE', {useGrouping: false, minimumFractionDigits: 2})`, which is the field's own format.
- **Commission:** `round(quantity × price × 0,0025, 2)`.
- **Resultat `Antal`:** the fixture's 14 held shares of `ALFA.ST` (10 + 5 − 3 + 2), changed by the test's purchase or sale. The test reads the row's `Antal` cell by column header, not by position.
- **Stock and dates:**
  - `BETA.ST`, which has no holding, so its legend label appears only after the purchase
  - a date about 30 business days back from the fixture's own date list, so it has a close
  - for the invalid case, a date before the first cached day

### Solo marker
- `ALFA.ST` is selected as solo, and a purchase is registered on the newest minute day at 11:00.
- The minute chart's transaction trace (index 2) must then contain that time.

## Risks / Trade-offs

- [Swedish number formatting uses a non-breaking space as the thousands separator] → Numbers in assertions are compared after normalizing whitespace, or with regexes that allow `\s`.
- [The app's status texts change] → The tests match the key parts (name, type, quantity and `Sparat i aktiekop.csv`), not the whole sentence.
- [A test adds a row and fails before the end] → The next test's `resetState()` restores the base file anyway.

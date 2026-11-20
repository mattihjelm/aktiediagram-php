## 1. Fixture and helpers

- [x] 1.1 In `e2e/fixture.js`, write `aktiekop-base.csv` in `createFixture` and copy it to `data/aktiekop.csv` in `resetState()`
- [x] 1.2 In `e2e/helpers.js`, add `readTransactions()` and `dailyClose(ticker, date)`

## 2. Tests

- [x] 2.1 `e2e/transactions.spec.js`:
  - suggested price, commission and total
  - purchase with time (status, CSV row, `Transaktioner`, `Resultat`, legend `%/år`, chart trace, cleared form)
  - sale lowers `Antal`
  - dividend labels and saved row
  - validation for quantity 0 and a date before the history (no row added)
  - persistence after reload
  - marker in the minute chart during solo
- [x] 2.2 README: mention the transaction tests

## 3. Kontroll

- [x] 3.1 Run `npm run test:e2e` twice; all tests pass in both runs. Then:
  - run `transactions.spec.js` alone
  - break one assertion on purpose to see a failure, then restore it
  - confirm with `shasum -c` that `private/data` is untouched
  - confirm that `./deploy.sh -n` lists nothing from `e2e/`
- [x] 3.2 Write `verification.md`; `php private/tests/run.php` and `openspec validate add-playwright-transaction-tests --strict` pass

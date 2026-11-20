## 1. Helpers

- [x] 1.1 Add `writeView(view)` to `e2e/fixture.js` and export it from `e2e/helpers.js`

## 2. Tests

- [x] 2.1 `e2e/scale.spec.js`:
  - default `Linjär`
  - `Logaritmisk` (axis and saved `log`)
  - a measure alone (percent axis, title, saved `ma200`)
  - one measure at a time and drawdown ≤ 0
  - `Logaritmisk` + measure (overlay traces per visible stock, saved `log_change63`, hiding a stock hides its trace)
  - `Linjär` unchecks the others, and unchecking the last box re-checks `Linjär`
  - reload restores `log_drawdown`
  - legacy `log_scale: true` opens in `Logaritmisk`
- [x] 2.2 README: mention the scale tests

## 3. Kontroll

- [x] 3.1 Run `npm run test:e2e` twice; all tests pass in both runs. Then:
  - run `scale.spec.js` alone
  - break one assertion on purpose to see a failure, then restore it
  - confirm with `shasum -c` that `private/data` is untouched
  - confirm that `./deploy.sh -n` lists nothing from `e2e/`
- [x] 3.2 Write `verification.md`; `php private/tests/run.php` and `openspec validate add-playwright-scale-tests --strict` pass

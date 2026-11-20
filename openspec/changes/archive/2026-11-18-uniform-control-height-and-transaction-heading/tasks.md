## 1. Texter

- [x] 1.1 Replace "aktiehändelse(r)" with "transaktion(er)" in `public/index.php`, `public/assets/panel.js`, the comment in `private/src/Purchases.php`, `e2e/transactions.spec.js` and the README

## 2. Utseende

- [x] 2.1 In `public/assets/app.css`:
  - add `--control-height` (35 px, and 33 px in the phone block)
  - give the controls in `#purchase-form`, `#visible-date-controls` and the two quote buttons that height, with border-box (checkboxes excluded)
  - remove the buttons' 42 and 36 px minimum heights
  - keep the quantity field's visible width
- [x] 2.2 In `public/assets/app.css`, put `#refresh-controls` on its own line, left-aligned with the form heading, also in the ≤ 900 px rule

## 3. Tester

- [x] 3.1 In `e2e/smoke.spec.js`, add a test of the texts, heights and alignment at desktop and phone width; `npm run test:e2e` passes

## 4. Kontroll

- [x] 4.1 Manual check in the running app on a copy of the data, at desktop and phone width:
  - all controls are equally tall, with no clipped text in buttons, date, time or the drop-downs
  - `Kurser` and `Datumintervall` line up with the heading
  - the quantity field is as wide as before
  - no "aktiehändelse" visible
  - no horizontal scroll on the phone
  - no console errors
- [x] 4.2 Write `verification.md`; confirm that `private/data` is untouched; `php private/tests/run.php` and `openspec validate uniform-control-height-and-transaction-heading --strict` pass

## Context

See proposal.md for the motivation and specs/aktiediagram/spec.md for the behavior.

- **Measured with Playwright on the test fixture:**

  | | Buttons | `Typ`/`Aktie` | `Datum` | `Tid` | `Antal`/`Kurs`/`Courtage` | `Datumintervall` fields |
  |---|---|---|---|---|---|---|
  | Desktop (1400 px) | 42 | 35 | 37 | 40 | 35 | 32 |
  | Phone (390 px) | 36 | 33 | 35 | 38 | 33 | 31 |

- **Positions at 1400 px:**
  - `#purchase-panel` and its heading start at x = 104.
  - `#refresh-controls` (`Kurser` and `Datumintervall`) is a wrapping flex row with `justify-content: flex-end` and `margin-left: clamp(20px, 3vw, 44px)`. So `Datumintervall` started at x = 366 and `Kurser` at x = 1075 at that width. On the user's wide screen both sit under the form, indented.
- **`app.css`:**
  - `#purchase-form input, select, button` get `padding: 7px 9px` and border-box. The button has `min-height: 42px`.
  - `#purchase-quantity` is `content-box`, so its width is `6ch` of text.
  - `#refresh-data-button` and `#current-price-button` have `min-height: 42px`.
  - The phone block sets the three buttons to `min-height: 36px`.
- **Texts:** "aktiehändelse(r)" appears in:
  - `public/index.php`: heading, button and status
  - `public/assets/panel.js`: the import button and its file field label, three import statuses, the save status and the save error
  - a comment in `private/src/Purchases.php`
  - `e2e/transactions.spec.js`: the button name, used by the tests

## Goals / Non-Goals

**Goals:**
- One control height per layout in the three areas, equal to the form fields' height.
- `Kurser` and `Datumintervall` left-aligned with the form heading.
- No visible "aktiehändelse" left in the app.

**Non-Goals:**
- No change to widths, fonts or spacing beyond what is needed.
- No changes to checkboxes, the legend, the minute chart or the `Transaktioner` and `Resultat` controls.
- No change to file names (`aktiekop.csv`) or API messages that don't contain the word.

## Decisions

### A custom property for the height
- `:root { --control-height: 35px; }`, with `--control-height: 33px` in the phone block. These are the form fields' heights today.
- These get `box-sizing: border-box; height: var(--control-height)`:
  - `#purchase-form input:not([type=checkbox])`
  - `#purchase-form select` and `#purchase-form button`
  - `#visible-date-controls input:not([type=checkbox])`
  - `#refresh-data-button` and `#current-price-button`
- The buttons' `min-height` rules (42 and 36 px) are removed. Their vertical padding is reduced so that the text fits: `padding: 0 11px` and `line-height: 1`.
- `Datum` and `Tid` are capped at the same height. Chrome's native date and time inputs otherwise grow to 37 and 40 px.

### Keep the quantity field's width
- `#purchase-quantity` changes to border-box with `width: calc(6ch + 20px)`: 6ch of text plus 2 × 9 px padding and 2 × 1 px border. The visible width is unchanged.

### Left alignment
- `#refresh-controls`: `flex-basis: 100%`, `margin-left: 0` and `justify-content: flex-start`. It always starts on its own line under `#purchase-panel` inside `#top-controls-row`, at the same x as the heading.
- The gap between `Kurser` and `Datumintervall` stays (`gap: 10px`).
- The ≤ 900 px rule sets `margin-left: clamp(12px, 3vw, 24px)` on `#refresh-controls`, so it is set to `0` there too. The phone layout already uses full width.

### Text replacements
- Each string is replaced exactly, with Swedish forms: `aktiehändelse` → `transaktion`, `aktiehändelsen` → `transaktionen`, `aktiehändelser` → `transaktioner`, with the capital letter kept where the old text had one.
- `e2e/transactions.spec.js` and its comment follow.

### Test
- A new smoke test at 1400 px and at 390 px:
  - the heading reads `Registrera transaktion` and `Lägg till transaktion` exists
  - no element's text contains "aktiehändelse"
  - every control in the three areas has the same rendered height, 35 or 33 px within 0.5 px
  - at 1400 px, `Kurser` and `Datumintervall` start at the heading's x within 1 px

## Risks / Trade-offs

- [Buttons with 35 px height and 16 px text look tight] → The text is one line (`white-space: nowrap`) and is centered by `line-height: 1`. This is checked visually.
- [Native date pickers in Safari or iOS render differently] → The explicit height applies there too. It is checked on a real iPhone after upload.
- [`Kurser`/`Datumintervall` never sit beside the form on very wide screens] → That is the requested alignment.

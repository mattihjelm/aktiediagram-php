## Why

The controls at the top of the page are uneven. On desktop:
- the buttons `Lägg till aktiehändelse`, `Hämta slutkurser` and `Hämta aktuell kurs` are 42 px, taller than the form's input fields at 35 px
- the `Datumintervall` start and end fields are 32 px, smaller than the form's fields
- `Datum` (37 px) and `Tid` (40 px) also differ

`Kurser` and `Datumintervall` sit under the form but indented by a flexible margin, so their left edge does not line up with the heading `Registrera aktiehändelse`.

The user also wants every visible "aktiehändelse" in the app to say "transaktion" instead: headings, buttons, status texts and the import button.

## What Changes

- **One height:** every field, drop-down and button, except checkboxes, in the `Registrera transaktion` form, `Kurser` and `Datumintervall` gets the form fields' height: 35 px on wide screens and 33 px in the phone layout. The buttons shrink to that height and the date range fields grow to it.
- **Alignment:** `Kurser` and `Datumintervall` start on their own line under the form, left-aligned with the heading `Registrera transaktion`, with no extra indent.
- **Renamed texts:**
  - `Registrera aktiehändelse` → `Registrera transaktion`
  - `Lägg till aktiehändelse` → `Lägg till transaktion`
  - `Aktiehändelser sparas i aktiekop.csv …` → `Transaktioner sparas i aktiekop.csv …`
  - `Sparar aktiehändelse…` → `Sparar transaktion…`
  - `Aktiehändelsen kunde inte sparas.` → `Transaktionen kunde inte sparas.`
  - `Importera aktiehändelser` → `Importera transaktioner`, and the file field's label `Välj CSV-fil med transaktioner`
  - the import statuses: `Förhandsgranskar transaktioner…`, `Importerar transaktioner…` and `Inga transaktioner sparades.`
  - The PHP comment in `Purchases.php` follows.
- **Spec wording:** the spec's wording follows the new texts, and the requirement "Registrera och spara aktiehändelser" is renamed "Registrera och spara transaktioner".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aktiediagram`:
  - **Renamed:** "Registrera och spara aktiehändelser" → "Registrera och spara transaktioner". It also gets the common height, the alignment and two new scenarios.
  - **Wording only, "aktiehändelse(r)" → "transaktion(er)":**
    - "Layout på telefon"
    - "Nollpunktslinje i minutdiagrammet"
    - "Transaktioner i minutdiagrammet"
    - "Nollpunktslinje i huvuddiagrammet vid solo"
    - "Klockslag för köp och sälj"
    - "Konvertera mäklarens transaktionsexport"

## Impact

- **`public/index.php`:** heading, button and status text.
- **`public/assets/panel.js`:** the import button and label, import statuses, and save statuses.
- **`public/assets/app.css`:**
  - the shared `--control-height` (35 px, or 33 px on phones)
  - the alignment of `#refresh-controls`
- **`private/src/Purchases.php`:** a comment only.
- **Tests:**
  - `e2e/transactions.spec.js` uses the new button name.
  - A new smoke test checks the heading, the heights and the alignment at desktop and phone width.
- **Server behavior and data:** no changes.

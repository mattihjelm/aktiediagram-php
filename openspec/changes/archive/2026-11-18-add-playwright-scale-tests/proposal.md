## Why

The `Skala` checkboxes (`Linjär`, `Logaritmisk` and the three measures) have rules that are easy to break:

- `Linjär` excludes the others.
- Only one measure can be on at a time.
- `Logaritmisk` can be combined with a measure.
- Unchecking the last box selects `Linjär`.

Each mode also rebuilds axes and traces, saves to `aktievy.json` and must come back after a reload. Several earlier bugs were in exactly this area: a rebase crash in measure mode, uneven ticks on the overlay axis, and empty overlay traces. None of it is covered by the Playwright suite.

## What Changes

- **Fixture helper:** `writeView(view)` in `e2e/fixture.js`, re-exported from `e2e/helpers.js`, writes `aktievy.json` before a test, so a test can start from a saved or legacy scale.
- **New spec `e2e/scale.spec.js`:**
  - **Default:** only `Linjär` is checked and the y-axis is linear.
  - **`Logaritmisk`:** `Linjär` is unchecked, the axis is logarithmic with hidden tick labels, and `aktievy.json` gets `scale: "log"` and `log_scale: true`.
  - **A measure alone (`Avvikelse från 200-dagars medel`):** a percent axis (`ticksuffix " %"`) with the measure's title is shown, and `scale: "ma200"` is saved.
  - **One measure at a time:** checking `Fall från tidigare topp` unchecks `Avvikelse …`. All drawdown values are ≤ 0, and `scale: "drawdown"` is saved.
  - **`Logaritmisk` + a measure:**
    - both boxes are checked
    - there is one measure trace (`meta.role: "measure"`) per visible stock, on a visible percent axis
    - `scale: "log_change63"` is saved
    - hiding a stock hides its measure trace
  - **`Linjär`** unchecks everything else. Unchecking the last checked box re-checks `Linjär`.
  - **Reload:** a saved `log_drawdown` restores both checkboxes and the axes.
  - **Legacy view:** an `aktievy.json` with only `log_scale: true` opens in `Logaritmisk`.
- **README:** mention the scale tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The app's behavior is unchanged, so the change is marked `skip_specs`.

## Impact

- **New file:** `e2e/scale.spec.js`.
- **Changed files:** `e2e/fixture.js` and `e2e/helpers.js` (`writeView`) and the README test section.
- **App code, dependencies and deploy:** unchanged.

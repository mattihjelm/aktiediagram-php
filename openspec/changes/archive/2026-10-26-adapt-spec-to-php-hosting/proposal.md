## Why

The `aktiediagram` spec describes the original local Python app: a Python program that starts a loopback HTTP server, writes a static HTML copy, stops with Ctrl+C and imports the broker export from `~/Downloads` with a command-line tool. The app is being ported to PHP on one.com shared web hosting, where there is no Python, no long-running server process and no shell. The app will also be reachable from the public internet, so the spec must require access protection and that the data files cannot be downloaded directly.

## What Changes

- **BREAKING** Remove the requirement `Lokal körning` (loopback server, browser auto-open, `aktier_graf.html`, Ctrl+C). Replace it with a requirement for running as PHP on the web host, where each request is handled by PHP and the UI runs in the browser.
- Modify `Konfigurerbar aktielista` so the data files live in the app's protected data directory instead of "the same directory as the Python program".
- Modify `Historiska kurser och indexerat jämförelsediagram`: price data is fetched by the server on request, skipped stocks are reported in the UI instead of the terminal, and the title timestamp ignores data files instead of Python cache and the generated HTML file.
- **BREAKING** Modify `Konvertera mäklarens transaktionsexport`: drop `konvertera_aktiekop.py`, `--apply` and the `~/Downloads` default. Import works by uploading the export file in the browser, shows a preview first and writes to `aktiekop.csv` only after explicit confirmation. Mapping, idempotency and the unmapped-rows popup stay the same.
- Add a requirement for single-user login (PHP login page with a session) that protects every page and every API endpoint, with logout.
- Add a requirement that `aktier.csv`, `aktiekop.csv`, `aktievy.json` and other data or configuration files cannot be fetched directly over HTTP.

## Capabilities

### New Capabilities

None. All changes extend the existing `aktiediagram` capability.

### Modified Capabilities

- `aktiediagram`: modifies `Konfigurerbar aktielista`, `Historiska kurser och indexerat jämförelsediagram` and `Konvertera mäklarens transaktionsexport`. Removes `Lokal körning`. Adds `Drift på webbhotell`, `Inloggning` and `Skyddade datafiler`.

## Impact

- Code: the PHP port does not exist yet in this repo. This change defines the target behavior it is built against. All Python code (the main program and `konvertera_aktiekop.py`) is replaced by PHP endpoints and browser JavaScript.
- APIs: `/api/purchases` and the other endpoints (import, price refresh, view state, visibility) require a logged-in session and refuse unauthenticated requests.
- Data: the `aktier.csv`, `aktiekop.csv` and `aktievy.json` formats are unchanged. Existing files are copied from the Python installation into the protected data directory.
- Hosting: one.com shared hosting with PHP and Apache `.htaccess`. Outbound HTTPS from PHP is needed to reach Yahoo Finance.

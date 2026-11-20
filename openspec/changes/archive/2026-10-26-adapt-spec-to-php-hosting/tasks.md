## 1. Structure and configuration

- [x] 1.1 Create the public directory (`index.php`, `login.php`, `logout.php`, `api/`, `assets/`) and the private directory (`src/`, `data/`, `data/cache/`, `config.php`) as in design.md, and verify that `php -l` passes for every PHP file
- [x] 1.2 Add a configurable path to the private directory, and verify that the app starts both with the directory outside the web root and as a subdirectory
- [x] 1.3 Add `.htaccess` that forces HTTPS, plus `Require all denied` and `Options -Indexes` for the private directory, along with a placeholder `index.html`, and verify that `curl -I` on an HTTP address redirects to HTTPS

## 2. Login

- [x] 2.1 Add a script or documented command that produces a `password_hash` for `config.php`, and verify that `password_verify` accepts the right password and rejects a wrong one
- [x] 2.2 Implement `login.php` with session regeneration, `Secure`/`HttpOnly`/`SameSite=Strict` cookies and an inactivity timeout, and verify that the right password shows the app and a wrong one shows a generic error
- [x] 2.3 Implement throttling of failed attempts with a growing delay and a lockout, and verify that the 11th wrong attempt in a row is refused even with the right password until the lockout expires
- [x] 2.4 Implement `require_auth()` in every page and API file, and verify with `curl` without a cookie that pages redirect to `login.php` and every `api/*.php` returns 401 without data
- [x] 2.5 Implement a CSRF token on all writing API calls, and verify that a POST without the token or with a wrong token is refused and leaves the data files unchanged
- [x] 2.6 Add the `Logga ut` button and `logout.php`, and verify that API calls return 401 after logging out

## 3. Data files

- [x] 3.1 Implement the storage class with `flock` (shared/exclusive) and writes through a temp file plus `rename()`, and verify with a script that runs two parallel writes that `aktiekop.csv` stays valid
- [x] 3.2 Port the reading and validation of `aktier.csv` (creation from `aktier.example.csv`, max 50, unique ticker/name, visibility values), and verify with copies of the Python version's files that the same stocks are loaded and that invalid files show the error in the browser
- [x] 3.3 Port reading and writing of `aktiekop.csv` (including `source_id`, `amount_currency`) and `aktievy.json` with unchanged formats, and verify that a file read and saved again without changes is byte-identical

## 4. Market data

- [x] 4.1 Implement fetching from Yahoo Finance with cURL and the file cache in `data/cache/` (only days after the last cached day), and verify that a second call does not refetch the history
- [x] 4.2 Port the close-time rule, the USD/SEK conversion for `BRK-B` and FX lookup per transaction date, and verify against the Python version's values for a known date
- [x] 4.3 Implement the price API per ticker or batch plus intraday fetching, and verify that a full first load of the configured stocks completes without hitting `max_execution_time`
- [x] 4.4 Show skipped tickers and Yahoo errors in the browser, and verify with a nonexistent ticker and with a blocked network call that the other stocks and the transactions are still shown

## 5. Port of the unchanged UI

- [x] 5.1 Move the chart, legend, solo/filtering, hover, comparisons, transaction form, transaction list and results table to `assets/` JavaScript against the PHP APIs, and verify manually in the running app that each scenario in the `aktiediagram` spec behaves as in the Python version
- [x] 5.2 Implement the title timestamp from the newest program file, excluding data, cache and uploads, and verify that it changes after a deploy but not after a saved transaction

## 6. Import via upload

- [x] 6.1 Implement `api/import.php?step=preview` (file size and UTF-16/tab validation, `Värdepapper` mapping from config, dedup by `source_id` and the legacy tuple, skipped rows with reasons), and verify with a real export that the counts match the Python tool's preview and that `aktiekop.csv` is unchanged
- [x] 6.2 Implement `step=confirm` with a preview id from the session, a new dedup under `LOCK_EX` and an append, and verify that importing the same file twice adds no rows the second time
- [x] 6.3 Build the UI: a required file picker, a preview with `Bekräfta`/`Avbryt`, markers added without reloading, and the button and popup for unmapped rows, and verify manually in the running app that canceling leaves the list unchanged and that the popup scrolls in both directions
- [x] 6.4 Verify that uploaded files are deleted after the preview and cannot be reached through any URL

## 7. Deploy and acceptance

- [x] 7.1 Write the deploy instructions (SFTP upload, `config.php`, copying the data files, generating the password hash), and verify them by deploying to one.com from them
- [x] 7.2 On one.com, request `aktier.csv`, `aktiekop.csv`, `aktievy.json`, `config.php` and the data directory directly, with and without login, and verify that every response is 403/404 without content and that no directory listing is shown
- [x] 7.3 Log in on one.com with the copied data files and verify manually that stocks, transactions, results and the saved date range match the Python version

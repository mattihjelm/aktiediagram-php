## Context

See proposal.md (Why). The repo has no PHP code yet, so this design sets the structure the port is built in. Constraints on one.com shared hosting: PHP runs per request under Apache, `.htaccess` is honored, there is no shell, no cron or background worker is assumed, and the `max_execution_time` and upload size limits are fixed by the host. Data stays in flat files (`aktier.csv`, `aktiekop.csv`, `aktievy.json`) whose formats must not change, so existing files from the Python install can be copied over as they are.

## Goals / Non-Goals

**Goals:**
- One deployable directory that works by uploading files over SFTP/FTP.
- Every data read and write goes through an authenticated PHP endpoint.
- Same CSV and JSON formats and the same import mapping and deduplication rules as the Python version.

**Non-Goals:**
- Multiple users or roles.
- Moving data to MySQL.
- Scheduled background price updates. Prices are fetched only when the user asks or opens the app.

## Decisions

### Directory layout: public directory and private directory
```
<webroot>/            index.php, login.php, logout.php, api/*.php, assets/ (JS, CSS)
<private>/            src/ (PHP classes), data/ (csv, json, cache/), config.php
```
`<private>` is placed outside the web root when the one.com account allows it (the home directory above `httpd.www`). Otherwise it is a subdirectory of the web root with `.htaccess` `Require all denied` and `Options -Indexes`, plus an `index.html` placeholder as a fallback if `.htaccess` is ignored. A config constant points to `<private>`, so both layouts work.
*Alternative*: data in MySQL. Rejected because it changes the file formats and the migration from the Python version, and gives little benefit for a single user.

### Authentication: PHP session login
- `config.php` holds a `password_hash()` hash (bcrypt/argon2) for one user, and a small setup script or a documented one-liner produces the hash. No plain-text password is stored.
- `session_regenerate_id(true)` runs after login. Cookies are set with `Secure`, `HttpOnly` and `SameSite=Strict`. Sessions time out after inactivity (default 8 hours, configurable).
- A shared `require_auth()` runs first in every page and API file. Pages redirect to `login.php`, and APIs return `401` JSON.
- CSRF: a per-session token is sent as the `X-CSRF-Token` header on every POST/PUT/DELETE and compared with `hash_equals`. Together with `SameSite=Strict`, this satisfies the forged-write scenario.
- Throttling: failed login attempts are counted in a small JSON file in `data/` per client IP, with a growing delay and a 15-minute lockout after 10 failures in a row.
- `.htaccess` forces HTTPS with a redirect.
*Alternative*: `.htaccess` Basic Auth. The user rejected it because it has no logout or custom page, and the PHP session is needed for the API anyway.

### File access: one storage class with `flock`
All reads take `LOCK_SH`, and writes take `LOCK_EX` on a separate `.lock` file, write to a temp file in the same directory and finish with `rename()`. This meets the concurrent-write requirement without a database. Appending to `aktiekop.csv` also goes through a temp file plus `rename()`, under the same lock as the dedup check. Existing bytes are kept unchanged, and CSV is written like Python's `csv` module (QUOTE_MINIMAL, CRLF).

### Figure and calculations: same data as Python, original JavaScript
PHP builds exactly the Plotly figure that Python built: traces in the same order, the same `customdata`, layout and template. A comparison against the Python-generated `aktier_graf.html` gave identical values for 150,612 price points and all markers. The browser JavaScript (legend, solo, comparisons, results table and form) is reused nearly unchanged, with only API URLs, the CSRF header and the import flow changed. The legend's result labels are computed by the original `refreshProfitLabel` in the browser instead of in Python. Its date handling was corrected to whole UTC days, so the labels match Python's formula exactly. Money formatting rounds like Python (`sprintf`), and the import uses exact decimal arithmetic (`Dec`) without bcmath/gmp, so dedup keys match Python's.

### Market data: PHP cURL against Yahoo Finance, with a file cache
The server calls Yahoo's chart endpoint (`query1/query2 .../v8/finance/chart/<ticker>`) with cURL. Daily history is cached per ticker in `data/cache/` as JSON. `Hämta slutkurser` fetches only days after the last cached day. On page load, full history is fetched again when the cache is older than 20 hours, so that splits take effect, as they did when Python refetched at every start. A missing close is retried at most every 30 minutes, and so is a failed fetch. The frontend first asks which symbols need fetching, fetches them in batches of five with a progress text, and then loads the whole figure in one request. Drawing curves one by one as they arrive was dropped because the original chart code expects all traces at `newPlot`. A batch measured 0.4–0.7 s locally, well under `max_execution_time`. The figure is streamed as JSON one trace at a time and gzip-compressed (about 2.3 MB for about 40 stocks). The close-time rule (exchange close plus a margin), the BRK-B conversion to SEK and FX lookup are ported as-is from the Python logic.
*Alternative*: fetching Yahoo directly from the browser. Rejected because of CORS, and because the server would not have the data for the result calculations.

### Import: upload, preview token, confirm
1. `POST api/import.php?step=preview` with the uploaded file. PHP checks size and that the file is UTF-16 (BOM) and tab-separated, converts with `mb_convert_encoding`, maps rows, deduplicates against the current `aktiekop.csv`, and returns counts, new rows and skipped rows with reasons. The parsed new rows are stored in the session (not as a file under the web root) together with a random preview id. The upload itself is deleted right away.
2. `POST api/import.php?step=confirm` with the preview id (`step=cancel` discards the preview). PHP takes `LOCK_EX`, deduplicates the stored rows again against the file's current content (by `source_id`, or by the legacy tuple), appends the rows and returns them so the UI can add markers.
The broker's mapping table (`Värdepapper` → ticker) lives in `<private>` config and is not hard-coded in JS.

### Title timestamp
At request time, the newest `filemtime` across the webroot and `<private>/src` is used, with `data/`, `cache/` and uploads excluded. The tree is small, so this is cheap.

## Risks / Trade-offs

- [Yahoo blocks or rate-limits one.com's shared IPs, or changes its unofficial API] → The cache keeps the app usable with the last data. Errors are shown in the UI. Fetching lives behind one interface, so the data source can be swapped.
- [`.htaccess` is ignored if the host config changes] → Prefer a directory outside the web root. As part of deploy, check by requesting a data file URL and expecting 403/404 (a task).
- [The session save path on shared hosting is shared with other customers] → Set `session.save_path` to `<private>/sessions` when allowed.
- [Upload size limit (`upload_max_filesize`) is lower than a large export] → Show the limit in the error message. Broker exports are usually small.
- [Losing the password locks the user out] → Document how to generate a new hash and replace it in `config.php` over SFTP.

## Migration Plan

1. Deploy the code, then put `config.php` with the password hash and an empty `data/` in `<private>`.
2. Copy `aktier.csv`, `aktiekop.csv`, `aktievy.json` and `aktier.example.csv` unchanged from the Python install into `data/`.
3. Log in, check that the stocks, transactions and results match the Python version, and check that data URLs return 403/404.
4. Rollback: the Python version is untouched and keeps working locally with its own copies of the files.

## Open Questions

- Whether this one.com account allows a directory outside the web root. Both layouts are supported, so the answer only affects deploy configuration.
- The exact session timeout and lockout limits. The defaults above can be tuned without changing the spec.

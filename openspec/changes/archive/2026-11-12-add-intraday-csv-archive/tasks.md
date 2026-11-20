## 1. Arkiv på servern

- [x] 1.1 Add `private/src/IntradayArchive.php` with a pure function that selects minutes later than the archive's last time and earlier than the current minute and formats them as `time;close;currency` lines with decimal comma, plus a file update that reads the last valid line from the end, appends under an exclusive lock, and creates the file with its header; add tests in `private/tests/run.php` for first write, append-only, no duplicates, current minute excluded, decimal comma, and a partial last line; verify with `php private/tests/run.php`
- [x] 1.2 In `public/api/intraday.php`, update the archive after a complete fetch, skip it when `warnings` is non-empty, catch archive errors, and return `archive` / `archiveSkipped`; verify with requests against a local server on a copy of the data that a first request creates the file, a repeated request adds 0 rows, and the real `private/data` is untouched
- [x] 1.3 Add `public/api/intraday-csv.php` (GET, login required, ticker from `aktier.csv`, 404 without a file, attachment download streamed under a shared lock); verify with curl: 200 with the CSV and the filename when logged in, 401 without login, 400 for an unknown ticker, and 404 for a stock without an archive

## 2. Minutdiagrammet

- [x] 2.1 Add the `Ladda ner CSV` link to `#intraday-header` in `public/index.php` with styles in `public/assets/app.css`, and in `public/assets/intraday.js` set its `href`, show it when the archive has rows, and append the archive summary, skip notice or error to the status line; verify in the browser that the link downloads the file and the status shows the counts

## 3. Kontroll

- [x] 3.1 Manual check in the running app on a copy of the data: solo a SEK stock and a USD stock, re-select solo and see 0 new minutes, open a downloaded file to check the format, and confirm that the minute chart, pinned point and break-even line work as before and that `private/data` is unchanged; then `php private/tests/run.php` and `openspec validate add-intraday-csv-archive --strict` pass

## Why

Yahoo Finance only provides minute prices for the last 30 days, so older minute data is lost. The user wants to keep a growing archive of minute prices per stock on the web server, and be able to download it.

## What Changes

- When minute prices are fetched for the solo stock, they are also saved to a per-stock CSV file on the web server. The file is in the protected data folder, for example `intraday/SAAB-B.ST.csv`.
- If the file already exists, only minutes newer than its last row are appended. Existing rows are never changed or removed.
- The minute chart gets a `Ladda ner CSV` link that downloads the stock's archive file. The download requires login.
- The status line under the minute chart's heading also shows how many minutes the archive holds, the time span, and how many were added.
- If the fetch is incomplete (some time periods failed), the archive is not updated, so that no gaps are written into it. An error while saving the archive is shown in the status line, and the minute chart keeps working.
- The minute chart still shows at most the last 30 days. The archive is not read by the chart.
- No scheduled fetching. The archive only grows when the stock is selected as solo, and a selection at least every ~4 weeks keeps it without gaps.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `aktiediagram`: adds the requirement "Arkiv med minutkurser". The existing requirements "Minutkurser för solo-vald aktie" and "Skyddade datafiler" are unchanged. The new requirement states the protection of the archive files itself.

## Impact

- `private/src/Market.php`, or a new small class in `private/src/`: reading the last row, appending new rows with a file lock, and formatting.
- `public/api/intraday.php`: after a complete fetch, the archive is updated and its summary is returned in the response.
- New `public/api/intraday-csv.php`: an authenticated GET download of a stock's archive file.
- `public/index.php`, `public/assets/intraday.js`, `public/assets/app.css`: the download link and the archive status.
- `private/tests/run.php`: tests for appending, deduplication and the file format.
- New data files under `private/data/intraday/`, which are already gitignored by `private/data/*` and closed to the web by the existing `.htaccess`. No change to `aktier.csv`, `aktiekop.csv` or `aktievy.json`.

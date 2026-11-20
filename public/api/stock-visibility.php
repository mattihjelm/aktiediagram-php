<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// Synlighet per värdepapper: med konto ("TICKER|K") i aktievy.json, utan konto i aktier.csv.
run_api(['POST'], static function () {
    $payload = request_json();
    $series = trim((string)($payload['series'] ?? $payload['ticker'] ?? ''));
    $visible = $payload['visible'] ?? null;
    if ($series === '' || !is_bool($visible)) {
        send_json(400, ['error' => 'Värdepapper och synlighetsvärde krävs.']);
        return;
    }
    [$ticker, $account] = array_pad(explode('|', $series, 2), 2, '');
    if ($account !== '') {
        Stocks::find($ticker);
        Chart::saveSeriesVisibility(Chart::seriesKey($ticker, Purchases::account($account)), $visible);
        send_json(200, ['series' => $series, 'visible' => $visible]);
        return;
    }
    try {
        Stocks::saveVisibility($ticker, $visible);
    } catch (OutOfBoundsException $error) {
        send_json(404, ['error' => $error->getMessage()]);
        return;
    }
    send_json(200, ['series' => $series, 'ticker' => $ticker, 'show_initially' => $visible]);
});

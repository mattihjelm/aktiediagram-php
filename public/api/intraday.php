<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// Minutkurser för de senaste 30 dagarna för en aktie i aktier.csv (minutdiagrammet vid solo).
// sekRate är senaste kurs till SEK för minutkursernas valuta, för omräkning av nollpunkten.
// Minutkurserna fylls även på i aktiens arkivfil, men bara när hämtningen är fullständig.
run_api(['POST'], static function () {
    $stock = Stocks::find((string)(request_json()['ticker'] ?? ''));
    $minutes = Market::fetchMinutes($stock['ticker']);
    try {
        $archive = $minutes['warnings']
            ? (IntradayArchive::info($stock['ticker']) ?? ['rows' => 0]) + ['skipped' => true]
            : IntradayArchive::append($stock['ticker'], $minutes);
    } catch (Throwable $error) {
        error_log('aktier: ' . $error);
        $archive = ['error' => $error->getMessage()];
        try {
            $archive += IntradayArchive::info($stock['ticker']) ?? [];
        } catch (Throwable $ignored) {
        }
    }
    send_json(200, ['ticker' => $stock['ticker'], 'name' => $stock['name']] + $minutes
        + ['sekRate' => Market::latestSekRate($minutes['currency']), 'archive' => $archive]);
});

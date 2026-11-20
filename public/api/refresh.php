<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// Hämta slutkurser senare än den senast cachade dagen, utan omladdning.
run_api(['POST'], static function () {
    $stocks = Stocks::load();
    $purchases = Purchases::load();
    $fxSymbols = [];
    foreach (Market::requiredFx($stocks, $purchases) as $currency) {
        $fxSymbols[FX_TICKERS[$currency]] = Market::latestClosedDate(Market::fxReference($currency));
    }
    [, $fxFailures] = Market::fetchNewCloses($fxSymbols);
    $symbols = [];
    foreach ($stocks as $stock) {
        $symbols[$stock['ticker']] = Market::latestClosedDate($stock['ticker']);
    }
    [$added, $failures] = Market::fetchNewCloses($symbols);
    $warnings = Market::failureWarnings($fxFailures + $failures, static fn($symbol, $message) => "{$symbol}: kursuppdateringen misslyckades ({$message}).");
    // Läs om serierna efter uppdateringen så att Berkshire räknas om med nya USD/SEK-kurser.
    $chart = new Chart($stocks, $purchases);
    $updates = [];
    foreach ($added as $ticker => $points) {
        if (!$chart->hasSeries($ticker)) {
            continue;
        }
        if ($ticker === 'BRK-B' && !$chart->fx()->has('USD')) {
            $warnings[] = 'USD/SEK-data saknades; Berkshire uppdaterades inte.';
            continue;
        }
        $update = ['x' => [], 'prices' => [], 'customdata' => []];
        foreach ($points['dates'] as $index => $date) {
            $price = (float)$points['close'][$index];
            if ($ticker === 'BRK-B') {
                $rate = $chart->fx()->rate('USD', $date);
                if ($rate === null) {
                    continue;
                }
                $price *= $rate;
            }
            $update['x'][] = $date;
            $update['prices'][] = $price;
            $update['customdata'][] = $chart->priceCustomdata($ticker, $date, $price);
        }
        if ($update['x']) {
            $updates[$ticker] = $update;
        }
    }
    send_json(200, ['updates' => (object)$updates, 'warnings' => $warnings]);
});

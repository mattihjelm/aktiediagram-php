<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// Senaste intradagskurs för alla aktier eller för en aktie (radknappen i Resultat).
run_api(['POST'], static function () {
    $stocks = Stocks::load();
    $requested = request_json()['ticker'] ?? null;
    $selected = array_values(array_filter($stocks, static fn($stock) => !$requested || $stock['ticker'] === $requested));
    if ($requested && !$selected) {
        send_json(400, ['error' => 'Aktien finns inte i appens lista.']);
        return;
    }
    $currencies = [];
    foreach ($selected as $stock) {
        $currencies[] = $stock['ticker'] === 'BRK-B' ? 'USD' : Stocks::fxCurrency($stock['ticker']);
    }
    $fxSymbols = array_intersect_key(FX_TICKERS, array_flip($currencies));
    [$quotes, $failures] = Market::fetchIntraday(array_merge(array_column($selected, 'ticker'), array_values($fxSymbols)));
    $warnings = Market::failureWarnings($failures, static fn($symbol, $message) => "{$symbol}: kursen kunde inte hämtas ({$message}).");
    $chart = new Chart($selected, []);
    $fx = $chart->fx();
    $currentFx = [];
    foreach ($fxSymbols as $currency => $symbol) {
        $rate = $quotes[$symbol]['price'] ?? $fx->latest($currency);
        if ($rate !== null) {
            $currentFx[$currency] = $rate;
        }
    }
    $updates = [];
    foreach ($selected as $stock) {
        $ticker = $stock['ticker'];
        $quote = $quotes[$ticker] ?? null;
        if (!$quote) {
            // Ett hämtningsfel är redan rapporterat ovan.
            if (!isset($failures[$ticker])) {
                $warnings[] = "{$stock['name']}: ingen aktuell kurs hittades.";
            }
            continue;
        }
        $price = $quote['price'];
        if ($ticker === 'BRK-B') {
            if (!isset($currentFx['USD'])) {
                $warnings[] = 'Berkshire kunde inte räknas om till SEK; USD/SEK saknas.';
                continue;
            }
            $price *= $currentFx['USD'];
        }
        $fxRate = $fx->forTicker($ticker, $quote['date']);
        // Utländska aktier värderas med aktuell växelkurs; Berkshire räknades om till SEK ovan.
        $fxRate = $currentFx[Stocks::fxCurrency($ticker)] ?? $fxRate;
        if ($fxRate === null && Stocks::fxCurrency($ticker) === 'SEK') {
            $fxRate = 1.0;
        }
        $updates[$ticker] = [
            'date' => $quote['date'],
            'price' => $price,
            'customdata' => $chart->priceCustomdata($ticker, $quote['date'], $price, $fxRate),
        ];
    }
    if (!$updates && !$warnings) {
        throw new RuntimeException('Yahoo Finance returnerade inga aktuella kurser.');
    }
    send_json(200, ['updates' => (object)$updates, 'warnings' => $warnings]);
});

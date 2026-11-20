<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// POST registrerar en transaktion; POST {action: "delete", key} tar bort en. Borttagning går via POST
// eftersom webbhotellet stoppar HTTP DELETE innan PHP nås.
run_api(['POST'], static function () {
    $payload = request_json();
    if (($payload['action'] ?? '') === 'delete') {
        // Ta bort exakt den rad som visades; en inaktuell nyckel ger 409 och ingen ändring.
        try {
            $removed = Purchases::remove((string)($payload['key'] ?? ''));
        } catch (StaleTransaction $error) {
            send_json(409, ['error' => $error->getMessage()]);
            return;
        }
        send_json(200, ['removed' => $removed]);
        return;
    }
    $stocks = Stocks::load();
    $chart = new Chart($stocks, []);
    $entry = Purchases::entryFromForm($payload, $stocks, [$chart, 'hasSeries']);
    $chartPrice = $chart->priceOnOrBefore($entry['ticker'], $entry['date']);
    if ($chartPrice === null) {
        throw new InvalidArgumentException('Det finns ingen kursdata före köpdatumet.');
    }
    [$entry] = Purchases::append(static fn() => [$entry]);
    $name = '';
    foreach ($stocks as $stock) {
        if ($stock['ticker'] === $entry['ticker']) {
            $name = $stock['name'];
        }
    }
    $fxRate = $chart->fx()->forTicker($entry['ticker'], $entry['date']);
    send_json(200, $entry + [
        'name' => $name,
        // Värdepapperet i diagrammet; saknas det laddar webbläsaren om sidan.
        'series' => Chart::seriesKey($entry['ticker'], $entry['account']),
        'display_name' => Chart::displayName($name, $entry['account']),
        'currency' => Stocks::currency($entry['ticker']),
        'chart_price' => $chartPrice,
        'sek_fx_rate' => $fxRate,
        'ticker_fx_rate' => $fxRate,
    ]);
});

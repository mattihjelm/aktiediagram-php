<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// GET: vilka symboler som behöver hämtas. POST {symbols}: hämta historik för dem.
run_api(['GET', 'POST'], static function () {
    $stocks = Stocks::load();
    $symbols = [];
    foreach ($stocks as $stock) {
        $symbols[$stock['ticker']] = Market::latestClosedDate($stock['ticker']);
    }
    foreach (Market::requiredFx($stocks, Purchases::load()) as $currency) {
        $symbols[FX_TICKERS[$currency]] = Market::latestClosedDate(Market::fxReference($currency));
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        send_json(200, ['needed' => Market::symbolsNeedingHistory($symbols)]);
        return;
    }
    $requested = request_json()['symbols'] ?? null;
    if (!is_array($requested) || !$requested || count($requested) > 10) {
        throw new InvalidArgumentException('Ange mellan 1 och 10 symboler.');
    }
    $selected = [];
    foreach ($requested as $symbol) {
        if (!is_string($symbol) || !isset($symbols[$symbol])) {
            throw new InvalidArgumentException('Okänd symbol.');
        }
        $selected[$symbol] = $symbols[$symbol];
    }
    send_json(200, ['failed' => (object)Market::fetchHistory($selected)]);
});

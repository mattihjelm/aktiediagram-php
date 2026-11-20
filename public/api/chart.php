<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// Hela figuren från cachen. Svaret kan bli flera MB och komprimeras därför.
run_api(['GET'], static function () {
    $chart = new Chart(Stocks::load(), Purchases::load());
    if (!$chart->availableStocks()) {
        throw new RuntimeException('Ingen kursdata kunde hämtas från Yahoo Finance. Försök igen senare.');
    }
    header('Content-Type: application/json; charset=utf-8');
    if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) {
        ob_start('ob_gzhandler');
    }
    $chart->stream(static function (string $chunk) {
        echo $chunk;
    });
});

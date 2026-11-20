<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// Nedladdning av en akties arkiv med minutkurser.
run_api(['GET'], static function () {
    $stock = Stocks::find((string)($_GET['ticker'] ?? ''));
    $file = IntradayArchive::path($stock['ticker']);
    if (!is_file($file)) {
        send_json(404, ['error' => 'Det finns inget arkiv med minutkurser för aktien.']);
        return;
    }
    Storage::withLock($file, false, static function () use ($file, $stock) {
        $name = 'minutkurser-' . basename($file);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $name . '"');
        header('Content-Length: ' . filesize($file));
        header('Cache-Control: no-store');
        readfile($file);
    });
});

<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// Sparar vyn: datumintervallet (start och end tillsammans), skalläget scale och/eller log_scale.
// Endast skickade nycklar ändras; scale skriver även log_scale för äldre läsare av aktievy.json.
run_api(['POST'], static function () {
    $payload = request_json();
    $changes = [];
    if (array_key_exists('start', $payload) || array_key_exists('end', $payload)) {
        $start = (string)($payload['start'] ?? '');
        $end = (string)($payload['end'] ?? '');
        $valid = static function (string $value): bool {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            return $date !== false && $date->format('Y-m-d') === $value;
        };
        if (!$valid($start) || !$valid($end) || $start >= $end) {
            send_json(400, ['error' => 'Ange ett giltigt datumintervall i formatet ÅÅÅÅ-MM-DD.']);
            return;
        }
        $changes['start'] = $start;
        $changes['end'] = $end;
    }
    if (array_key_exists('log_scale', $payload)) {
        if (!is_bool($payload['log_scale'])) {
            send_json(400, ['error' => 'Ogiltigt värde för logaritmisk skala.']);
            return;
        }
        $changes['log_scale'] = $payload['log_scale'];
    }
    if (array_key_exists('scale', $payload)) {
        if (!in_array($payload['scale'], Chart::SCALES, true)) {
            send_json(400, ['error' => 'Ogiltigt skalläge.']);
            return;
        }
        $changes['scale'] = $payload['scale'];
        $changes['log_scale'] = Chart::isLogScale($payload['scale']);
    }
    if (array_key_exists('last_solo', $payload)) {
        // null tömmer värdet när solo avslutas; annars ett värdepapper: en aktie i listan, eventuellt med konto ("TICKER|K").
        $series = $payload['last_solo'];
        if ($series !== null && !Chart::isSeriesKey($series, array_column(Stocks::load(), 'ticker'))) {
            send_json(400, ['error' => 'Aktien finns inte i appens lista.']);
            return;
        }
        $changes['last_solo'] = $series;
    }
    if (array_key_exists('legend_sort', $payload)) {
        if (!in_array($payload['legend_sort'], Chart::LEGEND_SORTS, true)) {
            send_json(400, ['error' => 'Ogiltig sortering av aktielistan.']);
            return;
        }
        $changes['legend_sort'] = $payload['legend_sort'];
    }
    if (array_key_exists('legend_selected', $payload)) {
        // Gruppen för sorteringen Valda: en lista med värdepappersnycklar i den ordning de lades till.
        $selected = $payload['legend_selected'];
        $tickers = array_column(Stocks::load(), 'ticker');
        if (!is_array($selected) || $selected !== array_values($selected) || count($selected) > 500
            || array_filter($selected, static fn($series) => !Chart::isSeriesKey($series, $tickers))) {
            send_json(400, ['error' => 'Ogiltig grupp av valda värdepapper.']);
            return;
        }
        $changes['legend_selected'] = array_values(array_unique($selected));
    }
    if (!$changes) {
        send_json(400, ['error' => 'Ingen vyinställning angavs.']);
        return;
    }
    Chart::saveView($changes);
    send_json(200, $changes);
});

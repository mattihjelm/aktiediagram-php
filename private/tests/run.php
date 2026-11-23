<?php
// Enhetstester. Körs lokalt: php private/tests/run.php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// Testerna använder en egen temporär datakatalog och rör aldrig private/data.
$dataDir = sys_get_temp_dir() . '/aktier-test-' . getmypid();
mkdir($dataDir . '/cache', 0700, true);
$configFile = $dataDir . '/config.php';
file_put_contents($configFile, '<?php return ' . var_export([
    'password_hash' => password_hash('rätt lösenord', PASSWORD_DEFAULT),
    'data_dir' => $dataDir,
    'session_dir' => $dataDir . '/sessions',
    'require_https' => false,
    'login_delay_seconds' => 0,
], true) . ';');
putenv('AKTIER_CONFIG=' . $configFile);
require __DIR__ . '/../src/bootstrap.php';

$failures = 0;
$count = 0;
function check(string $name, $expected, $actual): void
{
    global $failures, $count;
    $count++;
    if ($expected !== $actual) {
        $failures++;
        echo "FEL: {$name}\n  väntat: " . var_export($expected, true) . "\n  fick:   " . var_export($actual, true) . "\n";
    }
}
function throws(string $name, callable $callback, string $contains): void
{
    try {
        $callback();
        check($name, "undantag med '{$contains}'", 'inget undantag');
    } catch (Throwable $error) {
        check($name, true, str_contains($error->getMessage(), $contains));
    }
}

// Dec: förväntade värden är framtagna med Pythons Decimal.
foreach (['232,7' => '232.7', '0.00' => '0', '100' => '100', '1E+2' => '100', '12.50' => '12.5', '-3.10' => '-3.1',
    '0.000123' => '0.000123', '1 000,50' => '1000.5', '007.10' => '7.1'] as $input => $expected) {
    check("normalized {$input}", $expected, Dec::normalized(Dec::of((string)$input)));
}
foreach (['2.335' => '2.34', '2.334' => '2.33', '-2.335' => '-2.34', '0.005' => '0.01', '12' => '12.00',
    '1E+1' => '10.00', '0.0049' => '0.00', '-0.001' => '-0.00'] as $input => $expected) {
    check("quantize2 {$input}", $expected, Dec::quantize2(Dec::of((string)$input)));
}
check('mul', '50328.387482559', Dec::normalized(Dec::mul(Dec::of('4813.02777'), Dec::of('10.4567'))));
check('mul liten', '1.5', Dec::normalized(Dec::mul(Dec::of('0.5'), Dec::of('3'))));
foreach ([['39', '10.4567', '3.73'], ['1', '3', '0.33'], ['2', '8', '0.25'], ['-39', '10.4567', '-3.73'], ['0.01', '2', '0.01']] as [$a, $b, $expected]) {
    check("div {$a}/{$b}", $expected, Dec::divQuantize2(Dec::of($a), Dec::of($b)));
}
throws('ogiltigt tal', static fn() => Dec::of('1.2.3'), 'ogiltigt tal');

// Belopp formateras som Pythons f"{v:,.2f}" (jämn avrundning på exakt binärvärde).
foreach ([[82.125, '82,12'], [0.375, '0,38'], [1234567.125, '1 234 567,12'], [-9163.55, '-9 163,55'], [5.0, '5,00'], [999.999, '1 000,00']] as [$value, $expected]) {
    check("swedish_money {$value}", $expected, swedish_money($value));
}

// CSV i Pythons format.
check('csv citerar semikolon och citattecken', "a;\"b;c\";\"d\"\"e\"\r\n", Csv::line(['a', 'b;c', 'd"e'], ';'));
$text = "date;ticker\r\n2024-01-02;SAAB-B.ST\r\n\r\n2024-01-03;\"A;B\"\r\n";
[$headers, $rows] = Csv::readText("\xEF\xBB\xBF" . $text, ';');
check('csv läser BOM och hoppar över tomma rader', [['date', 'ticker'], 2, 'A;B'], [$headers, count($rows), $rows[1]['ticker']]);
// Tomma rader försvinner vid omskrivning, som med Pythons csv-modul.
check('csv tur och retur', "date;ticker\r\n2024-01-02;SAAB-B.ST\r\n2024-01-03;\"A;B\"\r\n", Csv::write($headers, $rows, ';'));

// Aktielistan.
$stockFile = data_path('aktier.csv');
$stocks = Stocks::load();
check('aktier.csv skapas från exemplet', file_get_contents(APP_PRIVATE_DIR . '/aktier.example.csv'), file_get_contents($stockFile));
check('exemplet läses', true, count($stocks) > 0);
$invalid = [
    'dubbel ticker' => ["ticker,name,show_initially\r\nA,X,true\r\nA,Y,false\r\n", 'ticker förekommer flera gånger'],
    'dubbelt namn' => ["ticker,name,show_initially\r\nA,X,true\r\nB,X,false\r\n", 'visningsnamn förekommer flera gånger'],
    'ogiltig synlighet' => ["ticker,name,show_initially\r\nA,X,kanske\r\n", 'rad 2'],
    'för många' => ["ticker,name,show_initially\r\n" . implode('', array_map(static fn($i) => "T{$i},N{$i},ja\r\n", range(1, 101))), 'Högst 100'],
    'tom' => ["ticker,name,show_initially\r\n,,\r\n", 'Ingen ticker'],
];
foreach ($invalid as $name => [$contents, $message]) {
    file_put_contents($stockFile, $contents);
    throws("aktielista: {$name}", static fn() => Stocks::load(), $message);
}
file_put_contents($stockFile, "ticker,name,show_initially\r\n" . implode('', array_map(static fn($i) => "T{$i},N{$i},ja\r\n", range(1, 100))));
check('100 aktier godtas', 100, count(Stocks::load()));
file_put_contents($stockFile, "ticker,name,show_initially\r\nA,Alfa,ja\r\n,,\r\nB,,0\r\n");
check('tomma rader och namn ersätts av ticker', [['ticker' => 'A', 'name' => 'Alfa', 'show_initially' => true], ['ticker' => 'B', 'name' => 'B', 'show_initially' => false]], Stocks::load());
Stocks::saveVisibility('B', true);
check('synlighet sparas som Python gör', "ticker,name,show_initially\r\nA,Alfa,true\r\nB,B,true\r\n", file_get_contents($stockFile));
throws('okänd aktie', static fn() => Stocks::saveVisibility('C', true), 'finns inte');
check('aktie hittas', 'Alfa', Stocks::find('A')['name']);
check('okänd aktie för minutkurser ger ogiltig förfrågan', true, (static function () {
    try {
        Stocks::find('C');
    } catch (InvalidArgumentException $error) {
        return str_contains($error->getMessage(), 'finns inte');
    }
    return false;
})());

// Händelser.
$purchaseFile = data_path('aktiekop.csv');
file_put_contents($purchaseFile, "date;ticker;quantity;price\r\n2024-01-02;SAAB-B.ST;4;232,7\r\n");
Purchases::append(static fn() => [['date' => '2024-02-01', 'transaction_type' => 'KÖP', 'ticker' => 'SAAB-B.ST', 'quantity' => '1,5', 'price' => '240.00', 'commission' => '1.00']]);
check('gammal rubrik uppgraderas och raden läggs till', "date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time;account\r\n2024-01-02;KÖP;SAAB-B.ST;4;232,7;0;;;;T\r\n2024-02-01;KÖP;SAAB-B.ST;1,5;240.00;1.00;;;;T\r\n", file_get_contents($purchaseFile));
// Klockslag: fil med alla äldre kolumner men utan time uppgraderas och behåller alla värden.
$noTime = "date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency\r\n2024-01-02;KÖP;SAAB-B.ST;4;232,7;2.33;abc;SEK\r\n2024-01-03;UTDELNING;SAAB-B.ST;4;1.5;0.00;;\r\n";
file_put_contents($purchaseFile, $noTime);
Purchases::append(static fn() => [['date' => '2024-02-01', 'transaction_type' => 'KÖP', 'ticker' => 'SAAB-B.ST', 'quantity' => '1', 'price' => '240.00', 'commission' => '1.00', 'time' => '09:05']]);
check('tidskolumn läggs till utan att andra värden ändras', "date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time;account\r\n2024-01-02;KÖP;SAAB-B.ST;4;232,7;2.33;abc;SEK;;T\r\n2024-01-03;UTDELNING;SAAB-B.ST;4;1.5;0.00;;;;T\r\n2024-02-01;KÖP;SAAB-B.ST;1;240.00;1.00;;;09:05;T\r\n", file_get_contents($purchaseFile));
// Handifyllda klockslag bevaras när nya rader läggs till.
file_put_contents($purchaseFile, str_replace("2.33;abc;SEK;;T\r\n", "2.33;abc;SEK;10:42;T\r\n", file_get_contents($purchaseFile)));
Purchases::append(static fn() => [['date' => '2024-02-02', 'transaction_type' => 'SÄLJ', 'ticker' => 'SAAB-B.ST', 'quantity' => '1', 'price' => '250.00', 'commission' => '1.00']]);
check('handifyllt klockslag bevaras', true, str_contains(file_get_contents($purchaseFile), "2024-01-02;KÖP;SAAB-B.ST;4;232,7;2.33;abc;SEK;10:42;T\r\n") && str_ends_with(file_get_contents($purchaseFile), "2024-02-02;SÄLJ;SAAB-B.ST;1;250.00;1.00;;;;T\r\n"));
check('klockslag läses', ['10:42', '', '09:05', ''], array_column(Purchases::load(), 'time'));
check('giltiga och ogiltiga klockslag', ['00:00', '23:59', '10:42', null, null, null, null], array_map([Purchases::class, 'validTime'], ['00:00', '23:59', ' 10:42 ', '24:00', '9.30', '9:30', '']));
$before = file_get_contents($purchaseFile);
Purchases::append(static fn() => []);
check('inget att lägga till lämnar filen orörd', $before, file_get_contents($purchaseFile));
// Borttagning med radnyckel: plats plus fingeravtryck, även bland identiska rader.
$dividend = "2026-10-15;UTDELNING;TEL2-B.ST;246;5.25;0.00;;;\r\n";
file_put_contents($purchaseFile, "date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time\r\n" . $dividend . $dividend . $dividend);
$rows = Purchases::load();
$middleKey = Purchases::rowKey(1, $rows[1]);
check('identiska rader har olika nycklar', true, Purchases::rowKey(0, $rows[0]) !== $middleKey);
check('borttagen rad returneras', 'UTDELNING', Purchases::remove($middleKey)['transaction_type']);
check('två identiska rader finns kvar', 2, count(Purchases::load()));
// En nyckel till en flyttad rad avvisas när raden som nu står på platsen har annat innehåll.
// (Två rader som är identiska i alla fält kan inte skiljas åt; att ta bort den ena eller andra ger samma fil.)
$sale = "2026-10-20;SÄLJ;TEL2-B.ST;10;170.00;1.00;;;\r\n";
file_put_contents($purchaseFile, "date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time\r\n" . $dividend . $dividend . $sale);
$rows = Purchases::load();
$saleKey = Purchases::rowKey(2, $rows[2]);
Purchases::remove(Purchases::rowKey(0, $rows[0]));
$before = file_get_contents($purchaseFile);
throws('inaktuell plats avvisas', static fn() => Purchases::remove($saleKey), 'har ändrats');
$staleHash = '0:' . str_repeat('0', 12);
throws('fel fingeravtryck avvisas', static fn() => Purchases::remove($staleHash), 'har ändrats');
check('avvisad borttagning lämnar filen orörd', $before, file_get_contents($purchaseFile));
throws('ogiltig nyckel', static fn() => Purchases::remove('abc'), 'Ogiltig');
$added = Purchases::append(static fn() => [['date' => '2026-10-16', 'transaction_type' => 'KÖP', 'ticker' => 'TEL2-B.ST', 'quantity' => '1', 'price' => '160.00', 'commission' => '1.00']]);
check('ny rad får nyckel som går att ta bort', 'KÖP', Purchases::remove($added[0]['row_key'])['transaction_type']);
file_put_contents($purchaseFile, "date;ticker;quantity;price\r\n2024-01-02;SAAB-B.ST;4;232,7\r\n2024-01-03;SAAB-B.ST;5;240\r\n");
$legacy = Purchases::load();
Purchases::remove(Purchases::rowKey(0, $legacy[0]));
check('äldre rubrik uppgraderas vid borttagning', "date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time;account\r\n2024-01-03;KÖP;SAAB-B.ST;5;240;0;;;;T\r\n", file_get_contents($purchaseFile));
// Nycklar från en fil utan kontokolumn gäller även när borttagningen uppgraderar rubriken.
file_put_contents($purchaseFile, "date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time\r\n2024-01-02;KÖP;SAAB-B.ST;4;232,7;0;;;\r\n2024-01-03;KÖP;SAAB-B.ST;5;240;0;;;\r\n");
$noAccount = Purchases::load();
check('rad utan konto läses som T', ['T', 'T'], array_column($noAccount, 'account'));
Purchases::remove(Purchases::rowKey(1, $noAccount[1]));
check('nyckel gäller över kontouppgraderingen', "date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time;account\r\n2024-01-02;KÖP;SAAB-B.ST;4;232,7;0;;;;T\r\n", file_get_contents($purchaseFile));
$hasHistory = static fn() => true;
$stocks = [['ticker' => 'SAAB-B.ST', 'name' => 'Saab', 'show_initially' => true]];
$entry = Purchases::entryFromForm(['account' => ' i ', 'ticker' => 'SAAB-B.ST', 'transaction_type' => 'köp', 'date' => '2024-03-01', 'quantity' => ' 1 000 ', 'price' => '189,345', 'commission' => '2,5'], $stocks, $hasHistory);
check('formulärets händelse', ['2024-03-01', 'KÖP', '1000', '189.35', '2.50'], [$entry['date'], $entry['transaction_type'], $entry['quantity'], $entry['price'], $entry['commission']]);
check('formulär utan tid', '', $entry['time']);
check('formulärets konto blir versal', 'I', $entry['account']);
$base = ['account' => 'T', 'ticker' => 'SAAB-B.ST', 'transaction_type' => 'KÖP', 'date' => '2024-03-01', 'quantity' => '1', 'price' => '10', 'commission' => '0'];
check('formulär med tid', '10:42', Purchases::entryFromForm(['time' => '10:42'] + $base, $stocks, $hasHistory)['time']);
check('utdelning ignorerar tid', '', Purchases::entryFromForm(['time' => '10:42', 'transaction_type' => 'UTDELNING'] + $base, $stocks, $hasHistory)['time']);
foreach ([
    'antal noll' => [['quantity' => '0'], 'Antalet'],
    'negativ kurs' => [['price' => '-1'], 'Kursen'],
    'negativt courtage' => [['commission' => '-1'], 'Courtage'],
    'okänd typ' => [['transaction_type' => 'byte'], 'Transaktionstyp'],
    'okänd aktie' => [['ticker' => 'XYZ'], 'kursdata'],
    'ogiltigt datum' => [['date' => '2024-02-30'], 'datum'],
    'ogiltig tid' => [['time' => '25:10'], 'TT:MM'],
    'konto saknas' => [['account' => ''], 'Kontot'],
    'två bokstäver' => [['account' => 'TT'], 'Kontot'],
    'siffra som konto' => [['account' => '1'], 'Kontot'],
    'Å som konto' => [['account' => 'Å'], 'Kontot'],
] as $name => [$change, $message]) {
    $payload = $change + ['account' => 'T', 'ticker' => 'SAAB-B.ST', 'transaction_type' => 'KÖP', 'date' => '2024-03-01', 'quantity' => '1', 'price' => '10', 'commission' => '0'];
    throws("ogiltig händelse: {$name}", static fn() => Purchases::entryFromForm($payload, $stocks, $hasHistory), $message);
}

// Import: syntetisk export med köp, källskatt, Berkshire, okänt värdepapper och för kort rad.
$mapping = require APP_PRIVATE_DIR . '/import-mapping.php';
$exportRow = static function (array $cells): string {
    $row = array_fill(0, 28, '');
    foreach ($cells as $index => $value) {
        $row[$index] = $value;
    }
    return implode("\t", $row);
};
$lines = [
    implode("\t", array_map(static fn($i) => "Kolumn {$i}", range(0, 27))),
    $exportRow([0 => '101', 2 => '2024-05-02', 5 => 'Köpt', 6 => 'Saab', 8 => '10', 9 => '576,20', 26 => '14,41', 27 => 'SEK']),
    $exportRow([0 => '102', 2 => '2024-05-03', 5 => 'Utländsk källskatt', 6 => 'Nasdaq', 13 => '3,456', 14 => 'USD']),
    $exportRow([0 => '103', 2 => '2024-05-04', 5 => 'Köpt', 6 => 'Berkshire Hathaway B', 8 => '1', 9 => '400', 21 => '10,5', 26 => '1', 27 => 'USD']),
    $exportRow([0 => '104', 2 => '2024-05-05', 5 => 'Köpt', 6 => 'Okänt bolag', 8 => '1', 9 => '1']),
    "105\tför kort",
    '',
];
$export = "\xFF\xFE" . mb_convert_encoding(implode("\r\n", $lines) . "\r\n", 'UTF-16LE', 'UTF-8');
$converted = Import::convert(Import::decode($export), $mapping);
check('import: antal konverterade', 3, count($converted['rows']));
check('import: köp', ['date' => '2024-05-02', 'transaction_type' => 'KÖP', 'ticker' => 'SAAB-B.ST', 'quantity' => '10', 'price' => '576.2', 'commission' => '14.41', 'source_id' => '101', 'amount_currency' => '', 'account' => 'T'], $converted['rows'][0]);
check('import: källskatt blir negativ utdelning', ['UTDELNING', '-3.46', '1', '0.00', 'USD'], [$converted['rows'][1]['transaction_type'], $converted['rows'][1]['price'], $converted['rows'][1]['quantity'], $converted['rows'][1]['commission'], $converted['rows'][1]['amount_currency']]);
check('import: Berkshire i SEK och courtage omräknat', ['4200', '0.10'], [$converted['rows'][2]['price'], $converted['rows'][2]['commission']]);
check('import: omappade rader', [[5, "okänt värdepapper 'Okänt bolag'; hoppas över."], [6, 'för få kolumner; hoppas över.']], array_map(static fn($row) => [$row['row_number'], $row['reason']], $converted['unmapped_rows']));
check('import: originalceller följer med', 28, count($converted['unmapped_rows'][0]['cells']));
throws('import: UTF-8-fil avvisas', static fn() => Import::decode("a\tb\r\n"), 'UTF-16');
throws('import: fel kolumner avvisas', static fn() => Import::convert(Import::decode("\xFF\xFE" . mb_convert_encoding("a\tb\r\n", 'UTF-16LE', 'UTF-8')), $mapping), 'kolumner');

$existing = [
    ['date' => '2024-05-02', 'transaction_type' => 'KÖP', 'ticker' => 'SAAB-B.ST', 'quantity' => '10', 'price' => '576,20', 'commission' => '14.41', 'source_id' => '', 'amount_currency' => ''],
];
$selection = Import::selectNew($converted['rows'], $existing);
check('import: äldre rad utan ID matchas på detaljer', [1, 2], [$selection['duplicates'], count($selection['new_rows'])]);
$afterFirst = array_merge($existing, $selection['new_rows']);
$second = Import::selectNew($converted['rows'], $afterFirst);
check('import: samma fil igen ger inga nya rader', [3, 0], [$second['duplicates'], count($second['new_rows'])]);
// Konto: samma export på ett annat konto är ny, på samma konto dubbletter. Rader utan konto hör till T.
$onI = Import::convert(Import::decode($export), $mapping, 'I');
check('import: valt konto på alla rader', ['I', 'I', 'I'], array_column($onI['rows'], 'account'));
$otherAccount = Import::selectNew($onI['rows'], $afterFirst);
check('import: samma fil på annat konto är ny', [0, 3], [$otherAccount['duplicates'], count($otherAccount['new_rows'])]);
$sameAccount = Import::selectNew($onI['rows'], array_merge($afterFirst, $otherAccount['new_rows']));
check('import: samma fil på samma konto är dubbletter', [3, 0], [$sameAccount['duplicates'], count($sameAccount['new_rows'])]);

// Börsstängning.
$at = static fn($time) => new DateTimeImmutable($time);
check('stockholm före stängning', '2026-10-21', Market::latestClosedDate('SAAB-B.ST', $at('2026-10-22 17:49 Europe/Stockholm')));
check('stockholm efter stängning', '2026-10-22', Market::latestClosedDate('SAAB-B.ST', $at('2026-10-22 17:50 Europe/Stockholm')));
check('lördag ger fredag', '2026-10-23', Market::latestClosedDate('SAAB-B.ST', $at('2026-10-24 20:00 Europe/Stockholm')));
check('måndag morgon ger fredag', '2026-10-23', Market::latestClosedDate('SAAB-B.ST', $at('2026-10-26 09:00 Europe/Stockholm')));
check('USA efter stängning', '2026-10-22', Market::latestClosedDate('NDAQ', $at('2026-10-22 16:30 America/New_York')));
check('USA före stängning', '2026-10-21', Market::latestClosedDate('NDAQ', $at('2026-10-22 22:00 Europe/Stockholm')));
check('Tesla stänger i New York', '2026-10-21', Market::latestClosedDate('TSLA', $at('2026-10-22 22:00 Europe/Stockholm')));
check('USD-fond stänger i Stockholm', '2026-10-22', Market::latestClosedDate('0P0000JSS5', $at('2026-10-22 22:00 Europe/Stockholm')));
foreach (['BRK-B' => true, 'NDAQ' => true, 'TSLA' => true, 'SAAB-B.ST' => false, 'RHM.DE' => false, '0P0000JSS5' => false, '0P00009NT9.ST' => false, 'USDSEK=X' => false] as $ticker => $expected) {
    check("amerikansk marknad: {$ticker}", $expected, Market::isUsMarket($ticker));
}

// Valuta per ticker från ticker_currency i import-mapping.php.
$currencies = [
    'SAAB-B.ST' => ['kr', 'SEK'], '0P00009NT9.ST' => ['kr', 'SEK'], 'BRK-B' => ['kr', 'SEK'],
    'NDAQ' => ['USD', 'USD'], 'TSLA' => ['USD', 'USD'], '0P0000JSS5' => ['USD', 'USD'],
    'RHM.DE' => ['EUR', 'EUR'], 'OKAND' => ['', 'SEK'],
];
foreach ($currencies as $ticker => $expected) {
    check("valuta: {$ticker}", $expected, [Stocks::currency($ticker), Stocks::fxCurrency($ticker)]);
}

// Minutkurser: tidsfönster och sammanslagning.
$now = $at('2026-11-11 10:00 Europe/Stockholm')->getTimestamp();
$windows = Market::minuteWindows($now);
check('minutfönster: antal', 5, count($windows));
check('minutfönster: start inom 30 dagar', $now - 30 * 86400 + 3600, $windows[0][0]);
check('minutfönster: slutar nu', $now, end($windows)[1]);
check('minutfönster: högst 7 dagar', true, max(array_map(static fn($w) => $w[1] - $w[0], $windows)) <= 7 * 86400);
check('minutfönster: sammanhängande', true, array_reduce(array_keys($windows), static fn($ok, $i) => $ok && ($i === 0 || $windows[$i][0] === $windows[$i - 1][1]), true));
$t = $at('2026-11-04 09:00 Europe/Stockholm')->getTimestamp();
$minutes = Market::mergeMinutes([
    ['timestamp' => [$t + 60, $t + 120], 'indicators' => ['quote' => [['close' => [101.5, null]]]]],
    ['timestamp' => [$t, $t + 60], 'indicators' => ['quote' => [['close' => [100, 101.5]]]]],
    ['meta' => ['currency' => 'SEK']],
]);
check('minuter: sorterade, utan dubbletter och null', ['2026-11-04 09:00', '2026-11-04 09:01'], $minutes['times']);
check('minuter: kurser', [100.0, 101.5], $minutes['close']);
$summer = Market::mergeMinutes([['timestamp' => [$at('2026-10-20 13:30 UTC')->getTimestamp()], 'indicators' => ['quote' => [['close' => [5]]]]]]);
check('minuter: svensk sommartid', ['2026-10-20 15:30'], $summer['times']);
file_put_contents(data_path('cache/USDSEK_X.json'), json_encode(['dates' => ['2026-11-09', '2026-11-10'], 'close' => [9.5, 9.75]]));
check('SEK-kurs: senaste USD/SEK', 9.75, Market::latestSekRate('USD'));
check('SEK-kurs: ingen för SEK', null, Market::latestSekRate('SEK'));
check('SEK-kurs: ingen för okänd valuta', null, Market::latestSekRate('GBP'));
check('SEK-kurs: ingen utan valutahistorik', null, Market::latestSekRate('EUR'));

// Arkiv med minutkurser.
check('arkiv: decimalkomma utan nollor', ['160,05', '100', '0,1235'], array_map([IntradayArchive::class, 'formatPrice'], [160.05000305, 100.0, 0.123456]));
$archiveMinutes = ['currency' => 'SEK', 'times' => ['2026-11-11 17:28', '2026-11-11 17:29', '2026-11-12 09:00'], 'close' => [160.05, 160.1, 161.0]];
$archiveFile = IntradayArchive::path('SAAB-B.ST');
check('arkiv: sökväg', data_path('intraday/SAAB-B.ST.csv'), $archiveFile);
check('arkiv: första skrivning utan pågående minut', ['rows' => 2, 'first' => '2026-11-11 17:28', 'last' => '2026-11-11 17:29', 'added' => 2],
    IntradayArchive::append('SAAB-B.ST', $archiveMinutes, '2026-11-12 09:00'));
check('arkiv: filens innehåll', "time;close;currency\r\n2026-11-11 17:28;160,05;SEK\r\n2026-11-11 17:29;160,1;SEK\r\n", file_get_contents($archiveFile));
$archiveMinutes['times'][] = '2026-11-12 09:01';
$archiveMinutes['close'][] = 161.5;
check('arkiv: bara nyare minuter läggs till', ['rows' => 4, 'first' => '2026-11-11 17:28', 'last' => '2026-11-12 09:01', 'added' => 2],
    IntradayArchive::append('SAAB-B.ST', $archiveMinutes, '2026-11-12 09:05'));
check('arkiv: inget nytt', 0, IntradayArchive::append('SAAB-B.ST', $archiveMinutes, '2026-11-12 09:05')['added']);
check('arkiv: befintliga rader orörda', "time;close;currency\r\n2026-11-11 17:28;160,05;SEK\r\n2026-11-11 17:29;160,1;SEK\r\n2026-11-12 09:00;161;SEK\r\n2026-11-12 09:01;161,5;SEK\r\n", file_get_contents($archiveFile));
file_put_contents($archiveFile, "2026-11-12 09:02;16", FILE_APPEND);
$archiveMinutes['times'][] = '2026-11-12 09:02';
$archiveMinutes['close'][] = 162.0;
check('arkiv: halvskriven sista rad ersätts', ['rows' => 5, 'first' => '2026-11-11 17:28', 'last' => '2026-11-12 09:02', 'added' => 1],
    IntradayArchive::append('SAAB-B.ST', $archiveMinutes, '2026-11-12 09:05'));
check('arkiv: ingen trasig rad kvar', true, str_ends_with(file_get_contents($archiveFile), "2026-11-12 09:01;161,5;SEK\r\n2026-11-12 09:02;162;SEK\r\n"));
check('arkiv: info', ['rows' => 5, 'first' => '2026-11-11 17:28', 'last' => '2026-11-12 09:02'], IntradayArchive::info('SAAB-B.ST'));
check('arkiv: info utan fil', null, IntradayArchive::info('VOLV-B.ST'));

// Datumintervall.
Chart::saveVisibleRange('2026-09-08', '2026-10-21');
check('aktievy.json i Pythons format', "{\n  \"start\": \"2026-09-08\",\n  \"end\": \"2026-10-21\"\n}\n", file_get_contents(data_path('aktievy.json')));
check('sparat intervall begränsas', ['2026-09-08', '2026-10-16'], Chart::visibleRange('2010-01-04', '2026-10-16'));
file_put_contents(data_path('aktievy.json'), 'inte json');
check('ogiltig fil ger standard', ['2020-01-01', '2026-10-16'], Chart::visibleRange('2010-01-04', '2026-10-16'));
file_put_contents(data_path('aktievy.json'), '{"start": "2026-10-20", "end": "2026-10-01"}');
check('start efter slut ger standard', ['2020-01-01', '2026-10-16'], Chart::visibleRange('2010-01-04', '2026-10-16'));

// Logaritmisk skala i aktievy.json.
$pythonView = "{\n  \"start\": \"2026-09-08\",\n  \"end\": \"2026-10-21\"\n}\n";
file_put_contents(data_path('aktievy.json'), $pythonView);
check('äldre vy ger linjär skala', ['scale' => 'linear', 'log_scale' => false], Chart::viewSettings());
Chart::saveVisibleRange('2026-09-08', '2026-10-21');
check('datumsparning utan skala är byte-identisk', $pythonView, file_get_contents(data_path('aktievy.json')));
Chart::saveView(['log_scale' => true]);
check('skala sparas efter datumen', "{\n  \"start\": \"2026-09-08\",\n  \"end\": \"2026-10-21\",\n  \"log_scale\": true\n}\n", file_get_contents(data_path('aktievy.json')));
check('logaritmisk skala läses', ['scale' => 'log', 'log_scale' => true], Chart::viewSettings());
Chart::saveVisibleRange('2026-01-02', '2026-10-21');
check('datumsparning behåller skalan', ['scale' => 'log', 'log_scale' => true], Chart::viewSettings());
check('skalsparning behöll datumen', ['2026-01-02', '2026-10-16'], Chart::visibleRange('2010-01-04', '2026-10-16'));
Chart::saveView(['log_scale' => false]);
check('skala kan slås av', ['scale' => 'linear', 'log_scale' => false], Chart::viewSettings());
file_put_contents(data_path('aktievy.json'), '{"start": "2026-09-08", "end": "2026-10-21", "log_scale": "ja"}');
check('ogiltig skala ger linjär', ['scale' => 'linear', 'log_scale' => false], Chart::viewSettings());
Chart::saveView(['scale' => 'ma200', 'log_scale' => false]);
check('avvikelseläge sparas efter log_scale', "{\n  \"start\": \"2026-09-08\",\n  \"end\": \"2026-10-21\",\n  \"log_scale\": false,\n  \"scale\": \"ma200\"\n}\n", file_get_contents(data_path('aktievy.json')));
check('avvikelseläge läses', ['scale' => 'ma200', 'log_scale' => false], Chart::viewSettings());
Chart::saveView(['scale' => 'log_ma200', 'log_scale' => Chart::isLogScale('log_ma200')]);
check('logaritmisk med avvikelse sparas', "{\n  \"start\": \"2026-09-08\",\n  \"end\": \"2026-10-21\",\n  \"log_scale\": true,\n  \"scale\": \"log_ma200\"\n}\n", file_get_contents(data_path('aktievy.json')));
check('logaritmisk med avvikelse läses', ['scale' => 'log_ma200', 'log_scale' => true], Chart::viewSettings());
check('logaritmiska lägen', [false, true, false, false, false, true, true, true], array_map([Chart::class, 'isLogScale'], Chart::SCALES));
foreach (['drawdown', 'change63', 'log_drawdown', 'log_change63'] as $scale) {
    Chart::saveView(['scale' => $scale, 'log_scale' => Chart::isLogScale($scale)]);
    check("skalläge {$scale} läses", ['scale' => $scale, 'log_scale' => Chart::isLogScale($scale)], Chart::viewSettings());
}
check('log_change63 sparar log_scale true', true, str_contains(file_get_contents(data_path('aktievy.json')), "\"log_scale\": true,\n  \"scale\": \"log_change63\""));
Chart::saveView(['scale' => 'log', 'log_scale' => true]);
check('scale går före log_scale', ['scale' => 'log', 'log_scale' => true], Chart::viewSettings());
file_put_contents(data_path('aktievy.json'), '{"start": "2026-09-08", "end": "2026-10-21", "log_scale": true, "scale": "okänd"}');
check('okänd scale faller tillbaka på log_scale', ['scale' => 'log', 'log_scale' => true], Chart::viewSettings());

// Händelser före första kursen behålls utan diagramkurs.
file_put_contents(data_path('cache/FOND.ST.json'), json_encode(['dates' => ['2022-03-07', '2022-03-08'], 'close' => [150.0, 151.0], 'full_fetched_at' => time(), 'checked_at' => time()]));
$fundChart = new Chart([['ticker' => 'FOND.ST', 'name' => 'Fond', 'show_initially' => true]], []);
$fundRow = ['transaction_type' => 'KÖP', 'ticker' => 'FOND.ST', 'quantity' => '10', 'price' => '120', 'commission' => '0'];
$early = $fundChart->marker(['date' => '2019-05-02'] + $fundRow);
check('händelse före första kursen behålls', ['2019-05-02', null, '120'], [$early['date'] ?? null, array_key_exists('chart_price', $early ?? []) ? $early['chart_price'] : 'saknas', $early['price'] ?? null]);
check('händelse efter första kursen får diagramkurs', 151.0, $fundChart->marker(['date' => '2022-03-09'] + $fundRow)['chart_price'] ?? null);
check('ogiltig händelse före första kursen hoppas fortfarande över', null, $fundChart->marker(['date' => '2019-05-02', 'quantity' => '0'] + $fundRow));

// Senast solo-valda aktie.
Chart::saveView(['last_solo' => 'SAAB-B.ST']);
$view = Storage::readJson(data_path('aktievy.json'));
check('last_solo sparas sist och övriga nycklar behålls', ['start', 'end', 'log_scale', 'scale', 'last_solo'], array_keys($view));
check('last_solo läses för känd aktie', 'SAAB-B.ST', Chart::lastSolo(['SAAB-B.ST', 'VOLV-B.ST']));
check('last_solo ignoreras för okänd aktie', null, Chart::lastSolo(['VOLV-B.ST']));
Chart::saveView(['scale' => 'linear', 'log_scale' => false]);
check('last_solo behålls när skalan sparas', 'SAAB-B.ST', Storage::readJson(data_path('aktievy.json'))['last_solo'] ?? null);
$viewBefore = Storage::readJson(data_path('aktievy.json'));
Chart::saveView(['last_solo' => null]);
$viewAfter = Storage::readJson(data_path('aktievy.json'));
check('last_solo töms med null', true, array_key_exists('last_solo', $viewAfter) && $viewAfter['last_solo'] === null);
check('övriga nycklar behålls när last_solo töms', array_diff_key($viewBefore, ['last_solo' => 1]), array_diff_key($viewAfter, ['last_solo' => 1]));
check('tömt last_solo ger ingen solo-aktie', null, Chart::lastSolo(['SAAB-B.ST', 'VOLV-B.ST']));
Chart::saveView(['legend_sort' => 'monthly']);
$view = Storage::readJson(data_path('aktievy.json'));
check('legend_sort sparas sist och övriga nycklar behålls', ['start', 'end', 'log_scale', 'scale', 'last_solo', 'legend_sort'], array_keys($view));
check('legend_sort läses', 'monthly', Chart::legendSort());
Chart::saveView(['legend_sort' => 'total']);
check('legend_sort total läses', 'total', Chart::legendSort());
Chart::saveView(['legend_sort' => 'total_percent']);
check('legend_sort total_percent sparas', 'total_percent', Storage::readJson(data_path('aktievy.json'))['legend_sort']);
check('legend_sort total_percent läses', 'total_percent', Chart::legendSort());
Chart::saveView(['legend_sort' => 'slump']);
check('ogiltig legend_sort ignoreras', null, Chart::legendSort());
Chart::saveView(['legend_sort' => 'none']);

// Sorteringen Valda och dess sparade grupp.
check('ingen sparad grupp ger null', null, Chart::legendSelected(['SAAB-B.ST', 'VOLV-B.ST']));
Chart::saveView(['legend_sort' => 'selected', 'legend_selected' => ['VOLV-B.ST', 'SAAB-B.ST|T']]);
$view = Storage::readJson(data_path('aktievy.json'));
check('legend_sort selected läses', 'selected', Chart::legendSort());
check('legend_selected sparas efter legend_sort och övriga nycklar behålls', ['start', 'end', 'log_scale', 'scale', 'last_solo', 'legend_sort', 'legend_selected'], array_keys($view));
check('legend_selected läses i sparad ordning', ['VOLV-B.ST', 'SAAB-B.ST|T'], Chart::legendSelected(['SAAB-B.ST|T', 'VOLV-B.ST']));
Chart::saveView(['legend_selected' => ['OKAND.ST', 'VOLV-B.ST', 'VOLV-B.ST', 7, 'SAAB-B.ST']]);
check('okända nycklar och dubbletter tas bort', ['VOLV-B.ST', 'SAAB-B.ST'], Chart::legendSelected(['SAAB-B.ST', 'VOLV-B.ST']));
Chart::saveView(['legend_selected' => []]);
check('tom grupp är en sparad grupp', [], Chart::legendSelected(['SAAB-B.ST']));
check('tom grupp skrivs som lista', true, str_contains(file_get_contents(data_path('aktievy.json')), '"legend_selected": []'));
check('series_visible sparas efter legend_selected', true, (static function () {
    Chart::saveSeriesVisibility('SAAB-B.ST|T', true);
    $keys = array_keys(Storage::readJson(data_path('aktievy.json')));
    return array_search('series_visible', $keys, true) === array_search('legend_selected', $keys, true) + 1;
})());
check('värdepappersnyckel utan konto', true, Chart::isSeriesKey('SAAB-B.ST', ['SAAB-B.ST']));
check('värdepappersnyckel med konto', true, Chart::isSeriesKey('SAAB-B.ST|T', ['SAAB-B.ST']));
check('ogiltigt konto i värdepappersnyckel', false, Chart::isSeriesKey('SAAB-B.ST|tt', ['SAAB-B.ST']));
check('okänd ticker i värdepappersnyckel', false, Chart::isSeriesKey('OKAND.ST', ['SAAB-B.ST']));
check('värdepappersnyckel som inte är text', false, Chart::isSeriesKey(['SAAB-B.ST'], ['SAAB-B.ST']));
Chart::saveView(static fn(array $view) => ['legend_sort' => 'none'] + array_diff_key($view, ['legend_selected' => 1, 'series_visible' => 1]));

// Konto per transaktion: ett värdepapper per konto, namn med konto, solo och synlighet per värdepapper.
file_put_contents(data_path('cache/ANNAN.ST.json'), json_encode(['dates' => ['2022-03-07', '2022-03-08'], 'close' => [50.0, 51.0], 'full_fetched_at' => time(), 'checked_at' => time()]));
$accountStocks = [['ticker' => 'FOND.ST', 'name' => 'Fond', 'show_initially' => true], ['ticker' => 'ANNAN.ST', 'name' => 'Annan', 'show_initially' => false]];
$accountRows = [
    ['date' => '2022-03-08', 'transaction_type' => 'KÖP', 'ticker' => 'FOND.ST', 'quantity' => '1', 'price' => '151', 'commission' => '0', 'account' => 'T'],
    ['date' => '2022-03-08', 'transaction_type' => 'KÖP', 'ticker' => 'FOND.ST', 'quantity' => '2', 'price' => '151', 'commission' => '0', 'account' => 'I'],
];
$accountChart = new Chart($accountStocks, $accountRows);
check('värdepapper per konto i kontoordning', ['FOND.ST|I', 'FOND.ST|T', 'ANNAN.ST'], array_column($accountChart->seriesList(), 'key'));
check('namn med konto inom parentes', ['Fond (I)', 'Fond (T)', 'Annan'], array_column($accountChart->seriesList(), 'displayName'));
check('konton för förslag', ['I', 'T'], $accountChart->accounts());
$streamed = '';
$accountChart->stream(static function (string $chunk) use (&$streamed) { $streamed .= $chunk; });
$figure = json_decode($streamed, true);
$purchaseTraces = array_values(array_filter($figure['data'], static fn($trace) => $trace['meta']['role'] === 'purchase'));
check('markeringar per konto', [['FOND.ST|I', ['2']], ['FOND.ST|T', ['1']], ['ANNAN.ST', []]], array_map(static fn($trace) => [$trace['meta']['series'], array_map(static fn($details) => $details[2], $trace['customdata'])], $purchaseTraces));
check('kontot i customdata', 'I', $purchaseTraces[0]['customdata'][0][12]);
check('kurvans meta', ['role' => 'stock', 'ticker' => 'FOND.ST', 'series' => 'FOND.ST|I', 'account' => 'I', 'displayName' => 'Fond (I)'], $figure['data'][0]['meta']);
check('rad utan konto hör till T', 'FOND.ST|T', $accountChart->marker(array_diff_key($accountRows[0], ['account' => 1]))['series']);
Chart::saveView(['last_solo' => 'FOND.ST|T']);
check('last_solo med konto', 'FOND.ST|T', Chart::lastSolo(array_column($accountChart->seriesList(), 'key')));
Chart::saveView(['last_solo' => 'FOND.ST']);
check('äldre last_solo ger första kontot', 'FOND.ST|I', Chart::lastSolo(array_column($accountChart->seriesList(), 'key')));
Chart::saveView(['last_solo' => 'OKÄND.ST']);
check('okänd last_solo ignoreras', null, Chart::lastSolo(array_column($accountChart->seriesList(), 'key')));
Chart::saveView(['last_solo' => null]);
Chart::saveSeriesVisibility('FOND.ST|I', false);
Chart::saveSeriesVisibility('ANNAN.ST|T', true);
check('synlighet per konto sparas', ['ANNAN.ST|T' => true, 'FOND.ST|I' => false], Chart::seriesVisibility());
check('synlighet sparas sist och övriga nycklar behålls', ['start', 'end', 'log_scale', 'scale', 'last_solo', 'legend_sort', 'series_visible'], array_keys(Storage::readJson(data_path('aktievy.json'))));
check('sparad synlighet gäller, annars show_initially', [false, true, false], array_column($accountChart->seriesList(), 'visible'));

// Inloggningsspärr.
$_SESSION = [];
for ($attempt = 1; $attempt <= 10; $attempt++) {
    check("fel lösenord {$attempt}", 'Fel lösenord.', Auth::attemptLogin('fel', '203.0.113.5'));
}
check('försök 11 spärras även med rätt lösenord', true, str_contains((string)Auth::attemptLogin('rätt lösenord', '203.0.113.5'), 'För många'));
check('annan klient påverkas inte', null, Auth::attemptLogin('rätt lösenord', '203.0.113.6'));
$attempts = json_decode((string)file_get_contents(data_path('login-attempts.json')), true);
$attempts[hash('sha256', '203.0.113.5')]['last'] = time() - 15 * 60 - 1;
file_put_contents(data_path('login-attempts.json'), json_encode($attempts));
check('spärren upphör efter 15 minuter', null, Auth::attemptLogin('rätt lösenord', '203.0.113.5'));

exec('rm -rf ' . escapeshellarg($dataDir));
echo $failures ? "{$failures} av {$count} kontroller misslyckades.\n" : "Alla {$count} kontroller lyckades.\n";
exit($failures ? 1 : 0);

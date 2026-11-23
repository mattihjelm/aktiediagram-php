<?php
declare(strict_types=1);

/** Bygger Plotly-figuren med samma spår, customdata och layout som Python-versionen. */
final class Chart
{
    /** Sorteringar av värdepapperslistan: ordningen i aktier.csv, namn, procent per månad eller total avkastning. */
    public const LEGEND_SORTS = ['none', 'name', 'monthly', 'total', 'total_percent', 'selected'];

    private const PLOT_COLORS = [
        '#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A',
        '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52',
    ];

    /** @var array<int, array{ticker: string, name: string, show_initially: bool}> */
    private array $stocks;
    private array $purchases;
    private Fx $fx;
    /** @var array<string, array{dates: string[], close: float[]}> */
    private array $series = [];
    /** @var string[] */
    public array $warnings = [];

    public function __construct(array $stocks, array $purchases)
    {
        $this->stocks = $stocks;
        $this->purchases = $purchases;
        $this->fx = new Fx(Market::requiredFx($stocks, $purchases));
        foreach ($stocks as $stock) {
            $series = $this->loadSeries($stock['ticker']);
            if ($series) {
                $this->series[$stock['ticker']] = $series;
            }
        }
    }

    public function fx(): Fx
    {
        return $this->fx;
    }

    public function hasSeries(string $ticker): bool
    {
        return isset($this->series[$ticker]);
    }

    /** Kursserie i diagrammets valuta (Berkshire i SEK). */
    private function loadSeries(string $ticker): ?array
    {
        $history = Market::history($ticker);
        if (!$history || !$history['dates']) {
            $this->warnings[] = "Kunde inte hämta kursdata för {$ticker}; serien hoppas över.";
            return null;
        }
        if ((float)$history['close'][0] == 0.0) {
            $this->warnings[] = "Saknar användbara kurser för {$ticker}; serien hoppas över.";
            return null;
        }
        if ($ticker !== 'BRK-B') {
            return ['dates' => $history['dates'], 'close' => $history['close']];
        }
        if (!$this->fx->has('USD')) {
            $this->warnings[] = 'Kunde inte hämta USD/SEK-data för Berkshire; serien hoppas över.';
            return null;
        }
        $converted = ['dates' => [], 'close' => []];
        foreach ($history['dates'] as $index => $date) {
            $rate = $this->fx->rate('USD', $date);
            if ($rate !== null) {
                $converted['dates'][] = $date;
                $converted['close'][] = $history['close'][$index] * $rate;
            }
        }
        if (!$converted['dates']) {
            $this->warnings[] = 'Saknar användbara USD/SEK-kurser för Berkshire; serien hoppas över.';
            return null;
        }
        return $converted;
    }

    /** Senaste kurs på eller före datumet. */
    public function priceOnOrBefore(string $ticker, string $date): ?float
    {
        $series = $this->series[$ticker] ?? null;
        if (!$series) {
            return null;
        }
        $index = Fx::lastIndexOnOrBefore($series['dates'], substr($date, 0, 10));
        return $index === null ? null : (float)$series['close'][$index];
    }

    /** customdata-rad för en kurspunkt: [kurs, visad kurs, faktor, valutakurs till SEK]. */
    public function priceCustomdata(string $ticker, string $date, float $price, ?float $fxRate = null): array
    {
        $currency = Stocks::currency($ticker);
        return [$price, swedish_money($price) . ($currency !== '' ? " {$currency}" : ''), 1.0, $fxRate ?? $this->fx->forTicker($ticker, $date)];
    }

    /** Diagrammarkering för en händelse, eller null om den inte kan visas (som i Python-versionen). */
    public function marker(array $row): ?array
    {
        $ticker = trim((string)($row['ticker'] ?? ''));
        $date = substr((string)($row['date'] ?? ''), 0, 10);
        if (!isset($this->series[$ticker]) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return null;
        }
        $decimal = static fn($value) => Dec::parse(trim(str_replace(',', '.', (string)$value)));
        $price = $decimal($row['price'] ?? '');
        $quantity = $decimal($row['quantity'] ?? '');
        $commissionText = trim(str_replace(',', '.', (string)(($row['commission'] ?? '') ?: '0')));
        $commission = Dec::parse($commissionText);
        if ($price === null || $quantity === null || $commission === null) {
            return null;
        }
        $type = mb_strtoupper((string)(($row['transaction_type'] ?? '') ?: 'KÖP'), 'UTF-8');
        $chartPrice = $this->priceOnOrBefore($ticker, $date);
        $validPrice = $type === 'UTDELNING' ? !Dec::isZero($price) : Dec::isPositive($price);
        // Händelser före aktiens första kurs behålls (för lista och resultat) men får ingen diagramkurs.
        if (!$validPrice || !Dec::isPositive($quantity)) {
            return null;
        }
        $amountCurrency = (string)($row['amount_currency'] ?? '');
        $account = strtoupper(trim((string)($row['account'] ?? ''))) ?: DEFAULT_ACCOUNT;
        return [
            'ticker' => $ticker,
            'date' => $date,
            'chart_price' => $chartPrice,
            'price' => (string)$row['price'],
            'quantity' => (string)$row['quantity'],
            'currency' => $amountCurrency !== '' ? $amountCurrency : Stocks::currency($ticker),
            'commission' => $commissionText,
            'transaction_type' => $type,
            'amount_currency' => $amountCurrency,
            'sek_fx_rate' => $this->fx->rate($amountCurrency !== '' ? $amountCurrency : Stocks::fxCurrency($ticker), $date),
            'ticker_fx_rate' => $this->fx->forTicker($ticker, $date),
            // Ogiltiga handifyllda klockslag ignoreras.
            'time' => Purchases::validTime($row['time'] ?? '') ?? '',
            // Radens nyckel i aktiekop.csv, för borttagning.
            'row_key' => (string)($row['row_key'] ?? ''),
            'account' => $account,
            'series' => self::seriesKey($ticker, $account),
        ];
    }

    public static function markerCustomdata(array $marker): array
    {
        return [
            $marker['chart_price'], $marker['price'], $marker['quantity'], $marker['ticker'], $marker['currency'],
            $marker['commission'], $marker['transaction_type'], $marker['sek_fx_rate'], $marker['ticker_fx_rate'], $marker['amount_currency'],
            $marker['time'], $marker['row_key'], $marker['account'],
        ];
    }

    public static function markerSymbol(string $type): string
    {
        return $type === 'UTDELNING' ? 'diamond' : ($type === 'KÖP' ? 'circle' : 'triangle-down');
    }

    /** Seriens nyckel: tickern för ett värdepapper utan konto, annars ticker och konto. */
    public static function seriesKey(string $ticker, string $account): string
    {
        return $account === '' ? $ticker : "{$ticker}|{$account}";
    }

    /** Visningsnamn med kontot inom parentes, t.ex. "Tele2 (T)". */
    public static function displayName(string $name, string $account): string
    {
        return $account === '' ? $name : "{$name} ({$account})";
    }

    /**
     * Värdepapper i diagrammet: ett per konto med transaktioner, i ordningen i aktier.csv och sedan
     * kontoordning A–Z, eller ett utan konto för aktier utan transaktioner. Bara aktier med kursdata.
     * @return array<int, array{key: string, ticker: string, name: string, account: string, displayName: string, visible: bool}>
     */
    public function seriesList(): array
    {
        $accounts = [];
        foreach ($this->purchases as $row) {
            $ticker = trim((string)($row['ticker'] ?? ''));
            $accounts[$ticker][strtoupper(trim((string)($row['account'] ?? ''))) ?: DEFAULT_ACCOUNT] = true;
        }
        $saved = self::seriesVisibility();
        $list = [];
        foreach ($this->stocks as $stock) {
            if (!isset($this->series[$stock['ticker']])) {
                continue;
            }
            $stockAccounts = array_keys($accounts[$stock['ticker']] ?? ['' => true]);
            sort($stockAccounts);
            foreach ($stockAccounts as $account) {
                $account = (string)$account;
                $key = self::seriesKey($stock['ticker'], $account);
                $list[] = [
                    'key' => $key,
                    'ticker' => $stock['ticker'],
                    'name' => $stock['name'],
                    'account' => $account,
                    'displayName' => self::displayName($stock['name'], $account),
                    // Värdepapper med konto sparar sin synlighet i aktievy.json; annars gäller aktier.csv.
                    'visible' => $account !== '' && isset($saved[$key]) ? $saved[$key] : $stock['show_initially'],
                ];
            }
        }
        return $list;
    }

    /** Aktier med kursdata, i listans ordning, för formulärets aktieval. */
    public function availableStocks(): array
    {
        $available = [];
        foreach ($this->stocks as $stock) {
            if (isset($this->series[$stock['ticker']])) {
                $available[] = ['ticker' => $stock['ticker'], 'name' => $stock['name']];
            }
        }
        return $available;
    }

    /**
     * Skriv figuren som JSON spår för spår, så att minnet räcker även för 100 aktier.
     * @param callable(string): void $write
     */
    public function stream(callable $write): void
    {
        if (!$this->series) {
            throw new RuntimeException('Ingen kursdata kunde hämtas från Yahoo Finance. Försök igen senare.');
        }
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;
        $write('{"data":[');
        $first = true;
        $colors = [];
        $minDate = null;
        $maxDate = null;
        $seriesList = $this->seriesList();
        foreach ($seriesList as $entry) {
            $ticker = $entry['ticker'];
            $key = $entry['key'];
            $series = $this->series[$ticker];
            $colors[$key] = self::PLOT_COLORS[count($colors) % count(self::PLOT_COLORS)];
            $minDate = $minDate === null || $series['dates'][0] < $minDate ? $series['dates'][0] : $minDate;
            $last = $series['dates'][count($series['dates']) - 1];
            $maxDate = $maxDate === null || $last > $maxDate ? $last : $maxDate;
            $base = (float)$series['close'][0];
            $x = [];
            $y = [];
            $customdata = [];
            foreach ($series['dates'] as $index => $date) {
                $price = (float)$series['close'][$index];
                $x[] = "{$date}T00:00:00";
                $y[] = $price / $base * 100;
                $customdata[] = $this->priceCustomdata($ticker, $date, $price);
            }
            $label = $entry['displayName'];
            $write(($first ? '' : ',') . json_encode([
                'type' => 'scatter',
                'x' => $x,
                'y' => $y,
                'customdata' => $customdata,
                'mode' => 'lines',
                'cliponaxis' => false,
                'name' => $label,
                'meta' => ['role' => 'stock', 'ticker' => $ticker, 'series' => $key, 'account' => $entry['account'], 'displayName' => $label],
                'legendgroup' => $key,
                'visible' => $entry['visible'] ? true : 'legendonly',
                'line' => ['width' => 2, 'color' => $colors[$key]],
                'hovertemplate' => "{$label}: %{customdata[1]}<br>Index: %{y:.1f}<extra></extra>",
            ], $flags));
            $first = false;
            unset($x, $y, $customdata);
        }

        $markers = array_fill_keys(array_column($seriesList, 'key'), []);
        foreach ($this->purchases as $index => $row) {
            $marker = $this->marker($row + ['row_key' => Purchases::rowKey($index, $row)]);
            if ($marker && isset($markers[$marker['series']])) {
                $markers[$marker['series']][] = $marker;
            }
        }
        foreach ($seriesList as $entry) {
            $ticker = $entry['ticker'];
            $key = $entry['key'];
            $base = (float)$this->series[$ticker]['close'][0];
            $write(',' . json_encode([
                'type' => 'scatter',
                'x' => array_column($markers[$key], 'date'),
                'xaxis' => 'x2',
                // null-y ritas inte: händelser före första kursen syns bara i lista och resultat.
                'y' => array_map(static fn($marker) => $marker['chart_price'] === null ? null : $marker['chart_price'] / $base * 100, $markers[$key]),
                'customdata' => array_map([self::class, 'markerCustomdata'], $markers[$key]),
                'mode' => 'markers',
                'name' => "{$entry['displayName']} köp",
                'meta' => ['role' => 'purchase', 'ticker' => $ticker, 'series' => $key, 'account' => $entry['account']],
                'legendgroup' => $key,
                'showlegend' => false,
                'visible' => $entry['visible'] ? true : 'legendonly',
                'marker' => [
                    'symbol' => array_map(static fn($marker) => self::markerSymbol($marker['transaction_type']), $markers[$key]),
                    'size' => 10,
                    'color' => $colors[$key],
                    'line' => ['color' => '#333333', 'width' => 1.5],
                ],
                'hovertemplate' => "{$entry['displayName']} %{customdata[6]} · %{customdata[1]} %{customdata[4]}<extra></extra>",
            ], $flags));
        }

        [$visibleStart, $visibleEnd] = self::visibleRange($minDate, $maxDate);
        $scale = self::viewSettings()['scale'];
        $template = json_decode((string)file_get_contents(__DIR__ . '/plotly_template.json'), true);
        $layout = [
            'template' => $template,
            // Kurvornas namnetiketter ligger inne i diagramytan, så högermarginalen behövs inte.
            'margin' => ['r' => 20],
            'title' => ['text' => ''],
            'xaxis' => [
                'title' => ['text' => 'Datum'],
                'rangeslider' => ['visible' => true, 'range' => ["{$minDate}T00:00:00", "{$maxDate}T00:00:00"], 'thickness' => 0.12],
                'range' => ["{$visibleStart}T00:00:00", "{$visibleEnd}T00:00:00"],
                'hoverformat' => '%Y-%m-%d',
            ],
            'yaxis' => [
                // Ingen axelrubrik med linjär skala; sidans rubrik anger redan indexeringen.
                'title' => ['text' => ''],
                'type' => self::isLogScale($scale) ? 'log' : 'linear',
            ],
            // Valt skalläge (se SCALES); chart.js tillämpar måttet.
            'meta' => [
                'scale' => $scale,
                // Visningsvaluta per aktie, så att webbläsaren inte har egna listor.
                'currencies' => array_combine(
                    array_column($this->stocks, 'ticker'),
                    array_map([Stocks::class, 'currency'], array_column($this->stocks, 'ticker')),
                ),
                // Konton som används, för förslagen i formuläret och importen.
                'accounts' => $this->accounts(),
            ] + array_filter([
                'lastSolo' => self::lastSolo(array_column($seriesList, 'key')),
                'legendSort' => self::legendSort(),
                // Gruppen för sorteringen Valda; en tom lista är en sparad men tom grupp och behålls.
                'legendSelected' => self::legendSelected(array_column($seriesList, 'key')),
            ], static fn($value) => $value !== null),
            'hovermode' => 'x unified',
            'hoverdistance' => 50,
            'spikedistance' => 50,
            'clickmode' => 'event',
            'showlegend' => false,
            // Håll köp/sälj-symbolerna synkroniserade med huvudaxeln men utanför rangeslidern.
            'xaxis2' => ['overlaying' => 'x', 'matches' => 'x', 'visible' => false, 'showticklabels' => false],
        ];
        $write('],"layout":' . json_encode($layout, $flags)
            . ',"config":' . json_encode(['doubleClick' => false, 'responsive' => true], $flags)
            . ',"stocks":' . json_encode($this->availableStocks(), $flags)
            . ',"warnings":' . json_encode($this->warnings, $flags) . '}');
    }

    /** Senast visat datumintervall från aktievy.json, begränsat till tillgänglig historik. */
    public static function visibleRange(string $availableStart, string $availableEnd): array
    {
        $default = [max(INITIAL_VISIBLE_START, $availableStart), $availableEnd];
        $saved = Storage::readJson(data_path('aktievy.json'));
        $valid = static fn($value) => is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}/', $value)
            && DateTimeImmutable::createFromFormat('!Y-m-d', substr($value, 0, 10)) !== false;
        if (!$saved || !$valid($saved['start'] ?? null) || !$valid($saved['end'] ?? null)) {
            return $default;
        }
        $start = max(substr($saved['start'], 0, 10), $availableStart);
        $end = min(substr($saved['end'], 0, 10), $availableEnd);
        return $start >= $end ? $default : [$start, $end];
    }

    public static function saveVisibleRange(string $start, string $end): void
    {
        self::saveView(['start' => $start, 'end' => $end]);
    }

    /**
     * Skallägen: linjär, logaritmisk, ett mått (avvikelse från 200-dagars medel, fall från tidigare topp,
     * förändring över 3 månader) eller logaritmisk med ett mått.
     */
    public const SCALES = ['linear', 'log', 'ma200', 'drawdown', 'change63', 'log_ma200', 'log_drawdown', 'log_change63'];

    /**
     * Vyinställningar utöver datumintervallet. Giltig scale gäller; annars ger log_scale true
     * logaritmisk skala (äldre filer), och allt annat linjär.
     */
    public static function viewSettings(): array
    {
        $saved = Storage::readJson(data_path('aktievy.json')) ?? [];
        $scale = in_array($saved['scale'] ?? null, self::SCALES, true)
            ? $saved['scale']
            : (($saved['log_scale'] ?? false) === true ? 'log' : 'linear');
        return ['scale' => $scale, 'log_scale' => self::isLogScale($scale)];
    }

    /**
     * Senast solo-valt värdepapper från aktievy.json bland seriernas nycklar, eller null. Ett äldre värde
     * som bara är en ticker ger tickerns första värdepapper i kontoordning ($keys är redan sorterade så).
     */
    public static function lastSolo(array $keys): ?string
    {
        $saved = (Storage::readJson(data_path('aktievy.json')) ?? [])['last_solo'] ?? null;
        if (!is_string($saved) || $saved === '') {
            return null;
        }
        if (in_array($saved, $keys, true)) {
            return $saved;
        }
        foreach ($keys as $key) {
            if (str_starts_with($key, $saved . '|')) {
                return $key;
            }
        }
        return null;
    }

    /** Sparad synlighet per värdepapper med konto, från aktievy.json. @return array<string, bool> */
    public static function seriesVisibility(): array
    {
        $saved = (Storage::readJson(data_path('aktievy.json')) ?? [])['series_visible'] ?? null;
        return is_array($saved) ? array_filter($saved, 'is_bool') : [];
    }

    /** Spara synligheten för ett värdepapper med konto och behåll övriga värden i aktievy.json. */
    public static function saveSeriesVisibility(string $key, bool $visible): void
    {
        self::saveView(static function (array $view) use ($key, $visible) {
            $saved = is_array($view['series_visible'] ?? null) ? $view['series_visible'] : [];
            $saved[$key] = $visible;
            ksort($saved);
            return ['series_visible' => $saved] + $view;
        });
    }

    /** Konton i aktiekop.csv i ordning A–Z, alltid med standardkontot. @return string[] */
    public function accounts(): array
    {
        $accounts = [DEFAULT_ACCOUNT => true];
        foreach ($this->purchases as $row) {
            $accounts[strtoupper(trim((string)($row['account'] ?? ''))) ?: DEFAULT_ACCOUNT] = true;
        }
        $accounts = array_map('strval', array_keys($accounts));
        sort($accounts);
        return $accounts;
    }

    /** Sparad sortering av aktielegenden, eller null om den saknas eller är ogiltig. */
    public static function legendSort(): ?string
    {
        $saved = (Storage::readJson(data_path('aktievy.json')) ?? [])['legend_sort'] ?? null;
        return in_array($saved, self::LEGEND_SORTS, true) ? $saved : null;
    }

    /**
     * Sparad grupp för sorteringen Valda, i den ordning värdepapperen lades till, begränsad till $keys och utan dubbletter.
     * null när ingen grupp är sparad. @param string[] $keys @return ?string[]
     */
    public static function legendSelected(array $keys): ?array
    {
        $saved = (Storage::readJson(data_path('aktievy.json')) ?? [])['legend_selected'] ?? null;
        if (!is_array($saved)) {
            return null;
        }
        return array_values(array_unique(array_filter($saved, static fn($key) => is_string($key) && in_array($key, $keys, true))));
    }

    /** Om $series är en värdepappersnyckel för en aktie i $tickers: "TICKER" eller "TICKER|K" med ett konto A–Z. @param string[] $tickers */
    public static function isSeriesKey(mixed $series, array $tickers): bool
    {
        if (!is_string($series)) {
            return false;
        }
        [$ticker, $account] = array_pad(explode('|', $series, 2), 2, null);
        return ($account === null || preg_match('/^[A-Z]$/', $account) === 1) && in_array($ticker, $tickers, true);
    }

    /** Lägen där aktiekurvorna visas på logaritmiska axlar. */
    public static function isLogScale(string $scale): bool
    {
        return $scale === 'log' || str_starts_with($scale, 'log_');
    }

    /**
     * Uppdaterar de angivna nycklarna i aktievy.json och behåller övriga.
     * $changes är nycklar att ersätta, eller en funktion som får nuvarande vy och returnerar den nya.
     * @param array{start?: string, end?: string, log_scale?: bool, scale?: string, last_solo?: ?string, legend_sort?: string, legend_selected?: string[]}|callable(array): array $changes
     */
    public static function saveView(array|callable $changes): void
    {
        $file = data_path('aktievy.json');
        Storage::withLock($file, true, static function () use ($file, $changes) {
            $current = Storage::readJson($file) ?? [];
            $view = is_callable($changes) ? $changes($current) : array_merge($current, $changes);
            // Samma format som Pythons json.dumps(indent=2): start, end, log_scale och sedan scale.
            $lines = [];
            foreach (['start', 'end', 'log_scale', 'scale', 'last_solo', 'legend_sort', 'legend_selected', 'series_visible'] as $key) {
                if (array_key_exists($key, $view)) {
                    // Tom karta skrivs som {} och inte [].
                    $value = $key === 'series_visible' ? (object)$view[$key] : $view[$key];
                    $lines[] = '  ' . json_encode($key) . ': ' . json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }
            }
            Storage::writeAtomic($file, "{\n" . implode(",\n", $lines) . "\n}\n");
        });
    }

    /**
     * Tidsstämpel för senast ändrade programfil, utan datafiler, cache, sessioner och Git-metadata.
     * @param string[] $roots
     */
    public static function versionSuffix(array $roots): string
    {
        $excluded = array_filter(array_map('realpath', [app_config()['data_dir'], app_config()['session_dir']]));
        $latest = 0;
        foreach ($roots as $root) {
            if (is_file($root)) {
                $latest = max($latest, (int)filemtime($root));
                continue;
            }
            if (!is_dir($root)) {
                continue;
            }
            $iterator = new RecursiveIteratorIterator(new RecursiveCallbackFilterIterator(
                new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
                static function (SplFileInfo $file) use ($excluded) {
                    $path = $file->getRealPath() ?: '';
                    if (in_array($file->getFilename(), ['.git', 'data', 'sessions', 'cache', '.DS_Store'], true)) {
                        return false;
                    }
                    foreach ($excluded as $directory) {
                        if (strncmp($path, $directory, strlen($directory)) === 0) {
                            return false;
                        }
                    }
                    return true;
                }
            ));
            foreach ($iterator as $file) {
                if ($file->isFile() && $file->getFilename() !== 'config.php') {
                    $latest = max($latest, $file->getMTime());
                }
            }
        }
        return $latest ? date('Y-m-d H:i', $latest) : 'filens tidsstämpel saknas';
    }
}

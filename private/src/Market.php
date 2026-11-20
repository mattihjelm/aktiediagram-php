<?php
declare(strict_types=1);

/**
 * Kursdata från Yahoo Finance (chart-API:t) med filcache i data/cache.
 * Dagskurser är ojusterade slutkurser, som auto_adjust=False i Python-versionen.
 */
final class Market
{
    private const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
    private const USER_AGENT = 'Mozilla/5.0 (compatible; aktiediagram)';
    // Full historik hämtas om när cachen är äldre än detta, så att splittar slår igenom.
    private const FULL_REFRESH_SECONDS = 20 * 3600;
    // En saknad slutkurs hämtas tidigast så här ofta vid sidladdning.
    private const STALE_RETRY_SECONDS = 30 * 60;
    // Yahoo ger 1-minutersdata för de senaste 30 dagarna och högst 8 dagar per anrop.
    private const MINUTE_DAYS = 30;
    private const MINUTE_WINDOW_SECONDS = 7 * 86400;
    private const MINUTE_CACHE_SECONDS = 5 * 60;

    /** Amerikansk aktie: ticker utan börssuffix som varken är fond-id (0P…) eller valutakurs (=X). */
    public static function isUsMarket(string $ticker): bool
    {
        return !str_contains($ticker, '.') && !str_contains($ticker, '=') && !str_starts_with($ticker, '0P');
    }

    /** Senaste vardag vars stängningskurs hunnit publiceras på marknaden. */
    public static function latestClosedDate(string $ticker, ?DateTimeImmutable $now = null): string
    {
        $us = self::isUsMarket($ticker);
        $zone = new DateTimeZone($us ? 'America/New_York' : 'Europe/Stockholm');
        $now = ($now ?? new DateTimeImmutable('now'))->setTimezone($zone);
        $latest = $now->setTime(0, 0);
        if ((int)$now->format('N') >= 6 || $now->format('H:i') < ($us ? '16:30' : '17:50')) {
            $latest = $latest->modify('-1 day');
        }
        while ((int)$latest->format('N') >= 6) {
            $latest = $latest->modify('-1 day');
        }
        return $latest->format('Y-m-d');
    }

    /**
     * Varningar för misslyckade hämtningar. Når servern inte Yahoo alls blir det ett
     * enda meddelande i stället för ett per symbol.
     * @param array<string, string> $failures
     * @param callable(string, string): string $format symbol, fel => varning
     */
    public static function failureWarnings(array $failures, callable $format): array
    {
        $messages = array_values(array_unique($failures));
        if (count($failures) > 1 && count($messages) === 1 && self::isConnectionError($messages[0])) {
            return [$messages[0] . '. Redan inlästa kurser visas.'];
        }
        $warnings = [];
        foreach ($failures as $symbol => $message) {
            $warnings[] = $format((string)$symbol, $message);
        }
        return $warnings;
    }

    public static function isConnectionError(string $message): bool
    {
        return str_starts_with($message, 'Yahoo Finance kunde inte nås');
    }

    /** Ticker vars stängning avgör när valutakursen räknas som publicerad. */
    public static function fxReference(string $currency): string
    {
        return $currency === 'USD' ? 'NDAQ' : 'RHM.DE';
    }

    /** Valutor som behövs för aktierna och de registrerade händelserna. */
    public static function requiredFx(array $stocks, array $purchases): array
    {
        $currencies = [];
        foreach ($stocks as $stock) {
            $currencies[] = Stocks::fxCurrency($stock['ticker']);
            // Berkshire visas i SEK men räknas om från USD.
            if ($stock['ticker'] === 'BRK-B') {
                $currencies[] = 'USD';
            }
        }
        foreach ($purchases as $purchase) {
            $currencies[] = strtoupper((string)($purchase['amount_currency'] ?? ''));
        }
        return array_values(array_intersect(array_keys(FX_TICKERS), $currencies));
    }

    private static function cacheFile(string $symbol): string
    {
        return data_path('cache/' . preg_replace('/[^A-Za-z0-9._-]/', '_', $symbol) . '.json');
    }

    /** @return array{dates: string[], close: float[], full_fetched_at: int, checked_at: int}|null */
    public static function history(string $symbol): ?array
    {
        $file = self::cacheFile($symbol);
        return Storage::withLock($file, false, static fn() => Storage::readJson($file));
    }

    private static function saveHistory(string $symbol, array $history): void
    {
        $file = self::cacheFile($symbol);
        Storage::withLock($file, true, static fn() => Storage::writeAtomic($file, json_encode($history, JSON_PRESERVE_ZERO_FRACTION)));
    }

    /** Symboler (aktier och valutor) vars cache saknas eller behöver hämtas om vid sidladdning. */
    public static function symbolsNeedingHistory(array $symbols): array
    {
        $now = time();
        $needed = [];
        foreach ($symbols as $symbol => $until) {
            $history = self::history($symbol);
            $last = $history && $history['dates'] ? (string)end($history['dates']) : '';
            // En symbol utan data försöks inte igen vid varje sidladdning. Nätverksfel
            // försöks däremot direkt, eftersom de oftast är tillfälliga.
            if ($history && $now - (int)($history['failed_at'] ?? 0) <= self::STALE_RETRY_SECONDS
                && !self::isConnectionError((string)($history['error'] ?? ''))) {
                continue;
            }
            if (!$history
                || $now - (int)($history['full_fetched_at'] ?? 0) > self::FULL_REFRESH_SECONDS
                || ($last < $until && $now - (int)($history['checked_at'] ?? 0) > self::STALE_RETRY_SECONDS)) {
                $needed[] = $symbol;
            }
        }
        return $needed;
    }

    /**
     * Hämta full historik från START_DATE för symbolerna.
     * @param array<string, string> $symbols symbol => senaste stängda datum som får tas med
     * @return array<string, string> symbol => felmeddelande för de som misslyckades
     */
    public static function fetchHistory(array $symbols): array
    {
        $period1 = (new DateTimeImmutable(START_DATE . ' 00:00', new DateTimeZone('UTC')))->modify('-1 day')->getTimestamp();
        $requests = [];
        foreach ($symbols as $symbol => $until) {
            $requests[$symbol] = self::CHART_URL . rawurlencode($symbol) . '?' . http_build_query([
                'period1' => $period1, 'period2' => time(), 'interval' => '1d', 'events' => 'div,split',
            ]);
        }
        $failures = [];
        foreach (self::fetchAll($requests) as $symbol => $response) {
            try {
                $daily = self::parseDaily($response, START_DATE, $symbols[$symbol]);
                if (!$daily['dates']) {
                    throw new RuntimeException('inga kurser');
                }
                $now = time();
                self::saveHistory($symbol, $daily + ['full_fetched_at' => $now, 'checked_at' => $now]);
            } catch (Throwable $error) {
                $failures[$symbol] = $error->getMessage();
                // Behåll tidigare cachad historik men minns felet.
                $history = self::history($symbol) ?? ['dates' => [], 'close' => [], 'full_fetched_at' => 0, 'checked_at' => 0];
                self::saveHistory($symbol, ['failed_at' => time(), 'error' => $error->getMessage()] + $history);
            }
        }
        return $failures;
    }

    /**
     * Hämta dagskurser efter senaste cachade dag och lägg till dem i cachen.
     * @param array<string, string> $symbols symbol => senaste stängda datum som får tas med
     * @return array{0: array<string, array{dates: string[], close: float[]}>, 1: array<string, string>}
     *         nya punkter per symbol och fel per symbol
     */
    public static function fetchNewCloses(array $symbols): array
    {
        $requests = [];
        $existing = [];
        foreach ($symbols as $symbol => $until) {
            $history = self::history($symbol);
            if (!$history || !$history['dates']) {
                continue;
            }
            $existing[$symbol] = $history;
            $start = new DateTimeImmutable(end($history['dates']) . ' 00:00', new DateTimeZone('UTC'));
            $requests[$symbol] = self::CHART_URL . rawurlencode($symbol) . '?' . http_build_query([
                'period1' => $start->modify('-1 day')->getTimestamp(), 'period2' => time(), 'interval' => '1d',
            ]);
        }
        $added = [];
        $failures = [];
        foreach (self::fetchAll($requests) as $symbol => $response) {
            try {
                $history = $existing[$symbol];
                $last = (string)end($history['dates']);
                $daily = self::parseDaily($response, START_DATE, $symbols[$symbol]);
                $new = ['dates' => [], 'close' => []];
                foreach ($daily['dates'] as $index => $date) {
                    if ($date > $last) {
                        $new['dates'][] = $date;
                        $new['close'][] = $daily['close'][$index];
                    }
                }
                $history['dates'] = array_merge($history['dates'], $new['dates']);
                $history['close'] = array_merge($history['close'], $new['close']);
                $history['checked_at'] = time();
                self::saveHistory($symbol, $history);
                if ($new['dates']) {
                    $added[$symbol] = $new;
                }
            } catch (Throwable $error) {
                $failures[$symbol] = $error->getMessage();
            }
        }
        return [$added, $failures];
    }

    /**
     * Senaste intradagskurs per symbol.
     * @return array{0: array<string, array{date: string, price: float, time: int}>, 1: array<string, string>}
     */
    public static function fetchIntraday(array $symbols): array
    {
        $requests = [];
        foreach ($symbols as $symbol) {
            $requests[$symbol] = self::CHART_URL . rawurlencode($symbol) . '?range=1d&interval=1m';
        }
        $quotes = [];
        $failures = [];
        foreach (self::fetchAll($requests) as $symbol => $response) {
            try {
                $result = self::chartResult($response);
                $zone = new DateTimeZone($result['meta']['exchangeTimezoneName'] ?? 'UTC');
                $closes = $result['indicators']['quote'][0]['close'] ?? [];
                foreach (array_reverse(array_keys($closes)) as $index) {
                    if ($closes[$index] !== null && isset($result['timestamp'][$index])) {
                        $time = (int)$result['timestamp'][$index];
                        $quotes[$symbol] = [
                            'date' => (new DateTimeImmutable('@' . $time))->setTimezone($zone)->format('Y-m-d'),
                            'price' => (float)$closes[$index],
                            'time' => $time,
                        ];
                        break;
                    }
                }
            } catch (Throwable $error) {
                $failures[$symbol] = $error->getMessage();
            }
        }
        return [$quotes, $failures];
    }

    /** @return array{dates: string[], close: float[]} */
    private static function parseDaily(array $response, string $from, string $until): array
    {
        $result = self::chartResult($response);
        $zone = new DateTimeZone($result['meta']['exchangeTimezoneName'] ?? 'UTC');
        $closes = $result['indicators']['quote'][0]['close'] ?? [];
        $byDate = [];
        foreach ($result['timestamp'] ?? [] as $index => $timestamp) {
            $close = $closes[$index] ?? null;
            if ($close === null) {
                continue;
            }
            $date = (new DateTimeImmutable('@' . (int)$timestamp))->setTimezone($zone)->format('Y-m-d');
            if ($date >= $from && $date <= $until) {
                $byDate[$date] = (float)$close;
            }
        }
        ksort($byDate);
        return ['dates' => array_map('strval', array_keys($byDate)), 'close' => array_values($byDate)];
    }

    /** Tidsfönster [period1, period2] om högst 7 dagar som tillsammans täcker de senaste 30 dagarna. */
    public static function minuteWindows(int $now): array
    {
        $windows = [];
        // Marginal så att första fönstret säkert ligger inom Yahoos 30 dagar.
        for ($from = $now - self::MINUTE_DAYS * 86400 + 3600; $from < $now; $from += self::MINUTE_WINDOW_SECONDS) {
            $windows[] = [$from, min($from + self::MINUTE_WINDOW_SECONDS, $now)];
        }
        return $windows;
    }

    /**
     * Slå ihop chart-resultat per tidsfönster till en tidsserie i svensk tid.
     * Dubbletter i fönstrens kanter och minuter utan kurs försvinner.
     * @return array{times: string[], close: float[]}
     */
    public static function mergeMinutes(array $results): array
    {
        $byTime = [];
        foreach ($results as $result) {
            $closes = $result['indicators']['quote'][0]['close'] ?? [];
            foreach ($result['timestamp'] ?? [] as $index => $timestamp) {
                if (($closes[$index] ?? null) !== null) {
                    $byTime[(int)$timestamp] = (float)$closes[$index];
                }
            }
        }
        ksort($byTime);
        $zone = new DateTimeZone('Europe/Stockholm');
        $times = [];
        foreach (array_keys($byTime) as $timestamp) {
            $times[] = (new DateTimeImmutable('@' . $timestamp))->setTimezone($zone)->format('Y-m-d H:i');
        }
        return ['times' => $times, 'close' => array_values($byTime)];
    }

    /**
     * 1-minuterskurser för de senaste 30 dagarna, med kort filcache.
     * @return array{currency: string, times: string[], close: float[], warnings: string[]}
     */
    public static function fetchMinutes(string $symbol): array
    {
        $file = data_path('cache/minutes-' . preg_replace('/[^A-Za-z0-9._-]/', '_', $symbol) . '.json');
        $now = time();
        $cached = Storage::withLock($file, false, static fn() => Storage::readJson($file));
        if ($cached && $now - (int)($cached['fetched_at'] ?? 0) < self::MINUTE_CACHE_SECONDS) {
            unset($cached['fetched_at']);
            return $cached;
        }
        $requests = [];
        foreach (self::minuteWindows($now) as $index => [$from, $to]) {
            $requests[$index] = self::CHART_URL . rawurlencode($symbol) . '?' . http_build_query([
                'period1' => $from, 'period2' => $to, 'interval' => '1m',
            ]);
        }
        $results = [];
        $failures = [];
        foreach (self::fetchAll($requests) as $index => $response) {
            try {
                $results[] = self::chartResult($response);
            } catch (Throwable $error) {
                $failures[$index] = $error->getMessage();
            }
        }
        if (!$results) {
            throw new RuntimeException((string)reset($failures));
        }
        $minutes = self::mergeMinutes($results);
        if (!$minutes['times']) {
            throw new RuntimeException('Yahoo Finance returnerade inga minutkurser.');
        }
        $data = ['currency' => (string)($results[0]['meta']['currency'] ?? '')] + $minutes + ['warnings' => []];
        if ($failures) {
            $data['warnings'][] = count($failures) . ' av ' . count($requests) . ' tidsperioder kunde inte hämtas ('
                . reset($failures) . '), så delar av månaden kan saknas.';
        } else {
            Storage::withLock($file, true, static fn() => Storage::writeAtomic(
                $file,
                json_encode($data + ['fetched_at' => $now], JSON_PRESERVE_ZERO_FRACTION | JSON_UNESCAPED_UNICODE)
            ));
        }
        return $data;
    }

    /** Senaste kurs till SEK för minutdiagrammets valuta; null för SEK och okända valutor. */
    public static function latestSekRate(string $currency): ?float
    {
        $currency = strtoupper($currency);
        if (!isset(FX_TICKERS[$currency])) {
            return null;
        }
        return (new Fx([$currency]))->latest($currency);
    }

    private static function chartResult(array $response): array
    {
        if ($response['error'] !== '') {
            throw new RuntimeException('Yahoo Finance kunde inte nås: ' . $response['error']);
        }
        $decoded = json_decode($response['body'], true);
        $result = $decoded['chart']['result'][0] ?? null;
        if (!is_array($result)) {
            $message = $decoded['chart']['error']['description'] ?? ('HTTP ' . $response['status']);
            throw new RuntimeException('Yahoo Finance svarade inte med kursdata (' . $message . ')');
        }
        return $result;
    }

    /**
     * Hämta flera adresser parallellt med curl_multi.
     * @param array<string, string> $urls
     * @return array<string, array{status: int, body: string, error: string}>
     */
    private static function fetchAll(array $urls): array
    {
        $responses = [];
        $multi = curl_multi_init();
        $queue = $urls;
        $active = [];
        $limit = max(1, (int)app_config()['yahoo_concurrency']);
        do {
            while ($queue && count($active) < $limit) {
                $key = array_key_first($queue);
                $handle = curl_init($queue[$key]);
                curl_setopt_array($handle, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_CONNECTTIMEOUT => 10,
                    CURLOPT_TIMEOUT => 25,
                    CURLOPT_USERAGENT => self::USER_AGENT,
                    CURLOPT_ENCODING => '',
                ]);
                curl_multi_add_handle($multi, $handle);
                $active[(int)$handle] = [$key, $handle];
                unset($queue[$key]);
            }
            curl_multi_exec($multi, $running);
            if ($running) {
                curl_multi_select($multi, 1.0);
            }
            while ($info = curl_multi_info_read($multi)) {
                $handle = $info['handle'];
                [$key] = $active[(int)$handle];
                $responses[$key] = [
                    'status' => (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE),
                    'body' => (string)curl_multi_getcontent($handle),
                    'error' => $info['result'] === CURLE_OK ? '' : curl_error($handle),
                ];
                curl_multi_remove_handle($multi, $handle);
                unset($active[(int)$handle]);
            }
        } while ($queue || $active);
        curl_multi_close($multi);
        return $responses;
    }
}

/** Valutakurser till SEK, som fx_rate_for_currency i Python-versionen. */
final class Fx
{
    /** @var array<string, array{dates: string[], close: float[]}> */
    private array $rates;

    public function __construct(array $currencies)
    {
        $this->rates = [];
        foreach ($currencies as $currency) {
            $history = Market::history(FX_TICKERS[$currency]);
            if ($history) {
                $this->rates[$currency] = $history;
            }
        }
    }

    public function has(string $currency): bool
    {
        return isset($this->rates[strtoupper($currency)]);
    }

    /** Kurs på eller närmast före datumet; null om den saknas. */
    public function rate(string $currency, string $date): ?float
    {
        $currency = strtoupper($currency);
        if ($currency === 'SEK') {
            return 1.0;
        }
        $rates = $this->rates[$currency] ?? null;
        if (!$rates) {
            return null;
        }
        $index = self::lastIndexOnOrBefore($rates['dates'], substr($date, 0, 10));
        return $index === null ? null : $rates['close'][$index];
    }

    public function latest(string $currency): ?float
    {
        $rates = $this->rates[strtoupper($currency)] ?? null;
        return $rates && $rates['close'] ? (float)end($rates['close']) : null;
    }

    public function forTicker(string $ticker, string $date): ?float
    {
        return $this->rate(Stocks::fxCurrency($ticker), $date);
    }

    /** Binärsökning i sorterade ISO-datum. */
    public static function lastIndexOnOrBefore(array $dates, string $date): ?int
    {
        $low = 0;
        $high = count($dates) - 1;
        $found = null;
        while ($low <= $high) {
            $middle = intdiv($low + $high, 2);
            if ($dates[$middle] <= $date) {
                $found = $middle;
                $low = $middle + 1;
            } else {
                $high = $middle - 1;
            }
        }
        return $found;
    }
}

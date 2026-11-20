<?php
declare(strict_types=1);

/** Arkiv med minutkurser per aktie: semikolonseparerad CSV som bara fylls på med nyare minuter. */
final class IntradayArchive
{
    private const HEADER = ['time', 'close', 'currency'];
    private const TIME_PATTERN = '/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2});/';

    public static function path(string $symbol): string
    {
        return data_path('intraday/' . preg_replace('/[^A-Za-z0-9._-]/', '_', $symbol) . '.csv');
    }

    /** Kurs med decimalkomma och högst fyra decimaler, utan avslutande nollor. */
    public static function formatPrice(float $price): string
    {
        return rtrim(rtrim(number_format(round($price, 4), 4, ',', ''), '0'), ',');
    }

    /**
     * CSV-rader för minuter efter $lastTime och före den pågående minuten $currentMinute.
     * @return array{0: string, 1: int, 2: ?string} [text, antal, sista tid]
     */
    public static function newLines(array $times, array $close, string $currency, ?string $lastTime, string $currentMinute): array
    {
        $text = '';
        $count = 0;
        $last = null;
        foreach ($times as $index => $time) {
            if (($lastTime !== null && $time <= $lastTime) || $time >= $currentMinute) {
                continue;
            }
            $text .= Csv::line([$time, self::formatPrice((float)$close[$index]), $currency], ';');
            $count++;
            $last = $time;
        }
        return [$text, $count, $last];
    }

    /**
     * Lägg till nya minuter i aktiens arkiv och returnera en sammanfattning.
     * @return array{rows: int, first: ?string, last: ?string, added: int}
     */
    public static function append(string $symbol, array $minutes, ?string $currentMinute = null): array
    {
        $currentMinute ??= date('Y-m-d H:i');
        $file = self::path($symbol);
        return Storage::withLock($file, true, static function () use ($file, $minutes, $currentMinute) {
            $handle = @fopen($file, 'c+');
            if ($handle === false) {
                throw new RuntimeException('Arkivet ' . basename($file) . ' kunde inte öppnas.');
            }
            try {
                @chmod($file, 0600);
                $lastTime = self::prepareTail($handle);
                [$text, $added] = self::newLines(
                    $minutes['times'], $minutes['close'], (string)$minutes['currency'], $lastTime, $currentMinute
                );
                fseek($handle, 0, SEEK_END);
                if ($text !== '' && @fwrite($handle, $text) !== strlen($text)) {
                    throw new RuntimeException('Arkivet ' . basename($file) . ' kunde inte sparas.');
                }
                fflush($handle);
                return self::summary($handle) + ['added' => $added];
            } finally {
                fclose($handle);
            }
        });
    }

    /** Antal minuter samt första och sista tid i arkivet, eller null om det saknas. */
    public static function info(string $symbol): ?array
    {
        $file = self::path($symbol);
        if (!is_file($file)) {
            return null;
        }
        return Storage::withLock($file, false, static function () use ($file) {
            $handle = @fopen($file, 'r');
            if ($handle === false) {
                return null;
            }
            try {
                return self::summary($handle);
            } finally {
                fclose($handle);
            }
        });
    }

    /**
     * Skriv rubrikraden i en ny fil, eller ta bort en halvskriven sista rad,
     * och returnera tiden på den sista hela raden.
     */
    private static function prepareTail($handle): ?string
    {
        $size = fstat($handle)['size'];
        if ($size === 0) {
            fwrite($handle, Csv::line(self::HEADER, ';'));
            return null;
        }
        $chunkSize = min($size, 65536);
        fseek($handle, $size - $chunkSize);
        $chunk = (string)fread($handle, $chunkSize);
        $end = strrpos($chunk, "\n");
        if ($end === false) {
            // Inte ens rubrikraden är hel; börja om filen.
            ftruncate($handle, 0);
            fseek($handle, 0);
            fwrite($handle, Csv::line(self::HEADER, ';'));
            return null;
        }
        if ($end !== $chunkSize - 1) {
            ftruncate($handle, $size - $chunkSize + $end + 1);
        }
        $lines = preg_split('/\r?\n/', substr($chunk, 0, $end));
        for ($index = count($lines) - 1; $index >= 0; $index--) {
            if (preg_match(self::TIME_PATTERN, $lines[$index], $match)) {
                return $match[1];
            }
        }
        return null;
    }

    private static function summary($handle): array
    {
        rewind($handle);
        $rows = 0;
        $first = null;
        $last = null;
        while (($line = fgets($handle)) !== false) {
            if (preg_match(self::TIME_PATTERN, $line, $match)) {
                $rows++;
                $first ??= $match[1];
                $last = $match[1];
            }
        }
        return ['rows' => $rows, 'first' => $first, 'last' => $last];
    }
}

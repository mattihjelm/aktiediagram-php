<?php
declare(strict_types=1);

/** Aktielistan i aktier.csv och valutaregler per ticker. */
final class Stocks
{
    public static function file(): string
    {
        return data_path('aktier.csv');
    }

    /** @return array<int, array{ticker: string, name: string, show_initially: bool}> */
    public static function load(): array
    {
        $file = self::file();
        // Den lokala listan skapas från exempelfilen vid första start.
        if (!is_file($file)) {
            Storage::withLock($file, true, static function () use ($file) {
                if (!is_file($file)) {
                    Storage::writeAtomic($file, (string)file_get_contents(APP_PRIVATE_DIR . '/aktier.example.csv'));
                }
            });
        }
        return Storage::withLock($file, false, static function () use ($file) {
            [, $rows] = Csv::readText((string)file_get_contents($file), ',');
            return self::validate($rows);
        });
    }

    /** @return array<int, array{ticker: string, name: string, show_initially: bool}> */
    public static function validate(array $rows): array
    {
        $stocks = [];
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $ticker = trim((string)($row['ticker'] ?? ''));
            $name = trim((string)($row['name'] ?? ''));
            $show = strtolower(trim((string)($row['show_initially'] ?? '')));
            // Tomma rader är platshållare i mallen och ignoreras.
            if ($ticker === '') {
                continue;
            }
            if ($name === '') {
                $name = $ticker;
            }
            if (!in_array($show, ['true', 'false', 'ja', 'nej', '1', '0'], true)) {
                throw new UnexpectedValueException("Ogiltigt show_initially-värde på rad {$rowNumber} i aktier.csv. Använd true eller false.");
            }
            $stocks[] = ['ticker' => $ticker, 'name' => $name, 'show_initially' => in_array($show, ['true', 'ja', '1'], true)];
        }
        if (count($stocks) > MAX_STOCKS) {
            throw new UnexpectedValueException('Högst ' . MAX_STOCKS . ' aktier kan anges i aktier.csv.');
        }
        if (!$stocks) {
            throw new UnexpectedValueException('Ingen ticker angiven i aktier.csv.');
        }
        $tickers = array_column($stocks, 'ticker');
        if (count(array_unique($tickers)) !== count($tickers)) {
            throw new UnexpectedValueException('En ticker förekommer flera gånger i aktier.csv.');
        }
        $names = array_column($stocks, 'name');
        if (count(array_unique($names)) !== count($names)) {
            throw new UnexpectedValueException('Ett visningsnamn förekommer flera gånger i aktier.csv.');
        }
        return $stocks;
    }

    /** Aktien med given ticker; ogiltig förfrågan om den inte finns i aktier.csv. */
    public static function find(string $ticker): array
    {
        foreach (self::load() as $stock) {
            if ($stock['ticker'] === $ticker) {
                return $stock;
            }
        }
        throw new InvalidArgumentException('Aktien finns inte i appens lista.');
    }

    public static function saveVisibility(string $ticker, bool $visible): void
    {
        $file = self::file();
        Storage::withLock($file, true, static function () use ($file, $ticker, $visible) {
            [, $rows] = Csv::readText((string)file_get_contents($file), ',');
            $stocks = self::validate($rows);
            $found = false;
            $out = [];
            foreach ($stocks as $stock) {
                if ($stock['ticker'] === $ticker) {
                    $stock['show_initially'] = $visible;
                    $found = true;
                }
                $out[] = ['ticker' => $stock['ticker'], 'name' => $stock['name'], 'show_initially' => $stock['show_initially'] ? 'true' : 'false'];
            }
            if (!$found) {
                throw new OutOfBoundsException('Aktien finns inte i appens lista.');
            }
            Storage::writeAtomic($file, Csv::write(['ticker', 'name', 'show_initially'], $out, ','));
        });
    }

    /** Valutakod för aktiens belopp enligt ticker_currency; .ST-aktier utan rad är i SEK, övriga okända ''. */
    public static function currencyCode(string $ticker): string
    {
        return (string)(import_mapping()['ticker_currency'][$ticker] ?? (str_ends_with($ticker, '.ST') ? 'SEK' : ''));
    }

    /** Valuta som den visas i appen: kronor som kr. */
    public static function currency(string $ticker): string
    {
        $code = self::currencyCode($ticker);
        return $code === 'SEK' ? 'kr' : $code;
    }

    public static function fxCurrency(string $ticker): string
    {
        return self::currencyCode($ticker) ?: 'SEK';
    }
}

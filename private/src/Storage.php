<?php
declare(strict_types=1);

/** Fillåsning och atomiska skrivningar för datafilerna. */
final class Storage
{
    /**
     * Kör $callback med ett lås för datafilen. Skrivningar tar exklusivt lås,
     * läsningar delat, så att en läsare aldrig ser en halvfärdig ersättning.
     */
    public static function withLock(string $path, bool $exclusive, callable $callback)
    {
        $directory = dirname($path);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Datakatalogen kunde inte skapas.');
        }
        $handle = fopen($path . '.lock', 'c');
        if ($handle === false) {
            throw new RuntimeException('Låsfilen för ' . basename($path) . ' kunde inte öppnas.');
        }
        try {
            if (!flock($handle, $exclusive ? LOCK_EX : LOCK_SH)) {
                throw new RuntimeException(basename($path) . ' kunde inte låsas.');
            }
            return $callback();
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    /** Ersätt filen via en temporärfil i samma katalog så att den aldrig blir halvskriven. */
    public static function writeAtomic(string $path, string $contents): void
    {
        $temporary = tempnam(dirname($path), '.' . basename($path) . '.');
        if ($temporary === false) {
            throw new RuntimeException(basename($path) . ' kunde inte sparas.');
        }
        try {
            if (file_put_contents($temporary, $contents) !== strlen($contents)) {
                throw new RuntimeException(basename($path) . ' kunde inte sparas.');
            }
            @chmod($temporary, 0600);
            if (!rename($temporary, $path)) {
                throw new RuntimeException(basename($path) . ' kunde inte ersättas.');
            }
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
    }

    public static function readJson(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $decoded = json_decode((string)file_get_contents($path), true);
        return is_array($decoded) ? $decoded : null;
    }
}

/** CSV i samma format som Pythons csv-modul (QUOTE_MINIMAL, CRLF) så filerna förblir utbytbara. */
final class Csv
{
    /**
     * Läs som csv.DictReader med utf-8-sig.
     * @return array{0: string[], 1: array<int, array<string, ?string>>}
     */
    public static function readText(string $text, string $delimiter): array
    {
        if (strncmp($text, "\xEF\xBB\xBF", 3) === 0) {
            $text = substr($text, 3);
        }
        $records = self::parse($text, $delimiter);
        $headers = array_shift($records) ?? [];
        $rows = [];
        foreach ($records as $record) {
            $row = [];
            foreach ($headers as $index => $header) {
                $row[$header] = $record[$index] ?? null;
            }
            $rows[] = $row;
        }
        return [$headers, $rows];
    }

    /**
     * Läs alla poster som csv.reader; tomma rader tas bort men räknas inte separat.
     * @return array<int, string[]>
     */
    public static function parse(string $text, string $delimiter): array
    {
        $stream = fopen('php://memory', 'w+b');
        fwrite($stream, $text);
        rewind($stream);
        $records = [];
        while (($record = fgetcsv($stream, 0, $delimiter, '"', '')) !== false) {
            if ($record === [null]) {
                continue;
            }
            $records[] = array_map(static fn($cell) => (string)$cell, $record);
        }
        fclose($stream);
        return $records;
    }

    /** @param array<int, ?string> $values */
    public static function line(array $values, string $delimiter): string
    {
        $cells = [];
        foreach ($values as $value) {
            $value = (string)$value;
            if (strpbrk($value, $delimiter . "\"\r\n") !== false) {
                $value = '"' . str_replace('"', '""', $value) . '"';
            }
            $cells[] = $value;
        }
        return implode($delimiter, $cells) . "\r\n";
    }

    /** @param array<int, array<string, ?string>> $rows */
    public static function write(array $headers, array $rows, string $delimiter): string
    {
        $text = self::line($headers, $delimiter);
        foreach ($rows as $row) {
            $text .= self::line(array_map(static fn($header) => $row[$header] ?? '', $headers), $delimiter);
        }
        return $text;
    }
}

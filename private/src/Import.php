<?php
declare(strict_types=1);

/** Import av mäklarens transaktionsexport (UTF-16, tabbseparerad), port av konvertera_aktiekop.py. */
final class Import
{
    private const MIN_COLUMNS = 28;

    /** Avkoda exporten; den ska vara UTF-16 med eller utan BOM (som Pythons "utf-16"). */
    public static function decode(string $bytes): string
    {
        $encoding = 'UTF-16LE';
        if (strncmp($bytes, "\xFF\xFE", 2) === 0) {
            $bytes = substr($bytes, 2);
        } elseif (strncmp($bytes, "\xFE\xFF", 2) === 0) {
            $bytes = substr($bytes, 2);
            $encoding = 'UTF-16BE';
        }
        if ($bytes === '' || strlen($bytes) % 2 !== 0 || !mb_check_encoding($bytes, $encoding)) {
            throw new InvalidArgumentException('Filen är inte mäklarens UTF-16-kodade transaktionsexport.');
        }
        $text = mb_convert_encoding($bytes, 'UTF-8', $encoding);
        if (strpos($text, "\t") === false) {
            throw new InvalidArgumentException('Filen är inte mäklarens tabbseparerade transaktionsexport.');
        }
        return $text;
    }

    /**
     * Omvandla exportens rader till appens format; alla rader får kontot $account.
     * @return array{rows: array, warnings: string[], unmapped_rows: array, source_headers: string[]}
     */
    public static function convert(string $text, array $mapping, string $account = DEFAULT_ACCOUNT): array
    {
        $records = self::records($text);
        $headers = $records ? array_shift($records)[1] : [];
        if (count($headers) < self::MIN_COLUMNS) {
            throw new InvalidArgumentException('Filen har inte transaktionsexportens kolumner.');
        }
        $converted = [];
        $warnings = [];
        $unmapped = [];
        $skip = static function (int $rowNumber, string $reason, array $row) use (&$warnings, &$unmapped) {
            $warnings[] = "Rad {$rowNumber}: {$reason}";
            $unmapped[] = ['row_number' => $rowNumber, 'reason' => $reason, 'cells' => $row];
        };
        foreach ($records as [$rowNumber, $row]) {
            if (!$row || !array_filter($row, static fn($cell) => trim($cell) !== '')) {
                continue;
            }
            if (count($row) < self::MIN_COLUMNS) {
                $skip($rowNumber, 'för få kolumner; hoppas över.', $row);
                continue;
            }
            $security = trim($row[6]);
            $ticker = $mapping['security_to_ticker'][$security] ?? null;
            if (!$ticker) {
                $skip($rowNumber, 'okänt värdepapper ' . self::pyRepr($security) . '; hoppas över.', $row);
                continue;
            }
            $sourceType = mb_strtoupper(trim($row[5]), 'UTF-8');
            $isDividend = str_contains($sourceType, 'UTDELNING') || str_contains($sourceType, 'KÄLLSKATT');
            $type = $isDividend ? 'UTDELNING' : (['KÖPT' => 'KÖP', 'SÅLT' => 'SÄLJ'][$sourceType] ?? null);
            if (!$type) {
                $skip($rowNumber, 'okänd transaktionstyp ' . self::pyRepr($row[5]) . '; hoppas över.', $row);
                continue;
            }
            try {
                // Affärsdag, annars bokföringsdag.
                $tradeDate = trim($row[2]) ?: trim($row[1]);
                $targetCurrency = $mapping['ticker_currency'][$ticker] ?? (str_ends_with($ticker, '.ST') ? 'SEK' : '');
                $rate = Dec::of($row[21] ?: '0');
                $amountCurrency = '';
                if ($isDividend) {
                    // Behåll kontantbeloppets valuta; den kan skilja sig från aktiens handelsvaluta.
                    $amount = Dec::of($row[13]);
                    $amountCurrency = strtoupper(trim($row[14] ?: $row[12])) ?: $targetCurrency;
                    if (str_contains($sourceType, 'KÄLLSKATT') && Dec::isPositive($amount)) {
                        $amount = Dec::negate($amount);
                    }
                    $price = Dec::of(Dec::quantize2($amount));
                    $quantity = Dec::of('1');
                    $commission = Dec::quantize2(Dec::of('0'));
                } else {
                    $quantity = Dec::of($row[8]);
                    $price = Dec::of($row[9]);
                    $fee = Dec::of($row[26] ?: '0');
                    $feeCurrency = strtoupper(trim($row[27]));
                    if ($ticker === 'BRK-B') {
                        // Mäklarkursen står i utländsk valuta; lagra kostnaden i SEK i appen.
                        $price = Dec::mul($price, $rate);
                    }
                    if ($feeCurrency !== '' && $targetCurrency !== '' && $feeCurrency !== $targetCurrency) {
                        if (!Dec::isPositive($rate)) {
                            throw new InvalidArgumentException('växlingskurs saknas för courtagekonvertering');
                        }
                        $commission = Dec::divQuantize2($fee, $rate);
                    } else {
                        $commission = Dec::quantize2($fee);
                    }
                }
                $entry = [
                    'date' => $tradeDate,
                    'transaction_type' => $type,
                    'ticker' => $ticker,
                    'quantity' => Dec::normalized($quantity),
                    'price' => Dec::normalized($price),
                    'commission' => $commission,
                    'source_id' => trim($row[0]),
                    'amount_currency' => $amountCurrency,
                    'account' => $account,
                ];
                self::signature($entry);
                $converted[] = $entry;
            } catch (InvalidArgumentException $error) {
                $skip($rowNumber, "ogiltiga värden ({$error->getMessage()}); hoppas över.", $row);
            }
        }
        return ['rows' => $converted, 'warnings' => $warnings, 'unmapped_rows' => $unmapped, 'source_headers' => $headers];
    }

    /**
     * Välj nya rader: transaktions-ID för exportrader, transaktionsdetaljer för äldre rader utan ID.
     * Båda jämförs bara inom samma konto, så samma export kan importeras på ett annat konto.
     * @return array{new_rows: array, duplicates: int}
     */
    public static function selectNew(array $sourceRows, array $existingRows): array
    {
        $knownIds = [];
        $legacy = [];
        foreach ($existingRows as $row) {
            $row = self::normalizedExisting($row);
            if ($row['source_id'] !== '') {
                $knownIds[self::idKey($row)] = true;
            } else {
                $key = self::signature($row);
                $legacy[$key] = ($legacy[$key] ?? 0) + 1;
            }
        }
        $seenWithoutId = [];
        $new = [];
        $duplicates = 0;
        foreach ($sourceRows as $row) {
            $key = self::signature($row);
            $sourceId = (string)($row['source_id'] ?? '');
            $idKey = self::idKey($row);
            if ($sourceId !== '' && isset($knownIds[$idKey])) {
                $duplicates++;
                continue;
            }
            // Äldre importer och manuellt inmatade rader saknar ID. Matcha dem en gång
            // på transaktionsdetaljerna och använd sedan ID:t för kommande importer.
            if (($legacy[$key] ?? 0) > 0) {
                $legacy[$key]--;
                if ($sourceId !== '') {
                    $knownIds[$idKey] = true;
                }
                $duplicates++;
                continue;
            }
            if ($sourceId === '' && isset($seenWithoutId[$key])) {
                $duplicates++;
                continue;
            }
            if ($sourceId !== '') {
                $knownIds[$idKey] = true;
            } else {
                $seenWithoutId[$key] = true;
            }
            $new[] = $row;
        }
        return ['new_rows' => $new, 'duplicates' => $duplicates];
    }

    private static function normalizedExisting(array $row): array
    {
        $row['transaction_type'] = mb_strtoupper((string)(($row['transaction_type'] ?? '') ?: 'KÖP'), 'UTF-8');
        $row['commission'] = ($row['commission'] ?? '') ?: '0';
        $row['source_id'] = ($row['source_id'] ?? '') ?: '';
        $row['amount_currency'] = ($row['amount_currency'] ?? '') ?: '';
        return $row;
    }

    /** Transaktions-ID inom sitt konto. */
    private static function idKey(array $row): string
    {
        return self::accountOf($row) . '|' . (string)($row['source_id'] ?? '');
    }

    private static function accountOf(array $row): string
    {
        return strtoupper(trim((string)($row['account'] ?? ''))) ?: DEFAULT_ACCOUNT;
    }

    public static function signature(array $row): string
    {
        return json_encode([
            (string)$row['date'],
            mb_strtoupper((string)(($row['transaction_type'] ?? '') ?: 'KÖP'), 'UTF-8'),
            (string)$row['ticker'],
            Dec::normalized(Dec::of((string)$row['quantity'])),
            Dec::normalized(Dec::of((string)$row['price'])),
            Dec::normalized(Dec::of((string)(($row['commission'] ?? '') ?: '0'))),
            strtoupper((string)($row['amount_currency'] ?? '')),
            self::accountOf($row),
        ], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Poster med radnummer som Pythons enumerate(reader, start=1); tomma rader räknas.
     * @return array<int, array{0: int, 1: string[]}>
     */
    private static function records(string $text): array
    {
        $stream = fopen('php://memory', 'w+b');
        fwrite($stream, $text);
        rewind($stream);
        $records = [];
        $number = 0;
        while (($record = fgetcsv($stream, 0, "\t", '"', '')) !== false) {
            $number++;
            $records[] = [$number, $record === [null] ? [] : array_map(static fn($cell) => (string)$cell, $record)];
        }
        fclose($stream);
        return $records;
    }

    /** Pythons repr() för en sträng, för samma felmeddelanden som tidigare. */
    private static function pyRepr(string $value): string
    {
        $quote = str_contains($value, "'") && !str_contains($value, '"') ? '"' : "'";
        return $quote . str_replace(['\\', $quote], ['\\\\', '\\' . $quote], $value) . $quote;
    }
}

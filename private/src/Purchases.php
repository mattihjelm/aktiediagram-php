<?php
declare(strict_types=1);

/** Raden som skulle tas bort har ändrats eller tagits bort sedan nyckeln skapades. */
final class StaleTransaction extends RuntimeException
{
}

/** Transaktioner i aktiekop.csv (semikolonseparerad, samma format som Python-versionen). */
final class Purchases
{
    public static function file(): string
    {
        return data_path('aktiekop.csv');
    }

    /** @return array<int, array<string, ?string>> */
    public static function load(): array
    {
        $file = self::file();
        return Storage::withLock($file, false, static fn() => self::rowsFromText(is_file($file) ? (string)file_get_contents($file) : ''));
    }

    /** @return array<int, array<string, ?string>> */
    public static function rowsFromText(string $text): array
    {
        if ($text === '') {
            return [];
        }
        [, $rows] = Csv::readText($text, ';');
        $out = [];
        foreach ($rows as $row) {
            if (($row['ticker'] ?? '') === '' || $row['ticker'] === null) {
                continue;
            }
            // Som Pythons setdefault: fyll i kolumner som saknas, men behåll tomma värden.
            foreach (['transaction_type' => 'KÖP', 'commission' => '0', 'source_id' => '', 'amount_currency' => '', 'time' => ''] as $key => $default) {
                $row[$key] = $row[$key] ?? $default;
            }
            // Rader utan konto hör till standardkontot; skrivs ut med kontot nästa gång filen sparas.
            $account = strtoupper(trim((string)($row['account'] ?? '')));
            $row['account'] = $account === '' ? DEFAULT_ACCOUNT : $account;
            $out[] = $row;
        }
        return $out;
    }

    /**
     * Lägg till rader under exklusivt lås. $select får befintliga rader och returnerar
     * raderna som ska läggas till, så att dubblettkontroll och skrivning sker atomiskt.
     * @return array<int, array<string, string>>
     */
    public static function append(callable $select): array
    {
        $file = self::file();
        return Storage::withLock($file, true, static function () use ($file, $select) {
            $text = is_file($file) ? (string)file_get_contents($file) : '';
            $text = self::withCurrentHeader($text);
            $rows = $select(self::rowsFromText($text));
            if (!$rows) {
                return [];
            }
            if ($text === '') {
                $text = Csv::line(PURCHASE_FIELDS, ';');
            } elseif (!str_ends_with($text, "\n")) {
                $text .= "\r\n";
            }
            // Nya rader hamnar sist; deras nycklar räknas från antalet befintliga rader under samma lås.
            $index = count(self::rowsFromText($text));
            foreach ($rows as $position => $row) {
                // Skriv alltid kontot, så att raden läses tillbaka med samma innehåll som nyckeln bygger på.
                $row['account'] = strtoupper(trim((string)($row['account'] ?? ''))) ?: DEFAULT_ACCOUNT;
                $rows[$position]['account'] = $row['account'];
                $text .= Csv::line(array_map(static fn($field) => $row[$field] ?? '', PURCHASE_FIELDS), ';');
                $rows[$position]['row_key'] = self::rowKey($index++, $row);
            }
            Storage::writeAtomic($file, $text);
            return $rows;
        });
    }

    /**
     * Nyckel för en rad: dess plats bland raderna i aktiekop.csv och ett fingeravtryck av innehållet,
     * så att en borttagning gäller exakt den rad som visades och avvisas om filen har ändrats.
     */
    public static function rowKey(int $index, array $row): string
    {
        $fields = array_map(static fn($field) => (string)($row[$field] ?? ''), PURCHASE_FIELDS);
        return $index . ':' . substr(sha1(implode(';', $fields)), 0, 12);
    }

    /**
     * Ta bort raden med nyckeln under exklusivt lås. Raden på platsen måste ha samma innehåll som när
     * nyckeln skapades; annars tas ingenting bort.
     * @return array<string, ?string> den borttagna raden
     */
    public static function remove(string $key): array
    {
        if (!preg_match('/^(\d+):([0-9a-f]{12})$/', $key, $match)) {
            throw new InvalidArgumentException('Ogiltig transaktionsnyckel.');
        }
        $file = self::file();
        return Storage::withLock($file, true, static function () use ($file, $key, $match) {
            $text = self::withCurrentHeader(is_file($file) ? (string)file_get_contents($file) : '');
            $rows = self::rowsFromText($text);
            $index = (int)$match[1];
            if (!isset($rows[$index]) || self::rowKey($index, $rows[$index]) !== $key) {
                throw new StaleTransaction('Transaktionen har ändrats eller tagits bort. Ladda om sidan.');
            }
            $removed = $rows[$index];
            array_splice($rows, $index, 1);
            Storage::writeAtomic($file, Csv::write(PURCHASE_FIELDS, $rows, ';'));
            return $removed;
        });
    }

    /** Uppgradera äldre filer som saknar någon av de nyare kolumnerna. */
    private static function withCurrentHeader(string $text): string
    {
        if ($text === '') {
            return '';
        }
        $header = Csv::parse(strtok(ltrim($text, "\xEF\xBB\xBF"), "\r\n") ?: '', ';')[0] ?? [];
        if (!array_diff(['commission', 'transaction_type', 'source_id', 'amount_currency', 'time', 'account'], $header)) {
            return $text;
        }
        $rows = array_map(static fn($row) => [
            'transaction_type' => $row['transaction_type'] ?: 'KÖP',
            'commission' => $row['commission'] ?: '0',
            'source_id' => $row['source_id'] ?: '',
            'amount_currency' => $row['amount_currency'] ?: '',
            'time' => $row['time'] ?? '',
        ] + $row, self::rowsFromText($text));
        return Csv::write(PURCHASE_FIELDS, $rows, ';');
    }

    /** Konto: en bokstav A–Z, sparad som versal. */
    public static function account(?string $value): string
    {
        $account = strtoupper(trim((string)$value));
        if (!preg_match('/^[A-Z]$/', $account)) {
            throw new InvalidArgumentException('Kontot ska vara en bokstav A–Z.');
        }
        return $account;
    }

    /** Klockslag i formatet HH:MM (00:00–23:59), eller null om värdet inte är ett giltigt klockslag. */
    public static function validTime(?string $value): ?string
    {
        $value = trim((string)$value);
        return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) ? $value : null;
    }

    /**
     * Validera en händelse från formuläret på samma sätt som Python-versionens /api/purchases.
     * @return array<string, string>
     */
    public static function entryFromForm(array $payload, array $stocks, callable $hasHistory): array
    {
        $ticker = trim((string)($payload['ticker'] ?? ''));
        $type = mb_strtoupper(trim((string)($payload['transaction_type'] ?? 'KÖP')), 'UTF-8');
        $date = (string)($payload['date'] ?? '');
        $parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (!$parsedDate || $parsedDate->format('Y-m-d') !== $date) {
            throw new InvalidArgumentException('Ange ett giltigt datum i formatet ÅÅÅÅ-MM-DD.');
        }
        // Antalet sparas som inmatat men utan mellanslag, så att det kan läsas tillbaka.
        $quantityText = Dec::withoutSpace((string)($payload['quantity'] ?? ''));
        $quantity = Dec::parse(Dec::clean($quantityText));
        $price = Dec::parse(Dec::clean((string)($payload['price'] ?? '')));
        $commissionText = Dec::clean((string)($payload['commission'] ?? '0'));
        $commission = Dec::parse($commissionText === '' ? '0' : $commissionText);
        if ($quantity === null || $price === null || $commission === null) {
            throw new InvalidArgumentException('Antal, kurs och courtage måste vara tal.');
        }
        if (!in_array($ticker, array_column($stocks, 'ticker'), true) || !$hasHistory($ticker)) {
            throw new InvalidArgumentException('Aktien saknar hämtad kursdata.');
        }
        if (!in_array($type, ['KÖP', 'SÄLJ', 'UTDELNING'], true)) {
            throw new InvalidArgumentException('Transaktionstyp måste vara köp, sälj eller utdelning.');
        }
        if (!Dec::isPositive($quantity)) {
            throw new InvalidArgumentException('Antalet måste vara större än noll.');
        }
        if (!Dec::isPositive($price)) {
            throw new InvalidArgumentException('Kursen eller utdelningsbeloppet måste vara större än noll.');
        }
        if (Dec::isNegative($commission)) {
            throw new InvalidArgumentException('Courtage eller källskatt måste vara noll eller större.');
        }
        $account = self::account((string)($payload['account'] ?? ''));
        // Klockslag är valfritt och gäller bara köp och sälj.
        $timeText = trim((string)($payload['time'] ?? ''));
        $time = $type === 'UTDELNING' || $timeText === '' ? '' : self::validTime($timeText);
        if ($time === null) {
            throw new InvalidArgumentException('Ange tid i formatet TT:MM, till exempel 10:42.');
        }
        return [
            'date' => $date,
            'transaction_type' => $type,
            'ticker' => $ticker,
            'quantity' => $quantityText,
            // Spara användarens inmatning, inte kursen hämtad till diagrammet.
            'price' => Dec::quantize2($price),
            'commission' => Dec::quantize2($commission),
            'source_id' => '',
            'amount_currency' => '',
            'time' => $time,
            'account' => $account,
        ];
    }
}

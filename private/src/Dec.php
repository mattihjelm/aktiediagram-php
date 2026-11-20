<?php
declare(strict_types=1);

/**
 * Exakt decimalaritmetik på strängar, motsvarande Pythons Decimal i den gamla appen.
 * Behövs för att importens dubblettnycklar ska bli identiska med Python-versionens
 * och kräver varken bcmath eller gmp, som inte är garanterade på webbhotellet.
 * Ett värde är [negativ, siffror utan inledande nollor, antal decimaler].
 */
final class Dec
{
    private const PATTERN = '/^([+-]?)(\d+\.?\d*|\.\d+)(?:[eE]([+-]?\d+))?$/';

    /** Pythons "".join(text.split()).replace(",", "."). */
    public static function clean(string $text): string
    {
        return str_replace(',', '.', self::withoutSpace($text));
    }

    /** Ta bort allt som Pythons str.split() räknar som blanktecken. */
    public static function withoutSpace(string $text): string
    {
        return preg_replace('/[\s\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{1C}-\x{1F}\x{85}]+/u', '', $text) ?? $text;
    }

    /** @return array{0: bool, 1: string, 2: int}|null */
    public static function parse(string $text): ?array
    {
        if (!preg_match(self::PATTERN, $text, $match)) {
            return null;
        }
        $negative = $match[1] === '-';
        $parts = explode('.', $match[2], 2);
        $fraction = $parts[1] ?? '';
        $digits = ltrim($parts[0] . $fraction, '0');
        $scale = strlen($fraction) - (int)($match[3] ?? 0);
        return [$negative, $digits === '' ? '0' : $digits, $scale];
    }

    /** @return array{0: bool, 1: string, 2: int} */
    public static function of(string $text): array
    {
        $value = self::parse(self::clean($text));
        if ($value === null) {
            throw new InvalidArgumentException("ogiltigt tal: {$text}");
        }
        return $value;
    }

    public static function isZero(array $value): bool
    {
        return $value[1] === '0';
    }

    public static function isPositive(array $value): bool
    {
        return !$value[0] && $value[1] !== '0';
    }

    public static function isNegative(array $value): bool
    {
        return $value[0] && $value[1] !== '0';
    }

    public static function negate(array $value): array
    {
        return [!$value[0], $value[1], $value[2]];
    }

    public static function mul(array $a, array $b): array
    {
        return [$a[0] !== $b[0], self::intMul($a[1], $b[1]), $a[2] + $b[2]];
    }

    /** format(value.normalize(), "f") */
    public static function normalized(array $value): string
    {
        [$negative, $digits, $scale] = $value;
        if ($digits === '0') {
            return ($negative ? '-' : '') . '0';
        }
        while ($scale > 0 && substr($digits, -1) === '0') {
            $digits = substr($digits, 0, -1);
            $scale--;
        }
        return ($negative ? '-' : '') . self::place($digits, $scale);
    }

    /** format(value.quantize(Decimal("0.01"), ROUND_HALF_UP), ".2f") */
    public static function quantize2(array $value): string
    {
        [$negative, $digits, $scale] = $value;
        if ($scale <= 2) {
            $digits .= str_repeat('0', 2 - $scale);
        } else {
            $cut = $scale - 2;
            $kept = strlen($digits) > $cut ? substr($digits, 0, -$cut) : '0';
            $dropped = str_pad(strlen($digits) > $cut ? substr($digits, -$cut) : $digits, $cut, '0', STR_PAD_LEFT);
            $digits = $dropped[0] >= '5' ? self::intAdd($kept, '1') : $kept;
        }
        return self::signed($negative, $digits, 2);
    }

    /** format((a / b).quantize(Decimal("0.01"), ROUND_HALF_UP), ".2f") för b != 0. */
    public static function divQuantize2(array $a, array $b): string
    {
        if ($b[1] === '0') {
            throw new InvalidArgumentException('division med noll');
        }
        // a/b = A·10^-sa / (B·10^-sb); hundradelar = A·10^(sb+2) / (B·10^sa).
        $exponent = $b[2] + 2 - $a[2];
        $numerator = $a[1] . str_repeat('0', max(0, $exponent));
        $denominator = $b[1] . str_repeat('0', max(0, -$exponent));
        [$quotient, $remainder] = self::intDivMod($numerator, $denominator);
        if (self::intCmp(self::intMul($remainder, '2'), $denominator) >= 0) {
            $quotient = self::intAdd($quotient, '1');
        }
        return self::signed($a[0] !== $b[0], $quotient, 2);
    }

    private static function signed(bool $negative, string $digits, int $scale): string
    {
        // Decimal behåller tecknet även när resultatet avrundas till noll ("-0.00").
        $digits = ltrim($digits, '0');
        return ($negative ? '-' : '') . self::place($digits === '' ? '0' : $digits, $scale);
    }

    private static function place(string $digits, int $scale): string
    {
        if ($scale <= 0) {
            return $digits . str_repeat('0', -$scale);
        }
        $digits = str_pad($digits, $scale + 1, '0', STR_PAD_LEFT);
        return substr($digits, 0, -$scale) . '.' . substr($digits, -$scale);
    }

    private static function intCmp(string $a, string $b): int
    {
        $a = ltrim($a, '0') ?: '0';
        $b = ltrim($b, '0') ?: '0';
        return strlen($a) <=> strlen($b) ?: strcmp($a, $b) <=> 0;
    }

    private static function intAdd(string $a, string $b): string
    {
        $result = '';
        $carry = 0;
        for ($i = strlen($a) - 1, $j = strlen($b) - 1; $i >= 0 || $j >= 0 || $carry; $i--, $j--) {
            $sum = ($i >= 0 ? (int)$a[$i] : 0) + ($j >= 0 ? (int)$b[$j] : 0) + $carry;
            $result = ($sum % 10) . $result;
            $carry = intdiv($sum, 10);
        }
        return ltrim($result, '0') ?: '0';
    }

    private static function intSub(string $a, string $b): string
    {
        $result = '';
        $borrow = 0;
        for ($i = strlen($a) - 1, $j = strlen($b) - 1; $i >= 0; $i--, $j--) {
            $difference = (int)$a[$i] - ($j >= 0 ? (int)$b[$j] : 0) - $borrow;
            $borrow = $difference < 0 ? 1 : 0;
            $result = ($difference + 10 * $borrow) . $result;
        }
        return ltrim($result, '0') ?: '0';
    }

    private static function intMul(string $a, string $b): string
    {
        if ($a === '0' || $b === '0') {
            return '0';
        }
        $product = array_fill(0, strlen($a) + strlen($b), 0);
        for ($i = strlen($a) - 1; $i >= 0; $i--) {
            for ($j = strlen($b) - 1; $j >= 0; $j--) {
                $position = $i + $j + 1;
                $sum = (int)$a[$i] * (int)$b[$j] + $product[$position];
                $product[$position] = $sum % 10;
                $product[$position - 1] += intdiv($sum, 10);
            }
        }
        return ltrim(implode('', $product), '0') ?: '0';
    }

    /** @return array{0: string, 1: string} */
    private static function intDivMod(string $a, string $b): array
    {
        $quotient = '';
        $remainder = '0';
        for ($i = 0, $length = strlen($a); $i < $length; $i++) {
            $remainder = ltrim($remainder . $a[$i], '0') ?: '0';
            $digit = 0;
            while (self::intCmp($remainder, $b) >= 0) {
                $remainder = self::intSub($remainder, $b);
                $digit++;
            }
            $quotient .= $digit;
        }
        return [ltrim($quotient, '0') ?: '0', $remainder];
    }
}

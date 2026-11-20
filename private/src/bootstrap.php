<?php
declare(strict_types=1);

// Gemensam start för sidor, API och kommandoradsverktyg.

const APP_PRIVATE_DIR = __DIR__ . '/..';
const MAX_STOCKS = 100;
const START_DATE = '2010-01-01';
const INITIAL_VISIBLE_START = '2020-01-01';
const FX_TICKERS = ['USD' => 'USDSEK=X', 'EUR' => 'EURSEK=X'];
const PURCHASE_FIELDS = ['date', 'transaction_type', 'ticker', 'quantity', 'price', 'commission', 'source_id', 'amount_currency', 'time', 'account'];
// Konto för transaktioner som saknar konto (rader från före kontokolumnen).
const DEFAULT_ACCOUNT = 'T';

date_default_timezone_set('Europe/Stockholm');

require_once __DIR__ . '/Dec.php';
require_once __DIR__ . '/Storage.php';
require_once __DIR__ . '/Stocks.php';
require_once __DIR__ . '/Purchases.php';
require_once __DIR__ . '/Market.php';
require_once __DIR__ . '/IntradayArchive.php';
require_once __DIR__ . '/Chart.php';
require_once __DIR__ . '/Import.php';
require_once __DIR__ . '/Auth.php';

function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    // AKTIER_CONFIG används bara lokalt för tester; på webbhotellet läses private/config.php.
    $file = getenv('AKTIER_CONFIG') ?: APP_PRIVATE_DIR . '/config.php';
    if (!is_file($file)) {
        throw new RuntimeException('Konfigurationsfilen saknas. Kopiera private/config.example.php till private/config.php.');
    }
    $loaded = require $file;
    if (!is_array($loaded)) {
        throw new RuntimeException('Konfigurationsfilen måste returnera en array.');
    }
    $config = $loaded + [
        'password_hash' => '',
        'data_dir' => APP_PRIVATE_DIR . '/data',
        'session_dir' => APP_PRIVATE_DIR . '/sessions',
        'session_timeout' => 8 * 3600,
        'require_https' => true,
        'login_max_failures' => 10,
        'login_lockout_seconds' => 15 * 60,
        'login_delay_seconds' => 1,
        'max_import_bytes' => 20 * 1024 * 1024,
        'yahoo_concurrency' => 8,
    ];
    return $config;
}

/** Mäklarmappningen; ticker_currency anger också varje akties valuta i appen. */
function import_mapping(): array
{
    static $mapping = null;
    return $mapping ??= require APP_PRIVATE_DIR . '/import-mapping.php';
}

function data_path(string $name): string
{
    return rtrim(app_config()['data_dir'], '/') . '/' . $name;
}

function send_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header("Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store');
}

function send_json(int $status, array $value): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_INVALID_UTF8_SUBSTITUTE);
}

function request_json(): array
{
    $body = file_get_contents('php://input');
    if ($body === false || trim($body) === '') {
        return [];
    }
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        throw new InvalidArgumentException('Ogiltig JSON i förfrågan.');
    }
    return $decoded;
}

/** Kör ett API-anrop: kräver inloggning, CSRF-token för skrivningar och fångar fel som JSON. */
function run_api(array $methods, callable $handler): void
{
    send_security_headers();
    try {
        if (app_config()['require_https'] && !Auth::isHttps()) {
            send_json(403, ['error' => 'HTTPS krävs.']);
            return;
        }
        Auth::startSession();
        if (!Auth::isLoggedIn()) {
            send_json(401, ['error' => 'Inloggning krävs.']);
            return;
        }
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (!in_array($method, $methods, true)) {
            header('Allow: ' . implode(', ', $methods));
            send_json(405, ['error' => 'Metoden stöds inte.']);
            return;
        }
        if ($method !== 'GET' && !Auth::verifyWriteRequest()) {
            send_json(403, ['error' => 'Förfrågan avvisades. Ladda om sidan och försök igen.']);
            return;
        }
        // Sessionen behövs inte längre; släpp låset så parallella anrop inte köas.
        if (empty($GLOBALS['api_keeps_session'])) {
            session_write_close();
        }
        $handler();
    } catch (InvalidArgumentException $error) {
        send_json(400, ['error' => $error->getMessage()]);
    } catch (Throwable $error) {
        error_log('aktier: ' . $error);
        send_json(500, ['error' => $error->getMessage()]);
    }
}

/** Formatera som Pythons f"{value:,.2f}" med svensk tusenavgränsare och decimalkomma. */
function swedish_money(float $value): string
{
    // sprintf avrundar som Python (exakt binärvärde, jämn vid lika); number_format gör det inte.
    [$whole, $fraction] = explode('.', sprintf('%.2f', $value));
    $sign = $whole[0] === '-' ? '-' : '';
    $grouped = strrev(implode(' ', str_split(strrev(ltrim($whole, '-')), 3)));
    return "{$sign}{$grouped},{$fraction}";
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

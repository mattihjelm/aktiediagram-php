<?php
declare(strict_types=1);

/** Inloggning för en användare: lösenordshash i config.php, PHP-session och CSRF-token. */
final class Auth
{
    private const SESSION_NAME = 'aktier_session';

    public static function isHttps(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
            || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443;
    }

    /** Skicka sidförfrågningar över HTTP vidare till HTTPS; returnerar false om förfrågan stoppades. */
    public static function requireHttps(): bool
    {
        if (!app_config()['require_https'] || self::isHttps()) {
            return true;
        }
        $host = (string)($_SERVER['HTTP_HOST'] ?? '');
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' && preg_match('/^[A-Za-z0-9.-]+(:\d+)?$/', $host)) {
            header('Location: https://' . $host . ($_SERVER['REQUEST_URI'] ?? '/'), true, 301);
        } else {
            http_response_code(403);
            echo 'HTTPS krävs.';
        }
        return false;
    }

    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        $config = app_config();
        $timeout = (int)$config['session_timeout'];
        $directory = (string)$config['session_dir'];
        if ($directory !== '' && (is_dir($directory) || @mkdir($directory, 0700, true)) && is_writable($directory)) {
            session_save_path($directory);
        }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', (string)$timeout);
        session_name(self::SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $config['require_https'] || self::isHttps(),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
        $now = time();
        if (!empty($_SESSION['logged_in']) && $now - (int)($_SESSION['last_activity'] ?? 0) > $timeout) {
            self::destroySession();
            session_start();
        }
        $_SESSION['last_activity'] = $now;
    }

    public static function isLoggedIn(): bool
    {
        return !empty($_SESSION['logged_in']);
    }

    public static function csrfToken(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    /** Skrivningar måste bära sessionens CSRF-token och, om webbläsaren anger det, komma från samma ursprung. */
    public static function verifyWriteRequest(): bool
    {
        $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '');
        if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
            return false;
        }
        $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
        if ($origin === '') {
            return true;
        }
        if ($origin === 'null') {
            return false;
        }
        return strcasecmp((string)parse_url($origin, PHP_URL_HOST) . self::portSuffix($origin), (string)($_SERVER['HTTP_HOST'] ?? '')) === 0;
    }

    private static function portSuffix(string $origin): string
    {
        $port = parse_url($origin, PHP_URL_PORT);
        return $port ? ':' . $port : '';
    }

    /**
     * Försök logga in. Returnerar null vid lyckad inloggning, annars ett felmeddelande.
     */
    public static function attemptLogin(string $password, string $client): ?string
    {
        $config = app_config();
        $hash = (string)$config['password_hash'];
        $file = data_path('login-attempts.json');
        $key = hash('sha256', $client);
        return Storage::withLock($file, true, static function () use ($config, $hash, $file, $key, $password) {
            $attempts = Storage::readJson($file) ?? [];
            $now = time();
            // Rensa gamla poster så filen inte växer.
            foreach ($attempts as $client => $entry) {
                if ($now - (int)$entry['last'] > 86400) {
                    unset($attempts[$client]);
                }
            }
            $entry = $attempts[$key] ?? ['failures' => 0, 'last' => 0];
            $max = (int)$config['login_max_failures'];
            if ($entry['failures'] >= $max) {
                $wait = (int)$config['login_lockout_seconds'] - ($now - (int)$entry['last']);
                if ($wait > 0) {
                    return 'För många misslyckade inloggningsförsök. Försök igen om ' . (int)ceil($wait / 60) . ' minuter.';
                }
                $entry = ['failures' => 0, 'last' => 0];
            }
            // Växande väntetid efter de första misslyckade försöken.
            $delay = $entry['failures'] >= 3 ? (int)$config['login_delay_seconds'] * 2 ** ($entry['failures'] - 3) : 0;
            if ($now - (int)$entry['last'] < $delay) {
                return 'Vänta ' . ($delay - ($now - (int)$entry['last'])) . ' sekunder innan du försöker igen.';
            }
            if ($hash !== '' && password_verify($password, $hash)) {
                unset($attempts[$key]);
                Storage::writeAtomic($file, json_encode($attempts));
                if (session_status() === PHP_SESSION_ACTIVE) {
                    session_regenerate_id(true);
                }
                $_SESSION = ['logged_in' => true, 'last_activity' => $now, 'csrf_token' => bin2hex(random_bytes(32))];
                return null;
            }
            $attempts[$key] = ['failures' => $entry['failures'] + 1, 'last' => $now];
            Storage::writeAtomic($file, json_encode($attempts));
            return 'Fel lösenord.';
        });
    }

    public static function destroySession(): void
    {
        $_SESSION = [];
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 3600, 'path' => $params['path'], 'secure' => $params['secure'],
            'httponly' => true, 'samesite' => 'Strict',
        ]);
        session_destroy();
    }

    /** För sidor: skicka oinloggade till inloggningssidan. Returnerar false om förfrågan stoppades. */
    public static function requirePageLogin(): bool
    {
        if (!self::requireHttps()) {
            return false;
        }
        self::startSession();
        if (self::isLoggedIn()) {
            return true;
        }
        header('Location: login.php', true, 302);
        return false;
    }
}

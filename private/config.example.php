<?php
// Kopiera till config.php och fyll i password_hash.
// Skapa hashen lokalt med: php private/bin/hash-password.php
return [
    'password_hash' => '',
    // Logga ut efter så här många sekunders inaktivitet.
    'session_timeout' => 8 * 3600,
    // Sätt till false endast för lokal utveckling på http://localhost.
    'require_https' => true,
    // Spärr efter så här många misslyckade inloggningar i följd, och hur länge.
    'login_max_failures' => 10,
    'login_lockout_seconds' => 15 * 60,
];

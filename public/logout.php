<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

send_security_headers();
if (!Auth::requireHttps()) {
    exit;
}
Auth::startSession();
// Utloggning kräver POST med token så att en annan webbplats inte kan logga ut användaren.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && Auth::verifyWriteRequest()) {
    Auth::destroySession();
    header('Location: login.php', true, 303);
    exit;
}
header('Location: ' . (Auth::isLoggedIn() ? 'index.php' : 'login.php'), true, 303);

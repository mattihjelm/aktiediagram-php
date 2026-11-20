<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

send_security_headers();
if (!Auth::requireHttps()) {
    exit;
}
Auth::startSession();
if (Auth::isLoggedIn()) {
    header('Location: index.php', true, 302);
    exit;
}

$message = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!Auth::verifyWriteRequest()) {
        $message = 'Sidan hade gått ut. Försök igen.';
    } else {
        $message = Auth::attemptLogin((string)($_POST['password'] ?? ''), (string)($_SERVER['REMOTE_ADDR'] ?? ''));
        if ($message === null) {
            header('Location: index.php', true, 303);
            exit;
        }
    }
    http_response_code(401);
}
?>
<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Logga in · Aktiediagram</title>
  <link rel="stylesheet" href="<?= h(asset_url('app.css')) ?>">
</head>
<body class="login-page">
  <main class="login-box">
    <h1>Aktiediagram</h1>
    <form method="post" action="login.php">
      <input type="hidden" name="csrf_token" value="<?= h(Auth::csrfToken()) ?>">
      <label>Lösenord <input type="password" name="password" autocomplete="current-password" required autofocus></label>
      <button type="submit">Logga in</button>
    </form>
    <?php if ($message !== ''): ?>
      <p class="login-error" role="alert"><?= h($message) ?></p>
    <?php endif; ?>
  </main>
</body>
</html>

<?php
// Skapar en lösenordshash för config.php. Körs lokalt: php private/bin/hash-password.php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
fwrite(STDOUT, 'Lösenord: ');
system('stty -echo 2>/dev/null');
$password = rtrim((string)fgets(STDIN), "\r\n");
system('stty echo 2>/dev/null');
fwrite(STDOUT, "\n");
if (strlen($password) < 12) {
    fwrite(STDERR, "Välj ett lösenord med minst 12 tecken.\n");
    exit(1);
}
echo "'password_hash' => '" . password_hash($password, PASSWORD_DEFAULT) . "',\n";

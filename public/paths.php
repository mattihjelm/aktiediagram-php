<?php
// Sökväg till den privata katalogen med programkod, konfiguration och data.
// one.com: appen ligger i webbrotens aktier/ och den privata delen i _private/aktier/,
// som one.com stänger för webben. Lokalt ligger private/ bredvid public/.
// Om private/ i stället ligger inuti appkatalogen används aktier/private/.
foreach ([__DIR__ . '/../_private/aktier', __DIR__ . '/../private', __DIR__ . '/private'] as $directory) {
    if (is_file($directory . '/src/bootstrap.php')) {
        return $directory;
    }
}
http_response_code(500);
exit('Appens privata katalog hittades inte. Se README.md.');

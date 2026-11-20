<?php
declare(strict_types=1);

require_once (require __DIR__ . '/paths.php') . '/src/bootstrap.php';

/** Adress till en fil i assets/ med ändringstid som version, så att webbläsare (särskilt iPhone Safari) hämtar nya versioner. */
function asset_url(string $path): string
{
    $file = __DIR__ . '/assets/' . $path;
    return 'assets/' . $path . (is_file($file) ? '?v=' . filemtime($file) : '');
}

<?php
declare(strict_types=1);

require __DIR__ . '/../_bootstrap.php';

// Förhandsgranskningen sparas i sessionen tills den bekräftas eller avbryts.
$GLOBALS['api_keeps_session'] = true;

run_api(['POST'], static function () {
    $step = (string)($_GET['step'] ?? '');
    if ($step === 'preview') {
        import_preview();
    } elseif ($step === 'confirm') {
        import_confirm();
    } elseif ($step === 'cancel') {
        unset($_SESSION['import_preview']);
        send_json(200, ['cancelled' => true]);
    } else {
        throw new InvalidArgumentException('Okänt importsteg.');
    }
});

function import_preview(): void
{
    $file = $_FILES['file'] ?? null;
    $limit = (int)app_config()['max_import_bytes'];
    // Över post_max_size tappar PHP hela förfrågan, så $_FILES blir tom trots att en fil skickades.
    if (!$file && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        throw new InvalidArgumentException('Filen är större än webbhotellets gräns för uppladdning (' . ini_get('post_max_size') . ').');
    }
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        throw new InvalidArgumentException('Välj mäklarens exportfil innan du importerar.');
    }
    if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        throw new InvalidArgumentException('Filen är större än webbhotellets gräns för uppladdning (' . ini_get('upload_max_filesize') . ').');
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        throw new InvalidArgumentException('Filen kunde inte laddas upp.');
    }
    if ($file['size'] <= 0 || $file['size'] > $limit) {
        throw new InvalidArgumentException('Välj en exportfil som är större än 0 byte och mindre än ' . intdiv($limit, 1024 * 1024) . ' MB.');
    }
    // Kontot gäller alla rader i filen.
    $account = Purchases::account((string)($_POST['account'] ?? ''));
    // Filen läses direkt från PHP:s temporära uppladdning, som tas bort när förfrågan är klar.
    $bytes = (string)file_get_contents($file['tmp_name']);
    @unlink($file['tmp_name']);
    $converted = Import::convert(Import::decode($bytes), import_mapping(), $account);
    $selection = Import::selectNew($converted['rows'], Purchases::load());
    $previewId = bin2hex(random_bytes(16));
    $_SESSION['import_preview'] = [
        'id' => $previewId,
        'rows' => $selection['new_rows'],
        'duplicates' => $selection['duplicates'],
        'warning_count' => count($converted['warnings']),
        'account' => $account,
    ];
    $counts = [];
    foreach ($selection['new_rows'] as $row) {
        $key = $row['transaction_type'] . ' ' . $row['ticker'] . " ({$account})";
        $counts[$key] = ($counts[$key] ?? 0) + 1;
    }
    ksort($counts);
    send_json(200, [
        'preview_id' => $previewId,
        'account' => $account,
        'converted' => count($converted['rows']),
        'duplicates' => $selection['duplicates'],
        'new' => count($selection['new_rows']),
        'new_by_type' => (object)$counts,
        'warning_count' => count($converted['warnings']),
        'warnings' => $converted['warnings'],
        'source_headers' => $converted['source_headers'],
        'unmapped_rows' => $converted['unmapped_rows'],
    ]);
}

function import_confirm(): void
{
    $preview = $_SESSION['import_preview'] ?? null;
    $previewId = (string)(request_json()['preview_id'] ?? '');
    if (!$preview || $previewId === '' || !hash_equals($preview['id'], $previewId)) {
        throw new InvalidArgumentException('Förhandsgranskningen finns inte längre. Välj filen och förhandsgranska igen.');
    }
    unset($_SESSION['import_preview']);
    session_write_close();
    // Kontrollera dubbletter igen mot filens nuvarande innehåll under samma lås som skrivningen.
    $lateDuplicates = 0;
    $added = Purchases::append(static function (array $existing) use ($preview, &$lateDuplicates) {
        $selection = Import::selectNew($preview['rows'], $existing);
        $lateDuplicates = $selection['duplicates'];
        return $selection['new_rows'];
    });
    $chart = new Chart(Stocks::load(), []);
    $markers = array_values(array_filter(array_map([$chart, 'marker'], $added)));
    send_json(200, [
        'added' => count($added),
        'duplicates' => $preview['duplicates'] + $lateDuplicates,
        'warning_count' => $preview['warning_count'],
        'account' => $preview['account'] ?? DEFAULT_ACCOUNT,
        'markers' => $markers,
    ]);
}

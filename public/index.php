<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

send_security_headers();
if (!Auth::requirePageLogin()) {
    exit;
}
$csrfToken = Auth::csrfToken();
session_write_close();

$configError = '';
try {
    Stocks::load();
} catch (UnexpectedValueException $error) {
    // Ogiltig aktielista visas i stället för diagrammet.
    $configError = $error->getMessage();
}
$versionSuffix = Chart::versionSuffix([__DIR__, APP_PRIVATE_DIR . '/src', APP_PRIVATE_DIR . '/import-mapping.php']);
?>
<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="csrf-token" content="<?= h($csrfToken) ?>">
  <title>Aktiediagram</title>
  <link rel="stylesheet" href="<?= h(asset_url('app.css')) ?>">
</head>
<body data-version-suffix="<?= h($versionSuffix) ?>">
<form id="logout-form" method="post" action="logout.php">
  <input type="hidden" name="csrf_token" value="<?= h($csrfToken) ?>">
  <button type="submit">Logga ut</button>
</form>
<?php if ($configError !== ''): ?>
<main class="app-error" role="alert">
  <h1>Aktielistan kunde inte läsas</h1>
  <p><?= h($configError) ?></p>
</main>
<?php else: ?>
<p id="chart-loading-status" role="status">Läser in kursdata…</p>
<div id="stock-chart" class="plotly-graph-div" style="height:100%; width:100%;" hidden></div>
<section id="intraday-panel" aria-labelledby="intraday-title" hidden>
  <div id="intraday-header">
    <h2 id="intraday-title">Minutkurser</h2>
    <div id="intraday-range" role="group" aria-label="Tidsintervall">
      <button type="button" data-days="7" aria-pressed="true">Vecka</button>
      <button type="button" data-days="30" aria-pressed="false">Månad</button>
    </div>
    <span id="intraday-download-row"><a id="intraday-download" download hidden>Ladda ner CSV</a> <span id="intraday-archive"></span></span>
    <p id="intraday-status" role="status"></p>
  </div>
  <div id="intraday-plot">
    <div id="intraday-chart"></div>
    <div id="intraday-pin" role="group" aria-label="Vald minut" hidden>
      <span id="intraday-pin-time"></span>
      <strong id="intraday-pin-price"></strong>
      <div id="intraday-pin-buttons">
        <button type="button" id="intraday-pin-prev" aria-label="En minut bakåt">◀</button>
        <button type="button" id="intraday-pin-next" aria-label="En minut framåt">▶</button>
        <button type="button" id="intraday-pin-close" aria-label="Stäng">×</button>
      </div>
    </div>
  </div>
</section>
<section id="purchase-panel" hidden>
  <h2>Registrera transaktion</h2>
  <form id="purchase-form">
    <label>Typ <select id="purchase-type" required><option value="KÖP">Köp</option><option value="SÄLJ">Sälj</option><option value="UTDELNING">Utdelning</option></select></label>
    <label>Aktie <select id="purchase-ticker" required></select></label>
    <label>Konto <input id="purchase-account" type="text" maxlength="1" autocapitalize="characters" autocomplete="off" list="account-options" value="T" required></label>
    <label>Datum <input id="purchase-date" type="date" required value="<?= h(date('Y-m-d')) ?>"></label>
    <label id="purchase-time-label">Tid <input id="purchase-time" type="time"></label>
    <label id="purchase-quantity-label">Antal <input id="purchase-quantity" type="text" inputmode="decimal" placeholder="0" required></label>
    <label id="purchase-price-label">Kurs (i aktiens valuta) <input id="purchase-price" type="text" inputmode="decimal" size="8" placeholder="189,34" required></label>
    <label id="purchase-fee-label">Courtage <input id="purchase-commission" type="text" inputmode="decimal" placeholder="0,00" value="0,00" required></label>
    <button type="submit">Lägg till transaktion</button>
    <p id="purchase-total" aria-live="polite">Totalbelopp: —</p>
  </form>
  <!-- Konton som redan används; gemensamt för formuläret och importen. -->
  <datalist id="account-options"></datalist>
  <p id="purchase-status" role="status">Transaktioner sparas i aktiekop.csv och visas i diagrammet.</p>
</section>
<script src="assets/vendor/plotly-4.1.1.min.js"></script>
<script src="<?= h(asset_url('chart.js')) ?>"></script>
<script src="<?= h(asset_url('intraday.js')) ?>"></script>
<script src="<?= h(asset_url('panel.js')) ?>"></script>
<script src="<?= h(asset_url('app.js')) ?>"></script>
<?php endif; ?>
</body>
</html>

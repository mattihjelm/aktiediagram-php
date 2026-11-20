// Start av appen: hämtar kurshistorik i omgångar, ritar figuren och kopplar på diagram och panel.
(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
  const loadingStatus = document.getElementById('chart-loading-status');
  // Ett fåtal aktier per anrop håller varje förfrågan under webbhotellets tidsgräns.
  const HISTORY_BATCH_SIZE = 5;

  window.apiFetch = async function(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    if (method !== 'GET') headers.set('X-CSRF-Token', csrfToken);
    const response = await fetch(url, {...options, headers, credentials: 'same-origin'});
    if (response.status === 401) {
      window.location.href = 'login.php';
      throw new Error('Inloggningen har gått ut.');
    }
    return response;
  };

  async function readJson(response, fallbackMessage) {
    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error(fallbackMessage);
    }
    if (!response.ok) throw new Error(result.error || fallbackMessage);
    return result;
  }

  async function loadHistory() {
    const status = await readJson(await window.apiFetch('api/history.php'), 'Kurshistoriken kunde inte kontrolleras.');
    const needed = status.needed || [];
    const failed = {};
    for (let index = 0; index < needed.length; index += HISTORY_BATCH_SIZE) {
      loadingStatus.textContent = `Hämtar kurshistorik från Yahoo Finance (${index}/${needed.length})…`;
      const result = await readJson(await window.apiFetch('api/history.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({symbols: needed.slice(index, index + HISTORY_BATCH_SIZE)}),
      }), 'Kurshistoriken kunde inte hämtas.');
      Object.assign(failed, result.failed || {});
    }
    return failed;
  }

  // Statustext sparad före en omladdning (ny transaktion på ett nytt konto), visas en gång.
  function showStoredStatus() {
    try {
      const stored = JSON.parse(sessionStorage.getItem('aktier.flash') || 'null');
      sessionStorage.removeItem('aktier.flash');
      const element = stored && document.getElementById(stored.id);
      if (element) element.textContent = stored.text;
    } catch (error) {
      // Utan lagring finns ingen sparad status att visa.
    }
  }

  async function start() {
    let failed = {};
    try {
      failed = await loadHistory();
      loadingStatus.textContent = 'Ritar diagrammet…';
      const figure = await readJson(await window.apiFetch('api/chart.php'), 'Diagrammet kunde inte läsas in.');
      const tickerSelect = document.getElementById('purchase-ticker');
      figure.stocks.forEach(stock => {
        const option = document.createElement('option');
        option.value = stock.ticker;
        option.textContent = stock.name;
        tickerSelect.append(option);
      });
      const graph = document.getElementById('stock-chart');
      graph.hidden = false;
      document.getElementById('purchase-panel').hidden = false;
      await Plotly.newPlot(graph, figure.data, figure.layout, figure.config);
      window.initStockChart(graph);
      // Legendens resultat räknas i webbläsaren, som efter varje ny transaktion.
      figure.data.forEach(trace => { if (trace.meta && trace.meta.role === 'stock') window.refreshProfitLabel(trace.meta.series, false); });
      window.initPurchasePanel();
      loadingStatus.remove();
      showStoredStatus();
      const warnings = [...(figure.warnings || [])];
      Object.entries(failed).forEach(([symbol, message]) => {
        if (!warnings.some(warning => warning.includes(symbol))) warnings.push(`${symbol}: ${message}.`);
      });
      if (warnings.length) document.getElementById('refresh-data-status').textContent = warnings.join(' ');
    } catch (error) {
      // Visa orsaken från hämtningen, t.ex. ett nätverksfel, och inte bara följden.
      const reasons = [...new Set(Object.values(failed))];
      loadingStatus.textContent = reasons.length
        ? `${error.message} Orsak: ${reasons.slice(0, 2).join('; ')}${reasons.length > 2 ? ' …' : ''}. Ladda om sidan för att försöka igen.`
        : error.message;
      loadingStatus.classList.add('is-error');
    }
  }

  start();
})();

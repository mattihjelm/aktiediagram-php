// Formulär, transaktionslista, resultat, import och kursuppdateringar.
// Porterat från Python-versionens panelskript; anropas efter initStockChart.
window.initPurchasePanel = function() {
  const purchaseGraph = document.querySelector('.plotly-graph-div');
  window.currentPriceTickers = new Set();
  const purchasePanel = document.getElementById('purchase-panel');
  const chartLayout = document.createElement('div');
  chartLayout.id = 'stock-chart-layout';
  const chartTitle = document.createElement('h1');
  chartTitle.id = 'stock-chart-title';
  chartTitle.textContent = `Aktiernas utveckling (index 100 vid synligt startdatum) · ${document.body.dataset.versionSuffix}`;
  const refreshControls = document.createElement('div');
  refreshControls.id = 'refresh-controls';
  const refreshButton = document.createElement('button');
  refreshButton.id = 'refresh-data-button';
  refreshButton.type = 'button';
  refreshButton.textContent = 'Hämta slutkurser';
  const currentPriceButton = document.createElement('button');
  currentPriceButton.id = 'current-price-button';
  currentPriceButton.type = 'button';
  currentPriceButton.textContent = 'Hämta aktuell kurs';
  const quoteControls = document.createElement('div');
  quoteControls.id = 'quote-controls';
  const quoteHeading = document.createElement('h2');
  quoteHeading.textContent = 'Kurser';
  const quoteButtons = document.createElement('div');
  quoteButtons.id = 'quote-buttons';
  quoteButtons.append(refreshButton, currentPriceButton);
  quoteControls.append(quoteHeading, quoteButtons);
  const visibleDateControls = document.createElement('div');
  visibleDateControls.id = 'visible-date-controls';
  const visibleDateHeading = document.createElement('h2');
  visibleDateHeading.textContent = 'Datumintervall';
  const visibleDateFields = document.createElement('div');
  visibleDateFields.id = 'visible-date-fields';
  const visibleStartLabel = document.createElement('label');
  visibleStartLabel.innerHTML = '<span>Start</span>';
  const visibleStartInput = document.createElement('input');
  visibleStartInput.id = 'visible-start-date';
  visibleStartInput.type = 'text';
  visibleStartInput.inputMode = 'numeric';
  visibleStartInput.maxLength = 10;
  visibleStartLabel.append(visibleStartInput);
  const visibleEndLabel = document.createElement('label');
  visibleEndLabel.innerHTML = '<span>Slut</span>';
  const visibleEndInput = document.createElement('input');
  visibleEndInput.id = 'visible-end-date';
  visibleEndInput.type = 'text';
  visibleEndInput.inputMode = 'numeric';
  visibleEndInput.maxLength = 10;
  visibleEndLabel.append(visibleEndInput);
  // Skalval med kryssrutor: Linjär ensam, eller Logaritmisk och/eller ett mått.
  // Fler mått kan läggas till i MEASURE_KEYS här och i MEASURES i chart.js.
  const scaleGroup = document.createElement('div');
  scaleGroup.id = 'scale-group';
  scaleGroup.setAttribute('role', 'group');
  scaleGroup.setAttribute('aria-label', 'Skala');
  const scaleBoxes = {};
  const MEASURE_KEYS = ['ma200', 'drawdown', 'change63'];
  [['linear', 'Linjär'], ['log', 'Logaritmisk'], ['ma200', 'Avvikelse från 200-dagars medel'],
    ['drawdown', 'Fall från tidigare topp'], ['change63', 'Förändring över 3 månader']].forEach(([key, text]) => {
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = `scale-${key}`;
    label.append(box, document.createTextNode(` ${text}`));
    scaleBoxes[key] = box;
    scaleGroup.append(label);
  });
  scaleGroup.prepend(document.createTextNode('Skala'));
  const savedScale = purchaseGraph.layout.meta && purchaseGraph.layout.meta.scale
    || (purchaseGraph.layout.yaxis.type === 'log' ? 'log' : 'linear');
  const savedMeasure = savedScale.startsWith('log_') ? savedScale.slice(4) : savedScale;
  scaleBoxes.linear.checked = savedScale === 'linear';
  scaleBoxes.log.checked = savedScale === 'log' || savedScale.startsWith('log_');
  MEASURE_KEYS.forEach(key => { scaleBoxes[key].checked = savedMeasure === key; });
  visibleDateFields.append(visibleStartLabel, visibleEndLabel, scaleGroup);
  visibleDateControls.append(visibleDateHeading, visibleDateFields);
  const visibleDateStatusElement = document.createElement('span');
  visibleDateStatusElement.id = 'visible-date-status';
  visibleDateStatusElement.setAttribute('role', 'status');
  const refreshStatus = document.createElement('span');
  refreshStatus.id = 'refresh-data-status';
  refreshStatus.setAttribute('role', 'status');
  refreshControls.append(quoteControls, visibleDateControls, visibleDateStatusElement, refreshStatus);
  const topControlsRow = document.createElement('div');
  topControlsRow.id = 'top-controls-row';
  topControlsRow.append(purchasePanel, refreshControls);
  const purchaseList = document.createElement('section');
  purchaseList.id = 'purchase-list';
  purchaseList.innerHTML = '<h2>Transaktioner</h2><div id="transaction-list-controls" class="transaction-panel-controls"><div class="transaction-list-heading"><button id="import-events-button" type="button">Importera transaktioner</button><input id="import-events-file" type="file" accept=".csv,text/csv" aria-label="Välj CSV-fil med transaktioner"><label id="import-account-label">Konto <input id="import-account" type="text" maxlength="1" autocapitalize="characters" autocomplete="off" list="account-options" required></label><button id="toggle-dividends-button" type="button">Dölj utdelningar</button><span id="import-events-default">Välj mäklarens exportfil. Importen visas först som förhandsgranskning.</span></div><p id="import-events-status" role="status"></p><div id="import-preview-actions" hidden><button id="import-confirm-button" type="button">Bekräfta import</button><button id="import-cancel-button" type="button">Avbryt</button></div><button id="show-unmapped-button" type="button" hidden></button><dialog id="unmapped-rows-dialog"><div class="unmapped-dialog-heading"><h2>Omappade källrader</h2><button id="close-unmapped-dialog" type="button">Stäng</button></div><div id="unmapped-rows-content"></div></dialog></div><div id="purchase-list-content"></div>';
  const portfolioSummary = document.createElement('section');
  portfolioSummary.id = 'portfolio-summary';
  portfolioSummary.innerHTML = '<h2>Resultat</h2><div id="portfolio-summary-controls" class="transaction-panel-controls"><label><input id="filter-solo-lists" type="checkbox" checked> Filtrera aktier enligt solo-val</label><label><input id="filter-chart-lists" type="checkbox"> Filtrera enligt diagramval</label></div><div id="portfolio-summary-content" class="transaction-table-content"></div>';
  const transactionTables = document.createElement('div');
  transactionTables.id = 'transaction-tables';
  transactionTables.append(purchaseList, portfolioSummary);
  const chartViewport = document.createElement('div');
  chartViewport.id = 'stock-chart-viewport';
  const customLegend = document.createElement('aside');
  customLegend.id = 'stock-custom-legend';
  customLegend.setAttribute('aria-label', 'Värdepapperslistan');
  purchaseGraph.parentNode.insertBefore(chartLayout, purchaseGraph);
  chartLayout.append(chartTitle, topControlsRow, chartViewport, document.getElementById('intraday-panel'), transactionTables);
  chartViewport.append(purchaseGraph, customLegend);
  function finishStockChartLayout(attempt = 0) {
    if (window.renderCustomLegend && window.rebaseVisibleStockGraph) {
      window.renderCustomLegend();
      if (window.suggestPurchasePrice) window.suggestPurchasePrice();
      Plotly.Plots.resize(purchaseGraph);
      requestAnimationFrame(() => window.rebaseVisibleStockGraph({}));
    } else if (attempt < 100) {
      setTimeout(() => finishStockChartLayout(attempt + 1), 50);
    }
  }
  finishStockChartLayout();
  // Kursspåren för alla värdepapper (konton) med tickern; kursen är densamma för dem.
  window.stockTraceIndicesForTicker = ticker => purchaseGraph.data
    .map((trace, index) => trace.meta && trace.meta.role === 'stock' && trace.meta.ticker === ticker ? index : -1)
    .filter(index => index >= 0);
  // Ladda om sidan och visa statustexten i elementet efter omladdningen (app.js); utan lagring laddas den om ändå.
  window.reloadWithStatus = function(elementId, text) {
    try {
      sessionStorage.setItem('aktier.flash', JSON.stringify({id: elementId, text}));
    } catch (error) {
      // Statustexten visas inte, men transaktionen är redan sparad.
    }
    window.location.reload();
  };
  // Kontoförslag i formuläret och importen: konton som redan används.
  const accountOptions = document.getElementById('account-options');
  ((purchaseGraph.layout.meta && purchaseGraph.layout.meta.accounts) || ['T']).forEach(account => {
    const option = document.createElement('option');
    option.value = account;
    accountOptions.append(option);
  });
  const purchaseForm = document.getElementById('purchase-form');
  const purchaseStatus = document.getElementById('purchase-status');
  const purchaseTotal = document.getElementById('purchase-total');
  const refreshDataButton = document.getElementById('refresh-data-button');
  const refreshDataStatus = document.getElementById('refresh-data-status');
  const visibleStartDate = document.getElementById('visible-start-date');
  const visibleEndDate = document.getElementById('visible-end-date');
  const visibleDateStatus = document.getElementById('visible-date-status');
  function toIsoDate(value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
  }
  function stockholmToday() {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
  const initialAxisRange = purchaseGraph.layout.xaxis.range;
  const sliderDataRange = purchaseGraph.layout.xaxis.rangeslider.range;
  const allowedStartDate = toIsoDate(sliderDataRange[0]);
  let allowedEndDate = toIsoDate(initialAxisRange[1]);
  let viewRangeSaveTimer = null;
  window.persistVisibleDateRange = function(range) {
    if (!Array.isArray(range) || range.length < 2) return;
    const start = toIsoDate(range[0]);
    const end = toIsoDate(range[1]);
    if (!isIsoDate(start) || !isIsoDate(end) || start >= end) return;
    clearTimeout(viewRangeSaveTimer);
    viewRangeSaveTimer = setTimeout(async () => {
      try {
        const response = await window.apiFetch('api/view-range.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({start, end}),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Datumintervallet kunde inte sparas.');
      } catch (error) {
        visibleDateStatus.textContent = `Datumintervallet kunde inte sparas: ${error.message}`;
      }
    }, 250);
  };
  async function changeScale(event) {
    const changed = event.target;
    if (changed === scaleBoxes.linear && changed.checked) {
      Object.values(scaleBoxes).forEach(box => { if (box !== changed) box.checked = false; });
    } else if (changed.checked) {
      scaleBoxes.linear.checked = false;
      // Bara ett mått i taget, eftersom måtten delar procentaxeln.
      if (MEASURE_KEYS.some(key => scaleBoxes[key] === changed)) {
        MEASURE_KEYS.forEach(key => { if (scaleBoxes[key] !== changed) scaleBoxes[key].checked = false; });
      }
    }
    const measure = MEASURE_KEYS.find(key => scaleBoxes[key].checked) || null;
    // Något läge är alltid valt; avmarkeras den sista rutan gäller linjär skala.
    if (!scaleBoxes.log.checked && !measure) scaleBoxes.linear.checked = true;
    const scale = scaleBoxes.log.checked ? (measure ? `log_${measure}` : 'log') : (measure || 'linear');
    window.setStockChartScale(scale);
    try {
      const response = await window.apiFetch('api/view-range.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({scale}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Skalan kunde inte sparas.');
    } catch (error) {
      visibleDateStatus.textContent = `Valet av skala kunde inte sparas: ${error.message}`;
    }
  }
  Object.values(scaleBoxes).forEach(box => box.addEventListener('change', changeScale));
  function isIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function applyVisibleDateRange() {
    const start = visibleStartDate.value.trim();
    const end = visibleEndDate.value.trim();
    if (!isIsoDate(start) || !isIsoDate(end)) {
      visibleDateStatus.textContent = 'Ange datum i formatet ÅÅÅÅ-MM-DD.';
      return;
    }
    if (start < allowedStartDate || end > allowedEndDate) {
      visibleDateStatus.textContent = `Välj datum mellan ${allowedStartDate} och ${allowedEndDate}.`;
      return;
    }
    if (start >= end) {
      visibleDateStatus.textContent = 'Startdatum måste vara före slutdatum.';
      return;
    }
    visibleDateStatus.textContent = '';
    Plotly.relayout(purchaseGraph, {'xaxis.range': [start, end]});
  }
  visibleStartDate.addEventListener('change', applyVisibleDateRange);
  visibleEndDate.addEventListener('change', applyVisibleDateRange);
  if (window.syncVisibleDateInputs) window.syncVisibleDateInputs();
  function parsePurchaseNumber(value) {
    const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
    return normalized ? Number(normalized) : NaN;
  }
  window.updatePurchaseTotal = function() {
    const quantity = parsePurchaseNumber(document.getElementById('purchase-quantity').value);
    const price = parsePurchaseNumber(document.getElementById('purchase-price').value);
    const commission = parsePurchaseNumber(document.getElementById('purchase-commission').value);
    if (!(quantity > 0) || !(price > 0) || !(commission >= 0)) {
      purchaseTotal.textContent = 'Totalbelopp: —';
      return;
    }
    const ticker = document.getElementById('purchase-ticker').value;
    const type = document.getElementById('purchase-type').value;
    const currency = window.stockCurrency(ticker);
    const total = quantity * price + commission;
    const dividend = type === 'UTDELNING';
    const label = dividend ? 'Utdelning efter källskatt' : type === 'SÄLJ' ? 'Nettobelopp' : 'Totalbelopp';
    const amount = type === 'SÄLJ' || dividend ? quantity * price - commission : total;
    purchaseTotal.textContent = `${label}: ${amount.toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${currency ? ` ${currency}` : ''}`;
  };
  ['purchase-quantity', 'purchase-price', 'purchase-commission'].forEach(id =>
    document.getElementById(id).addEventListener('input', window.updatePurchaseTotal)
  );
  document.getElementById('purchase-commission').addEventListener('change', event => {
    const value = parsePurchaseNumber(event.target.value);
    if (Number.isFinite(value) && value >= 0) {
      event.target.value = value.toLocaleString('sv-SE', {
        useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2,
      });
      window.updatePurchaseTotal();
    }
  });
  window.updateSuggestedCommission = function() {
    if (document.getElementById('purchase-type').value === 'UTDELNING') return;
    const quantity = parsePurchaseNumber(document.getElementById('purchase-quantity').value);
    const price = parsePurchaseNumber(document.getElementById('purchase-price').value);
    if (!(quantity > 0) || !(price > 0)) return;
    // Courtaget anges i aktiens inmatningsvaluta; procentsatsen är densamma
    // efter SEK-konvertering och värdet sparas med två decimaler.
    const commission = Math.round(quantity * price * 0.0025 * 100) / 100;
    document.getElementById('purchase-commission').value = commission.toLocaleString('sv-SE', {
      useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    window.updatePurchaseTotal();
  };
  ['purchase-quantity', 'purchase-price'].forEach(id =>
    document.getElementById(id).addEventListener('input', window.updateSuggestedCommission)
  );
  document.getElementById('purchase-price').addEventListener('change', event => {
    const value = parsePurchaseNumber(event.target.value);
    if (Number.isFinite(value) && value > 0) {
      event.target.value = value.toLocaleString('sv-SE', {
        useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2,
      });
      window.updateSuggestedCommission();
      window.updatePurchaseTotal();
    }
  });
  document.getElementById('purchase-ticker').addEventListener('change', () => {
    if (window.suggestPurchasePrice) window.suggestPurchasePrice();
    window.updatePurchaseTotal();
  });
  let previousPurchaseType = 'KÖP';
  document.getElementById('purchase-type').addEventListener('change', event => {
    const type = event.target.value;
    const dividend = type === 'UTDELNING';
    const quantityLabel = document.getElementById('purchase-quantity-label');
    const quantityField = document.getElementById('purchase-quantity');
    quantityLabel.hidden = false;
    quantityLabel.firstChild.textContent = dividend ? 'Antal aktier ' : 'Antal ';
    quantityField.required = true;
    document.getElementById('purchase-price-label').firstChild.textContent = dividend ? 'Utdelning per aktie (i aktiens valuta) ' : 'Kurs (i aktiens valuta) ';
    document.getElementById('purchase-fee-label').firstChild.textContent = dividend ? 'Källskatt ' : 'Courtage ';
    // Klockslag gäller bara köp och sälj.
    document.getElementById('purchase-time-label').hidden = dividend;
    if (dividend) document.getElementById('purchase-time').value = '';
    if (dividend) {
      document.getElementById('purchase-price').value = '';
      document.getElementById('purchase-commission').value = '0,00';
    } else if (previousPurchaseType === 'UTDELNING') {
      quantityField.value = '';
      document.getElementById('purchase-price').value = '';
      document.getElementById('purchase-commission').value = '0,00';
      if (window.suggestPurchasePrice) window.suggestPurchasePrice();
      if (window.updateSuggestedCommission) window.updateSuggestedCommission();
    }
    previousPurchaseType = type;
    window.updatePurchaseTotal();
  });
  document.getElementById('purchase-date').addEventListener('change', () => {
    if (window.suggestPurchasePrice) window.suggestPurchasePrice();
  });
  let hideDividendTransactions = false;
  let purchaseListAlphabetical = false;
  // Ta bort en transaktion: första klicket visar Bekräfta och Avbryt på raden, först Bekräfta tar bort.
  function showDeleteButton(cell, row) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'transaction-delete';
    button.textContent = 'Ta bort';
    button.setAttribute('aria-label', `Ta bort transaktion ${row.date} ${row.name}`);
    button.addEventListener('click', () => {
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'transaction-delete-confirm';
      confirm.textContent = 'Bekräfta';
      confirm.setAttribute('aria-label', `Bekräfta borttagning av ${row.date} ${row.name}`);
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Avbryt';
      cancel.addEventListener('click', () => showDeleteButton(cell, row));
      confirm.addEventListener('click', () => {
        confirm.disabled = true;
        cancel.disabled = true;
        deleteTransaction(row);
      });
      cell.replaceChildren(confirm, cancel);
      // Cellen blir bredare; rulla tabellen så att både Bekräfta och Avbryt syns även i smal bredd.
      confirm.focus({preventScroll: true});
      cell.scrollIntoView({block: 'nearest', inline: 'nearest'});
    });
    cell.replaceChildren(button);
  }
  async function deleteTransaction(row) {
    const status = document.getElementById('import-events-status');
    try {
      const response = await window.apiFetch('api/purchases.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'delete', key: row.key}),
      });
      // Ett svar som inte är JSON kommer från webbservern, inte från appen.
      const result = await response.json().catch(() => {
        throw new Error(`Transaktionen kunde inte tas bort (servern svarade ${response.status}).`);
      });
      if (!response.ok) throw new Error(result.error || 'Transaktionen kunde inte tas bort.');
      const [removedIndex] = row.key.split(':');
      // Ta bort punkten och flytta fram nycklarna för senare rader i filen.
      for (const [traceIndex, trace] of purchaseGraph.data.entries()) {
        if (!trace.meta || trace.meta.role !== 'purchase') continue;
        const keep = trace.customdata.map(details => details[11] !== row.key);
        const shifted = trace.customdata.map(details => {
          const [index, hash] = String(details[11] || '').split(':');
          return hash && Number(index) > Number(removedIndex) ? [...details.slice(0, 11), `${Number(index) - 1}:${hash}`, ...details.slice(12)] : details;
        });
        const symbols = Array.isArray(trace.marker.symbol) ? trace.marker.symbol : trace.x.map(() => trace.marker.symbol);
        if (keep.every(Boolean) && shifted.every((details, index) => details === trace.customdata[index])) continue;
        await Plotly.restyle(purchaseGraph, {
          x: [trace.x.filter((_, index) => keep[index])],
          y: [trace.y.filter((_, index) => keep[index])],
          customdata: [shifted.filter((_, index) => keep[index])],
          'marker.symbol': [symbols.filter((_, index) => keep[index])],
        }, [traceIndex]);
      }
      if (window.rebaseVisibleStockGraph) window.rebaseVisibleStockGraph({});
      if (window.refreshProfitLabel) window.refreshProfitLabel(row.series);
      window.renderPurchaseList();
      window.renderPortfolioSummary();
      if (status) status.textContent = `Transaktionen ${row.date} ${row.name} togs bort ur aktiekop.csv.`;
    } catch (error) {
      if (status) status.textContent = error.message;
      window.renderPurchaseList();
    }
  }
  window.renderPurchaseList = function() {
    const container = document.getElementById('purchase-list-content');
    if (!container || !purchaseGraph.data) return;
    const namesBySeries = {};
    purchaseGraph.data.forEach(trace => {
      if (trace.meta && trace.meta.role === 'stock') namesBySeries[trace.meta.series] = trace.meta.displayName || trace.name;
    });
    const rows = [];
    purchaseGraph.data.forEach(trace => {
      if (!trace.meta || trace.meta.role !== 'purchase') return;
      trace.x.forEach((date, index) => {
        const details = trace.customdata[index];
        const type = details[6] || 'KÖP';
        const quantity = Number(String(details[2]).replace(/\s/g, '').replace(',', '.'));
        const price = Number(String(details[1]).replace(/\s/g, '').replace(',', '.'));
        const commission = Number(String(details[5] || '0').replace(/\s/g, '').replace(',', '.')) || 0;
        const total = type === 'SÄLJ' || type === 'UTDELNING' ? quantity * price - commission : quantity * price + commission;
        const rawCurrency = details[4] || '';
        const currency = rawCurrency === 'SEK' ? 'kr' : rawCurrency;
        const formatted = value => Number.isFinite(value)
          ? value.toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2})
          : String(value ?? '');
        rows.push({
          series: trace.meta.series,
          key: details[11] || '',
          date: String(date).slice(0, 10),
          time: details[10] || '',
          type,
          name: namesBySeries[trace.meta.series] || trace.meta.series,
          quantity: String(details[2]),
          price: `${formatted(price)}${currency ? ` ${currency}` : ''}`,
          commission: `${formatted(commission)}${currency ? ` ${currency}` : ''}`,
          total: `${total.toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${currency ? ` ${currency}` : ''}`,
        });
      });
    });
    const soloFilter = document.getElementById('filter-solo-lists');
    const soloSeries = soloFilter && soloFilter.checked && window.getSoloSeries ? window.getSoloSeries() : null;
    const chartFilter = document.getElementById('filter-chart-lists');
    const chartSeries = chartFilter && chartFilter.checked && window.getVisibleSeries
      ? new Set(window.getVisibleSeries()) : null;
    const visibleRows = rows.filter(row =>
      (!hideDividendTransactions || row.type !== 'UTDELNING') &&
      (!soloSeries || row.series === soloSeries) &&
      (!chartSeries || chartSeries.has(row.series))
    );
    visibleRows.sort(purchaseListAlphabetical
      ? (a, b) => a.name.localeCompare(b.name, 'sv') || `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
      : (a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`) || a.name.localeCompare(b.name, 'sv'));
    container.replaceChildren();
    if (!visibleRows.length) {
      const empty = document.createElement('p');
      if (chartSeries && !chartSeries.size) empty.textContent = 'Inga aktier visas i diagrammet.';
      else if (soloSeries) empty.textContent = 'Inga transaktioner för den solo-valda aktien.';
      else if (hideDividendTransactions && rows.length) empty.textContent = 'Inga köp eller försäljningar visas när utdelningar är dolda.';
      else empty.textContent = 'Inga köp är registrerade ännu.';
      container.append(empty);
      return;
    }
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Datum</th><th>Tid</th><th>Typ</th><th aria-sort="${purchaseListAlphabetical ? 'ascending' : 'none'}"><button id="sort-purchases-by-stock" type="button" aria-label="Sortera transaktioner på värdepapper">Värdepapper${purchaseListAlphabetical ? ' A–Z' : ''}</button></th><th>Antal</th><th>Kurs</th><th>Avgår</th><th>Värde</th><th></th></tr></thead>`;
    const sortStockButton = table.querySelector('#sort-purchases-by-stock');
    sortStockButton.addEventListener('click', () => {
      purchaseListAlphabetical = !purchaseListAlphabetical;
      window.renderPurchaseList();
    });
    const body = document.createElement('tbody');
    visibleRows.forEach(row => {
      const tr = document.createElement('tr');
      [row.date, row.time, row.type, row.name, row.quantity, row.price, row.commission, row.total].forEach((value, index) => {
        const td = document.createElement('td');
        td.textContent = value;
        if (index > 2) td.className = 'number';
        tr.append(td);
      });
      const actionCell = document.createElement('td');
      actionCell.className = 'transaction-delete-cell';
      if (row.key) showDeleteButton(actionCell, row);
      tr.append(actionCell);
      body.append(tr);
    });
    table.append(body);
    container.append(table);
    if (window.syncTransactionListHeight) window.syncTransactionListHeight();
  };
  const portfolioCurrency = window.stockCurrency;
  // Kursspår och transaktionsspår per värdepapper (ticker och konto) i huvuddiagrammet.
  const portfolioTraces = function() {
    const stocks = new Map();
    const transactions = new Map();
    purchaseGraph.data.forEach(trace => {
      if (!trace.meta) return;
      const series = trace.meta.series;
      if (trace.meta.role === 'stock') stocks.set(series, trace);
      if (trace.meta.role === 'purchase') transactions.set(series, trace);
    });
    return {stocks, transactions};
  };
  // Innehav, anskaffningsvärde och utdelningar för ett värdepapper utifrån dess transaktionsspår.
  const holdingFrom = function(trace) {
    const ticker = trace.meta.ticker;
    const number = value => Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
    const currency = portfolioCurrency(ticker);
    // Samma dag: klockslag när båda har ett, annars köp före sälj. Mäklarexporten listar nyast först,
    // så ett sälj av dagens köp får inte räknas innan köpet.
    const sellLast = event => (event.details[6] || 'KÖP') === 'SÄLJ' ? 1 : 0;
    const events = trace.x.map((date, index) => ({date: String(date).slice(0, 10), details: trace.customdata[index]}))
      .sort((a, b) => a.date.localeCompare(b.date)
        || (a.details[10] && b.details[10] ? a.details[10].localeCompare(b.details[10]) : 0)
        || sellLast(a) - sellLast(b));
    let held = 0, localBasis = 0, sekBasis = 0, totalBuyCostSek = 0, realizedSek = 0;
    let dividendSek = 0, dividendLocal = 0, fxMissing = false, dividendFxMissing = false;
    events.forEach(({date, details}) => {
      const price = number(details[1]), enteredQuantity = number(details[2]);
      const quantity = ticker === 'SIRI' && date < '2024-09-10' ? enteredQuantity / 10 : enteredQuantity;
      const commission = number(details[5] || 0) || 0;
      const fx = Number(details[7]);
      const transactionType = details[6] || 'KÖP';
      if (!(enteredQuantity > 0) || (transactionType === 'UTDELNING' ? price === 0 : price <= 0)) return;
      const rate = Number.isFinite(fx) && fx > 0 ? fx : (currency === 'kr' ? 1 : null);
      if (transactionType === 'UTDELNING') {
        const net = price * enteredQuantity - commission;
        if (rate !== null) dividendSek += net * rate;
        else dividendFxMissing = true;
        // Utdelning i aktiens valuta, omräknad med kurserna på utdelningsdagen.
        const tickerFx = Number(details[8]);
        const tickerRate = Number.isFinite(tickerFx) && tickerFx > 0 ? tickerFx : (currency === 'kr' ? 1 : null);
        if (dividendLocal !== null) dividendLocal = rate !== null && tickerRate !== null ? dividendLocal + net * rate / tickerRate : null;
      } else if ((details[6] || 'KÖP') === 'SÄLJ') {
        if (rate !== null) realizedSek += (price * enteredQuantity - commission) * rate;
        else fxMissing = true;
        const removed = Math.min(quantity, held);
        if (held > 0 && removed > 0) {
          const fraction = removed / held;
          if (rate !== null) realizedSek -= sekBasis * fraction;
          localBasis *= 1 - fraction;
          sekBasis *= 1 - fraction;
          held -= removed;
        }
      } else {
        const localCost = price * enteredQuantity + commission;
        held += quantity;
        localBasis += localCost;
        if (rate === null) fxMissing = true;
        else { sekBasis += localCost * rate; totalBuyCostSek += localCost * rate; }
      }
    });
    return {currency, held, localBasis, sekBasis, totalBuyCostSek, realizedSek, dividendSek, dividendLocal, fxMissing, dividendFxMissing};
  };
  // Innehav för det solo-valda värdepapperet i minutdiagrammet; null om det saknar transaktioner.
  window.getHolding = function(series) {
    if (!purchaseGraph.data) return null;
    const trace = portfolioTraces().transactions.get(series);
    return trace && trace.x.length ? holdingFrom(trace) : null;
  };
  // Aktiens händelser som de är registrerade (antal utan split-justering), för minutdiagrammet.
  window.getTransactions = function(series) {
    if (!purchaseGraph.data) return [];
    const trace = portfolioTraces().transactions.get(series);
    if (!trace) return [];
    const number = value => Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
    return Array.from(trace.x, (date, index) => {
      const details = trace.customdata[index];
      return {
        date: String(date).slice(0, 10),
        type: details[6] || 'KÖP',
        price: number(details[1]),
        quantity: number(details[2]),
        commission: number(details[5] || 0) || 0,
        currency: details[4] || '',
        sekRate: Number(details[7]),
        tickerRate: Number(details[8]),
        chartPrice: Number(details[0]),
        time: details[10] || '',
      };
    });
  };
  // Nollpunkt (GAV − utdelning efter källskatt per aktie) i aktiens valuta; null utan innehav.
  window.getBreakeven = function(series) {
    const holding = window.getHolding(series);
    if (!holding || !(holding.held > 0) || holding.dividendLocal === null) return null;
    const value = (holding.localBasis - holding.dividendLocal) / holding.held;
    return Number.isFinite(value) ? {value, currency: holding.currency} : null;
  };
  // Resultat för ett värdepapper med senaste kurs och valutakurs, som i tabellen Resultat.
  const resultFrom = function(trace, stock) {
    const holding = holdingFrom(trace);
    const {held, sekBasis, totalBuyCostSek, realizedSek, dividendSek, fxMissing, dividendFxMissing} = holding;
    const latestIndex = stock.x.length - 1;
    const latestData = stock.customdata[latestIndex] || [];
    const latestPrice = Number(latestData[0]);
    const currentFx = Number(latestData[3]);
    const validFx = Number.isFinite(currentFx) && currentFx > 0;
    const profitExDividendSek = validFx && !fxMissing ? realizedSek + latestPrice * currentFx * held - sekBasis : null;
    const profitSek = profitExDividendSek !== null && !dividendFxMissing ? profitExDividendSek + dividendSek : null;
    const profitPercent = profitSek !== null && totalBuyCostSek > 0 ? profitSek / totalBuyCostSek * 100 : null;
    // Orealiserat som hos mäklaren: kvarvarande innehav mot kvarvarande anskaffningsvärde, utan utdelningar och sälj.
    const unrealizedSek = validFx && !fxMissing && held > 1e-9 ? latestPrice * currentFx * held - sekBasis : null;
    const unrealizedPercent = unrealizedSek !== null && sekBasis > 0 ? unrealizedSek / sekBasis * 100 : null;
    return {...holding, latestIndex, latestData, latestPrice, currentFx, validFx, profitExDividendSek, profitSek, profitPercent,
      unrealizedSek, unrealizedPercent};
  };
  // Tot avkastn (%) för ett värdepapper, för värdepapperslistans sortering; null utan värde.
  window.totalReturnPercent = function(series) {
    if (!purchaseGraph.data) return null;
    const {stocks, transactions} = portfolioTraces();
    const trace = transactions.get(series);
    const stock = stocks.get(series);
    return trace && stock && trace.x.length ? resultFrom(trace, stock).profitPercent : null;
  };
  window.renderPortfolioSummary = function() {
    const container = document.getElementById('portfolio-summary-content');
    if (!container || !purchaseGraph.data) return;
    if (window.refreshIntradayOverlays) window.refreshIntradayOverlays();
    if (window.refreshStockChartOverlays) window.refreshStockChartOverlays();
    const {stocks, transactions} = portfolioTraces();
    const money = value => Number(value).toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const amount = value => Number(value).toLocaleString('sv-SE', {maximumFractionDigits: 4});
    const rows = [];
    transactions.forEach((trace, series) => {
      const stock = stocks.get(series);
      if (!stock || !trace.x.length) return;
      const ticker = stock.meta.ticker;
      const {currency, held, localBasis, dividendSek, dividendFxMissing,
        latestIndex, latestData, latestPrice, currentFx, validFx, profitExDividendSek, profitSek, profitPercent,
        unrealizedSek, unrealizedPercent} = resultFrom(trace, stock);
      const formatPercent = value => value === null ? '—' : `${value > 0 ? '+' : ''}${money(value)}%`;
      const formatKr = value => value === null ? '—' : `${value > 0 ? '+' : ''}${money(value)} kr`;
      rows.push({
        ticker,
        series,
        name: stock.meta.displayName || ticker,
        date: String(stock.x[latestIndex]).slice(0, 10),
        quantity: amount(held),
        price: latestData[1] || `${money(latestPrice)}${currency ? ` ${currency}` : ''}`,
        value: `${money(latestPrice * held)}${currency ? ` ${currency}` : ''}`,
        valueSek: validFx ? `${money(latestPrice * currentFx * held)} kr` : '—',
        gav: `${held > 0 ? money(localBasis / held) : '—'}${held > 0 && currency ? ` ${currency}` : ''}`,
        profitExDividend: formatKr(profitExDividendSek),
        dividend: formatKr(dividendFxMissing ? null : dividendSek),
        profit: formatKr(profitSek),
        percent: formatPercent(profitPercent),
        unrealized: formatKr(unrealizedSek),
        unrealizedPercent: formatPercent(unrealizedPercent),
      });
    });
    const soloFilter = document.getElementById('filter-solo-lists');
    const soloSeries = soloFilter && soloFilter.checked && window.getSoloSeries ? window.getSoloSeries() : null;
    const chartFilter = document.getElementById('filter-chart-lists');
    const chartSeries = chartFilter && chartFilter.checked && window.getVisibleSeries
      ? new Set(window.getVisibleSeries()) : null;
    const visibleRows = rows.filter(row =>
      (!soloSeries || row.series === soloSeries) &&
      (!chartSeries || chartSeries.has(row.series))
    );
    visibleRows.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    container.replaceChildren();
    if (!visibleRows.length) {
      const empty = document.createElement('p');
      if (chartSeries && !chartSeries.size) empty.textContent = 'Inga aktier visas i diagrammet.';
      else if (soloSeries) empty.textContent = 'Inga resultat för den solo-valda aktien.';
      else empty.textContent = 'Inga aktier med registrerade transaktioner.';
      container.append(empty);
      return;
    }
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Värdepapper</th><th>Antal</th><th>Kurs</th><th>GAV</th><th>Avkastn</th><th>Utdelning</th><th>Tot avkastn</th><th>Tot avkastn (%)</th><th>Orealiserat</th><th>Orealiserat (%)</th><th>Värde</th><th>Värde SEK</th><th></th></tr></thead>';
    const body = document.createElement('tbody');
    visibleRows.forEach(row => {
      const tr = document.createElement('tr');
      [row.name, row.quantity, row.price, row.gav, row.profitExDividend, row.dividend, row.profit, row.percent, row.unrealized, row.unrealizedPercent, row.value, row.valueSek].forEach((value, index) => {
        const td = document.createElement('td');
        td.textContent = value;
        if (index > 1) td.className = 'number';
        if (index === 2 && window.currentPriceTickers.has(row.ticker)) td.classList.add('current-price-updated');
        tr.append(td);
      });
      const actionCell = document.createElement('td');
      const updateButton = document.createElement('button');
      updateButton.type = 'button';
      updateButton.className = 'portfolio-row-update';
      updateButton.setAttribute('aria-label', `Uppdatera kurs och resultat för ${row.name}`);
      updateButton.title = `Uppdatera kurs och resultat för ${row.name}`;
      updateButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 0 0-12.8-3L4 12"/><path d="M4 17v-5h5"/><path d="M5 12a7 7 0 0 0 12.8 3L20 12"/></svg>';
      updateButton.addEventListener('click', () => window.updatePortfolioRow(row.ticker, updateButton));
      actionCell.append(updateButton);
      tr.append(actionCell);
      body.append(tr);
    });
    table.append(body);
    container.append(table);
    window.syncTransactionListHeight();
  };
  window.updatePortfolioRow = async function(ticker, button) {
    const originalMarkup = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Hämtar…';
    try {
      const response = await window.apiFetch('api/current-prices.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ticker}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kursen kunde inte hämtas.');
      const update = result.updates && result.updates[ticker];
      const traceIndices = window.stockTraceIndicesForTicker(ticker);
      if (!update || !traceIndices.length) throw new Error((result.warnings || []).join(' ') || 'Ingen aktuell kurs hittades.');
      // Kursen är densamma för alla konton med tickern.
      for (const traceIndex of traceIndices) {
        const trace = purchaseGraph.data[traceIndex];
        const x = Array.from(trace.x), y = Array.from(trace.y), customdata = Array.from(trace.customdata);
        const date = String(update.date).slice(0, 10), lastDate = String(x[x.length - 1]).slice(0, 10);
        const base = Number(window.stockGraphState.visibleBases[traceIndex]) || Number(customdata[0][0]);
        const point = [Number(update.price), update.customdata[1], 1.0, update.customdata[3]];
        if (date >= lastDate) {
          if (date === lastDate) {
            y[y.length - 1] = Number(update.price) / base * 100;
            customdata[customdata.length - 1] = point;
          } else {
            x.push(date); y.push(Number(update.price) / base * 100); customdata.push(point);
          }
          await Plotly.restyle(purchaseGraph, {x: [x], y: [y], customdata: [customdata]}, [traceIndex]);
        } else {
          const pointIndex = x.findIndex(value => String(value).slice(0, 10) === date);
          if (pointIndex < 0) throw new Error('Kursen är äldre än diagrammets data.');
          y[pointIndex] = Number(update.price) / base * 100;
          customdata[pointIndex] = point;
          await Plotly.restyle(purchaseGraph, {y: [y], customdata: [customdata]}, [traceIndex]);
        }
      }
      const axisRange = purchaseGraph._fullLayout.xaxis.range.map(toIsoDate);
      const rangeEnd = [axisRange[1], stockholmToday()].sort().at(-1);
      allowedEndDate = rangeEnd > allowedEndDate ? rangeEnd : allowedEndDate;
      if (rangeEnd !== axisRange[1]) {
        await Plotly.relayout(purchaseGraph, {
          'xaxis.range': [axisRange[0], rangeEnd],
          'xaxis.rangeslider.range': [allowedStartDate, rangeEnd],
        });
      }
      window.rebaseVisibleStockGraph({});
      if (window.syncVisibleDateInputs) window.syncVisibleDateInputs();
      window.currentPriceTickers.add(ticker);
      window.renderPortfolioSummary();
      traceIndices.forEach(index => window.refreshProfitLabel(purchaseGraph.data[index].meta.series));
      button.title = `Kurs och resultat för ${ticker} uppdaterade`;
    } catch (error) {
      button.title = error.message;
    } finally {
      setTimeout(() => {
        if (button.isConnected) { button.innerHTML = originalMarkup; button.disabled = false; }
      }, 1800);
    }
  };
  window.syncTransactionListHeight = function() {
    const list = document.getElementById('purchase-list-content');
    if (!list) return;
    placeTransactionList();
    // Rubrikraden och tio transaktionsrader; bredvid Resultat minst lika hög som Resultat.
    const header = list.querySelector('thead');
    const firstRow = list.querySelector('tbody tr');
    let height = header && firstRow
      ? header.getBoundingClientRect().height + 10 * firstRow.getBoundingClientRect().height + 1
      : 320;
    const summaryTable = document.querySelector('#portfolio-summary-content table');
    if (transactionTables.classList.contains('side-by-side') && summaryTable) {
      height = Math.max(height, summaryTable.getBoundingClientRect().height);
    }
    list.style.maxHeight = `${Math.ceil(height)}px`;
  };
  // Transaktioner till höger om Resultat när båda tabellerna ryms i full bredd, annars under.
  // Tabellerna mäts utan breddgräns, så mätningen beror inte på vilken layout som gäller just nu.
  const fullWidth = table => {
    if (!table) return 0;
    const previous = table.style.maxWidth;
    table.style.maxWidth = 'none';
    const width = table.getBoundingClientRect().width;
    table.style.maxWidth = previous;
    return width;
  };
  function placeTransactionList() {
    const summaryWidth = fullWidth(document.querySelector('#portfolio-summary-content table'));
    const listWidth = fullWidth(document.querySelector('#purchase-list-content table'));
    const gap = 24;
    const fits = summaryWidth > 0 && listWidth > 0 && summaryWidth + gap + listWidth <= transactionTables.clientWidth;
    transactionTables.classList.toggle('side-by-side', fits);
  }
  window.addEventListener('resize', () => requestAnimationFrame(window.syncTransactionListHeight));
  window.renderPurchaseList();
  window.renderPortfolioSummary();
  // Legenden ritades innan resultaten fanns; rita om så att sorteringen Total % får sina värden.
  if (window.renderCustomLegend) window.renderCustomLegend();
  document.getElementById('filter-solo-lists').addEventListener('change', () => {
    window.renderPurchaseList();
    window.renderPortfolioSummary();
  });
  document.getElementById('filter-chart-lists').addEventListener('change', () => {
    window.renderPurchaseList();
    window.renderPortfolioSummary();
  });
  const importEventsButton = document.getElementById('import-events-button');
  const importEventsFile = document.getElementById('import-events-file');
  const importAccount = document.getElementById('import-account');
  const importEventsStatus = document.getElementById('import-events-status');
  const toggleDividendsButton = document.getElementById('toggle-dividends-button');
  toggleDividendsButton.addEventListener('click', () => {
    hideDividendTransactions = !hideDividendTransactions;
    toggleDividendsButton.textContent = hideDividendTransactions ? 'Visa utdelningar' : 'Dölj utdelningar';
    window.renderPurchaseList();
  });
  const showUnmappedButton = document.getElementById('show-unmapped-button');
  const unmappedRowsDialog = document.getElementById('unmapped-rows-dialog');
  const unmappedRowsContent = document.getElementById('unmapped-rows-content');
  document.getElementById('close-unmapped-dialog').addEventListener('click', () => unmappedRowsDialog.close());
  showUnmappedButton.addEventListener('click', () => unmappedRowsDialog.showModal());
  function showUnmappedRows(headers, rows) {
    unmappedRowsContent.replaceChildren();
    if (!rows.length) {
      showUnmappedButton.hidden = true;
      return;
    }
    const table = document.createElement('table');
    const allHeaders = ['Källrad', 'Orsak', ...headers];
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    allHeaders.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.append(th);
    });
    thead.append(headerRow);
    const tbody = document.createElement('tbody');
    rows.forEach(row => {
      const tr = document.createElement('tr');
      [row.row_number, row.reason, ...(row.cells || [])].forEach(value => {
        const td = document.createElement('td');
        td.textContent = String(value ?? '');
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    unmappedRowsContent.append(table);
    showUnmappedButton.textContent = `Visa ${rows.length} omappade rader`;
    showUnmappedButton.hidden = false;
  }
  const importPreviewActions = document.getElementById('import-preview-actions');
  const importConfirmButton = document.getElementById('import-confirm-button');
  const importCancelButton = document.getElementById('import-cancel-button');
  let importPreviewId = null;
  function endImportPreview() {
    importPreviewId = null;
    importPreviewActions.hidden = true;
    importEventsButton.disabled = false;
    importEventsFile.disabled = false;
    importAccount.disabled = false;
  }
  importEventsButton.addEventListener('click', async () => {
    const selectedFile = importEventsFile.files && importEventsFile.files[0];
    const account = importAccount.value.trim().toUpperCase();
    showUnmappedButton.hidden = true;
    if (!selectedFile) {
      importEventsStatus.textContent = 'Välj mäklarens exportfil innan du importerar.';
      return;
    }
    if (!/^[A-Z]$/.test(account)) {
      importEventsStatus.textContent = 'Ange kontot som importen gäller, en bokstav A–Z.';
      return;
    }
    importEventsButton.disabled = true;
    importEventsStatus.textContent = 'Förhandsgranskar transaktioner…';
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('account', account);
      const response = await window.apiFetch('api/import.php?step=preview', {method: 'POST', body: form});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Förhandsgranskningen misslyckades.');
      showUnmappedRows(result.source_headers || [], result.unmapped_rows || []);
      importEventsStatus.textContent = `Förhandsgranskning för konto ${result.account}: ${result.converted} konverterbara transaktioner, ${result.duplicates} dubbletter, ${result.new} nya rader, ${result.warning_count} varningar.`;
      if (result.new > 0) {
        importEventsStatus.textContent += ' Inget är sparat ännu.';
        importPreviewId = result.preview_id;
        importPreviewActions.hidden = false;
        importEventsFile.disabled = true;
        importAccount.disabled = true;
      } else {
        importEventsStatus.textContent += ' Det finns inget nytt att importera.';
        importEventsButton.disabled = false;
      }
    } catch (error) {
      importEventsStatus.textContent = error.message;
      importEventsButton.disabled = false;
    }
  });
  importCancelButton.addEventListener('click', async () => {
    const previewId = importPreviewId;
    endImportPreview();
    importEventsStatus.textContent = 'Importen avbröts. Inga transaktioner sparades.';
    try {
      await window.apiFetch('api/import.php?step=cancel', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({preview_id: previewId}),
      });
    } catch (error) {
      // Förhandsgranskningen upphör ändå med sessionen.
    }
  });
  importConfirmButton.addEventListener('click', async () => {
    importConfirmButton.disabled = true;
    importCancelButton.disabled = true;
    importEventsStatus.textContent = 'Importerar transaktioner…';
    try {
      const response = await window.apiFetch('api/import.php?step=confirm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({preview_id: importPreviewId}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Importen misslyckades.');
      endImportPreview();
      importEventsFile.value = '';
      const notShownCount = Number(result.added || 0) - (result.markers || []).length;
      const importedText = `${result.added} nya händelser importerade på konto ${result.account}; ${result.duplicates} dubbletter hoppades över.${notShownCount > 0 ? ` ${notShownCount} händelser kunde inte visas i diagrammet.` : ''}`
        + (result.warning_count ? ` ${result.warning_count} källrader kunde inte mappas.` : '');
      // Nya värdepapper (ett nytt konto) ritas efter omladdning.
      if ((result.markers || []).some(marker => window.stockGraphState.stockTraceBySeries[marker.series] === undefined)) {
        window.reloadWithStatus('import-events-status', importedText);
        return;
      }
      const grouped = new Map();
      (result.markers || []).forEach(marker => {
        const stockIndex = window.stockGraphState.stockTraceBySeries[marker.series];
        if (stockIndex === undefined) return;
        const purchaseIndex = purchaseGraph.data.findIndex(trace =>
          trace.meta && trace.meta.role === 'purchase' && trace.meta.series === marker.series
        );
        if (purchaseIndex < 0) return;
        const base = Number(window.stockGraphState.visibleBases[stockIndex]) || Number(purchaseGraph.data[stockIndex].customdata[0][0]);
        if (!grouped.has(purchaseIndex)) grouped.set(purchaseIndex, {x: [], y: [], customdata: [], symbols: []});
        const points = grouped.get(purchaseIndex);
        points.x.push(marker.date);
        // Händelser före aktiens första kurs ritas inte i diagrammet.
        points.y.push(marker.chart_price === null ? null : marker.chart_price / base * 100);
        points.customdata.push([marker.chart_price, marker.price, marker.quantity, marker.ticker, marker.currency, marker.commission, marker.transaction_type, marker.sek_fx_rate, marker.ticker_fx_rate, marker.amount_currency, marker.time || '', marker.row_key || '', marker.account]);
        points.symbols.push(marker.transaction_type === 'UTDELNING' ? 'diamond' : (marker.transaction_type === 'KÖP' ? 'circle' : 'triangle-down'));
      });
      for (const [traceIndex, points] of grouped) {
        await Plotly.extendTraces(purchaseGraph, {
          x: [points.x], y: [points.y], customdata: [points.customdata], 'marker.symbol': [points.symbols],
        }, [traceIndex]);
      }
      new Set((result.markers || []).map(marker => marker.series)).forEach(series => window.refreshProfitLabel(series, false));
      window.renderCustomLegend();
      window.renderPurchaseList();
      window.renderPortfolioSummary();
      window.rebaseVisibleStockGraph({});
      importEventsStatus.textContent = importedText;
    } catch (error) {
      importEventsStatus.textContent = error.message;
    } finally {
      importConfirmButton.disabled = false;
      importCancelButton.disabled = false;
    }
  });
  currentPriceButton.addEventListener('click', async () => {
    currentPriceButton.disabled = true;
    refreshStatus.textContent = 'Hämtar senaste tillgängliga intradagskurser…';
    try {
      const response = await window.apiFetch('api/current-prices.php', {method: 'POST'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Aktuella kurser kunde inte hämtas.');
      const updates = [];
      let latestDate = '';
      Object.entries(result.updates || {}).forEach(([ticker, update]) => window.stockTraceIndicesForTicker(ticker).forEach(traceIndex => {
        const trace = purchaseGraph.data[traceIndex];
        const x = Array.from(trace.x);
        const y = Array.from(trace.y);
        const customdata = Array.from(trace.customdata);
        const date = String(update.date).slice(0, 10);
        const lastDate = String(x[x.length - 1]).slice(0, 10);
        if (!date || date < lastDate) return;
        const base = Number(window.stockGraphState.visibleBases[traceIndex]) || Number(customdata[0][0]);
        const point = [Number(update.price), update.customdata[1], 1.0, update.customdata[3]];
        if (date === lastDate) {
          x[x.length - 1] = date;
          y[y.length - 1] = Number(update.price) / base * 100;
          customdata[customdata.length - 1] = point;
        } else {
          x.push(date);
          y.push(Number(update.price) / base * 100);
          customdata.push(point);
        }
        updates.push({ticker, series: trace.meta.series, traceIndex, x, y, customdata});
        if (date > latestDate) latestDate = date;
      }));
      if (!updates.length) {
        refreshStatus.textContent = 'Inga aktuella kurser kunde hämtas.';
      } else {
        await Promise.all(updates.map(update => Plotly.restyle(purchaseGraph, {
          x: [update.x], y: [update.y], customdata: [update.customdata],
        }, [update.traceIndex])));
        const axisRange = purchaseGraph._fullLayout.xaxis.range.map(toIsoDate);
        const rangeEnd = [latestDate, axisRange[1], stockholmToday()].sort().at(-1);
        allowedEndDate = rangeEnd > allowedEndDate ? rangeEnd : allowedEndDate;
        if (rangeEnd !== axisRange[1]) {
          const firstDate = purchaseGraph.data
            .filter(trace => trace.meta && trace.meta.role === 'stock')
            .reduce((first, trace) => String(trace.x[0]).slice(0, 10) < first ? String(trace.x[0]).slice(0, 10) : first, '9999-12-31');
          await Plotly.relayout(purchaseGraph, {
            'xaxis.range': [axisRange[0], rangeEnd],
            'xaxis.rangeslider.range': [firstDate, rangeEnd],
          });
        }
        updates.forEach(update => window.currentPriceTickers.add(update.ticker));
        updates.forEach(update => window.refreshProfitLabel(update.series, false));
        window.renderCustomLegend();
        window.renderPortfolioSummary();
        window.rebaseVisibleStockGraph({});
        if (window.syncVisibleDateInputs) window.syncVisibleDateInputs();
        refreshStatus.textContent = `Aktuella kurser uppdaterade för ${new Set(updates.map(update => update.ticker)).size} aktier t.o.m. ${latestDate}.`;
      }
      if (result.warnings && result.warnings.length) refreshStatus.textContent += ` ${result.warnings.join(' ')}`;
    } catch (error) {
      refreshStatus.textContent = error.message;
    } finally {
      currentPriceButton.disabled = false;
    }
  });
  refreshDataButton.addEventListener('click', async () => {
    refreshDataButton.disabled = true;
    refreshDataStatus.textContent = 'Hämtar slutkurser från Yahoo Finance…';
    try {
      const response = await window.apiFetch('api/refresh.php', {method: 'POST'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kursdata kunde inte hämtas.');
      const indices = [];
      const payload = {x: [], y: [], customdata: []};
      const updatedSeries = [];
      const updatedTickers = new Set();
      let latestDate = '';
      Object.entries(result.updates || {}).forEach(([ticker, update]) => window.stockTraceIndicesForTicker(ticker).forEach(traceIndex => {
        if (!update.x || !update.x.length) return;
        const trace = purchaseGraph.data[traceIndex];
        const lastDate = String(trace.x[trace.x.length - 1]).slice(0, 10);
        const newPoints = update.x.map((date, index) => ({date, price: update.prices[index], customdata: update.customdata[index]}))
          .filter(point => String(point.date).slice(0, 10) > lastDate);
        if (!newPoints.length) return;
        const base = Number(window.stockGraphState.visibleBases[traceIndex]) || Number(trace.customdata[0][0]);
        indices.push(traceIndex);
        payload.x.push(newPoints.map(point => point.date));
        payload.y.push(newPoints.map(point => Number(point.price) / base * 100));
        payload.customdata.push(newPoints.map(point => point.customdata));
        updatedSeries.push(trace.meta.series);
        updatedTickers.add(ticker);
        latestDate = newPoints.reduce((latest, point) => String(point.date).slice(0, 10) > latest ? String(point.date).slice(0, 10) : latest, latestDate);
      }));
      if (indices.length) {
        await Plotly.extendTraces(purchaseGraph, payload, indices);
        const allStockTraces = purchaseGraph.data.filter(trace => trace.meta && trace.meta.role === 'stock');
        const firstDate = allStockTraces.reduce((first, trace) => String(trace.x[0]).slice(0, 10) < first ? String(trace.x[0]).slice(0, 10) : first, '9999-12-31');
        const lastDate = allStockTraces.reduce((last, trace) => String(trace.x[trace.x.length - 1]).slice(0, 10) > last ? String(trace.x[trace.x.length - 1]).slice(0, 10) : last, '0000-01-01');
        const axisRange = purchaseGraph._fullLayout.xaxis.range.map(toIsoDate);
        allowedEndDate = lastDate > allowedEndDate ? lastDate : allowedEndDate;
        await Plotly.relayout(purchaseGraph, {
          'xaxis.range': [axisRange[0], lastDate],
          'xaxis.rangeslider.range': [firstDate, lastDate],
        });
        updatedSeries.forEach(series => window.refreshProfitLabel(series, false));
        window.renderCustomLegend();
        window.renderPortfolioSummary();
        window.rebaseVisibleStockGraph({});
        if (window.syncVisibleDateInputs) window.syncVisibleDateInputs();
        refreshDataStatus.textContent = `${updatedTickers.size} aktier uppdaterade med slutkurser t.o.m. ${latestDate}.`;
      } else {
        refreshDataStatus.textContent = 'Inga senare slutkurser tillgängliga ännu.';
      }
      if (result.warnings && result.warnings.length) {
        refreshDataStatus.textContent += ` ${result.warnings.join(' ')}`;
      }
    } catch (error) {
      refreshDataStatus.textContent = error.message;
    } finally {
      refreshDataButton.disabled = false;
    }
  });
  purchaseForm.addEventListener('submit', async event => {
    event.preventDefault();
    const purchase = {
      transaction_type: document.getElementById('purchase-type').value,
      ticker: document.getElementById('purchase-ticker').value,
      date: document.getElementById('purchase-date').value,
      quantity: document.getElementById('purchase-quantity').value.trim(),
      price: document.getElementById('purchase-price').value.trim(),
      commission: document.getElementById('purchase-commission').value.trim(),
      time: document.getElementById('purchase-type').value === 'UTDELNING' ? '' : document.getElementById('purchase-time').value,
      account: document.getElementById('purchase-account').value.trim(),
    };
    purchaseStatus.textContent = 'Sparar transaktion…';
    try {
      const response = await window.apiFetch('api/purchases.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(purchase),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Transaktionen kunde inte sparas.');
      const savedText = result.transaction_type === 'UTDELNING'
        ? `${result.display_name}: utdelning ${result.date}, ${result.quantity} st à ${result.price} ${result.currency}, minus ${result.commission} ${result.currency} källskatt. Sparad i aktiekop.csv.`
        : `${result.display_name}: ${result.transaction_type.toLowerCase()} ${result.quantity} st ${result.date} för ${result.price} ${result.currency} + ${result.commission} ${result.currency} courtage. Sparat i aktiekop.csv.`;
      const markerIndex = purchaseGraph.data.findIndex(trace =>
        trace.meta && trace.meta.role === 'purchase' && trace.meta.series === result.series
      );
      const stockIndex = window.stockGraphState.stockTraceBySeries[result.series];
      // Första transaktionen på ett nytt konto ger ett nytt värdepapper, som ritas efter omladdning.
      if (markerIndex < 0 || stockIndex === undefined) {
        window.reloadWithStatus('purchase-status', savedText);
        return;
      }
      // Nya köp ska synas direkt även om aktien var dold i diagrammet.
      await Plotly.restyle(purchaseGraph, {visible: true}, [stockIndex, markerIndex]);
      const base = window.stockGraphState.visibleBases[stockIndex] || result.chart_price;
      await Plotly.extendTraces(purchaseGraph, {
        x: [[result.date]],
        y: [[result.chart_price / base * 100]],
        customdata: [[[result.chart_price, result.price, result.quantity, result.ticker, result.currency, result.commission, result.transaction_type, result.sek_fx_rate, result.ticker_fx_rate, result.amount_currency || '', result.time || '', result.row_key || '', result.account]]],
        'marker.symbol': [[result.transaction_type === 'UTDELNING' ? 'diamond' : (result.transaction_type === 'KÖP' ? 'circle' : 'triangle-down')]],
      }, [markerIndex]);
      // Räkna om y-värdena så att markeringen hamnar rätt även i avvikelseläget.
      if (window.rebaseVisibleStockGraph) window.rebaseVisibleStockGraph({});
      if (window.refreshProfitLabel) window.refreshProfitLabel(result.series);
      window.renderPurchaseList();
      window.renderPortfolioSummary();
      purchaseStatus.textContent = savedText;
      document.getElementById('purchase-quantity').value = '';
      document.getElementById('purchase-price').value = '';
      document.getElementById('purchase-time').value = '';
      document.getElementById('purchase-commission').value = '0,00';
      window.updatePurchaseTotal();
    } catch (error) {
      purchaseStatus.textContent = error.message;
    }
  });
};

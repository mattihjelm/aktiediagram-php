// Diagrammets beteende: indexering, legend, solo, hovring, jämförelser och datumintervall.
// Porterat oförändrat från Python-versionens post_script; anropas när Plotly har ritat figuren.
// Telefonlayout: smal skärm, eller pekskärm med låg höjd (telefon i liggande läge). Samma villkor som i app.css.
window.phoneLayoutQuery = window.matchMedia('(max-width: 600px), (pointer: coarse) and (max-height: 500px)');
// Skalvärden på axlarna i telefonlayout, som andel av Plotlys standardstorlek 12 px.
window.PHONE_TICK_SIZE = 12 * 0.3;

// Aktiens visningsvaluta (kr, USD, EUR) från servern, enligt ticker_currency i import-mapping.php.
window.stockCurrency = function(ticker) {
  const graph = document.querySelector('.plotly-graph-div');
  const currencies = graph && graph.layout && graph.layout.meta && graph.layout.meta.currencies;
  return (currencies && currencies[ticker]) || '';
};

window.initStockChart = function(graph) {
  let rebaseTimer;
  let firstComparisonPoint = null;
  const comparisons = [];
  let endpointLabels = [];
  // Ett värdepapper per ticker och konto (meta.series); meta.ticker är den riktiga tickern för kurser och valuta.
  const stockTraceBySeries = {};
  let highlightedSeries = null;
  graph.data.forEach((trace, index) => {
    if (trace.meta && trace.meta.role === 'stock') stockTraceBySeries[trace.meta.series] = index;
  });
  // Första värdepapperet med tickern, för formulärets aktieval som inte har något konto.
  const firstStockTraceForTicker = ticker => graph.data.findIndex(trace => trace.meta && trace.meta.role === 'stock' && trace.meta.ticker === ticker);
  const visibleBases = graph.data.map(trace => {
    if (trace.meta && trace.meta.role === 'purchase') return null;
    const firstRow = trace.customdata && trace.customdata[0];
    return Number(Array.isArray(firstRow) ? firstRow[0] : firstRow) || null;
  });
  window.stockGraphState = {visibleBases, stockTraceBySeries};

  // Skalläge: linear, log, ett mått (ma200, drawdown, change63) eller log_<mått>.
  let scaleMode = graph.layout.meta && graph.layout.meta.scale
    || (graph.layout.yaxis && graph.layout.yaxis.type === 'log' ? 'log' : 'linear');
  function parseScale(mode) {
    const log = mode === 'log' || mode.startsWith('log_');
    const measure = mode.startsWith('log_') ? mode.slice(4) : (mode === 'log' || mode === 'linear' ? null : mode);
    return {log, measure};
  }
  const currentMeasure = () => parseScale(scaleMode).measure;
  // Måttet ersätter kurvorna (utan logaritmisk skala).
  const measureOnly = () => !parseScale(scaleMode).log && currentMeasure() !== null;
  // Måttet visas som prickade kurvor ovanpå de logaritmiska.
  const measureOverlay = () => parseScale(scaleMode).log && currentMeasure() !== null;
  const validPrice = price => Number.isFinite(price) && price > 0;
  const MOVING_AVERAGE_DAYS = 200;
  const CHANGE_DAYS = 63;
  // Mått per dag över hela historiken, så att värdet inte beror på synligt intervall; null saknar värde.
  const MEASURES = {
    ma200: {
      title: 'Avvikelse från 200-dagars medel (%)',
      hoverLabel: 'Avvikelse',
      series(prices) {
        const series = new Array(prices.length).fill(null);
        let sum = 0;
        let invalid = 0;
        prices.forEach((price, index) => {
          const valid = validPrice(price);
          sum += valid ? price : 0;
          invalid += valid ? 0 : 1;
          if (index >= MOVING_AVERAGE_DAYS) {
            const dropped = prices[index - MOVING_AVERAGE_DAYS];
            sum -= validPrice(dropped) ? dropped : 0;
            invalid -= validPrice(dropped) ? 0 : 1;
          }
          if (index >= MOVING_AVERAGE_DAYS - 1 && invalid === 0 && valid) {
            series[index] = (price / (sum / MOVING_AVERAGE_DAYS) - 1) * 100;
          }
        });
        return series;
      },
    },
    drawdown: {
      title: 'Fall från tidigare topp (%)',
      hoverLabel: 'Fall från topp',
      series(prices) {
        let high = null;
        return prices.map(price => {
          if (!validPrice(price)) return null;
          high = high === null ? price : Math.max(high, price);
          return (price / high - 1) * 100;
        });
      },
    },
    change63: {
      title: 'Förändring över 3 månader (%)',
      hoverLabel: 'Förändring 3 mån',
      series(prices) {
        return prices.map((price, index) => {
          const earlier = prices[index - CHANGE_DAYS];
          return index >= CHANGE_DAYS && validPrice(price) && validPrice(earlier) ? (price / earlier - 1) * 100 : null;
        });
      },
    },
  };
  const measureCache = {};
  const rawPrice = row => Number(Array.isArray(row) ? row[0] : row);
  function measureSeries(traceIndex, measure = currentMeasure()) {
    const customdata = graph.data[traceIndex].customdata;
    const key = `${traceIndex}:${measure}`;
    const cached = measureCache[key];
    if (cached && cached.length === customdata.length) return cached;
    const series = MEASURES[measure].series(Array.from(customdata, rawPrice));
    measureCache[key] = series;
    return series;
  }
  // Måttet för aktiekurvan på datumet, eller närmast föregående handelsdag.
  function measureAt(traceIndex, date) {
    const xs = graph.data[traceIndex].x;
    const day = String(date).slice(0, 10);
    let low = 0;
    let high = xs.length - 1;
    let found = -1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      if (String(xs[middle]).slice(0, 10) <= day) {
        found = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return found < 0 ? null : measureSeries(traceIndex)[found];
  }
  // y-värde för en kurs på en aktiekurva i aktuellt skalläge.
  function yForPrice(curve, date, price) {
    if (measureOnly()) return measureAt(curve, date);
    const base = visibleBases[curve];
    return base ? price / base * 100 : null;
  }
  function clearLineHighlight() {
    if (!highlightedSeries) return;
    const index = stockTraceBySeries[highlightedSeries];
    highlightedSeries = null;
    if (index !== undefined) Plotly.restyle(graph, {'line.width': 2}, [index]);
  }
  function setLineHighlight(series, highlighted) {
    const index = stockTraceBySeries[series];
    if (index === undefined) return;
    if (highlighted) {
      if (highlightedSeries && highlightedSeries !== series) clearLineHighlight();
      highlightedSeries = series;
      Plotly.restyle(graph, {'line.width': 5}, [index]);
    } else if (highlightedSeries === series) {
      highlightedSeries = null;
      Plotly.restyle(graph, {'line.width': 2}, [index]);
    }
  }
  const traceIsVisible = graph.data.map(
    trace => trace.visible !== 'legendonly' && trace.visible !== false
  );
  let soloSeries = null;
  let soloVisibilitySnapshot = null;
  window.getSoloSeries = () => soloSeries;
  window.getVisibleSeries = () => Object.entries(stockTraceBySeries)
    .filter(([, index]) => graph.data[index].visible !== 'legendonly' && graph.data[index].visible !== false)
    .map(([series]) => series);
  let visibilitySaveQueue = Promise.resolve();
  // Värdepapper med konto sparas i aktievy.json, övriga i aktier.csv (servern avgör på nyckeln).
  function saveStockVisibility(series, visible) {
    visibilitySaveQueue = visibilitySaveQueue.then(async () => {
      const response = await window.apiFetch('api/stock-visibility.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({series, visible}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Visningsläget kunde inte sparas.');
    }).catch(error => {
      const status = document.getElementById('refresh-data-status');
      if (status) status.textContent = `Visningsläget kunde inte sparas: ${error.message}`;
    });
    return visibilitySaveQueue;
  }
  function refreshFilteredTables() {
    if (window.renderPurchaseList) window.renderPurchaseList();
    if (window.renderPortfolioSummary) window.renderPortfolioSummary();
  }
  // Jämförelser och en påbörjad jämförelse på kurvor som just dolts tas bort och kommer inte tillbaka.
  function dropHiddenComparisons() {
    const shown = curveNumber => graph.data[curveNumber].visible !== 'legendonly' && graph.data[curveNumber].visible !== false;
    const before = comparisons.length;
    for (let index = comparisons.length - 1; index >= 0; index--) {
      if (!shown(comparisons[index].curveNumber)) comparisons.splice(index, 1);
    }
    let changed = comparisons.length !== before;
    if (firstComparisonPoint && !shown(firstComparisonPoint.curveNumber)) {
      firstComparisonPoint = null;
      setComparisonHelp('Klicka på aktien för av/på. Klicka två punkter på samma kurva för jämförelse.');
      changed = true;
    }
    return changed ? Plotly.relayout(graph, comparisonOverlays()) : Promise.resolve();
  }
  function applyVisibility(visibility) {
    const indices = [];
    const values = [];
    graph.data.forEach((trace, index) => {
      const currentlyVisible = trace.visible !== 'legendonly' && trace.visible !== false;
      if (currentlyVisible !== visibility[index]) {
        indices.push(index);
        values.push(visibility[index] ? true : 'legendonly');
      }
    });
    if (!indices.length) {
      window.renderCustomLegend();
      return Promise.resolve();
    }
    return Plotly.restyle(
      graph,
      {visible: values},
      indices
    ).then(dropHiddenComparisons).then(() => {
      window.renderCustomLegend();
      if (isLogAxis()) refreshVisibleView();
    });
  }
  // Solo-värdepapperet sparas i aktievy.json och väljs igen vid nästa start; null när solo avslutas.
  function saveLastSolo(series) {
    if (!window.apiFetch) return;
    window.apiFetch('api/view-range.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({last_solo: series}),
    }).catch(error => console.warn('Senaste solo-aktie kunde inte sparas:', error));
  }
  function setSolo(series, checked) {
    if (checked) {
      if (!soloVisibilitySnapshot) {
        soloVisibilitySnapshot = graph.data.map(
          trace => trace.visible !== 'legendonly' && trace.visible !== false
        );
      }
      soloSeries = series;
      saveLastSolo(series);
      if (window.showIntraday) window.showIntraday(series);
      return applyVisibility(graph.data.map(
        trace => Boolean(trace.meta && trace.meta.series === series)
      )).then(refreshFilteredTables);
    }
    if (soloSeries === series && soloVisibilitySnapshot) {
      const previous = soloVisibilitySnapshot;
      soloSeries = null;
      soloVisibilitySnapshot = null;
      saveLastSolo(null);
      if (window.hideIntraday) window.hideIntraday();
      return applyVisibility(previous).then(refreshFilteredTables);
    }
  }
  function toggleSeries(series) {
    const stockIndex = stockTraceBySeries[series];
    if (stockIndex === undefined) return;
    const stockVisible = graph.data[stockIndex].visible !== 'legendonly' && graph.data[stockIndex].visible !== false;
    if (soloVisibilitySnapshot) {
      const previous = soloVisibilitySnapshot.slice();
      const next = !previous[stockIndex];
      soloVisibilitySnapshot = null;
      soloSeries = null;
      saveLastSolo(null);
      if (window.hideIntraday) window.hideIntraday();
      graph.data.forEach((trace, index) => {
        if (trace.meta && trace.meta.series === series) previous[index] = next;
      });
      updateSelectedGroup(series, next);
      return applyVisibility(previous)
        .then(() => saveStockVisibility(series, next))
        .then(refreshFilteredTables);
    }
    const indices = graph.data.map((trace, index) =>
      trace.meta && trace.meta.series === series ? index : -1
    ).filter(index => index >= 0);
    updateSelectedGroup(series, !stockVisible);
    return Plotly.restyle(
      graph,
      {visible: indices.map(() => stockVisible ? 'legendonly' : true)},
      indices
    ).then(dropHiddenComparisons).then(() => saveStockVisibility(series, !stockVisible)).then(() => {
      window.renderCustomLegend();
      if (isLogAxis()) refreshVisibleView();
      refreshFilteredTables();
    });
  }
  // Listans ordning: aktier.csv (none), namn (name), högst procent per månad (monthly), högst total avkastning i SEK (total)
  // eller högst total avkastning i procent som i Resultat (total_percent) först, eller den sparade gruppen valda värdepapper
  // överst (selected).
  const LEGEND_SORTS = [['none', 'Osorterad'], ['name', 'Namn'], ['monthly', '%/mån'], ['total', 'Total'], ['total_percent', 'Total %'], ['selected', 'Valda']];
  let legendSort = LEGEND_SORTS.some(([key]) => key === (graph.layout.meta && graph.layout.meta.legendSort))
    ? graph.layout.meta.legendSort : 'none';
  // Gruppen för Valda i den ordning värdepapperen lades till; null tills Valda väljs första gången.
  let legendSelected = Array.isArray(graph.layout.meta && graph.layout.meta.legendSelected)
    ? graph.layout.meta.legendSelected.slice() : null;
  function saveLegendView(changes) {
    if (!window.apiFetch) return;
    window.apiFetch('api/view-range.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(changes),
    }).catch(error => console.warn('Sorteringen kunde inte sparas:', error));
  }
  function setLegendSort(sort) {
    const changes = {legend_sort: sort};
    // Första gången blir gruppen de värdepapper som visas, i listans nuvarande ordning.
    if (sort === 'selected' && legendSelected === null) {
      legendSelected = legendEntries()
        .filter(([, index]) => graph.data[index].visible !== 'legendonly' && graph.data[index].visible !== false)
        .map(([series]) => series);
      changes.legend_selected = legendSelected;
    }
    legendSort = sort;
    window.renderCustomLegend();
    saveLegendView(changes);
  }
  // Medan Valda är vald läggs ett värdepapper som visas sist i gruppen och ett som döljs tas bort; annars ändras inget.
  function updateSelectedGroup(series, visible) {
    if (legendSort !== 'selected' || legendSelected === null) return;
    const before = legendSelected.length;
    legendSelected = legendSelected.filter(key => key !== series);
    if (visible) legendSelected.push(series);
    if (visible || legendSelected.length !== before) saveLegendView({legend_selected: legendSelected});
  }
  function legendEntries() {
    const entries = Object.entries(stockTraceBySeries);
    if (legendSort === 'selected' && legendSelected !== null) {
      const selected = legendSelected.filter(series => stockTraceBySeries[series] !== undefined);
      return [
        ...selected.map(series => [series, stockTraceBySeries[series]]),
        ...entries.filter(([series]) => !selected.includes(series)),
      ];
    }
    if (legendSort === 'name') {
      return entries.slice().sort(([, a], [, b]) =>
        graph.data[a].meta.displayName.localeCompare(graph.data[b].meta.displayName, 'sv'));
    }
    if (legendSort === 'monthly' || legendSort === 'total' || legendSort === 'total_percent') {
      const key = legendSort === 'monthly' ? 'monthlyPercent' : 'totalSek';
      // Total % räknas i panel.js som kolumnen Tot avkastn (%); innan den finns saknar alla värde.
      const monthly = index => {
        const value = legendSort !== 'total_percent' ? graph.data[index].meta[key]
          : window.totalReturnPercent ? window.totalReturnPercent(graph.data[index].meta.series) : null;
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
      };
      // Array.prototype.sort är stabil, så lika värden och aktier utan värde behåller aktier.csv-ordningen.
      return entries.slice().sort(([, a], [, b]) => {
        const left = monthly(a);
        const right = monthly(b);
        if (left === null || right === null) return (left === null) - (right === null);
        return right - left;
      });
    }
    return entries;
  }
  // Rubriken med sorteringsknappar och sökfält byggs en gång, så att sökfältet behåller text och fokus
  // när listan ritas om; därefter uppdateras bara knapparnas markering och raderna.
  let legendHeader = null;
  const sortButtons = new Map();
  let searchField = null;
  function buildLegendHeader() {
    const header = document.createElement('div');
    header.className = 'stock-legend-header';
    const soloHeading = document.createElement('span');
    soloHeading.textContent = 'Solo';
    const stockHeading = document.createElement('span');
    stockHeading.textContent = 'Värdepapper / resultat';
    const help = document.createElement('span');
    help.className = 'stock-legend-help';
    help.id = 'stock-legend-help';
    help.textContent = 'Klicka på aktien för av/på. Klicka två punkter på samma kurva för jämförelse.';
    const sortGroup = document.createElement('div');
    sortGroup.className = 'stock-legend-sort';
    sortGroup.setAttribute('role', 'group');
    sortGroup.setAttribute('aria-label', 'Sortera värdepapperslistan');
    LEGEND_SORTS.forEach(([key, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => { if (legendSort !== key) setLegendSort(key); });
      sortButtons.set(key, button);
      sortGroup.append(button);
    });
    // Sökningen filtrerar bara listans rader; den sparas inte och påverkar inte kurvor eller tabeller.
    const searchLabel = document.createElement('label');
    searchLabel.className = 'stock-legend-search';
    const searchText = document.createElement('span');
    searchText.textContent = 'Sök värdepapper';
    searchField = document.createElement('input');
    searchField.type = 'search';
    searchField.id = 'stock-legend-search';
    searchField.autocomplete = 'off';
    searchField.addEventListener('input', () => window.renderCustomLegend());
    searchLabel.append(searchText, searchField);
    header.append(help, sortGroup, searchLabel, soloHeading, stockHeading);
    return header;
  }
  window.renderCustomLegend = function() {
    const container = document.getElementById('stock-custom-legend');
    if (!container) return;
    clearLineHighlight();
    if (!legendHeader) legendHeader = buildLegendHeader();
    sortButtons.forEach((button, key) => button.setAttribute('aria-pressed', String(legendSort === key)));
    if (legendHeader.parentNode !== container) container.prepend(legendHeader);
    while (legendHeader.nextSibling) legendHeader.nextSibling.remove();
    const query = searchField.value.trim().toLocaleLowerCase('sv');
    const entries = legendEntries().filter(([, index]) =>
      !query || graph.data[index].meta.displayName.toLocaleLowerCase('sv').includes(query));
    if (query && !entries.length) {
      const empty = document.createElement('p');
      empty.className = 'stock-legend-empty';
      empty.textContent = 'Inga värdepapper matchar sökningen.';
      container.append(empty);
    }
    entries.forEach(([series, index]) => {
      const trace = graph.data[index];
      const row = document.createElement('div');
      const visible = trace.visible !== 'legendonly' && trace.visible !== false;
      row.className = `stock-legend-row${visible ? '' : ' is-hidden'}`;
      const solo = document.createElement('input');
      solo.type = 'checkbox';
      solo.checked = soloSeries === series;
      solo.setAttribute('aria-label', `Visa endast ${trace.meta.displayName}`);
      solo.addEventListener('change', () => setSolo(series, solo.checked));
      const nameButton = document.createElement('button');
      nameButton.type = 'button';
      nameButton.className = 'stock-legend-name';
      nameButton.addEventListener('click', () => toggleSeries(series));
      nameButton.addEventListener('pointerenter', () => setLineHighlight(series, true));
      nameButton.addEventListener('pointerleave', () => setLineHighlight(series, false));
      nameButton.append(document.createTextNode(trace.meta.displayName));
      if (trace.meta.profitLabel) {
        const profit = document.createElement('span');
        profit.className = 'stock-legend-profit';
        profit.textContent = trace.meta.profitLabel;
        nameButton.append(profit);
      }
      row.append(solo, nameButton);
      container.append(row);
    });
  };
  window.suggestPurchasePrice = function() {
    const tickerField = document.getElementById('purchase-ticker');
    const dateField = document.getElementById('purchase-date');
    if (!tickerField || !dateField) return;
    if (document.getElementById('purchase-type').value === 'UTDELNING') return;
    const ticker = tickerField.value;
    const selectedDate = dateField.value;
    const traceIndex = firstStockTraceForTicker(ticker);
    if (!selectedDate || traceIndex < 0) {
      document.getElementById('purchase-price').value = '';
      if (window.updatePurchaseTotal) window.updatePurchaseTotal();
      return;
    }
    const trace = graph.data[traceIndex];
    let priceIndex = -1;
    trace.x.forEach((value, index) => {
      if (String(value).slice(0, 10) <= selectedDate) priceIndex = index;
    });
    if (priceIndex < 0) {
      document.getElementById('purchase-price').value = '';
      if (window.updatePurchaseTotal) window.updatePurchaseTotal();
      return;
    }
    const row = trace.customdata[priceIndex];
        const rawPrice = Number(Array.isArray(row) ? row[0] : row);
        const fxFactor = Array.isArray(row) ? Number(row[2] || 1) : 1;
        const price = rawPrice * fxFactor;
    if (Number.isFinite(price) && price > 0) {
      document.getElementById('purchase-price').value = price.toLocaleString('sv-SE', {useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (window.updateSuggestedCommission) window.updateSuggestedCommission();
      if (window.updatePurchaseTotal) window.updatePurchaseTotal();
    }
  };
  const swedishNumber = value => Number(value).toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  function refreshProfitLabel(series, render = true) {
    const stockIndex = stockTraceBySeries[series];
    if (stockIndex === undefined) return;
    const stockTrace = graph.data[stockIndex];
    const ticker = stockTrace.meta.ticker;
    const purchaseIndex = graph.data.findIndex(trace =>
      trace.meta && trace.meta.role === 'purchase' && trace.meta.series === series
    );
    const purchaseTrace = purchaseIndex < 0 ? null : graph.data[purchaseIndex];
    const latestRow = stockTrace.customdata[stockTrace.customdata.length - 1];
    const currentRawPrice = Number(Array.isArray(latestRow) ? latestRow[0] : latestRow);
    const currentFxFactor = Array.isArray(latestRow) ? Number(latestRow[2] || 1) : 1;
    const currentPrice = currentRawPrice * currentFxFactor;
    // Räkna hela dagar i UTC, som Python-versionen; kursdatum utan tidszon tolkas annars som lokal tid.
    const dayTime = value => Date.parse(`${String(value).slice(0, 10)}T00:00:00Z`);
    const latestDate = dayTime(stockTrace.x[stockTrace.x.length - 1]);
    let invested = 0;
    let profit = 0;
    let heldQuantity = 0;
    let capitalMonths = 0;
    if (purchaseTrace) {
      purchaseTrace.x.forEach((purchaseDate, index) => {
        const details = purchaseTrace.customdata[index];
        const purchasePrice = Number(String(details[1]).replace(/\s/g, '').replace(',', '.'));
        const enteredQuantity = Number(String(details[2]).replace(/\s/g, '').replace(',', '.'));
        const quantity = ticker === 'SIRI' && String(purchaseDate).slice(0, 10) < '2024-09-10'
          ? enteredQuantity / 10
          : enteredQuantity;
        const commission = Number(String(details[5] || '0').replace(/\s/g, '').replace(',', '.'));
        const transactionType = details[6] || 'KÖP';
        if (!(enteredQuantity > 0) || (transactionType === 'UTDELNING' ? purchasePrice === 0 : purchasePrice <= 0)) return;
        const fee = Number.isFinite(commission) ? commission : 0;
        if (transactionType === 'UTDELNING') {
          const amountFx = Number(details[7]);
          const tickerFx = Number(details[8]);
          if (Number.isFinite(amountFx) && amountFx > 0 && Number.isFinite(tickerFx) && tickerFx > 0) {
            profit += (purchasePrice * enteredQuantity - fee) * amountFx / tickerFx;
          }
        } else if (transactionType === 'SÄLJ') {
          heldQuantity -= quantity;
          profit += purchasePrice * enteredQuantity - fee;
        } else {
          const cost = purchasePrice * enteredQuantity + fee;
          invested += cost;
          heldQuantity += quantity;
          profit -= cost;
          const months = Math.max(0, (latestDate - dayTime(purchaseDate)) / (86400000 * 30.4375));
          capitalMonths += cost * months;
        }
      });
    }
    if (!(invested > 0)) return;
    profit += currentPrice * heldQuantity;
    const currency = window.stockCurrency(ticker);
    const monthlyProfit = capitalMonths > 0 ? profit * invested / capitalMonths : null;
    const monthlyPercent = monthlyProfit === null ? null : monthlyProfit / invested * 100;
    const signed = value => `${value > 0 ? '+' : ''}${swedishNumber(value)}`;
    // Årsavkastning med ränta på ränta ur månadsavkastningen; saknas vid −100 % eller lägre.
    const annualPercent = monthlyPercent !== null && monthlyPercent > -100
      ? (Math.pow(1 + monthlyPercent / 100, 12) - 1) * 100
      : null;
    const monthText = monthlyProfit === null
      ? '—/mån'
      : `${signed(monthlyProfit)} ${currency}/mån · ${signed(monthlyPercent)}%/mån`
        + (annualPercent === null ? '' : ` · ${signed(annualPercent)}%/år`);
    // Totalavkastningen sist, i tusental med en decimal: kkr för kronor, annars k + valutakod.
    const thousands = Math.round(profit / 100) / 10 || 0;
    const thousandsText = `${thousands > 0 ? '+' : ''}${thousands.toLocaleString('sv-SE', {minimumFractionDigits: 1, maximumFractionDigits: 1})} k${currency}`;
    stockTrace.meta.profitLabel = `${monthText} · ${thousandsText}`;
    stockTrace.meta.monthlyPercent = monthlyPercent;
    // Total avkastning i SEK med senaste valutakurs, så att sorteringen kan jämföra kronor, USD och EUR.
    const sekRate = Array.isArray(latestRow) ? Number(latestRow[3]) : NaN;
    stockTrace.meta.totalSek = Number.isFinite(sekRate) && sekRate > 0 ? profit * sekRate
      : (currency === 'kr' ? profit : null);
    if (render) window.renderCustomLegend();
  }
  window.refreshProfitLabel = refreshProfitLabel;
  // Logaritmisk skala: varje aktie och dess transaktioner får en egen dold logaritmisk y-axel
  // med gemensamt spann men egen nivå. Plotly anger axelintervall och annoteringar i log10-enheter
  // på logaritmisk axel; former tar datavärden. Första aktien använder huvudaxeln, som de övriga
  // axlarna överlagrar; Plotly behåller bara axlar som någon kurva använder.
  const axisKeyBySeries = {};
  Object.keys(stockTraceBySeries).forEach((series, position) => {
    axisKeyBySeries[series] = position === 0 ? 'yaxis' : `yaxis${position + 1}`;
  });
  const linearYAxisTitle = graph.layout.yaxis && graph.layout.yaxis.title && graph.layout.yaxis.title.text;

  // Logaritmisk skala med ett mått: en tunn prickad måttkurva per aktie mot en synlig
  // vänsteraxel efter aktieaxlarna. Kurvorna läggs sist en gång, så befintliga index ändras inte,
  // och har meta.of i stället för meta.series så att solo och visa/dölj inte rör dem.
  const measureAxisKey = `yaxis${Object.keys(stockTraceBySeries).length + 1}`;
  const measureTraceByStock = {};
  Plotly.relayout(graph, {[measureAxisKey]: {
    // tickmode auto: annars synkar Plotly skalstrecken med den logaritmiska huvudaxeln.
    overlaying: 'y', side: 'left', type: 'linear', tickmode: 'auto', visible: false, showgrid: false, zeroline: false,
    ticksuffix: ' %', title: {text: MEASURES.ma200.title},
  }});
  const measureTraces = Object.entries(stockTraceBySeries).map(([series, stockIndex]) => {
    const stock = graph.data[stockIndex];
    const color = graph._fullData && graph._fullData[stockIndex] && graph._fullData[stockIndex].line.color;
    return {
      // Startvärden krävs: Plotly kan inte rita en synlig axel vars kurvor alla saknar data.
      type: stock.type, mode: 'lines', x: Array.from(stock.x), y: measureSeries(stockIndex, 'ma200'),
      yaxis: axisRef(measureAxisKey), visible: false, showlegend: false,
      line: {color, width: 1, dash: 'dot'},
      meta: {role: 'measure', of: series, name: stock.meta.displayName || series},
    };
  });
  Object.keys(stockTraceBySeries).forEach((series, position) => {
    measureTraceByStock[stockTraceBySeries[series]] = graph.data.length + position;
  });
  Plotly.addTraces(graph, measureTraces);
  // Mått som måttkurvorna senast fick värden och hovertext för.
  let overlayMeasure = null;
  // Måttkurvan syns exakt när logaritmisk skala och ett mått är valda och aktien visas;
  // värden, hovertext och axelrubrik följer valt mått och nya kurser.
  // Anropen till Plotly görs i tur och ordning; samtidiga anrop mot samma diagram kan lämna det i fel tillstånd.
  async function syncMeasureTraces() {
    const measure = measureOverlay() ? currentMeasure() : null;
    const entries = Object.entries(measureTraceByStock).filter(([, measureIndex]) => graph.data[measureIndex]);
    if (measure) {
      const stale = entries.filter(([stockIndex, measureIndex]) =>
        measure !== overlayMeasure || graph.data[measureIndex].x.length !== graph.data[stockIndex].x.length);
      if (stale.length) {
        overlayMeasure = measure;
        await Plotly.update(graph, {
          x: stale.map(([stockIndex]) => Array.from(graph.data[stockIndex].x)),
          y: stale.map(([stockIndex]) => measureSeries(Number(stockIndex), measure)),
          hovertemplate: stale.map(([, measureIndex]) =>
            `${graph.data[measureIndex].meta.name} ${MEASURES[measure].hoverLabel.toLowerCase()}: %{y:+.1f} %<extra></extra>`),
        }, {[`${measureAxisKey}.title.text`]: MEASURES[measure].title}, stale.map(([, measureIndex]) => measureIndex));
      }
    }
    const indices = [];
    const visible = [];
    entries.forEach(([stockIndex, measureIndex]) => {
      const stock = graph.data[stockIndex];
      const shouldShow = measure !== null && stock.visible !== 'legendonly' && stock.visible !== false;
      if (shouldShow !== (graph.data[measureIndex].visible === true)) {
        indices.push(measureIndex);
        visible.push(shouldShow);
      }
    });
    if (indices.length) await Plotly.restyle(graph, {visible}, indices);
  }

  function isLogAxis() {
    return Boolean(graph.layout.yaxis && graph.layout.yaxis.type === 'log');
  }
  function axisKeyFor(curveNumber) {
    const trace = graph.data[curveNumber];
    return isLogAxis() && trace && trace.meta && axisKeyBySeries[trace.meta.series] || 'yaxis';
  }
  function axisRef(axisKey) {
    return axisKey.replace('axis', '');
  }
  function axisRange(axisKey, targetRanges) {
    const fullAxis = graph._fullLayout && graph._fullLayout[axisKey];
    return targetRanges && targetRanges[axisKey] || fullAxis && fullAxis.range || [0, 100];
  }
  function toAxis(value) {
    return isLogAxis() ? Math.log10(value) : value;
  }
  function fitYRange(values) {
    const axisValues = values.map(toAxis).filter(Number.isFinite);
    if (!axisValues.length) return null;
    const min = Math.min(...axisValues);
    const max = Math.max(...axisValues);
    const padding = Math.max((max - min) * 0.05, isLogAxis() ? 0.01 : 1);
    return [min - padding, max + padding];
  }
  function comparisonOverlays(targetRanges) {
    const shapes = [];
    const annotations = [];
    const plotHeight = graph._fullLayout && graph._fullLayout._size.h || 600;
    const endpointSlots = endpointLabels.map(label => {
      const yRange = axisRange(axisKeyFor(label.curveNumber), targetRanges);
      return {...label, pixel: (yRange[1] - toAxis(label.y)) / (yRange[1] - yRange[0]) * plotHeight};
    // Vid byte från ett mått till logaritmisk skala kan kurvan ännu ha negativa måttvärden;
    // log10 ger då NaN, och en etikett utan position får Plotly att krascha. Den ritas vid omräkningen.
    }).filter(label => Number.isFinite(label.pixel)).sort((a, b) => a.pixel - b.pixel);
    const labelGap = Math.min(17, (plotHeight - 16) / Math.max(1, endpointSlots.length - 1));
    endpointSlots.forEach((label, index) => {
      label.slot = Math.max(label.pixel, index === 0 ? 8 : endpointSlots[index - 1].slot + labelGap);
    });
    if (endpointSlots.length) {
      const overflow = endpointSlots[endpointSlots.length - 1].slot - (plotHeight - 8);
      if (overflow > 0) endpointSlots.forEach(label => { label.slot -= overflow; });
      const underflow = 8 - endpointSlots[0].slot;
      if (underflow > 0) endpointSlots.forEach(label => { label.slot += underflow; });
    }
    endpointSlots.forEach(label => {
      annotations.push({
        x: label.x,
        y: toAxis(label.y),
        xref: 'x',
        yref: axisRef(axisKeyFor(label.curveNumber)),
        text: label.name,
        showarrow: true,
        arrowhead: 0,
        arrowcolor: '#222',
        arrowwidth: 1,
        // Inne i diagramytan, till vänster om kurvans slutpunkt.
        ax: -10,
        ay: label.slot - label.pixel,
        xanchor: 'right',
        bgcolor: 'rgba(255,255,255,0.85)',
        borderwidth: 0,
        borderpad: 1,
        font: {color: '#222', size: 11},
        captureevents: false,
      });
    });
    if (measureOnly() || measureOverlay()) {
      const yref = measureOnly() ? 'y' : axisRef(measureAxisKey);
      shapes.push({type: 'line', xref: 'paper', x0: 0, x1: 1, yref, y0: 0, y1: 0, line: {color: '#8a94a3', width: 1}});
    }
    comparisons.forEach(comparison => {
      const y1 = yForPrice(comparison.curveNumber, comparison.x1, comparison.price1);
      const y2 = yForPrice(comparison.curveNumber, comparison.x2, comparison.price2);
      if (y1 === null || y2 === null) return;
      const lowY = Math.min(y1, y2);
      const highY = Math.max(y1, y2);
      const color = graph._fullData[comparison.curveNumber].line.color || '#444';
      const yref = axisRef(axisKeyFor(comparison.curveNumber));
      shapes.push(
        {type: 'line', xref: 'x', yref, x0: comparison.x1, x1: comparison.x2, y0: y1, y1: y1, line: {color, width: 1.5, dash: 'dot'}},
        {type: 'line', xref: 'x', yref, x0: comparison.x1, x1: comparison.x2, y0: y2, y1: y2, line: {color, width: 1.5, dash: 'dot'}},
        {type: 'line', xref: 'x', yref, x0: comparison.x2, x1: comparison.x2, y0: lowY, y1: highY, line: {color, width: 2}},
      );
      annotations.push({
        x: comparison.x2,
        y: (toAxis(y1) + toAxis(y2)) / 2,
        xref: 'x',
        yref,
        text: comparison.label,
        showarrow: false,
        xshift: 36,
        bgcolor: 'white',
        bordercolor: color,
        borderwidth: 1,
        font: {color, size: 13},
      });
    });

    if (firstComparisonPoint) {
      const firstY = yForPrice(firstComparisonPoint.curveNumber, firstComparisonPoint.x, firstComparisonPoint.price);
      if (firstY !== null) {
        annotations.push({
          x: firstComparisonPoint.x,
          y: toAxis(firstY),
          xref: 'x',
          yref: axisRef(axisKeyFor(firstComparisonPoint.curveNumber)),
          text: `Punkt 1: ${firstComparisonPoint.formattedPrice}<br>Klicka på ${firstComparisonPoint.name} igen`,
          showarrow: true,
          arrowhead: 2,
          ax: 0,
          ay: -38,
          bgcolor: 'white',
          bordercolor: '#555',
          borderwidth: 1,
        });
      }
    }

    // Nollpunkt för den solo-valda aktien, omräknad till indexskalan (100 vid synligt startdatum).
    const soloCurve = soloSeries ? stockTraceBySeries[soloSeries] : undefined;
    // Ett fast pris har ingen fast nivå när ett mått visas ensamt, så då visas ingen nollpunktslinje.
    const breakeven = soloCurve !== undefined && !measureOnly() && window.getBreakeven
      ? window.getBreakeven(soloSeries) : null;
    const breakevenBase = soloCurve !== undefined ? visibleBases[soloCurve] : null;
    if (breakeven && breakevenBase) {
      const index = breakeven.value / breakevenBase * 100;
      const axisKey = axisKeyFor(soloCurve);
      const yref = axisRef(axisKey);
      shapes.push({
        type: 'line', xref: 'paper', x0: 0, x1: 1, yref, y0: index, y1: index,
        line: {color: '#2ca02c', width: 1.5, dash: 'dash'},
      });
      const price = breakeven.value.toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      const text = `Nollpunkt ${price}${breakeven.currency ? ` ${breakeven.currency}` : ''}`;
      // Till vänster, så att etiketten inte krockar med kurvans slutetikett till höger.
      const label = {
        xref: 'paper', x: 0, xanchor: 'left', showarrow: false, captureevents: false,
        font: {color: '#2ca02c', size: 12}, bgcolor: 'rgba(255,255,255,0.85)',
      };
      const [low, high] = axisRange(axisKey, targetRanges);
      const y = toAxis(index);
      if (y > high) annotations.push({...label, yref: 'paper', y: 1, yanchor: 'top', text: `▲ ${text}`});
      else if (y < low) annotations.push({...label, yref: 'paper', y: 0, yanchor: 'bottom', text: `▼ ${text}`});
      else annotations.push({...label, yref, y, yanchor: 'bottom', text});
    }
    return {shapes, annotations};
  }
  // Anropas när resultattabellen ritas om, så att nollpunktslinjen följer nya transaktioner.
  window.refreshStockChartOverlays = function() {
    if (graph._fullLayout) Plotly.relayout(graph, comparisonOverlays());
  };
  function rebaseToVisibleStart(eventData) {
    let start = eventData && eventData['xaxis.range[0]'];
    let end = eventData && eventData['xaxis.range[1]'];
    if ((!start || !end) && eventData && Array.isArray(eventData['xaxis.range'])) {
      const eventRange = eventData['xaxis.range'];
      start = start || eventRange[0];
      end = end || eventRange[1];
    }
    const activeRange = graph._fullLayout && graph._fullLayout.xaxis.range;
    const layoutRange = graph.layout.xaxis.range;
    const sliderRange = graph.layout.xaxis.rangeslider && graph.layout.xaxis.rangeslider.range;
    const fallbackRange = activeRange || layoutRange || sliderRange;
    if (fallbackRange) {
      start = start || fallbackRange[0];
      end = end || fallbackRange[1];
    }
    if (!start || !end) return;

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const ys = [];
    const indices = [];
    const visibleValues = [];
    const nextEndpointLabels = [];
    graph.data.forEach((trace, index) => {
      // Måttkurvorna beror inte på synligt intervall; syncMeasureTraces håller dem aktuella.
      if (trace.meta && trace.meta.role === 'measure') return;
      const xs = Array.from(trace.x);
      const rawPrices = Array.from(trace.customdata, row =>
        Number(Array.isArray(row) ? row[0] : row)
      );
      if (trace.meta && trace.meta.role === 'purchase') {
        const stockIndex = stockTraceBySeries[trace.meta.series];
        if (stockIndex === undefined) return;
        if (measureOnly()) {
          // Markeringen ligger på aktiekurvans avvikelse samma dag.
          ys.push(xs.map(x => measureAt(stockIndex, x)));
          indices.push(index);
          return;
        }
        const base = visibleBases[stockIndex];
        if (!base) return;
        // Händelser före aktiens första kurs saknar diagramkurs och ritas inte (null).
        ys.push(Array.from(trace.customdata, row => {
          const price = Array.isArray(row) ? row[0] : row;
          return price === null || !(Number(price) > 0) ? null : Number(price) / base * 100;
        }));
        indices.push(index);
        return;
      }
      const baseIndex = xs.findIndex((x, point) => {
        const time = new Date(x).getTime();
        const price = Number(rawPrices[point]);
        return time >= startTime && time <= endTime && Number.isFinite(price) && price !== 0;
      });
      if (baseIndex < 0) return;
      const base = Number(rawPrices[baseIndex]);
      visibleBases[index] = base;
      const yValues = measureOnly()
        ? measureSeries(index).slice()
        : rawPrices.map(price => Number(price) / base * 100);
      ys.push(yValues);
      let lastVisibleIndex = -1;
      let lastVisibleValue = null;
      xs.forEach((x, point) => {
        const time = new Date(x).getTime();
        if (time >= startTime && time <= endTime) {
          if (yValues[point] === null) return;
          lastVisibleIndex = point;
          const value = yValues[point];
          lastVisibleValue = value;
          if (Number.isFinite(value) && trace.visible !== 'legendonly' && trace.visible !== false) {
            visibleValues.push(value);
          }
        }
      });
      if (lastVisibleIndex >= 0 && trace.visible !== 'legendonly' && trace.visible !== false) {
        nextEndpointLabels.push({
          series: trace.meta.series,
          name: trace.meta.displayName || trace.name,
          x: xs[lastVisibleIndex],
          y: lastVisibleValue,
        });
      }
      indices.push(index);
    });
    endpointLabels = nextEndpointLabels;
    if (indices.length) {
      Plotly.restyle(graph, {y: ys}, indices).then(syncMeasureTraces).then(refreshVisibleView);
    }
  }
  window.rebaseVisibleStockGraph = rebaseToVisibleStart;
  function applyAxisMode(enabled) {
    const layoutUpdate = {
      'yaxis.type': enabled ? 'log' : 'linear',
      'yaxis.showticklabels': !enabled,
      'yaxis.showgrid': !enabled,
      'yaxis.title.text': enabled ? 'Egen logaritmisk skala per kurva' : linearYAxisTitle,
    };
    Object.values(axisKeyBySeries).forEach(axisKey => {
      if (axisKey !== 'yaxis') layoutUpdate[axisKey] = enabled ? {overlaying: 'y', type: 'log', visible: false} : null;
    });
    const indices = [];
    const axes = [];
    graph.data.forEach((trace, index) => {
      if (!trace.meta || !axisKeyBySeries[trace.meta.series]) return;
      indices.push(index);
      axes.push(enabled ? axisRef(axisKeyBySeries[trace.meta.series]) : 'y');
    });
    return Plotly.update(graph, {yaxis: axes}, layoutUpdate, indices).then(refreshVisibleView);
  }
  const indexHoverTemplates = graph.data.map(trace => trace.hovertemplate);
  const stockTraceIndices = Object.values(stockTraceBySeries);
  // Byt skalläge: axelstrukturen sköts av applyAxisMode, y-värdena räknas om av rebaseToVisibleStart.
  function setScale(mode) {
    scaleMode = mode;
    const {log, measure} = parseScale(mode);
    const only = !log && measure !== null;
    const title = only ? MEASURES[measure].title
      : (log ? (measure ? '' : 'Egen logaritmisk skala per kurva') : linearYAxisTitle);
    return applyAxisMode(log).then(() => Plotly.update(graph, {
      hovertemplate: stockTraceIndices.map(index => only
        ? String(indexHoverTemplates[index]).replace('Index: %{y:.1f}', `${MEASURES[measure].hoverLabel}: %{y:+.1f} %`)
        : indexHoverTemplates[index]),
    }, {
      'yaxis.title.text': title,
      'yaxis.ticksuffix': only ? ' %' : '',
      [`${measureAxisKey}.visible`]: log && measure !== null,
    }, stockTraceIndices)).then(syncMeasureTraces).then(() => rebaseToVisibleStart({}));
  }
  window.setStockChartScale = setScale;
  // Mindre skalvärden på axlarna i telefonlayout; återställs till standard på bredare skärm.
  function applyPhoneAxes() {
    const size = window.phoneLayoutQuery.matches ? window.PHONE_TICK_SIZE : null;
    return Plotly.relayout(graph, {'xaxis.tickfont.size': size, 'yaxis.tickfont.size': size, [`${measureAxisKey}.tickfont.size`]: size});
  }
  if (window.phoneLayoutQuery.matches) applyPhoneAxes();
  window.phoneLayoutQuery.addEventListener('change', applyPhoneAxes);
  if (parseScale(scaleMode).measure) setScale(scaleMode);
  else if (isLogAxis()) applyAxisMode(true);
  function refreshVisibleView() {
    const fullLayout = graph._fullLayout;
    const range = fullLayout && fullLayout.xaxis && fullLayout.xaxis.range;
    if (!range) return;
    const startTime = new Date(range[0]).getTime();
    const endTime = new Date(range[1]).getTime();
    const visibleValues = [];
    const nextEndpointLabels = [];
    const targetRanges = {};
    const ownExtents = [];
    graph.data.forEach((trace, traceIndex) => {
      if (!trace.meta || trace.meta.role !== 'stock') return;
      const shown = trace.visible !== 'legendonly' && trace.visible !== false;
      const ownAxis = isLogAxis();
      // Egna axlar anpassas även för dolda aktier så att de visas rätt när de slås på.
      if (!shown && !ownAxis) return;
      const traceValues = [];
      let lastIndex = -1;
      for (let index = 0; index < trace.x.length; index++) {
        const time = new Date(trace.x[index]).getTime();
        // Saknade värden (till exempel före de första 200 dagarna i avvikelseläget) räknas inte.
        if (time >= startTime && time <= endTime && trace.y[index] !== null && trace.y[index] !== undefined) {
          lastIndex = index;
          const value = Number(trace.y[index]);
          if (Number.isFinite(value)) traceValues.push(value);
        }
      }
      if (ownAxis) {
        const axisValues = traceValues.map(toAxis).filter(Number.isFinite);
        if (axisValues.length) {
          ownExtents.push({axisKey: axisKeyFor(traceIndex), shown, min: Math.min(...axisValues), max: Math.max(...axisValues)});
        }
      }
      if (!shown) return;
      traceValues.forEach(value => visibleValues.push(value));
      if (lastIndex >= 0) {
        nextEndpointLabels.push({
          series: trace.meta.series,
          curveNumber: traceIndex,
          name: trace.meta.displayName || trace.name,
          x: trace.x[lastIndex],
          y: Number(trace.y[lastIndex]),
        });
      }
    });
    endpointLabels = nextEndpointLabels;
    if (ownExtents.length) {
      // Samma logaritmiska spann för alla kurvor, satt av den synliga kurva som varierar mest,
      // så att lika stora procentuella rörelser blir lika höga. Varje kurva centreras på sin egen nivå.
      const spans = ownExtents.filter(extent => extent.shown).map(extent => extent.max - extent.min);
      const span = spans.length ? Math.max(...spans) : Math.max(...ownExtents.map(extent => extent.max - extent.min));
      const halfHeight = span / 2 + Math.max(span * 0.05, 0.01);
      ownExtents.forEach(extent => {
        const center = (extent.min + extent.max) / 2;
        targetRanges[extent.axisKey] = [center - halfHeight, center + halfHeight];
      });
    }
    if (measureOverlay()) {
      // Avvikelseaxeln är linjär även när aktieaxlarna är logaritmiska.
      const measureValues = [];
      Object.values(measureTraceByStock).forEach(index => {
        const trace = graph.data[index];
        if (!trace || trace.visible !== true) return;
        trace.x.forEach((x, point) => {
          const time = new Date(x).getTime();
          const value = trace.y[point];
          if (time >= startTime && time <= endTime && value !== null && Number.isFinite(value)) measureValues.push(value);
        });
      });
      if (measureValues.length) {
        const min = Math.min(...measureValues);
        const max = Math.max(...measureValues);
        const padding = Math.max((max - min) * 0.05, 1);
        targetRanges[measureAxisKey] = [min - padding, max + padding];
      }
    }
    if (!isLogAxis()) {
      const sharedRange = fitYRange(visibleValues);
      if (sharedRange) targetRanges.yaxis = sharedRange;
    }
    const layoutUpdate = comparisonOverlays(targetRanges);
    Object.entries(targetRanges).forEach(([axisKey, range]) => {
      layoutUpdate[`${axisKey}.range`] = range;
    });
    Plotly.relayout(graph, layoutUpdate);
  }
  function setComparisonHelp(text) {
    const help = document.getElementById('stock-legend-help');
    if (help) help.textContent = text;
  }
  let lastHoveredStockPoints = [];
  let lastHoverMouseEvent = null;
  let lastHoverAt = 0;
  // Tid för senaste klick som valde en kurvpunkt; ett dubbelklick strax efter gäller kurvan, inte tom yta.
  let lastCurveClickAt = 0;
  let lastPlotlyClickAt = 0;
  function isVisibleStockPoint(point) {
    const trace = graph.data[point.curveNumber];
    return Boolean(trace && trace.visible !== 'legendonly' && trace.visible !== false &&
      trace.meta && trace.meta.role === 'stock');
  }
  graph.on('plotly_hover', eventData => {
    lastHoveredStockPoints = eventData && eventData.points
      ? eventData.points.filter(isVisibleStockPoint)
      : [];
    lastHoverMouseEvent = eventData && eventData.event || null;
    lastHoverAt = Date.now();
  });
  graph.on('plotly_unhover', () => {
    lastHoverMouseEvent = null;
  });
  function handleGraphClick(eventData) {
    const clickPoints = eventData && eventData.points && eventData.points.length
      ? eventData.points
      : (Date.now() - lastHoverAt < 1000 ? lastHoveredStockPoints : []);
    const candidates = clickPoints.filter(isVisibleStockPoint);
    let point = candidates[0];
    const mouseEvent = eventData && eventData.event || lastHoverMouseEvent;
    if (candidates.length && mouseEvent && graph._fullLayout) {
      const graphBounds = graph.getBoundingClientRect();
      const plotY = mouseEvent.clientY - graphBounds.top - graph._fullLayout._size.t;
      const plotHeight = graph._fullLayout._size.h;
      const pixelDistance = candidate => {
        const yRange = axisRange(axisKeyFor(candidate.curveNumber));
        return Math.abs((yRange[1] - toAxis(Number(candidate.y))) / (yRange[1] - yRange[0]) * plotHeight - plotY);
      };
      const closest = candidates.reduce((nearest, candidate) => {
        const distance = pixelDistance(candidate);
        return distance < nearest.distance ? {point: candidate, distance} : nearest;
      }, {point, distance: pixelDistance(point)});
      if (closest.distance > 80) return;
      point = closest.point;
    }
    if (!point || point.curveNumber >= graph.data.length) return;
    lastCurveClickAt = Date.now();
    const clickedTrace = graph.data[point.curveNumber];
    const tickerSelect = document.getElementById('purchase-ticker');
    if (clickedTrace.meta && clickedTrace.meta.ticker && tickerSelect) {
      tickerSelect.value = clickedTrace.meta.ticker;
      // Kurvans konto följer med; värdepapper utan konto lämnar fältet orört.
      const accountField = document.getElementById('purchase-account');
      if (accountField && clickedTrace.meta.account) accountField.value = clickedTrace.meta.account;
      document.getElementById('purchase-date').value = new Date(point.x).toISOString().slice(0, 10);
      const pointData = point.customdata;
      const clickedRawPrice = Number(Array.isArray(pointData) ? pointData[0] : pointData);
      const clickedFxFactor = Array.isArray(pointData) ? Number(pointData[2] || 1) : 1;
      const clickedPrice = clickedRawPrice * clickedFxFactor;
      if (document.getElementById('purchase-type').value !== 'UTDELNING' && Number.isFinite(clickedPrice) && clickedPrice > 0) {
        document.getElementById('purchase-price').value = clickedPrice.toLocaleString('sv-SE', {useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (window.updatePurchaseTotal) window.updatePurchaseTotal();
      }
    }
    const price = Number(Array.isArray(point.customdata) ? point.customdata[0] : point.customdata);
    if (!Number.isFinite(price) || price <= 0) return;

    const selectedPoint = {
      curveNumber: point.curveNumber,
      name: graph.data[point.curveNumber].meta.displayName || graph.data[point.curveNumber].name,
      x: point.x,
      y: Number(point.y),
      price: price,
      formattedPrice: Array.isArray(point.customdata) ? point.customdata[1] : String(price),
    };

    if (!firstComparisonPoint || firstComparisonPoint.curveNumber !== selectedPoint.curveNumber) {
      firstComparisonPoint = selectedPoint;
      setComparisonHelp(`Första punkten vald på ${selectedPoint.name}. Klicka en gång till på samma kurva.`);
      Plotly.relayout(graph, comparisonOverlays());
      return;
    }

    const first = firstComparisonPoint;
    firstComparisonPoint = null;
    setComparisonHelp('Klicka på aktien för av/på. Klicka två punkter på samma kurva för jämförelse.');
    const firstTime = new Date(first.x).getTime();
    const secondTime = new Date(selectedPoint.x).getTime();
    const earlier = firstTime <= secondTime ? first : selectedPoint;
    const later = firstTime <= secondTime ? selectedPoint : first;
    const change = (later.price / earlier.price - 1) * 100;
    const elapsedMonths = (new Date(later.x).getTime() - new Date(earlier.x).getTime())
      / (24 * 60 * 60 * 1000 * 30.4375);
    const formatPercent = value => `${value > 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`;
    const elapsedLabel = `${elapsedMonths.toFixed(1).replace('.', ',')} mån`;
    const monthlyChange = elapsedMonths > 0 ? change / elapsedMonths : null;
    const changeLabel = monthlyChange === null
      ? `${formatPercent(change)} · —/månad · ${elapsedLabel}`
      : `${formatPercent(change)} · ${formatPercent(monthlyChange)}/månad · ${elapsedLabel}`;
    comparisons.push({
      curveNumber: selectedPoint.curveNumber,
      x1: first.x,
      x2: selectedPoint.x,
      price1: first.price,
      price2: selectedPoint.price,
      label: `${selectedPoint.name}: ${changeLabel}`,
    });
    Plotly.relayout(graph, comparisonOverlays());
  }
  graph.on('plotly_click', eventData => {
    lastPlotlyClickAt = Date.now();
    handleGraphClick(eventData);
  });
  graph.addEventListener('click', event => {
    setTimeout(() => {
      if (Date.now() - lastPlotlyClickAt < 250) return;
      const bounds = graph.getBoundingClientRect();
      const layout = graph._fullLayout;
      if (!layout || !lastHoveredStockPoints.length || Date.now() - lastHoverAt > 1000) return;
      const pointX = event.clientX - bounds.left;
      const pointY = event.clientY - bounds.top;
      const plot = layout._size;
      if (pointX < plot.l || pointX > plot.l + plot.w || pointY < plot.t || pointY > plot.t + plot.h) return;
      handleGraphClick({points: lastHoveredStockPoints, event});
    }, 0);
  });
  // Plotly fångar musen i diagramytan, så webbläsarens dblclick når aldrig hit; Plotly sänder i stället
  // plotly_doubleclick. Ett dubbelklick nära en kurva har redan valt kurvpunkter och rensar inget.
  graph.on('plotly_doubleclick', () => {
    if (Date.now() - lastCurveClickAt < 600) return;
    firstComparisonPoint = null;
    setComparisonHelp('Klicka på aktien för av/på. Klicka två punkter på samma kurva för jämförelse.');
    comparisons.length = 0;
    Plotly.relayout(graph, comparisonOverlays());
  });
  window.syncVisibleDateInputs = function(range) {
    const startField = document.getElementById('visible-start-date');
    const endField = document.getElementById('visible-end-date');
    if (!startField || !endField) return;
    const activeRange = range || (graph._fullLayout && graph._fullLayout.xaxis && graph._fullLayout.xaxis.range);
    if (!activeRange || activeRange.length < 2) return;
    const asIsoDate = value => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
      const parsed = new Date(value);
      return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
    };
    startField.value = asIsoDate(activeRange[0]);
    endField.value = asIsoDate(activeRange[1]);
    const status = document.getElementById('visible-date-status');
    if (status) status.textContent = '';
  };
  graph.on('plotly_relayout', eventData => {
    // Teckenstorlek på axlarna (telefonlayout) är ingen ändring av datumintervallet.
    if (!eventData || !Object.keys(eventData).some(key => key.startsWith('xaxis.') && !key.startsWith('xaxis.tickfont'))) return;
    let range = eventData['xaxis.range'];
    if (!Array.isArray(range) && (eventData['xaxis.range[0]'] || eventData['xaxis.range[1]'])) {
      const activeRange = graph._fullLayout && graph._fullLayout.xaxis && graph._fullLayout.xaxis.range;
      range = [eventData['xaxis.range[0]'] || (activeRange && activeRange[0]),
        eventData['xaxis.range[1]'] || (activeRange && activeRange[1])];
    }
    if (window.syncVisibleDateInputs) window.syncVisibleDateInputs(range);
    const rangeToPersist = Array.isArray(range) && range.length >= 2 && range[0] && range[1]
      ? range : (graph._fullLayout && graph._fullLayout.xaxis && graph._fullLayout.xaxis.range);
    if (window.persistVisibleDateRange) window.persistVisibleDateRange(rangeToPersist);
    clearTimeout(rebaseTimer);
    rebaseTimer = setTimeout(() => rebaseToVisibleStart(eventData), 100);
  });
  graph.on('plotly_restyle', eventData => {
    const [update, changedIndices] = eventData || [];
    if (!update || !Object.prototype.hasOwnProperty.call(update, 'visible')) return;
    const changedVisibility = update.visible;
    let indices = changedIndices;
    indices = indices || graph.data.map((_, index) => index);
    indices.forEach((traceIndex, position) => {
      const value = Array.isArray(changedVisibility)
        ? changedVisibility[position]
        : changedVisibility;
      traceIsVisible[traceIndex] = value !== 'legendonly' && value !== false;
    });
    // Aktier som visas eller döljs tar med sig sina avvikelsekurvor; deras egna ändringar ignoreras.
    if (indices.some(index => !(graph.data[index] && graph.data[index].meta && graph.data[index].meta.role === 'measure'))) {
      syncMeasureTraces();
    }
    clearTimeout(rebaseTimer);
    rebaseTimer = setTimeout(refreshVisibleView, 60);
  });
  setTimeout(() => rebaseToVisibleStart({}), 0);
  // Var ett värdepapper solo när sidan lämnades väljs det igen, med minutdiagram, på alla skärmstorlekar.
  const lastSolo = graph.layout.meta && graph.layout.meta.lastSolo;
  if (lastSolo && stockTraceBySeries[lastSolo] !== undefined) {
    setTimeout(() => setSolo(lastSolo, true), 50);
  }
  setTimeout(() => window.renderPurchaseList && window.renderPurchaseList(), 0);
};

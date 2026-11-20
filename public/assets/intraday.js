// Minutdiagram för den solo-valda aktien: kurs minut för minut för senaste veckan eller månaden.
(function() {
  const panel = document.getElementById('intraday-panel');
  if (!panel) return;
  const title = document.getElementById('intraday-title');
  const status = document.getElementById('intraday-status');
  const chart = document.getElementById('intraday-chart');
  const rangeButtons = Array.from(document.querySelectorAll('#intraday-range button'));
  const DAY_MS = 24 * 3600 * 1000;
  let request = 0;
  let data = null;
  let times = [];
  let days = 7;
  // Index i data.times för den låsta punkten, eller null.
  let pinnedIndex = null;
  const pinBox = document.getElementById('intraday-pin');
  const pinTime = document.getElementById('intraday-pin-time');
  const pinPrice = document.getElementById('intraday-pin-price');
  const pinPrev = document.getElementById('intraday-pin-prev');
  const pinNext = document.getElementById('intraday-pin-next');
  const download = document.getElementById('intraday-download');
  // Arkivets tidsintervall och nya minuter, på samma rad som länken Ladda ner CSV.
  const archiveInfo = document.getElementById('intraday-archive');
  // Nollpunkt (GAV − utdelning per aktie) i minutkursernas valuta, eller null.
  let breakeven = null;
  // Aktiens händelser i minutdiagrammet, se computeTransactionMarkers.
  let transactionMarkers = [];

  // Tiderna är svensk tid utan zon; tolka dem som UTC så att bara skillnader räknas.
  function toMs(text) {
    return Date.parse(String(text).slice(0, 19).replace(' ', 'T') + 'Z');
  }
  function toText(ms) {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  }

  // Sammanfattning av aktiens arkiv med minutkurser för statusraden.
  function archiveText(archive) {
    if (archive.error) return `Arkivet kunde inte sparas: ${archive.error}`;
    const span = archive.rows > 0 ? `Arkiv: ${archive.first} – ${archive.last}` : 'Arkiv: inga minuter';
    if (archive.skipped) return `${span}; arkivet uppdaterades inte eftersom hämtningen var ofullständig.`;
    const added = archive.added || 0;
    return `${span}, ${added.toLocaleString('sv-SE')} ${added === 1 ? 'ny' : 'nya'}.`;
  }

  function setStatus(text, isError = false) {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  }

  // Dölj tid utan handel: varje lucka mellan två minuter blir en rangebreak.
  function gapBreaks() {
    for (const minutes of [10, 60]) {
      const breaks = [];
      for (let index = 1; index < times.length; index++) {
        if (times[index] - times[index - 1] > minutes * 60000) {
          breaks.push({bounds: [toText(times[index - 1] + 60000), data.times[index]]});
        }
      }
      if (breaks.length <= 200 || minutes === 60) return breaks;
    }
    return [];
  }

  function fitY(from, to) {
    let low = Infinity;
    let high = -Infinity;
    times.forEach((time, index) => {
      if (time >= from && time <= to) {
        low = Math.min(low, data.close[index]);
        high = Math.max(high, data.close[index]);
      }
    });
    // Köp och sälj kan ligga utanför kurvan; ta med dem så att markeringen syns.
    transactionMarkers.forEach(marker => {
      if (marker.ownPrice && marker.time >= from && marker.time <= to) {
        low = Math.min(low, marker.y);
        high = Math.max(high, marker.y);
      }
    });
    if (low === Infinity) return null;
    const padding = Math.max((high - low) * 0.05, high * 0.001);
    return [low - padding, high + padding];
  }

  function relayoutX(from, to) {
    const update = {'xaxis.range': [toText(from), toText(to)]};
    const yRange = fitY(from, to);
    if (yRange) update['yaxis.range'] = yRange;
    update.annotations = annotations(yRange || chart.layout.yaxis.range);
    return Plotly.relayout(chart, update);
  }

  function computeBreakeven() {
    const holding = data && window.getBreakeven ? window.getBreakeven(data.series) : null;
    if (!holding) return null;
    let value = holding.value;
    const holdingCurrency = holding.currency === 'kr' ? 'SEK' : holding.currency;
    // Transaktioner i kronor men minutkurser i annan valuta (Berkshire): räkna om med senaste kursen.
    if (holdingCurrency !== data.currency) {
      if (holdingCurrency !== 'SEK' || !(data.sekRate > 0)) return null;
      value /= data.sekRate;
    }
    return Number.isFinite(value) ? value : null;
  }

  const MARKER_SYMBOLS = {'KÖP': 'circle', 'SÄLJ': 'triangle-down', 'UTDELNING': 'diamond'};
  const formatAmount = value => value.toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  // Första och sista minutindex per dag i minutkurserna.
  function dayIndexes() {
    const days = {};
    data.times.forEach((time, index) => {
      const day = time.slice(0, 10);
      if (!days[day]) days[day] = [index, index];
      else days[day][1] = index;
    });
    return days;
  }
  // Aktiens händelser i minutdiagrammet: vid dagens första minut, köp och sälj vid sin kurs
  // omräknad till minutkursernas valuta, utdelningar på kurvan.
  function computeTransactionMarkers() {
    if (!data || !window.getTransactions) return [];
    const holding = window.getHolding ? window.getHolding(data.series) : null;
    const stockCurrency = holding && holding.currency === 'kr' ? 'SEK' : holding && holding.currency;
    const days = dayIndexes();
    const markers = [];
    window.getTransactions(data.series).forEach(transaction => {
      const day = days[transaction.date];
      if (!day) return;
      const [first, last] = day;
      const dividend = transaction.type === 'UTDELNING';
      // Köp och sälj med klockslag: första minuten med kurs på eller efter klockslaget, annars dagens sista.
      let at = first;
      if (!dividend && transaction.time) {
        at = last;
        for (let index = first; index <= last; index++) {
          if (data.times[index].slice(11, 16) >= transaction.time) {
            at = index;
            break;
          }
        }
      }
      let y = data.close[at];
      if (!dividend) {
        const isSek = currency => currency === 'kr' || currency === 'SEK';
        const sekRate = transaction.sekRate > 0 ? transaction.sekRate : (isSek(transaction.currency) ? 1 : null);
        const tickerRate = transaction.tickerRate > 0 ? transaction.tickerRate : (stockCurrency === 'SEK' ? 1 : null);
        if (sekRate === null || tickerRate === null) return;
        y = transaction.price * sekRate / tickerRate;
        if (stockCurrency !== data.currency) {
          // Berkshire: kronor i huvuddiagrammet, USD i minutdiagrammet; dagens kvot mellan kurserna.
          if (stockCurrency !== 'SEK' || !(transaction.chartPrice > 0)) return;
          y *= data.close[last] / transaction.chartPrice;
        }
      }
      if (!Number.isFinite(y)) return;
      const currency = transaction.currency === 'SEK' ? 'kr' : transaction.currency;
      const fee = dividend ? 'källskatt' : 'courtage';
      markers.push({
        x: data.times[at],
        time: times[at],
        y,
        ownPrice: !dividend,
        symbol: MARKER_SYMBOLS[transaction.type] || 'circle',
        // Klockslaget först när det finns, så att det syns direkt i hovringen.
        text: (!dividend && transaction.time ? `${transaction.time} ` : '')
          + `${transaction.type} ${transaction.quantity.toLocaleString('sv-SE')} st à ${formatAmount(transaction.price)} ${currency} · ${fee} ${formatAmount(transaction.commission)} ${currency}`,
      });
    });
    return markers;
  }
  function markerTraceData() {
    return {
      x: [transactionMarkers.map(marker => marker.x)],
      y: [transactionMarkers.map(marker => marker.y)],
      customdata: [transactionMarkers.map(marker => marker.text)],
      'marker.symbol': [transactionMarkers.map(marker => marker.symbol)],
    };
  }

  function shapes() {
    const list = [];
    if (breakeven !== null) {
      list.push({
        type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: breakeven, y1: breakeven,
        line: {color: '#2ca02c', width: 1.5, dash: 'dash'},
      });
    }
    if (pinnedIndex !== null) {
      const time = data.times[pinnedIndex];
      list.push({
        type: 'line', xref: 'x', yref: 'paper', x0: time, x1: time, y0: 0, y1: 1,
        line: {color: '#d62728', width: 1, dash: 'dot'},
      });
    }
    return list;
  }

  // Etikett för nollpunkten; vid över- eller underkanten med pil om linjen ligger utanför y-intervallet.
  function annotations(yRange) {
    if (breakeven === null) return [];
    const currency = data.currency === 'SEK' ? 'kr' : data.currency;
    const text = `Nollpunkt ${breakeven.toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency}`;
    const label = {
      xref: 'paper', x: 1, xanchor: 'right', showarrow: false,
      font: {color: '#2ca02c', size: 12}, bgcolor: 'rgba(255,255,255,0.85)',
    };
    const [low, high] = yRange || [-Infinity, Infinity];
    if (breakeven > high) return [{...label, yref: 'paper', y: 1, yanchor: 'top', text: `▲ ${text}`}];
    if (breakeven < low) return [{...label, yref: 'paper', y: 0, yanchor: 'bottom', text: `▼ ${text}`}];
    return [{...label, yref: 'y', y: breakeven, yanchor: 'bottom', text}];
  }

  function applyDays() {
    rangeButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.days) === days)));
    if (!data) return;
    const end = times[times.length - 1];
    const start = Math.max(times[0], end - days * DAY_MS);
    if (pinnedIndex !== null && times[pinnedIndex] < start) unpin();
    relayoutX(start, end);
  }

  function positionPin() {
    const layout = chart._fullLayout;
    if (pinnedIndex === null || !layout || !layout.xaxis) return;
    const x = layout._size.l + layout.xaxis.d2p(data.times[pinnedIndex]);
    const y = layout._size.t + layout.yaxis.d2p(data.close[pinnedIndex]);
    pinBox.hidden = false;
    // Till vänster om och ovanför punkten, så att hoveretiketten till höger syns; vänd vid kanterna.
    let left = x - 12 - pinBox.offsetWidth;
    if (left < 0) left = x + 12;
    let top = y - 12 - pinBox.offsetHeight;
    if (top < 0) top = y + 12;
    pinBox.style.left = `${Math.max(0, left)}px`;
    pinBox.style.top = `${top}px`;
  }

  async function pin(index) {
    pinnedIndex = index;
    const time = data.times[index];
    pinTime.textContent = time;
    pinPrice.textContent = `${data.close[index].toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${data.currency || ''}`;
    pinPrev.disabled = index === 0;
    pinNext.disabled = index === times.length - 1;
    await Plotly.restyle(chart, {x: [[time]], y: [[data.close[index]]]}, [1]);
    await Plotly.relayout(chart, {shapes: shapes()});
    // Panorera med samma bredd om punkten hamnat utanför det synliga intervallet.
    const [from, to] = chart.layout.xaxis.range.map(toMs);
    if (times[index] > to) await relayoutX(times[index] - (to - from), times[index]);
    else if (times[index] < from) await relayoutX(times[index], times[index] + (to - from));
    positionPin();
  }

  function step(delta) {
    const index = pinnedIndex + delta;
    if (pinnedIndex !== null && index >= 0 && index < times.length) pin(index);
  }

  // redraw false när diagrammet ändå ska tas bort: Plotly-anrop som inte hunnit bli klara före
  // Plotly.purge fortsätter annars mot ett borttaget diagram och ger fel.
  function unpin(redraw = true) {
    pinnedIndex = null;
    pinBox.hidden = true;
    if (redraw && chart.data && chart.data.length > 1) {
      Plotly.restyle(chart, {x: [[]], y: [[]]}, [1]);
      Plotly.relayout(chart, {shapes: shapes()});
    }
  }

  // Anropas när resultattabellen ritas om, till exempel efter en ny transaktion.
  window.refreshIntradayOverlays = function() {
    if (!data || !chart.data || panel.hidden) return;
    breakeven = computeBreakeven();
    transactionMarkers = computeTransactionMarkers();
    Plotly.restyle(chart, markerTraceData(), [2]);
    Plotly.relayout(chart, {shapes: shapes()});
    // Anpassa y-axeln på nytt så att en ny köp- eller säljmarkering syns.
    const [from, to] = chart.layout.xaxis.range.map(toMs);
    relayoutX(from, to);
  };

  function draw() {
    times = data.times.map(toMs);
    breakeven = computeBreakeven();
    transactionMarkers = computeTransactionMarkers();
    const currency = data.currency || '';
    const mainGraph = document.getElementById('stock-chart');
    const template = mainGraph && mainGraph.layout ? mainGraph.layout.template : undefined;
    const stockIndex = window.stockGraphState && window.stockGraphState.stockTraceBySeries[data.series];
    const stockColor = mainGraph && mainGraph._fullData && stockIndex !== undefined
      ? mainGraph._fullData[stockIndex].line.color : '#ff7f0e';
    const markerData = markerTraceData();
    const phone = window.phoneLayoutQuery && window.phoneLayoutQuery.matches;
    const tickSize = phone ? window.PHONE_TICK_SIZE : undefined;
    return Plotly.newPlot(chart, [{
      type: 'scatter',
      mode: 'lines',
      x: data.times,
      y: data.close,
      line: {width: 1.5, color: '#1f77b4'},
      hovertemplate: `%{x|%Y-%m-%d %H:%M}<br>%{y:.2f} ${currency}<extra></extra>`,
    }, {
      // Markering för den låsta punkten.
      type: 'scatter',
      mode: 'markers',
      x: [],
      y: [],
      marker: {size: 9, color: '#d62728', line: {color: 'white', width: 1.5}},
      hoverinfo: 'skip',
    }, {
      // Köp, sälj och utdelningar, med samma symboler och färg som i huvuddiagrammet.
      type: 'scatter',
      mode: 'markers',
      x: markerData.x[0],
      y: markerData.y[0],
      customdata: markerData.customdata[0],
      marker: {symbol: markerData['marker.symbol'][0], size: 10, color: stockColor, line: {color: '#333333', width: 1.5}},
      hovertemplate: '%{customdata}<extra></extra>',
    }], {
      template,
      margin: {l: phone ? 48 : 92, r: 20, t: 10, b: 40},
      showlegend: false,
      // Klick och hovring väljer minuten under pekaren, oavsett höjd.
      hovermode: 'x',
      xaxis: {type: 'date', rangebreaks: gapBreaks(), tickfont: {size: tickSize}},
      // Användaren zoomar i tid; y-axeln anpassas till de synliga kurserna.
      // Ingen y-axelrubrik och mindre skalvärden i telefonlayout.
      yaxis: {title: {text: phone ? '' : `Kurs (${currency})`}, fixedrange: true, tickfont: {size: tickSize}},
      shapes: shapes(),
    }, {responsive: true, displaylogo: false}).then(() => {
      chart.on('plotly_click', event => {
        const point = event.points.find(item => item.curveNumber === 0);
        if (point) pin(point.pointIndex);
      });
      chart.on('plotly_relayout', event => {
        positionPin();
        if (event['yaxis.range']) return;
        if (event['xaxis.autorange']) {
          applyDays();
        } else if (event['xaxis.range[0]'] !== undefined) {
          relayoutX(toMs(event['xaxis.range[0]']), toMs(event['xaxis.range[1]']));
        }
      });
      applyDays();
    });
  }

  pinPrev.addEventListener('click', () => step(-1));
  pinNext.addEventListener('click', () => step(1));
  document.getElementById('intraday-pin-close').addEventListener('click', unpin);
  // Piltangenter stegar den låsta punkten, utom när användaren skriver i ett fält.
  document.addEventListener('keydown', event => {
    if (pinnedIndex === null || panel.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    const typing = target.isContentEditable || ['SELECT', 'TEXTAREA'].includes(target.tagName) ||
      (target.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(target.type));
    if (typing) return;
    if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'Escape') unpin();
    else return;
    event.preventDefault();
  });
  window.addEventListener('resize', () => setTimeout(positionPin, 150));
  // När telefonen vrids: rubrik, marginal och skalvärden enligt aktuell layout.
  if (window.phoneLayoutQuery) {
    window.phoneLayoutQuery.addEventListener('change', () => {
      if (!data || !chart.data) return;
      const phone = window.phoneLayoutQuery.matches;
      const size = phone ? window.PHONE_TICK_SIZE : null;
      const currency = data.currency || '';
      Plotly.relayout(chart, {
        'margin.l': phone ? 48 : 92,
        'yaxis.title.text': phone ? '' : `Kurs (${currency})`,
        'xaxis.tickfont.size': size,
        'yaxis.tickfont.size': size,
      }).then(positionPin);
    });
  }

  rangeButtons.forEach(button => button.addEventListener('click', () => {
    days = Number(button.dataset.days);
    applyDays();
  }));

  // series är värdepapperet (ticker och konto): minutkurserna hämtas för tickern, transaktionerna för kontot.
  window.showIntraday = async function(series) {
    const stockGraph = document.getElementById('stock-chart');
    const stockMeta = stockGraph.data[window.stockGraphState.stockTraceBySeries[series]].meta;
    const ticker = stockMeta.ticker;
    const name = stockMeta.displayName;
    const id = ++request;
    if (data) unpin(false);
    data = null;
    days = 7;
    Plotly.purge(chart);
    chart.hidden = true;
    panel.hidden = false;
    title.textContent = `${name} – minutkurser`;
    download.hidden = true;
    archiveInfo.textContent = '';
    archiveInfo.classList.remove('is-error');
    rangeButtons.forEach(button => { button.disabled = true; });
    setStatus('Hämtar minutkurser från Yahoo Finance…');
    try {
      const response = await window.apiFetch('api/intraday.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ticker}),
      });
      let result;
      try {
        result = await response.json();
      } catch (error) {
        throw new Error('Minutkurserna kunde inte läsas.');
      }
      if (!response.ok) throw new Error(result.error || 'Minutkurserna kunde inte hämtas.');
      // En senare solo-växling har redan tagit över panelen.
      if (id !== request) return;
      data = {...result, series};
      chart.hidden = false;
      rangeButtons.forEach(button => { button.disabled = false; });
      const archive = data.archive || {};
      download.href = `api/intraday-csv.php?ticker=${encodeURIComponent(data.ticker)}`;
      download.hidden = !(archive.rows > 0);
      archiveInfo.textContent = archiveText(archive);
      archiveInfo.classList.toggle('is-error', Boolean(archive.error));
      const last = data.times.length - 1;
      const currency = data.currency === 'SEK' ? 'kr' : (data.currency || '');
      setStatus([`Senaste kurs ${data.times[last]}: ${formatAmount(data.close[last])} ${currency}`.trim(), ...(data.warnings || [])].join(' '));
      await draw();
    } catch (error) {
      if (id !== request) return;
      setStatus(`Minutkurserna kunde inte hämtas: ${error.message}`, true);
    }
  };

  window.hideIntraday = function() {
    request++;
    if (data) unpin(false);
    data = null;
    Plotly.purge(chart);
    panel.hidden = true;
  };
})();

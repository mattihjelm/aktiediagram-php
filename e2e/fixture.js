// Syntetisk testdata för Playwright-testerna: egen datakatalog, testlösenord och färska kurscacher,
// så att appen aldrig behöver Yahoo och aldrig rör private/data.
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const STOCKS = [
  {ticker: 'ALFA.ST', name: 'Alfa Test', start: 100, drift: 0.0006},
  {ticker: 'BETA.ST', name: 'Beta Test', start: 50, drift: -0.0002},
  {ticker: 'GAMMA.ST', name: 'Gamma Test', start: 200, drift: 0.0003},
];

const HELD_TICKER = 'ALFA.ST';

const isoDate = date => date.toISOString().slice(0, 10);

function businessDays(from, to) {
  const days = [];
  for (const day = new Date(from); day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(isoDate(day));
  }
  return days;
}

function phpString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Skapar testdatan och returnerar {dir, configFile, password}. */
function createFixture(dir) {
  const dataDir = path.join(dir, 'data');
  const sessionDir = path.join(dir, 'sessions');
  fs.mkdirSync(path.join(dataDir, 'cache'), {recursive: true});
  fs.mkdirSync(sessionDir, {recursive: true});

  let hash;
  const password = crypto.randomBytes(12).toString('hex');
  try {
    hash = execFileSync('php', ['-r', 'echo password_hash($argv[1], PASSWORD_DEFAULT);', password], {encoding: 'utf8'});
  } catch (error) {
    throw new Error(`PHP behövs för testerna men kunde inte köras: ${error.message}`);
  }
  const configFile = path.join(dir, 'config.php');
  fs.writeFileSync(configFile, `<?php return [
  'password_hash' => ${phpString(hash)},
  'data_dir' => ${phpString(dataDir)},
  'session_dir' => ${phpString(sessionDir)},
  'require_https' => false,
  'login_delay_seconds' => 0,
];
`);

  // Kurser varje vardag från två år sedan till i dag, med färska tidsstämplar så att ingen hämtning behövs.
  const today = new Date();
  const from = new Date(Date.UTC(today.getUTCFullYear() - 2, today.getUTCMonth(), today.getUTCDate()));
  const dates = businessDays(from, today);
  const now = Math.floor(Date.now() / 1000);
  let heldLastClose = 0;
  for (const stock of STOCKS) {
    const close = dates.map((_, index) =>
      Math.round(stock.start * Math.exp(stock.drift * index) * (1 + 0.02 * Math.sin(index / 9)) * 100) / 100);
    if (stock.ticker === HELD_TICKER) heldLastClose = close[close.length - 1];
    fs.writeFileSync(path.join(dataDir, 'cache', `${stock.ticker}.json`),
      JSON.stringify({dates, close, full_fetched_at: now, checked_at: now}));
  }

  // Minutkurser för den ägda aktien de senaste tio handelsdagarna, i svensk tid och aldrig efter nuvarande minut.
  const minutes = minuteSeries(heldLastClose);
  fs.writeFileSync(path.join(dir, 'minutes-base.json'), JSON.stringify(minutes));

  // Två köp och en försäljning av Alfa, så att legenden visar %/mån och %/år, och ett köp med
  // klockslag inom minutdiagrammets period, så att minutdiagrammet får en markering.
  const daysAgo = count => dates[Math.max(0, dates.length - 1 - count)];
  const recentDay = minutes.days[Math.max(0, minutes.days.length - 4)];
  const recentPrice = minutes.close[minutes.times.indexOf(`${recentDay} 10:15`)] || heldLastClose;
  const swedish = value => value.toFixed(2).replace('.', ',');
  // Bas för aktiekop.csv; resetState kopierar den till datakatalogen före varje test.
  fs.writeFileSync(path.join(dir, 'aktiekop-base.csv'), [
    'date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time',
    `${daysAgo(300)};KÖP;${HELD_TICKER};10;100,00;1,00;;;`,
    `${daysAgo(150)};KÖP;${HELD_TICKER};5;110,00;1,00;;;`,
    `${daysAgo(30)};SÄLJ;${HELD_TICKER};3;120,00;1,00;;;`,
    `${recentDay};KÖP;${HELD_TICKER};2;${swedish(recentPrice)};1,00;;;10:15`,
  ].join('\n') + '\n');

  const info = {
    dir, configFile, password,
    // Visningsnamn: aktier med transaktioner visas med kontot inom parentes (befintliga rader hör till konto T).
    stocks: STOCKS.map(({ticker, name}) => ({ticker, name, displayName: ticker === HELD_TICKER ? `${name} (T)` : name, series: ticker === HELD_TICKER ? `${ticker}|T` : ticker})),
    heldStock: 'Alfa Test (T)', heldTicker: HELD_TICKER, heldSeries: `${HELD_TICKER}|T`,
    view: {start: daysAgo(400), end: dates[dates.length - 1]},
    recentPurchase: {date: recentDay, time: '10:15'},
  };
  fs.writeFileSync(path.join(dir, 'fixture.json'), JSON.stringify(info, null, 2));
  resetState(dir);
  return info;
}

/** Datum och klockslag i svensk tid. */
function stockholmNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return {date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`};
}

/** Varje minut 09:00–17:29 de senaste tio handelsdagarna, med en jämn kurs nära senaste dagskursen. */
function minuteSeries(level) {
  const now = stockholmNow();
  const days = [];
  for (const day = new Date(`${now.date}T12:00:00Z`); days.length < 10; day.setUTCDate(day.getUTCDate() - 1)) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.unshift(isoDate(day));
  }
  const times = [];
  const close = [];
  for (const day of days) {
    for (let minute = 9 * 60; minute < 17 * 60 + 30; minute++) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      if (day === now.date && time > now.time) break;
      const index = times.length;
      times.push(`${day} ${time}`);
      close.push(Math.round(level * (1 + 0.01 * Math.sin(index / 40)) * 100) / 100);
    }
  }
  return {days: days.filter(day => times.some(time => time.startsWith(day))), times, close};
}

/**
 * Återställer det som testerna kan ändra: aktielistans synlighet, sparad vy, transaktionerna, minutcachen
 * (med färsk tidsstämpel, så att appen aldrig hämtar från Yahoo) och minutarkivet.
 */
function resetState(dir = process.env.AKTIER_E2E_DIR) {
  const info = JSON.parse(fs.readFileSync(path.join(dir, 'fixture.json'), 'utf8'));
  const dataDir = path.join(dir, 'data');
  fs.writeFileSync(path.join(dataDir, 'aktier.csv'),
    'ticker,name,show_initially\n' + info.stocks.map(stock => `${stock.ticker},${stock.name},true`).join('\n') + '\n');
  fs.writeFileSync(path.join(dataDir, 'aktievy.json'), JSON.stringify(info.view, null, 2) + '\n');
  const {times, close} = JSON.parse(fs.readFileSync(path.join(dir, 'minutes-base.json'), 'utf8'));
  fs.writeFileSync(path.join(dataDir, 'cache', `minutes-${info.heldTicker}.json`),
    JSON.stringify({currency: 'SEK', times, close, warnings: [], fetched_at: Math.floor(Date.now() / 1000)}));
  fs.copyFileSync(path.join(dir, 'aktiekop-base.csv'), path.join(dataDir, 'aktiekop.csv'));
  fs.rmSync(path.join(dataDir, 'intraday'), {recursive: true, force: true});
}

/** Skriver testdatans aktiekop.csv med kontokolumnen; raderna anges utan rubrik, semikolonseparerade. */
function writeTransactions(lines, dir = process.env.AKTIER_E2E_DIR) {
  fs.writeFileSync(path.join(dir, 'data', 'aktiekop.csv'),
    ['date;transaction_type;ticker;quantity;price;commission;source_id;amount_currency;time;account', ...lines].join('\n') + '\n');
}

/** Basraderna (utan kontokolumn) som semikolonseparerade rader, för att bygga vidare på i testerna. */
function baseTransactions(dir = process.env.AKTIER_E2E_DIR) {
  return fs.readFileSync(path.join(dir, 'aktiekop-base.csv'), 'utf8').trim().split(/\r?\n/).slice(1);
}

/** Datarader i testdatans aktiekop.csv, uppdelade på semikolon. */
function readTransactions(dir = process.env.AKTIER_E2E_DIR) {
  return fs.readFileSync(path.join(dir, 'data', 'aktiekop.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(line => line.split(';'));
}

/** Senaste dagskurs på eller före datumet ur testdatans kurscache, och första datum i cachen. */
function dailyClose(ticker, date, dir = process.env.AKTIER_E2E_DIR) {
  const {dates, close} = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'cache', `${ticker}.json`), 'utf8'));
  let index = -1;
  dates.forEach((day, position) => { if (day <= date) index = position; });
  return {close: index < 0 ? null : close[index], firstDate: dates[0], dates};
}

/** Skriver aktievy.json i testdatan, till exempel för att börja från en sparad eller äldre skala. */
function writeView(view, dir = process.env.AKTIER_E2E_DIR) {
  fs.writeFileSync(path.join(dir, 'data', 'aktievy.json'), JSON.stringify(view, null, 2) + '\n');
}

/** Den sparade vyn i aktievy.json. */
function readView(dir = process.env.AKTIER_E2E_DIR) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'data', 'aktievy.json'), 'utf8'));
}

/** Läser fixturens uppgifter i testerna. */
function readFixture() {
  return JSON.parse(fs.readFileSync(path.join(process.env.AKTIER_E2E_DIR, 'fixture.json'), 'utf8'));
}

function newFixtureDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aktier-e2e-'));
}

module.exports = {createFixture, readFixture, newFixtureDir, resetState, readView, readTransactions, dailyClose, writeView, writeTransactions, baseTransactions};

// Registrera transaktioner: förslag i formuläret, köp med klockslag, sälj, utdelning,
// felmeddelanden, sparade rader efter omladdning och markering i minutdiagrammet vid solo.
const {test, expect} = require('@playwright/test');
const {fixture, useStandardGuards, login, waitForApp, readTransactions, dailyClose} = require('./helpers');

useStandardGuards();

const BETA = fixture.stocks.find(stock => stock.ticker === 'BETA.ST');
const HELD = {ticker: fixture.heldTicker, name: fixture.heldStock};
const swedish = value => value.toLocaleString('sv-SE', {useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2});
const number = text => Number(String(text).replace(/[\s ]/g, '').replace('−', '-').replace(',', '.').replace(/[^\d.-]/g, ''));

async function openApp(page) {
  await login(page);
  await waitForApp(page);
}

/** Ett datum ungefär 30 handelsdagar bakåt, som har en dagskurs. */
function pastDate(ticker) {
  const {dates} = dailyClose(ticker, '9999-12-31');
  return dates[dates.length - 31];
}

async function fillForm(page, {type = 'KÖP', ticker, date, time, quantity, price, commission}) {
  await page.locator('#purchase-type').selectOption(type);
  await page.locator('#purchase-ticker').selectOption(ticker);
  await page.locator('#purchase-date').fill(date);
  await page.locator('#purchase-date').dispatchEvent('change');
  if (time !== undefined) await page.locator('#purchase-time').fill(time);
  if (quantity !== undefined) await page.locator('#purchase-quantity').fill(quantity);
  if (price !== undefined) await page.locator('#purchase-price').fill(price);
  if (commission !== undefined) await page.locator('#purchase-commission').fill(commission);
}

const submit = page => page.getByRole('button', {name: 'Lägg till transaktion'}).click();
const status = page => page.locator('#purchase-status');

/** Cellen i kolumnen med rubriken header på raden som innehåller text, i tabellen i container. */
function cell(page, container, text, header) {
  return page.locator(container).evaluate((root, [text, header]) => {
    const table = root.querySelector('table');
    if (!table) return null;
    const column = [...table.querySelectorAll('thead th')].findIndex(th => th.textContent.trim().startsWith(header));
    const row = [...table.querySelectorAll('tbody tr')].find(tr => tr.textContent.includes(text));
    return row && column >= 0 ? row.children[column].textContent.trim() : null;
  }, [text, header]);
}

test('val av aktie och datum föreslår kurs, courtage och totalbelopp', async ({page}) => {
  await openApp(page);
  const date = pastDate(BETA.ticker);
  const {close} = dailyClose(BETA.ticker, date);
  await fillForm(page, {ticker: BETA.ticker, date, quantity: '10'});
  await expect(page.locator('#purchase-price')).toHaveValue(swedish(close));
  const commission = Math.round(10 * close * 0.0025 * 100) / 100;
  await expect(page.locator('#purchase-commission')).toHaveValue(swedish(commission));
  const total = 10 * close + commission;
  await expect(page.locator('#purchase-total')).toHaveText(`Totalbelopp: ${total.toLocaleString('sv-SE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kr`);
});

test('köp med klockslag sparas och syns i listor, legend och diagram', async ({page}) => {
  await openApp(page);
  const date = pastDate(BETA.ticker);
  await expect(page.locator('.stock-legend-row', {hasText: BETA.name}).locator('.stock-legend-profit')).toHaveCount(0);
  await fillForm(page, {ticker: BETA.ticker, date, time: '13:37', quantity: '10'});
  await submit(page);

  await expect(status(page)).toContainText(`${BETA.name} (T): köp 10 st ${date}`);
  await expect(status(page)).toContainText('Sparat i aktiekop.csv.');
  const rows = readTransactions();
  expect(rows).toHaveLength(5);
  expect([rows[4][0], rows[4][1], rows[4][2], rows[4][3], rows[4][8], rows[4][9]]).toEqual([date, 'KÖP', BETA.ticker, '10', '13:37', 'T']);

  await expect(page.locator('#purchase-list-content')).toContainText(BETA.name);
  expect(await cell(page, '#purchase-list-content', BETA.name, 'Tid')).toBe('13:37');
  expect(await cell(page, '#purchase-list-content', BETA.name, 'Datum')).toBe(date);
  expect(number(await cell(page, '#portfolio-summary-content', BETA.name, 'Antal'))).toBe(10);

  await expect(page.locator('.stock-legend-row', {hasText: BETA.name}).locator('.stock-legend-profit'))
    .toHaveText(/%\/mån · [+−-][\d\s]+,\d{2}%\/år · [+−-]?[\d\s]+,\d kkr$/);
  const markerDates = await page.locator('#stock-chart').evaluate((graph, ticker) =>
    graph.data.find(trace => trace.meta && trace.meta.role === 'purchase' && trace.meta.ticker === ticker).x.map(String), BETA.ticker);
  expect(markerDates.map(value => value.slice(0, 10))).toContain(date);

  // Första köpet av Beta gav ett nytt värdepapper, så sidan laddades om; formuläret är då nytt
  // (kursen föreslås som vid varje sidladdning).
  await expect(page.locator('#purchase-quantity')).toHaveValue('');
  await expect(page.locator('#purchase-time')).toHaveValue('');
  await expect(page.locator('#purchase-commission')).toHaveValue('0,00');
});

test('köp på befintligt värdepapper läggs till utan omladdning och tömmer formuläret', async ({page}) => {
  await openApp(page);
  await page.evaluate(() => { window.notReloaded = true; });
  await fillForm(page, {ticker: HELD.ticker, date: pastDate(HELD.ticker), quantity: '2'});
  await submit(page);
  await expect(status(page)).toContainText(`${HELD.name}: köp 2 st`);
  expect(await page.evaluate(() => window.notReloaded)).toBe(true);
  await expect(page.locator('#purchase-quantity')).toHaveValue('');
  await expect(page.locator('#purchase-price')).toHaveValue('');
  await expect(page.locator('#purchase-commission')).toHaveValue('0,00');
});

test('sälj minskar antalet i Resultat', async ({page}) => {
  await openApp(page);
  const before = number(await cell(page, '#portfolio-summary-content', HELD.name, 'Antal'));
  expect(before).toBe(14);
  await fillForm(page, {type: 'SÄLJ', ticker: HELD.ticker, date: pastDate(HELD.ticker), quantity: '4'});
  await expect(page.locator('#purchase-total')).toHaveText(/^Nettobelopp: /);
  await submit(page);
  await expect(status(page)).toContainText(`${HELD.name}: sälj 4 st`);
  await expect.poll(async () => number(await cell(page, '#portfolio-summary-content', HELD.name, 'Antal'))).toBe(10);
  expect(readTransactions().at(-1).slice(1, 4)).toEqual(['SÄLJ', HELD.ticker, '4']);
});

test('utdelning byter fältnamn, döljer tid och sparas som UTDELNING', async ({page}) => {
  await openApp(page);
  await page.locator('#purchase-type').selectOption('UTDELNING');
  await expect(page.locator('#purchase-quantity-label')).toContainText('Antal aktier');
  await expect(page.locator('#purchase-price-label')).toContainText('Utdelning per aktie (i aktiens valuta)');
  await expect(page.locator('#purchase-fee-label')).toContainText('Källskatt');
  await expect(page.locator('#purchase-time-label')).toBeHidden();

  const before = await cell(page, '#portfolio-summary-content', HELD.name, 'Utdelning');
  await fillForm(page, {type: 'UTDELNING', ticker: HELD.ticker, date: pastDate(HELD.ticker), quantity: '14', price: '2,50', commission: '0,00'});
  await expect(page.locator('#purchase-total')).toHaveText('Utdelning efter källskatt: 35,00 kr');
  await submit(page);
  await expect(status(page)).toContainText(`${HELD.name}: utdelning`);
  await expect(status(page)).toContainText('källskatt');
  expect(readTransactions().at(-1).slice(1, 4)).toEqual(['UTDELNING', HELD.ticker, '14']);
  await expect.poll(() => cell(page, '#portfolio-summary-content', HELD.name, 'Utdelning')).not.toBe(before);
});

test('ogiltiga händelser ger felmeddelande och sparas inte', async ({page}, testInfo) => {
  await openApp(page);
  await fillForm(page, {ticker: BETA.ticker, date: pastDate(BETA.ticker), quantity: '0', price: '50,00'});
  await submit(page);
  await expect(status(page)).toHaveText('Antalet måste vara större än noll.');

  const {firstDate} = dailyClose(BETA.ticker, '9999-12-31');
  const before = new Date(`${firstDate}T12:00:00Z`);
  before.setUTCDate(before.getUTCDate() - 10);
  await fillForm(page, {ticker: BETA.ticker, date: before.toISOString().slice(0, 10), quantity: '5', price: '50,00'});
  await submit(page);
  await expect(status(page)).toHaveText('Det finns ingen kursdata före köpdatumet.');
  expect(readTransactions()).toHaveLength(4);
  // Appen svarar 400 på ogiltiga händelser, vilket webbläsaren loggar som resursfel.
  testInfo.consoleErrors = testInfo.consoleErrors.filter(text => !/status of 400/.test(text));
});

test('registrerad händelse finns kvar efter omladdning', async ({page}) => {
  await openApp(page);
  const date = pastDate(BETA.ticker);
  await fillForm(page, {ticker: BETA.ticker, date, quantity: '7'});
  await submit(page);
  await expect(status(page)).toContainText('Sparat i aktiekop.csv.');
  await page.reload();
  await waitForApp(page);
  await expect(page.locator('#purchase-list-content')).toContainText(BETA.name);
  expect(number(await cell(page, '#portfolio-summary-content', BETA.name, 'Antal'))).toBe(7);
});

test('köp under solo får en markering i minutdiagrammet', async ({page}) => {
  await openApp(page);
  await page.getByRole('checkbox', {name: `Visa endast ${HELD.name}`}).check();
  await expect(page.locator('#intraday-status')).toHaveText(/^Senaste kurs /);
  const {date} = fixture.recentPurchase;
  await fillForm(page, {ticker: HELD.ticker, date, time: '11:00', quantity: '1'});
  await submit(page);
  await expect(status(page)).toContainText('Sparat i aktiekop.csv.');
  await expect.poll(() => page.locator('#intraday-chart').evaluate(chart =>
    chart.data[2].x.map(value => String(value).replace('T', ' ').slice(0, 16)))).toContain(`${date} 11:00`);
});

// Ta bort transaktioner: exakt den rad som visas, med bekräftelse, och avvisning om filen har ändrats.
const fs = require('node:fs');
const path = require('node:path');
const purchaseFile = path.join(fixture.dir, 'data', 'aktiekop.csv');
const dividendRow = date => `${date};UTDELNING;${HELD.ticker};14;2.50;0.00;;;\n`;
const listRows = page => page.locator('#purchase-list-content tbody tr');
const deleteButton = (page, text) => listRows(page).filter({hasText: text}).first().getByRole('button', {name: /^Ta bort transaktion/});

test('en av två identiska utdelningar tas bort, den andra blir kvar', async ({page}) => {
  // Webbhotellet stoppar HTTP DELETE, så borttagningen måste gå som POST.
  const methods = [];
  page.on('request', request => { if (request.url().endsWith('api/purchases.php')) methods.push(request.method()); });
  const date = pastDate(HELD.ticker);
  fs.appendFileSync(purchaseFile, dividendRow(date) + dividendRow(date));
  await openApp(page);
  const dividends = () => listRows(page).filter({hasText: 'UTDELNING'});
  await expect(dividends()).toHaveCount(2);
  const before = await cell(page, '#portfolio-summary-content', HELD.name, 'Utdelning');

  await deleteButton(page, 'UTDELNING').click();
  await page.getByRole('button', {name: /^Bekräfta borttagning av/}).click();
  await expect(page.locator('#import-events-status')).toHaveText(`Transaktionen ${date} ${HELD.name} togs bort ur aktiekop.csv.`);
  await expect(dividends()).toHaveCount(1);
  expect(readTransactions().filter(row => row[1] === 'UTDELNING')).toHaveLength(1);
  expect(readTransactions()).toHaveLength(5);
  await expect.poll(() => cell(page, '#portfolio-summary-content', HELD.name, 'Utdelning')).not.toBe(before);
  const markers = await page.locator('#stock-chart').evaluate((graph, ticker) =>
    graph.data.find(trace => trace.meta && trace.meta.role === 'purchase' && trace.meta.ticker === ticker).customdata.filter(details => details[6] === 'UTDELNING').length, HELD.ticker);
  expect(markers).toBe(1);

  // Nycklarna för senare rader har flyttats fram, så även den sista raden går att ta bort utan omladdning.
  await deleteButton(page, 'UTDELNING').click();
  await page.getByRole('button', {name: /^Bekräfta borttagning av/}).click();
  await expect(dividends()).toHaveCount(0);
  expect(readTransactions()).toHaveLength(4);
  expect(methods).toEqual(['POST', 'POST']);
});

test('Avbryt behåller raden', async ({page}) => {
  await openApp(page);
  await deleteButton(page, 'SÄLJ').click();
  await page.getByRole('button', {name: 'Avbryt'}).click();
  await expect(deleteButton(page, 'SÄLJ')).toBeVisible();
  expect(readTransactions()).toHaveLength(4);
});

test('ändrad fil ger fel och ingenting tas bort', async ({page}, testInfo) => {
  await openApp(page);
  // Byt ut säljraden på disk efter att sidan laddats, så att nyckeln inte längre stämmer.
  fs.writeFileSync(purchaseFile, fs.readFileSync(purchaseFile, 'utf8').replace(';SÄLJ;ALFA.ST;3;120,00;', ';SÄLJ;ALFA.ST;3;121,00;'));
  const before = fs.readFileSync(purchaseFile, 'utf8');
  await deleteButton(page, 'SÄLJ').click();
  await page.getByRole('button', {name: /^Bekräfta borttagning av/}).click();
  await expect(page.locator('#import-events-status')).toHaveText('Transaktionen har ändrats eller tagits bort. Ladda om sidan.');
  expect(fs.readFileSync(purchaseFile, 'utf8')).toBe(before);
  await expect(deleteButton(page, 'SÄLJ')).toBeVisible();
  testInfo.consoleErrors = testInfo.consoleErrors.filter(text => !/status of 409/.test(text));
});

test('borttagning under solo tar bort markeringen i minutdiagrammet', async ({page}) => {
  await openApp(page);
  await page.getByRole('checkbox', {name: `Visa endast ${HELD.name}`}).check();
  await expect(page.locator('#intraday-status')).toHaveText(/^Senaste kurs /);
  const {date, time} = fixture.recentPurchase;
  const minuteMarkers = () => page.locator('#intraday-chart').evaluate(chart => chart.data[2].x.map(value => String(value).replace('T', ' ').slice(0, 16)));
  await expect.poll(minuteMarkers).toContain(`${date} ${time}`);
  await deleteButton(page, time).click();
  await page.getByRole('button', {name: /^Bekräfta borttagning av/}).click();
  await expect.poll(minuteMarkers).not.toContain(`${date} ${time}`);
  expect(readTransactions().some(row => row[8] === time)).toBe(false);
});

test('nyss registrerad transaktion kan tas bort utan omladdning', async ({page}) => {
  await openApp(page);
  const date = pastDate(BETA.ticker);
  await fillForm(page, {ticker: BETA.ticker, date, quantity: '3'});
  await submit(page);
  await expect(status(page)).toContainText('Sparat i aktiekop.csv.');
  expect(readTransactions()).toHaveLength(5);
  await deleteButton(page, BETA.name).click();
  await page.getByRole('button', {name: /^Bekräfta borttagning av/}).click();
  await expect(page.locator('#import-events-status')).toHaveText(`Transaktionen ${date} ${BETA.name} (T) togs bort ur aktiekop.csv.`);
  expect(readTransactions()).toHaveLength(4);
  await expect(listRows(page).filter({hasText: BETA.name})).toHaveCount(0);
});

test.describe('telefon', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});

  test('Ta bort och Bekräfta går att nå och trycka på i smal bredd', async ({page}, testInfo) => {
    await openApp(page);
    const button = deleteButton(page, 'SÄLJ');
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
    await page.screenshot({path: testInfo.outputPath('telefon-ta-bort.png')});
    await button.tap();
    const confirm = page.getByRole('button', {name: /^Bekräfta borttagning av/});
    await expect(confirm).toBeInViewport();
    await expect(page.getByRole('button', {name: 'Avbryt'})).toBeInViewport();
    await page.screenshot({path: testInfo.outputPath('telefon-bekrafta.png')});
    await confirm.tap();
    await expect(page.locator('#import-events-status')).toHaveText(/^Transaktionen .* togs bort ur aktiekop\.csv\.$/);
    expect(readTransactions()).toHaveLength(3);
  });
});

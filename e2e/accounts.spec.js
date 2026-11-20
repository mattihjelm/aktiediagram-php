// Konto per transaktion: samma aktie på två konton visas som två värdepapper med kontot inom parentes,
// kontot anges i formuläret och vid import, och dubblettkontrollen gäller per konto.
const fs = require('node:fs');
const path = require('node:path');
const {test, expect} = require('@playwright/test');
const {fixture, useStandardGuards, login, readView, readTransactions, dailyClose, clickCurvePoint} = require('./helpers');
const {writeTransactions, baseTransactions} = require('./fixture');

useStandardGuards();

const {dates} = dailyClose('ALFA.ST', '9999-12-31');
const accountDate = dates[dates.length - 200];
const recentDate = fixture.recentPurchase.date;
const ON_T = 'Alfa Test (T)';
const ON_I = 'Alfa Test (I)';

/** Basraderna på konto T och två köp av Alfa på konto I, varav ett med klockslag inom minutdiagrammets period. */
function twoAccounts() {
  writeTransactions([
    ...baseTransactions().map(line => `${line};T`),
    `${accountDate};KÖP;ALFA.ST;7;105,00;1,00;;;;I`,
    `${recentDate};KÖP;ALFA.ST;1;100,00;1,00;;;11:30;I`,
  ]);
}

const legendRows = page => page.locator('#stock-custom-legend .stock-legend-row');
const legendRow = (page, name) => legendRows(page).filter({has: page.getByRole('button', {name: new RegExp(`^${name.replace(/[()]/g, '\\$&')}`)})});
const legendNames = page => page.locator('#stock-custom-legend .stock-legend-name').evaluateAll(buttons => buttons.map(button => button.firstChild.textContent));
const soloBox = (page, name) => page.getByRole('checkbox', {name: `Visa endast ${name}`, exact: true});
const listNames = page => page.locator('#purchase-list-content tbody tr').evaluateAll(rows => rows.map(row => row.cells[3].textContent));
const summaryQuantity = (page, name) => page.locator('#portfolio-summary-content tbody tr').evaluateAll(
  (rows, name) => { const row = rows.find(candidate => candidate.cells[0].textContent === name); return row ? row.cells[1].textContent : null; }, name);
const status = page => page.locator('#purchase-status');
const importStatus = page => page.locator('#import-events-status');

async function openApp(page, rows) {
  await login(page);
  await expect(legendRows(page)).toHaveCount(rows);
}

async function fillPurchase(page, {account, quantity}) {
  await page.locator('#purchase-type').selectOption('KÖP');
  await page.locator('#purchase-ticker').selectOption('ALFA.ST');
  await page.locator('#purchase-date').fill(dates[dates.length - 31]);
  await page.locator('#purchase-date').dispatchEvent('change');
  await page.locator('#purchase-account').fill(account);
  await page.locator('#purchase-quantity').fill(quantity);
}

test('samma aktie på två konton blir två värdepapper med var sina transaktioner och resultat', async ({page}) => {
  twoAccounts();
  await openApp(page, 4);
  // Ordningen i aktier.csv, och kontoordning A–Z inom aktien.
  expect(await legendNames(page)).toEqual([ON_I, ON_T, 'Beta Test', 'Gamma Test']);
  // Konto T: 10 + 5 − 3 + 2; konto I: 7 + 1.
  await expect.poll(() => summaryQuantity(page, ON_T)).toBe('14');
  await expect.poll(() => summaryQuantity(page, ON_I)).toBe('8');
  const names = await listNames(page);
  expect(names.filter(name => name === ON_I)).toHaveLength(2);
  expect(names.filter(name => name === ON_T)).toHaveLength(4);
  const markers = await page.locator('#stock-chart').evaluate(graph => graph.data
    .filter(trace => trace.meta && trace.meta.role === 'purchase' && trace.meta.ticker === 'ALFA.ST')
    .map(trace => [trace.meta.series, trace.x.length, trace.customdata.map(details => details[12])]));
  expect(markers).toEqual([['ALFA.ST|I', 2, ['I', 'I']], ['ALFA.ST|T', 4, ['T', 'T', 'T', 'T']]]);
});

test('solo för ett konto filtrerar listorna och minutdiagrammets markeringar till kontot', async ({page}) => {
  twoAccounts();
  await openApp(page, 4);
  await soloBox(page, ON_I).check();
  await expect(page.locator('#intraday-title')).toHaveText(`${ON_I} – minutkurser`);
  await expect(page.locator('#intraday-status')).toHaveText(/^Senaste kurs /);
  const minuteMarkers = () => page.locator('#intraday-chart').evaluate(chart => chart.data[2].x.map(value => String(value).replace('T', ' ').slice(0, 16)));
  await expect.poll(minuteMarkers).toContain(`${recentDate} 11:30`);
  expect(await minuteMarkers()).not.toContain(`${recentDate} ${fixture.recentPurchase.time}`);
  await expect.poll(() => listNames(page)).toEqual([ON_I, ON_I]);
  expect(await page.locator('#portfolio-summary-content tbody tr').evaluateAll(rows => rows.map(row => row.cells[0].textContent))).toEqual([ON_I]);
  await expect.poll(() => readView().last_solo).toBe('ALFA.ST|I');
});

test('dold kontoserie sparas i aktievy.json och är dold efter omladdning', async ({page}) => {
  twoAccounts();
  const stockList = path.join(fixture.dir, 'data', 'aktier.csv');
  const before = fs.readFileSync(stockList, 'utf8');
  await openApp(page, 4);
  await legendRow(page, ON_I).getByRole('button').click();
  await expect.poll(() => (readView().series_visible || {})['ALFA.ST|I']).toBe(false);
  expect(fs.readFileSync(stockList, 'utf8')).toBe(before);
  await page.reload();
  await expect(legendRows(page)).toHaveCount(4);
  await expect(legendRow(page, ON_I)).toHaveClass(/is-hidden/);
  await expect(legendRow(page, ON_T)).not.toHaveClass(/is-hidden/);
});

test('första köpet på ett nytt konto laddar om sidan och visar det nya värdepapperet', async ({page}) => {
  await openApp(page, 3);
  await fillPurchase(page, {account: 'i', quantity: '3'});
  await page.getByRole('button', {name: 'Lägg till transaktion'}).click();
  await expect(legendRows(page)).toHaveCount(4);
  await expect(status(page)).toContainText(`${ON_I}: köp 3 st`);
  expect(await legendNames(page)).toEqual([ON_I, ON_T, 'Beta Test', 'Gamma Test']);
  const last = readTransactions().at(-1);
  expect([last[2], last[3], last[9]]).toEqual(['ALFA.ST', '3', 'I']);
});

test('ogiltigt konto ger fel och sparas inte', async ({page}, testInfo) => {
  await openApp(page, 3);
  await fillPurchase(page, {account: '1', quantity: '3'});
  await page.getByRole('button', {name: 'Lägg till transaktion'}).click();
  await expect(status(page)).toHaveText('Kontot ska vara en bokstav A–Z.');
  expect(readTransactions()).toHaveLength(4);
  testInfo.consoleErrors = testInfo.consoleErrors.filter(text => !/status of 400/.test(text));
});

test('klick på en kurva med konto fyller i kontot', async ({page}) => {
  twoAccounts();
  await openApp(page, 4);
  // Kurvorna för de två kontona sammanfaller; dölj T så att klicket träffar I.
  await legendRow(page, ON_T).getByRole('button').click();
  await expect(legendRow(page, ON_T)).toHaveClass(/is-hidden/);
  await expect(page.locator('#purchase-account')).toHaveValue('T');
  await clickCurvePoint(page, 'ALFA.ST', 0.5);
  await expect(page.locator('#purchase-account')).toHaveValue('I');
  await expect(page.locator('#purchase-ticker')).toHaveValue('ALFA.ST');
});

test('borttagning på ett konto lämnar det andra kontot orört', async ({page}) => {
  twoAccounts();
  await openApp(page, 4);
  const row = page.locator('#purchase-list-content tbody tr').filter({hasText: accountDate}).filter({hasText: ON_I});
  await row.getByRole('button', {name: /^Ta bort transaktion/}).click();
  await page.getByRole('button', {name: /^Bekräfta borttagning av/}).click();
  await expect(importStatus(page)).toHaveText(`Transaktionen ${accountDate} ${ON_I} togs bort ur aktiekop.csv.`);
  const accounts = readTransactions().map(fields => fields[9]);
  expect(accounts.filter(account => account === 'I')).toHaveLength(1);
  expect(accounts.filter(account => account === 'T')).toHaveLength(4);
  await expect.poll(() => summaryQuantity(page, ON_I)).toBe('1');
  await expect.poll(() => summaryQuantity(page, ON_T)).toBe('14');
});

/** Mäklarexport (UTF-16, tabbseparerad) med ett köp av Saab, som inte finns i testdatans aktielista. */
function exportFile() {
  const row = Array(28).fill('');
  Object.assign(row, {0: 'E2E-1', 2: '2024-05-02', 5: 'Köpt', 6: 'Saab', 8: '10', 9: '576,20', 26: '14,41', 27: 'SEK'});
  const text = [Array.from({length: 28}, (_, index) => `Kolumn ${index}`).join('\t'), row.join('\t')].join('\r\n') + '\r\n';
  return {name: 'export.csv', mimeType: 'text/csv', buffer: Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(text, 'utf16le')])};
}

test('importen kräver konto och kontrollerar dubbletter per konto', async ({page}, testInfo) => {
  await openApp(page, 3);
  const file = page.locator('#import-events-file');
  const account = page.locator('#import-account');
  const preview = page.getByRole('button', {name: 'Importera transaktioner'});
  await file.setInputFiles(exportFile());
  await preview.click();
  await expect(importStatus(page)).toHaveText('Ange kontot som importen gäller, en bokstav A–Z.');

  await account.fill('T');
  await preview.click();
  await expect(importStatus(page)).toContainText('Förhandsgranskning för konto T: 1 konverterbara transaktioner, 0 dubbletter, 1 nya rader');
  expect(readTransactions()).toHaveLength(4);
  await page.getByRole('button', {name: 'Bekräfta import'}).click();
  await expect(importStatus(page)).toContainText('1 nya händelser importerade på konto T; 0 dubbletter hoppades över.');
  const imported = readTransactions().at(-1);
  expect([imported[2], imported[6], imported[9]]).toEqual(['SAAB-B.ST', 'E2E-1', 'T']);

  // Samma fil på samma konto är en dubblett, på ett annat konto ny.
  await file.setInputFiles(exportFile());
  await preview.click();
  await expect(importStatus(page)).toContainText('Förhandsgranskning för konto T: 1 konverterbara transaktioner, 1 dubbletter, 0 nya rader');
  await account.fill('I');
  await preview.click();
  await expect(importStatus(page)).toContainText('Förhandsgranskning för konto I: 1 konverterbara transaktioner, 0 dubbletter, 1 nya rader');
  await page.getByRole('button', {name: 'Avbryt'}).click();
  expect(readTransactions()).toHaveLength(5);

  // Servern avvisar också en import utan konto.
  const refused = await page.evaluate(async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([0xFF, 0xFE, 0x61, 0x00])]), 'export.csv');
    const response = await window.apiFetch('api/import.php?step=preview', {method: 'POST', body: form});
    return [response.status, (await response.json()).error];
  });
  expect(refused).toEqual([400, 'Kontot ska vara en bokstav A–Z.']);
  testInfo.consoleErrors = testInfo.consoleErrors.filter(text => !/status of 400/.test(text));
});

test('sälj samma dag som köpet räknas efter köpet även när filen listar nyast först', async ({page}) => {
  // Som efter en import från mäklaren: nyast först, och dagens sälj före dagens köp.
  const sameDay = dates[dates.length - 100];
  writeTransactions([
    ...baseTransactions().map(line => `${line};T`),
    `${dates[dates.length - 90]};KÖP;ALFA.ST;5;110,00;1,00;;;;I`,
    `${sameDay};SÄLJ;ALFA.ST;4;108,00;1,00;;;;I`,
    `${sameDay};KÖP;ALFA.ST;3;107,00;1,00;;;;I`,
    `${accountDate};KÖP;ALFA.ST;1;105,00;1,00;;;;I`,
  ]);
  await openApp(page, 4);
  // 1 + 3 − 4 + 5.
  await expect.poll(() => summaryQuantity(page, ON_I)).toBe('5');
  await expect.poll(() => summaryQuantity(page, ON_T)).toBe('14');
});

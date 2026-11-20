// Transaktioner till höger om Resultat när båda tabellerna ryms i full bredd, annars under Resultat.
const {test, expect} = require('@playwright/test');
const {useStandardGuards, login, dailyClose} = require('./helpers');
const {writeTransactions, baseTransactions} = require('./fixture');

useStandardGuards();

const WIDE = {width: 2600, height: 1100};
const NARROW = {width: 1400, height: 1000};

// Basraderna och 40 köp av Gamma, fler än tio rader.
function manyTransactions() {
  const {dates} = dailyClose('GAMMA.ST', '9999-12-31');
  writeTransactions([
    ...baseTransactions().map(line => `${line};T`),
    ...Array.from({length: 40}, (_, index) => `${dates[dates.length - 200 + index * 4]};KÖP;GAMMA.ST;1;100,00;1,00;;;;T`),
  ]);
}

const layout = page => page.evaluate(() => {
  const box = selector => {
    const rect = document.querySelector(selector).getBoundingClientRect();
    return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height};
  };
  const list = document.getElementById('purchase-list-content');
  const header = list.querySelector('thead th').getBoundingClientRect();
  const visibleRows = [...list.querySelectorAll('tbody tr')].filter(row => {
    const rect = row.getBoundingClientRect();
    return rect.top >= header.bottom - 1 && rect.bottom <= list.getBoundingClientRect().bottom + 1;
  }).length;
  return {
    sideBySide: document.getElementById('transaction-tables').classList.contains('side-by-side'),
    summaryHeading: box('#portfolio-summary > h2'),
    listHeading: box('#purchase-list > h2'),
    summary: box('#portfolio-summary-content'),
    summaryTable: box('#portfolio-summary-content table'),
    list: box('#purchase-list-content'),
    visibleRows,
    scrollWidth: document.documentElement.scrollWidth,
  };
});

async function openApp(page, viewport) {
  await page.setViewportSize(viewport);
  manyTransactions();
  await login(page);
  await expect(page.locator('#stock-custom-legend .stock-legend-row')).toHaveCount(3);
  await expect(page.locator('#purchase-list-content tbody tr')).toHaveCount(44);
}

test('när båda ryms ligger Transaktioner till höger om Resultat med rubrikerna på samma rad', async ({page}) => {
  await openApp(page, WIDE);
  await expect.poll(async () => (await layout(page)).sideBySide).toBe(true);
  await expect.poll(async () => (await layout(page)).scrollWidth).toBeLessThanOrEqual(WIDE.width);
  const box = await layout(page);
  expect(Math.abs(box.listHeading.top - box.summaryHeading.top)).toBeLessThan(2);
  expect(box.list.left).toBeGreaterThanOrEqual(box.summary.right);
  expect(Math.abs(box.list.top - box.summary.top)).toBeLessThan(2);
  // Testdatans Resultat har tre rader, så listan visar minst tio rader.
  expect(box.summaryTable.height).toBeLessThan(box.list.height);
  expect(box.visibleRows).toBe(10);

  // Tabellen rullar inom sin yta och kolumnrubrikerna ligger kvar överst.
  const scroll = await page.locator('#purchase-list-content').evaluate(root => {
    root.scrollTop = root.scrollHeight;
    const area = root.getBoundingClientRect();
    const header = root.querySelector('thead th').getBoundingClientRect();
    const last = root.querySelector('tbody tr:last-child').getBoundingClientRect();
    return {headerAtTop: Math.abs(header.top - area.top) < 2, lastVisible: last.bottom <= area.bottom + 1};
  });
  expect(scroll).toEqual({headerAtTop: true, lastVisible: true});
});

test('bredvid en hög Resultat-tabell är listan lika hög som Resultat', async ({page}) => {
  await openApp(page, WIDE);
  // Högre Resultat-rader än tio transaktionsrader.
  await page.addStyleTag({content: '#portfolio-summary-content td { padding-top: 200px !important; }'});
  await page.evaluate(() => window.renderPortfolioSummary());
  await expect.poll(async () => (await layout(page)).sideBySide).toBe(true);
  await expect.poll(async () => {
    const box = await layout(page);
    return Math.abs(box.list.height - box.summaryTable.height) < 2 && box.visibleRows > 10;
  }).toBe(true);
});

test('när de inte ryms ligger Transaktioner under Resultat med tio rader', async ({page}) => {
  await openApp(page, NARROW);
  await expect.poll(async () => (await layout(page)).scrollWidth).toBeLessThanOrEqual(NARROW.width);
  const box = await layout(page);
  expect(box.sideBySide).toBe(false);
  expect(box.listHeading.top).toBeGreaterThanOrEqual(box.summary.bottom);
  expect(box.visibleRows).toBe(10);
});

/** Mäklarexport (UTF-16, tabbseparerad) med ett köp av Saab, som inte finns i testdatans aktielista. */
function exportFile() {
  const row = Array(28).fill('');
  Object.assign(row, {0: 'E2E-WIDE', 2: '2024-05-02', 5: 'Köpt', 6: 'Saab', 8: '10', 9: '576,20', 26: '14,41', 27: 'SEK'});
  const text = [Array.from({length: 28}, (_, index) => `Kolumn ${index}`).join('\t'), row.join('\t')].join('\r\n') + '\r\n';
  return {name: 'export.csv', mimeType: 'text/csv', buffer: Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(text, 'utf16le')])};
}

test('byte av fönsterbredd byter layout utan omladdning och behåller en pågående import', async ({page}) => {
  await openApp(page, WIDE);
  await expect.poll(async () => (await layout(page)).sideBySide).toBe(true);
  await page.evaluate(() => { window.__noReload = true; });
  await page.locator('#import-events-file').setInputFiles(exportFile());
  await page.locator('#import-account').fill('T');
  await page.getByRole('button', {name: 'Importera transaktioner'}).click();
  await expect(page.locator('#import-events-status')).toContainText('Förhandsgranskning för konto T');

  await page.setViewportSize(NARROW);
  await expect.poll(async () => (await layout(page)).sideBySide).toBe(false);
  await expect(page.locator('#import-events-status')).toContainText('Förhandsgranskning för konto T');
  await page.setViewportSize(WIDE);
  await expect.poll(async () => (await layout(page)).sideBySide).toBe(true);
  expect(await page.evaluate(() => window.__noReload)).toBe(true);

  // Importens knappar fungerar fortfarande efter bytena.
  await page.getByRole('button', {name: 'Avbryt'}).click();
  await expect(page.locator('#import-preview-actions')).toBeHidden();
});

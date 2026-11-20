// Värdepapperslistan: sortering på total avkastning i procent, mörkare text och sökfält.
const {test, expect} = require('@playwright/test');
const {useStandardGuards, login, waitForApp, readView, readTransactions, dailyClose} = require('./helpers');
const {writeTransactions, baseTransactions} = require('./fixture');

useStandardGuards();

const sortButton = (page, label) => page.locator('.stock-legend-sort').getByRole('button', {name: label, exact: true});
const legendNames = page => page.locator('#stock-custom-legend .stock-legend-name').evaluateAll(buttons => buttons.map(button => button.firstChild.textContent));
const search = page => page.getByRole('searchbox', {name: 'Sök värdepapper'});
const summaryNames = page => page.locator('#portfolio-summary-content tbody tr').evaluateAll(rows => rows.map(row => row.cells[0].textContent));
const listCount = page => page.locator('#purchase-list-content tbody tr').count();
// Fyra rader med Alfa på två konton (mixedHoldings), annars testdatans tre.
const openApp = async (page, rows = 4) => { await login(page); await expect(page.locator('#stock-custom-legend .stock-legend-row')).toHaveCount(rows); };
const visibleTraces = page => page.locator('#stock-chart').evaluate(graph => graph.data
  .filter(trace => trace.meta && trace.meta.role === 'stock').map(trace => [trace.meta.series, trace.visible]));

/** Basraderna och ett litet tidigt köp av Gamma till låg kurs, och Alfa även på konto I. */
function mixedHoldings() {
  const {dates} = dailyClose('GAMMA.ST', '9999-12-31');
  const alfa = dailyClose('ALFA.ST', '9999-12-31').dates;
  writeTransactions([
    ...baseTransactions().map(line => `${line};T`),
    `${dates[50]};KÖP;GAMMA.ST;1;50,00;1,00;;;;T`,
    `${alfa[alfa.length - 40]};KÖP;ALFA.ST;2;100,00;1,00;;;;I`,
  ]);
}

test('Total % sorterar som kolumnen Tot avkastn (%) och sparas', async ({page}) => {
  mixedHoldings();
  await openApp(page);
  await sortButton(page, 'Total %').click();
  await expect(sortButton(page, 'Total %')).toHaveAttribute('aria-pressed', 'true');
  await expect(sortButton(page, 'Total')).toHaveAttribute('aria-pressed', 'false');

  // Förväntad ordning: Resultat-raderna efter Tot avkastn (%) med högst först, sedan värdepapper utan värde.
  const percents = await page.locator('#portfolio-summary-content tbody tr').evaluateAll(rows => rows.map(row => [
    row.cells[0].textContent,
    Number(row.cells[7].textContent.replace(/\s/g, '').replace('−', '-').replace(',', '.').replace('%', '')),
  ]));
  expect(percents.length).toBe(3);
  const expected = percents.slice().sort((a, b) => b[1] - a[1]).map(([name]) => name).concat('Beta Test');
  await expect.poll(() => legendNames(page)).toEqual(expected);
  await expect.poll(() => readView().legend_sort).toBe('total_percent');

  await page.reload();
  await expect(page.locator('#stock-custom-legend .stock-legend-row')).toHaveCount(4);
  await expect(sortButton(page, 'Total %')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => legendNames(page)).toEqual(expected);
});

test('aktienamn och avkastningsrad har 30 % mörkare text, dolda rader är nedtonade', async ({page}) => {
  await login(page);
  await waitForApp(page);
  const row = page.locator('.stock-legend-row', {hasText: 'Alfa Test (T)'});
  await expect(row.locator('.stock-legend-name')).toHaveCSS('color', 'rgb(27, 36, 50)');
  await expect(row.locator('.stock-legend-profit')).toHaveCSS('color', 'rgb(30, 38, 49)');
  await row.locator('.stock-legend-name').click();
  await expect(page.locator('.stock-legend-row', {hasText: 'Alfa Test (T)'})).toHaveClass(/is-hidden/);
  await expect(page.locator('.stock-legend-row', {hasText: 'Alfa Test (T)'}).locator('.stock-legend-name')).toHaveCSS('opacity', '0.48');
});

test('sökfältet filtrerar listan på del av namnet utan att ändra något annat', async ({page}) => {
  mixedHoldings();
  await openApp(page);
  const field = search(page);
  // Sist i rubriken, efter sorteringsknapparna.
  expect(await page.locator('.stock-legend-header').evaluate(header => {
    const children = [...header.querySelectorAll('.stock-legend-sort, #stock-legend-search')];
    return children.map(child => child.className || child.id);
  })).toEqual(['stock-legend-sort', 'stock-legend-search']);
  const traces = await visibleTraces(page);
  const summary = await summaryNames(page);
  const transactions = await listCount(page);
  const savedView = readView();

  await field.fill('ALFA');
  await expect.poll(() => legendNames(page)).toEqual(['Alfa Test (I)', 'Alfa Test (T)']);
  await field.fill('(i)');
  await expect.poll(() => legendNames(page)).toEqual(['Alfa Test (I)']);
  await field.fill('mma');
  await expect.poll(() => legendNames(page)).toEqual(['Gamma Test (T)']);

  expect(await visibleTraces(page)).toEqual(traces);
  expect(await summaryNames(page)).toEqual(summary);
  expect(await listCount(page)).toBe(transactions);
  expect(readView()).toEqual(savedView);
  expect(readTransactions().length).toBe(6);

  await field.fill('finns inte');
  await expect(page.locator('#stock-custom-legend')).toContainText('Inga värdepapper matchar sökningen.');
  await expect(page.locator('#stock-custom-legend .stock-legend-row')).toHaveCount(0);
  await field.fill('');
  await expect.poll(() => legendNames(page)).toEqual(['Alfa Test (I)', 'Alfa Test (T)', 'Beta Test', 'Gamma Test (T)']);
});

test('sökfältet behåller text och fokus när listan ritas om, och töms vid omladdning', async ({page}) => {
  mixedHoldings();
  await openApp(page);
  const field = search(page);
  await field.click();
  await field.pressSequentially('test');
  // Omritning medan fältet har fokus: en kurva döljs via diagrammets API och listan ritas om.
  await page.evaluate(() => window.renderCustomLegend());
  await expect(field).toBeFocused();
  await field.press('End');
  await field.pressSequentially(' (t');
  await expect(field).toHaveValue('test (t');
  await expect.poll(() => legendNames(page)).toEqual(['Alfa Test (T)', 'Gamma Test (T)']);

  // Sortering och av/på medan filtret gäller.
  await sortButton(page, 'Namn').click();
  await expect(sortButton(page, 'Namn')).toHaveAttribute('aria-pressed', 'true');
  await expect(field).toHaveValue('test (t');
  await page.locator('.stock-legend-row', {hasText: 'Gamma Test (T)'}).locator('.stock-legend-name').click();
  await expect(page.locator('.stock-legend-row', {hasText: 'Gamma Test (T)'})).toHaveClass(/is-hidden/);
  await expect.poll(() => legendNames(page)).toEqual(['Alfa Test (T)', 'Gamma Test (T)']);
  await expect(field).toHaveValue('test (t');

  await page.reload();
  await expect(page.locator('#stock-custom-legend .stock-legend-row')).toHaveCount(4);
  await expect(search(page)).toHaveValue('');
  await expect.poll(async () => (await legendNames(page)).length).toBe(4);
});

test.describe('telefon', () => {
  test.use({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});

  test('sökfältet ryms och sidan rullar inte i sidled', async ({page}) => {
    mixedHoldings();
    await openApp(page);
    const field = search(page);
    await expect(field).toBeVisible();
    await field.fill('beta');
    await expect.poll(() => legendNames(page)).toEqual(['Beta Test']);
    const box = await field.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

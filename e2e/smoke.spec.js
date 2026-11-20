// Röktester: inloggning, att diagram och legend laddas, utloggning och telefonbredd.
// Körs mot syntetisk testdata (e2e/fixture.js) utan nätverk utanför 127.0.0.1.
const {test, expect} = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const {fixture, useStandardGuards, login, waitForApp, readView, dailyClose} = require('./helpers');

useStandardGuards();

test('utan inloggning skickas man till inloggningen', async ({page}) => {
  await page.goto('index.php');
  await expect(page).toHaveURL(/login\.php$/);
  await expect(page.getByRole('button', {name: 'Logga in'})).toBeVisible();
});

test('fel lösenord ger ett felmeddelande', async ({page}, testInfo) => {
  await login(page, 'fel-lösenord');
  await expect(page.locator('.login-error')).toHaveText('Fel lösenord.');
  await expect(page).toHaveURL(/login\.php$/);
  // Sidan svarar med 401 vid fel lösenord, vilket webbläsaren loggar som ett resursfel.
  testInfo.consoleErrors = testInfo.consoleErrors.filter(text => !/status of 401/.test(text));
});

test('inloggning öppnar appen med diagram och aktielegend', async ({page}) => {
  const historyChecks = [];
  page.on('response', async response => {
    if (response.url().endsWith('api/history.php') && response.request().method() === 'GET') {
      historyChecks.push(await response.json());
    }
  });
  await login(page);
  await expect(page).toHaveURL(/index\.php$|\/$/);
  await waitForApp(page);

  // Testdatans kurscacher är färska, så appen behöver inte hämta något från Yahoo.
  expect(historyChecks).toEqual([{needed: []}]);

  const stockTraces = await page.locator('#stock-chart').evaluate(graph =>
    graph.data.filter(trace => trace.meta && trace.meta.role === 'stock').map(trace => trace.meta.ticker));
  expect(stockTraces).toEqual(fixture.stocks.map(stock => stock.ticker));

  const names = await page.locator('#stock-custom-legend .stock-legend-name').evaluateAll(buttons =>
    buttons.map(button => button.firstChild.textContent));
  expect(names).toEqual(fixture.stocks.map(stock => stock.displayName));
  for (const label of ['Osorterad', 'Namn', '%/mån', 'Total', 'Total %']) {
    await expect(page.locator('.stock-legend-sort').getByRole('button', {name: label, exact: true})).toBeVisible();
  }
});

test('ägd aktie visar avkastning per månad, per år och totalt i kkr', async ({page}) => {
  await login(page);
  await waitForApp(page);
  const held = page.locator('.stock-legend-row', {hasText: fixture.heldStock}).locator('.stock-legend-profit');
  await expect(held).toHaveText(/%\/mån · [+−-][\d\s]+,\d{2}%\/år · [+−-]?[\d\s]+,\d kkr$/);
});

test('utloggning går tillbaka till inloggningen', async ({page}) => {
  await login(page);
  await waitForApp(page);
  await page.getByRole('button', {name: 'Logga ut'}).click();
  await expect(page).toHaveURL(/login\.php$/);
  await page.goto('index.php');
  await expect(page).toHaveURL(/login\.php$/);
});

test.describe('telefon', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});

  test('sidan laddas utan att rulla i sidled', async ({page}) => {
    await login(page);
    await waitForApp(page);
    // Jämför med skärmens bredd: i telefonläge växer innerWidth med innehållet och döljer felet.
    // Huvuddiagrammet ritas först i fönstrets bredd och krymper strax därefter, så vänta in det.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
  });
});

// Fält, listrutor och knappar i formuläret, Kurser och Datumintervall: samma höjd som formulärets fält,
// Kurser och Datumintervall linjerade med formulärets rubrik, och ordet transaktion i stället för aktiehändelse.
for (const {name, viewport, height} of [
  {name: 'dator', viewport: {width: 1400, height: 900}, height: 35},
  {name: 'mellanbred', viewport: {width: 800, height: 900}, height: 35},
  {name: 'telefon', viewport: {width: 390, height: 844}, height: 33},
]) {
  test(`kontroller och rubriker, ${name}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await login(page);
    await waitForApp(page);
    await expect(page.locator('#purchase-panel h2')).toHaveText('Registrera transaktion');
    await expect(page.getByRole('button', {name: 'Lägg till transaktion'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Importera transaktioner'})).toBeVisible();
    expect(await page.evaluate(() => document.body.innerText.toLowerCase().includes('aktiehändelse'))).toBe(false);

    const layout = await page.evaluate(() => {
      const controls = [...document.querySelectorAll(
        '#purchase-form input:not([type=checkbox]), #purchase-form select, #purchase-form button, '
        + '#visible-date-controls input:not([type=checkbox]), #refresh-data-button, #current-price-button')]
        .filter(element => element.getClientRects().length);
      const left = selector => document.querySelector(selector).getBoundingClientRect().left;
      return {
        heights: controls.map(element => [element.id || element.textContent.trim(), element.getBoundingClientRect().height]),
        heading: left('#purchase-panel h2'),
        quote: left('#refresh-controls h2'),
        dates: left('#visible-date-controls h2'),
      };
    });
    expect(layout.heights.length).toBeGreaterThanOrEqual(10);
    for (const [label, value] of layout.heights) expect(Math.abs(value - height), `${label}: ${value}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(layout.quote - layout.heading)).toBeLessThanOrEqual(1);
    expect(layout.dates).toBeGreaterThanOrEqual(layout.heading - 1);
  });
}

test('sortering på total avkastning och rubriker med Värdepapper', async ({page}) => {
  // Ett tidigt köp av Gamma till låg kurs ger större total avkastning än Alfa, som står först i aktier.csv.
  const {dates} = dailyClose('GAMMA.ST', '9999-12-31');
  fs.appendFileSync(path.join(fixture.dir, 'data', 'aktiekop.csv'), `${dates[50]};KÖP;GAMMA.ST;20;100,00;1,00;;;\n`);
  await login(page);
  await waitForApp(page);
  await expect(page.getByRole('complementary', {name: 'Värdepapperslistan'})).toBeVisible();
  await expect(page.locator('.stock-legend-header')).toContainText('Värdepapper / resultat');
  await expect(page.locator('#portfolio-summary-content thead th').first()).toHaveText('Värdepapper');
  await expect(page.getByRole('button', {name: 'Sortera transaktioner på värdepapper'})).toHaveText(/^Värdepapper/);

  await page.locator('.stock-legend-sort').getByRole('button', {name: 'Total', exact: true}).click();
  await expect(page.locator('.stock-legend-sort').getByRole('button', {name: 'Total', exact: true})).toHaveAttribute('aria-pressed', 'true');
  // Högst total avkastning först (Gamma, sedan Alfa), Beta utan avkastning sist.
  const names = await page.locator('#stock-custom-legend .stock-legend-name').evaluateAll(buttons => buttons.map(button => button.firstChild.textContent));
  expect(names).toEqual(['Gamma Test (T)', 'Alfa Test (T)', 'Beta Test']);
  const totals = await page.locator('#stock-chart').evaluate(graph =>
    graph.data.filter(trace => trace.meta && trace.meta.role === 'stock').map(trace => [trace.meta.ticker, trace.meta.totalSek]));
  expect(Object.fromEntries(totals)['GAMMA.ST']).toBeGreaterThan(Object.fromEntries(totals)['ALFA.ST']);
  await expect.poll(() => readView().legend_sort).toBe('total');
  await page.reload();
  await waitForApp(page);
  await expect(page.locator('.stock-legend-sort').getByRole('button', {name: 'Total', exact: true})).toHaveAttribute('aria-pressed', 'true');
});

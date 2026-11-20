// Solo och minutdiagrammet: val och avval, sparat solo-val, nollpunkt, markeringar,
// tidsintervall, låst punkt, CSV-arkiv, filtrerade listor och telefonlayout.
const fs = require('node:fs');
const {test, expect} = require('@playwright/test');
const {fixture, useStandardGuards, login, waitForApp, readView} = require('./helpers');

useStandardGuards();

const panel = page => page.locator('#intraday-panel');
const legendRow = (page, name) => page.locator('.stock-legend-row', {hasText: name});
const soloBox = (page, name) => page.getByRole('checkbox', {name: `Visa endast ${name}`});
const appState = page => page.evaluate(() => ({solo: window.getSoloSeries(), visible: window.getVisibleSeries()}));
const allSeries = fixture.stocks.map(stock => stock.series);

async function openApp(page) {
  await login(page);
  await waitForApp(page);
}

async function soloHeld(page) {
  await soloBox(page, fixture.heldStock).check();
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('#intraday-status')).toHaveText(/^Senaste kurs \d{4}-\d{2}-\d{2} \d{2}:\d{2}: [\d\s]+,\d{2} (kr|SEK)/);
}

/** Minutdiagrammets Plotly-data och layout. */
const minuteChart = page => page.locator('#intraday-chart').evaluate(chart => ({
  traces: chart.data.map(trace => ({mode: trace.mode, x: trace.x, y: trace.y})),
  annotations: (chart.layout.annotations || []).map(annotation => annotation.text),
  shapes: (chart.layout.shapes || []).length,
  range: chart.layout.xaxis.range,
}));

test('solo visar bara aktien, öppnar minutdiagrammet och sparas', async ({page}) => {
  await openApp(page);
  await expect(panel(page)).toBeHidden();
  await soloHeld(page);
  await expect(page.locator('#intraday-title')).toHaveText(`${fixture.heldStock} – minutkurser`);
  expect(await appState(page)).toEqual({solo: fixture.heldSeries, visible: [fixture.heldSeries]});
  await expect.poll(() => readView().last_solo).toBe(fixture.heldSeries);
});

test('minutdiagrammet visar nollpunkt och köpmarkering', async ({page}) => {
  await openApp(page);
  await soloHeld(page);
  // Etiketten får ▲ eller ▼ när nollpunkten ligger utanför det synliga kursintervallet.
  await expect.poll(async () => (await minuteChart(page)).annotations.join(' | '))
    .toMatch(/(^|\| )([▲▼] )?Nollpunkt [\d\s]+,\d{2} kr/);
  const chart = await minuteChart(page);
  expect(chart.shapes).toBeGreaterThanOrEqual(1);
  // Spår 2 är transaktionerna; köpet med klockslag 10:15 ligger inom minutperioden.
  const {date, time} = fixture.recentPurchase;
  expect(chart.traces[2].x.map(value => String(value).replace('T', ' ').slice(0, 16))).toContain(`${date} ${time}`);
});

test('Vecka och Månad ändrar tidsintervallet', async ({page}) => {
  await openApp(page);
  await soloHeld(page);
  const spanDays = async () => {
    const {range} = await minuteChart(page);
    return (Date.parse(range[1]) - Date.parse(range[0])) / 86400000;
  };
  await expect(page.getByRole('button', {name: 'Vecka'})).toHaveAttribute('aria-pressed', 'true');
  expect(await spanDays()).toBeLessThanOrEqual(7.01);
  await page.getByRole('button', {name: 'Månad'}).click();
  await expect(page.getByRole('button', {name: 'Månad'})).toHaveAttribute('aria-pressed', 'true');
  expect(await spanDays()).toBeGreaterThan(7.01);
  await page.getByRole('button', {name: 'Vecka'}).click();
  await expect.poll(spanDays).toBeLessThanOrEqual(7.01);
});

test('klick låser en punkt, ▶ flyttar en minut och Esc stänger', async ({page}) => {
  await openApp(page);
  await soloHeld(page);
  const plot = page.locator('#intraday-chart .nsewdrag').first();
  // Minutdiagrammet ligger under huvuddiagrammet; musen når bara det som syns i fönstret.
  await plot.scrollIntoViewIfNeeded();
  const box = await plot.boundingBox();
  // Plotly registrerar klicket på den punkt som hovras, så pekaren förs dit först.
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x - 5, y);
  await page.mouse.move(x, y, {steps: 3});
  await page.mouse.click(x, y);
  const pin = page.locator('#intraday-pin');
  await expect(pin).toBeVisible();
  const first = await page.locator('#intraday-pin-time').textContent();
  await expect(page.locator('#intraday-pin-price')).toHaveText(/^[\d\s]+,\d{2} (kr|SEK)$/);
  await page.locator('#intraday-pin-next').click();
  await expect(page.locator('#intraday-pin-time')).not.toHaveText(first);
  expect(await page.locator('#intraday-pin-time').textContent() > first).toBe(true);
  await page.keyboard.press('Escape');
  await expect(pin).toBeHidden();
});

test('Ladda ner CSV hämtar arkivet', async ({page}) => {
  await openApp(page);
  await soloHeld(page);
  const link = page.getByRole('link', {name: 'Ladda ner CSV'});
  await expect(link).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
  const lines = fs.readFileSync(await download.path(), 'utf8').trim().split(/\r?\n/);
  expect(lines[0]).toBe('time;close;currency');
  expect(lines.length).toBeGreaterThan(1);
  expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2};[\d,]+;SEK$/);
});

test('listorna filtreras till solo-aktien', async ({page}) => {
  await openApp(page);
  await expect(page.locator('#filter-solo-lists')).toBeChecked();
  await soloHeld(page);
  const otherNames = fixture.stocks.map(stock => stock.displayName).filter(name => name !== fixture.heldStock);
  for (const id of ['#portfolio-summary-content', '#purchase-list-content']) {
    const list = page.locator(id);
    await expect(list).toContainText(fixture.heldStock);
    for (const name of otherNames) await expect(list).not.toContainText(name);
  }
});

test('avval av solo återställer aktierna, döljer minutdiagrammet och tömmer solo-valet', async ({page}) => {
  await openApp(page);
  await soloHeld(page);
  await soloBox(page, fixture.heldStock).uncheck();
  await expect(panel(page)).toBeHidden();
  expect(await appState(page)).toEqual({solo: null, visible: allSeries});
  await expect.poll(() => readView().last_solo).toBeNull();
});

test('sparat solo-val väljs vid start, men inte efter avval', async ({page}) => {
  await openApp(page);
  await soloHeld(page);
  await expect.poll(() => readView().last_solo).toBe(fixture.heldSeries);

  await page.reload();
  await waitForApp(page);
  await expect(panel(page)).toBeVisible();
  await expect(soloBox(page, fixture.heldStock)).toBeChecked();
  expect(await appState(page)).toEqual({solo: fixture.heldSeries, visible: [fixture.heldSeries]});

  await soloBox(page, fixture.heldStock).uncheck();
  await expect.poll(() => readView().last_solo).toBeNull();
  await page.reload();
  await waitForApp(page);
  await expect(panel(page)).toBeHidden();
  expect((await appState(page)).solo).toBeNull();
});

test('klick på ett aktienamn under solo avslutar solo', async ({page}) => {
  await openApp(page);
  await soloHeld(page);
  const other = fixture.stocks.find(stock => stock.displayName !== fixture.heldStock);
  await legendRow(page, other.name).getByRole('button').click();
  await expect(panel(page)).toBeHidden();
  const state = await appState(page);
  expect(state.solo).toBeNull();
  // Den klickade aktien växlas från läget före solo (synlig) till dold.
  expect(state.visible).toEqual(allSeries.filter(series => series !== other.series));
  await expect.poll(() => readView().last_solo).toBeNull();
});

test.describe('telefon', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});

  test('minutdiagrammet ligger överst', async ({page}) => {
    await openApp(page);
    await soloHeld(page);
    const tops = await page.evaluate(() => ({
      minute: document.getElementById('intraday-panel').getBoundingClientRect().top,
      main: document.getElementById('stock-chart').getBoundingClientRect().top,
    }));
    expect(tops.minute).toBeLessThan(tops.main);
  });
});

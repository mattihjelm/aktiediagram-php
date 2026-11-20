// Jämförelse mellan två klickade punkter på en kurva, och att den tas bort när kurvan döljs.
const {test, expect} = require('@playwright/test');
const {fixture, useStandardGuards, login, waitForApp, clickCurvePoint} = require('./helpers');

useStandardGuards();

const ALFA = fixture.stocks.find(stock => stock.ticker === 'ALFA.ST');
const GAMMA = fixture.stocks.find(stock => stock.ticker === 'GAMMA.ST');
const BETA = fixture.stocks.find(stock => stock.ticker === 'BETA.ST');
const HELP = 'Klicka på aktien för av/på. Klicka två punkter på samma kurva för jämförelse.';

async function openApp(page) {
  await login(page);
  await waitForApp(page);
}

/** Jämförelseetiketterna i huvuddiagrammet (slutetiketterna är bara aktienamn). */
const comparisonLabels = page => page.locator('#stock-chart').evaluate(graph =>
  (graph.layout.annotations || []).map(annotation => String(annotation.text))
    .filter(text => /^.+: [+−-]?\d+,\d{2}% · .*\/månad · \d+,\d mån$/.test(text)));

async function compare(page, stock) {
  await clickCurvePoint(page, stock.ticker, 0.5);
  await expect(page.locator('#stock-legend-help')).toHaveText(`Första punkten vald på ${stock.displayName}. Klicka en gång till på samma kurva.`);
  await clickCurvePoint(page, stock.ticker, 0.9);
  await expect.poll(() => comparisonLabels(page)).toContainEqual(expect.stringMatching(new RegExp(`^${stock.displayName.replace(/[()]/g, "\\$&")}: `)));
}

const labelsFor = async (page, stock) => (await comparisonLabels(page)).filter(text => text.startsWith(`${stock.displayName}: `));
const legendName = (page, stock) => page.locator('.stock-legend-row', {hasText: stock.name}).getByRole('button');
const soloBox = (page, stock) => page.getByRole('checkbox', {name: `Visa endast ${stock.displayName}`});

test('två klick på samma kurva skapar en jämförelseetikett', async ({page}) => {
  await openApp(page);
  await compare(page, ALFA);
  const [label] = await labelsFor(page, ALFA);
  expect(label).toMatch(/^Alfa Test \(T\): [+−-]?\d+,\d{2}% · [+−-]?\d+,\d{2}%\/månad · \d+,\d mån$/);
  await expect(page.locator('#stock-legend-help')).toHaveText(HELP);
});

test('dold aktie tar bort sin jämförelse men inte andras, och den kommer inte tillbaka', async ({page}) => {
  await openApp(page);
  await compare(page, ALFA);
  await compare(page, GAMMA);
  expect(await labelsFor(page, ALFA)).toHaveLength(1);

  await legendName(page, ALFA).click();
  await expect.poll(() => labelsFor(page, ALFA)).toHaveLength(0);
  expect(await labelsFor(page, GAMMA)).toHaveLength(1);

  await legendName(page, ALFA).click();
  await expect(page.locator('.stock-legend-row', {hasText: ALFA.name})).not.toHaveClass(/is-hidden/);
  expect(await labelsFor(page, ALFA)).toHaveLength(0);
  expect(await labelsFor(page, GAMMA)).toHaveLength(1);
});

test('solo för en annan aktie tar bort jämförelsen, även efter avval', async ({page}) => {
  await openApp(page);
  await compare(page, ALFA);
  await soloBox(page, BETA).check();
  await expect.poll(() => labelsFor(page, ALFA)).toHaveLength(0);
  await soloBox(page, BETA).uncheck();
  await expect(page.locator('#intraday-panel')).toBeHidden();
  expect(await labelsFor(page, ALFA)).toHaveLength(0);
});

test('solo för samma aktie behåller jämförelsen', async ({page}) => {
  await openApp(page);
  await compare(page, ALFA);
  await soloBox(page, ALFA).check();
  await expect(page.locator('#intraday-panel')).toBeVisible();
  expect(await labelsFor(page, ALFA)).toHaveLength(1);
});

test('påbörjad jämförelse rensas när aktien döljs', async ({page}) => {
  await openApp(page);
  await clickCurvePoint(page, ALFA.ticker, 0.5);
  await expect(page.locator('#stock-legend-help')).toHaveText(/^Första punkten vald på Alfa Test \(T\)\./);
  await legendName(page, ALFA).click();
  await expect(page.locator('#stock-legend-help')).toHaveText(HELP);
  // Ett nytt klick på en annan kurva börjar om i stället för att avsluta något.
  await clickCurvePoint(page, GAMMA.ticker, 0.5);
  await expect(page.locator('#stock-legend-help')).toHaveText(/^Första punkten vald på Gamma Test\./);
  expect(await comparisonLabels(page)).toEqual([]);
});

test('dubbelklick utanför kurvorna rensar alla jämförelser', async ({page}) => {
  await openApp(page);
  await compare(page, ALFA);
  await compare(page, GAMMA);
  const box = await page.locator('#stock-chart .nsewdrag').first().boundingBox();
  // Ett dubbelklick inom 600 ms efter ett kurvklick räknas som klick på kurvan, så vänta lite först.
  await page.waitForTimeout(700);
  // Övre vänstra hörnet av diagramytan ligger långt från kurvorna, som börjar vid index 100.
  await page.mouse.dblclick(box.x + 15, box.y + 15);
  await expect.poll(() => comparisonLabels(page)).toEqual([]);
});

test('dubbelklick på en kurva rensar inte jämförelserna', async ({page}) => {
  await openApp(page);
  await compare(page, GAMMA);
  // Ett dubbelklick nära en kurva väljer kurvpunkter (jämförelse på Alfa) i stället för att rensa.
  const point = await clickCurvePoint(page, ALFA.ticker, 0.7);
  await page.waitForTimeout(700);
  await page.mouse.dblclick(point.x, point.y);
  await page.waitForTimeout(300);
  expect(await labelsFor(page, GAMMA)).toHaveLength(1);
});

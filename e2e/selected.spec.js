// Värdepapperslistan: sorteringen Valda med en sparad grupp av valda värdepapper överst.
const {test, expect} = require('@playwright/test');
const {useStandardGuards, login, readView, dailyClose} = require('./helpers');
const {writeTransactions, baseTransactions} = require('./fixture');

useStandardGuards();

const sortButton = (page, label) => page.locator('.stock-legend-sort').getByRole('button', {name: label, exact: true});
const legendNames = page => page.locator('#stock-custom-legend .stock-legend-name').evaluateAll(buttons => buttons.map(button => button.firstChild.textContent));
const nameButton = (page, name) => page.locator('#stock-custom-legend .stock-legend-name', {hasText: name});
const rows = page => page.locator('#stock-custom-legend .stock-legend-row');
// Visningsnamn till värdepappersnyckel, för att jämföra med legend_selected i aktievy.json.
const seriesByName = page => page.locator('#stock-chart').evaluate(graph => Object.fromEntries(graph.data
  .filter(trace => trace.meta && trace.meta.role === 'stock').map(trace => [trace.meta.displayName, trace.meta.series])));

/** Basraderna och Alfa även på konto I, så att listan har fyra värdepapper. */
function fourSecurities() {
  const alfa = dailyClose('ALFA.ST', '9999-12-31').dates;
  writeTransactions([
    ...baseTransactions().map(line => `${line};T`),
    `${alfa[alfa.length - 40]};KÖP;ALFA.ST;2;100,00;1,00;;;;I`,
  ]);
}

async function openApp(page) {
  fourSecurities();
  await login(page);
  await expect(rows(page)).toHaveCount(4);
}

test('Valda lägger de visade värdepapperen överst och sparar gruppen', async ({page}) => {
  await openApp(page);
  const unsorted = await legendNames(page);
  const keys = await seriesByName(page);
  // Dölj de två första i aktier.csv-ordning och sortera på namn innan Valda väljs första gången.
  for (const name of unsorted.slice(0, 2)) {
    await nameButton(page, name).click();
    await expect(page.locator('.stock-legend-row.is-hidden', {hasText: name})).toHaveCount(1);
  }
  await sortButton(page, 'Namn').click();
  const byName = await legendNames(page);
  const shown = byName.filter(name => !unsorted.slice(0, 2).includes(name));

  await sortButton(page, 'Valda').click();
  await expect(sortButton(page, 'Valda')).toHaveAttribute('aria-pressed', 'true');
  await expect(sortButton(page, 'Namn')).toHaveAttribute('aria-pressed', 'false');
  const expected = [...shown, ...unsorted.slice(0, 2)];
  await expect.poll(() => legendNames(page)).toEqual(expected);
  await expect.poll(() => readView().legend_sort).toBe('selected');
  expect(readView().legend_selected).toEqual(shown.map(name => keys[name]));

  await page.reload();
  await expect(rows(page)).toHaveCount(4);
  await expect(sortButton(page, 'Valda')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => legendNames(page)).toEqual(expected);
});

test('gruppen ändras inte under annan sortering och kommer tillbaka med Valda', async ({page}) => {
  await openApp(page);
  const unsorted = await legendNames(page);
  await nameButton(page, unsorted[0]).click();
  await sortButton(page, 'Valda').click();
  const group = unsorted.slice(1);
  await expect.poll(() => readView().legend_selected && readView().legend_selected.length).toBe(3);
  const saved = readView().legend_selected;

  // Under Total ändrar visning och döljning inte gruppen.
  await sortButton(page, 'Total').click();
  await nameButton(page, unsorted[0]).click();
  await nameButton(page, unsorted[1]).click();
  await expect(page.locator('.stock-legend-row.is-hidden')).toHaveCount(1);
  await expect.poll(() => readView().legend_sort).toBe('total');
  expect(readView().legend_selected).toEqual(saved);

  // Valda visar samma grupp överst, även den nu dolda, och övriga därefter.
  await sortButton(page, 'Valda').click();
  await expect.poll(() => legendNames(page)).toEqual([...group, unsorted[0]]);
  await expect.poll(() => readView().legend_sort).toBe('selected');
  expect(readView().legend_selected).toEqual(saved);
});

test('medan Valda är vald läggs ett visat värdepapper sist i gruppen och ett dolt tas bort', async ({page}) => {
  await openApp(page);
  const unsorted = await legendNames(page);
  const keys = await seriesByName(page);
  await nameButton(page, unsorted[0]).click();
  await nameButton(page, unsorted[1]).click();
  await sortButton(page, 'Valda').click();
  await expect.poll(() => legendNames(page)).toEqual([unsorted[2], unsorted[3], unsorted[0], unsorted[1]]);

  // Visa unsorted[1]: sist bland de valda överst.
  await nameButton(page, unsorted[1]).click();
  await expect.poll(() => legendNames(page)).toEqual([unsorted[2], unsorted[3], unsorted[1], unsorted[0]]);
  await expect.poll(() => readView().legend_selected).toEqual([unsorted[2], unsorted[3], unsorted[1]].map(name => keys[name]));

  // Dölj unsorted[2]: lämnar gruppen och hamnar bland övriga i aktier.csv-ordning.
  await nameButton(page, unsorted[2]).click();
  await expect.poll(() => legendNames(page)).toEqual([unsorted[3], unsorted[1], unsorted[0], unsorted[2]]);
  await expect.poll(() => readView().legend_selected).toEqual([unsorted[3], unsorted[1]].map(name => keys[name]));
  await expect(page.locator('.stock-legend-row', {hasText: unsorted[2]})).toHaveClass(/is-hidden/);

  // Solo ändrar inte gruppen eller ordningen (testdatan har minutkurser bara för Alfa).
  const before = readView().legend_selected;
  const soloBox = () => page.locator('.stock-legend-row', {hasText: 'Alfa Test (T)'}).locator('input[type="checkbox"]');
  await soloBox().check();
  await expect.poll(() => readView().last_solo).toBe(keys['Alfa Test (T)']);
  await expect.poll(() => legendNames(page)).toEqual([unsorted[3], unsorted[1], unsorted[0], unsorted[2]]);
  await soloBox().uncheck();
  await expect.poll(() => readView().last_solo).toBe(null);
  expect(readView().legend_selected).toEqual(before);

  // Ett namnklick som avslutar solo visar det dolda värdepapperet och lägger det sist i gruppen.
  await soloBox().check();
  await expect.poll(() => readView().last_solo).toBe(keys['Alfa Test (T)']);
  await nameButton(page, unsorted[2]).click();
  await expect.poll(() => readView().legend_selected).toEqual([...before, keys[unsorted[2]]]);
  await expect.poll(() => legendNames(page)).toEqual([unsorted[3], unsorted[1], unsorted[2], unsorted[0]]);
  await expect(page.locator('.stock-legend-row', {hasText: unsorted[2]})).not.toHaveClass(/is-hidden/);
  await expect.poll(() => readView().last_solo).toBe(null);
});

test('servern avvisar en ogiltig grupp av valda värdepapper', async ({page}) => {
  await openApp(page);
  // Direkt mot API:t, så att avvisade anrop inte loggas som konsolfel i sidan.
  const token = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  const post = async data => (await page.request.post('/api/view-range.php', {headers: {'X-CSRF-Token': token}, data})).status();
  const statuses = [];
  for (const legend_selected of ['ALFA.ST', ['OKAND.ST'], ['ALFA.ST|ii'], {a: 'ALFA.ST'}, [1], ['ALFA.ST|T', 'ALFA.ST|T', 'BETA.ST'], []]) {
    statuses.push(await post({legend_selected}));
  }
  expect(statuses).toEqual([400, 400, 400, 400, 400, 200, 200]);
  expect(readView().legend_selected).toEqual([]);
});

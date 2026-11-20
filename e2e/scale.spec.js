// Skalvalet: kryssrutornas regler, axlar och måttkurvor i diagrammet, sparat läge och äldre aktievy.json.
const {test, expect} = require('@playwright/test');
const {fixture, useStandardGuards, login, waitForApp, readView, writeView} = require('./helpers');

useStandardGuards();

const BOXES = {
  linear: 'Linjär',
  log: 'Logaritmisk',
  ma200: 'Avvikelse från 200-dagars medel',
  drawdown: 'Fall från tidigare topp',
  change63: 'Förändring över 3 månader',
};
const box = (page, key) => page.getByRole('group', {name: 'Skala'}).getByLabel(BOXES[key], {exact: true});

async function openApp(page) {
  await login(page);
  await waitForApp(page);
}

/** Vilka kryssrutor som är markerade, i ordningen i BOXES. */
async function checked(page) {
  const result = [];
  for (const key of Object.keys(BOXES)) if (await box(page, key).isChecked()) result.push(key);
  return result;
}

/** Diagrammets axlar och kurvor för aktier och mått. */
const chartState = page => page.locator('#stock-chart').evaluate(graph => {
  const visible = trace => trace.visible !== 'legendonly' && trace.visible !== false;
  const stocks = graph.data.filter(trace => trace.meta && trace.meta.role === 'stock');
  const measures = graph.data.filter(trace => trace.meta && trace.meta.role === 'measure');
  const axisName = ref => (ref || 'y').replace(/^y/, 'yaxis');
  return {
    yaxis: {
      type: graph.layout.yaxis.type,
      showticklabels: graph.layout.yaxis.showticklabels,
      ticksuffix: graph.layout.yaxis.ticksuffix || '',
      title: graph.layout.yaxis.title && graph.layout.yaxis.title.text || '',
    },
    stockAxes: stocks.map(trace => trace.yaxis || 'y'),
    stockY: stocks.filter(visible).map(trace => trace.y.filter(value => Number.isFinite(value))),
    measures: measures.map(trace => ({of: trace.meta.of, visible: visible(trace), axisVisible: graph._fullLayout[axisName(trace.yaxis)]?.visible !== false,
      ticksuffix: graph.layout[axisName(trace.yaxis)]?.ticksuffix || ''})),
  };
});

test('startar med enbart Linjär och linjär axel', async ({page}) => {
  await openApp(page);
  expect(await checked(page)).toEqual(['linear']);
  const state = await chartState(page);
  expect(state.yaxis.type).toBe('linear');
  // Måttkurvorna finns i diagrammet men visas bara i läget Logaritmisk med mått.
  expect(state.measures.filter(measure => measure.visible)).toEqual([]);
  expect(readView().scale).toBeUndefined();
});

test('Logaritmisk avmarkerar Linjär, ger logaritmiska axlar och sparas', async ({page}) => {
  await openApp(page);
  await box(page, 'log').check();
  expect(await checked(page)).toEqual(['log']);
  await expect.poll(async () => (await chartState(page)).yaxis.type).toBe('log');
  const state = await chartState(page);
  expect(state.yaxis.showticklabels).toBe(false);
  // Varje aktie på en egen axel.
  expect(new Set(state.stockAxes).size).toBe(fixture.stocks.length);
  await expect.poll(readView).toMatchObject({scale: 'log', log_scale: true});
});

test('ett mått ensamt ger procentaxel med rubrik och sparas', async ({page}) => {
  await openApp(page);
  await box(page, 'ma200').check();
  expect(await checked(page)).toEqual(['ma200']);
  await expect.poll(async () => (await chartState(page)).yaxis).toMatchObject({
    type: 'linear', ticksuffix: ' %', title: 'Avvikelse från 200-dagars medel (%)',
  });
  expect((await chartState(page)).measures.filter(measure => measure.visible)).toEqual([]);
  await expect.poll(() => readView().scale).toBe('ma200');
});

test('bara ett mått i taget, och fall från topp är aldrig positivt', async ({page}) => {
  await openApp(page);
  await box(page, 'ma200').check();
  await box(page, 'drawdown').check();
  expect(await checked(page)).toEqual(['drawdown']);
  await expect.poll(async () => (await chartState(page)).yaxis.title).toBe('Fall från tidigare topp (%)');
  const {stockY} = await chartState(page);
  expect(stockY.flat().length).toBeGreaterThan(0);
  expect(Math.max(...stockY.flat())).toBeLessThanOrEqual(1e-9);
  await expect.poll(() => readView().scale).toBe('drawdown');
});

test('Logaritmisk med mått visar en måttkurva per synlig aktie', async ({page}) => {
  await openApp(page);
  await box(page, 'log').check();
  await box(page, 'change63').check();
  expect(await checked(page)).toEqual(['log', 'change63']);
  await expect.poll(async () => (await chartState(page)).measures.filter(measure => measure.visible).length).toBe(fixture.stocks.length);
  let state = await chartState(page);
  expect(state.yaxis.type).toBe('log');
  expect(state.measures.map(measure => measure.of).sort()).toEqual(fixture.stocks.map(stock => stock.series).sort());
  expect(state.measures.every(measure => measure.visible && measure.axisVisible && measure.ticksuffix === ' %')).toBe(true);
  await expect.poll(readView).toMatchObject({scale: 'log_change63', log_scale: true});

  // Döljs en aktie döljs också dess måttkurva.
  const hidden = fixture.stocks[1];
  await page.locator('.stock-legend-row', {hasText: hidden.name}).getByRole('button').click();
  await expect.poll(async () => (await chartState(page)).measures.find(measure => measure.of === hidden.series).visible).toBe(false);
  state = await chartState(page);
  expect(state.measures.filter(measure => measure.of !== hidden.series).every(measure => measure.visible)).toBe(true);
});

test('Linjär avmarkerar övriga, och sista avmarkerade rutan ger Linjär', async ({page}) => {
  await openApp(page);
  await box(page, 'log').check();
  await box(page, 'ma200').check();
  expect(await checked(page)).toEqual(['log', 'ma200']);
  await box(page, 'linear').check();
  expect(await checked(page)).toEqual(['linear']);
  await expect.poll(async () => (await chartState(page)).yaxis.type).toBe('linear');
  await expect.poll(() => readView().scale).toBe('linear');

  await box(page, 'drawdown').check();
  expect(await checked(page)).toEqual(['drawdown']);
  await box(page, 'drawdown').uncheck();
  expect(await checked(page)).toEqual(['linear']);
  await expect.poll(() => readView().scale).toBe('linear');
});

test('sparat läge återställs efter omladdning', async ({page}) => {
  await openApp(page);
  await box(page, 'log').check();
  await box(page, 'drawdown').check();
  await expect.poll(() => readView().scale).toBe('log_drawdown');
  await page.reload();
  await waitForApp(page);
  expect(await checked(page)).toEqual(['log', 'drawdown']);
  await expect.poll(async () => (await chartState(page)).measures.filter(measure => measure.visible).length).toBe(fixture.stocks.length);
  expect((await chartState(page)).yaxis.type).toBe('log');
});

test('äldre aktievy.json med bara log_scale öppnas logaritmiskt', async ({page}) => {
  writeView({...fixture.view, log_scale: true});
  await openApp(page);
  expect(await checked(page)).toEqual(['log']);
  await expect.poll(async () => (await chartState(page)).yaxis.type).toBe('log');
});

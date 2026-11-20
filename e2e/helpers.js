// Gemensamt för testerna: inloggning, vänta på appen, nätverksspärr och konsolfel.
const {test, expect} = require('@playwright/test');
const {readFixture, resetState, readView, readTransactions, dailyClose, writeView} = require('./fixture');

const fixture = readFixture();

/**
 * Återställ testdatan och installera spärrar för varje test: anrop till andra värdar än
 * 127.0.0.1 stoppas och noteras, och konsolfel samlas. Båda kontrolleras efter testet.
 */
function useStandardGuards() {
  test.beforeEach(async ({page}, testInfo) => {
    resetState();
    testInfo.externalRequests = [];
    testInfo.consoleErrors = [];
    await page.route('**/*', route => {
      const {hostname} = new URL(route.request().url());
      if (hostname === '127.0.0.1') return route.continue();
      testInfo.externalRequests.push(route.request().url());
      return route.abort();
    });
    page.on('console', message => {
      if (message.type() === 'error') testInfo.consoleErrors.push(message.text());
    });
    page.on('pageerror', error => testInfo.consoleErrors.push(String(error)));
  });

  test.afterEach(async ({}, testInfo) => {
    expect(testInfo.externalRequests, 'anrop utanför 127.0.0.1').toEqual([]);
    expect(testInfo.consoleErrors, 'konsolfel').toEqual([]);
  });
}

async function login(page, password = fixture.password) {
  await page.goto('login.php');
  await page.getByLabel('Lösenord').fill(password);
  await page.getByRole('button', {name: 'Logga in'}).click();
}

async function waitForApp(page) {
  await expect(page.locator('#stock-custom-legend .stock-legend-row')).toHaveCount(fixture.stocks.length);
}

/**
 * Klickar på aktiens kurva i huvuddiagrammet vid en given andel (0–1) av det synliga datumintervallet.
 * Punkten räknas om till sidpixlar med diagrammets egna axlar, och pekaren förs dit innan klicket,
 * eftersom appen väljer kurvan närmast pekaren bland de hovrade punkterna. Returnerar datum och sidpixlar.
 */
async function clickCurvePoint(page, ticker, fraction) {
  const graph = page.locator('#stock-chart');
  await graph.scrollIntoViewIfNeeded();
  const target = await graph.evaluate((graph, [ticker, fraction]) => {
    const index = graph.data.findIndex(trace => trace.meta && trace.meta.role === 'stock' && trace.meta.ticker === ticker);
    const trace = graph.data[index];
    const layout = graph._fullLayout;
    const xa = layout.xaxis;
    const ya = layout[(trace.yaxis || 'y').replace(/^y/, 'yaxis')];
    const [start, end] = xa.range.map(value => xa.d2l(value));
    const wanted = start + (end - start) * fraction;
    let point = 0;
    trace.x.forEach((x, position) => {
      if (Math.abs(xa.d2l(x) - wanted) < Math.abs(xa.d2l(trace.x[point]) - wanted)) point = position;
    });
    const bounds = graph.getBoundingClientRect();
    return {
      date: String(trace.x[point]).slice(0, 10),
      x: bounds.left + layout._size.l + xa.l2p(xa.d2l(trace.x[point])),
      y: bounds.top + layout._size.t + ya.l2p(ya.d2l(trace.y[point])),
    };
  }, [ticker, fraction]);
  await page.mouse.move(target.x - 4, target.y);
  await page.mouse.move(target.x, target.y, {steps: 3});
  await page.waitForTimeout(100);
  await page.mouse.click(target.x, target.y);
  return target;
}

module.exports = {fixture, useStandardGuards, login, waitForApp, readView, readTransactions, dailyClose, writeView, clickCurvePoint};

// Resultat: orealiserat resultat på kvarvarande innehav, som hos mäklaren, utan utdelningar och sälj.
const {test, expect} = require('@playwright/test');
const {useStandardGuards, login, dailyClose} = require('./helpers');
const {writeTransactions} = require('./fixture');

useStandardGuards();

const {dates, close} = (() => {
  const {dates} = dailyClose('ALFA.ST', '9999-12-31');
  return {dates, close: dailyClose('ALFA.ST', dates[dates.length - 1]).close};
})();
const day = offset => dates[dates.length - offset];

// Två köp och ett sälj av Alfa på konto T: 20 st för 2 202 kr inklusive courtage, sedan 5 sålda.
const ALFA = [
  `${day(120)};KÖP;ALFA.ST;10;100,00;1,00;;;;T`,
  `${day(100)};KÖP;ALFA.ST;10;120,00;1,00;;;;T`,
  `${day(80)};SÄLJ;ALFA.ST;5;150,00;1,00;;;;T`,
];
const BASIS = 2202 * 15 / 20;
const UNREALIZED = close * 15 - BASIS;

const headers = page => page.locator('#portfolio-summary-content thead th').evaluateAll(cells => cells.map(cell => cell.textContent));
const valuesFor = (page, name) => page.locator('#portfolio-summary-content').evaluate((root, name) => {
  const names = [...root.querySelectorAll('thead th')].map(cell => cell.textContent);
  const row = [...root.querySelectorAll('tbody tr')].find(tr => tr.cells[0].textContent === name);
  return row ? Object.fromEntries(names.map((header, index) => [header, row.cells[index].textContent])) : null;
}, name);
const number = text => Number(text.replace(/[\s kr%]/g, '').replace('−', '-').replace(',', '.'));

async function openResults(page, name) {
  await login(page);
  await expect.poll(() => valuesFor(page, name)).not.toBeNull();
  return valuesFor(page, name);
}

test('rubrikerna har Orealiserat och Orealiserat (%) efter Tot avkastn (%)', async ({page}) => {
  writeTransactions(ALFA);
  await openResults(page, 'Alfa Test (T)');
  expect(await headers(page)).toEqual(['Värdepapper', 'Antal', 'Kurs', 'GAV', 'Avkastn', 'Utdelning', 'Tot avkastn', 'Tot avkastn (%)',
    'Orealiserat', 'Orealiserat (%)', 'Värde', 'Värde SEK', '']);
});

test('orealiserat räknas på kvarvarande innehav utan realiserad vinst', async ({page}) => {
  writeTransactions(ALFA);
  const values = await openResults(page, 'Alfa Test (T)');
  expect(number(values['Antal'])).toBe(15);
  expect(number(values['Orealiserat'])).toBeCloseTo(UNREALIZED, 2);
  expect(number(values['Orealiserat (%)'])).toBeCloseTo(UNREALIZED / BASIS * 100, 2);
  // Avkastn har dessutom säljets vinst: 5 × 150 − 1 − 2 202 × 5 / 20.
  expect(number(values['Avkastn'])).toBeCloseTo(UNREALIZED + 749 - 550.5, 2);
});

test('utdelning påverkar inte orealiserat', async ({page}) => {
  writeTransactions([...ALFA, `${day(60)};UTDELNING;ALFA.ST;15;2,00;0,00;;;;T`]);
  const values = await openResults(page, 'Alfa Test (T)');
  expect(number(values['Utdelning'])).toBeCloseTo(30, 2);
  expect(number(values['Orealiserat'])).toBeCloseTo(UNREALIZED, 2);
  expect(number(values['Orealiserat (%)'])).toBeCloseTo(UNREALIZED / BASIS * 100, 2);
});

test('helt sålt värdepapper visar streck', async ({page}) => {
  writeTransactions([
    `${day(120)};KÖP;ALFA.ST;10;100,00;1,00;;;;T`,
    `${day(80)};SÄLJ;ALFA.ST;10;150,00;1,00;;;;T`,
  ]);
  const values = await openResults(page, 'Alfa Test (T)');
  expect(values['Orealiserat']).toBe('—');
  expect(values['Orealiserat (%)']).toBe('—');
  expect(number(values['Avkastn'])).toBeCloseTo(1499 - 1001, 2);
});

// Tolv köp av Alfa, fler än de tio rader som listan Transaktioner visar.
const MANY = Array.from({length: 12}, (_, index) => `${day(150 - index * 5)};KÖP;ALFA.ST;1;100,00;1,00;;;;T`);

for (const [label, viewport] of [['bred skärm', {width: 1400, height: 1000}], ['900 px', {width: 900, height: 1000}], ['telefon', {width: 390, height: 844}]]) {
  test(`Resultat ligger ovanför Transaktioner utan sidledsrullning: ${label}`, async ({page}) => {
    await page.setViewportSize(viewport);
    writeTransactions(MANY);
    await openResults(page, 'Alfa Test (T)');
    const layout = await page.evaluate(() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      return {
        summaryBottom: box('#portfolio-summary-content').bottom,
        listHeadingTop: box('#purchase-list > h2').top,
        summaryLeft: box('#portfolio-summary-content').left,
        listLeft: box('#purchase-list-content').left,
      };
    });
    expect(layout.summaryBottom).toBeLessThanOrEqual(layout.listHeadingTop);
    expect(Math.abs(layout.summaryLeft - layout.listLeft)).toBeLessThan(2);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

test('Transaktioner visar tio rader och resten nås genom att rulla', async ({page}) => {
  writeTransactions(MANY);
  await openResults(page, 'Alfa Test (T)');
  const list = page.locator('#purchase-list-content');
  await expect(list.locator('tbody tr')).toHaveCount(12);
  const visibleRows = () => list.evaluate(root => {
    const area = root.getBoundingClientRect();
    const header = root.querySelector('thead').getBoundingClientRect();
    return [...root.querySelectorAll('tbody tr')].filter(row => {
      const box = row.getBoundingClientRect();
      return box.top >= header.bottom - 1 && box.bottom <= area.bottom + 1;
    }).length;
  });
  expect(await visibleRows()).toBe(10);
  await list.evaluate(root => { root.scrollTop = root.scrollHeight; });
  const afterScroll = await list.evaluate(root => {
    const area = root.getBoundingClientRect();
    const last = root.querySelector('tbody tr:last-child').getBoundingClientRect();
    const header = root.querySelector('thead th').getBoundingClientRect();
    return {lastVisible: last.bottom <= area.bottom + 1, headerAtTop: Math.abs(header.top - area.top) < 2};
  });
  expect(afterScroll).toEqual({lastVisible: true, headerAtTop: true});
});

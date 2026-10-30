// Drive the stress harness and report what breaks, per break-ui phase 4.
//
// Usage: node dev/panel-stress/measure.mjs [baseUrl] [outDir]
//
// For every state of the toggle, at every width the product supports, it
// records what a player would see: how many rows the panel holds, how tall
// it is, whether anything overflows its column or the page, and the lines
// the tiers spend on what they are not showing. Then the reference dialog,
// opened from a tier, at the same widths.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

// Playwright is not a dependency of this project: it is whatever the
// machine has. require() honours NODE_PATH, which import does not, so a
// globally installed copy is reachable with
// NODE_PATH=$(npm root -g) node dev/panel-stress/measure.mjs
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:4178';
const out = process.argv[3] ?? 'dev/panel-stress/shots';

const WIDTHS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
];
const STATES = ['demo', 'worst', 'empty', 'one', 'all', 'scanning', 'noassist'];

/** What the panel looks like from the outside, measured in the page. */
const inspect = () => {
  const column = document.querySelector('[data-testid="panel-column"]');
  const panel = column.firstElementChild;
  const box = column.getBoundingClientRect();
  const text = (sel) => Array.from(panel.querySelectorAll(sel)).map((el) => el.textContent.trim());

  // Anything whose own content is wider than its box, or that sticks out of
  // the column: the two signatures of a row that cannot hold its data.
  const overflowing = [];
  for (const el of panel.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    // A screen-reader-only region is a 1px box by design, not a break.
    if (r.width <= 1 || el.classList.contains('sr-only')) continue;
    const clipped = el.scrollWidth > el.clientWidth + 1;
    const outside = r.right > box.right + 1 || r.left < box.left - 1;
    // Truncation with the full value on hover is the documented fix for
    // truncation, so it is reported apart from truncation without one.
    if ((clipped && !el.title) || outside) {
      overflowing.push({
        tag: el.tagName.toLowerCase(),
        clipped,
        outside: Math.round(Math.max(r.right - box.right, box.left - r.left)),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        text: el.textContent.trim().slice(0, 60),
      });
    }
  }
  const truncatedWithTitle = Array.from(panel.querySelectorAll('[title]')).filter(
    (el) => el.scrollWidth > el.clientWidth + 1
  ).length;

  // A row that wraps to three lines or more in a column this narrow is a
  // row that has outgrown it.
  const tall = Array.from(panel.querySelectorAll('[title^="How "]'))
    .map((el) => ({ text: el.textContent.trim().slice(0, 48), height: Math.round(el.getBoundingClientRect().height) }))
    .filter((row) => row.height > 48);

  return {
    panelHeight: Math.round(panel.getBoundingClientRect().height),
    viewportHeight: window.innerHeight,
    pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
    rows: panel.querySelectorAll('[title^="How "]').length,
    countButtons: Array.from(panel.querySelectorAll('button')).filter(
      (b) => b.textContent.trim() === 'Count'
    ).length,
    scanButtons: Array.from(panel.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('Scan this board')
    ).length,
    noneHere: text('*').filter((t) => t === 'none here').length,
    notAvailable: text('*').filter((t) => t === 'not available here').length,
    summaries: Array.from(panel.querySelectorAll('[aria-label*="in the reference"]')).map((el) =>
      el.textContent.trim()
    ),
    overflowing: overflowing.slice(0, 8),
    overflowCount: overflowing.length,
    truncatedWithTitle,
    tallRows: tall,
  };
};

const report = {};
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });

for (const size of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
  for (const state of STATES) {
    await page.goto(`${base}/?data=${state}&catalog=183`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="panel-column"]');
    await page.waitForTimeout(350); // the panel animates open
    report[`${state} @ ${size.name}`] = await page.evaluate(inspect);
    await page.screenshot({ path: `${out}/panel-${state}-${size.name}.png`, fullPage: true });
  }

  // The reference, opened the way a player opens it: from a tier's line.
  await page.goto(`${base}/?data=worst&catalog=183`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  await page.locator('[aria-label*="Browse the Ultimate tier"]').click();
  await page.waitForTimeout(350);
  report[`reference @ ${size.name}`] = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const box = dialog.getBoundingClientRect();
    const items = Array.from(dialog.querySelectorAll('[title^="How "]'));
    const columns = new Set(items.map((el) => Math.round(el.getBoundingClientRect().left)));
    const overflowing = items.filter((el) => {
      const r = el.getBoundingClientRect();
      const clipped = Array.from(el.querySelectorAll('*')).some(
        (child) => child.scrollWidth > child.clientWidth + 1 && !child.title
      );
      return clipped || r.right > box.right + 1;
    });
    return {
      dialogWidth: Math.round(box.width),
      dialogHeight: Math.round(box.height),
      fitsViewport: box.height <= window.innerHeight + 1 && box.width <= window.innerWidth + 1,
      items: items.length,
      columns: columns.size,
      overflowing: overflowing.map((el) => el.textContent.trim().slice(0, 50)),
      pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  await page.screenshot({ path: `${out}/reference-worst-${size.name}.png` });
  await page.close();
}

await browser.close();
await writeFile(`${out}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
for (const [key, value] of Object.entries(report)) {
  console.log(`\n== ${key}`);
  console.log(JSON.stringify(value));
}

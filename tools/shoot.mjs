// Screenshot harness: drives the installed Edge via playwright-core.
// Usage: node tools/shoot.mjs [url] [fractions like 0,0.16,0.41]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:4173/index.html';
const fractions = (process.argv[3] || '0,0.05,0.16,0.22,0.3,0.41,0.44,0.5,0.56,0.65,0.72,0.8,0.86,0.97')
  .split(',')
  .map(Number);

mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=default', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || t === 'warning' || m.text().includes('[stillwater]'))
    console.log(`[console:${t}]`, m.text().slice(0, 300));
});
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

console.log('goto', url);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

// wait for the loader to finish (class 'done') — generous budget for 170MB local assets
try {
  await page.waitForSelector('#loader.done', { timeout: 120000 });
  console.log('loader done');
} catch {
  console.log('LOADER NEVER FINISHED');
  const note = await page.textContent('#loader-note').catch(() => 'n/a');
  console.log('loader note:', note);
}
await page.waitForTimeout(2500);

for (const f of fractions) {
  await page.evaluate((frac) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(frac * max));
    window.__setProgress?.(frac); // deterministic: skip dolly lag on slow headless GL
  }, f);
  await page.waitForTimeout(1600);
  const name = `shots/f${String(f).replace('.', '_')}.png`;
  await page.screenshot({ path: name });
  const info = await page.evaluate(() => window.__dbg?.() || null);
  console.log(name, info ? JSON.stringify(info) : '');
}

await browser.close();
console.log('DONE');

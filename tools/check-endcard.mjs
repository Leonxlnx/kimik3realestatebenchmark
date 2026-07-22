import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true,
  args: ['--use-angle=default', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:4173/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#loader.done', { timeout: 120000 });
await page.evaluate(() => window.__setProgress?.(0.97));
await page.waitForTimeout(2500);
const r = await page.evaluate(() => {
  const el = document.getElementById('end-card');
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  const b = el.getBoundingClientRect();
  return { found: true, cls: el.className, display: cs.display, opacity: cs.opacity,
    rect: { x: b.x, y: b.y, w: b.width, h: b.height },
    bodyCls: document.body.className,
    smooth: window.__dbg?.().smooth };
});
console.log(JSON.stringify(r, null, 1));
await page.screenshot({ path: 'shots/endcard-check.png' });
await browser.close();

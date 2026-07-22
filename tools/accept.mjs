// Final acceptance: real scrolling, nav jump, fallback mode, console health.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=default', '--enable-gpu', '--ignore-gpu-blocklist'],
});

// 1 — real scroll journey, no overrides
{
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loader.done', { timeout: 120000 });
  await page.waitForTimeout(2000);

  // slow, human-like scroll through the whole journey
  await page.evaluate(async () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      window.scrollTo(0, (i / steps) * max);
      await new Promise((r) => setTimeout(r, 250));
    }
  });
  await page.waitForTimeout(3000);
  const end = await page.evaluate(() => window.__dbg?.());
  console.log('after full scroll:', JSON.stringify(end));
  await page.screenshot({ path: 'shots/final_end.png' });

  // nav jump back to Services
  await page.click('a[data-jump="0.28"]');
  await page.waitForTimeout(4500);
  const mid = await page.evaluate(() => window.__dbg?.());
  console.log('after nav jump to services:', JSON.stringify(mid));
  await page.screenshot({ path: 'shots/final_nav_services.png' });

  // keyboard: PageDown / End
  await page.keyboard.press('End');
  await page.waitForTimeout(3500);
  const kb = await page.evaluate(() => window.__dbg?.());
  console.log('after keyboard End:', JSON.stringify(kb));

  console.log('console errors:', errors.length ? errors : 'none');
  await page.close();
}

// 2 — reduced-motion fallback
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const mode = await page.evaluate(() => ({
    webgl: document.body.classList.contains('webgl'),
    contentVisible: !!document.querySelector('#content h1')?.offsetParent,
  }));
  console.log('fallback:', JSON.stringify(mode));
  await page.screenshot({ path: 'shots/final_fallback.png', fullPage: false });
  await page.close();
}

await browser.close();
console.log('DONE');

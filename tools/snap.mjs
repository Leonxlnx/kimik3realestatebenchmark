// Deterministic debug shot: set progress directly (no dolly lag).
// Usage: node tools/snap.mjs <progress> <name> [camX camY camZ lookX lookY lookZ] [night]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const p = Number(process.argv[2] ?? 0.58);
const name = process.argv[3] || `snap_${p}`;
const cam = process.argv.slice(4, 10).map(Number);
const night = process.argv[10] !== undefined ? Number(process.argv[10]) : undefined;

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=default', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:4173/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#loader.done', { timeout: 120000 });
await page.waitForTimeout(2000);

await page.evaluate(({ p, cam, night }) => {
  window.__setProgress?.(p);
  if (cam.length === 6 && cam.every((v) => !Number.isNaN(v))) window.__cam = cam;
  if (night !== undefined && !Number.isNaN(night)) window.__night = night;
}, { p, cam, night });
await page.waitForTimeout(2500);

const report = await page.evaluate(() => {
  const V = window.__scene.children[0].position.constructor;
  const out = [];
  window.__scene.traverse((o) => {
    if (o.isMesh && o.material?.transparent && o.material.map && o.geometry?.type === 'PlaneGeometry') {
      const wp = o.getWorldPosition(new V());
      if (wp.x > 12 && wp.y > 12 && wp.z > 90 && wp.z < 115) {
        out.push([+wp.x.toFixed(1), +wp.y.toFixed(1), +wp.z.toFixed(1), +o.material.opacity.toFixed(2), o.visible]);
      }
    }
  });
  return { smooth: window.__dbg?.().smooth, planes: out };
});
console.log(JSON.stringify(report));
await page.screenshot({ path: `shots/${name}.png` });
await browser.close();
console.log('DONE');

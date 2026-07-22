// ── In-world typography: seven distinct reveal mechanisms ─────────────────────
// All glyphs are rendered to high-resolution canvas textures (FontFace-loaded
// Fraunces / Space Grotesk) on unlit planes — reliable, crisp, art-directable.
// `createTypography` is synchronous: planes are attached as soon as the web
// fonts resolve (loader screen covers the brief delay).

import * as THREE from 'three';
import { state } from '../state.js';

const F = 13.0; // floor height, matches house.js

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('200 100px Fraunces'),
      document.fonts.load('300 100px Fraunces'),
      document.fonts.load('500 100px "Space Grotesk"'),
      document.fonts.load('400 100px "Space Grotesk"'),
    ]);
  } catch { /* system serif fallback */ }
}

// One line of text → plane mesh of exact world height, centered on its origin.
function textPlane(text, {
  family = 'Fraunces', weight = 300, worldH = 1, color = '#f2ecdf',
  spacing = 0, px = 220, renderOrder = 4,
} = {}) {
  const pad = px * 0.5;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${weight} ${px}px ${family}`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width + spacing * Math.max(0, text.length - 1) + pad * 2);
  const h = Math.ceil(px * 1.4);
  c.width = w; c.height = h;
  ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'middle';
  let x = pad;
  for (const ch of text) { ctx.fillText(ch, x, h * 0.52); x += ctx.measureText(ch).width + spacing; }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const worldW = worldH * (w / h);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH), mat);
  mesh.renderOrder = renderOrder;
  return { mesh, mat, worldW };
}

const ramp = (p, a, b) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);
const fade = (p, a, b, c, d) => ramp(p, a, b) * (1 - ramp(p, c, d));

export function createTypography(scene) {
  const updaters = [];

  fontsReady().then(() => {
    // ── 1 · SKY TITLE — the brand hangs over the lake at first light ──────────
    // Camera approaches from −z looking north, so the planes face south (ry=π).
    const sky = new THREE.Group();
    sky.position.set(0, 27, 45);
    scene.add(sky);
    {
      const t1 = textPlane('STILLWATER', { weight: 300, worldH: 11, spacing: 90, px: 260, color: '#1c1813' });
      t1.mesh.position.y = 5.5;
      const t2 = textPlane('HOUSE', { weight: 300, worldH: 11, spacing: 90, px: 260, color: '#1c1813' });
      t2.mesh.position.y = -6.8;
      const sub = textPlane('A RESIDENCE BY HALCYON ESTATES', {
        family: 'Space Grotesk', weight: 500, worldH: 1.7, spacing: 55, px: 120, color: '#4a4438',
      });
      sub.mesh.position.y = -16.5;
      for (const t of [t1, t2, sub]) { t.mesh.rotation.y = Math.PI; sky.add(t.mesh); }
      sky.userData = { mats: [t1.mat, t2.mat], subMat: sub.mat };
    }
    updaters.push(() => {
      const p = state.smooth;
      const u = sky.userData;
      const f = fade(p, -0.02, 0.005, 0.085, 0.15);
      u.mats.forEach((m) => { m.opacity = f; });
      u.subMat.opacity = f * 0.85;
      sky.visible = f > 0.004;
      sky.position.y = 27 + p * 10;
      sky.rotation.y = Math.sin(p * 2.0) * 0.03 + state.pointer.sx * 0.02;
    });

    // ── 2 · SUN PROJECTION — the brief thrown onto a boulder by a gobo light ──
    {
      const grp = new THREE.Group();
      scene.add(grp);
      // the landmark boulder itself is placed by vegetation.js (projection rock clearing)

      const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
      const x = c.getContext('2d');
      x.textAlign = 'center'; x.fillStyle = 'rgba(255,236,200,0.98)';
      x.font = '500 30px "Space Grotesk"';
      x.fillText('T H E   B R I E F', 512, 118);
      x.font = '300 76px Fraunces'; x.fillStyle = 'rgba(255,242,214,0.99)';
      x.fillText('Find the still water.', 512, 300);
      x.fillText('Build the quiet house.', 512, 420);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const proj = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 4.4),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        }),
      );
      proj.position.set(20.0, 12.9, 86.0);
      proj.rotation.y = -2.68; // front toward the camera hold at (11, 11.8, 70)
      proj.renderOrder = 5;
      grp.add(proj);

      const gobo = new THREE.SpotLight(0xffe2b0, 0, 200, 0.34, 0.55, 1.4);
      gobo.position.set(-10, 22, 40);
      gobo.target.position.set(20, 12.9, 86);
      grp.add(gobo, gobo.target);

      updaters.push(() => {
        const f = fade(state.smooth, 0.145, 0.18, 0.235, 0.275);
        proj.material.opacity = f * 0.92;
        gobo.intensity = f * 2600;
      });
    }

    // ── 3 · ENGRAVING — services cut into the entry monolith (face z=133.725) ─
    {
      const grp = new THREE.Group();
      scene.add(grp);
      const mats = [];
      const carve = (word, y, h, sp, px) => {
        const sh = textPlane(word, { family: 'Space Grotesk', weight: 500, worldH: h, spacing: sp, px, color: '#17110b' });
        sh.mesh.position.set(0.022, y - 0.026, 133.718);
        const hi = textPlane(word, { family: 'Space Grotesk', weight: 500, worldH: h, spacing: sp, px, color: '#c9bda8' });
        hi.mesh.position.set(-0.014, y + 0.02, 133.716);
        for (const t of [sh, hi]) { t.mesh.rotation.y = Math.PI; grp.add(t.mesh); mats.push(t.mat); }
      };
      ['ACQUISITION', 'ARCHITECTURE', 'STEWARDSHIP'].forEach((w, i) => carve(w, 15.0 - i * 0.78, 0.5, 26, 150));
      const num = textPlane('N 46° 41′ · A COUNTRY OF QUIET ROOMS', {
        family: 'Space Grotesk', weight: 400, worldH: 0.2, spacing: 8, px: 90, color: '#241c14',
      });
      num.mesh.position.set(0, 12.98, 133.718);
      num.mesh.rotation.y = Math.PI;
      grp.add(num.mesh); mats.push(num.mat);

      updaters.push(() => {
        const f = fade(state.smooth, 0.29, 0.315, 0.36, 0.385);
        mats.forEach((m) => { m.opacity = f; });
      });
    }

    // ── 4 · POOL PORTFOLIO — listings rise east of the pool, read in the water ─
    // Camera holds at (−6, 13.9, 100.8) looking east; planes face −x.
    {
      const grp = new THREE.Group();
      scene.add(grp);
      const mats = [];
      const steleMats = [];
      // dark steles behind each column — the typography needs a calm ground
      for (const z of [96.6, 102.0, 107.9]) {
        const stele = new THREE.Mesh(
          new THREE.PlaneGeometry(4.6, 4.1),
          new THREE.MeshBasicMaterial({ color: 0x10140f, transparent: true, opacity: 0, depthWrite: false }),
        );
        stele.position.set(14.35, 14.35, z);
        stele.rotation.y = -Math.PI / 2;
        stele.renderOrder = 3;
        grp.add(stele); steleMats.push(stele.material);
      }
      const put = (txt, opt, y, z) => {
        const t = textPlane(txt, opt);
        t.mesh.position.set(14.2, y, z);
        t.mesh.rotation.y = -Math.PI / 2;
        grp.add(t.mesh); mats.push(t.mat);
      };
      put('SELECTED RESIDENCES', { family: 'Space Grotesk', weight: 500, worldH: 0.36, spacing: 20, px: 100, color: '#d8d0ba' }, 16.6, 101.5);
      put('01', { weight: 200, worldH: 2.0, px: 300, color: '#f2ecdc' }, 15.4, 96.3);
      put('Glasshouse', { weight: 300, worldH: 1.3, px: 240, color: '#f2ecdc' }, 13.85, 96.6);
      put('LAKE COMO · 620 M²', { family: 'Space Grotesk', weight: 400, worldH: 0.3, spacing: 12, px: 90, color: '#c3bba6' }, 13.05, 97.0);
      put('02', { weight: 200, worldH: 2.0, px: 300, color: '#f2ecdc' }, 15.4, 102.3);
      put('Cedar Court', { weight: 300, worldH: 1.3, px: 240, color: '#f2ecdc' }, 13.85, 102.0);
      put('KYOTO · 480 M²', { family: 'Space Grotesk', weight: 400, worldH: 0.3, spacing: 12, px: 90, color: '#c3bba6' }, 13.05, 101.6);
      put('03', { weight: 200, worldH: 2.0, px: 300, color: '#f2ecdc' }, 15.4, 108.3);
      put('The Long Barn', { weight: 300, worldH: 1.3, px: 240, color: '#f2ecdc' }, 13.85, 107.9);
      put('COTSWOLDS · 710 M²', { family: 'Space Grotesk', weight: 400, worldH: 0.3, spacing: 12, px: 90, color: '#c3bba6' }, 13.05, 107.4);

      updaters.push(() => {
        const f = fade(state.smooth, 0.42, 0.445, 0.50, 0.53);
        mats.forEach((m) => { m.opacity = f; });
        steleMats.forEach((m) => { m.opacity = f * 0.62; });
      });
    }

    // ── 5 · PROCESS WALL — light blades sweep the method across the N wall ────
    // Interior N wall is at z=125; text floats just off it, facing the room (−z).
    {
      const grp = new THREE.Group();
      scene.add(grp);
      const items = [
        ['I', 'Listen', 'the site, the light, the life'],
        ['II', 'Compose', 'architecture as a sequence of views'],
        ['III', 'Build', 'craft verified at every joint'],
        ['IV', 'Care', 'stewardship beyond the sale'],
      ];
      const bars = [], wordMats = [], spots = [], blades = [];
      const zWall = 124.72;
      items.forEach(([roman, word, sub], i) => {
        const x = -8.1 + i * 4.6;
        const bar = new THREE.Mesh(
          new THREE.PlaneGeometry(4.0, 0.035),
          new THREE.MeshBasicMaterial({ color: 0xd9c9a8, transparent: true, opacity: 0, depthWrite: false }),
        );
        bar.position.set(x, 15.62, zWall); bar.rotation.y = Math.PI; bar.renderOrder = 4;
        const rm = textPlane(roman, { weight: 300, worldH: 0.34, px: 110, color: '#b9ad96' });
        rm.mesh.position.set(x, 15.2, zWall);
        const wm = textPlane(word, { weight: 300, worldH: 0.72, px: 210, color: '#efe7d4' });
        wm.mesh.position.set(x, 14.45, zWall);
        const sm = textPlane(sub, { family: 'Space Grotesk', weight: 400, worldH: 0.2, px: 80, color: '#bfb5a0' });
        sm.mesh.position.set(x, 13.9, zWall);
        for (const t of [rm, wm, sm]) { t.mesh.rotation.y = Math.PI; t.mesh.renderOrder = 4; grp.add(t.mesh); }
        grp.add(bar);

        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(1.4, 3.4),
          new THREE.MeshBasicMaterial({
            color: 0xffe9c4, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        blade.position.set(x, 14.6, zWall - 0.02); blade.rotation.y = Math.PI; blade.rotation.z = 0.42;
        blade.renderOrder = 5;
        grp.add(blade);

        const spot = new THREE.SpotLight(0xffe3b8, 0, 14, 0.5, 0.6, 1.6);
        spot.position.set(x + 0.8, 15.9, 122.4);
        spot.target.position.set(x, 14.3, zWall);
        grp.add(spot, spot.target);

        bars.push(bar); wordMats.push([rm.mat, wm.mat, sm.mat]); spots.push(spot); blades.push(blade);
      });
      updaters.push(() => {
        const p = state.smooth;
        // light sweeps east→west, following the camera pan
        const centers = [0.578, 0.56, 0.545, 0.532];
        centers.forEach((c, i) => {
          const local = Math.max(0, 1 - Math.abs(p - c) / 0.016);
          spots[i].intensity = local * 320;
          blades[i].material.opacity = local * 0.14;
          const shown = ramp(p, c - 0.010, c - 0.002) * (1 - ramp(p, 0.645, 0.665));
          wordMats[i].forEach((m) => { m.opacity = shown; });
          bars[i].material.opacity = shown * 0.8;
        });
      });
    }

    // ── 6 · WINDOW VOICES — testimonials written on the glass, read glancing ──
    // On the S facade (z=113); the camera is inside looking south → face +z.
    {
      const grp = new THREE.Group();
      scene.add(grp);
      const voices = [
        ['“They sold us the horizon,', 'then built the house around it.”', '— M. & J. AHRENS, GENEVA'],
        ['“Every return feels like', 'the first arrival.”', '— S. OKAFOR, LONDON'],
      ];
      const lineMats = [];
      voices.forEach(([l1, l2, att], v) => {
        const mats = [];
        const cx = v === 1 ? 4.6 : 0; // second voice lives where the camera looks next
        const put = (txt, opt, y) => {
          const t = textPlane(txt, opt);
          t.mesh.position.set(cx, y, 113.14);
          t.mesh.renderOrder = 6;
          grp.add(t.mesh); mats.push(t.mat);
        };
        put(l1, { weight: 300, worldH: 0.34, px: 110, color: '#f4ecda' }, 15.35);
        put(l2, { weight: 300, worldH: 0.34, px: 110, color: '#f4ecda' }, 14.85);
        put(att, { family: 'Space Grotesk', weight: 500, worldH: 0.15, spacing: 10, px: 70, color: '#d8cfba' }, 14.32);
        lineMats.push(mats);
      });
      const windows = [[0.698, 0.734], [0.744, 0.778]];
      updaters.push(() => {
        const p = state.smooth;
        windows.forEach(([a, b], v) => {
          const f = fade(p, a, a + 0.012, b - 0.012, b);
          const reveal = Math.min(1, (p - a) / 0.03);
          lineMats[v].forEach((mat, li) => {
            mat.opacity = f * THREE.MathUtils.clamp(reveal * 1.5 - li * 0.3, 0, 1);
          });
        });
      });
    }

    // ── 7 · NIGHT FINALE — contact written as a constellation over the house ──
    // Camera climbs and looks north into the sky → planes face south (ry=π).
    const finale = new THREE.Group();
    finale.position.set(0, 62, 128);
    scene.add(finale);
    const fMats = [];
    {
      const put = (txt, opt, y, z) => {
        const t = textPlane(txt, opt);
        t.mesh.position.set(0, y, z);
        t.mesh.rotation.y = Math.PI;
        finale.add(t.mesh); fMats.push(t.mat);
      };
      put('BEGIN THE', { weight: 200, worldH: 4.2, spacing: 40, px: 260, color: '#f3ecdd' }, 8.2, -7);
      put('CONVERSATION', { weight: 200, worldH: 4.2, spacing: 40, px: 260, color: '#f3ecdd' }, 3.4, -7);
      put('PRIVATE OFFICE', { family: 'Space Grotesk', weight: 500, worldH: 0.62, spacing: 22, px: 110, color: '#cfc6b0' }, -0.9, -4);
      put('enquiries@halcyon.estate', { family: 'Space Grotesk', weight: 400, worldH: 0.92, px: 130, color: '#eee6d2' }, -2.6, -4);
      put('+41 22 000 48 12', { family: 'Space Grotesk', weight: 400, worldH: 0.92, px: 130, color: '#eee6d2' }, -4.1, -4);

      const pts = [];
      const R = (a, b) => 24 * Math.sin(a * 12.9898 + b * 78.233) % 1;
      for (let i = 0; i < 26; i++) {
        pts.push(new THREE.Vector3((R(i, 1) - 0.5) * 34, (R(i, 2) - 0.5) * 12 + 3, (R(i, 3) - 0.5) * 8 - 4));
      }
      const lines = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xaebcd4, transparent: true, opacity: 0, depthWrite: false }),
      );
      finale.add(lines);
      finale.userData.lines = lines;
    }
    // legal line on the lake-edge balustrade (z=96.35, south face 96.175),
    // read as the camera lifts off the terrace
    const legal = textPlane('© MMXXVI HALCYON ESTATES · GENEVA · ZÜRICH · LONDON — PRIVACY — TERMS — CRAFTED BY WATER', {
      family: 'Space Grotesk', weight: 500, worldH: 0.17, spacing: 6, px: 70, color: '#a9a7b4',
    });
    legal.mesh.position.set(2.25, F + 0.27, 96.17);
    legal.mesh.rotation.y = Math.PI;
    scene.add(legal.mesh);

    updaters.push(() => {
      const p = state.smooth;
      const f = fade(p, 0.90, 0.935, 1.0, 1.06);
      fMats.forEach((m) => { m.opacity = f; });
      finale.userData.lines.material.opacity = f * 0.25;
      finale.rotation.y = Math.sin(p * 3.0) * 0.02;
      legal.mat.opacity = fade(p, 0.872, 0.892, 0.93, 0.955) * 0.9;
    });
  });

  return {
    update() {
      for (const u of updaters) u();
    },
  };
}

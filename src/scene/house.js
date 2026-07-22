import * as THREE from 'three';
import { pbrMaterial } from '../loaders.js';
import { state } from '../state.js';

// The architectural shell is authored geometry (no license-clean scanned villa
// exists in CC0 libraries — see ASSETS.md) clad exclusively in Poly Haven PBR
// material sets: charred timber, board-formed concrete, mossy stone, oak, marble.

const F = 13.0; // interior floor height
const CEIL = 16.3;

function panel(w, h, mat, { x = 0, y = 0, z = 0, ry = 0, rx = 0, shadow = true } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
function box(w, h, d, mat, { x = 0, y = 0, z = 0, ry = 0, shadow = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function createHouse(scene) {
  const g = new THREE.Group();
  const mats = {};

  // ------------------------------------------------------------- materials
  mats.timber = pbrMaterial('dark_wooden_planks', '2k', { repeat: 6, roughness: 1 });
  mats.timber.color = new THREE.Color(0x6b5a48);
  mats.timber.side = THREE.DoubleSide;
  mats.timberInt = pbrMaterial('dark_wooden_planks', '2k', { repeat: 5, roughness: 0.9 });
  mats.timberInt.color = new THREE.Color(0x8a755c);
  mats.concrete = pbrMaterial('concrete_wall_008', '2k', { repeat: 3, roughness: 1 });
  mats.concrete.color = new THREE.Color(0x9aa0a4);
  mats.stone = pbrMaterial('mossy_stone_wall', '2k', { repeat: 3, roughness: 1 });
  mats.stoneFine = pbrMaterial('mossy_stone_wall', '2k', { repeat: 1.6, roughness: 1 });
  mats.terrace = pbrMaterial('mossy_stone_wall', '2k', { repeat: 16, roughness: 0.95 });
  mats.terrace.color = new THREE.Color(0x9d9a90);
  mats.floor = pbrMaterial('old_wood_floor', '2k', { repeat: 7, roughness: 0.7 });
  mats.floor.color = new THREE.Color(0x9a8b76);
  mats.ceiling = pbrMaterial('oak_veneer_01', '2k', { repeat: 6, roughness: 0.65 });
  mats.ceiling.color = new THREE.Color(0xa98f6e);
  mats.marble = pbrMaterial('marble_01', '2k', { repeat: 1.4, roughness: 0.35 });
  mats.bronze = new THREE.MeshStandardMaterial({ color: 0x4a3d2c, metalness: 0.85, roughness: 0.35 });
  mats.roofDark = new THREE.MeshStandardMaterial({ color: 0x1c1e1e, metalness: 0.2, roughness: 0.85 });
  mats.glass = new THREE.MeshPhysicalMaterial({
    color: 0xdfe9ea,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.14,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  mats.led = new THREE.MeshBasicMaterial({ color: 0xffc98a });
  mats.led.toneMapped = true;

  // ------------------------------------------------------------- plinth
  g.add(box(27, 0.75, 15.5, mats.concrete, { x: 0, y: F - 0.75, z: 119.5 }));

  // ------------------------------------------------------------- terrace
  // stone platform x -8..12.5, z 96..112
  g.add(box(20.5, 0.62, 16, mats.concrete, { x: 2.25, y: F - 0.62, z: 104 }));
  g.add(panel(20.5, 16, mats.terrace, { x: 2.25, y: F + 0.011, z: 104, rx: -Math.PI / 2, shadow: false }));
  // pool basin (water plane lives in water.js at y=12.9)
  g.add(box(11.6, 0.5, 4.2, mats.roofDark, { x: 6, y: F - 0.78, z: 100.5, shadow: false }));
  // basin coping
  const coping = mats.stoneFine;
  g.add(box(12.2, 0.12, 0.4, coping, { x: 6, y: F - 0.02, z: 98.3 }));
  g.add(box(12.2, 0.12, 0.4, coping, { x: 6, y: F - 0.02, z: 102.7 }));
  g.add(box(0.4, 0.12, 4.8, coping, { x: -0.1, y: F - 0.02, z: 100.5 }));
  g.add(box(0.4, 0.12, 4.8, coping, { x: 12.1, y: F - 0.02, z: 100.5 }));
  // balustrade along the lake edge — carries the footer engraving in the finale
  const bal = box(20.5, 0.55, 0.35, mats.stoneFine, { x: 2.25, y: F, z: 96.35 });

  // --------------------------------------------------- main volume shell
  // interior floor + ceiling
  g.add(panel(24, 12, mats.floor, { x: 0, y: F + 0.005, z: 119, rx: -Math.PI / 2, shadow: false }));
  g.add(panel(24, 12, mats.ceiling, { x: 0, y: CEIL, z: 119, rx: Math.PI / 2, shadow: false }));

  // S glass facade (z=113), with an open sliding panel at x 1.2..3.6
  const glassY = (F + CEIL) / 2, glassH = CEIL - F;
  const gl1 = panel(13.2, glassH, mats.glass, { x: -5.4, y: glassY, z: 113, shadow: false });
  const gl2 = panel(8.4, glassH, mats.glass, { x: 7.8, y: glassY, z: 113, shadow: false });
  const glSlid = panel(3.2, glassH, mats.glass, { x: 4.9, y: glassY, z: 112.78, shadow: false });
  g.add(gl1, gl2, glSlid);
  // mullions
  for (let x = -12; x <= 12.01; x += 2.4) {
    if (x > 1.1 && x < 3.7) continue; // the open panel
    g.add(box(0.07, glassH, 0.1, mats.bronze, { x, y: F, z: 113, shadow: false }));
  }
  g.add(box(24, 0.09, 0.1, mats.bronze, { x: 0, y: CEIL - 0.09, z: 113, shadow: false }));
  g.add(box(24, 0.09, 0.1, mats.bronze, { x: 0, y: F, z: 113, shadow: false }));

  // N facade (z=125): charred timber with an entry opening x 1.2..3.6, h 2.9
  g.add(panel(13.2, glassH, mats.timber, { x: -5.4, y: glassY, z: 125 }));
  g.add(panel(8.4, glassH, mats.timber, { x: 7.8, y: glassY, z: 125 }));
  g.add(panel(2.4, glassH - 2.9, mats.timber, { x: 2.4, y: F + 2.9 + (glassH - 2.9) / 2, z: 125 }));
  // entry door frame
  g.add(box(0.09, 2.9, 0.12, mats.bronze, { x: 1.24, y: F, z: 125, shadow: false }));
  g.add(box(0.09, 2.9, 0.12, mats.bronze, { x: 3.56, y: F, z: 125, shadow: false }));

  // E + W end walls: stone outside, timber inside
  g.add(box(0.5, glassH, 12.4, mats.stone, { x: -12.25, y: F, z: 119 }));
  g.add(box(0.5, glassH, 12.4, mats.stone, { x: 12.25, y: F, z: 119 }));
  g.add(panel(12, glassH, mats.timberInt, { x: -11.95, y: glassY, z: 119, ry: Math.PI / 2, shadow: false }));
  g.add(panel(12, glassH, mats.timberInt, { x: 11.95, y: glassY, z: 119, ry: -Math.PI / 2, shadow: false }));

  // roof slab with deep S overhang (cantilever toward the lake)
  g.add(box(26.4, 0.38, 16.4, mats.roofDark, { x: 0, y: CEIL, z: 117.9 }));
  g.add(panel(26.4, 16.4, mats.ceiling, { x: 0, y: CEIL - 0.005, z: 117.9, rx: Math.PI / 2, shadow: false }));
  // fascia
  g.add(box(26.4, 0.34, 0.08, mats.bronze, { x: 0, y: CEIL + 0.02, z: 109.75, shadow: false }));

  // recessed LED line under the S overhang — wakes up at night
  const led = new THREE.Mesh(new THREE.BoxGeometry(24, 0.03, 0.06), mats.led);
  led.position.set(0, CEIL - 0.02, 110.4);

  // ceiling downlights
  const dots = [];
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), mats.led);
    d.rotation.x = Math.PI / 2;
    d.position.set(-10 + i * 4, CEIL - 0.02, 118.5);
    dots.push(d);
    g.add(d);
  }

  // ------------------------------------------------------ bedroom wing
  g.add(box(9.5, 3.0, 9.5, mats.timber, { x: -18.5, y: F, z: 121.5 }));
  g.add(box(10.7, 0.32, 10.7, mats.roofDark, { x: -18.5, y: F + 3.0, z: 121.5 }));
  g.add(panel(6.5, 1.9, mats.glass, { x: -18.5, y: F + 1.45, z: 116.72, shadow: false }));
  // covered link
  g.add(box(2.6, 0.28, 6, mats.roofDark, { x: -12.9, y: F + 2.9, z: 120 }));

  // ------------------------------------------------------ kitchen island
  g.add(box(3.4, 0.92, 1.15, mats.marble, { x: 6.2, y: F, z: 121.6 }));
  g.add(box(3.6, 0.05, 1.3, mats.marble, { x: 6.2, y: F + 0.92, z: 121.6 }));

  // ------------------------------------------------------ entry wall (z=134)
  const entryWall = box(9, 2.8, 0.55, mats.stoneFine, { x: 0, y: F, z: 134 });
  g.add(entryWall);
  // low retaining walls flanking the path
  g.add(box(6, 0.7, 0.4, mats.stone, { x: -6.5, y: F - 0.1, z: 130, ry: 0.35 }));
  g.add(box(6, 0.7, 0.4, mats.stone, { x: 7, y: F - 0.1, z: 128.5, ry: -0.4 }));

  g.add(led, bal);
  scene.add(g);

  // night transition: interior LEDs + glass response
  function update() {
    const n = state.night;
    mats.led.color.setHex(0xffc98a).multiplyScalar(THREE.MathUtils.lerp(0.25, 4.5, n));
    mats.glass.envMapIntensity = THREE.MathUtils.lerp(1.2, 0.5, n);
  }

  return { group: g, mats, update, F, CEIL };
}

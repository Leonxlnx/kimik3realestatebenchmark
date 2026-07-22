import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { state } from '../state.js';

// Tiling ripple normal map, generated once on a canvas.
function rippleNormalTexture(size = 256) {
  const h = new Float32Array(size * size);
  // a few octaves of value noise
  const rand = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = size / 8;
    const a = rand(((xi % w) + w) % w, ((yi % w) + w) % w);
    const b = rand((((xi + 1) % w) + w) % w, ((yi % w) + w) % w);
    const c = rand(((xi % w) + w) % w, (((yi + 1) % w) + w) % w);
    const d = rand((((xi + 1) % w) + w) % w, (((yi + 1) % w) + w) % w);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0, amp = 1, freq = 8;
      for (let o = 0; o < 4; o++) {
        v += noise((x / size) * freq, (y / size) * freq) * amp;
        amp *= 0.5;
        freq *= 2;
      }
      h[y * size + x] = v;
    }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size, xp = (x + 1) % size;
      const ym = (y - 1 + size) % size, yp = (y + 1) % size;
      const dx = (h[y * size + xp] - h[y * size + xm]) * 2.2;
      const dy = (h[yp * size + x] - h[ym * size + x]) * 2.2;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      data[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      data[i + 2] = inv * 255;
      data[i + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createWater(scene) {
  const ripples = rippleNormalTexture();

  // ---- the lake ------------------------------------------------------------
  const lakeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1b2b30),
    metalness: 0.88,
    roughness: 0.05,
    normalMap: ripples,
    normalScale: new THREE.Vector2(0.07, 0.07),
    envMapIntensity: 0.55,
  });
  ripples.repeat.set(40, 40);
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), lakeMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(0, 0, -300);
  lake.receiveShadow = true;
  scene.add(lake);

  // ---- the reflecting pool on the terrace ----------------------------------
  const pool = new Reflector(new THREE.PlaneGeometry(11, 3.6), {
    textureWidth: 768,
    textureHeight: 768,
    color: 0x101a1c,
    clipBias: 0.003,
  });
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(6, 13.0, 100.5);
  scene.add(pool);
  // dark tint + slight wave over the mirror
  const poolVeil = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 3.6),
    new THREE.MeshStandardMaterial({
      color: 0x0a1214,
      transparent: true,
      opacity: 0.45,
      metalness: 0.6,
      roughness: 0.25,
      envMapIntensity: 0.15,
      normalMap: ripples,
      normalScale: new THREE.Vector2(0.15, 0.15),
      depthWrite: false,
    }),
  );
  poolVeil.rotation.x = -Math.PI / 2;
  poolVeil.position.set(6, 13.015, 100.5);
  scene.add(poolVeil);

  const duskColor = new THREE.Color(0x1b2b30);
  const nightColor = new THREE.Color(0x070d12);

  function update(t) {
    ripples.offset.set((t * 0.006) % 1, (t * 0.0045) % 1);
    lakeMat.color.copy(duskColor).lerp(nightColor, state.night);
    lakeMat.envMapIntensity = THREE.MathUtils.lerp(0.55, 0.25, state.night);
    lakeMat.roughness = THREE.MathUtils.lerp(0.1, 0.08, state.night);
  }

  return { lake, pool, update };
}

import * as THREE from 'three';
import { pbrMaterial } from '../loaders.js';

// ---------------------------------------------------------------- noise
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
export function fbm(x, y, oct = 3) {
  let v = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f, y * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return v / norm;
}

const S = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- terrain
// Lake at y=0 for z < ~56. Hill rises to the house plateau (y=13, z≈120).
const PADS = [
  { x: 0, z: 120, r0: 30, r1: 50, y: 13.0 }, // house plateau
  { x: 6, z: 101, r0: 13, r1: 26, y: 12.55 }, // pool terrace
  { x: 0, z: 136, r0: 9, r1: 20, y: 13.0 }, // entry
];

export function groundY(x, z) {
  let y = 13.0 * S(56, 118, z); // main rise from the shore
  y += 7.0 * S(120, 230, z); // forest keeps climbing behind the house
  y += 11.0 * S(80, 220, Math.abs(x)); // valley shoulders
  y += fbm(x * 0.02, z * 0.02, 3) * 1.6 + fbm(x * 0.085, z * 0.085, 2) * 0.35;
  y -= 3.2 * S(58, 30, z); // dip under the lake
  // flatten pads
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    const w = 1 - S(p.r0, p.r1, d);
    y = THREE.MathUtils.lerp(y, p.y, w);
  }
  return y;
}

export function createTerrain(scene) {
  const W = 520, D = 420, SEG = 200;
  const geo = new THREE.PlaneGeometry(W, D, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cx = 0, cz = 110; // terrain center
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const z = pos.getZ(i) + cz;
    pos.setX(i, x);
    pos.setZ(i, z);
    pos.setY(i, groundY(x, z));
  }
  geo.computeVertexNormals();

  const groundMat = pbrMaterial('forest_ground_04', '2k', { repeat: 48, roughness: 1 });
  groundMat.color = new THREE.Color(0x8a8f78);
  const terrain = new THREE.Mesh(geo, groundMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ------------------------------------------------ gravel arrival path
  const pathPts = [
    [2, 178], [1, 162], [0, 150], [1.5, 141], [0.5, 135.5],
    [6, 131.5], [12, 126], [15, 118], [14, 110], [9, 102.5],
  ];
  const curve = new THREE.CatmullRomCurve3(
    pathPts.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  );
  const N = 80, HW = 1.5;
  const pGeo = new THREE.BufferGeometry();
  const verts = [], uvs = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    for (const s of [-1, 1]) {
      const x = p.x + side.x * HW * s;
      const z = p.z + side.z * HW * s;
      verts.push(x, groundY(x, z) + 0.06, z);
      uvs.push(s * 0.5 + 0.5, t * 22);
    }
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  pGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  pGeo.setIndex(idx);
  pGeo.computeVertexNormals();
  const pathMat = pbrMaterial('gravel_floor_02', '2k', { repeat: 1.6, roughness: 1 });
  pathMat.color = new THREE.Color(0x8f887c);
  pathMat.map.repeat.set(1.2, 8);
  const path = new THREE.Mesh(pGeo, pathMat);
  path.receiveShadow = true;
  scene.add(path);

  // ------------------------------------------------ lake mist billboards
  const mistTex = makeMistTexture();
  const mists = [];
  for (let i = 0; i < 12; i++) {
    const w = 60 + hash(i, 3) * 90;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w * 0.22),
      new THREE.MeshBasicMaterial({
        map: mistTex,
        transparent: true,
        opacity: 0.05 + hash(i, 7) * 0.06,
        depthWrite: false,
        fog: false,
      }),
    );
    m.position.set(-180 + hash(i, 1) * 360, 2.5 + hash(i, 2) * 5, -160 + hash(i, 5) * 190);
    mists.push(m);
    scene.add(m);
  }

  function update(t, camera) {
    for (let i = 0; i < mists.length; i++) {
      const m = mists[i];
      m.quaternion.copy(camera.quaternion);
      m.position.x += Math.sin(t * 0.05 + i) * 0.006;
    }
  }

  return { terrain, path, update };
}

function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 32, 4, 128, 32, 120);
  grad.addColorStop(0, 'rgba(210,220,225,0.85)');
  grad.addColorStop(1, 'rgba(210,220,225,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

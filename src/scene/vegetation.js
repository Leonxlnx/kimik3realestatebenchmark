import * as THREE from 'three';
import { loadModel } from '../loaders.js';
import { groundY } from './terrain.js';

// Deterministic RNG so the forest is identical on every load.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EXCLUDE = [
  { x: 0, z: 120, r: 33 }, // house plateau
  { x: 6, z: 101, r: 17 }, // pool terrace
  { x: 0, z: 136, r: 12 }, // entry
  { x: 23, z: 90, r: 13 }, // projection rock clearing
];
const PATH_PTS = [
  [2, 178], [1, 162], [0, 150], [1.5, 141], [0.5, 135.5],
  [6, 131.5], [12, 126], [15, 118], [14, 110], [9, 102.5],
];

function clearOf(x, z, extra = 0) {
  if (z < 58) return false; // the lake
  for (const e of EXCLUDE) if (Math.hypot(x - e.x, z - e.z) < e.r + extra) return false;
  for (let i = 0; i < PATH_PTS.length - 1; i++) {
    const [x1, z1] = PATH_PTS[i], [x2, z2] = PATH_PTS[i + 1];
    const dx = x2 - x1, dz = z2 - z1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t)) < 3.2 + extra) return false;
  }
  return true;
}

function scatter(rng, count, tries, sampler) {
  const out = [];
  for (let i = 0; i < tries && out.length < count; i++) {
    const p = sampler();
    if (p) out.push(p);
  }
  return out;
}

async function instanced(model, transforms, { shadow = false } = {}) {
  const group = new THREE.Group();
  model.updateMatrixWorld(true);
  const meshes = [];
  model.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  const m4 = new THREE.Matrix4();
  for (const mesh of meshes) {
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, transforms.length);
    transforms.forEach((t, i) => {
      m4.compose(t.pos, t.quat, t.scl).multiply(mesh.matrixWorld);
      im.setMatrixAt(i, m4);
    });
    im.castShadow = shadow;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  }
  return group;
}

const T = (x, z, s, ry, rng, yOff = 0) => ({
  pos: new THREE.Vector3(x, groundY(x, z) + yOff, z),
  quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
  scl: new THREE.Vector3(s, s, s),
});

export async function createVegetation(scene) {
  const rng = mulberry32(20260722);
  const ids = [
    'fir_tree_01', 'fir_sapling_medium', 'tree_small_02',
    'rock_moss_set_01', 'rock_moss_set_02', 'boulder_01', 'rock_07', 'rock_09',
    'rock_face_01',
    'grass_medium_01', 'grass_medium_02', 'fern_02', 'shrub_02', 'shrub_03',
    'dead_tree_trunk', 'tree_stump_01',
  ];
  const [fir, sapling, small, moss1, moss2, boulder, rock7, rock9, rockFace, grass1, grass2, fern, shrub2, shrub3, trunk, stump] =
    await Promise.all(ids.map(loadModel));

  const root = new THREE.Group();

  // ---------------------------------------------------------- hero firs
  const firT = [];
  // dense forest behind the house
  firT.push(...scatter(rng, 30, 500, () => {
    const x = -120 + rng() * 240;
    const z = 132 + rng() * 110;
    return clearOf(x, z, 4) ? T(x, z, 0.9 + rng() * 0.9, rng() * Math.PI * 2, rng) : null;
  }));
  // flanks + descent corridor framing
  firT.push(...scatter(rng, 20, 400, () => {
    const side = rng() > 0.5 ? 1 : -1;
    const x = side * (26 + rng() * 80);
    const z = 55 + rng() * 80;
    return clearOf(x, z, 4) ? T(x, z, 0.8 + rng() * 0.8, rng() * Math.PI * 2, rng) : null;
  }));
  // two sentinels near the shore, framing the opening shot
  firT.push(T(-38, 74, 1.5, 1.2, rng), T(44, 66, 1.35, 2.6, rng));
  root.add(await instanced(fir, firT, { shadow: true }));

  // ---------------------------------------------------------- understory
  const sapT = scatter(rng, 30, 500, () => {
    const x = -110 + rng() * 220;
    const z = 58 + rng() * 160;
    return clearOf(x, z) ? T(x, z, 0.7 + rng() * 0.7, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(sapling, sapT));

  const smallT = scatter(rng, 10, 300, () => {
    const x = -90 + rng() * 180;
    const z = 60 + rng() * 150;
    return clearOf(x, z) ? T(x, z, 0.8 + rng() * 0.5, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(small, smallT, { shadow: true }));

  // ---------------------------------------------------------- rocks
  // the projection rock face (About act) — a deliberate landmark,
  // normalized to a ~10 m boulder (the raw scan is cliff-sized)
  const rf = rockFace.clone(true);
  {
    const b = new THREE.Box3().setFromObject(rf);
    const sz = b.getSize(new THREE.Vector3());
    rf.scale.setScalar(10 / Math.max(sz.x, sz.y, sz.z));
  }
  rf.rotation.y = -2.35; // faces the descent path
  {
    const b = new THREE.Box3().setFromObject(rf);
    const c = b.getCenter(new THREE.Vector3());
    rf.position.set(23 - c.x, groundY(23, 90) - 1.0 - b.min.y, 90 - c.z);
  }
  rf.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  root.add(rf);

  const rockSets = [
    [moss1, 7, 0.7, 1.6],
    [moss2, 7, 0.6, 1.4],
    [boulder, 8, 0.5, 1.3],
    [rock7, 8, 0.6, 1.5],
    [rock9, 8, 0.6, 1.5],
  ];
  for (const [model, count, smin, smax] of rockSets) {
    const t = scatter(rng, count, 300, () => {
      const x = -100 + rng() * 200;
      const z = 54 + rng() * 170;
      return clearOf(x, z, 1)
        ? T(x, z, smin + rng() * (smax - smin), rng() * Math.PI * 2, rng, -0.15)
        : null;
    });
    root.add(await instanced(model, t, { shadow: true }));
  }
  // shore boulders at the waterline (kept clear of the camera corridor x 4..22)
  const shoreT = [];
  for (let i = 0; i < 14; i++) {
    const x = -90 + i * 13 + rng() * 6;
    if (x > 4 && x < 22) continue;
    const z = 52 + rng() * 5;
    shoreT.push(T(x, z, 0.5 + rng() * 0.9, rng() * Math.PI * 2, rng, -0.3));
  }
  root.add(await instanced(boulder, shoreT, { shadow: true }));

  // ---------------------------------------------------------- ground cover
  const grassT1 = scatter(rng, 260, 1400, () => {
    const x = -110 + rng() * 220;
    const z = 55 + rng() * 180;
    return clearOf(x, z, -1.2) ? T(x, z, 0.8 + rng() * 0.9, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(grass1, grassT1));
  const grassT2 = scatter(rng, 180, 1000, () => {
    const x = -110 + rng() * 220;
    const z = 55 + rng() * 180;
    return clearOf(x, z, -1.2) ? T(x, z, 0.8 + rng() * 0.9, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(grass2, grassT2));
  const fernT = scatter(rng, 90, 600, () => {
    const x = -100 + rng() * 200;
    const z = 58 + rng() * 160;
    return clearOf(x, z) ? T(x, z, 0.8 + rng() * 0.8, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(fern, fernT));
  const shrubT = scatter(rng, 40, 400, () => {
    const x = -100 + rng() * 200;
    const z = 56 + rng() * 170;
    return clearOf(x, z, 1) ? T(x, z, 0.7 + rng() * 0.8, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(shrub2, shrubT, { shadow: true }));
  const shrub3T = scatter(rng, 30, 300, () => {
    const x = -100 + rng() * 200;
    const z = 56 + rng() * 170;
    return clearOf(x, z, 1) ? T(x, z, 0.7 + rng() * 0.8, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(shrub3, shrub3T));

  // ---------------------------------------------------------- forest floor detail
  const trunkT = scatter(rng, 5, 200, () => {
    const x = -80 + rng() * 160;
    const z = 62 + rng() * 140;
    return clearOf(x, z, 2) ? T(x, z, 0.9 + rng() * 0.4, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(trunk, trunkT, { shadow: true }));
  const stumpT = scatter(rng, 6, 200, () => {
    const x = -80 + rng() * 160;
    const z = 62 + rng() * 140;
    return clearOf(x, z, 2) ? T(x, z, 0.9 + rng() * 0.4, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(stump, stumpT, { shadow: true }));

  // ---------------------------------------------------------- near-house meadow
  // soft ground cover right up to the terrace and path edges
  const nearHouse = (x, z) => {
    if (x > -9.5 && x < 13.5 && z > 95 && z < 112.5) return false; // terrace + pool
    if (x > -13.5 && x < 13 && z > 112 && z < 126.5) return false; // main volume
    if (x > -24 && x < -13 && z > 116 && z < 127) return false; // wing
    if (Math.hypot(x, z - 134) < 7) return false; // entry wall
    for (let i = 0; i < PATH_PTS.length - 1; i++) {
      const [x1, z1] = PATH_PTS[i], [x2, z2] = PATH_PTS[i + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t)) < 2.4) return false;
    }
    return z > 84 && z < 150 && Math.abs(x) < 42;
  };
  const meadow1 = scatter(rng, 150, 900, () => {
    const x = -42 + rng() * 84;
    const z = 84 + rng() * 66;
    return nearHouse(x, z) ? T(x, z, 0.7 + rng() * 0.7, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(grass1, meadow1));
  const meadow2 = scatter(rng, 90, 600, () => {
    const x = -42 + rng() * 84;
    const z = 84 + rng() * 66;
    return nearHouse(x, z) ? T(x, z, 0.7 + rng() * 0.7, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(grass2, meadow2));
  const meadowFern = scatter(rng, 36, 300, () => {
    const x = -40 + rng() * 80;
    const z = 86 + rng() * 60;
    return nearHouse(x, z) ? T(x, z, 0.7 + rng() * 0.6, rng() * Math.PI * 2, rng) : null;
  });
  root.add(await instanced(fern, meadowFern));

  scene.add(root);
  return { group: root };
}

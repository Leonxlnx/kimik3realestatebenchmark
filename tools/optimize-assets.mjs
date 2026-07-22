// Optimize downloaded Poly Haven glTF models into web-ready GLBs.
// - welds, prunes, dedups
// - simplifies scanned meshes that exceed a triangle budget
// - resizes textures (1024px) and re-encodes as jpeg/webp where possible
// - quantizes attributes (KHR_mesh_quantization, natively supported by three)
// Run: node tools/optimize-assets.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  dedup,
  prune,
  weld,
  simplify,
  textureCompress,
  quantize,
  resample,
  flatten,
} from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = path.join(ROOT, 'assets-src', 'models');
const DST = path.join(ROOT, 'public', 'assets', 'models-opt');

// Per-asset triangle budgets (scanned nature assets are extremely dense).
const TRI_BUDGET = {
  fir_tree_01: 90000,
  fir_sapling_medium: 25000,
  tree_small_02: 25000,
  rock_face_01: 40000, // hero projection boulder — keep the silhouette
  rock_moss_set_01: 20000,
  rock_moss_set_02: 20000,
  boulder_01: 15000,
  rock_07: 10000,
  rock_09: 10000,
  grass_medium_01: 4000,
  grass_medium_02: 4000,
  fern_02: 3500,
  shrub_02: 6000,
  shrub_03: 6000,
  dead_tree_trunk: 10000,
  tree_stump_01: 8000,
  potted_plant_01: 20000,
  potted_plant_02: 18000,
  anthurium_botany_01: 15000,
  book_encyclopedia_set_01: 15000,
  brass_vase_01: 8000,
  dining_chair_02: 10000,
  DEFAULT: 60000,
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;

const dirs = (await fs.readdir(SRC, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

await fs.mkdir(DST, { recursive: true });

for (const id of dirs) {
  const dir = path.join(SRC, id);
  const gltfName = (await fs.readdir(dir)).find((f) => f.endsWith('.gltf'));
  if (!gltfName) continue;
  const out = path.join(DST, `${id}.glb`);
  if (existsSync(out)) { console.log('skip', id); continue; }

  const doc = await io.read(path.join(dir, gltfName));
  const budget = TRI_BUDGET[id] ?? TRI_BUDGET.DEFAULT;

  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives())
      tris += (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3;

  await doc.transform(
    flatten(),
    dedup(),
    resample(),
    weld(),
    prune(),
    ...(tris > budget
      ? [simplify({ simplifier: MeshoptSimplifier, ratio: budget / tris, error: 0.01 })]
      : []),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024] }),
    quantize(),
  );

  await io.write(out, doc);
  const mb = ((await fs.stat(out)).size / 1e6).toFixed(1);
  console.log(`${id}: ${Math.round(tris)} tris -> budget ${budget}, ${mb} MB`);
}
console.log('DONE');

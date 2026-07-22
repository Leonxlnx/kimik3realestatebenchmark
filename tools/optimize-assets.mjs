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
  fir_tree_01: 140000,
  fir_sapling_medium: 40000,
  tree_small_02: 40000,
  rock_face_01: 60000,
  rock_moss_set_01: 30000,
  rock_moss_set_02: 30000,
  boulder_01: 20000,
  rock_07: 12000,
  rock_09: 12000,
  grass_medium_01: 8000,
  grass_medium_02: 8000,
  fern_02: 8000,
  shrub_02: 10000,
  shrub_03: 10000,
  dead_tree_trunk: 15000,
  tree_stump_01: 12000,
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
      ? [simplify({ simplifier: MeshoptSimplifier, ratio: budget / tris, error: 0.001 })]
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

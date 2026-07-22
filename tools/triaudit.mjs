import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { promises as fs } from 'node:fs';
import path from 'node:path';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const dir = 'public/assets/models-opt';
const rows = [];
for (const f of await fs.readdir(dir)) {
  if (!f.endsWith('.glb')) continue;
  const doc = await io.read(path.join(dir, f));
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives())
      tris += (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3;
  rows.push([f, Math.round(tris)]);
}
rows.sort((a, b) => b[1] - a[1]);
for (const [f, t] of rows) console.log(String(t).padStart(8), f);

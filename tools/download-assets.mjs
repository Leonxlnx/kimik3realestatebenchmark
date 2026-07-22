// Asset downloader for the Stillwater House experience.
// Sources: Poly Haven (https://polyhaven.com) — all assets CC0 (public domain).
// https://polyhaven.com/license
// Fonts: Google Fonts — SIL Open Font License 1.1.
// Run: node tools/download-assets.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = path.join(ROOT, 'public', 'assets');

// ---------------------------------------------------------------------------
// Selection (all Poly Haven, CC0)
// ---------------------------------------------------------------------------
const HDRIS = [
  { id: 'qwantani_dusk_2', res: '2k' }, // dusk over mountain lake — main journey
  { id: 'qwantani_night', res: '2k' }, // starry night over the same lake — finale
];

const TEXTURES = [
  { id: 'dark_wooden_planks', res: '2k', use: 'charred-timber facade cladding' },
  { id: 'old_wood_floor', res: '2k', use: 'interior wide-plank floor' },
  { id: 'oak_veneer_01', res: '2k', use: 'interior ceiling + millwork' },
  { id: 'concrete_wall_008', res: '2k', use: 'board-formed concrete plinth + walls' },
  { id: 'mossy_stone_wall', res: '2k', use: 'entry wall, terrace, landscape retaining' },
  { id: 'forest_ground_04', res: '2k', use: 'terrain ground' },
  { id: 'gravel_floor_02', res: '2k', use: 'arrival path' },
  { id: 'marble_01', res: '2k', use: 'kitchen island + bath accent' },
];

const MODELS = [
  // Nature / landscaping
  { id: 'fir_tree_01', res: '2k', use: 'hero conifers' },
  { id: 'fir_sapling_medium', res: '1k', use: 'mid conifers' },
  { id: 'tree_small_02', res: '1k', use: 'understory trees' },
  { id: 'rock_face_01', res: '2k', use: 'sun-projection rock wall (About)' },
  { id: 'rock_moss_set_01', res: '1k', use: 'mossy boulders' },
  { id: 'rock_moss_set_02', res: '1k', use: 'mossy boulders' },
  { id: 'boulder_01', res: '1k', use: 'shore boulders' },
  { id: 'rock_07', res: '1k', use: 'scatter rocks' },
  { id: 'rock_09', res: '1k', use: 'scatter rocks' },
  { id: 'grass_medium_01', res: '1k', use: 'instanced ground grass' },
  { id: 'grass_medium_02', res: '1k', use: 'instanced ground grass' },
  { id: 'fern_02', res: '1k', use: 'instanced ferns' },
  { id: 'shrub_02', res: '1k', use: 'shrubs' },
  { id: 'shrub_03', res: '1k', use: 'shrubs' },
  { id: 'dead_tree_trunk', res: '1k', use: 'forest floor detail' },
  { id: 'tree_stump_01', res: '1k', use: 'forest floor detail' },
  // Furniture & interior
  { id: 'Sofa_01', res: '2k', use: 'living room sofa' },
  { id: 'ArmChair_01', res: '1k', use: 'reading chair' },
  { id: 'CoffeeTable_01', res: '1k', use: 'living room' },
  { id: 'coffee_table_round_01', res: '1k', use: 'lounge corner' },
  { id: 'side_table_01', res: '1k', use: 'lounge corner' },
  { id: 'dining_table', res: '1k', use: 'dining area' },
  { id: 'dining_chair_02', res: '1k', use: 'dining chairs x6' },
  { id: 'round_wooden_table_01', res: '1k', use: 'terrace table' },
  { id: 'Shelf_01', res: '1k', use: 'living room shelving' },
  { id: 'wooden_bookshelf_worn', res: '1k', use: 'library wall' },
  { id: 'book_encyclopedia_set_01', res: '1k', use: 'shelf dressing' },
  { id: 'decorative_book_set_01', res: '1k', use: 'coffee-table books' },
  { id: 'potted_plant_01', res: '1k', use: 'interior greenery' },
  { id: 'potted_plant_02', res: '1k', use: 'interior greenery' },
  { id: 'anthurium_botany_01', res: '1k', use: 'interior greenery' },
  { id: 'throw_pillows_01', res: '1k', use: 'sofa dressing' },
  { id: 'fancy_picture_frame_01', res: '1k', use: 'results artwork (canvas text)' },
  { id: 'standing_picture_frame_01', res: '1k', use: 'console frame' },
  { id: 'wooden_bowl_01', res: '1k', use: 'table dressing' },
  { id: 'ceramic_vase_02', res: '1k', use: 'console dressing' },
  { id: 'brass_vase_01', res: '1k', use: 'dining dressing' },
  { id: 'wooden_lantern_01', res: '1k', use: 'path + terrace lanterns' },
  { id: 'stone_fire_pit', res: '1k', use: 'terrace fire pit (finale)' },
  { id: 'vintage_day_bed', res: '1k', use: 'terrace day bed' },
];

const FONTS = [
  {
    file: 'Fraunces-var.ttf',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf',
    license: 'SIL Open Font License 1.1 — https://openfontlicense.org',
  },
  {
    file: 'SpaceGrotesk-var.ttf',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf',
    license: 'SIL Open Font License 1.1 — https://openfontlicense.org',
  },
];

// ---------------------------------------------------------------------------
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function download(url, dest) {
  if (existsSync(dest)) return 'skip';
  await mkdir(path.dirname(dest), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
  return 'ok';
}

async function getModel(id, res) {
  const files = await fetchJSON(`https://api.polyhaven.com/files/${id}`);
  const fmt = files?.gltf?.[res] || files?.gltf?.['1k'];
  if (!fmt?.gltf) throw new Error(`no gltf for ${id}`);
  const base = path.join(ROOT, 'assets-src', 'models', id);
  await download(fmt.gltf.url, path.join(base, path.basename(new URL(fmt.gltf.url).pathname)));
  for (const [rel, info] of Object.entries(fmt.gltf.include || {})) {
    await download(info.url, path.join(base, rel));
  }
}

async function getTexture(id, res) {
  const files = await fetchJSON(`https://api.polyhaven.com/files/${id}`);
  const want = ['Diffuse', 'nor_gl', 'Rough', 'AO', 'Displacement'];
  for (const key of want) {
    const slot = files?.[key]?.[res]?.jpg || files?.[key]?.['1k']?.jpg;
    if (!slot) continue;
    const name = path.basename(new URL(slot.url).pathname);
    await download(slot.url, path.join(OUT, 'textures', id, name));
  }
}

async function getHDRI(id, res) {
  const files = await fetchJSON(`https://api.polyhaven.com/files/${id}`);
  const slot = files?.hdri?.[res]?.hdr;
  if (!slot) throw new Error(`no hdr for ${id}`);
  await download(slot.url, path.join(OUT, 'env', `${id}_${res}.hdr`));
}

const only = process.argv[2]; // optional filter
let failures = 0;
async function run(label, items, fn) {
  for (const it of items) {
    if (only && !it.id?.includes(only) && !it.file?.includes(only)) continue;
    try {
      await fn(it);
      console.log(`${label} ok: ${it.id || it.file}`);
    } catch (e) {
      failures++;
      console.error(`${label} FAIL: ${it.id || it.file} — ${e.message}`);
    }
  }
}

await run('hdri', HDRIS, (h) => getHDRI(h.id, h.res));
await run('tex ', TEXTURES, (t) => getTexture(t.id, t.res));
await run('mdl ', MODELS, (m) => getModel(m.id, m.res));
await run('font', FONTS, async (f) => {
  await download(f.url, path.join(OUT, 'fonts', f.file));
});

// Manifest with sources + licenses
const lines = [
  '# Asset Manifest — Stillwater House / Halcyon Estates',
  '',
  'All 3D models, PBR textures and HDR environments were downloaded from',
  '**Poly Haven** (https://polyhaven.com) and are licensed **CC0 (public domain)** —',
  'https://polyhaven.com/license. No attribution required; credit given anyway.',
  '',
  'Fonts are from Google Fonts, licensed under the **SIL Open Font License 1.1**.',
  '',
  '> Note: no license-clean scanned "luxury villa" model exists in CC0 libraries,',
  '> so the architectural shell is designed in code and clad exclusively in the',
  '> professional PBR material sets below. Every piece of furniture, vegetation,',
  '> rock and prop is a scanned Poly Haven asset.',
  '',
  '## HDR environments (Poly Haven, CC0)',
  ...HDRIS.map((h) => `- \`${h.id}\` (${h.res}) — https://polyhaven.com/a/${h.id}`),
  '',
  '## PBR texture sets (Poly Haven, CC0)',
  ...TEXTURES.map((t) => `- \`${t.id}\` (${t.res}) — ${t.use} — https://polyhaven.com/a/${t.id}`),
  '',
  '## Models (Poly Haven, CC0)',
  ...MODELS.map((m) => `- \`${m.id}\` (${m.res}) — ${m.use} — https://polyhaven.com/a/${m.id}`),
  '',
  '## Fonts (OFL 1.1)',
  ...FONTS.map((f) => `- \`${f.file}\` — ${f.license}`),
  '',
];
await writeFile(path.join(ROOT, 'ASSETS.md'), lines.join('\n'));
console.log(failures ? `DONE with ${failures} failures` : 'DONE — all assets fetched');

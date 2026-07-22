import * as THREE from 'three';
import { loadModel, place } from '../loaders.js';
import { groundY } from './terrain.js';
import { state } from '../state.js';

const F = 13.0;

// Canvas typeset "artwork" — the results act lives inside a bronze frame.
function resultsArtwork() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1280;
  const g = c.getContext('2d');
  g.fillStyle = '#141614';
  g.fillRect(0, 0, 1024, 1280);
  g.strokeStyle = '#b08d57';
  g.lineWidth = 3;
  g.strokeRect(46, 46, 932, 1188);
  g.fillStyle = '#f2efe7';
  g.textAlign = 'center';
  g.font = '300 44px "Space Grotesk", sans-serif';
  g.fillText('T H E   R E C O R D', 512, 150);
  const rows = [
    ['27', 'years on this shore'],
    ['342', 'estates placed'],
    ['$2.1B', 'quietly represented'],
    ['96%', 'placed off-market'],
  ];
  rows.forEach(([n, label], i) => {
    const y = 340 + i * 230;
    g.font = 'italic 500 110px Fraunces, serif';
    g.fillStyle = '#e9e2d2';
    g.fillText(n, 512, y);
    g.font = '300 34px "Space Grotesk", sans-serif';
    g.fillStyle = '#9a958a';
    g.fillText(label, 512, y + 52);
    if (i < rows.length - 1) {
      g.strokeStyle = 'rgba(176,141,87,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(312, y + 105);
      g.lineTo(712, y + 105);
      g.stroke();
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function flameTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 84, 4, 64, 72, 60);
  grad.addColorStop(0, 'rgba(255,230,170,1)');
  grad.addColorStop(0.35, 'rgba(255,150,60,0.75)');
  grad.addColorStop(0.7, 'rgba(200,70,20,0.25)');
  grad.addColorStop(1, 'rgba(120,30,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function createInterior(scene) {
  const ids = [
    'Sofa_01', 'ArmChair_01', 'CoffeeTable_01', 'coffee_table_round_01', 'side_table_01',
    'dining_table', 'dining_chair_02', 'round_wooden_table_01', 'Shelf_01',
    'wooden_bookshelf_worn', 'book_encyclopedia_set_01', 'potted_plant_01', 'potted_plant_02',
    'anthurium_botany_01', 'throw_pillows_01', 'fancy_picture_frame_01',
    'standing_picture_frame_01', 'wooden_bowl_01', 'ceramic_vase_02', 'brass_vase_01',
    'wooden_lantern_01', 'stone_fire_pit', 'vintage_day_bed',
  ];
  const M = {};
  const loaded = await Promise.all(ids.map(loadModel));
  ids.forEach((id, i) => (M[id] = loaded[i]));

  const root = new THREE.Group();
  const add = (o) => root.add(o) && o;

  // ---------------------------------------------------------- living
  add(place(M.Sofa_01, { p: [-2, F, 116.6], r: [0, Math.PI, 0], s: 1 }));
  add(place(M.throw_pillows_01, { p: [-2.4, F + 0.55, 116.9], r: [0, Math.PI * 0.9, 0], s: 1 }));
  add(place(M.CoffeeTable_01, { p: [-2, F, 114.5], r: [0, 0, 0], s: 1 }));
  add(place(M.anthurium_botany_01, { p: [-2.3, F + 0.42, 114.4], r: [0, 1, 0], s: 0.8 }));
  add(place(M.book_encyclopedia_set_01, { p: [-1.6, F + 0.42, 114.6], r: [0, 0.4, 0], s: 0.9 }));
  add(place(M.ArmChair_01, { p: [-5.8, F, 115.2], r: [0, Math.PI * 0.72, 0], s: 1 }));
  add(place(M.coffee_table_round_01, { p: [-5.2, F, 113.9], r: [0, 0, 0], s: 1 }));
  add(place(M.ceramic_vase_02, { p: [-5.2, F + 0.45, 113.9], r: [0, 0, 0], s: 0.9 }));
  add(place(M.side_table_01, { p: [-7.4, F, 116], r: [0, 0.3, 0], s: 1 }));
  add(place(M.standing_picture_frame_01, { p: [-7.4, F + 0.6, 116], r: [0, 2.6, 0], s: 0.9 }));

  // ---------------------------------------------------------- dining
  add(place(M.dining_table, { p: [7.6, F, 117.6], r: [0, Math.PI / 2, 0], s: 1 }));
  const chairP = [
    [6.6, 116.4, 0], [6.6, 118.8, 0], [9.4, 116.4, Math.PI], [9.4, 118.8, Math.PI],
    [8.6, 115.6, Math.PI / 2], [8.6, 119.6, -Math.PI / 2],
  ];
  for (const [x, z, ry] of chairP) add(place(M.dining_chair_02, { p: [x, F, z], r: [0, ry, 0], s: 1 }));
  add(place(M.brass_vase_01, { p: [7.6, F + 0.78, 117.6], r: [0, 0, 0], s: 0.9 }));

  // ---------------------------------------------------------- library wall
  add(place(M.Shelf_01, { p: [11.7, F, 116.8], r: [0, -Math.PI / 2, 0], s: 1 }));
  add(place(M.wooden_bookshelf_worn, { p: [11.65, F, 121.2], r: [0, -Math.PI / 2, 0], s: 1 }));
  add(place(M.book_encyclopedia_set_01, { p: [11.65, F + 0.95, 116.8], r: [0, -Math.PI / 2, 0], s: 1 }));
  add(place(M.fancy_picture_frame_01, { p: [11.6, F + 1.15, 121.0], r: [0, -Math.PI / 2 - 0.2, 0], s: 0.85 }));

  // ---------------------------------------------------------- greenery
  add(place(M.potted_plant_01, { p: [-11.2, F, 114.2], r: [0, 0.7, 0], s: 1 }));
  add(place(M.potted_plant_02, { p: [11.3, F, 124], r: [0, 2.1, 0], s: 1 }));
  add(place(M.wooden_bowl_01, { p: [6.2, F + 0.97, 121.6], r: [0, 0.5, 0], s: 1 }));

  // ------------------------------------------------- framed results artwork
  const art = new THREE.Group();
  const artTex = resultsArtwork();
  const artMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.44),
    new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.85, metalness: 0 }),
  );
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.29, 1.58, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x6b532f, metalness: 0.8, roughness: 0.4 }),
  );
  frame.position.z = -0.028;
  art.add(frame, artMesh);
  art.position.set(-11.9, F + 1.85, 119);
  art.rotation.y = Math.PI / 2;
  root.add(art);

  // ---------------------------------------------------------- terrace
  add(place(M.vintage_day_bed, { p: [-6.8, F, 107.5], r: [0, Math.PI * 1.35, 0], s: 1 }));
  add(place(M.round_wooden_table_01, { p: [11, F, 105.5], r: [0, 0, 0], s: 0.95 }));
  add(place(M.dining_chair_02, { p: [10.2, F, 106.6], r: [0, -2.4, 0], s: 1 }));
  add(place(M.dining_chair_02, { p: [11.8, F, 104.6], r: [0, 0.7, 0], s: 1 }));
  add(place(M.stone_fire_pit, { p: [-4.2, F, 100.3], r: [0, 0.4, 0], s: 1 }));

  // lanterns: path, entry, terrace
  const lanternSpots = [
    { x: 1.8, z: 150 }, { x: -1.4, z: 139 }, { x: 3.2, z: 131.8 }, // along the path
    { x: -1.9, z: 133.2 }, { x: 12.2, z: 98.6 }, { x: -0.2, z: 102.9 }, // entry + terrace
  ];
  const lanternGlows = [];
  for (const { x, z } of lanternSpots) {
    const onTerrace = z < 134 && Math.abs(x - 2.25) < 10.5 && z > 96 && z < 112;
    const y = onTerrace ? F : groundY(x, z);
    add(place(M.wooden_lantern_01, { p: [x, y, z], r: [0, x * 3.1, 0], s: 0.85 }));
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffb26a, transparent: true, opacity: 0 }),
    );
    glow.position.set(x, y + 0.28, z);
    lanternGlows.push(glow);
    root.add(glow);
  }

  // ---------------------------------------------------------- fire pit
  const flame = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: flameTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  flame.position.set(-4.2, F + 0.75, 100.3);
  flame.scale.set(1.1, 1.5, 1);
  root.add(flame);
  const fireLight = new THREE.PointLight(0xff8a3c, 0, 22, 2);
  fireLight.position.set(-4.2, F + 1.1, 100.3);
  root.add(fireLight);

  scene.add(root);

  function update(t) {
    const n = state.night;
    const fire = THREE.MathUtils.smoothstep(n, 0.45, 0.85);
    const flicker = 0.82 + 0.18 * Math.sin(t * 11) * Math.sin(t * 4.7 + 1.3);
    fireLight.intensity = fire * 60 * flicker;
    flame.material.opacity = fire * (0.75 + 0.25 * flicker);
    flame.scale.set(1.0 + 0.12 * Math.sin(t * 7.3), 1.45 + 0.18 * Math.sin(t * 9.1), 1);
    const lg = THREE.MathUtils.smoothstep(n, 0.25, 0.8);
    for (const g of lanternGlows) g.material.opacity = lg * 0.9;
  }

  return { group: root, update };
}

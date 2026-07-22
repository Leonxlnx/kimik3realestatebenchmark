import * as THREE from 'three';
import { state } from '../state.js';

// The directed camera. Positions/looks are hand-set dolly marks; repeated
// marks are deliberate holds. Easing is per-segment smootherstep — never
// constant-speed, never orbiting.

const K = [
  // --- overture: across the lake toward the standing title
  { t: 0.0, p: [-185, 26, -235], l: [0, 24, 60] },
  { t: 0.05, p: [-95, 15, -125], l: [0, 25, 40] },
  { t: 0.09, p: [-34, 7.5, -45], l: [2, 16, 60] },
  // --- shore, turn inland through the trees
  { t: 0.125, p: [-2, 5.5, 8], l: [18, 12, 90] },
  { t: 0.155, p: [12, 9.5, 48], l: [21, 11.5, 88] },
  { t: 0.185, p: [11, 11.8, 70], l: [22, 11.8, 89] }, // hold: the projection
  { t: 0.225, p: [11, 11.8, 70], l: [22, 11.8, 89] },
  // --- around the east side to the entry wall
  { t: 0.255, p: [24, 13.5, 104], l: [10, 14, 128] },
  { t: 0.285, p: [14.5, 14.3, 123.5], l: [4, 14.2, 133.7] },
  { t: 0.3, p: [13.5, 14.5, 131], l: [1, 14.1, 133.9] }, // wide around the NE corner
  { t: 0.315, p: [5, 14.7, 128.2], l: [-0.5, 14.0, 133.8] }, // hold: the engraving
  { t: 0.345, p: [5, 14.7, 128.2], l: [-0.5, 14.0, 133.8] },
  // --- rise over the bedroom wing and arc west; the front opens up
  { t: 0.37, p: [-10, 17.0, 133.5], l: [-16, 14.5, 118] },
  { t: 0.39, p: [-26, 19.0, 127], l: [-6, 13.8, 108] },
  { t: 0.41, p: [-28, 16.5, 110], l: [-2, 13.9, 102] },
  { t: 0.43, p: [-14, 14.4, 102.5], l: [3, 14.2, 100.5] },
  { t: 0.445, p: [-6, 13.9, 100.8], l: [5.5, 14.4, 100.5] }, // hold: listings + reflections
  { t: 0.465, p: [-6, 13.9, 100.8], l: [5.5, 14.4, 100.5] },
  // --- around the pool, through the open panel
  { t: 0.485, p: [1.5, 13.95, 97.3], l: [2.4, 14.2, 113] },
  { t: 0.51, p: [2.4, 14.3, 107], l: [2.4, 14.2, 120] },
  { t: 0.53, p: [2.4, 14.3, 114.5], l: [0, 14.3, 122] },
  // --- interior: the sun-shaft panels
  { t: 0.555, p: [-1, 14.4, 118.5], l: [-6, 14.6, 124.8] },
  { t: 0.6, p: [-5, 14.5, 120.5], l: [-9.6, 14.6, 124.8] },
  { t: 0.63, p: [-7.5, 14.5, 121.0], l: [-11.9, 14.7, 119] }, // hold: the record
  { t: 0.665, p: [-7.5, 14.5, 121.0], l: [-11.9, 14.7, 119] },
  // --- the glass: testimonials in reflection
  { t: 0.695, p: [-2, 14.5, 119.6], l: [-1, 14.7, 112.9] },
  { t: 0.725, p: [0.5, 14.45, 118.6], l: [2.5, 14.6, 112.9] },
  { t: 0.755, p: [4.5, 14.35, 118.9], l: [6, 14.2, 113.2] },
  // --- back out; night falls at the fire pit
  { t: 0.775, p: [2.6, 14.3, 114.2], l: [2.4, 14, 104] },
  { t: 0.8, p: [0, 14.1, 106.5], l: [-4.2, 13.8, 100.3] },
  { t: 0.83, p: [-2.5, 14.2, 103.5], l: [-4.2, 13.6, 100.3] }, // hold: fire, dusk→night
  { t: 0.855, p: [-2.5, 14.2, 103.5], l: [-4.2, 13.6, 100.3] },
  // --- the ascent into the constellation
  { t: 0.885, p: [-6, 15.5, 88], l: [2, 14.5, 108] },
  { t: 0.915, p: [-14, 20, 55], l: [0, 20, 115] },
  { t: 0.945, p: [-8, 34, 32], l: [0, 42, 118] },
  { t: 1.0, p: [0, 46, 60], l: [0, 66, 118] },
];

const keys = K.map((k) => ({
  t: k.t,
  p: new THREE.Vector3(...k.p),
  l: new THREE.Vector3(...k.l),
}));

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _fwd = new THREE.Vector3();

function smoother(x) {
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function camAt(p) {
  p = THREE.MathUtils.clamp(p, 0, 1);
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= p) i++;
  const a = keys[i], b = keys[i + 1];
  const span = Math.max(1e-6, b.t - a.t);
  const u = smoother(THREE.MathUtils.clamp((p - a.t) / span, 0, 1));
  _pos.lerpVectors(a.p, b.p, u);
  _look.lerpVectors(a.l, b.l, u);
  return { pos: _pos, look: _look };
}

export function updateJourney(camera, dt, t) {
  // debug hook: fixed camera override (?debug tooling)
  if (window.__cam) {
    const c = window.__cam;
    camera.position.set(c[0], c[1], c[2]);
    camera.lookAt(c[3], c[4], c[5]);
    state.night = window.__night ?? state.night;
    state.smooth = window.__smooth ?? state.smooth;
    return;
  }
  // scroll smoothing — heavy, like a dolly on track
  const target = state.progress;
  state.smooth += (target - state.smooth) * (1 - Math.exp(-dt * 3.2));
  if (Math.abs(target - state.smooth) < 0.0004) state.smooth = target;

  const p = state.smooth;
  const { pos, look } = camAt(p);

  // pointer parallax: present everywhere, strongest in the overture
  const sx = state.pointer.sx, sy = state.pointer.sy;
  camera.position.copy(pos);
  camera.lookAt(look);
  camera.getWorldDirection(_fwd);
  _right.crossVectors(_fwd, _up).normalize();
  const strength = 0.35 + 2.0 * (1 - THREE.MathUtils.smoothstep(p, 0.1, 0.22));
  camera.position.addScaledVector(_right, sx * strength);
  camera.position.y += -sy * strength * 0.5;
  _look.addScaledVector(_right, sx * strength * 2.2);
  _look.y += -sy * strength * 1.1;

  // a whisper of handheld life
  const hand = 0.05;
  camera.position.x += Math.sin(t * 0.31) * hand;
  camera.position.y += Math.sin(t * 0.23 + 2) * hand * 0.6;

  camera.lookAt(_look);

  // dusk -> night
  state.night = THREE.MathUtils.smoothstep(p, 0.74, 0.86);
}

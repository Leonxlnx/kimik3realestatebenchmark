import { state } from './state.js';
import { setProgressHandler } from './loaders.js';
import { createStage } from './scene/setup.js';
import { createEnvironment } from './scene/env.js';
import { createTerrain } from './scene/terrain.js';
import { createWater } from './scene/water.js';
import { createHouse } from './scene/house.js';
import { createVegetation } from './scene/vegetation.js';
import { createInterior } from './scene/interior.js';
import { createTypography } from './scene/typography.js';
import { updateJourney } from './scene/journey.js';
import { initUI, setLoader, finishLoader, fallbackMode } from './ui.js';

const NOTES = [
  [0.0, 'Surveying the shoreline…'],
  [0.25, 'Felling no trees — placing them…'],
  [0.5, 'Blackening the cedar…'],
  [0.75, 'Polishing the glass…'],
  [0.92, 'Waiting for dusk…'],
];

window.addEventListener('error', (e) => {
  const noteEl = document.getElementById('loader-note');
  if (noteEl) noteEl.textContent = `⚠ ${e.message}`;
});
window.addEventListener('unhandledrejection', (e) => {
  const noteEl = document.getElementById('loader-note');
  if (noteEl) noteEl.textContent = `⚠ ${e.reason?.message || e.reason}`;
});

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  if (state.reducedMotion) return fallbackMode('prefers-reduced-motion');
  if (!webglAvailable()) return fallbackMode('webgl unavailable');

  document.body.classList.add('webgl');
  setProgressHandler((done, total) => {
    const f = total ? done / total : 0;
    const note = NOTES.filter(([at]) => f >= at).pop()?.[1];
    setLoader(done, total, `${done}/${total} — ${note}`);
  });

  const canvas = document.getElementById('gl');
  const { renderer, scene, camera, composer, adapt } = createStage(canvas);
  const stageNote = (s) => {
    const n = document.getElementById('loader-note');
    if (n) n.textContent = s;
  };
  stageNote('stage ready — loading environment');

  // build the world
  const env = await createEnvironment(scene, renderer);
  stageNote('environment ready');
  const terrain = createTerrain(scene);
  const water = createWater(scene);
  const house = createHouse(scene);
  stageNote('architecture ready');
  const [vegetation, interior] = await Promise.all([
    createVegetation(scene),
    createInterior(scene),
  ]);
  stageNote('landscape ready');
  const typography = createTypography(scene, camera);

  const ui = initUI();

  window.__scene = scene;
  window.__setProgress = (p) => { state.progress = p; state.smooth = p; };
  window.__dbg = () => ({
    progress: +state.progress.toFixed(3),
    smooth: +state.smooth.toFixed(3),
    night: +state.night.toFixed(2),
    calls: renderer.info.render.calls,
    tris: renderer.info.render.triangles,
    quality: state.quality,
  });

  // warm up: compile shaders & upload before the first visible frame
  await renderer.compileAsync(scene, camera);
  stageNote('first light…');

  const clock = { last: performance.now(), t: 0 };
  let firstFrame = true;

  function frame(now) {
    const dt = Math.min(0.05, (now - clock.last) / 1000);
    clock.last = now;
    clock.t += dt;
    const t = clock.t;

    ui.tick(dt);
    updateJourney(camera, dt, t);
    env.update();
    house.update();
    water.update(t);
    terrain.update(t, camera);
    interior.update(t);
    typography.update(t);

    composer.render();
    if (firstFrame) {
      firstFrame = false;
      finishLoader();
    }
    adapt(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  fallbackMode(err?.message || 'boot error');
});

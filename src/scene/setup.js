import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { state } from '../state.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1400);
  camera.position.set(-190, 30, -240);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.18, // strength — deliberately restrained
    0.65,
    0.92,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  // Adaptive quality: drop pixel ratio, then bloom, if frames run long.
  let slowFrames = 0;
  function adapt(dt) {
    if (state.quality === 0) return;
    if (dt > 1 / 27) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 2);
    if (slowFrames > 90) {
      slowFrames = 0;
      if (state.quality === 2) {
        state.quality = 1;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15));
        resize();
        console.info('[stillwater] quality -> reduced');
      } else if (state.quality === 1) {
        state.quality = 0;
        bloom.enabled = false;
        renderer.shadowMap.autoUpdate = false;
        console.info('[stillwater] quality -> minimal');
      }
    }
  }

  return { renderer, scene, camera, composer, bloom, adapt };
}

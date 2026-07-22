import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const hdrLoader = new RGBELoader();

const modelCache = new Map();
const texCache = new Map();

let onProgress = null;
let total = 0;
let done = 0;
export function setProgressHandler(fn) {
  onProgress = fn;
}
export function expect(n) {
  total += n;
}
function tick() {
  done++;
  onProgress?.(done, total);
}

export function loadModel(id) {
  if (!modelCache.has(id)) {
    total++;
    modelCache.set(
      id,
      gltfLoader
        .loadAsync(`/assets/models-opt/${id}.glb`)
        .then((g) => {
          g.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              const m = o.material;
              if (m) {
                m.envMapIntensity = 0.55;
                // alpha-tested foliage renders better with these settings
                if (m.transparent || m.alphaTest > 0) {
                  m.transparent = false;
                  m.alphaTest = Math.max(m.alphaTest, 0.35);
                  m.depthWrite = true;
                }
              }
            }
          });
          tick();
          return g.scene;
        })
        .catch((err) => {
          console.error('model failed:', id, err);
          tick();
          return new THREE.Group();
        }),
    );
  }
  return modelCache.get(id).then((scene) => scene.clone(true));
}

// Poly Haven texture set -> MeshStandardMaterial.
// Textures are cached by URL but cloned per material so that repeat/offset
// settings never leak between materials sharing the same set.
export function pbrMaterial(id, res, { repeat = 1, roughness = 1, color = 0xffffff, normalScale = 1, ao = true } = {}) {
  const base = `/assets/textures/${id}/${id}`;
  const suffix = `_${res}.jpg`;
  const load = (kind, srgb) => {
    const key = base + kind + suffix;
    if (!texCache.has(key)) {
      total++;
      const t = texLoader.load(key, tick);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      texCache.set(key, t);
    }
    const c = texCache.get(key).clone();
    c.channel = 0;
    return c;
  };
  const mat = new THREE.MeshStandardMaterial({
    map: load('_diff', true),
    normalMap: load('_nor_gl'),
    roughnessMap: load('_rough'),
    roughness,
    color,
  });
  mat.normalScale.setScalar(normalScale);
  if (ao) {
    mat.aoMap = load('_ao');
    mat.aoMapIntensity = 1;
  }
  const setRepeat = (t) => t && t.repeat.set(repeat, repeat);
  [mat.map, mat.normalMap, mat.roughnessMap, mat.aoMap].forEach(setRepeat);
  return mat;
}

export function loadHDRI(file) {
  total++;
  return new Promise((resolve, reject) => {
    hdrLoader.load(
      `/assets/env/${file}`,
      (t) => {
        t.mapping = THREE.EquirectangularReflectionMapping;
        tick();
        resolve(t);
      },
      undefined,
      reject,
    );
  });
}

// Clone helper that also clones materials once so per-instance material
// tweaks (envMapIntensity, color) do not leak between clones.
export function place(scene, { p = [0, 0, 0], r = [0, 0, 0], s = 1, shadow = true } = {}) {
  const o = scene.clone(true);
  o.position.set(...p);
  o.rotation.set(...r);
  o.scale.setScalar(s);
  o.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = shadow;
      m.receiveShadow = true;
    }
  });
  return o;
}

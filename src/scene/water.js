import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { state } from '../state.js';

// Procedural animated micro-normals injected into MeshStandardMaterial —
// no texture, so no tiling, no block artifacts, infinite clean water.
const NOISE_GLSL = /* glsl */ `
  float whash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float wnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(whash(i), whash(i + vec2(1.0, 0.0)), u.x),
      mix(whash(i + vec2(0.0, 1.0)), whash(i + vec2(1.0, 1.0)), u.x),
      u.y);
  }
  float wfbm(vec2 p) {
    float v = 0.0, a = 0.6;
    for (int o = 0; o < 2; o++) {
      v += wnoise(p) * a;
      p = p * 2.13 + 17.7;
      a *= 0.5;
    }
    return v;
  }
`;

function makeWaterMaterial({ color, roughness, metalness, envMapIntensity, rippleScale, rippleAmp, uniforms, transparent = false, opacity = 1, depthWrite = true }) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness, metalness, envMapIntensity, transparent, opacity, depthWrite,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWp;\nuniform float uTime;\n${NOISE_GLSL}`)
      .replace('#include <normal_fragment_maps>', /* glsl */ `
        {
          vec2 p = vWp.xz * ${rippleScale.toFixed(3)};
          vec2 t1 = vec2(uTime * 0.045, uTime * 0.028);
          vec2 t2 = vec2(-uTime * 0.031, uTime * 0.052);
          float e = 0.35;
          float n0 = wfbm(p + t1) + 0.5 * wfbm(p * 2.7 + t2);
          float nx = wfbm(p + vec2(e, 0.0) + t1) + 0.5 * wfbm((p + vec2(e, 0.0)) * 2.7 + t2);
          float nz = wfbm(p + vec2(0.0, e) + t1) + 0.5 * wfbm((p + vec2(0.0, e)) * 2.7 + t2);
          vec3 pertW = vec3(-(nx - n0) / e, 0.0, -(nz - n0) / e);
          vec3 pertV = normalize((viewMatrix * vec4(pertW, 0.0)).xyz);
          normal = normalize(normal + pertV * ${rippleAmp.toFixed(3)});
        }
      `);
  };
  return mat;
}

export function createWater(scene) {
  const uniforms = { uTime: { value: 0 } };

  // ---- the lake ------------------------------------------------------------
  const lakeMat = makeWaterMaterial({
    color: new THREE.Color(0x16242a),
    metalness: 0.85,
    roughness: 0.07,
    envMapIntensity: 0.9,
    rippleScale: 0.85,
    rippleAmp: 0.035,
    uniforms,
  });
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), lakeMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(0, 0, -300);
  lake.receiveShadow = true;
  scene.add(lake);

  // ---- the reflecting pool on the terrace ----------------------------------
  const pool = new Reflector(new THREE.PlaneGeometry(11, 3.6), {
    textureWidth: 512,
    textureHeight: 512,
    color: 0x101a1c,
    clipBias: 0.003,
  });
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(6, 13.0, 100.5);
  scene.add(pool);
  // the mirror re-renders the scene; every second frame is fluid to the eye
  // (the animated veil sits on top anyway) and halves its cost
  {
    const renderMirror = pool.onBeforeRender.bind(pool);
    let parity = 0;
    pool.onBeforeRender = (renderer, scn, camera) => {
      if ((parity++ & 1) === 0) renderMirror(renderer, scn, camera);
    };
  }
  // dark slate tint with live ripples over the mirror
  const poolVeil = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 3.6),
    makeWaterMaterial({
      color: 0x0a1416,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      metalness: 0.5,
      roughness: 0.3,
      envMapIntensity: 0.2,
      rippleScale: 2.2,
      rippleAmp: 0.08,
      uniforms,
    }),
  );
  poolVeil.rotation.x = -Math.PI / 2;
  poolVeil.position.set(6, 13.015, 100.5);
  scene.add(poolVeil);

  const duskColor = new THREE.Color(0x16242a);
  const nightColor = new THREE.Color(0x060c11);

  function update(t) {
    uniforms.uTime.value = t;
    lakeMat.color.copy(duskColor).lerp(nightColor, state.night);
    lakeMat.envMapIntensity = THREE.MathUtils.lerp(0.9, 0.35, state.night);
    lakeMat.roughness = THREE.MathUtils.lerp(0.07, 0.1, state.night);
  }

  return { lake, pool, update };
}

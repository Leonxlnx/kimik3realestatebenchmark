import * as THREE from 'three';
import { loadHDRI } from '../loaders.js';
import { state } from '../state.js';

// Environment: two Poly Haven HDRIs (dusk + night over the same lake),
// blended on a sky dome; PMREM dusk for image-based lighting.
export async function createEnvironment(scene, renderer) {
  const [dusk, night] = await Promise.all([
    loadHDRI('qwantani_dusk_2_2k.hdr'),
    loadHDRI('qwantani_night_2k.hdr'),
  ]);

  // Sky dome that can crossfade dusk -> night.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      texA: { value: dusk },
      texB: { value: night },
      mixF: { value: 0 },
      exposure: { value: 1.0 },
      tintB: { value: new THREE.Color(0.42, 0.52, 0.78) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w; // pin to far plane
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform sampler2D texA;
      uniform sampler2D texB;
      uniform float mixF;
      uniform float exposure;
      uniform vec3 tintB;
      void main() {
        vec3 d = normalize(vDir);
        float PI = 3.14159265;
        vec2 uv = vec2(atan(d.z, d.x) / (2.0 * PI) + 0.5, 1.0 - acos(clamp(d.y, -1.0, 1.0)) / PI);
        vec3 a = texture2D(texA, uv).rgb;
        vec3 b = texture2D(texB, uv).rgb * tintB;
        // output linear HDR — OutputPass owns tonemapping + sRGB
        gl_FragColor = vec4(mix(a, b, mixF) * exposure, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  // Image-based lighting from the dusk HDRI.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(dusk);
  scene.environment = envRT.texture;
  pmrem.dispose();

  // Atmosphere.
  const fogDusk = new THREE.Color(0x27333a);
  const fogNight = new THREE.Color(0x060a10);
  scene.fog = new THREE.FogExp2(fogDusk.clone(), 0.0021);

  // Low dusk sun from across the lake (south-west).
  const sun = new THREE.DirectionalLight(0xffb37a, 3.4);
  sun.position.set(-140, 42, -60);
  sun.target.position.set(0, 13, 118);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 420;
  const S = 90;
  sun.shadow.camera.left = -S;
  sun.shadow.camera.right = S;
  sun.shadow.camera.top = S;
  sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.35;
  scene.add(sun, sun.target);

  // Cool sky fill.
  const hemi = new THREE.HemisphereLight(0x8898a8, 0x2c2a24, 0.5);
  scene.add(hemi);

  // Warm interior spill, ramps up toward night.
  const interiorGlow = new THREE.PointLight(0xffc98a, 0.0, 60, 1.8);
  interiorGlow.position.set(0, 14.5, 119);
  scene.add(interiorGlow);

  const interiorGlow2 = new THREE.PointLight(0xffb877, 0.0, 40, 1.8);
  interiorGlow2.position.set(-9, 14.3, 121);
  scene.add(interiorGlow2);

  // Procedural star field — fades in as night falls (the night HDRI is cloudy).
  const starGeo = new THREE.BufferGeometry();
  {
    const n = 1400, pos = new Float32Array(n * 3);
    let i = 0;
    while (i < n) {
      const v = new THREE.Vector3().randomDirection();
      if (v.y < 0.06) continue;
      v.multiplyScalar(850);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      i++;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xdfe8ff, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  }));
  stars.frustumCulled = false;
  scene.add(stars);

  function update() {
    const n = state.night;
    skyMat.uniforms.mixF.value = n;
    skyMat.uniforms.exposure.value = THREE.MathUtils.lerp(0.45, 0.14, n);
    stars.material.opacity = THREE.MathUtils.smoothstep(n, 0.5, 0.95) * 0.9;
    scene.fog.color.copy(fogDusk).lerp(fogNight, n);
    scene.fog.density = THREE.MathUtils.lerp(0.0021, 0.0014, n);
    sun.intensity = THREE.MathUtils.lerp(2.9, 0.06, n);
    hemi.intensity = THREE.MathUtils.lerp(0.5, 0.12, n);
    interiorGlow.intensity = THREE.MathUtils.lerp(9, 260, THREE.MathUtils.smoothstep(n, 0.15, 0.9));
    interiorGlow2.intensity = THREE.MathUtils.lerp(4, 90, THREE.MathUtils.smoothstep(n, 0.2, 0.9));
  }

  return { sky, sun, hemi, update, duskTex: dusk };
}

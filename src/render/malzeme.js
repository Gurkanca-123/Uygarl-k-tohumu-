// Paylaşılan malzeme kiti + gölgelendirici yamaları (onBeforeCompile). Ortak uniform'lar: zaman (animasyon), kar (kış tozu).
import * as THREE from 'three';
import { binaAtlasi, ATLAS_HUCRE } from './dokular.js';

export const ORTAK = {
  uZaman: { value: 0 },
  uKar: { value: 0 },        // 0..1: yukarı bakan yüzeylerde kar tozu
  uKarRenk: { value: new THREE.Color(0xf4f8ff) },
  uRuzgar: { value: 1 },     // rüzgâr şiddeti (mevsime göre)
};

// Dünya normali (kar için) + isteğe bağlı rüzgâr / dalga / atlas / yan toprak rengi.
// sec: { kar: 0..1 katsayı, ruzgar: bool (aSallan özniteliği), dalga: bool, atlas: bool (aHucre), yan: THREE.Color|null, yanK }
export function yamala(mat, sec = {}) {
  const anahtar = JSON.stringify({ k: sec.kar ?? 1, r: !!sec.ruzgar, d: !!sec.dalga, a: !!sec.atlas, y: !!sec.yan });
  mat.customProgramCacheKey = () => anahtar;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, ORTAK);
    if (sec.yan) { sh.uniforms.uYanRenk = { value: sec.yan }; sh.uniforms.uYanK = { value: sec.yanK ?? 0.6 }; }
    let v = sh.vertexShader, f = sh.fragmentShader;
    const ust = `
uniform float uZaman; uniform float uRuzgar;
varying vec3 vDN; varying vec3 vDP;
${sec.atlas ? 'attribute vec2 aHucre; varying vec2 vHucre;' : ''}
${sec.ruzgar ? 'attribute float aSallan;' : ''}
`;
    v = ust + v;
    v = v.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
  vec3 dnx = objectNormal;
  #ifdef USE_INSTANCING
    dnx = mat3(instanceMatrix) * dnx;
  #endif
  vDN = normalize(mat3(modelMatrix) * dnx);`);
    let govde = '';
    if (sec.ruzgar) {
      govde += `
  {
    vec3 kok = vec3(0.0);
    #ifdef USE_INSTANCING
      kok = instanceMatrix[3].xyz;
    #endif
    kok = (modelMatrix * vec4(kok, 1.0)).xyz;
    float faz = kok.x * 0.7 + kok.z * 0.9;
    float s = aSallan * aSallan * uRuzgar;
    transformed.x += (sin(uZaman * 1.7 + faz) * 0.05 + sin(uZaman * 3.1 + faz * 1.3) * 0.015) * s;
    transformed.z += (cos(uZaman * 1.3 + faz) * 0.035) * s;
  }`;
    }
    if (sec.dalga) {
      govde += `
  {
    vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
    #ifdef USE_INSTANCING
      wp = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
    #endif
    if (position.y > 0.0) transformed.y += (sin(wp.x * 2.3 + uZaman * 1.6) + sin(wp.z * 1.9 - uZaman * 1.2)) * 0.012;
  }`;
    }
    v = v.replace('#include <begin_vertex>', `#include <begin_vertex>${govde}`);
    v = v.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  {
    vec4 dp = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      dp = instanceMatrix * dp;
    #endif
    vDP = (modelMatrix * dp).xyz;
  }
  ${sec.atlas ? 'vHucre = aHucre;' : ''}`);

    f = `
uniform float uZaman; uniform float uKar; uniform vec3 uKarRenk;
varying vec3 vDN; varying vec3 vDP;
${sec.atlas ? 'varying vec2 vHucre;' : ''}
${sec.yan ? 'uniform vec3 uYanRenk; uniform float uYanK;' : ''}
` + f;
    if (sec.atlas) {
      const B = (1 / ATLAS_HUCRE).toFixed(5), P = (1 / ATLAS_HUCRE / 64).toFixed(6);
      f = f.replace('#include <map_fragment>', `
  {
    vec2 yu = vMapUv;
    vec2 au = vHucre + vec2(${P}) + fract(yu) * (${B} - 2.0 * ${P});
    vec4 sampledDiffuseColor = textureGrad(map, au, dFdx(yu) * ${B}, dFdy(yu) * ${B});
    diffuseColor *= sampledDiffuseColor;
  }`);
    }
    let renk = '';
    if (sec.yan) renk += `
  diffuseColor.rgb = mix(diffuseColor.rgb, uYanRenk * (0.75 + 0.25 * fract(sin(dot(floor(vDP.xz * 8.0 + vDP.y * 11.0), vec2(12.9898, 78.233))) * 43758.5453)), (1.0 - smoothstep(0.35, 0.6, vDN.y)) * uYanK);`;
    if (sec.dalga) renk += `
  {
    float w = sin(vDP.x * 3.1 + uZaman * 1.1) * sin(vDP.z * 2.7 - uZaman * 0.9) + 0.5 * sin((vDP.x + vDP.z) * 5.3 + uZaman * 2.0);
    diffuseColor.rgb += vec3(0.10, 0.14, 0.14) * smoothstep(0.75, 1.3, w) * step(0.5, vDN.y);
  }`;
    const karK = (sec.kar ?? 1).toFixed(3);
    renk += `
  diffuseColor.rgb = mix(diffuseColor.rgb, uKarRenk, uKar * ${karK} * smoothstep(0.5, 0.85, vDN.y));`;
    f = f.replace('#include <color_fragment>', `#include <color_fragment>${renk}`);
    sh.vertexShader = v;
    sh.fragmentShader = f;
  };
  return mat;
}

// ---------- bina malzemeleri ----------
const onbellek = new Map();
function al(anahtar, yap) { let m = onbellek.get(anahtar); if (!m) { m = yap(); onbellek.set(anahtar, m); } return m; }

export const binaMat = () => al('bina', () => yamala(new THREE.MeshLambertMaterial({ map: binaAtlasi(), vertexColors: true }), { atlas: true }));
// ışıltı: ateş, pencere, kor (ışıktan bağımsız, ton eşlemesiz parlak)
export const isilMat = () => al('isil', () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
// hayalet (yerleştirme önizlemesi): gerçek doku, yarı saydam, renk tonlu
export const hayaletMat = (renk) => al(`hay${renk}`, () => {
  const m = yamala(new THREE.MeshLambertMaterial({
    map: binaAtlasi(), vertexColors: true, transparent: true, opacity: 0.62, emissive: new THREE.Color(renk).multiplyScalar(0.35),
  }), { atlas: true, kar: 0 });
  return m;
});
// inşaat taslağı: tamamlanmamış kısım (soluk, yarı saydam)
export const taslakMat = () => al('taslak', () => yamala(new THREE.MeshLambertMaterial({
  map: binaAtlasi(), vertexColors: true, transparent: true, opacity: 0.28, depthWrite: false, color: 0xdfe8ff,
  polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
}), { atlas: true, kar: 0 }));
export const cizgiMat = (renk) => al(`cz${renk}`, () => new THREE.LineBasicMaterial({ color: renk, transparent: true, opacity: 0.9, depthTest: false }));

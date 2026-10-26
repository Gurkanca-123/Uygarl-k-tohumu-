// Stil D — "konsept diyorama" (`?stil=d`, deneme). Yalnız GÖRSEL katman: oyun mantığı, karo türleri ve koordinatlar aynı.
// Kutu karoların yerine sürekli yükseklik alanı (dağ = basamaklı falez, su = çukur + kumsal, karo birleşimi gürültüyle
// gizli), derinliğe göre renklenen su (turkuaz sığ, köpük kıyı, parıltı), yoğun bitki örtüsü (ağaç/çalı/ot/çiçek/kaya),
// otlayan inek/koyun, iskele + tekne, binalar arası toprak patikalar. Hepsi prosedürel; bölge başına InstancedMesh
// (16×16 karo öbekleri, görüş dışı öbek çizilmez). Seçim: hucreBul yükseklik alanına ışın yürüterek bulur
// (inşa edilebilir karolar 0,30'da düz kalır → yerleştirme birebir aynı).
import * as THREE from 'three';
import { BINALAR } from '../data/binalar.js';
import { gorunurKaro } from '../world/kesif.js';
import { izgara } from '../world/izgara.js';
import { merkezNokta } from '../world/harita.js';
import { MEVSIM_STIL } from './harita.js';
import { ORTAK, yamala } from './malzeme.js';

export { hash, gurultu, fbm, ss, birlestir, bozuk, top, govde, yesil, GURULTU_GLSL, ZEMIN, SU_Y, OBEK, YUK_MIN, YUK_ARALIK };
const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const ZEMIN = 0.30, SU_Y = 0.17, OBEK = 20, YUK_MIN = -0.3, YUK_ARALIK = 2.2;
const KORU = new Set(['sis', 'yolCikartma']); // harita katmanından görünür kalanlar

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function gurultu(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fbm = (x, y, s = 0) => gurultu(x, y, s) * 0.55 + gurultu(x * 2.13, y * 2.13, s + 1) * 0.3 + gurultu(x * 4.37, y * 4.37, s + 2) * 0.15;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const yesil = (v, a = 0.12) => [1 - a + v * a * 2, 1 - a * 0.5 + (1 - v) * a, 1 - a + v * a * 1.4];
const sinif = (t) => (t === 'su' ? 'su' : t === 'dag' ? 'dag' : t === 'tasli' || t === 'kayalik' ? 'kaya' : t === 'sis' ? 'sis' : 'kara');

// ---------- ortak GLSL ----------
const GURULTU_GLSL = `
float dHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float dGur(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(dHash(i), dHash(i + vec2(1, 0)), f.x), mix(dHash(i + vec2(0, 1)), dHash(i + vec2(1, 1)), f.x), f.y);
}`;

// ---------- geometri yardımcıları ----------
// parcalar: [{ geo, renk, bas?, gradyan? [alt, üst], kure? (merkez → küresel normal) }] → position/normal/color/aSallan/aBas
function birlestir(parcalar, sallanBoy = 1.1) {
  const pos = [], nor = [], col = [], sal = [], bas = [];
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (const p of parcalar) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    g.computeVertexNormals();
    const P = g.getAttribute('position'), N = g.getAttribute('normal');
    g.computeBoundingBox();
    const bb = g.boundingBox;
    c.setHex(p.renk);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      pos.push(x, y, z);
      if (p.kure) { v.set(x - p.kure[0], y - p.kure[1], z - p.kure[2]).normalize(); v.y = v.y * 0.8 + 0.2; v.normalize(); nor.push(v.x, v.y, v.z); }
      else nor.push(N.getX(i), N.getY(i), N.getZ(i));
      const k = p.gradyan ? p.gradyan[0] + (p.gradyan[1] - p.gradyan[0]) * ss(bb.min.y, bb.max.y, y) : 1;
      col.push(c.r * k, c.g * k, c.b * k);
      sal.push(Math.max(0, y) / sallanBoy);
      bas.push(p.bas ? 1 : 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSallan', new THREE.Float32BufferAttribute(sal, 1));
  g.setAttribute('aBas', new THREE.Float32BufferAttribute(bas, 1));
  return g;
}
function bozuk(geo, miktar, tohum) {
  const p = geo.getAttribute('position'), m = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let d = m.get(k);
    if (!d) { d = [(hash(i, 1, tohum) - 0.5) * miktar, (hash(i, 2, tohum) - 0.5) * miktar, (hash(i, 3, tohum) - 0.5) * miktar]; m.set(k, d); }
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  return geo;
}
const top = (r, x, y, z, t, det = 0) => bozuk(new THREE.IcosahedronGeometry(r, det), r * 0.28, t).translate(x, y, z);
const govde = (r0, r1, h) => new THREE.CylinderGeometry(r0, r1, h, 4, 1, true).translate(0, h / 2, 0);

export function agacGeolari() {
  const yaprak = birlestir([
    { geo: govde(0.03, 0.05, 0.36), renk: 0x6b4a2e, gradyan: [0.7, 1] },
    { geo: top(0.25, 0, 0.5, 0, 1), renk: 0xffffff, gradyan: [0.62, 1.12], kure: [0, 0.5, 0] },
    { geo: top(0.18, 0.15, 0.42, 0.07, 2), renk: 0xf0f4ea, gradyan: [0.6, 1.08], kure: [0.15, 0.42, 0.07] },
    { geo: top(0.18, -0.06, 0.66, -0.02, 4), renk: 0xffffff, gradyan: [0.72, 1.2], kure: [-0.06, 0.66, -0.02] },
  ]);
  const ig = [];
  ig.push({ geo: govde(0.03, 0.045, 0.25), renk: 0x5e4028, gradyan: [0.7, 1] });
  for (let k = 0; k < 3; k++) {
    const r = 0.3 - k * 0.075, h = 0.38 - k * 0.04, y = 0.14 + k * 0.21;
    ig.push({ geo: bozuk(new THREE.ConeGeometry(r, h, 7, 1, true), 0.03, 10 + k).translate(0, y + h / 2, 0), renk: 0xffffff, gradyan: [0.55, 1.1 + k * 0.04] });
  }
  const igne = birlestir(ig);
  const kavak = birlestir([
    { geo: govde(0.025, 0.035, 0.2), renk: 0x6b4a2e },
    { geo: top(0.15, 0, 0.42, 0, 5).scale(1, 2.0, 1), renk: 0xffffff, gradyan: [0.6, 1.15], kure: [0, 0.84, 0] },
    { geo: top(0.11, 0.02, 0.92, 0, 6).scale(1, 1.4, 1), renk: 0xffffff, gradyan: [0.8, 1.2], kure: [0, 1.29, 0] },
  ]);
  const cali = birlestir([
    { geo: top(0.11, 0, 0.07, 0, 7), renk: 0xffffff, gradyan: [0.55, 1.1], kure: [0, 0.07, 0] },
    { geo: top(0.085, 0.08, 0.05, 0.04, 8), renk: 0xeef4e8, gradyan: [0.55, 1.05], kure: [0.08, 0.05, 0.04] },
  ], 0.4);
  // ot: 3 çapraz yaprak (çift yüzlü), 6 üçgen
  const otP = [];
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1, g = new THREE.BufferGeometry();
    const c = Math.cos(a), s = Math.sin(a), e = 0.035, hh = 0.11 + k * 0.025, eg = 0.03 * (k - 1);
    g.setAttribute('position', new THREE.Float32BufferAttribute([-e * c, 0, -e * s, e * c, 0, e * s, eg, hh, eg * 0.5], 3));
    otP.push({ geo: g, renk: k === 1 ? 0xe8f0d8 : 0xffffff, gradyan: [0.85, 1.3] });
  }
  const ot = birlestir(otP, 0.12);
  // dağ kayası: basamaklı, üst üste bozuk bloklar
  const kule = birlestir([
    { geo: bozuk(new THREE.DodecahedronGeometry(0.36, 0), 0.08, 31).scale(1.3, 0.6, 1.15).translate(0, 0.08, 0), renk: 0xb0a898, gradyan: [0.7, 1.0] },
    { geo: bozuk(new THREE.DodecahedronGeometry(0.27, 0), 0.07, 32).scale(1.1, 0.8, 0.95).translate(0.06, 0.32, -0.04), renk: 0xbcb3a2, gradyan: [0.75, 1.05] },
    { geo: bozuk(new THREE.DodecahedronGeometry(0.17, 0), 0.05, 33).scale(1, 0.9, 1).translate(-0.02, 0.54, 0.02), renk: 0xc8bfae, gradyan: [0.8, 1.1] },
    { geo: top(0.1, 0.12, 0.62, 0.05, 34), renk: 0x6f9a3c, gradyan: [0.7, 1.1] },
  ]);
  return { yaprak, igne, kavak, cali, ot, kule };
}

function hayvanGeolari() {
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const bacak = (renk) => [[-0.05, -0.022], [-0.05, 0.022], [0.05, -0.022], [0.05, 0.022]].map(([x, z]) => ({ geo: B(0.018, 0.06, 0.018, x, 0.03, z), renk }));
  const inek = birlestir([
    { geo: B(0.17, 0.08, 0.075, 0, 0.095, 0), renk: 0x8a5232 },
    { geo: B(0.06, 0.03, 0.078, -0.02, 0.112, 0), renk: 0xf2ece2 },   // alaca leke
    { geo: B(0.065, 0.055, 0.05, 0.11, 0.115, 0), renk: 0x7a4a2c, bas: true },
    { geo: B(0.025, 0.025, 0.045, 0.145, 0.105, 0), renk: 0xe8c8b0, bas: true },
    { geo: B(0.012, 0.012, 0.08, 0.1, 0.148, 0), renk: 0xe8e0d0, bas: true },
    ...bacak(0x4a3020),
  ]);
  const koyun = birlestir([
    { geo: bozuk(new THREE.IcosahedronGeometry(0.06, 1), 0.012, 3).scale(1.35, 0.95, 1).translate(0, 0.09, 0), renk: 0xf6f2e8, kure: [0, 0.09, 0] },
    { geo: B(0.045, 0.045, 0.038, 0.085, 0.1, 0), renk: 0x3a302c, bas: true },
    ...bacak(0x3a302c).map((p) => ({ ...p, geo: p.geo.scale(0.8, 0.85, 0.8) })),
  ]);
  return { inek, koyun };
}

function tekneGeo() {
  const govdeG = new THREE.BoxGeometry(0.34, 0.07, 0.13, 4, 1, 1);
  const p = govdeG.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const uc = 1 - Math.pow(Math.abs(x) / 0.17, 2.2) * 0.85, alt = y < 0 ? 0.55 : 1;
    p.setXYZ(i, x, y + (Math.abs(x) > 0.12 && y > 0 ? 0.02 : 0), z * uc * alt);
  }
  return birlestir([
    { geo: govdeG.translate(0, 0.035, 0), renk: 0x7a4c2a, gradyan: [0.6, 1] },
    { geo: new THREE.BoxGeometry(0.27, 0.012, 0.09).translate(0, 0.064, 0), renk: 0xb08050 },
    { geo: new THREE.CylinderGeometry(0.006, 0.008, 0.32, 5).translate(0.02, 0.22, 0), renk: 0x5a3a22 },
    { geo: new THREE.PlaneGeometry(0.16, 0.2).rotateY(Math.PI / 2).translate(0.025, 0.24, 0), renk: 0xf0e6d0 },
    { geo: new THREE.PlaneGeometry(0.06, 0.03).rotateY(Math.PI / 2).translate(0.025, 0.39, 0.03), renk: 0xc0402e },
  ]);
}

function iskeleGeo() {
  const parca = [];
  for (let i = 0; i < 8; i++) parca.push({ geo: new THREE.BoxGeometry(0.11, 0.025, 0.26).translate(-0.4 + i * 0.115, 0, (hash(i, 3) - 0.5) * 0.02), renk: i % 3 ? 0x9a6a3e : 0x86592f });
  for (const x of [-0.3, 0.05, 0.4]) for (const z of [-0.12, 0.12]) parca.push({ geo: new THREE.CylinderGeometry(0.018, 0.02, 0.36, 5).translate(x, -0.15, z), renk: 0x5a3c22 });
  parca.push({ geo: new THREE.BoxGeometry(0.85, 0.02, 0.02).translate(0, 0.09, 0.12), renk: 0x6a4626 });
  parca.push({ geo: new THREE.CylinderGeometry(0.035, 0.035, 0.07, 8).translate(0.3, 0.045, -0.06), renk: 0x8a5a30 });
  parca.push({ geo: new THREE.BoxGeometry(0.07, 0.06, 0.06).translate(0.2, 0.04, -0.07), renk: 0xa07848 });
  return birlestir(parca);
}

// ---------- malzemeler ----------
const ARAZI_D = `  {
    vec2 p = vDP.xz;
    float n1 = dGur(p * 1.7) * 0.6 + dGur(p * 4.3) * 0.4;
    vec2 rp = mat2(0.8, -0.6, 0.6, 0.8) * p;
    float firca = dGur(rp * vec2(2.6, 19.0));
    float ince = dGur(p * 27.0);
    float cim = vYuzey.y, kaya = vYuzey.x;
    vec3 c = diffuseColor.rgb;
    c *= 0.86 + 0.26 * n1 + 0.12 * (firca - 0.5) + 0.12 * (ince - 0.5) * cim;
    c = mix(c, c * vec3(1.12, 1.08, 0.74), smoothstep(0.55, 0.85, n1) * 0.5 * cim);
    float bant = dGur(vec2((vDP.x - vDP.z) * 1.1, vDP.y * 15.0));
    float catlak = 1.0 - smoothstep(0.0, 0.07, abs(dGur(vec2((vDP.x + vDP.z) * 4.0, vDP.y * 6.0)) - 0.5));
    float dik = 1.0 - smoothstep(0.55, 0.9, vDN.y);
    c = mix(c, c * (0.74 + 0.45 * bant) * (1.0 - 0.4 * catlak), kaya * max(dik, 0.3));
    diffuseColor.rgb = c;
  }`;

export function araziMat(govdeGlsl = ARAZI_D, ad = 'd-arazi') {
  const m = yamala(new THREE.MeshLambertMaterial({ vertexColors: true }), { kar: 0.85 });
  const once = m.onBeforeCompile;
  m.customProgramCacheKey = () => ad;
  m.onBeforeCompile = (sh) => {
    once(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aYuzey; varying vec2 vYuzey;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vYuzey = aYuzey;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vYuzey;${GURULTU_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
${govdeGlsl}`);
  };
  return m;
}

const SU_D = `  {
    vec2 uv = (vSuP.xz - uYukMin) / uYukBoy;
    float hz = texture2D(uYuk, uv).r * ${YUK_ARALIK.toFixed(2)} + ${YUK_MIN.toFixed(2)};
    float der = ${SU_Y.toFixed(3)} - hz;
    float t = uZaman;
    float r1 = dGur(vSuP.xz * 2.6 + vec2(t * 0.22, t * 0.15)), r2 = dGur(vSuP.xz * 5.1 - vec2(t * 0.18, -t * 0.25));
    float dal = r1 * 0.6 + r2 * 0.4;
    vec3 c = mix(uSig, uOrta, smoothstep(0.0, 0.13, der + (dal - 0.5) * 0.03));
    c = mix(c, uDerin, smoothstep(0.13, 0.42, der));
    c *= 0.88 + 0.24 * dal;
    float kop = 1.0 - smoothstep(0.0, 0.03 + 0.025 * dal, der);
    float serit = smoothstep(0.7, 0.95, sin(der * 75.0 - t * 1.7 + dal * 5.0)) * (1.0 - smoothstep(0.02, 0.1, der));
    c = mix(c, uKopuk, clamp(max(kop, serit * 0.55), 0.0, 1.0));
    c = mix(c, vec3(0.82, 0.9, 0.96), uKar * 0.5);
    diffuseColor.rgb = c;
    float pr = dGur(vSuP.xz * 8.0 + vec2(t * 0.5, -t * 0.35)) * dGur(vSuP.xz * 12.0 - vec2(t * 0.4, t * 0.3));
    totalEmissiveRadiance += vec3(1.0, 0.92, 0.75) * smoothstep(0.62, 0.8, pr) * 0.5 + c * 0.1;
  }`;

export function suMat(yukDoku, govdeGlsl = SU_D, ad = 'd-su') {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const u = {
    uYuk: { value: yukDoku }, uYukMin: { value: new THREE.Vector2() }, uYukBoy: { value: new THREE.Vector2(1, 1) },
    uSig: { value: new THREE.Color(0x46d6c6) }, uOrta: { value: new THREE.Color(0x2b9ed8) }, uDerin: { value: new THREE.Color(0x1d5ea8) },
    uKopuk: { value: new THREE.Color(0xf4fbff) }, uZaman: ORTAK.uZaman, uKar: ORTAK.uKar,
  };
  m.userData.u = u;
  m.customProgramCacheKey = () => ad;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSuP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vSuP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vSuP;
uniform sampler2D uYuk; uniform vec2 uYukMin; uniform vec2 uYukBoy; uniform float uZaman; uniform float uKar;
uniform vec3 uSig; uniform vec3 uOrta; uniform vec3 uDerin; uniform vec3 uKopuk;${GURULTU_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
${govdeGlsl}`);
  };
  return m;
}

// otlayan hayvan: baş eğilip kalkar, gövde yavaşça döner; tekne: hafif yalpa
export function canliMat(tur) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: tur === 'tekne' ? THREE.DoubleSide : THREE.FrontSide });
  m.customProgramCacheKey = () => `d-${tur}`;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uZaman = ORTAK.uZaman;
    const kod = tur === 'tekne' ? `
    float faz = kok.x * 1.3 + kok.z * 2.1;
    float yal = sin(uZaman * 1.4 + faz) * 0.08;
    transformed.y = transformed.y * cos(yal) + transformed.z * sin(yal) + sin(uZaman * 1.1 + faz) * 0.008;` : `
    float faz = kok.x * 3.1 + kok.z * 1.7;
    float otla = smoothstep(0.25, 0.75, sin(uZaman * 0.55 + faz) * 0.5 + 0.5);
    transformed.y -= aBas * otla * 0.045;
    transformed.x += aBas * otla * 0.012;
    float yon = sin(uZaman * 0.13 + faz) * 0.5;
    transformed.xz = mat2(cos(yon), -sin(yon), sin(yon), cos(yon)) * transformed.xz;`;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uZaman; attribute float aBas;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  {
    vec3 kok = vec3(0.0);
    #ifdef USE_INSTANCING
      kok = instanceMatrix[3].xyz;
    #endif
    ${kod}
  }`);
  };
  return m;
}

// Kenar (rim) ışığı: güneşe dönük kenarlarda sıcak fresnel. Ön-derleme ShaderChunk yaması, yalnız ?stil=d.
// bantli = true (stil bd): kenar ışığı yumuşak geçiş yerine net bir şerit (cel).
export function kenarIsigi(bantli = false) {
  const C = THREE.ShaderChunk;
  if (C.lights_fragment_end.includes('dKenar')) return;
  const bant = bantli ? `
    dKenar = smoothstep(0.30, 0.38, dKenar) * 0.75 + smoothstep(0.55, 0.62, dKenar) * 0.5;
    dYan = smoothstep(0.35, 0.45, dYan);` : '';
  C.lights_fragment_end = `#if NUM_DIR_LIGHTS > 0
  {
    float dKenar = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 2.5);
    float dYan = saturate(dot(geometryNormal, directionalLights[0].direction) * 0.7 + 0.3);${bant}
    reflectedLight.directDiffuse += material.diffuseColor * directionalLights[0].color * dKenar * dYan * 0.5;
  }
#endif
` + C.lights_fragment_end;
}

// ---------- katman ----------
export class StilD {
  constructor(sahne) {
    this.s = sahne;
    this.grup = new THREE.Group();
    this.anahtar = null;
    this.mevsimId = null;
    this.mesh = [];
    this.ince = [];   // ot / çiçek: uzak yakınlıkta gizlenir (piksel altı, üçgen tasarrufu)
    this.agac = agacGeolari();
    this.hayvan = hayvanGeolari();
    this.tekne = tekneGeo();
    this.cicekGeo = new THREE.OctahedronGeometry(0.034, 0).translate(0, 0.08, 0);
    this.iskele = iskeleGeo();
    this.araziMat = araziMat();
    const agacMat = () => yamala(new THREE.MeshLambertMaterial({ vertexColors: true }), { ruzgar: true, kar: 0.85 });
    this.agacMat = { yaprak: agacMat(), igne: agacMat(), kavak: agacMat(), cali: agacMat() };
    this.otMat = yamala(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { ruzgar: true, kar: 0.5 });
    this.kuleMat = yamala(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { kar: 0.8 });
    this.hayvanMat = canliMat('hayvan');
    this.tekneMat = canliMat('tekne');
    this.iskeleMat = yamala(new THREE.MeshLambertMaterial({ vertexColors: true }), { kar: 0.7 });
    this.yuk = null;
    this.rc = new THREE.Raycaster();
    sahne.sahne.add(this.grup);
    // seçim: yükseklik alanı üstünde ışın yürüt; alan dışı → eski düzlem kesişimi
    const eski = sahne.hucreBul.bind(sahne);
    sahne.hucreBul = (px, py) => { const h = this.hucreBul(px, py); return h === undefined ? eski(px, py) : h; };
    // altın saat: güneş daha alçak ve yandan → uzun, yumuşak gölgeler
    const kg = sahne.kameraGuncelle.bind(sahne);
    sahne.kameraGuncelle = () => { kg(); sahne.gunes.position.set(sahne.hedef.x - 22, 24, sahne.hedef.z + 3); };
  }

  // her kare (çizimden önce)
  tik() {
    const s = this.s, h = s.harita;
    if (!h || !s.durum) return;
    if (this.mevsimId !== s.mevsimId) { this.mevsimId = s.mevsimId; this.isik(); }
    const anahtar = `${h.anahtar}|${h.mevsim}|${s.anahtarlar.bina}`;
    if (anahtar !== this.anahtar) { this.anahtar = anahtar; this.kur(s.durum); s.renderer.shadowMap.needsUpdate = true; }
    for (const [k, m] of Object.entries(h.mesh)) if (m && !KORU.has(k)) m.visible = false;
    const yakin = s.kamera.zoom > 1.25;
    for (const m of this.ince) m.visible = yakin;
  }

  isik() {
    const s = this.s, ms = MEVSIM_STIL[this.mevsimId] || MEVSIM_STIL.yaz;
    s.gunes.color.setHex(ms.isik).lerp(new THREE.Color(0xffc887), this.mevsimId === 'kis' ? 0.15 : 0.35);
    s.gunes.intensity = ms.siddet * 1.12;
    s.hemi.color.setHex(ms.gok).lerp(new THREE.Color(0xa8ccff), 0.4);
    s.hemi.groundColor.setHex(ms.yer).lerp(new THREE.Color(0x8a6238), 0.4);
    s.hemi.intensity = ms.ortam * 0.92;
    s.arka.color.setHex(0xffd9a8); s.arka.intensity = 0.35;
    const hm = s.harita;
    for (const t of ['igne', 'yaprak', 'kavak']) this.agacMat[t].color.setHex(ms.agac[t]).multiplyScalar(1.08);
    this.agacMat.cali.color.setHex(ms.agac.yaprak).lerp(new THREE.Color(0x6aa83a), 0.3);
    this.otMat.color.copy(hm.otMat?.color || new THREE.Color(0x7ab84a)).lerp(new THREE.Color(0x6aa83a), 0.3);
  }

  temizle() {
    for (const m of this.mesh) { this.grup.remove(m); if (m.isInstancedMesh) m.dispose(); else m.geometry?.dispose(); }
    this.mesh = []; this.ince = [];
    this.suMatNesne?.userData.u.uYuk.value?.dispose();
  }

  // öbeklenmiş InstancedMesh: liste öğesi { x, z, ... }; yap(e) → { x, y, z, ry, s|sx/sy/sz, renk }
  instanced(geo, mat, liste, yap, golge = true, ince = false) {
    const obek = new Map();
    for (const e of liste) {
      const k = `${Math.floor(e.x / (this.obekBoy || OBEK))},${Math.floor(e.z / (this.obekBoy || OBEK))}`;
      if (!obek.has(k)) obek.set(k, []);
      obek.get(k).push(e);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
    for (const parca of obek.values()) {
      const im = new THREE.InstancedMesh(geo, mat, parca.length);
      parca.forEach((e, i) => {
        const r = yap(e);
        q.setFromAxisAngle(Y, r.ry || 0);
        m4.compose(p.set(r.x, r.y, r.z), q, sc.set(r.sx ?? r.s ?? 1, r.sy ?? r.s ?? 1, r.sz ?? r.s ?? 1));
        im.setMatrixAt(i, m4);
        if (r.renk) im.setColorAt(i, c.setRGB(...r.renk));
      });
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = golge; im.receiveShadow = true;
      im.computeBoundingSphere();
      im.boundingSphere.radius += 1.5;
      this.grup.add(im);
      this.mesh.push(im);
      if (ince) this.ince.push(im);
    }
  }

  // yükseklik alanı (bilinear)
  hAt(x, z) {
    const Y = this.yuk;
    if (!Y) return null;
    const fx = (x - Y.x0) * Y.R, fz = (z - Y.z0) * Y.R;
    if (fx < 0 || fz < 0 || fx > Y.G - 1 || fz > Y.H - 1) return null;
    const i = Math.min(Y.G - 2, Math.floor(fx)), j = Math.min(Y.H - 2, Math.floor(fz)), u = fx - i, v = fz - j;
    const a = Y.h[j * Y.G + i], b = Y.h[j * Y.G + i + 1], c = Y.h[(j + 1) * Y.G + i], d = Y.h[(j + 1) * Y.G + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  hucreBul(px, py) {
    if (!this.yuk) return undefined;
    const s = this.s, r = s.canvas.getBoundingClientRect();
    this.rc.setFromCamera(new THREE.Vector2(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1), s.kamera);
    const { origin: o, direction: d } = this.rc.ray;
    if (d.y > -1e-4) return undefined;
    const t0 = (2.4 - o.y) / d.y, t1 = (-0.3 - o.y) / d.y, N = 240;
    const p = new THREE.Vector3();
    let onceki = t0;
    for (let i = 0; i <= N; i++) {
      const t = t0 + (t1 - t0) * (i / N);
      p.copy(o).addScaledVector(d, t);
      const h = this.hAt(p.x, p.z);
      if (h !== null && p.y <= h) {
        let a = onceki, b = t;
        for (let k = 0; k < 8; k++) { const m = (a + b) / 2; p.copy(o).addScaledVector(d, m); const hm = this.hAt(p.x, p.z); if (hm !== null && p.y <= hm) b = m; else a = m; }
        p.copy(o).addScaledVector(d, b);
        const x = Math.floor(p.x), y = Math.floor(p.z);
        return x >= 0 && y >= 0 && x < s.n && y < s.n ? { x, y } : null;
      }
      onceki = t;
    }
    return undefined;
  }

  kur(d) {
    this.temizle();
    const A = this.alanHazirla(d);
    if (!A) { this.yuk = null; return; }
    this.yukseklikAlani(A);
    this.araziKur(A);
    this.suKur(A);
    this.susKur(this.sacilim(A));
  }

  // karo görünürlüğü, alan sınırları, palet, binalar + patikalar
  alanHazirla(d) {
    const n = d.harita.boyut;
    const karo = new Array(n * n);
    let mx = n, my = n, Mx = -1, My = -1;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const t = gorunurKaro(d, x, y) ?? 'sis';
      karo[y * n + x] = t;
      if (t !== 'sis') { mx = Math.min(mx, x); my = Math.min(my, y); Mx = Math.max(Mx, x); My = Math.max(My, y); }
    }
    if (Mx < 0) return null;
    const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? 'sis' : karo[y * n + x]);
    const x0 = Math.max(0, mx - 3), z0 = Math.max(0, my - 3), x1 = Math.min(n, Mx + 4), z1 = Math.min(n, My + 4);
    const R = Math.max(3, Math.min(6, Math.floor(220 / Math.max(x1 - x0, z1 - z0))));
    const G = (x1 - x0) * R + 1, H = (z1 - z0) * R + 1, V = G * H;
    const ms = MEVSIM_STIL[this.s.harita.mevsim] || MEVSIM_STIL.yaz;
    const A = { d, n, karo, at, x0, z0, x1, z1, R, G, H, V, ms, P: this.palet(ms) };
    this.binaBilgi(A);
    return A;
  }

  palet(ms) {
    const ton = new THREE.Color(ms.ton);
    const C = (hex, m = 1) => new THREE.Color(hex).lerp(ton, ms.k * m);
    return {
      cim: C(0x52902f, 0.45), cimA: C(0x8aac42, 0.45), cimK: C(0x377428, 0.45), orman: C(0x30642a, 0.45), verimli: C(0x8c6a3a, 0.3), verimliY: C(0x86a83a),
      kil: C(0xc8784a, 0.2), kum: C(0xe2d2a2, 0.1), kumIslak: C(0xa8946c, 0.1), kaya: C(0x9e9483, 0.3), kayaK: C(0x6e655a, 0.3),
      kayaA: C(0xc4b8a0, 0.2), yosun: C(0x86a046, 0.8), tasli: C(0xaaa290, 0.3), cevher: C(0x8e7c9c, 0.2), mermer: C(0xece8de, 0.1),
      toprak: C(0xa88a60, 0.2), toprakK: C(0x8a7050, 0.2),
    };
  }

  // bina dikdörtgenleri + merkezden her binaya patika (bina değişince yeniden)
  binaBilgi(A) {
    const d = A.d;
    A.iz = izgara(d);
    A.rect = d.binalar.map((b) => { const [g, hh] = BINA[b.id].boyut; return [b.x, b.y, b.x + g, b.y + hh]; });
    A.mz = merkezNokta(d);
    A.merkez = d.binalar.find((b) => BINA[b.id].tur === 'merkez');
    A.yollar = A.merkez ? d.binalar.filter((b) => b !== A.merkez).map((b) => {
      const [g, hh] = BINA[b.id].boyut;
      return [b.x + g / 2, b.y + hh / 2, A.mz.x, A.mz.y];
    }) : [];
  }

  // yükseklik + taban renk (bina toprağı hariç) → A.h, A.col, A.yuz, A.pos, A.kara, A.sSu, A.sDag
  yukseklikAlani(A) {
    const { n, at, x0, z0, R, G, H, V, P } = A;
    // karo merkez rengi (karo içi çeşitlilikle)
    const karoRenk = (x, y) => {
      const t = at(x, y), j = hash(x, y, 71);
      const c = new THREE.Color();
      switch (t) {
        case 'orman': return c.copy(P.orman).lerp(P.cimK, j * 0.6);
        case 'verimli': return c.copy(P.verimli).lerp(P.verimliY, 0.25 + j * 0.3);
        case 'kil': return c.copy(P.kil);
        case 'tasli': return c.copy(P.tasli).lerp(P.cim, 0.35 + j * 0.2);
        case 'kayalik': return c.copy(P.kaya).lerp(P.cim, j * 0.2);
        case 'cevher': return c.copy(P.cevher);
        case 'mermer': return c.copy(P.mermer);
        case 'dag': return c.copy(P.kaya);
        case 'su': return c.copy(P.kumIslak);
        default: return c.copy(P.cim).lerp(j > 0.5 ? P.cimA : P.cimK, Math.abs(j - 0.5) * 0.8);
      }
    };
    const kr = new Map();
    const krAl = (x, y) => { const k = y * n + x; let c = kr.get(k); if (!c) { c = karoRenk(x, y); kr.set(k, c); } return c; };

    const h = new Float32Array(V), sSu = new Float32Array(V), sDag = new Float32Array(V), kara = new Uint8Array(V);
    const col = new Float32Array(V * 3), yuz = new Float32Array(V * 2), pos = new Float32Array(V * 3);
    const rd = (wx, wz, tx, tz) => Math.hypot(Math.max(tx - wx, 0, wx - tx - 1), Math.max(tz - wz, 0, wz - tz - 1));
    for (let j = 0; j < H; j++) for (let i = 0; i < G; i++) {
      const v = j * G + i, wx = x0 + i / R, wz = z0 + j / R;
      const tx = Math.min(n - 1, Math.floor(wx)), tz = Math.min(n - 1, Math.floor(wz));
      const c0 = sinif(at(tx, tz));
      kara[v] = c0 === 'kara' ? 1 : 0;
      // işaretli uzaklık (içeride +, dışarıda −; ±3 karo ile sınırlı)
      let bSu = 3, bDag = 3, bKaya = 3;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const ax = tx + dx, az = tz + dz, c = sinif(at(ax, az));
        const m = rd(wx, wz, ax, az);
        if ((c === 'su') !== (c0 === 'su')) bSu = Math.min(bSu, m);
        if ((c === 'dag') !== (c0 === 'dag')) bDag = Math.min(bDag, m);
        if ((c === 'kaya') !== (c0 === 'kaya')) bKaya = Math.min(bKaya, m);
      }
      const su = (c0 === 'su' ? bSu : -bSu) + (fbm(wx * 1.3, wz * 1.3, 31) - 0.5) * 0.36, dag = c0 === 'dag' ? bDag : -bDag, kaya = c0 === 'kaya' ? bKaya : -bKaya;
      sSu[v] = su; sDag[v] = dag;
      const n1 = fbm(wx * 0.9, wz * 0.9, 7), n2 = fbm(wx * 2.3, wz * 2.3, 9);
      let y = c0 === 'sis' ? ZEMIN - 0.004 : ZEMIN;
      if (su > 0) y = ZEMIN - 0.36 * ss(0, 0.6, su) - 0.14 * ss(0.6, 1.8, su) + (n2 - 0.5) * 0.04 * ss(0.3, 0.8, su);
      else if (su > -0.3) y -= 0.07 * (1 - ss(0, 0.3, -su));
      if (dag > 0) {
        const e = dag + (n1 - 0.5) * 0.3;
        y = ZEMIN + 0.48 * ss(0.0, 0.12, e) + 0.40 * ss(0.45, 0.56, e) + 0.40 * ss(0.95, 1.08, e) + 0.5 * ss(1.6, 2.4, e)
          + (n2 - 0.5) * 0.14 * ss(0.1, 0.5, e);
      } else if (dag > -0.25) y += 0.035 * (1 - ss(0, 0.25, -dag)) * n2;
      if (kaya > 0) y += 0.07 * ss(0, 0.45, kaya) * (0.4 + n2);
      h[v] = y;
      pos[v * 3] = wx; pos[v * 3 + 1] = y; pos[v * 3 + 2] = wz;
      // renk: komşu karo merkezleri arasında gürültüyle kaydırılmış bilinear karışım (karo sınırı görünmez)
      const qx = wx - 0.5 + (gurultu(wx * 1.9, wz * 1.9, 3) - 0.5) * 0.7, qz = wz - 0.5 + (gurultu(wx * 1.9, wz * 1.9, 4) - 0.5) * 0.7;
      const ix = Math.floor(qx), iz2 = Math.floor(qz), fx = qx - ix, fz = qz - iz2;
      const cl = (a, b) => krAl(Math.min(n - 1, Math.max(0, a)), Math.min(n - 1, Math.max(0, b)));
      const r0 = cl(ix, iz2), r1 = cl(ix + 1, iz2), r2 = cl(ix, iz2 + 1), r3 = cl(ix + 1, iz2 + 1);
      const w0 = (1 - fx) * (1 - fz), w1 = fx * (1 - fz), w2 = (1 - fx) * fz, w3 = fx * fz;
      let cr = r0.r * w0 + r1.r * w1 + r2.r * w2 + r3.r * w3, cg = r0.g * w0 + r1.g * w1 + r2.g * w2 + r3.g * w3, cb = r0.b * w0 + r1.b * w1 + r2.b * w2 + r3.b * w3;
      const karis = (c, w) => { cr += (c.r - cr) * w; cg += (c.g - cg) * w; cb += (c.b - cb) * w; };
      let cimK = c0 === 'kara' || c0 === 'sis' ? 1 : c0 === 'kaya' ? 0.4 : 0, kayaK = c0 === 'kaya' ? 0.6 : 0;
      // çimende büyük ölçekli açık/koyu lekeler
      if (cimK) {
        const g = fbm(wx * 0.22, wz * 0.22, 11), g2 = fbm(wx * 0.9, wz * 0.9, 12);
        karis(P.cimA, ss(0.55, 0.78, g) * 0.5); karis(P.cimK, ss(0.47, 0.25, g) * 0.65); karis(P.cimK, ss(0.52, 0.78, g2) * 0.35);
      }
      // kumsal / ıslak kum
      if (su > -0.38) {
        const w = su > 0 ? 1 : 1 - ss(0.12, 0.38, -su + (n2 - 0.5) * 0.16);
        karis(su > 0.05 ? P.kumIslak : P.kum, w); cimK *= 1 - w;
      }
      // dağ: dik yüz kaya (bantlı), teras üstü yosun/çimen, yüksekte açık kaya
      if (dag > 0) { karis(P.kaya, 1); kayaK = 1; cimK = 0; }
      else if (dag > -0.45) karis(P.cimK, (1 - ss(0, 0.45, -dag)) * 0.5);
      col[v * 3] = cr; col[v * 3 + 1] = cg; col[v * 3 + 2] = cb;
      yuz[v * 2] = kayaK; yuz[v * 2 + 1] = cimK;
    }
    Object.assign(A, { h, sSu, sDag, kara, col, yuz, pos });
    this.yuk = { x0, z0, R, G, H, h };
  }

  // dağ yüzeyi: eğime göre kaya / yosunlu teras; yüksekte açık kaya (ny(v) = normalin y bileşeni)
  dagBoya(A, ny) {
    const { V, sDag, pos, h, P, col, yuz } = A;
    for (let v = 0; v < V; v++) {
      if (sDag[v] <= 0) continue;
      const wx = pos[v * 3], wz = pos[v * 3 + 2], y = h[v];
      const dik = Math.max(ss(0.96, 0.8, ny(v)), ss(0.7, 1.4, y) * (A.dagYuksekKaya ?? 0.6));
      const bant = gurultu((wx - wz) * 1.2, y * 14, 21);
      const c = new THREE.Color().copy(P.kayaK).lerp(P.kaya, bant).lerp(P.kayaA, ss(1.0, 1.6, y) * 0.6);
      const ust = new THREE.Color().copy(P.yosun).lerp(P.cimK, gurultu(wx * 3, wz * 3, 5) * 0.6);
      c.lerp(ust, (1 - dik) * (1 - ss(1.2, 1.7, y) * 0.7));
      col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
      yuz[v * 2] = dik; yuz[v * 2 + 1] = (1 - dik) * 0.6;
    }
  }

  // bina çevresi çiğnenmiş toprak + patikalar (yalnız kara köşeleri; i/j aralığı köşe indisleri, dahil)
  toprakBoya(A, i0 = 0, i1 = A.G - 1, j0 = 0, j1 = A.H - 1, rect = A.rect, yollar = A.yollar) {
    const { G, R, x0, z0, P, col, yuz, kara } = A;
    if (!rect.length && !yollar.length) return;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const v = j * G + i;
      if (!kara[v]) continue;
      const wx = x0 + i / R, wz = z0 + j / R;
      // gürültü yalnız gerektiğinde (eşik dışı köşelerde sonuç zaten 0: rect ≥ 0,43, patika kutusu dışı)
      let bmin = 9;
      for (const [ax, az, bx, bz] of rect) {
        const m = Math.hypot(Math.max(ax - wx, 0, wx - bx), Math.max(az - wz, 0, wz - bz));
        if (m < bmin) bmin = m;
      }
      const [k0, k1] = A.toprakKenar || [0.02, 0.3];
      let w = bmin < 0.43 ? (1 - ss(k0, k1, bmin + (fbm(wx * 2.3, wz * 2.3, 9) - 0.5) * 0.25)) * 0.75 : 0;
      let n1 = -1;
      for (const [ax, az, bx, bz] of yollar) {
        if (wx < Math.min(ax, bx) - 0.5 || wx > Math.max(ax, bx) + 0.5 || wz < Math.min(az, bz) - 0.5 || wz > Math.max(az, bz) + 0.5) continue;
        if (n1 < 0) n1 = fbm(wx * 0.9, wz * 0.9, 7);
        const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
        const t = Math.min(1, Math.max(0, ((wx - ax) * vx + (wz - az) * vz) / L2));
        const sap = Math.sin(t * 9 + ax) * 0.18 * Math.sin(t * Math.PI);
        const m = Math.hypot(wx - (ax + vx * t) + sap * vz / Math.sqrt(L2), wz - (az + vz * t) - sap * vx / Math.sqrt(L2));
        w = Math.max(w, (1 - ss(0.06, 0.15, m + (n1 - 0.5) * 0.08)) * 0.9);
      }
      if (w > 0) {
        const c = gurultu(wx * 5, wz * 5, 13) > 0.5 ? P.toprak : P.toprakK;
        col[v * 3] += (c.r - col[v * 3]) * w; col[v * 3 + 1] += (c.g - col[v * 3 + 1]) * w; col[v * 3 + 2] += (c.b - col[v * 3 + 2]) * w;
        yuz[v * 2 + 1] *= 1 - w;
      }
    }
  }

  // D: tek arazi ağı
  araziKur(A) {
    const { G, H, pos, col, yuz } = A;
    const idx = new Uint32Array((G - 1) * (H - 1) * 6);
    let k = 0;
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < G - 1; i++) {
      const a = j * G + i, b = a + 1, c = a + G, e = c + 1;
      if ((i + j) & 1) { idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = e; }
      else { idx[k++] = a; idx[k++] = c; idx[k++] = e; idx[k++] = a; idx[k++] = e; idx[k++] = b; }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const nor = geo.getAttribute('normal');
    this.dagBoya(A, (v) => nor.getY(v));
    this.toprakBoya(A);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aYuzey', new THREE.BufferAttribute(yuz, 2));
    geo.computeBoundingSphere();
    const arazi = new THREE.Mesh(geo, this.araziMat);
    arazi.castShadow = true; arazi.receiveShadow = true;
    this.grup.add(arazi);
    this.mesh.push(arazi);
  }

  // su: yükseklik dokusu + su karolarını kapsayan düzlem → A.suKarolari
  suKur(A) {
    const { n, at, x0, z0, x1, z1, R, G, H, V, h } = A;
    let sx0 = n, sz0 = n, sx1 = -1, sz1 = -1;
    for (let y = z0; y < z1; y++) for (let x = x0; x < x1; x++) if (at(x, y) === 'su') { sx0 = Math.min(sx0, x); sz0 = Math.min(sz0, y); sx1 = Math.max(sx1, x); sz1 = Math.max(sz1, y); }
    A.suKarolari = [];
    if (sx1 < 0) return;
    const veri = new Uint8Array(V * 4);
    for (let v = 0; v < V; v++) { const q = Math.round(Math.min(1, Math.max(0, (h[v] - YUK_MIN) / YUK_ARALIK)) * 255); veri[v * 4] = q; veri[v * 4 + 3] = 255; }
    const doku = new THREE.DataTexture(veri, G, H, THREE.RGBAFormat);
    doku.magFilter = doku.minFilter = THREE.LinearFilter; doku.needsUpdate = true;
    if (!this.suMatNesne) this.suMatNesne = this.suMalzeme(doku);
    const u = this.suMatNesne.userData.u;
    u.uYuk.value = doku;
    u.uYukMin.value.set(x0 - 0.5 / R, z0 - 0.5 / R);
    u.uYukBoy.value.set(G / R, H / R);
    const gx = sx1 - sx0 + 3, gz = sz1 - sz0 + 3;
    const su = new THREE.Mesh(new THREE.PlaneGeometry(gx, gz, 1, 1).rotateX(-Math.PI / 2), this.suMatNesne);
    su.position.set(sx0 - 1 + gx / 2, SU_Y, sz0 - 1 + gz / 2);
    su.receiveShadow = true;
    this.grup.add(su);
    this.mesh.push(su);
    for (let y = sz0; y <= sz1; y++) for (let x = sx0; x <= sx1; x++) if (at(x, y) === 'su') A.suKarolari.push([x, y]);
  }

  suMalzeme(doku) { return suMat(doku); }

  // ---------- bitki örtüsü / süs: yer listeleri ----------
  sacilim(A) {
    const { n, at, x0, z0, x1, z1, iz, merkez, mz } = A;
    const agac = { yaprak: [], igne: [], kavak: [] }, cali = [], ot = [], cicek = [], kaya = [], kule = [], hayvan = { inek: [], koyun: [] };
    for (let y = z0; y < z1; y++) for (let x = x0; x < x1; x++) {
      const t = at(x, y);
      if (t === 'sis') continue;
      const dolu = !!iz[y * n + x];
      const hv = hash(x, y, 5);
      if (t === 'orman') {
        const adet = 3 + (hash(x, y, 6) > 0.8 ? 1 : 0);
        for (let q = 0; q < adet; q++) {
          const r = hash(x, y, 20 + q), tur = r < 0.42 ? 'igne' : r < 0.86 ? 'yaprak' : 'kavak';
          const px = x + 0.12 + (((q % 2) * 0.45 + hash(x, y, 7 + q) * 0.35)), pz = y + 0.12 + ((q >> 1) * 0.42 + hash(x, y, 9 + q) * 0.35);
          agac[tur].push({ x: px, z: pz, s: 0.8 + hash(x, y, 11 + q) * 0.55, ry: hash(x, y, 13 + q) * 6.28, v: hash(x, y, 15 + q) });
        }
        if (hv > 0.5) cali.push({ x: x + hash(x, y, 33), z: y + hash(x, y, 34), s: 0.8 + hv * 0.5, v: hv });
        if (hv > 0.3) ot.push({ x: x + hash(x, y, 30), z: y + hash(x, y, 31), s: 1 });
      } else if (t === 'cimen' || t === 'verimli') {
        if (dolu) continue;
        const ormanYakin = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(x + a, y + b) === 'orman');
        if (t === 'cimen' && hv > (ormanYakin ? 0.72 : 0.93)) {
          const r = hash(x, y, 77);
          agac[r < 0.35 ? 'igne' : r < 0.85 ? 'yaprak' : 'kavak'].push({ x: x + 0.25 + hash(x, y, 78) * 0.5, z: y + 0.25 + hash(x, y, 79) * 0.5, s: 0.85 + r * 0.4, ry: r * 6.28, v: r });
        }
        if (hash(x, y, 80) > (ormanYakin ? 0.45 : 0.78)) cali.push({ x: x + 0.15 + hash(x, y, 81) * 0.7, z: y + 0.15 + hash(x, y, 82) * 0.7, s: 0.7 + hash(x, y, 83) * 0.6, v: hash(x, y, 84) });
        const adet = t === 'cimen' ? 2 : 1;
        for (let q = 0; q < adet; q++) ot.push({ x: x + 0.08 + hash(x, y, 40 + q) * 0.84, z: y + 0.08 + hash(x, y, 43 + q) * 0.84, s: 0.8 + hash(x, y, 46 + q) * 0.7 });
        if (t === 'cimen' && fbm(x * 0.4, y * 0.4, 17) > 0.55) for (let q = 0; q < 4; q++) cicek.push({ x: x + hash(x, y, 50 + q), z: y + hash(x, y, 54 + q), r: hash(Math.floor(x / 3), Math.floor(y / 3), 58 + (q & 1)) });
      } else if (t === 'tasli' || t === 'kayalik' || t === 'cevher' || t === 'mermer' || t === 'kil') {
        if (dolu) continue;
        const adet = t === 'kayalik' ? 3 : t === 'kil' ? 1 : 2;
        for (let q = 0; q < adet; q++) kaya.push({ x: x + 0.12 + hash(x, y, 13 + q) * 0.76, z: y + 0.12 + hash(x, y, 16 + q) * 0.76, s: 0.6 + hash(x, y, 19 + q) * (t === 'kayalik' ? 1.5 : 0.9), t });
        ot.push({ x: x + hash(x, y, 30), z: y + hash(x, y, 31), s: 0.9 });
      } else if (t === 'dag') {
        if (hv > 0.45) kaya.push({ x: x + hash(x, y, 13), z: y + hash(x, y, 16), s: 1 + hv * 1.6, t });
        if (hash(x, y, 150) > 0.35) kule.push({ x: x + 0.25 + hash(x, y, 151) * 0.5, z: y + 0.25 + hash(x, y, 152) * 0.5, s: 0.7 + hash(x, y, 153) * 0.7, ry: hash(x, y, 154) * 6.28 });
        if (hv > 0.75) agac.igne.push({ x: x + hash(x, y, 90), z: y + hash(x, y, 91), s: 0.7 + hv * 0.3, ry: hv * 6, v: hv });
      }
    }
    // dağ eteğinde iri kaya
    for (let y = z0; y < z1; y++) for (let x = x0; x < x1; x++) {
      if (at(x, y) !== 'dag') continue;
      for (const [a, b] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const t = at(x + a, y + b);
        if (t === 'dag' || t === 'sis' || t === 'su' || iz[(y + b) * n + x + a]) continue;
        if (hash(x, y, 100 + a * 3 + b) > 0.5) kaya.push({ x: x + a * 0.6 + 0.5 + (hash(x, y, 103) - 0.5) * 0.6 * Math.abs(b), z: y + b * 0.6 + 0.5 + (hash(x, y, 104) - 0.5) * 0.6 * Math.abs(a), s: 1.2 + hash(x, y, 105), t: 'dag' });
      }
    }
    // hayvanlar: köy çevresindeki boş çimende sürüler
    if (merkez) {
      const adaylar = [];
      for (let y = Math.floor(mz.y) - 9; y <= mz.y + 9; y++) for (let x = Math.floor(mz.x) - 9; x <= mz.x + 9; x++) {
        const u = Math.hypot(x + 0.5 - mz.x, y + 0.5 - mz.y);
        if (u < 3.5 || at(x, y) !== 'cimen' || iz[y * n + x]) continue;
        const komsuBina = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => iz[(y + b) * n + x + a]);
        if (!komsuBina) adaylar.push([x, y, hash(x, y, 120)]);
      }
      adaylar.sort((a, b) => a[2] - b[2]);
      adaylar.slice(0, 7).forEach(([x, y], i) => {
        const tur = i % 3 === 2 ? 'inek' : 'koyun';
        const adet = tur === 'inek' ? 2 : 3;
        for (let q = 0; q < adet; q++) hayvan[tur].push({ x: x + 0.2 + hash(x, y, 130 + q) * 0.6, z: y + 0.2 + hash(x, y, 133 + q) * 0.6, ry: hash(x, y, 136 + q) * 6.28 });
      });
    }
    // iskele + tekneler: köy merkezine en yakın kıyı
    let iskele = null, tekneler = [];
    const suKarolari = A.suKarolari;
    if (suKarolari.length && merkez) {
      let en = null;
      for (const [x, y] of suKarolari) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const t = at(x + a, y + b);
        if (t !== 'cimen' && t !== 'verimli' && t !== 'kil') continue;
        if (iz[(y + b) * n + x + a]) continue;
        const ilerisu = at(x - a, y - b) === 'su';
        const u = Math.hypot(x + 0.5 - mz.x, y + 0.5 - mz.y) - (ilerisu ? 2 : 0);
        if (!en || u < en.u) en = { x, y, a, b, u };
      }
      if (en) {
        // iskele kıyıdan suya doğru: yerel +x ekseni suya baksın
        const ry = Math.atan2(en.b, -en.a);
        iskele = { x: en.x + 0.5 + en.a * 0.42, z: en.y + 0.5 + en.b * 0.42, ry };
        tekneler = [{ x: en.x + 0.5 - en.a * 0.25 + en.b * 0.3, z: en.y + 0.5 - en.b * 0.25 + en.a * 0.3, ry: ry + 0.15 }];
        let uzak = null;
        for (const [x, y] of suKarolari) {
          const u = Math.hypot(x - en.x, y - en.y);
          const ic = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => at(x + a, y + b) === 'su');
          if (ic && u > 2 && u < 7 && (!uzak || hash(x, y, 140) > uzak.r)) uzak = { x, y, r: hash(x, y, 140) };
        }
        if (uzak) tekneler.push({ x: uzak.x + 0.5, z: uzak.y + 0.5, ry: uzak.r * 6.28 });
      }
    }
    return { agac, cali, ot, cicek, kaya, kule, hayvan, iskele, tekneler };
  }

  // D: yer listelerinden öbekli InstancedMesh
  susKur(L) {
    const { agac, cali, ot, cicek, kaya, kule, hayvan, iskele, tekneler } = L;
    const yer = (e, ek = 0) => ({ x: e.x, y: (this.hAt(e.x, e.z) ?? ZEMIN) + ek, z: e.z });
    for (const t of ['yaprak', 'igne', 'kavak']) {
      this.instanced(this.agac[t], this.agacMat[t], agac[t], (e) => ({ ...yer(e, -0.01), s: e.s, ry: e.ry, renk: yesil(e.v, 0.14) }));
    }
    this.instanced(this.agac.cali, this.agacMat.cali, cali, (e) => ({ ...yer(e, -0.01), s: e.s, ry: e.v * 6.28, renk: yesil(e.v, 0.18) }));
    const hm = this.s.harita;
    this.instanced(this.agac.ot, this.otMat, ot, (e) => ({ ...yer(e), s: e.s * 0.9, ry: e.x * 7.1 }), false, true);
    const CICEK = [[1, 0.85, 0.2], [1, 0.4, 0.62], [1, 1, 1], [0.66, 0.4, 1], [1, 0.35, 0.18]];
    if (hm.cicekMat && (hm.mevsim === 'bahar' || hm.mevsim === 'yaz')) this.instanced(this.cicekGeo, hm.cicekMat, cicek, (e) => ({ ...yer(e, -0.02), s: 0.7 + e.r * 0.5, renk: CICEK[Math.floor(e.r * 5) % 5] }), false, true);
    const KAYA = { tasli: [0.5, 0.48, 0.44], kayalik: [0.42, 0.4, 0.37], cevher: [0.42, 0.34, 0.5], mermer: [0.85, 0.84, 0.8], kil: [0.6, 0.38, 0.26], dag: [0.42, 0.4, 0.36] };
    if (hm.kayaGeo) this.instanced(this.kayaGeo || hm.kayaGeo, hm.kayaMat, kaya, (e) => ({ ...yer(e, -0.02), s: e.s, ry: e.x * 3.7 + e.z, renk: KAYA[e.t] }));
    this.instanced(this.agac.kule, this.kuleMat, kule, (e) => ({ ...yer(e, -0.06), sx: e.s * 1.2, sz: e.s * 1.2, sy: e.s * 1.3, ry: e.ry }));
    for (const t of ['inek', 'koyun']) this.instanced(this.hayvan[t], this.hayvanMat, hayvan[t], (e) => ({ ...yer(e), s: 1.15, ry: e.ry }));

    if (iskele) this.instanced(this.iskele, this.iskeleMat, [iskele], (e) => ({ x: e.x, y: ZEMIN - 0.06, z: e.z, ry: e.ry }));
    if (tekneler.length) this.instanced(this.tekne, this.tekneMat, tekneler, (e) => ({ x: e.x, y: SU_Y - 0.03, z: e.z, ry: e.ry, s: 1.25 }));
  }
}

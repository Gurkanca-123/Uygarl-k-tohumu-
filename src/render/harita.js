// Harita çizimi: karo türüne göre dokulu InstancedMesh (yanlar toprak), yol çıkartmaları (bağlantıya göre), ağaç çeşitleri
// (rüzgârda sallanır), dağ zirveleri, kayalar, ot/çiçek/saz süsü, dalgalı su, yumuşak kenarlı sürüklenen bulut sisi.
// Çekirdeği yalnız okur: gorunurKaro(d, x, y) → karo id | null (sis).
import * as THREE from 'three';
import { KAROLAR } from '../data/karolar.js';
import { gorunurKaro } from '../world/kesif.js';
import { karoDokusu, yolAtlasi } from './dokular.js';
import { yamala, ORTAK } from './malzeme.js';

// renk, yükseklik, mevsim duyarlılığı (0..1), yan (toprak) rengi
const STIL = {
  cimen: { renk: 0x6b9446, h: 0.30, m: 1, yan: 0x6a5034 },
  verimli: { renk: 0x8f7444, h: 0.30, m: 0.5, yan: 0x5a4028 },
  orman: { renk: 0x52803a, h: 0.30, m: 1, yan: 0x5a4430 },
  tasli: { renk: 0xa49e90, h: 0.34, m: 0.3, yan: 0x6a645a },
  su: { renk: 0x2f7fa8, h: 0.14, m: 0, yan: null },
  kil: { renk: 0xc07a48, h: 0.31, m: 0.2, yan: 0x8a5232 },
  cevher: { renk: 0x857890, h: 0.36, m: 0.2, yan: 0x5a5060 },
  mermer: { renk: 0xe8e4dc, h: 0.36, m: 0.2, yan: 0xa8a49a },
  kayalik: { renk: 0x8f8c86, h: 0.42, m: 0.3, yan: 0x66625c },
  dag: { renk: 0x77736c, h: 0.8, m: 0.35, yan: 0x5a5650 },
  yol: { renk: 0x6b9446, h: 0.30, m: 1, yan: 0x6a5034 },
  sis: { renk: 0x3a404c, h: 0.30, m: 0, yan: null },
};
const KAYA_RENK = { tasli: 0xb0aa9e, kayalik: 0x85827c, cevher: 0x9a7ab8, mermer: 0xf4f1ea, kil: 0xb8704a };

// mevsim: çimen tonu + karışım, güneş, gök/yer dolgusu, sis/arka plan, ağaç renkleri, kar
export const MEVSIM_STIL = {
  bahar: { ton: 0x9ad860, k: 0.12, isik: 0xfff0d8, siddet: 2.6, ortam: 1.05, gok: 0xcfe2ff, yer: 0x7a6a48, sis: 0x8fa3b4,
    agac: { igne: 0x3f7a3a, yaprak: 0x78b848, kavak: 0x8ac050 }, kar: 0, ruzgar: 1 },
  yaz: { ton: 0xd8c860, k: 0.18, isik: 0xffe3b0, siddet: 2.9, ortam: 1.0, gok: 0xd8e4f4, yer: 0x8a7048, sis: 0x9aa8b0,
    agac: { igne: 0x376e34, yaprak: 0x4f963a, kavak: 0x6aa040 }, kar: 0, ruzgar: 0.7 },
  guz: { ton: 0xd88a34, k: 0.3, isik: 0xffcf98, siddet: 2.4, ortam: 0.95, gok: 0xe0d0c0, yer: 0x7a5a38, sis: 0x9a9088,
    agac: { igne: 0x3a6a36, yaprak: 0xd8802e, kavak: 0xe0b040 }, kar: 0, ruzgar: 1.4 },
  kis: { ton: 0xeef3fa, k: 0.55, isik: 0xdfe8ff, siddet: 2.2, ortam: 1.2, gok: 0xe0eaff, yer: 0x8a8a90, sis: 0xa8b4c4,
    agac: { igne: 0x2f5a3e, yaprak: 0x8a7a64, kavak: 0x9a8a6e }, kar: 0.85, ruzgar: 1.2 },
};

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// ---------- geometri yardımcıları ----------
function birlestir(parcalar) { // [{ geo, renk }] → renk + aSallan öznitelikli tek geometri (indekssiz)
  const pos = [], nor = [], col = [], sal = [];
  const c = new THREE.Color();
  for (const { geo, renk } of parcalar) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.computeVertexNormals();
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    c.setHex(renk);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b); sal.push(Math.max(0, p.getY(i)) / 1.1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSallan', new THREE.Float32BufferAttribute(sal, 1));
  return g;
}
function puruzlu(geo, miktar, tohum) {
  const g = geo.index ? geo : geo;
  const p = g.getAttribute('position');
  const harita = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let d = harita.get(k);
    if (!d) { d = [(hash(i, 1, tohum) - 0.5) * miktar, (hash(i, 2, tohum) - 0.5) * miktar * 0.6, (hash(i, 3, tohum) - 0.5) * miktar]; harita.set(k, d); }
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  return g;
}

function agacGeolari() {
  const R = (r, h, seg, y) => new THREE.ConeGeometry(r, h, seg).translate(0, y + h / 2, 0);
  const govde = birlestir([{ geo: new THREE.CylinderGeometry(0.035, 0.05, 0.36, 5).translate(0, 0.18, 0), renk: 0x6a4a30 }]);
  const igne = birlestir([
    { geo: R(0.3, 0.42, 7, 0.18), renk: 0xffffff },
    { geo: R(0.24, 0.38, 7, 0.4), renk: 0xf0f4ee },
    { geo: R(0.16, 0.34, 7, 0.62), renk: 0xe6efe2 },
  ]);
  const yaprak = birlestir([
    { geo: puruzlu(new THREE.IcosahedronGeometry(0.28, 0), 0.08, 3).scale(1, 0.85, 1).translate(0, 0.52, 0), renk: 0xffffff },
    { geo: puruzlu(new THREE.IcosahedronGeometry(0.18, 0), 0.05, 5).translate(0.14, 0.42, 0.08), renk: 0xe8eee0 },
    { geo: puruzlu(new THREE.IcosahedronGeometry(0.16, 0), 0.05, 7).translate(-0.12, 0.66, -0.06), renk: 0xf4f8ee },
  ]);
  const kavak = birlestir([
    { geo: puruzlu(new THREE.IcosahedronGeometry(0.16, 1), 0.04, 9).scale(1, 2.6, 1).translate(0, 0.62, 0), renk: 0xffffff },
  ]);
  return { govde, igne, yaprak, kavak };
}

function dagGeo() {
  const g = new THREE.ConeGeometry(0.72, 1.4, 7, 4).translate(0, 0.7, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 1.39) continue;
    const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + 0.18 * Math.sin(a * 3 + y * 4) + 0.08 * Math.sin(a * 7);
    p.setXYZ(i, p.getX(i) * k, y + 0.05 * Math.sin(a * 5), p.getZ(i) * k);
  }
  const ni = g.toNonIndexed();
  ni.computeVertexNormals();
  const q = ni.getAttribute('position'), col = new Float32Array(q.count * 3), c = new THREE.Color();
  for (let i = 0; i < q.count; i += 3) {
    const y = (q.getY(i) + q.getY(i + 1) + q.getY(i + 2)) / 3;
    if (y > 0.95) c.setHex(0xf2f4f8); else if (y > 0.5) c.setHex(0x9a958c); else c.setHex(0x7d786f);
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
  }
  ni.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return ni;
}

function otGeo() {
  const parca = [];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    parca.push({ geo: new THREE.ConeGeometry(0.018, 0.13 + (i % 2) * 0.05, 3).rotateZ((i - 1.5) * 0.25).translate(Math.cos(a) * 0.03, 0.07, Math.sin(a) * 0.03), renk: i % 2 ? 0xffffff : 0xdde8cc });
  }
  return birlestir(parca);
}
function sazGeo() {
  const parca = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    parca.push({ geo: new THREE.CylinderGeometry(0.004, 0.01, 0.3 + (i % 3) * 0.06, 3).rotateZ((i - 2) * 0.12).translate(Math.cos(a) * 0.05, 0.16, Math.sin(a) * 0.05), renk: 0x7a9a4a });
    if (i % 2 === 0) parca.push({ geo: new THREE.CylinderGeometry(0.014, 0.014, 0.05, 4).translate(Math.cos(a) * 0.05 + (i - 2) * 0.04, 0.33, Math.sin(a) * 0.05), renk: 0x6a4a2a });
  }
  return birlestir(parca);
}

// ---------- sis bulutu gölgelendiricisi ----------
const SIS_VS = `
varying vec2 vUv; varying vec3 vP;
#include <common>
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SIS_FS = `
uniform sampler2D uMaske; uniform float uZaman; uniform vec3 uKoyu; uniform vec3 uAcik;
varying vec2 vUv; varying vec3 vP;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n2(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main() {
  float m = texture2D(uMaske, vUv).r;
  vec2 q = vP.xz * 0.22 + vec2(uZaman * 0.035, uZaman * 0.02);
  float n = fbm(q);
  float n2v = fbm(q * 2.3 - vec2(uZaman * 0.05, 0.0));
  float a = smoothstep(0.32, 0.72, m + (n - 0.5) * 0.55);
  // bulut tepeleri: gürültü eğiminden sahte ışık
  float isik = clamp(0.55 + (n - fbm(q + vec2(0.08, 0.08))) * 6.0, 0.0, 1.0);
  vec3 c = mix(uKoyu, uAcik, smoothstep(0.25, 0.85, n * 0.7 + n2v * 0.3) * (0.6 + 0.4 * isik));
  c = mix(c, uAcik * 1.08, smoothstep(0.85, 1.0, m) * 0.0);
  // kenar: hafif aydınlık sınır (sisin ucu)
  c += vec3(0.06, 0.055, 0.05) * smoothstep(0.2, 0.5, a) * (1.0 - smoothstep(0.5, 0.95, a));
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;

const SIS_PAY = 24;

export class HaritaCizim {
  constructor(grup) {
    this.grup = grup;
    this.mesh = {};
    this.ek = [];
    this.anahtar = null;
    this.mevsim = 'bahar';
    this.kutuMat = {};
    for (const [id, s] of Object.entries(STIL)) {
      const doku = id === 'sis' ? null : karoDokusu(id === 'yol' ? 'cimen' : id);
      const m = new THREE.MeshLambertMaterial({ color: s.renk, map: doku });
      this.kutuMat[id] = yamala(m, {
        kar: id === 'su' || id === 'sis' ? 0 : id === 'dag' ? 1 : 0.9,
        yan: s.yan ? new THREE.Color(s.yan) : null, yanK: 0.85, dalga: id === 'su',
      });
    }
    this.geo = {};
    for (const [id, s] of Object.entries(STIL)) {
      const g = new THREE.BoxGeometry(1, s.h, 1);
      g.translate(0, s.h / 2, 0);
      this.geo[id] = g;
    }
    // yol çıkartması
    this.yolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.yolMat = yamala(new THREE.MeshLambertMaterial({ map: yolAtlasi(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { kar: 0.5 });
    const eskiYol = this.yolMat.onBeforeCompile;
    this.yolMat.onBeforeCompile = (sh) => {
      eskiYol(sh);
      sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vMapUv = vMapUv * 0.25 + aYolHucre;')
        .replace('varying vec3 vDN;', 'attribute vec2 aYolHucre;\nvarying vec3 vDN;');
    };
    this.yolMat.customProgramCacheKey = () => 'yol-cikartma';

    // ağaçlar / süs
    const ag = agacGeolari();
    this.agacGeo = ag;
    const agacMat = (renk) => yamala(new THREE.MeshLambertMaterial({ color: renk, vertexColors: true, flatShading: true }), { ruzgar: true, kar: 0.9 });
    this.agacMat = { govde: agacMat(0xffffff), igne: agacMat(0x3f7a3a), yaprak: agacMat(0x78b848), kavak: agacMat(0x8ac050) };
    this.dagGeo = dagGeo();
    this.dagMat = yamala(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { kar: 0.6 });
    this.kayaGeo = puruzlu(new THREE.DodecahedronGeometry(0.13, 0), 0.06, 4).scale(1, 0.7, 1).translate(0, 0.05, 0);
    this.kayaGeo.computeVertexNormals();
    this.kayaMat = yamala(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), { kar: 0.8 });
    this.otGeo = otGeo();
    this.otMat = yamala(new THREE.MeshLambertMaterial({ color: 0x7ab84a, vertexColors: true }), { ruzgar: true, kar: 0.5 });
    this.cicekGeo = new THREE.IcosahedronGeometry(0.03, 0).translate(0, 0.08, 0);
    this.cicekMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x222222 });
    this.sazGeo = sazGeo();
    this.sazMat = yamala(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), { ruzgar: true, kar: 0.4 });

    // sis bulutu
    this.sisMat = new THREE.ShaderMaterial({
      uniforms: { uMaske: { value: null }, uZaman: ORTAK.uZaman, uKoyu: { value: new THREE.Color(0x3a404c) }, uAcik: { value: new THREE.Color(0x9aa4b2) } },
      vertexShader: SIS_VS, fragmentShader: SIS_FS, transparent: true, depthWrite: false,
    });
    this.sisBulut = null;
  }

  mevsimAyarla(id) {
    this.mevsim = MEVSIM_STIL[id] ? id : 'bahar';
    const ms = MEVSIM_STIL[this.mevsim];
    for (const [kid, s] of Object.entries(STIL)) {
      const c = new THREE.Color(s.renk);
      if (kid === 'su' && this.mevsim === 'kis') c.lerp(new THREE.Color(0x9cc4dc), 0.5);
      else c.lerp(new THREE.Color(ms.ton), ms.k * s.m);
      this.kutuMat[kid].color.copy(c);
    }
    for (const t of ['igne', 'yaprak', 'kavak']) this.agacMat[t].color.setHex(ms.agac[t]);
    this.otMat.color.setHex(0x7ab84a).lerp(new THREE.Color(ms.ton), ms.k * 1.1);
    this.sazMat.color.setHex(this.mevsim === 'guz' ? 0xd8b070 : this.mevsim === 'kis' ? 0xb0a890 : 0xffffff);
    if (this.mesh.cicek) this.mesh.cicek.visible = this.mevsim === 'bahar' || this.mevsim === 'yaz';
    this.sisMat.uniforms.uAcik.value.setHex(ms.sis);
    this.sisMat.uniforms.uKoyu.value.setHex(ms.sis).multiplyScalar(0.42);
    STIL.sis.renk = this.sisMat.uniforms.uKoyu.value.getHex();
    this.kutuMat.sis.color.copy(this.sisMat.uniforms.uKoyu.value);
    ORTAK.uKar.value = ms.kar;
    ORTAK.uRuzgar.value = ms.ruzgar;
  }

  temizle() {
    if (this.mesh.yolCikartma) this.mesh.yolCikartma.geometry.dispose();
    for (const m of [...Object.values(this.mesh), ...this.ek]) {
      if (m) { this.grup.remove(m); m.dispose?.(); }
    }
    if (this.sisBulut) { this.grup.remove(this.sisBulut); this.sisBulut.geometry.dispose(); this.sisMat.uniforms.uMaske.value?.dispose(); this.sisBulut = null; }
    this.mesh = {}; this.ek = [];
  }

  instanced(geo, mat, liste, yap, sec = {}) {
    if (!liste.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, liste.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
    liste.forEach((e, i) => {
      const r = yap(e, i);
      q.setFromAxisAngle(Y, r.ry || 0);
      m4.compose(p.set(r.x, r.y, r.z), q, s.set(r.sx ?? r.s ?? 1, r.sy ?? r.s ?? 1, r.sz ?? r.s ?? 1));
      im.setMatrixAt(i, m4);
      if (r.renk != null) im.setColorAt(i, typeof r.renk === 'number' ? c.setHex(r.renk) : c.setRGB(...r.renk));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !!sec.golge; im.receiveShadow = sec.al !== false;
    im.computeBoundingSphere();
    this.grup.add(im);
    return im;
  }

  // Dönüş: yeniden çizildi mi.
  guncelle(d) {
    const anahtar = `${d.harita.kesif}|${d.cag}|${JSON.stringify(d.harita.degisim)}`;
    if (anahtar === this.anahtar) return false;
    this.anahtar = anahtar;
    this.temizle();
    const n = d.harita.boyut;
    const karo = new Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) karo[y * n + x] = gorunurKaro(d, x, y) ?? 'sis';
    const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? 'sis' : karo[y * n + x]);
    const gruplar = {};
    for (const id of Object.keys(STIL)) gruplar[id] = [];
    for (let i = 0; i < n * n; i++) (gruplar[karo[i]] || gruplar.cimen).push(i);

    const agac = { igne: [], yaprak: [], kavak: [] }, govde = [], tepeler = [], kayalar = [], otlar = [], cicek = [], saz = [], yollar = [];
    for (const [id, liste] of Object.entries(gruplar)) {
      if (!liste.length) continue;
      const s = STIL[id];
      this.mesh[id] = this.instanced(this.geo[id], this.kutuMat[id], liste, (i) => {
        const x = i % n, y = (i / n) | 0;
        const yuksek = id === 'dag' ? 0.85 + hash(x, y, 3) * 0.3 : 1;
        let j = 0.965 + hash(x, y, 1) * 0.07;
        let renk = [j, j, j];
        if (id === 'su') { // kıyıya yakın sığ su açık
          let kara = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(x + dx, y + dy) !== 'su') kara++;
          j = 1 + kara * 0.14; renk = [j * 1.02, j * 1.08, j];
        }
        return { x: x + 0.5, y: 0, z: y + 0.5, sy: yuksek, ry: id === 'yol' || id === 'su' || id === 'verimli' ? 0 : Math.floor(hash(x, y, 2) * 4) * Math.PI / 2, renk };
      }, { golge: id === 'dag' || id === 'kayalik' });
      for (const i of liste) {
        const x = i % n, y = (i / n) | 0;
        const h = hash(x, y, 5);
        if (id === 'orman') {
          const adet = 2 + (hash(x, y, 6) > 0.45 ? 1 : 0);
          for (let k = 0; k < adet; k++) {
            const r = hash(x, y, 20 + k), tur = r < 0.5 ? 'igne' : r < 0.85 ? 'yaprak' : 'kavak';
            const px = x + 0.22 + ((k * 0.37 + hash(x, y, 7 + k) * 0.5) % 0.62), pz = y + 0.2 + hash(x, y, 9 + k) * 0.6;
            const sc = 0.75 + hash(x, y, 11 + k) * 0.55;
            const e = { x: px, z: pz, s: sc, ry: hash(x, y, 13 + k) * 6.28, v: hash(x, y, 15 + k) };
            agac[tur].push(e); govde.push(e);
          }
          if (h > 0.6) otlar.push([x + 0.2 + hash(x, y, 30) * 0.6, y + 0.2 + hash(x, y, 31) * 0.6, s.h, 0.9]);
        } else if (id === 'dag') {
          tepeler.push([x + 0.5, y + 0.5, 0.8 + hash(x, y, 11) * 0.6, s.h * (0.85 + hash(x, y, 3) * 0.3), hash(x, y, 12) * 6.28]);
        } else if (KAYA_RENK[id]) {
          const adet = id === 'kayalik' ? 3 : 2;
          for (let k = 0; k < adet; k++) kayalar.push([x + 0.2 + hash(x, y, 13 + k) * 0.6, y + 0.2 + hash(x, y, 16 + k) * 0.6, id, s.h, 0.7 + hash(x, y, 19 + k) * 0.9]);
        } else if (id === 'cimen' || id === 'verimli') {
          const adet = id === 'cimen' ? (h > 0.35 ? 2 : 1) : 1;
          for (let k = 0; k < adet; k++) otlar.push([x + 0.1 + hash(x, y, 40 + k) * 0.8, y + 0.1 + hash(x, y, 42 + k) * 0.8, s.h, 0.7 + hash(x, y, 44 + k) * 0.6]);
          if (id === 'cimen' && h > 0.8) cicek.push([x + hash(x, y, 50), y + hash(x, y, 51), s.h, hash(x, y, 52)]);
        } else if (id === 'su') {
          let kara = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = at(x + dx, y + dy); if (t !== 'su' && t !== 'sis') kara++; }
          if (kara && h > 0.45) saz.push([x + 0.2 + hash(x, y, 60) * 0.6, y + 0.2 + hash(x, y, 61) * 0.6, s.h, 0.8 + hash(x, y, 62) * 0.5]);
        } else if (id === 'yol') {
          let m = 0;
          const yolMu = (t) => t === 'yol';
          if (yolMu(at(x, y - 1))) m |= 1; if (yolMu(at(x + 1, y))) m |= 2; if (yolMu(at(x, y + 1))) m |= 4; if (yolMu(at(x - 1, y))) m |= 8;
          yollar.push([x, y, m]);
        }
      }
    }
    // yol çıkartmaları
    if (yollar.length) {
      const im = this.instanced(this.yolGeo, this.yolMat, yollar, ([x, y]) => ({ x: x + 0.5, y: STIL.yol.h + 0.004, z: y + 0.5 }));
      const hc = new Float32Array(yollar.length * 2);
      yollar.forEach(([, , m], i) => { hc[i * 2] = (m % 4) / 4; hc[i * 2 + 1] = 1 - (Math.floor(m / 4) + 1) / 4; });
      im.geometry = this.yolGeo.clone();
      im.geometry.setAttribute('aYolHucre', new THREE.InstancedBufferAttribute(hc, 2));
      im.renderOrder = 1;
      this.mesh.yolCikartma = im;
    }
    const agacYap = (e) => ({ x: e.x, y: STIL.orman.h, z: e.z, s: e.s, ry: e.ry, renk: [0.85 + e.v * 0.3, 0.85 + (1 - e.v) * 0.25, 0.8 + e.v * 0.2] });
    this.mesh.govde = this.instanced(this.agacGeo.govde, this.agacMat.govde, govde, (e) => ({ x: e.x, y: STIL.orman.h, z: e.z, s: e.s, ry: e.ry }), { golge: true });
    for (const t of ['igne', 'yaprak', 'kavak']) this.mesh[`agac_${t}`] = this.instanced(this.agacGeo[t], this.agacMat[t], agac[t], agacYap, { golge: true });
    this.mesh.tepe = this.instanced(this.dagGeo, this.dagMat, tepeler, ([x, z, s, h, ry]) => ({ x, y: h, z, sx: s, sy: s * (0.9 + (ry % 1) * 0.4), sz: s, ry }), { golge: true });
    this.mesh.kaya = this.instanced(this.kayaGeo, this.kayaMat, kayalar, ([x, z, id, h, s], i) => ({ x, y: h, z, s, ry: i * 1.7, renk: KAYA_RENK[id] }), { golge: true });
    this.mesh.ot = this.instanced(this.otGeo, this.otMat, otlar, ([x, z, h, s], i) => ({ x, y: h, z, s, ry: i * 2.3 }));
    const CICEK = [0xf2e15a, 0xf07ab0, 0xffffff, 0xb07af0, 0xf0603a];
    this.mesh.cicek = this.instanced(this.cicekGeo, this.cicekMat, cicek, ([x, z, h, r]) => ({ x, y: h, z, s: 0.8 + r * 0.5, renk: CICEK[Math.floor(r * CICEK.length) % CICEK.length] }));
    if (this.mesh.cicek) this.mesh.cicek.visible = this.mevsim === 'bahar' || this.mevsim === 'yaz';
    this.mesh.saz = this.instanced(this.sazGeo, this.sazMat, saz, ([x, z, h, s], i) => ({ x, y: h, z, s, ry: i }));
    for (const k of Object.keys(this.mesh)) if (!this.mesh[k]) delete this.mesh[k];

    // sis bulutu: keşfedilmemiş maske (harita dışı = sis), 1 karo bulanık
    const N = n + SIS_PAY * 2;
    const ham = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) ham[j * N + i] = at(i - SIS_PAY, j - SIS_PAY) === 'sis' ? 1 : 0;
    const veri = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let t = 0, w = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const a = Math.min(N - 1, Math.max(0, i + dx)), b = Math.min(N - 1, Math.max(0, j + dy)), k = dx || dy ? 1 : 2;
        t += ham[b * N + a] * k; w += k;
      }
      const satir = N - 1 - j; // düzlem uv: v=0 → +z
      const o = (satir * N + i) * 4;
      veri[o] = veri[o + 1] = veri[o + 2] = Math.round((t / w) * 255); veri[o + 3] = 255;
    }
    const doku = new THREE.DataTexture(veri, N, N, THREE.RGBAFormat);
    doku.magFilter = THREE.LinearFilter; doku.minFilter = THREE.LinearFilter; doku.needsUpdate = true;
    this.sisMat.uniforms.uMaske.value = doku;
    this.sisBulut = new THREE.Mesh(new THREE.PlaneGeometry(N, N).rotateX(-Math.PI / 2), this.sisMat);
    this.sisBulut.position.set(n / 2, 0.62, n / 2);
    this.sisBulut.renderOrder = 6;
    this.grup.add(this.sisBulut);

    this.mevsimAyarla(this.mevsim);
    return true;
  }
}

export const KARO_ADLARI = Object.fromEntries(KAROLAR.map((k) => [k.id, k.ad]));

// Köy hayatı: baca dumanı / ateş / kıvılcım / kar (GPU parçacıkları, CPU yükü yok), işçi figürleri (yürür, çalışır),
// binalar arası süsler (fıçı, sandık, odun, balya…), kuşlar, yel değirmeni kanatları. Çekirdeği yalnız okur.
import * as THREE from 'three';
import { BINALAR } from '../data/binalar.js';
import { izgara } from '../world/izgara.js';
import { gorunurKaro } from '../world/kesif.js';
import { etkinAtama, issizSayisi } from '../core/yardimci.js';
import { ORTAK, binaMat } from './malzeme.js';
import { susGeo, SUS_TIPLERI, ZEMIN_Y } from './binalar.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const FIGUR_MAX = 60, KAR_ADET = 700;
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

// ---------- parçacık gölgelendiricisi (tip: 0 duman, 1 is, 2 alev, 3 kıvılcım, 4 kar) ----------
const P_VS = `
attribute vec3 aKonum; attribute vec4 aVeri;
uniform float uZaman; uniform float uRuzgar; uniform vec3 uMerkez;
varying float vA; varying vec2 vUv; varying float vT; varying float vTip;
void main() {
  float tohum = aVeri.x, olc = aVeri.y, tip = aVeri.z;
  float t = fract(uZaman * aVeri.w + tohum);
  vec3 p = aKonum; float boy = 0.1;
  if (tip < 1.5) {
    float r = 0.6 + 0.4 * uRuzgar;
    p += vec3(t * 0.45 * r + sin(t * 5.0 + tohum * 30.0) * 0.05, t * 1.25, t * 0.2 * r + cos(t * 4.0 + tohum * 20.0) * 0.05) * olc;
    boy = mix(0.06, 0.34, sqrt(t)) * olc;
    vA = smoothstep(0.0, 0.12, t) * (1.0 - t) * (tip > 0.5 ? 0.75 : 0.5);
  } else if (tip < 2.5) {
    p += vec3(sin(uZaman * 9.0 + tohum * 40.0) * 0.012, t * 0.2, cos(uZaman * 7.0 + tohum * 30.0) * 0.012) * olc;
    boy = mix(0.13, 0.025, t) * olc;
    vA = smoothstep(0.0, 0.15, t) * (1.0 - t);
  } else if (tip < 3.5) {
    float a = tohum * 63.0;
    p += vec3(sin(a) * t * 0.18 + sin(t * 12.0 + a) * 0.02, t * 0.75, cos(a) * t * 0.18) * olc;
    boy = 0.022 * olc;
    vA = (1.0 - t) * step(0.05, t);
  } else {
    vec3 k = aKonum;
    k.xz = uMerkez.xz + mod(k.xz - uMerkez.xz + 22.0, 44.0) - 22.0;
    p = k + vec3(sin(t * 6.28 + tohum * 9.0) * 0.25, 7.0 - t * 7.0, cos(t * 5.0 + tohum * 7.0) * 0.2 + t * 0.6 * uRuzgar);
    boy = 0.045 * olc;
    vA = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.9, 1.0, t)) * 0.9;
  }
  vT = t; vTip = tip; vUv = uv;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  mv.xy += position.xy * boy;
  gl_Position = projectionMatrix * mv;
}`;
const P_FS = `
varying float vA; varying vec2 vUv; varying float vT; varying float vTip;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = vA * (1.0 - smoothstep(0.35, 1.0, d));
  if (a < 0.01) discard;
  vec3 c;
  if (vTip < 0.5) c = mix(vec3(0.92, 0.9, 0.86), vec3(0.72, 0.72, 0.74), vT);
  else if (vTip < 1.5) c = mix(vec3(0.25, 0.22, 0.2), vec3(0.45, 0.44, 0.44), vT);
  else if (vTip < 2.5) c = mix(vec3(1.0, 0.9, 0.45), vec3(1.0, 0.3, 0.05), vT) * (1.6 - d * 0.6);
  else if (vTip < 3.5) c = vec3(1.0, 0.7, 0.3) * 1.6;
  else c = vec3(1.0);
  gl_FragColor = vec4(c, a);
}`;

function parcacikMesh(toplama) {
  const g = new THREE.InstancedBufferGeometry();
  const taban = new THREE.PlaneGeometry(1, 1);
  g.index = taban.index;
  g.setAttribute('position', taban.getAttribute('position'));
  g.setAttribute('uv', taban.getAttribute('uv'));
  g.setAttribute('aKonum', new THREE.InstancedBufferAttribute(new Float32Array(3), 3));
  g.setAttribute('aVeri', new THREE.InstancedBufferAttribute(new Float32Array(4), 4));
  g.instanceCount = 0;
  const m = new THREE.ShaderMaterial({
    uniforms: { uZaman: ORTAK.uZaman, uRuzgar: ORTAK.uRuzgar, uMerkez: { value: new THREE.Vector3() } },
    vertexShader: P_VS, fragmentShader: P_FS, transparent: true, depthWrite: false,
    blending: toplama ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}
function parcacikDoldur(mesh, liste) { // liste: [x,y,z, tohum, olc, tip, hiz]
  const g = mesh.geometry, n = liste.length;
  const k = new Float32Array(Math.max(1, n) * 3), v = new Float32Array(Math.max(1, n) * 4);
  liste.forEach((e, i) => { k.set(e.slice(0, 3), i * 3); v.set(e.slice(3, 7), i * 4); });
  g.setAttribute('aKonum', new THREE.InstancedBufferAttribute(k, 3));
  g.setAttribute('aVeri', new THREE.InstancedBufferAttribute(v, 4));
  g.instanceCount = n;
}

// ---------- figür geometrileri ----------
function figurGeo() {
  const govde = new THREE.CylinderGeometry(0.028, 0.046, 0.085, 6).translate(0, 0.085, 0);
  const omuz = new THREE.SphereGeometry(0.03, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 0.9).translate(0, 0.127, 0);
  const g1 = mergeBasit([govde, omuz], [0xffffff, 0xf0f0f0]);
  const bas = new THREE.IcosahedronGeometry(0.026, 1).translate(0, 0.162, 0);
  const sac = new THREE.SphereGeometry(0.028, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2.2).translate(0, 0.166, -0.003);
  const bacak1 = new THREE.BoxGeometry(0.016, 0.045, 0.018).translate(-0.014, 0.022, 0);
  const bacak2 = new THREE.BoxGeometry(0.016, 0.045, 0.018).translate(0.014, 0.022, 0);
  const g2 = mergeBasit([bas, sac, bacak1, bacak2], [0xe0b48a, 0x3a2618, 0x4a3828, 0x4a3828]);
  return { govde: g1, bas: g2 };
}
function mergeBasit(geos, renkler) {
  const pos = [], nor = [], col = [];
  const c = new THREE.Color();
  geos.forEach((geo, gi) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.computeVertexNormals();
    c.setHex(renkler[gi]);
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
const KIYAFET = [0xb04a32, 0x3f6ea8, 0x6a8a3a, 0xc8a050, 0x8a5a9a, 0xd8d0c0, 0x7a5a3a, 0x3a8a8a];

export class KoyCizim {
  constructor(grup) {
    this.grup = grup;
    this.duman = parcacikMesh(false); this.duman.renderOrder = 7;
    this.ates = parcacikMesh(true); this.ates.renderOrder = 8;
    this.kar = parcacikMesh(false); this.kar.renderOrder = 9;
    this.kar.visible = false;
    grup.add(this.duman, this.ates, this.kar);
    const kar = [];
    for (let i = 0; i < KAR_ADET; i++) kar.push([hash(i, 1) * 44, 0.3, hash(i, 2) * 44, hash(i, 3), 0.7 + hash(i, 4) * 0.6, 4, 0.07 + hash(i, 5) * 0.05]);
    parcacikDoldur(this.kar, kar);

    const fg = figurGeo();
    const fm = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.figurGovde = new THREE.InstancedMesh(fg.govde, fm, FIGUR_MAX);
    this.figurBas = new THREE.InstancedMesh(fg.bas, fm, FIGUR_MAX);
    for (const m of [this.figurGovde, this.figurBas]) { m.count = 0; m.castShadow = false; m.frustumCulled = false; grup.add(m); }
    const c = new THREE.Color();
    for (let i = 0; i < FIGUR_MAX; i++) { this.figurGovde.setColorAt(i, c.setHex(KIYAFET[i % KIYAFET.length])); this.figurBas.setColorAt(i, c.setHex(0xffffff)); }
    this.figurler = [];

    // kuşlar
    const kg = new THREE.BufferGeometry();
    kg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.04, -0.12, 0.03, -0.02, 0, 0, -0.02, 0, 0, 0.04, 0, 0, -0.02, 0.12, 0.03, -0.02], 3));
    kg.computeVertexNormals();
    this.kus = new THREE.InstancedMesh(kg, new THREE.MeshBasicMaterial({ color: 0x2a2622, side: THREE.DoubleSide }), 7);
    this.kus.frustumCulled = false;
    grup.add(this.kus);
    this.kusMerkez = new THREE.Vector3(32, 3, 32);

    this.sus = [];
    this.pervaneler = [];
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); this.Y = new THREE.Vector3(0, 1, 0);
  }

  mevsim(id) { this.kar.visible = id === 'kis'; }

  // modeller: [{ b, model }] (konumlanmış bina grupları)
  binalar(d, modeller) {
    const duman = [], ates = [];
    this.pervaneler = [];
    const w = new THREE.Vector3();
    for (const { b, model } of modeller) {
      model.updateMatrixWorld(true);
      const u = model.userData;
      const t0 = hash(b.x * 64 + b.y, 9);
      u.duman.forEach(([x, y, z, s, tip], i) => {
        w.set(x, y, z); model.localToWorld(w);
        const n = tip === 'is' ? 7 : 6;
        for (let k = 0; k < n; k++) duman.push([w.x, w.y, w.z, (k / n + t0 + i * 0.3) % 1, s, tip === 'is' ? 1 : 0, 0.16 + (tip === 'is' ? 0.04 : 0)]);
      });
      u.ates.forEach(([x, y, z, s], i) => {
        w.set(x, y, z); model.localToWorld(w);
        const n = Math.max(4, Math.round(5 * s));
        for (let k = 0; k < n; k++) {
          const ox = (hash(k, i + 3) - 0.5) * 0.08 * s, oz = (hash(k, i + 7) - 0.5) * 0.08 * s;
          ates.push([w.x + ox, w.y, w.z + oz, (k / n + t0) % 1, Math.max(0.6, s * 0.75), 2, 1.1 + hash(k, 2) * 0.6]);
        }
        for (let k = 0; k < 3; k++) ates.push([w.x, w.y + 0.04, w.z, (k / 3 + t0 * 2) % 1, Math.max(0.7, s * 0.6), 3, 0.55 + hash(k, 5) * 0.3]);
      });
      if (u.pervane) this.pervaneler.push(u.pervane);
    }
    parcacikDoldur(this.duman, duman);
    parcacikDoldur(this.ates, ates);
    this.susKur(d);
    this.figurKur(d);
  }

  susKur(d) {
    for (const m of this.sus) { this.grup.remove(m); m.dispose(); }
    this.sus = [];
    const n = d.harita.boyut, iz = izgara(d);
    const cag = ({ gocebe: 0, tasdevri: 1, bronz: 2, antik: 3, ortacag: 4 })[d.cag] ?? 0;
    const tipler = cag === 0 ? ['odun', 'tas', 'deri', 'sepet'] : cag === 1 ? ['odun', 'tas', 'sepet', 'balya', 'cit'] : ['fici', 'sandik', 'odun', 'balya', 'cit', 'sepet'];
    const yerler = Object.fromEntries(SUS_TIPLERI.map((t) => [t, []]));
    const goruldu = new Set();
    for (const b of d.binalar) {
      const [g, h] = BINA[b.id].boyut;
      for (let y = b.y - 1; y <= b.y + h; y++) for (let x = b.x - 1; x <= b.x + g; x++) {
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const i = y * n + x;
        if (goruldu.has(i) || iz[i]) continue;
        goruldu.add(i);
        const karo = gorunurKaro(d, x, y);
        if (karo !== 'cimen' && karo !== 'verimli') continue;
        const r = hash(x * 7 + 3, y * 11 + 5);
        if (r > 0.38) continue;
        const tip = tipler[Math.floor(hash(x, y + 99) * tipler.length)];
        yerler[tip].push([x + 0.25 + hash(x, y + 1) * 0.5, y + 0.25 + hash(x + 1, y) * 0.5, hash(x + 2, y + 3) * 6.28]);
      }
    }
    const mat = binaMat();
    for (const [tip, liste] of Object.entries(yerler)) {
      if (!liste.length) continue;
      const im = new THREE.InstancedMesh(susGeo(tip), mat, liste.length);
      liste.forEach(([x, z, ry], i) => {
        this.q.setFromAxisAngle(this.Y, ry);
        this.m4.compose(this.v.set(x, 0, z), this.q, this.s.set(1, 1, 1));
        im.setMatrixAt(i, this.m4);
      });
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = true; im.receiveShadow = true;
      im.computeBoundingSphere();
      this.grup.add(im);
      this.sus.push(im);
    }
  }

  figurKur(d) {
    const atama = etkinAtama(d);
    const merkez = d.binalar.find((b) => BINA[b.id].tur === 'merkez');
    const yuvalar = [];
    for (const b of d.binalar) {
      const n = Math.min(4, atama[b.uid] || 0);
      const [g, h] = BINA[b.id].boyut;
      for (let i = 0; i < n; i++) yuvalar.push({ cx: b.x + g / 2, cz: b.y + h / 2, r: g / 2 + 0.16 + hash(i, b.x) * 0.1, calis: true });
    }
    if (merkez) {
      const [g] = BINA[merkez.id].boyut;
      let serbest = 0;
      for (const [k, v] of Object.entries(atama)) if (k.startsWith('serbest:')) serbest += v;
      serbest += issizSayisi(d);
      for (let i = 0; i < Math.min(16, serbest); i++) yuvalar.push({ cx: merkez.x + g / 2, cz: merkez.y + g / 2, r: g / 2 + 0.5 + hash(i, 77) * 1.6, calis: false });
    }
    const eski = this.figurler;
    this.figurler = yuvalar.slice(0, FIGUR_MAX).map((y, i) => {
      const o = eski[i];
      const aci = o && Math.hypot(o.cx - y.cx, o.cz - y.cz) < 0.01 ? o.aci : hash(i, 3) * 6.28;
      return { ...y, aci, hedef: aci + (hash(i, 4) - 0.5) * 3, bekle: hash(i, 5) * 2, hiz: 0.22 + hash(i, 6) * 0.12, faz: hash(i, 8) * 10 };
    });
    this.figurGovde.count = this.figurBas.count = this.figurler.length;
    this.figurGovde.instanceColor.needsUpdate = true;
    this.figurBas.instanceColor.needsUpdate = true;
    if (merkez) this.kusMerkez.set(merkez.x + 1, 3.2, merkez.y + 1);
  }

  // dt saniye, t toplam süre
  tik(dt, t, hedef) {
    this.kar.material.uniforms.uMerkez.value.copy(hedef);
    for (const p of this.pervaneler) p.rotation.z -= dt * 0.9;
    const { m4, q, v, s, Y } = this;
    this.figurler.forEach((f, i) => {
      let y = ZEMIN_Y, yon;
      if (f.bekle > 0) {
        f.bekle -= dt;
        if (f.calis) y += Math.abs(Math.sin(t * 7 + f.faz)) * 0.012; // çalışma (eğil-kalk)
        yon = f.aci + Math.PI; // binaya dön
        if (f.bekle <= 0) f.hedef = f.aci + (hash(i, Math.floor(t)) > 0.5 ? 1 : -1) * (0.6 + hash(i + 1, Math.floor(t)) * 2.2);
      } else {
        const fark = f.hedef - f.aci, adim = (f.hiz * dt) / f.r;
        if (Math.abs(fark) <= adim) { f.aci = f.hedef; f.bekle = (f.calis ? 2 : 1) + hash(i, Math.floor(t * 3)) * 3; }
        else f.aci += Math.sign(fark) * adim;
        y += Math.abs(Math.sin(t * 11 + f.faz)) * 0.012; // yürüme sekmesi
        yon = f.aci + Math.sign(fark) * Math.PI / 2;
      }
      const x = f.cx + Math.cos(f.aci) * f.r, z = f.cz + Math.sin(f.aci) * f.r;
      q.setFromAxisAngle(Y, -yon + Math.PI / 2);
      m4.compose(v.set(x, y, z), q, s.set(1.3, 1.3, 1.3));
      this.figurGovde.setMatrixAt(i, m4);
      this.figurBas.setMatrixAt(i, m4);
    });
    if (this.figurler.length) { this.figurGovde.instanceMatrix.needsUpdate = true; this.figurBas.instanceMatrix.needsUpdate = true; }
    // kuşlar: merkez üstünde gevşek daire
    for (let i = 0; i < 7; i++) {
      const a = t * (0.18 + i * 0.012) + i * 0.9, r = 2.2 + (i % 3) * 0.9;
      const kanat = Math.sin(t * 9 + i * 2) * 0.6;
      q.setFromAxisAngle(Y, -a);
      m4.compose(v.set(this.kusMerkez.x + Math.cos(a) * r, this.kusMerkez.y + (i % 4) * 0.35 + Math.sin(t + i) * 0.15, this.kusMerkez.z + Math.sin(a) * r), q, s.set(1, 1 + kanat, 1));
      this.kus.setMatrixAt(i, m4);
    }
    this.kus.instanceMatrix.needsUpdate = true;
  }
}

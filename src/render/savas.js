// Görsel otomatik savaş sahnesi (docs/SAVAS.md §7; F1 = Ayı Avı). Çekirdeğin `savasOlayListesi` çıktısını YALNIZ OKUR ve oynatır.
// Ayrı küçük sahne (köy sahnesi bu sırada çizilmez; renderer paylaşılır). Durumsuz oynatıcı: her karede görüntü yalnız zaman τ'nın
// (tick) saf fonksiyonudur → `sar(saniye)` / ATLA / 2× sorunsuz; olay listesi değişmez.
// Sanat: BD stiline uyumlu cel ışığı (3 bantlı toon) + koyu kahve dış çizgi (ters kabuk), Göçebe çağ siluetleri (deri yelek, taş uçlu
// sivri mızrak, kısa yay, tüy), takım bandı altın (#ffd34d), kahraman: pelerin + altın tüy + ayak halkası, ayı: iri öne eğik omuz kamburu.
// Bütçe: figürler parça başına tek InstancedMesh (ayak/kol çift örnek), ≤ 60 figür, ≈ 40 çizim çağrısı + gölge geçişi, ses yok.
import * as THREE from 'three';
import { savasOlayListesi } from '../core/savas.js';

const TICK_SN = 0.5;
const GIRIS = 5;                    // giriş (VS bandı + kamera süzülmesi), tick
const MAX = 40;                     // tarafa göre değil, toplam insan figürü sınırı
const S = 1.38;                     // simülasyon hücresi → dünya birimi
const SX = (x) => x * S - 3.2;
const SZ = (z) => z * S * 1.05;
const RENK = {
  deri: 0xc9a57a, koyuDeri: 0x8a6a48, ten: 0xd9a77c, sac: 0x3b2a1e, sap: 0x6b4a2c, tas: 0x8f8a80, altin: 0xffd34d, kumas: 0xa8432f,
  ayi: 0x6a4a30, ayiAcik: 0x9a7552, cizgi: 0x2a1d14, yay: 0x7a5634, tuy: 0xf2efe6, onder: 0x7c3b2a, gri: 0x8a8580,
};
const MEVSIM_ZEMIN = { bahar: [0x6fae4a, 0x5c9440], yaz: [0x8fb24a, 0x77983c], guz: [0xb58a3a, 0x9a7330], kis: [0xe6edf3, 0xc9d3dc] };

// ---------- yardımcılar ----------
let TOON = null;
function toonRampa() {
  if (TOON) return TOON;
  const v = new Uint8Array([70, 150, 215, 255]);
  TOON = new THREE.DataTexture(v, v.length, 1, THREE.RedFormat);
  TOON.minFilter = TOON.magFilter = THREE.NearestFilter;
  TOON.needsUpdate = true;
  return TOON;
}
const toonMat = (o = {}) => new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonRampa(), ...o });
// Ters kabuk dış çizgisi: köşeyi normal yönünde iter, arka yüz, düz koyu kahve.
function cizgiMat(kalin = 0.022) {
  const m = new THREE.MeshBasicMaterial({ color: RENK.cizgi, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uKalin = { value: kalin };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uKalin;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uKalin;');
  };
  return m;
}
const yassi = (g) => { g.computeVertexNormals(); return g; };
function kutu(a, b, c, y = 0) { const g = new THREE.BoxGeometry(a, b, c); g.translate(0, y, 0); return g; }
// Parça başına InstancedMesh (+ isteğe bağlı dış çizgi; aynı örnek matrisini paylaşır).
function parca(grup, geo, adet, { cizgi = 0, golge = true, mat = null } = {}) {
  const m = new THREE.InstancedMesh(geo, mat || toonMat(), adet);
  m.count = 0; m.frustumCulled = false; m.castShadow = golge; m.receiveShadow = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.setColorAt(0, new THREE.Color(1, 1, 1));
  m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  grup.add(m);
  let c = null;
  if (cizgi) {
    c = new THREE.InstancedMesh(geo, cizgiMat(cizgi), adet);
    c.instanceMatrix = m.instanceMatrix;
    c.count = 0; c.frustumCulled = false;
    grup.add(c);
  }
  return { m, c, i: 0 };
}
const M4 = new THREE.Matrix4(), M5 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(),
  SC = new THREE.Vector3(1, 1, 1), C = new THREE.Color(), C2 = new THREE.Color();
const yerel = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => {
  E.set(rx, ry, rz); Q.setFromEuler(E); V.set(x, y, z); SC.set(s, s, s);
  return M5.compose(V, Q, SC);
};
const kir = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const yumu = (x) => { const t = kir(x); return t * t * (3 - 2 * t); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- geometri: insan figürü (yerel ileri = +z) ----------
function insanGeo() {
  const g = {};
  g.bacak = kutu(0.12, 0.42, 0.14, -0.21);
  const govde = new THREE.CylinderGeometry(0.155, 0.12, 0.44, 6, 1);
  govde.translate(0, 0.22, 0);
  // yelek eteği: alt kenar hafif genişler (Göçebe deri)
  const etek = new THREE.CylinderGeometry(0.15, 0.19, 0.13, 6, 1, true); etek.translate(0, 0.02, 0);
  g.govde = yassi(birlesik([govde, etek]));
  g.kusak = kutu(0.34, 0.075, 0.33, 0); g.kusak.rotateZ(0.6); g.kusak.translate(0, 0.27, 0); // altın omuz kuşağı (takım bandı)
  g.bas = new THREE.IcosahedronGeometry(0.125, 0); g.bas.scale(1, 1.08, 1);
  const sac = new THREE.SphereGeometry(0.135, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.5); sac.translate(0, 0.02, -0.012);
  const at = new THREE.BoxGeometry(0.09, 0.16, 0.06); at.translate(0, -0.06, -0.12); // at kuyruğu saç
  g.sac = yassi(birlesik([sac, at]));
  g.kol = kutu(0.085, 0.38, 0.1, -0.17);
  // mızrak: sivri sopa (yerel +y yukarı; ele takılınca öne çevrilir)
  g.sap = new THREE.CylinderGeometry(0.018, 0.024, 1.5, 5, 1); g.sap.translate(0, 0.42, 0);
  g.uc = new THREE.ConeGeometry(0.05, 0.2, 4, 1); g.uc.translate(0, 1.26, 0);
  // kısa yay: yay ortası elde, uçlar okçuya doğru; düzlem = yukarı + ileri
  const yay = new THREE.TorusGeometry(0.5, 0.024, 4, 10, Math.PI * 0.6); yay.rotateZ(Math.PI - Math.PI * 0.3); yay.rotateY(Math.PI / 2); yay.translate(0, 0, -0.5);
  const kiris = new THREE.CylinderGeometry(0.006, 0.006, 0.8, 3); kiris.translate(0, 0, -0.21);
  g.yay = yassi(birlesik([yay, kiris]));
  g.tuy = new THREE.ConeGeometry(0.03, 0.26, 4, 1); g.tuy.rotateX(-0.5); g.tuy.translate(0, 0.14, -0.1);
  const pel = new THREE.CylinderGeometry(0.17, 0.3, 0.62, 7, 1, true, Math.PI * 0.62, Math.PI * 0.76); pel.translate(0, -0.06, 0);
  g.pelerin = yassi(pel);
  g.golge = new THREE.CircleGeometry(0.34, 12).rotateX(-Math.PI / 2);
  return g;
}
function birlesik(liste) {
  // basit birleştirme (index'li geometri → index'siz) — BufferGeometryUtils'e bağımlı olmamak için
  const pos = [], nor = [];
  for (const g0 of liste) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    g.computeVertexNormals();
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
  }
  const b = new THREE.BufferGeometry();
  b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  b.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return b;
}

// ---------- geometri: ayı (yerel ileri = +z) ----------
function ayiGeo() {
  const govde = new THREE.IcosahedronGeometry(0.62, 1);
  const p = govde.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    x *= 0.82; z *= 1.32;
    // omuz kamburu (önde yüksek), kalça alçak: öne eğik siluet
    if (y > 0) y *= 1 + 0.45 * kir((z + 0.2) / 0.8) - 0.18 * kir(-z / 0.8);
    y -= z < 0 ? 0.08 * (-z) : 0;
    p.setXYZ(i, x, y + 0.98, z);
  }
  const bas = new THREE.IcosahedronGeometry(0.33, 0); bas.scale(0.95, 0.86, 1.05); bas.translate(0, 1.02, 0.98);
  const burun = new THREE.CylinderGeometry(0.12, 0.16, 0.26, 6); burun.rotateX(Math.PI / 2); burun.translate(0, 0.94, 1.26);
  const kulakL = new THREE.ConeGeometry(0.09, 0.14, 4); kulakL.translate(-0.2, 1.3, 0.92);
  const kulakR = kulakL.clone(); kulakR.translate(0.4, 0, 0);
  const bacak = new THREE.CylinderGeometry(0.15, 0.13, 0.62, 6); bacak.translate(0, -0.31, 0);
  const pence = new THREE.BoxGeometry(0.22, 0.1, 0.28); pence.translate(0, -0.62, 0.05);
  return { govde: yassi(birlesik([govde])), bas: yassi(birlesik([bas, kulakL, kulakR])), burun: yassi(birlesik([burun])),
    bacak: yassi(birlesik([bacak, pence])) };
}

// ---------- rakam atlası (hasar sayıları) ----------
function rakamAtlasi() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 64;
  const x = cv.getContext('2d');
  x.font = '900 52px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) {
    x.lineWidth = 9; x.strokeStyle = '#2a1d14'; x.strokeText(String(i), i * 51.2 + 25.6, 34);
    x.fillStyle = '#ffffff'; x.fillText(String(i), i * 51.2 + 25.6, 34);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const RAKAM_MAX = 48;
function rakamKatmani() {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.62, 0, 0.5, -0.62, 0, 0.5, 0.62, 0, -0.5, 0.62, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const a = (n, k) => { const b = new THREE.InstancedBufferAttribute(new Float32Array(RAKAM_MAX * k), k); b.setUsage(THREE.DynamicDrawUsage); g.setAttribute(n, b); return b; };
  const at = { merkez: a('aMerkez', 3), veri: a('aVeri', 4), renk: a('aRenk', 3) }; // veri: rakam, kayma, ölçek, opaklık
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uDoku: { value: rakamAtlasi() } }, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: `attribute vec3 aMerkez; attribute vec4 aVeri; attribute vec3 aRenk; varying vec2 vUv; varying vec3 vRenk; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(aMerkez,1.0); mv.xy += (position.xy + vec2(aVeri.y,0.0)) * aVeri.z;
        gl_Position = projectionMatrix * mv; vUv = vec2((aVeri.x + uv.x) / 10.0, uv.y); vRenk = aRenk; vA = aVeri.w; }`,
    fragmentShader: `uniform sampler2D uDoku; varying vec2 vUv; varying vec3 vRenk; varying float vA;
      void main(){ vec4 c = texture2D(uDoku, vUv); float beyaz = smoothstep(0.55, 0.9, c.r);
        gl_FragColor = vec4(mix(vec3(0.165,0.114,0.08), vRenk, beyaz), c.a * vA); }`,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.renderOrder = 30;
  return { m, g, at };
}

// =====================================================================================================
export class SavasSahnesi {
  constructor(sahne) {
    this.s = sahne;
    this.aktif = false;
    this.sahne = new THREE.Scene();
    this.sahne.background = new THREE.Color(0x9fb7c9);
    this.sahne.fog = new THREE.Fog(0x9fb7c9, 26, 52);
    this.kamera = new THREE.PerspectiveCamera(30, 2, 0.5, 120);
    this.hiz = 1; this.tau = -GIRIS; this.durdu = false; this.bittiBildirildi = false;
    this.isikKur();
    this.zeminKur();
    this.figurKur();
    this.efektKur();
    this.boyut();
  }

  isikKur() {
    this.hemi = new THREE.HemisphereLight(0xdfeeff, 0x6b5a3a, 1.25);
    this.gunes = new THREE.DirectionalLight(0xfff0d6, 2.6);
    this.gunes.position.set(-6, 14, 8);
    this.gunes.castShadow = true;
    const g = this.gunes.shadow;
    g.mapSize.set(1024, 1024);
    Object.assign(g.camera, { left: -11, right: 11, top: 8, bottom: -8, near: 1, far: 40 });
    g.bias = -0.0008; g.normalBias = 0.03;
    this.arka = new THREE.DirectionalLight(0xffd7a0, 0.9); // sıcak kenar ışığı (BD altın saat)
    this.arka.position.set(8, 6, -10);
    this.sahne.add(this.hemi, this.gunes, this.gunes.target, this.arka);
  }

  // Arena: hafif dalgalı çim yaması, toprak dövüş alanı, orman kenarı (arkada + sağda), kayalar, çalılar.
  zeminKur() {
    const g = new THREE.PlaneGeometry(46, 30, 46, 30).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const renk = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const y = Math.sin(x * 0.35) * 0.12 + Math.cos(z * 0.5 + x * 0.2) * 0.1 + (z < -6 ? (-z - 6) * 0.18 : 0);
      p.setY(i, y);
    }
    g.setAttribute('color', new THREE.BufferAttribute(renk, 3));
    g.computeVertexNormals();
    this.zemin = new THREE.Mesh(g, toonMat({ vertexColors: true }));
    this.zemin.receiveShadow = true;
    this.sahne.add(this.zemin);
    this.cevreGrup = new THREE.Group();
    this.sahne.add(this.cevreGrup);
    // ağaçlar: gövde + iki katlı koni taç (iğne yapraklı) — orman kenarı
    const govde = new THREE.CylinderGeometry(0.12, 0.18, 1.1, 5); govde.translate(0, 0.55, 0);
    const tac = birlesik([new THREE.ConeGeometry(0.95, 1.6, 6).translate(0, 1.7, 0), new THREE.ConeGeometry(0.7, 1.3, 6).translate(0, 2.55, 0)]);
    const yerler = [];
    for (let i = 0; i < 46; i++) {
      const a = hash(i + 1), b = hash(i + 50);
      let x, z;
      if (i < 30) { x = -20 + a * 40; z = -8.5 - b * 6; } else { x = 12.5 + b * 7; z = -7 + a * 13; }
      yerler.push([x, z, 0.8 + hash(i + 90) * 0.7]);
    }
    this.agacGovde = new THREE.InstancedMesh(govde, toonMat({ color: 0x6b4a2c }), yerler.length);
    this.agacTac = new THREE.InstancedMesh(tac, toonMat({ color: 0x3f7a3a }), yerler.length);
    yerler.forEach(([x, z, s], i) => {
      M4.compose(V.set(x, 0, z), Q.setFromEuler(E.set(0, hash(i) * 6, 0)), SC.set(s, s * (0.9 + hash(i + 7) * 0.3), s));
      this.agacGovde.setMatrixAt(i, M4); this.agacTac.setMatrixAt(i, M4);
      this.agacTac.setColorAt(i, C.setHex(0x3f7a3a).offsetHSL((hash(i + 3) - 0.5) * 0.04, 0, (hash(i + 4) - 0.5) * 0.08));
    });
    for (const m of [this.agacGovde, this.agacTac]) { m.castShadow = true; this.cevreGrup.add(m); }
    // kayalar + çalılar
    const kaya = new THREE.DodecahedronGeometry(0.5, 0);
    const kayaYer = [[-9, 3.5, 0.9], [8.8, -4.6, 1.3], [10.5, 4.8, 0.8], [-12, -4, 1.4], [3, 6.8, 0.6], [-4, -6.5, 0.7]];
    this.kaya = new THREE.InstancedMesh(kaya, toonMat({ color: 0x8f8a80 }), kayaYer.length);
    kayaYer.forEach(([x, z, s], i) => { M4.compose(V.set(x, 0.15 * s, z), Q.setFromEuler(E.set(hash(i), hash(i + 1) * 6, 0)), SC.set(s, s * 0.7, s)); this.kaya.setMatrixAt(i, M4); });
    this.kaya.castShadow = true;
    const cali = new THREE.IcosahedronGeometry(0.45, 0);
    this.cali = new THREE.InstancedMesh(cali, toonMat({ color: 0x4f8a3a }), 22);
    for (let i = 0; i < 22; i++) {
      const x = -16 + hash(i + 200) * 32, z = (hash(i + 300) > 0.5 ? 1 : -1) * (5.2 + hash(i + 400) * 3.5);
      const s = 0.6 + hash(i + 500) * 0.6;
      M4.compose(V.set(x, 0.2, z), Q.identity(), SC.set(s * 1.3, s * 0.8, s)); this.cali.setMatrixAt(i, M4);
    }
    // çim tutamları (kış hariç)
    const ot = new THREE.ConeGeometry(0.06, 0.35, 3); ot.translate(0, 0.17, 0);
    this.ot = new THREE.InstancedMesh(ot, toonMat({ color: 0x6f9a3e }), 140);
    for (let i = 0; i < 140; i++) {
      const x = -18 + hash(i + 700) * 36, z = -7 + hash(i + 800) * 15;
      if (Math.abs(z) < 2.4 && Math.abs(x) < 9) { M4.makeScale(0, 0, 0); this.ot.setMatrixAt(i, M4); continue; }
      M4.compose(V.set(x, 0, z), Q.setFromEuler(E.set((hash(i) - 0.5) * 0.5, 0, (hash(i + 1) - 0.5) * 0.5)), SC.set(1, 0.7 + hash(i + 2), 1));
      this.ot.setMatrixAt(i, M4);
    }
    this.cevreGrup.add(this.kaya, this.cali, this.ot);
  }

  mevsimUygula(mevsim = 'yaz') {
    const [a, b] = MEVSIM_ZEMIN[mevsim] || MEVSIM_ZEMIN.yaz;
    const ca = new THREE.Color(a), cb = new THREE.Color(b), toprak = new THREE.Color(mevsim === 'kis' ? 0xb9b2a6 : 0x9a7a4a);
    const p = this.zemin.geometry.attributes.position, r = this.zemin.geometry.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const n = hash(Math.floor(x * 0.9) * 31 + Math.floor(z * 0.9) * 7);
      const buyuk = 0.5 + 0.5 * Math.sin(x * 0.23 + Math.cos(z * 0.31) * 2.1) * Math.cos(z * 0.27 - x * 0.07);
      C.copy(ca).lerp(cb, n * 0.45 + buyuk * 0.65);
      // dövüş alanı: ezilmiş toprak elips (ortası)
      const e = Math.hypot((x - 1) / 9.5, z / 3.6);
      if (e < 1) C.lerp(toprak, (1 - yumu((e - 0.55) / 0.45)) * 0.85);
      r.setXYZ(i, C.r, C.g, C.b);
    }
    r.needsUpdate = true;
    const kis = mevsim === 'kis';
    this.agacTac.material.color.setHex(kis ? 0x6f8f7a : mevsim === 'guz' ? 0x8a6a30 : 0xffffff);
    this.cali.material.color.setHex(kis ? 0xdfe6ea : mevsim === 'guz' ? 0xa0742e : 0x4f8a3a);
    this.ot.visible = !kis;
    this.ot.material.color.setHex(mevsim === 'guz' ? 0xa88a3e : 0x6f9a3e);
    const gok = kis ? 0xc7d3de : mevsim === 'guz' ? 0xd8b98e : 0xa9c4d6;
    this.sahne.background.setHex(gok); this.sahne.fog.color.setHex(gok);
    this.gunes.color.setHex(kis ? 0xe8f0ff : mevsim === 'guz' ? 0xffd2a0 : 0xfff0d6);
  }

  figurKur() {
    const g = insanGeo();
    this.fg = new THREE.Group();
    this.sahne.add(this.fg);
    this.p = {
      golge: parca(this.fg, g.golge, MAX + 1, { golge: false, mat: new THREE.MeshBasicMaterial({ color: 0x1a120c, transparent: true, opacity: 0.28, depthWrite: false }) }),
      bacak: parca(this.fg, g.bacak, MAX * 2, { cizgi: 0.018 }),
      govde: parca(this.fg, g.govde, MAX, { cizgi: 0.02 }),
      kusak: parca(this.fg, g.kusak, MAX, { golge: false }),
      bas: parca(this.fg, g.bas, MAX, { cizgi: 0.02 }),
      sac: parca(this.fg, g.sac, MAX, { golge: false }),
      kol: parca(this.fg, g.kol, MAX * 2, { cizgi: 0.016 }),
      sap: parca(this.fg, g.sap, MAX, { cizgi: 0.012 }),
      uc: parca(this.fg, g.uc, MAX, { golge: false }),
      yay: parca(this.fg, g.yay, MAX, { cizgi: 0.012 }),
      tuy: parca(this.fg, g.tuy, MAX, { golge: false }),
      pelerin: parca(this.fg, g.pelerin, 6, { cizgi: 0.016, mat: toonMat({ side: THREE.DoubleSide }) }),
    };
    this.p.golge.m.renderOrder = 1;
    // ayı
    const a = ayiGeo();
    this.ayi = new THREE.Group();
    this.ayiGovde = new THREE.Mesh(a.govde, toonMat({ color: RENK.ayi }));
    this.ayiBas = new THREE.Group();
    this.ayiBas.add(new THREE.Mesh(a.bas, toonMat({ color: RENK.ayi })), new THREE.Mesh(a.burun, toonMat({ color: RENK.ayiAcik })));
    this.ayiBas.children.forEach((m) => { m.position.set(0, -1.0, -0.9); });
    this.ayiBas.position.set(0, 1.0, 0.9);
    const cz = cizgiMat(0.03);
    for (const m of [this.ayiGovde, ...this.ayiBas.children]) {
      m.castShadow = true;
      const o = new THREE.Mesh(m.geometry, cz); o.position.copy(m.position); m.parent ? m.parent.add(o) : null;
      if (m === this.ayiGovde) this.ayiGovdeCizgi = o;
    }
    this.ayi.add(this.ayiGovde, this.ayiGovdeCizgi, this.ayiBas);
    this.ayiBacak = parca(this.ayi, a.bacak, 4, { cizgi: 0.025 });
    this.ayiBacak.m.count = this.ayiBacak.c.count = 4;
    for (let i = 0; i < 4; i++) this.ayiBacak.m.setColorAt(i, C.setHex(RENK.ayi).multiplyScalar(0.85));
    const ayiGolge = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x1a120c, transparent: true, opacity: 0.3, depthWrite: false }));
    ayiGolge.scale.set(0.9, 1, 1.5); ayiGolge.position.y = 0.03;
    this.ayiGolge = ayiGolge;
    this.sahne.add(this.ayi, ayiGolge);
    // kahraman ayak halkası (altın) + yetenek dalgası
    this.halka = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: RENK.altin, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    this.dalga = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.halka.renderOrder = this.dalga.renderOrder = 2;
    this.sahne.add(this.halka, this.dalga);
  }

  efektKur() {
    // ok / sapan taşı
    const ok = birlesik([new THREE.CylinderGeometry(0.012, 0.012, 0.55, 3).rotateX(Math.PI / 2), new THREE.ConeGeometry(0.035, 0.1, 3).rotateX(Math.PI / 2).translate(0, 0, 0.3)]);
    this.ok = parca(this.sahne, ok, 24, { golge: false, mat: new THREE.MeshBasicMaterial({ color: 0x3a2a1c }) });
    // kıvılcım / vuruş parçacığı
    this.kivilcim = parca(this.sahne, new THREE.TetrahedronGeometry(0.07), 48, { golge: false,
      mat: new THREE.MeshBasicMaterial({ color: 0xffe6a0, toneMapped: false }) });
    // toz bulutu
    this.toz = parca(this.sahne, new THREE.IcosahedronGeometry(0.22, 0), 32, { golge: false,
      mat: new THREE.MeshBasicMaterial({ color: 0xc9b08a, transparent: true, opacity: 0.55, depthWrite: false }) });
    // sersem yıldızları
    this.yildiz = parca(this.sahne, new THREE.OctahedronGeometry(0.09), 6, { golge: false, mat: new THREE.MeshBasicMaterial({ color: 0xffe066, toneMapped: false }) });
    this.rakam = rakamKatmani();
    this.sahne.add(this.rakam.m);
  }

  boyut() {
    const c = this.s.canvas;
    this.kamera.aspect = (c.clientWidth || innerWidth) / (c.clientHeight || innerHeight);
    this.kamera.updateProjectionMatrix();
  }

  // ---------- oynatma ----------
  oynat(liste0, sec = {}) {
    // Girdi (durum.savas.son[] öğesi) de verilebilir: olay listesi çekirdekten saf olarak üretilir.
    const liste = liste0?.olaylar ? liste0 : liste0?.liste?.olaylar ? liste0.liste : savasOlayListesi(liste0?.girdi || liste0);
    this.liste = liste;
    this.sec = sec;
    this.hiz = sec.hiz === 2 ? 2 : 1;
    this.tau = sec.atla ? liste.tick : -GIRIS;
    this.durdu = false; this.bittiBildirildi = false;
    this.mevsimUygula(sec.mevsim);
    this.hazirla(liste);
    this.aktif = true;
    this.boyut();
    if (sec.hud !== false) this.hudKur(); else this.hudKaldir();
    if (sec.arayuzGizle !== false) { const a = document.getElementById('arayuz'); if (a) { this.arayuzOnce = a.style.visibility; a.style.visibility = 'hidden'; } }
    this.s.kirli = true;
    return { hizAyarla: (h) => this.hizAyarla(h), atla: () => this.atla(), kapat: () => this.kapat() };
  }
  hizAyarla(h) { this.hiz = h === 2 ? 2 : 1; this.hudGuncelle(true); }
  atla() { if (this.liste) { this.tau = this.liste.tick; this.durdu = false; } }
  sar(sn) { if (this.liste) { this.tau = sn / TICK_SN - GIRIS; this.durdu = true; } }  // test/hata ayıklama: belirli ana dondur
  kapat() {
    this.aktif = false;
    this.hudKaldir();
    const a = document.getElementById('arayuz');
    if (a && this.arayuzOnce !== undefined) { a.style.visibility = this.arayuzOnce; this.arayuzOnce = undefined; }
    this.s.kirli = true;
    this.s.renderer.shadowMap.needsUpdate = true;
  }
  bilgi() {
    const r = this.s.renderer.info.render;
    return { aktif: this.aktif, tau: this.tau, saniye: (this.tau + GIRIS) * TICK_SN, sure: this.toplamSure(), bitti: this.liste ? this.tau >= this.liste.tick : false,
      cagri: r.calls, ucgen: r.triangles, figur: this.birler?.length || 0, kademe: this.liste?.kademe };
  }
  toplamSure() { return this.liste ? (this.liste.tick + GIRIS) * TICK_SN : 0; }

  // Birim başına olay dizileri ve konum anahtar kareleri (oynatmadan önce bir kez).
  hazirla(liste) {
    const bul = new Map();
    this.birler = [];
    let hi = 0;
    for (const b of liste.birimler) {
      const u = { ...b, wx: SX(b.x), wz: SZ(b.z), hareket: [], vurus: [], saldiri: [], cokme: null, geri: null, zafer: null, kacis: null, sersem: [] };
      if (b.taraf === 'biz') u.hi = hi++;
      bul.set(b.id, u);
      this.birler.push(u);
    }
    this.hedefler = bul;
    this.mermiler = []; this.vuruslar = []; this.yetenekler = [];
    for (const o of liste.olaylar) {
      const k = bul.get(o.k), h = bul.get(o.h);
      if (o.tur === 'yuru' && k) k.hareket.push({ t: o.t, x: SX(o.x), z: SZ(o.z), sure: o.ek?.sicra ? 0.55 : 0.92, sicra: !!o.ek?.sicra });
      else if (o.tur === 'geri_cekil' && h) { h.hareket.push({ t: o.t, x: Math.max(SX(o.x), -7 + (h.hi || 0) * 0.35), z: SZ(o.z ?? 0) + (h.hi % 2 ? 0.5 : -0.5), sure: 3.2, geri: true }); h.geri = o.t; }
      else if (o.tur === 'kacis' && k) { k.hareket.push({ t: o.t, x: SX(o.x), z: SZ(o.z), sure: 4.5, kacis: true }); k.kacis = o.t; }
      else if (o.tur === 'vurus' && h) { h.vurus.push(o); this.vuruslar.push(o); }
      else if ((o.tur === 'saldiri' || o.tur === 'yetenek') && k) { k.saldiri.push(o); if (o.tur === 'yetenek' && !o.ek?.komuta) this.yetenekler.push(o); }
      else if (o.tur === 'mermi' && k && h) this.mermiler.push(o);
      else if (o.tur === 'cokme' && h) h.cokme = o.t;
      else if (o.tur === 'zafer' && k) k.zafer = o.t;
      else if (o.tur === 'sersem' && h) h.sersem.push(o);
    }
    const insan = this.birler.filter((u) => u.taraf === 'biz');
    this.kahraman = insan.find((u) => u.kahraman) || null;
    // renkler (sabit taban; karede vuruş parlaması / çökme grisi uygulanır)
    for (const u of insan) {
      const k = u.kahraman, okcu = u.tur === 'okcu', onder = u.tur === 'onder';
      u.r = {
        govde: k ? 0x8a5a2b : onder ? RENK.onder : okcu ? 0xb08a5e : RENK.deri, bacak: k ? 0x5a3a24 : RENK.koyuDeri, bas: RENK.ten,
        sac: k ? 0x2a1c12 : [RENK.sac, 0x5a3a22, 0x2e2a26][u.hi % 3], kol: RENK.ten, kusak: RENK.altin, sap: RENK.sap, uc: RENK.tas,
        yay: RENK.yay, tuy: k ? RENK.altin : RENK.tuy,
      };
      u.olcek = k ? 1.32 : 1.14;
      u.silah = k ? (u.sinif === 'avci' ? 'yay' : 'mizrak') : okcu ? 'yay' : 'mizrak';
    }
    this.toplam = { biz: insan.reduce((a, u) => a + u.can, 0), onlar: this.birler.filter((u) => u.taraf === 'onlar').reduce((a, u) => a + u.can, 0) };
  }

  // τ anındaki birim durumu (saf).
  durumu(u, t) {
    let x = u.wx, z = u.wz, yuru = 0, sicra = 0, geri = false, kacis = false;
    for (const m of u.hareket) {
      if (m.t > t) break;
      const f = kir((t - m.t) / m.sure);
      const px = x, pz = z;
      x = px + (m.x - px) * (m.sicra ? f : yumu(f) * 0.15 + f * 0.85);
      z = pz + (m.z - pz) * f;
      if (f < 1) { yuru = 1; sicra = m.sicra ? Math.sin(f * Math.PI) : 0; geri = !!m.geri; kacis = !!m.kacis; }
      if (f >= 1) { x = m.x; z = m.z; }
      if (f < 1) { u._yon = Math.atan2(m.x - px, m.z - pz); }
    }
    let can = u.can, sonVurus = -9;
    for (const v of u.vurus) { if (v.t > t) break; can = v.kalan; sonVurus = v.t; }
    let saldiri = -9, sOlay = null;
    for (const s of u.saldiri) { if (s.t > t) break; saldiri = s.t; sOlay = s; }
    const cok = u.cokme !== null && t >= u.cokme ? kir((t - u.cokme) / 0.8) : 0;
    const sersem = u.sersem.some((s) => t >= s.t && t < s.t + (s.ek?.sure || 2) + 1);
    return { x, z, yuru, sicra, geri, kacis, can, vurulma: t - sonVurus, saldiri: t - saldiri, sOlay, cok,
      oturdu: u.geri !== null && t > u.geri + 3.2, zafer: u.zafer !== null && t >= u.zafer ? t - u.zafer : -1, sersem };
  }

  tik(dt) {
    if (!this.aktif || !this.liste) return;
    const L = this.liste;
    if (!this.durdu && this.tau < L.tick + 6) {
      // kahraman yeteneğinde kısa ağır çekim (zaman ×0,3, 0,4 sn)
      const yavas = this.yetenekler.some((y) => this.tau >= y.t && this.tau < y.t + 0.8 && (y.k === this.kahraman?.id));
      this.tau += (dt / TICK_SN) * this.hiz * (yavas ? 0.3 : 1);
    }
    this.ciz(this.tau, performance.now() / 1000);
    if (this.tau >= L.tick && !this.bittiBildirildi) {
      this.bittiBildirildi = true;
      this.sonucGoster();
      try { this.sec.onBitti?.({ kademe: L.kademe, kademeAd: L.kademeAd, ozet: L.ozet }); } catch (e) { console.warn('[savas.onBitti]', e); }
    }
    this.hudGuncelle();
  }

  ciz(t, sn) {
    for (const k of Object.values(this.p)) k.i = 0;
    const tt = Math.max(t, 0);
    let bizCan = 0, onlarCan = 0;
    for (const u of this.birler) u.st = this.durumu(u, tt);
    const dus = this.birler.find((u) => u.taraf === 'onlar');
    // ayı en yakın ayaktaki ekip üyesine döner
    let yakin = null, yd = Infinity;
    for (const u of this.birler) if (u.taraf === 'biz' && !u.st.cok) { const d = Math.hypot(u.st.x - dus.st.x, u.st.z - dus.st.z); if (d < yd) { yd = d; yakin = u; } }
    this.ayiHedef = yakin;
    for (const u of this.birler) {
      const st = u.st;
      if (u.taraf === 'biz') { bizCan += st.can; this.insanCiz(u, st, t, sn, dus.st); } else { onlarCan += st.can; this.ayiCiz(u, st, t, sn); }
    }
    this.canlar = { biz: bizCan, onlar: onlarCan };
    for (const k of Object.values(this.p)) {
      k.m.count = k.i; if (k.c) k.c.count = k.i;
      k.m.instanceMatrix.needsUpdate = true; if (k.m.instanceColor) k.m.instanceColor.needsUpdate = true;
    }
    this.efektCiz(t < 0 ? -99 : tt, sn); // girişte (VS bandı) efekt yok
    this.kameraCiz(t, sn);
  }

  ekle(pk, mat, renk) {
    if (pk.i >= pk.m.instanceMatrix.count) return;
    pk.m.setMatrixAt(pk.i, mat);
    pk.m.setColorAt(pk.i, renk);
    pk.i++;
  }

  insanCiz(u, st, t, sn, dst) {
    const P = this.p;
    const nefes = Math.sin(sn * 2.2 + u.hi) * 0.012;
    const adim = st.yuru ? Math.sin((t * 2.4 + u.hi * 0.7) * Math.PI) : 0;
    // yön: ileri (+x) bakar; geri çekilirken arkaya, otururken yan
    // yüz düşmana döner (yürürken yürüdüğü yöne, geri çekilirken arkaya)
    let yaw = dst ? Math.atan2(dst.x - st.x, (dst.z - st.z) * 0.6) : Math.PI / 2;
    if (st.zafer >= 0 && dst) yaw = Math.PI / 2 - 0.35;
    if (st.geri) yaw = -Math.PI / 2;
    if (st.oturdu) yaw = Math.PI / 2 - 0.5;
    const vur = st.vurulma < 0.35 ? 1 - st.vurulma / 0.35 : 0;
    const geriIt = vur * 0.12;
    const cok = st.cok;
    const zafer = st.zafer >= 0 ? Math.abs(Math.sin(st.zafer * 3)) * 0.12 : 0;
    const y0 = Math.abs(adim) * 0.05 + zafer - cok * 0.3 - (st.oturdu ? 0.08 : 0);
    const egim = cok * 0.55 + (st.oturdu ? -0.2 : 0);
    const s = u.olcek;
    M4.compose(V.set(st.x - geriIt, y0, st.z), Q.setFromEuler(E.set(0, yaw, 0)), SC.set(s, s, s));
    const kok = M4.clone();
    // gölge lekesi
    this.ekle(P.golge, M5.makeTranslation(st.x, 0.03, st.z).multiply(new THREE.Matrix4().makeScale(s, 1, s)), C.setRGB(1, 1, 1));
    // renk: vuruşta beyaz parlama, çöküşte gri
    const renk = (hex) => { C.setHex(hex); if (cok) C.lerp(C2.setHex(RENK.gri), cok * 0.55); if (vur) C.lerp(C2.setRGB(1, 1, 1), vur * 0.75); return C; };
    // bacaklar (adımda salınım; çökünce diz)
    for (const yan of [-1, 1]) {
      const a = st.oturdu ? -1.35 : adim * 0.55 * yan - cok * (yan > 0 ? 1.2 : 0.2);
      this.ekle(P.bacak, M5.multiplyMatrices(kok, yerel(0.08 * yan, 0.42, 0, a, 0, 0)), renk(u.r.bacak));
    }
    const g = M5.multiplyMatrices(kok, yerel(0, 0.42, 0, egim, 0, 0));
    const govde = g.clone();
    this.ekle(P.govde, govde, renk(u.r.govde));
    this.ekle(P.kusak, govde, renk(u.r.kusak));
    const basM = new THREE.Matrix4().multiplyMatrices(govde, yerel(0, 0.55 + nefes, 0.01, 0, 0, 0));
    this.ekle(P.bas, basM, renk(u.r.bas));
    this.ekle(P.sac, basM, renk(u.r.sac));
    if (u.kahraman || u.tur === 'okcu' || u.hi % 2 === 0) this.ekle(P.tuy, basM, renk(u.r.tuy));
    if (u.kahraman && P.pelerin.i < 6) {
      const dalga = Math.sin(sn * 3) * 0.06 + (st.yuru ? 0.25 : 0.08);
      this.ekle(P.pelerin, new THREE.Matrix4().multiplyMatrices(govde, yerel(0, 0.42, -0.02, -dalga, 0, 0)), renk(RENK.kumas));
    }
    // kollar + silah
    const sal = st.saldiri < 0.7 ? st.saldiri / 0.7 : 1;  // 0 → 1
    const okcu = u.silah === 'yay';
    const darbe = sal < 1 ? Math.sin(sal * Math.PI) : 0;
    const zk = st.zafer >= 0 ? 2.6 + Math.sin(st.zafer * 6) * 0.2 : 0;
    // sağ kol: mızrak dürtme (öne) / yay çekme (geri)
    const sagA = zk ? -zk : okcu ? -1.45 + darbe * 0.25 : -0.75 - darbe * 0.7 + adim * 0.2;
    const sag = new THREE.Matrix4().multiplyMatrices(govde, yerel(0.2, 0.38, okcu ? -0.03 - darbe * 0.12 : darbe * 0.18, sagA - cok * -0.6, 0, -0.08));
    this.ekle(P.kol, sag, renk(u.r.kol));
    const solA = zk ? -zk * 0.9 : okcu ? -1.5 : -0.35 - adim * 0.3;
    const sol = new THREE.Matrix4().multiplyMatrices(govde, yerel(-0.2, 0.38, 0, solA, 0, 0.1));
    this.ekle(P.kol, sol, renk(u.r.kol));
    if (okcu) {
      const el = new THREE.Matrix4().multiplyMatrices(sol, yerel(0, -0.36, 0.02, Math.PI / 2 - solA - 1.57, 0, 0));
      this.ekle(P.yay, el, renk(u.r.yay));
    } else {
      // mızrak öne-yukarı (dürtmede yataylaşır)
      const el = new THREE.Matrix4().multiplyMatrices(sag, yerel(0, -0.34, 0, -sagA + 1.2 + darbe * 0.3 + (cok ? 0.7 : 0), 0, 0));
      this.ekle(P.sap, el, renk(u.r.sap));
      this.ekle(P.uc, el, renk(u.r.uc));
    }
  }

  ayiCiz(u, st, t, sn) {
    const a = this.ayi;
    const adim = st.yuru ? Math.sin(t * 2.6 * Math.PI) : 0;
    const sal = st.saldiri < 0.9 ? st.saldiri / 0.9 : 1;
    const darbe = sal < 1 ? Math.sin(sal * Math.PI) : 0;
    const pence = st.sOlay?.ek?.yetenekId === 'pence' && sal < 1;
    const hamle = st.sOlay?.ek?.yetenekId === 'hamle' && sal < 1;
    const vur = st.vurulma < 0.3 ? 1 - st.vurulma / 0.3 : 0;
    const cok = st.cok;
    const hd = this.ayiHedef?.st;
    let yaw = (hd ? Math.atan2(hd.x - st.x, (hd.z - st.z) * 0.8) : -Math.PI / 2) + Math.sin(sn * 0.9) * 0.05;
    if (st.kacis) yaw = Math.PI / 2 - 0.25;
    if (st.sersem) yaw += Math.sin(sn * 9) * 0.12;
    a.position.set(st.x + vur * 0.15, st.sicra * 1.3 + Math.abs(adim) * 0.06 - cok * 0.25, st.z);
    a.rotation.set(0, yaw, cok * 1.2 + (pence ? Math.sin(sal * Math.PI) * 0.25 : 0));
    // şaha kalkma: pençe/hamlede gövde geriye dikilir
    const sah = (pence || hamle ? darbe : darbe * 0.4) * 0.5;
    this.ayiGovde.rotation.x = this.ayiGovdeCizgi.rotation.x = -sah;
    this.ayiBas.rotation.set(-sah * 0.6 + Math.sin(sn * 1.7) * 0.05 + (st.zafer >= 0 ? -0.5 : 0), 0, 0);
    this.ayiBas.position.y = 1.0 + sah * 0.3;
    // renk parlaması / çöküş
    const mats = [this.ayiGovde.material, this.ayiBas.children[0].material];
    for (const m of mats) { m.color.setHex(RENK.ayi); if (vur) m.color.lerp(C2.setRGB(1, 0.92, 0.85), vur * 0.7); if (cok) m.color.lerp(C2.setHex(0x6a625c), cok * 0.4); }
    // bacaklar: ön ikisi pençede kalkar
    const B = this.ayiBacak.m;
    const kok = new THREE.Matrix4().compose(V.set(0, 0, 0), Q.identity(), SC.set(1, 1, 1));
    [[-0.32, 0.62, 0], [0.32, 0.62, 1], [-0.3, -0.55, 1], [0.3, -0.55, 0]].forEach(([x, z, faz], i) => {
      const on = i < 2;
      const sal2 = (faz ? 1 : -1) * adim * 0.6 + (on ? -sah * 1.6 - (pence && i === 1 ? darbe * 0.9 : 0) : sah * 0.4);
      B.setMatrixAt(i, M5.multiplyMatrices(kok, yerel(x, on ? 0.72 + sah * 0.35 : 0.66, z, sal2 + cok * (on ? 0.9 : -0.4), 0, 0)));
    });
    B.instanceMatrix.needsUpdate = true;
    this.ayiGolge.position.set(st.x, 0.03, st.z);
    this.ayiGolge.scale.set((0.9 - st.sicra * 0.4) * (1 - cok * 0.25), 1, (1.5 - st.sicra * 0.6) * (1 - cok * 0.35));
    a.visible = this.ayiGolge.visible = !(u.kacis !== null && t > u.kacis + 4.5);
  }

  efektCiz(t, sn) {
    // oklar: mermi t → vuruş (≈ +0,6 tick) parabol
    const ok = this.ok; ok.i = 0;
    for (const o of this.mermiler) {
      const f = (t - o.t) / 0.6;
      if (f < 0 || f > 1) continue;
      const k = this.hedefler.get(o.k).st, h = this.hedefler.get(o.h).st;
      if (!k || !h) continue;
      const ax = k.x + 0.2, ay = 1.0, bx = h.x - 0.3, by = 1.0;
      const yay = Math.min(1.1, Math.abs(bx - ax) * 0.09);
      const x = ax + (bx - ax) * f, z = k.z + (h.z - k.z) * f, y = ay + (by - ay) * f + Math.sin(f * Math.PI) * yay;
      const dy = (by - ay) + Math.cos(f * Math.PI) * Math.PI * yay;
      M4.lookAt(new THREE.Vector3(bx - ax, dy, h.z - k.z), V.set(0, 0, 0), new THREE.Vector3(0, 1, 0));
      Q.setFromRotationMatrix(M4);
      this.ekle(ok, M5.compose(V.set(x, y, z), Q, SC.set(1, 1, 1)), C.setHex(0x3a2a1c));
    }
    ok.m.count = ok.i;
    ok.m.instanceMatrix.needsUpdate = true;
    // kıvılcım + hasar sayıları
    const kv = this.kivilcim; kv.i = 0;
    const R = this.rakam; let ri = 0;
    const tz = this.toz; tz.i = 0;
    for (const v of this.vuruslar) {
      const f = t - v.t;
      if (f < 0 || f > 2.2) continue;
      const h = this.hedefler.get(v.h);
      if (!h?.st) continue;
      const ayi = h.taraf === 'onlar';
      const yuk = ayi ? 1.55 : 1.2;
      if (f < 0.5) for (let j = 0; j < (ayi ? 4 : 3); j++) {
        const a = hash(v.t * 13 + j) * 6.28, r = f * 1.6;
        this.ekle(kv, M5.compose(V.set(h.st.x + Math.cos(a) * r * 0.5, yuk - 0.3 + Math.sin(a) * r * 0.4 + r * 0.3, h.st.z + Math.sin(a * 1.7) * r * 0.4),
          Q.setFromEuler(E.set(a, a * 2, 0)), SC.setScalar(1 - f * 1.8)), C.setHex(v.ek?.kritik || v.ek?.yetenek ? 0xffd34d : 0xfff1c0));
      }
      if (f < 1.6 && ri + 3 <= RAKAM_MAX) {
        const s = String(v.d), n = s.length, buyuk = v.ek?.yetenek || v.ek?.kritik;
        const op = f < 1.1 ? 1 : 1 - (f - 1.1) / 0.5;
        for (let j = 0; j < n; j++) {
          R.at.merkez.setXYZ(ri, h.st.x + (hash(v.t) - 0.5) * 0.4, yuk + 0.4 + f * 0.55, h.st.z);
          R.at.veri.setXYZW(ri, Number(s[j]), (j - (n - 1) / 2) * 0.62, (buyuk ? 0.46 : 0.32) * (1 + Math.max(0, 0.25 - f) * 1.6), op);
          C.setHex(ayi ? (buyuk ? 0xffd34d : 0xffffff) : 0xff7a5c);
          R.at.renk.setXYZ(ri, C.r, C.g, C.b);
          ri++;
        }
      }
    }
    // toz: yürüyen birimlerin ayağında + ayının sıçrayışında
    for (const u of this.birler) {
      if (!u.st?.yuru || tz.i >= 30) continue;
      const ph = (t * 2 + u.wx) % 1;
      const s = (u.taraf === 'onlar' ? 1.6 : 0.8) * (1 - ph);
      this.ekle(tz, M5.compose(V.set(u.st.x - ph * 0.6 * (u.st.geri || u.taraf === 'onlar' ? -1 : 1), 0.12 + ph * 0.25, u.st.z + (hash(u.hi ?? 9) - 0.5) * 0.3),
        Q.identity(), SC.setScalar(s * 0.9)), C.setRGB(1, 1, 1));
    }
    for (const k of [kv, tz]) { k.m.count = k.i; k.m.instanceMatrix.needsUpdate = true; k.m.instanceColor.needsUpdate = true; }
    R.g.instanceCount = ri;
    for (const a of Object.values(R.at)) a.needsUpdate = true;
    // sersem yıldızları (ayı)
    const yz = this.yildiz; yz.i = 0;
    const ayi = this.birler.find((u) => u.taraf === 'onlar');
    if (ayi?.st?.sersem) for (let j = 0; j < 5; j++) {
      const a = sn * 3 + j * 1.256;
      this.ekle(yz, M5.compose(V.set(ayi.st.x + Math.cos(a) * 0.55, 2.35, ayi.st.z + Math.sin(a) * 0.55), Q.setFromEuler(E.set(a, a, 0)), SC.setScalar(1)), C.setRGB(1, 1, 1));
    }
    yz.m.count = yz.i; yz.m.instanceMatrix.needsUpdate = true;
    // kahraman halkası + yetenek dalgası
    const k = this.kahraman;
    this.halka.visible = !!k?.st && !(k.st.cok > 0);
    if (k?.st) {
      const p = 1 + Math.sin(sn * 4) * 0.06;
      this.halka.position.set(k.st.x, 0.05, k.st.z); this.halka.scale.set(p * 1.15, 1, p * 1.15);
      const y = [...this.yetenekler].reverse().find((o) => o.k === k.id && t >= o.t);
      const f = y ? (t - y.t) / 1.4 : 9;
      this.dalga.material.opacity = f < 1 ? (1 - f) * 0.9 : 0;
      this.dalga.position.set(k.st.x, 0.06, k.st.z);
      this.dalga.scale.setScalar(0.6 + f * 2.6);
      this.yetenekBandi = f < 1.6 ? y : null;
    }
  }

  kameraCiz(t, sn) {
    // taban: yandan-üstten 3/4 (≈ 35°), ekip solda, düşman sağda. Girişte geniş açıdan süzülür; kahraman yeteneğinde yaklaşır.
    const g = yumu((t + GIRIS) / (GIRIS - 0.6));
    // çerçeve: ayaktaki birimlerin ağırlık merkezini yumuşakça izler (ayı hamlesinde boş kalan yarıyı önler)
    let ox = 0, n = 0;
    for (const u of this.birler) if (u.st && !(u.taraf === 'onlar' && u.kacis !== null && t > u.kacis + 2)) { ox += u.st.x * (u.taraf === 'onlar' ? 2 : 1); n += u.taraf === 'onlar' ? 2 : 1; }
    const mx = n ? kir(ox / n, -2.5, 2.5) : 0.2;
    this.odakX = this.odakX === undefined || t < -GIRIS + 0.1 ? mx : this.odakX + (mx - this.odakX) * 0.06;
    const hedef = new THREE.Vector3(this.odakX + 0.2, 0.8, 0.4);
    const poz = new THREE.Vector3(this.odakX - 0.4, 6.9, 10.6);
    const ilk = new THREE.Vector3(-5, 10.5, 16);
    const p = ilk.lerp(poz, g);
    const y = this.yetenekBandi;
    const k = this.kahraman?.st;
    if (y && k) {
      const f = kir((t - y.t) / 0.4) * (1 - kir((t - y.t - 1.0) / 0.8));
      hedef.lerp(new THREE.Vector3(k.x + 1.2, 0.9, k.z), f * 0.45);
      p.lerp(new THREE.Vector3(k.x - 0.5, 4.8, k.z + 7.5), f * 0.35);
    }
    p.x += Math.sin(sn * 0.3) * 0.15;
    this.kamera.position.copy(p);
    this.kamera.lookAt(hedef);
    this.gunes.target.position.set(0.6, 0, 0);
  }

  // ---------- HUD (DOM; yalnız savaş sırasında; UI katmanı kendi HUD'unu kurarsa hud:false) ----------
  hudKur() {
    this.hudKaldir();
    const h = document.createElement('div');
    h.className = 'savas-hud';
    h.innerHTML = `<style>
.savas-hud{position:fixed;inset:0;z-index:1000;pointer-events:none;font-family:system-ui,sans-serif;color:#fff8ea;user-select:none}
.savas-hud .ust{position:absolute;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;gap:14px;align-items:center;width:min(640px,72vw)}
.savas-hud .cubuk{flex:1;height:14px;border-radius:8px;background:#2a1d14cc;border:2px solid #2a1d14;overflow:hidden;position:relative}
.savas-hud .cubuk i{position:absolute;inset:0;transform-origin:left;background:linear-gradient(#ffe27a,#e0a92a);transition:transform .15s}
.savas-hud .cubuk.onlar i{transform-origin:right;background:linear-gradient(#ff8a6a,#c7372b)}
.savas-hud .ad{font:800 12px system-ui;text-shadow:0 1px 0 #2a1d14,0 0 4px #2a1d14;white-space:nowrap}
.savas-hud .vs{font:900 18px system-ui;color:#ffd34d;text-shadow:0 2px 0 #2a1d14}
.savas-hud .sag{position:absolute;right:max(12px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));display:flex;gap:8px;pointer-events:auto}
.savas-hud button{min-width:48px;min-height:44px;border-radius:12px;border:2px solid #2a1d14;background:#3b2a1ee6;color:#fff3d6;font:800 14px system-ui;cursor:pointer}
.savas-hud button.atla{background:#ffd34d;color:#2a1d14}
.savas-hud .band{position:absolute;left:0;right:0;top:16%;display:flex;justify-content:center;align-items:center;gap:22px;transition:opacity .3s}
.savas-hud .band b{font:900 30px system-ui;letter-spacing:1px;text-shadow:0 3px 0 #2a1d14,0 0 10px #2a1d14}
.savas-hud .band .v{font:900 42px system-ui;color:#ffd34d}
.savas-hud .yetenek{position:absolute;left:50%;bottom:20%;transform:translateX(-50%);font:900 22px system-ui;color:#ffd34d;text-shadow:0 2px 0 #2a1d14,0 0 8px #000;transition:opacity .2s}
.savas-hud .sonuc{position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);background:#2a1d14e0;border:3px solid #ffd34d;border-radius:16px;padding:10px 22px;text-align:center;pointer-events:auto;display:none}
.savas-hud .sonuc h2{margin:0 0 2px;font:900 24px system-ui;color:#ffd34d}
.savas-hud .sonuc p{margin:0 0 8px;font:600 13px system-ui}
</style>
<div class="ust"><span class="ad biz"></span><div class="cubuk biz"><i></i></div><span class="vs">VS</span><div class="cubuk onlar"><i></i></div><span class="ad onlar"></span></div>
<div class="sag"><button class="hiz" aria-label="Hız">1×</button><button class="atla" aria-label="Atla">ATLA ▶▶</button></div>
<div class="band"><b class="biz"></b><span class="v">VS</span><b class="onlar"></b></div>
<div class="yetenek"></div>
<div class="sonuc"><h2></h2><p></p><button class="kapat">Devam</button></div>`;
    document.body.appendChild(h);
    this.hud = h;
    const kahraman = this.kahraman;
    const dusman = this.liste.dusman?.ad || 'Düşman';
    h.querySelector('.ad.biz').textContent = kahraman ? `★ ${kahraman.ad}` : 'Ekip';
    h.querySelector('.ad.onlar').textContent = dusman;
    h.querySelector('.band .biz').textContent = kahraman ? `${kahraman.ad} ve ekibi` : 'Ekibimiz';
    h.querySelector('.band .onlar').textContent = dusman;
    h.querySelector('.hiz').onclick = () => this.hizAyarla(this.hiz === 1 ? 2 : 1);
    h.querySelector('.atla').onclick = () => this.atla();
    h.querySelector('.kapat').onclick = () => { this.sec.onKapat?.(); this.kapat(); };
    this.hudGuncelle(true);
  }
  hudKaldir() { this.hud?.remove(); this.hud = null; }
  hudGuncelle(zorla = false) {
    const h = this.hud;
    if (!h || !this.canlar) return;
    h.querySelector('.cubuk.biz i').style.transform = `scaleX(${kir(this.canlar.biz / Math.max(1, this.toplam.biz))})`;
    h.querySelector('.cubuk.onlar i').style.transform = `scaleX(${kir(this.canlar.onlar / Math.max(1, this.toplam.onlar))})`;
    h.querySelector('.band').style.opacity = this.tau < -0.8 ? String(kir((-this.tau - 0.8) / 1.2)) : '0';
    const y = this.yetenekBandi;
    const ye = h.querySelector('.yetenek');
    ye.textContent = y ? `${this.kahraman?.ad}: ${y.ek.ad}!` : '';
    ye.style.opacity = y ? '1' : '0';
    if (zorla || this._hiz !== this.hiz) { h.querySelector('.hiz').textContent = `${this.hiz}×`; this._hiz = this.hiz; }
    h.querySelector('.sag').style.visibility = this.liste && this.tau >= this.liste.tick ? 'hidden' : 'visible';
  }
  sonucGoster() {
    const h = this.hud;
    if (!h) return;
    const L = this.liste;
    const kart = h.querySelector('.sonuc');
    kart.querySelector('h2').textContent = L.kademeAd;
    const metin = { buyuk: 'Ayı çöktü; ekip neredeyse yarasız!', basari: 'Ayı yere serildi; ekip yorgun ama ayakta.',
      kismi: 'Yaralı ayı ormana kaçtı.', basarisiz: 'Ekip geri çekildi; ayı alanı korudu.' }[L.kademe];
    kart.querySelector('p').textContent = `${metin} Ekip dönüş yolunda.`;
    kart.style.display = 'block';
  }
}

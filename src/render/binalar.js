// Bina modelleri: çağa özgü prosedürel low-poly parçalar → tek atlas malzemeli birleşik geometri (+ ışıltı geometrisi).
// Geometri `id|seviye|durum` anahtarıyla önbellekte (paylaşılır, atılmaz). Çekirdeği yalnız okur. Görsel yön: docs/GORSEL.md.
import * as THREE from 'three';
import { BINALAR } from '../data/binalar.js';
import { CAGLAR } from '../data/caglar.js';
import { DOKU, ATLAS_HUCRE } from './dokular.js';
import { binaMat, isilMat, hayaletMat, taslakMat, cizgiMat } from './malzeme.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const CAG_SIRA = Object.fromEntries(CAGLAR.map((c) => [c.id, c.sira]));
export const ZEMIN_Y = 0.30;   // inşa edilebilir karo üstü
export const TABAN_Y = 0.34;   // kaide üstü

// ---------- palet (docs/GORSEL.md) ----------
const P = {
  deri: 0xc9a57a, deriK: 0x8a6a48, direk: 0x6b4a2c, kumasK: 0xa8432f, kemik: 0xe8dcc0,
  saman: 0xc8a85a, kutuk: 0x7a5634, tas: 0x8f8a80, asi: 0xb5532e,
  kerpic: 0xc79262, siva: 0xd8b68a, kiremitE: 0xb0603a, bronz: 0xb57a3a,
  kirec: 0xe3d8c0, mermer: 0xefeae0, kiremit: 0xc0603a, lacivert: 0x4f86c8,
  sivaB: 0xece3cf, kiris: 0x4a3222, arduvaz: 0x6a7482, surTas: 0x9a9488, sancak: 0xb03a2e,
  toprak: 0x8a6a3e, cimen: 0x6fae4a, su: 0x3f8fb0, koyu: 0x2a211a, altin: 0xe8b84a, firuze: 0x2fa3a0,
  ates: 0xffa040, kor: 0xff5a1a, pencere: 0xffcf7a, pencereK: 0x3a2c22,
  yaprak: 0x4f8a3a, ekin: 0xd9bf52, ekinY: 0x8fb23a, yun: 0xf2eee4,
};

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(t) { let s = t || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }

const HUCRE_UV = (ad) => {
  const i = DOKU[ad] ?? 0, N = ATLAS_HUCRE;
  return [(i % N) / N, 1 - (Math.floor(i / N) + 1) / N];
};
const OLCEK = { saman: 0.45, deri: 0.6, kutuk: 0.5, tahta: 0.5, kerpic: 0.55, tasBlok: 0.5, moloz: 0.5, kiremit: 0.45,
  arduvaz: 0.4, yariAhsap: 0.42, mermer: 0.8, kumas: 0.4, toprak: 0.5, ekin: 0.5, hasir: 0.4, duz: 1 };

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();

// Özel geometri: üçgen listesi [[x,y,z]×3]; dışa bakan yönü `merkez`e göre düzeltilir.
function ucgenGeo(ucgenler, merkez) {
  const pos = [];
  for (const t of ucgenler) {
    _a.set(t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]);
    _b.set(t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]);
    _n.crossVectors(_a, _b);
    const cx = (t[0][0] + t[1][0] + t[2][0]) / 3 - merkez[0], cy = (t[0][1] + t[1][1] + t[2][1]) / 3 - merkez[1], cz = (t[0][2] + t[1][2] + t[2][2]) / 3 - merkez[2];
    const ters = _n.x * cx + _n.y * cy + _n.z * cz < 0;
    const s = ters ? [t[0], t[2], t[1]] : t;
    for (const v of s) pos.push(v[0], v[1], v[2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

class Kurucu {
  constructor(tohum) {
    this.R = rng(tohum);
    this.parcalar = [];
    this.duman = []; this.ates = []; this.pervane = null;
    this.ton = null; // [r,g,b] çarpanı (hasar / kapalı)
  }

  // o: { doku, renk, x, y, z (merkez), rx, ry, rz, olcek, isil, yumusak, rol }
  ekle(geo, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('uv');
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0);
    _q.setFromEuler(_e);
    _m.compose(_p.set(o.x || 0, o.y || 0, o.z || 0), _q, _s.set(o.sx || 1, o.sy || 1, o.sz || 1));
    g.applyMatrix4(_m);
    if (!o.yumusak || !g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position'), n = p.count;
    const uv = new Float32Array(n * 2), hc = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const olc = o.olcek || OLCEK[o.doku] || 0.5;
    const [hx, hy] = HUCRE_UV(o.doku || 'duz');
    const uo = this.R(), vo = this.R();
    _c.setHex(o.renk ?? 0xffffff);
    const j = 0.94 + this.R() * 0.12;
    const r = _c.r * j, gg = _c.g * j, b = _c.b * j;
    for (let i = 0; i < n; i += 3) {
      _a.fromBufferAttribute(p, i + 1).sub(_b.fromBufferAttribute(p, i));
      _n.fromBufferAttribute(p, i + 2).sub(_b);
      _n.crossVectors(_a, _n);
      const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
      for (let k = i; k < i + 3; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        let u, v;
        if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
        uv[k * 2] = u / olc + uo; uv[k * 2 + 1] = v / olc + vo;
        hc[k * 2] = hx; hc[k * 2 + 1] = hy;
        col[k * 3] = r; col[k * 3 + 1] = gg; col[k * 3 + 2] = b;
      }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aHucre', new THREE.BufferAttribute(hc, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeBoundingBox();
    this.parcalar.push({ g, isil: !!o.isil, rol: o.rol || '', min: g.boundingBox.min.y, max: g.boundingBox.max.y });
    return g;
  }

  // ---- temel biçimler (y = alt) ----
  kutu(w, h, d, x, y, z, doku, renk, o = {}) { return this.ekle(new THREE.BoxGeometry(w, h, d), { doku, renk, x, y: y + h / 2, z, ...o }); }
  sil(rt, rb, h, seg, x, y, z, doku, renk, o = {}) {
    return this.ekle(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.acik), { yumusak: seg > 7, doku, renk, x, y: y + h / 2, z, ...o });
  }
  koni(r, h, seg, x, y, z, doku, renk, o = {}) { return this.ekle(new THREE.ConeGeometry(r, h, seg, 1, !!o.acik), { doku, renk, x, y: y + h / 2, z, ...o }); }
  kubbe(r, x, y, z, doku, renk, o = {}) {
    return this.ekle(new THREE.SphereGeometry(r, o.seg || 10, o.hseg || 5, 0, Math.PI * 2, 0, Math.PI / 2), { yumusak: true, doku, renk, x, y, z, ...o });
  }
  kure(r, x, y, z, doku, renk, o = {}) { return this.ekle(new THREE.IcosahedronGeometry(r, o.det ?? 0), { doku, renk, x, y, z, ...o }); }
  // beşik çatı: mahya x boyunca
  besik(w, d, h, x, y, z, doku, renk, o = {}) {
    const a = w / 2, b = d / 2;
    const T = [
      [[-a, 0, -b], [a, 0, -b], [a, h, 0]], [[-a, 0, -b], [a, h, 0], [-a, h, 0]],
      [[-a, 0, b], [a, h, 0], [a, 0, b]], [[-a, 0, b], [-a, h, 0], [a, h, 0]],
      [[-a, 0, -b], [-a, h, 0], [-a, 0, b]], [[a, 0, -b], [a, 0, b], [a, h, 0]],
    ];
    return this.ekle(ucgenGeo(T, [0, h * 0.35, 0]), { rol: 'cati', doku, renk, x, y, z, ...o });
  }
  // kırma çatı (w ≥ d iken mahyalı; w = d iken piramit)
  kirma(w, d, h, x, y, z, doku, renk, o = {}) {
    const a = w / 2, b = d / 2, r = Math.max(0, a - b);
    const A = [-a, 0, -b], B = [a, 0, -b], C = [a, 0, b], D = [-a, 0, b], R1 = [-r, h, 0], R2 = [r, h, 0];
    const T = [[D, C, R2], [B, A, R1], [A, D, R1], [C, B, R2]];
    if (r > 0.001) T.push([D, R2, R1], [B, R1, R2]);
    return this.ekle(ucgenGeo(T, [0, h * 0.3, 0]), { rol: 'cati', doku, renk, x, y, z, ...o });
  }

  // ---- ayrıntı parçaları ----
  direk(x, z, y, h, r, renk = P.direk, o = {}) { return this.sil(r * 0.85, r, h, 5, x, y, z, 'kutuk', renk, o); }
  pencere(x, y, z, w, h, yon, o = {}) {
    const isikli = o.isikli ?? this.R() < 0.45;
    const cer = o.cerceve ?? P.kiris;
    const panjur = o.panjur ?? (w >= 0.07 && this.R() < 0.6), pr = o.panjurRenk ?? [0x4f6f4a, 0x7a3a2c, 0x3f5f7a, 0x5a4030][Math.floor(this.R() * 4)];
    if (yon === 'z') {
      this.kutu(w + 0.04, h + 0.04, 0.02, x, y - 0.02, z, 'tahta', cer);
      this.kutu(w, h, 0.03, x, y, z + 0.004, 'duz', isikli ? P.pencere : P.pencereK, { isil: true });
      this.kutu(0.008, h, 0.034, x, y, z + 0.006, 'kutuk', cer); // orta çıta
      this.kutu(w + 0.07, 0.02, 0.045, x, y - 0.035, z + 0.01, 'tasBlok', 0xb9b2a2); // denizlik
      this.kutu(w + 0.06, 0.016, 0.03, x, y + h + 0.015, z + 0.004, 'tasBlok', 0xa9a292); // lento
      if (panjur) for (const sx of [-1, 1]) this.kutu(w * 0.42, h + 0.03, 0.014, x + sx * (w / 2 + w * 0.26), y - 0.012, z + 0.004, 'tahta', pr);
    } else {
      this.kutu(0.02, h + 0.04, w + 0.04, x, y - 0.02, z, 'tahta', cer);
      this.kutu(0.03, h, w, x + 0.004, y, z, 'duz', isikli ? P.pencere : P.pencereK, { isil: true });
      this.kutu(0.034, h, 0.008, x + 0.006, y, z, 'kutuk', cer);
      this.kutu(0.045, 0.02, w + 0.07, x + 0.01, y - 0.035, z, 'tasBlok', 0xb9b2a2);
      this.kutu(0.03, 0.016, w + 0.06, x + 0.004, y + h + 0.015, z, 'tasBlok', 0xa9a292);
      if (panjur) for (const sz of [-1, 1]) this.kutu(0.014, h + 0.03, w * 0.42, x + 0.004, y - 0.012, z + sz * (w / 2 + w * 0.26), 'tahta', pr);
    }
  }
  kapi(x, y, z, w, h, yon = 'z', renk = 0x5a3b24) {
    if (yon === 'z') {
      this.kutu(w + 0.04, h + 0.03, 0.025, x, y, z, 'tahta', P.kiris); this.kutu(w, h, 0.035, x, y, z + 0.003, 'tahta', renk);
      this.kutu(w + 0.07, 0.02, 0.012, x, y + h + 0.03, z + 0.004, 'tasBlok', 0xa9a292); // lento
      this.kutu(w + 0.1, 0.016, 0.07, x, y, z + 0.035, 'tasBlok', 0xb4ae9e); // eşik taşı
      this.kure(0.011, x + w * 0.32, y + h * 0.5, z + 0.025, 'duz', P.altin); // kol
    } else {
      this.kutu(0.025, h + 0.03, w + 0.04, x, y, z, 'tahta', P.kiris); this.kutu(0.035, h, w, x + 0.003, y, z, 'tahta', renk);
      this.kutu(0.012, 0.02, w + 0.07, x + 0.004, y + h + 0.03, z, 'tasBlok', 0xa9a292);
      this.kutu(0.07, 0.016, w + 0.1, x + 0.035, y, z, 'tasBlok', 0xb4ae9e);
      this.kure(0.011, x + 0.025, y + h * 0.5, z + w * 0.32, 'duz', P.altin);
    }
  }
  bayrak(x, z, y, h, renk, o = {}) {
    this.direk(x, z, y, h, 0.018, o.direk || 0x5a4030);
    this.kutu(0.2, 0.12, 0.012, x + 0.1, y + h - 0.13, z, 'kumas', renk, { rz: -0.06 });
    this.kure(0.025, x, y + h + 0.01, z, 'duz', P.altin);
  }
  fici(x, z, y, s = 1) {
    this.sil(0.055 * s, 0.05 * s, 0.13 * s, 8, x, y, z, 'tahta', 0x8a5a32);
    this.sil(0.058 * s, 0.058 * s, 0.015 * s, 8, x, y + 0.03 * s, z, 'duz', 0x3a3632);
    this.sil(0.058 * s, 0.058 * s, 0.015 * s, 8, x, y + 0.09 * s, z, 'duz', 0x3a3632);
  }
  sandik(x, z, y, s = 1, ry = 0) { this.kutu(0.11 * s, 0.09 * s, 0.11 * s, x, y, z, 'tahta', 0x9a6a3a, { ry }); }
  odun(x, z, y, ry = 0, s = 1) {
    const c = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < 6; i++) {
      const sira = i < 3 ? 0 : i < 5 ? 1 : 2, k = sira === 0 ? i - 1 : sira === 1 ? i - 3.5 : 0;
      const lx = k * 0.05 * s, ly = y + 0.025 * s + sira * 0.043 * s;
      this.sil(0.024 * s, 0.024 * s, 0.2 * s, 6, x + lx * c, ly, z - lx * sn, 'kutuk', 0x8a6238, { rz: Math.PI / 2, ry, y: ly });
    }
  }
  tas(x, z, y, s = 0.06, renk = P.tas) { this.ekle(new THREE.DodecahedronGeometry(s), { doku: 'moloz', renk, x, y: y + s * 0.6, z, ry: this.R() * 6, rx: this.R(), sy: 0.7 }); }
  cit(x0, z0, x1, z1, y, renk = 0x7a5634, h = 0.13) {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), n = Math.max(2, Math.round(L / 0.16) + 1), ry = -Math.atan2(dz, dx);
    for (let i = 0; i < n; i++) { const t = i / (n - 1); this.kutu(0.025, h, 0.025, x0 + dx * t, y, z0 + dz * t, 'kutuk', renk); }
    for (const yy of [h * 0.35, h * 0.75]) this.kutu(L, 0.018, 0.014, (x0 + x1) / 2, y + yy, (z0 + z1) / 2, 'tahta', renk, { ry });
  }
  atesYeri(x, z, y, s = 1) {
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; this.tas(x + Math.cos(a) * 0.11 * s, z + Math.sin(a) * 0.11 * s, y, 0.035 * s, 0x7d7870); }
    for (let i = 0; i < 3; i++) this.sil(0.016 * s, 0.016 * s, 0.17 * s, 5, x, y + 0.04 * s, z, 'kutuk', 0x4a3220, { rz: Math.PI / 2 - 0.3, ry: (i / 3) * Math.PI * 2, y: y + 0.04 * s });
    this.koni(0.06 * s, 0.05 * s, 6, x, y, z, 'duz', P.kor, { isil: true });
    this.ates.push([x, y + 0.04 * s, z, s]);
  }
  bacaDumani(x, y, z, s = 1) { this.duman.push([x, y, z, s]); }
  // kemerli kapı/pencere (düz yüzey, +z'ye bakar): genişlik w, toplam yükseklik h, sivri: gotik
  kemer(x, y, z, w, h, renk, sivri = false, o = {}) {
    const sh = new THREE.Shape(), r = w / 2, d = h - r;
    sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.lineTo(r, d);
    if (sivri) { sh.quadraticCurveTo(r, d + r * 0.9, 0, d + r * 1.35); sh.quadraticCurveTo(-r, d + r * 0.9, -r, d); }
    else sh.absarc(0, d, r, 0, Math.PI, false);
    sh.lineTo(-r, 0);
    return this.ekle(new THREE.ShapeGeometry(sh, 6), { doku: 'duz', renk, x, y, z, ...o });
  }

  // ---- zemin ----
  kaide(g, tur, y0 = ZEMIN_Y) {
    if (tur === 'toprak') {
      this.sil(g * 0.4, g * 0.43, 0.012, 12, 0, y0 - 0.004, 0, 'duz', 0xa89468, { yumusak: false });
      return y0 + 0.008;
    }
    const renk = tur === 'mermer' ? P.mermer : tur === 'kerpic' ? 0xc0a078 : 0xb4ae9e;
    const doku = tur === 'mermer' ? 'mermer' : tur === 'kerpic' ? 'kerpic' : 'tasBlok';
    this.kutu(g - 0.06, TABAN_Y - y0 + 0.03, g - 0.06, 0, y0 - 0.03, 0, doku, renk);
    return TABAN_Y;
  }

  // ---- birleştir ----
  birlestir() {
    const topla = (isil) => {
      const ps = this.parcalar.filter((p) => p.isil === isil);
      if (!ps.length) return null;
      let n = 0;
      for (const p of ps) n += p.g.getAttribute('position').count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), hc = new Float32Array(n * 2), col = new Float32Array(n * 3);
      let o = 0;
      for (const p of ps) {
        const g = p.g, c = g.getAttribute('position').count;
        pos.set(g.getAttribute('position').array, o * 3);
        nor.set(g.getAttribute('normal').array, o * 3);
        uv.set(g.getAttribute('uv').array, o * 2);
        hc.set(g.getAttribute('aHucre').array, o * 2);
        const cc = g.getAttribute('color').array;
        for (let i = 0; i < c; i++) {
          // sahte ortam kapanması: zemine yakın köşeler koyu
          const y = pos[(o + i) * 3 + 1];
          const ao = isil ? 1 : 0.68 + 0.32 * Math.min(1, Math.max(0, (y - ZEMIN_Y) / 0.32));
          const t = !isil && this.ton ? this.ton : [1, 1, 1];
          // el boyaması etkisi: konuma bağlı yumuşak değer değişimi + üst yüzeylerde güneş solması, tabanda kir
          let boya = 1;
          if (!isil) {
            const px = pos[(o + i) * 3], pz = pos[(o + i) * 3 + 2];
            const n1 = Math.sin(px * 7.3 + y * 5.1) * Math.sin(pz * 6.1 - y * 3.7);
            boya = 1 + 0.07 * n1 + 0.05 * Math.min(1, Math.max(0, (y - ZEMIN_Y) / 0.9)) - (y < ZEMIN_Y + 0.1 ? 0.05 : 0);
          }
          col[(o + i) * 3] = cc[i * 3] * ao * t[0] * boya;
          col[(o + i) * 3 + 1] = cc[i * 3 + 1] * ao * t[1] * boya;
          col[(o + i) * 3 + 2] = cc[i * 3 + 2] * ao * t[2] * boya * (isil ? 1 : 0.985 + 0.015 * Math.min(1, boya));
        }
        o += c;
        g.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setAttribute('aHucre', new THREE.BufferAttribute(hc, 2));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeBoundingBox(); g.computeBoundingSphere();
      return g;
    };
    return { ana: topla(false), isil: topla(true) };
  }
}

// ===================================================================================
// Modeller. c = { g (karo), sv (1..3), s (seviye ölçeği), Z (kaide üstü), cag, k (Kurucu) }. Kapı +z, pencereler +x/+z.
// ===================================================================================

// ---------- ortak bina gövdeleri ----------
function evGovdesi(k, w, h, d, Z, doku, renk, sec = {}) {
  k.kutu(w, h, d, 0, Z, 0, doku, renk);
  // köşe kirişleri / payandalar
  if (sec.kose) for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1]]) k.kutu(0.04, h, 0.04, sx * w / 2, Z, sz * d / 2, 'kutuk', sec.kose);
  if (sec.kapi !== false) k.kapi(sec.kapiX ?? 0, Z, d / 2 + 0.005, 0.13, Math.min(0.22, h * 0.7), 'z', sec.kapiRenk);
  if (sec.pencere !== false) {
    const py = Z + h * 0.48, ph = Math.min(0.1, h * 0.28);
    if (w > 0.45) k.pencere(sec.kapiX ? 0 : w * 0.3, py, d / 2 + 0.005, 0.08, ph, 'z');
    k.pencere(w / 2 + 0.005, py, -d * 0.18, 0.08, ph, 'x');
    if (d > 0.6) k.pencere(w / 2 + 0.005, py, d * 0.22, 0.08, ph, 'x');
  }
}
const baca = (k, x, z, y, h, doku = 'moloz', renk = 0x8a8278) => {
  k.kutu(0.09, h, 0.09, x, y, z, doku, renk);
  k.kutu(0.11, 0.025, 0.11, x, y + h, z, 'duz', 0x5a544c);
  k.bacaDumani(x, y + h + 0.03, z);
};

const M = {};

// ---------- MERKEZLER (2×2) ----------
// ortak: oturak kütük, tripod kazan, kurutma çerçevesi, direkli meşale
const kutukOturak = (k, x, z, y, ry) => { k.sil(0.07, 0.07, 0.16, 7, x, y, z, 'kutuk', 0x8a6238); k.sil(0.055, 0.055, 0.01, 7, x, y + 0.16, z, 'kutuk', 0xc9a66a); };
const kazan = (k, x, z, y, s = 1) => {
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.4; k.direk(x + Math.cos(a) * 0.07 * s, z + Math.sin(a) * 0.07 * s, y, 0.22 * s, 0.01, P.direk, { rz: Math.cos(a) * 0.25, rx: -Math.sin(a) * 0.25 }); }
  k.kubbe(0.05 * s, x, y + 0.1 * s, z, 'duz', 0x3a3632, { sy: -1 }); k.sil(0.055 * s, 0.045 * s, 0.05 * s, 8, x, y + 0.08 * s, z, 'duz', 0x3a3632);
};
const kurutma = (k, x, z, y, ry = 0) => {
  k.direk(x - 0.14 * Math.cos(ry), z + 0.14 * Math.sin(ry), y, 0.3, 0.012); k.direk(x + 0.14 * Math.cos(ry), z - 0.14 * Math.sin(ry), y, 0.3, 0.012);
  k.kutu(0.3, 0.012, 0.012, x, y + 0.29, z, 'kutuk', P.direk, { ry });
  k.kutu(0.12, 0.17, 0.012, x - 0.05 * Math.cos(ry), y + 0.12, z + 0.05 * Math.sin(ry), 'deri', 0xb89268, { ry, rz: 0.04 });
  k.kutu(0.1, 0.14, 0.012, x + 0.07 * Math.cos(ry), y + 0.15, z - 0.07 * Math.sin(ry), 'deri', 0xa07850, { ry });
};

M.kamp_atesi = (k, c) => {
  const Z = k.kaide(2, 'toprak');
  // büyük kamp ateşi: taş halka + üst üste kütükler + alev
  k.atesYeri(0, 0.1, Z, 2.6);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI + 0.3; k.sil(0.04, 0.04, 0.3, 6, Math.cos(a) * 0.02, Z + 0.1, 0.1 + Math.sin(a) * 0.02, 'kutuk', 0x5a3a20, { rz: Math.PI / 2 - 0.55, ry: a, y: Z + 0.1 }); }
  k.bacaDumani(0, Z + 0.35, 0.1, 1.5);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.2, r = 0.56; kutukOturak(k, Math.cos(a) * r, 0.1 + Math.sin(a) * r, Z, a); }
  // iki deri çadır (boyalı kuşak) + giriş
  for (const [x, z, s, col] of [[-0.62, -0.55, 1, 0xb6402a], [0.15, -0.72, 0.8, 0x2f6f9a]]) {
    k.koni(0.3 * s, 0.5 * s, 7, x, Z, z, 'deri', P.deri);
    k.koni(0.302 * s, 0.07 * s, 7, x, Z + 0.14 * s, z, 'kumas', col, { acik: true });
    for (let q = 0; q < 4; q++) k.direk(x + (q - 1.5) * 0.015, z, Z + 0.46 * s, 0.17, 0.008, P.direk, { rz: (q - 1.5) * 0.3 });
    k.kutu(0.12 * s, 0.2 * s, 0.015, x, Z, z + 0.26 * s, 'deri', P.deriK, { rx: -0.4 });
  }
  // totem direği: kafatası + tüyler + kırmızı kuşak
  k.direk(0.72, -0.5, Z, 0.95 * c.s, 0.035, P.direk);
  k.kure(0.065, 0.72, Z + 0.98 * c.s, -0.5, 'duz', P.kemik);
  for (let q = -1; q <= 1; q++) k.koni(0.014, 0.16, 4, 0.72 + q * 0.05, Z + 1.08 * c.s, -0.5, 'kumas', [0xb6402a, 0xe2b23a, 0x2f6f9a][q + 1], { rz: -q * 0.35 });
  k.kutu(0.17, 0.05, 0.17, 0.72, Z + 0.7 * c.s, -0.5, 'kumas', 0xb6402a);
  // kazan, kurutma çerçeveleri, mızrak sehpası, odun, kürk
  kazan(k, 0.55, 0.45, Z, 1.1);
  kurutma(k, -0.72, 0.3, Z, 0.3); kurutma(k, 0.92, 0.2, Z, -0.2);
  for (let i = 0; i < 4; i++) k.direk(-0.3 + i * 0.05, 0.85, Z, 0.55, 0.01, 0x8a7050, { rz: 0.22 - i * 0.06 });
  k.odun(0.2, 0.85, Z, 0.5, 1.1);
  k.kutu(0.26, 0.015, 0.18, -0.35, Z, 0.62, 'deri', 0xb59868, { ry: 0.4 });
  k.kure(0.04, 0.82, Z + 0.04, 0.78, 'duz', P.kemik); k.kutu(0.14, 0.012, 0.012, 0.9, Z + 0.02, 0.7, 'kemik', P.kemik, { ry: 0.6 });
};

M.ocak_meydani = (k, c) => {
  const Z = k.kaide(2, 'toprak');
  // büyük saman damlı ortak ev: kerpiç/çit duvar, geniş saçak, dumanlı tepe
  const h = 0.34 * c.s;
  k.sil(0.5, 0.53, h, 12, -0.25, Z, -0.25, 'hasir', 0xa08058);
  k.sil(0.54, 0.54, 0.035, 12, -0.25, Z + h * 0.45, -0.25, 'kutuk', 0x6a4a2a);
  k.koni(0.7, 0.62 * c.s, 12, -0.25, Z + h - 0.02, -0.25, 'saman', P.saman);
  k.sil(0.06, 0.08, 0.07, 6, -0.25, Z + h + 0.55 * c.s, -0.25, 'saman', 0x9a8048);
  k.bacaDumani(-0.25, Z + h + 0.62 * c.s, -0.25);
  // mamut dişi kapısı (iki kıvrık diş) + kapı
  k.kapi(-0.25, Z, 0.3, 0.16, 0.22, 'z', 0x5a3b24);
  for (const sx of [-1, 1]) for (let q = 0; q < 5; q++) k.kutu(0.04 - q * 0.004, 0.09, 0.04 - q * 0.004, -0.25 + sx * (0.13 + q * 0.01 - (q > 2 ? (q - 2) * 0.03 : 0)), Z + q * 0.085, 0.36, 'kemik', P.kemik, { rz: sx * (q > 2 ? 0.35 : -0.08) });
  // ortak ateş çukuru: ayakta taşlar halkası + merkez ateş
  k.atesYeri(0.55, 0.5, Z, 1.7);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; k.kutu(0.09, 0.26 + (i % 3) * 0.09, 0.07, 0.55 + Math.cos(a) * 0.46, Z, 0.5 + Math.sin(a) * 0.46, 'moloz', i % 2 ? P.tas : 0x77726a, { ry: a }); }
  k.bacaDumani(0.55, Z + 0.3, 0.5, 1.1);
  // mağara resimli duvar levhası + kurutma + odun + çömlek
  k.kutu(0.5, 0.34, 0.05, 0.75, Z, -0.7, 'moloz', 0xc8b896);
  for (const [x, y, w, col] of [[0.62, 0.17, 0.1, 0xb6402a], [0.78, 0.2, 0.14, 0x3a2c22], [0.9, 0.14, 0.08, 0xb6402a]]) k.kutu(w, 0.07, 0.012, x, Z + y, -0.67, 'duz', col);
  kurutma(k, -0.85, 0.5, Z, 0.4);
  k.odun(-0.4, 0.82, Z, 1.2, 1.2);
  k.sil(0.045, 0.035, 0.09, 8, 0.95, Z, 0.9, 'duz', 0xb06a40); k.sil(0.03, 0.025, 0.06, 8, 0.85, Z, 0.95, 'duz', 0xc47a4a);
};

M.koy_meydani = (k, c) => {
  const Z = k.kaide(2, 'kerpic');
  const h = 0.5 * c.s, acik = 0xd8a878, koyu = 0xa87a52;
  // yönetim evi: kerpiç gövde, boyalı fris (mavi/kırmızı), tahta kiriş uçları, merlonlu dam
  k.kutu(1.05, h, 0.78, -0.25, Z, -0.38, 'kerpic', P.kerpic);
  k.kutu(1.1, 0.04, 0.83, -0.25, Z, -0.38, 'kerpic', koyu);
  k.kutu(1.1, 0.04, 0.83, -0.25, Z + h * 0.8, -0.38, 'duz', 0x2f6f9a);
  k.kutu(1.1, 0.025, 0.83, -0.25, Z + h * 0.8 + 0.04, -0.38, 'duz', 0xb6402a);
  k.kutu(1.12, 0.06, 0.85, -0.25, Z + h, -0.38, 'kerpic', acik);
  for (let i = 0; i < 7; i++) k.kutu(0.09, 0.07, 0.07, -0.72 + i * 0.16, Z + h + 0.06, 0.03, 'kerpic', acik); // merlonlar (ön)
  for (let i = 0; i < 6; i++) k.sil(0.018, 0.018, 0.1, 6, -0.7 + i * 0.17, Z + h - 0.06, 0.05, 'kutuk', P.kutuk, { rx: Math.PI / 2, y: Z + h - 0.04, z: 0.05 });
  // ikinci kat (Sv2+) ve çan direği
  if (c.sv >= 2) { k.kutu(0.5, 0.28, 0.4, -0.45, Z + h + 0.06, -0.5, 'kerpic', P.kerpic); k.kutu(0.56, 0.05, 0.46, -0.45, Z + h + 0.34, -0.5, 'kerpic', acik); }
  // büyük kemerli kapı + pencereler
  k.kutu(0.3, 0.34, 0.05, -0.25, Z, 0.03, 'kerpic', acik);
  k.kemer(-0.25, Z + 0.01, 0.06, 0.2, 0.3, 0x4a2e1c, false);
  for (const x of [-0.65, 0.12]) k.pencere(x, Z + h * 0.38, 0.015, 0.1, 0.12, 'z', { isikli: true, panjur: true, panjurRenk: 0x3f7a9a });
  // avlu: taş kuyu, dikili taş (bronz başlıklı), mangal, tente, kalkanlı bayraklar
  k.sil(0.12, 0.13, 0.13, 10, 0.55, Z, 0.5, 'tasBlok', 0xb4ae9e); k.sil(0.085, 0.085, 0.01, 10, 0.55, Z + 0.12, 0.5, 'duz', P.su);
  k.direk(0.47, 0.5, Z + 0.1, 0.22, 0.012); k.direk(0.63, 0.5, Z + 0.1, 0.22, 0.012); k.kutu(0.2, 0.012, 0.012, 0.55, Z + 0.32, 0.5, 'kutuk', P.direk); k.sil(0.012, 0.012, 0.06, 5, 0.55, Z + 0.26, 0.5, 'duz', 0x3a3632);
  k.kutu(0.12, 0.7 * c.s, 0.12, 0.8, Z, -0.55, 'tasBlok', P.siva); k.koni(0.09, 0.14, 4, 0.8, Z + 0.7 * c.s, -0.55, 'duz', P.bronz, { ry: Math.PI / 4 });
  k.kutu(0.14, 0.03, 0.14, 0.8, Z + 0.4 * c.s, -0.55, 'duz', 0xb6402a);
  k.atesYeri(0.1, 0.65, Z, 1.0);
  k.kutu(0.5, 0.025, 0.24, -0.6, Z + 0.34, 0.55, 'kumas', 0xc65a36, { rx: -0.22 });
  for (const x of [-0.84, -0.36]) k.direk(x, 0.68, Z, 0.34, 0.02);
  k.sandik(-0.6, 0.45, Z, 0.9); k.fici(-0.2, 0.85, Z); k.sil(0.045, 0.035, 0.09, 8, -0.95, Z, 0.82, 'duz', 0xb06a40);
  k.bayrak(0.95, 0.15, Z, 0.95, P.asi); k.bayrak(-0.95, -0.2, Z, 0.75, P.lacivert);
};

M.agora = (k, c) => {
  const Z = k.kaide(2, 'mermer');
  // basamaklı krepis + stylobate
  k.kutu(1.85, 0.05, 1.3, 0, Z, -0.15, 'mermer', P.mermer);
  k.kutu(1.75, 0.05, 1.2, 0, Z + 0.05, -0.15, 'mermer', P.kirec);
  k.kutu(1.65, 0.05, 1.1, 0, Z + 0.1, -0.15, 'mermer', P.mermer);
  const y = Z + 0.15, h = 0.5 * c.s;
  // cella (kapalı iç) + sütunlu cephe (ön ve yanlar)
  k.kutu(1.2, h, 0.62, 0, y, -0.32, 'tasBlok', P.kirec);
  const sut = (x, z) => { k.sil(0.04, 0.046, h, 10, x, y, z, 'mermer', P.mermer); k.sil(0.058, 0.058, 0.03, 10, x, y, z, 'mermer', 0xe8dcc0); k.sil(0.058, 0.05, 0.035, 10, x, y + h, z, 'mermer', 0xe8dcc0); k.kutu(0.13, 0.025, 0.13, x, y + h + 0.035, z, 'mermer', P.mermer); };
  for (let i = 0; i < 7; i++) sut(-0.72 + i * 0.24, 0.25);
  for (const x of [-0.72, 0.72]) for (const z of [-0.05, -0.35, -0.65]) sut(x, z);
  // arşitrav + friz (mavi/altın) + alınlık + saçaklı çatı
  k.kutu(1.78, 0.07, 1.05, 0, y + h + 0.06, -0.2, 'mermer', P.mermer);
  k.kutu(1.78, 0.045, 1.05, 0, y + h + 0.13, -0.2, 'duz', P.lacivert);
  for (let i = 0; i < 12; i++) k.kutu(0.07, 0.035, 0.012, -0.8 + i * 0.145, y + h + 0.135, 0.33, 'duz', P.altin);
  k.besik(1.1, 1.8, 0.42, 0, y + h + 0.175, -0.2, 'kiremit', 0xc4603a, { ry: Math.PI / 2 });
  k.sil(0.07, 0.07, 0.014, 14, 0, y + h + 0.3, 0.36, 'duz', P.altin, { rx: Math.PI / 2, y: y + h + 0.3 });
  for (const sx of [-1, 1]) k.kutu(0.06, 0.07, 0.04, sx * 0.9, y + h + 0.2, 0.34, 'duz', P.altin); // akroter
  k.kapi(0, y, 0.015, 0.2, 0.3, 'z', 0x5a3b24);
  // meydan: heykel kaidesi + bronz heykel, defne ağaçları, çeşme, bayraklar
  k.kutu(0.2, 0.18, 0.2, 0.0, Z, 0.78, 'mermer', P.kirec);
  k.sil(0.045, 0.055, 0.24, 8, 0, Z + 0.18, 0.78, 'mermer', P.mermer); k.kure(0.05, 0, Z + 0.46, 0.78, 'mermer', P.mermer);
  k.kutu(0.2, 0.02, 0.02, 0, Z + 0.38, 0.78, 'mermer', P.mermer);
  for (const [x, z] of [[-0.75, 0.75], [0.8, 0.82]]) { k.sil(0.02, 0.026, 0.16, 6, x, Z, z, 'kutuk', 0x6a4a2a); k.kure(0.11, x, Z + 0.26, z, 'duz', 0x5f8f48, { det: 1 }); }
  k.sil(0.12, 0.13, 0.06, 10, 0.5, Z, 0.78, 'mermer', P.kirec); k.sil(0.09, 0.09, 0.01, 10, 0.5, Z + 0.055, 0.78, 'duz', P.su);
  k.bayrak(-0.92, 0.7, Z, 0.8, P.lacivert); k.fici(0.88, 0.55, Z, 0.9); k.sandik(0.7, 0.9, Z);
};

M.sehir_meydani = (k, c) => {
  const Z = k.kaide(2, 'tas');
  const h1 = 0.36, h2 = 0.3 * c.s;
  // taş zemin kat (sivri kemerli galeri) + çıkmalı ahşap üst kat + dik arduvaz çatı
  k.kutu(1.12, h1, 0.8, -0.2, Z, -0.3, 'tasBlok', P.surTas);
  for (const x of [-0.6, -0.4, -0.2, 0.0, 0.2]) k.kemer(x, Z + 0.015, 0.108, 0.11, 0.26, 0x2a211a, true);
  k.kutu(1.24, 0.04, 0.94, -0.2, Z + h1 - 0.01, -0.3, 'tahta', P.kiris);
  k.kutu(1.24, h2, 0.94, -0.2, Z + h1 + 0.03, -0.3, 'yariAhsap', P.sivaB);
  const yu = Z + h1 + 0.03, zf = 0.175;
  for (const x of [-0.8, -0.5, -0.2, 0.1, 0.4]) k.kutu(0.025, h2, 0.025, x, yu, zf, 'kutuk', P.kiris);
  k.kutu(1.24, 0.025, 0.025, -0.2, yu + h2 - 0.012, zf, 'kutuk', P.kiris); k.kutu(1.24, 0.025, 0.025, -0.2, yu, zf, 'kutuk', P.kiris);
  for (const x of [-0.65, -0.35, -0.05, 0.25]) k.pencere(x, yu + h2 * 0.3, zf + 0.012, 0.11, 0.13, 'z', { isikli: true, panjur: true, panjurRenk: 0x7a3a2c });
  k.besik(1.4, 1.1, 0.6 * c.s, -0.2, yu + h2, -0.3, 'arduvaz', 0x5a6674, { ry: Math.PI / 2 });
  for (const x of [-0.65, -0.05]) { k.kutu(0.15, 0.14, 0.1, x, yu + h2 + 0.12, 0.2, 'yariAhsap', P.sivaB); k.besik(0.2, 0.15, 0.1, x, yu + h2 + 0.26, 0.2, 'arduvaz', 0x5a6674, { ry: Math.PI / 2 }); k.pencere(x, yu + h2 + 0.13, 0.255, 0.07, 0.07, 'z', { isikli: true, panjur: false }); }
  k.kapi(-0.3, Z, 0.108, 0.2, 0.28, 'z', 0x6a3a22);
  // saat kulesi: taş gövde + ahşap çan odası + sivri çatı + iki yüzde saat
  const kh = 1.1 * c.s;
  k.kutu(0.32, kh, 0.32, 0.62, Z, -0.55, 'tasBlok', P.surTas);
  for (const sy of [0.3, 0.62]) k.kutu(0.34, 0.025, 0.34, 0.62, Z + kh * sy, -0.55, 'tasBlok', 0x7a746a);
  k.kutu(0.36, 0.22, 0.36, 0.62, Z + kh, -0.55, 'yariAhsap', P.sivaB);
  k.kemer(0.62, Z + kh + 0.04, -0.37, 0.12, 0.15, 0x2a211a, true); k.kemer(0.8, Z + kh + 0.04, -0.55, 0.12, 0.15, 0x2a211a, true, { ry: Math.PI / 2 });
  k.kirma(0.46, 0.46, 0.5, 0.62, Z + kh + 0.22, -0.55, 'arduvaz', 0x4a5664);
  for (const [x, z, ry] of [[0.62, -0.385, 0], [0.8, -0.55, Math.PI / 2]]) { k.sil(0.085, 0.085, 0.02, 14, x, Z + kh * 0.72, z, 'duz', 0xf0e6c8, { rx: ry ? 0 : Math.PI / 2, rz: ry ? Math.PI / 2 : 0, y: Z + kh * 0.78 }); }
  k.bayrak(0.62, -0.55, Z + kh + 0.7, 0.28, P.sancak);
  // meydan: taş çeşme (sütunlu), pazar tezgâhı + sepet, kandil direkleri, el arabası
  k.sil(0.22, 0.24, 0.09, 10, 0.4, Z, 0.55, 'tasBlok', P.surTas); k.sil(0.19, 0.19, 0.02, 10, 0.4, Z + 0.075, 0.55, 'duz', P.su);
  k.sil(0.03, 0.045, 0.26, 6, 0.4, Z, 0.55, 'tasBlok', P.surTas); k.kure(0.05, 0.4, Z + 0.3, 0.55, 'tasBlok', P.surTas, { det: 1 });
  k.kutu(0.4, 0.04, 0.2, -0.7, Z + 0.16, 0.65, 'tahta', 0x8a5a32); k.kutu(0.46, 0.02, 0.26, -0.7, Z + 0.34, 0.65, 'kumas', 0xc4603a, { rx: -0.18 });
  for (const x of [-0.9, -0.5]) k.direk(x, 0.65, Z, 0.34, 0.014);
  k.kure(0.04, -0.78, Z + 0.2, 0.65, 'duz', 0xd04a3a); k.kure(0.04, -0.68, Z + 0.2, 0.65, 'duz', 0xe8b84a); k.kure(0.04, -0.6, Z + 0.2, 0.65, 'duz', 0x6aa04a);
  for (const [x, z] of [[-0.95, 0.25], [0.95, 0.35]]) { k.direk(x, z, Z, 0.42, 0.014, P.kiris); k.kutu(0.06, 0.07, 0.06, x, Z + 0.42, z, 'duz', P.pencere, { isil: true }); }
  k.kutu(0.2, 0.06, 0.12, 0.0, Z + 0.05, 0.85, 'tahta', 0x8a5a32); k.sil(0.05, 0.05, 0.015, 8, 0.1, Z + 0.05, 0.85, 'tahta', 0x6a4a2a, { rz: Math.PI / 2, y: Z + 0.05, x: 0.1 });
  baca(k, -0.7, -0.55, yu + h2 + 0.3, 0.25);
};

// ---------- GÖÇEBE ----------
M.cadir = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const s = c.s;
  k.koni(0.32 * s, 0.62 * s, 7, 0, Z, 0, 'deri', P.deri);
  k.koni(0.325 * s, 0.1 * s, 7, 0, Z + 0.18 * s, 0, 'kumas', c.sv >= 3 ? P.lacivert : P.kumasK, { acik: true, sy: 1 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.direk(Math.cos(a) * 0.035, Math.sin(a) * 0.035, Z + 0.5 * s, 0.22 * s, 0.01, P.direk, { rz: Math.cos(a) * 0.35, rx: -Math.sin(a) * 0.35 });
  }
  k.kutu(0.12, 0.2 * s, 0.02, 0.0, Z, 0.25 * s, 'deri', P.deriK, { rx: -0.45 });
  k.bacaDumani(0, Z + 0.68 * s, 0, 0.6);
  // kurutulan deri çerçevesi
  k.direk(-0.33, 0.25, Z, 0.26, 0.01); k.direk(-0.33, 0.05, Z, 0.26, 0.01);
  k.kutu(0.015, 0.16, 0.18, -0.33, Z + 0.08, 0.15, 'deri', 0xb08a60);
  if (c.sv >= 2) { k.koni(0.15, 0.3, 6, 0.3, Z, -0.3, 'deri', P.deriK); }
};

M.avci_kulubesi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const s = c.s;
  // eğik çatılı dal kulübe
  k.besik(0.5 * s, 0.55 * s, 0.45 * s, 0, Z, -0.05, 'deri', 0xa88660, { ry: Math.PI / 2 });
  k.kutu(0.3, 0.3 * s, 0.02, 0, Z, 0.22 * s, 'deri', P.deriK, { rx: 0.1 });
  for (const x of [-0.28, 0.28]) k.direk(x * s, -0.05, Z + 0.3 * s, 0.25, 0.012, P.direk, { rz: x > 0 ? 0.6 : -0.6 });
  // av ganimeti: boynuz + asılı post
  k.kutu(0.04, 0.04, 0.04, 0, Z + 0.47 * s, 0.25 * s, 'duz', P.kemik);
  for (const sx of [-1, 1]) k.sil(0.006, 0.012, 0.12, 4, sx * 0.05, Z + 0.47 * s, 0.25 * s, 'duz', P.kemik, { rz: -sx * 0.7 });
  k.direk(0.33, 0.3, Z, 0.3, 0.012); k.direk(0.33, 0.05, Z, 0.3, 0.012);
  k.kutu(0.02, 0.02, 0.27, 0.33, Z + 0.28, 0.175, 'kutuk', P.direk);
  k.kutu(0.012, 0.15, 0.14, 0.33, Z + 0.12, 0.17, 'deri', 0x7a5232);
  for (let i = 0; i < 3; i++) k.direk(-0.3 + i * 0.04, 0.32, Z, 0.42, 0.007, 0x9a8060, { rz: -0.25 });
};

M.toplayici_barinagi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  k.kubbe(0.3 * c.s, -0.05, Z, -0.05, 'hasir', 0xb08a58, { sy: 0.85, seg: 9 });
  k.kapi(-0.05, Z, 0.24 * c.s, 0.12, 0.15, 'z', 0x3a2a1c);
  for (const [x, z, r] of [[0.3, 0.2, 0.06], [0.22, 0.33, 0.05], [0.33, -0.05, 0.045]]) {
    k.sil(r, r * 0.8, r * 1.3, 8, x, Z, z, 'hasir', 0xc49a5a);
    k.kure(r * 0.8, x, Z + r * 1.35, z, 'duz', [0xb03050, 0x6a3a8a, 0xd08a3a][Math.floor(k.R() * 3)]);
  }
  k.kure(0.1, -0.32, Z + 0.06, 0.3, 'duz', P.yaprak, { det: 1 });
  k.kure(0.022, -0.28, Z + 0.13, 0.36, 'duz', 0xc02040);
  k.kure(0.022, -0.36, Z + 0.1, 0.26, 'duz', 0xc02040);
};

M.oduncu_kampi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  k.besik(0.42, 0.4, 0.36 * c.s, -0.12, Z, -0.15, 'kutuk', 0x8a6a44);
  k.kutu(0.38, 0.33 * c.s, 0.02, -0.12, Z, -0.33, 'tahta', 0x7a5634);
  k.odun(0.2, -0.22, Z, Math.PI / 2, 1.2);
  k.odun(0.25, 0.2, Z, 0.2, 1);
  // kütük + balta
  k.sil(0.07, 0.08, 0.1, 8, -0.15, Z, 0.25, 'kutuk', 0x9a7044);
  k.sil(0.065, 0.065, 0.005, 8, -0.15, Z + 0.1, 0.25, 'duz', 0xd8b880);
  k.kutu(0.012, 0.14, 0.012, -0.15, Z + 0.1, 0.25, 'kutuk', 0x6a4a2a, { rz: 0.4 });
  k.kutu(0.05, 0.035, 0.008, -0.12, Z + 0.21, 0.25, 'duz', 0x9a9a9a, { rz: 0.4 });
  k.sil(0.012, 0.012, 0.004, 6, 0.0, Z, 0.38, 'duz', 0xd8b880);
};

M.kurutma_rafi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const h = 0.4 * c.s;
  for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) k.direk(x, z, Z, h, 0.014);
  for (const z of [-0.2, 0.2]) k.kutu(0.66, 0.02, 0.02, 0, Z + h - 0.03, z, 'kutuk', P.direk);
  for (let i = 0; i < 5; i++) k.kutu(0.015, 0.015, 0.44, -0.24 + i * 0.12, Z + h - 0.01, 0, 'kutuk', P.direk);
  for (let i = 0; i < 4; i++) {
    const x = -0.18 + i * 0.12;
    if (i % 2) k.kutu(0.09, 0.2, 0.008, x, Z + h - 0.24, 0.2, 'deri', [0xb08060, 0x9a7050][i % 2]);
    else for (let j = 0; j < 3; j++) k.kutu(0.018, 0.12, 0.012, x - 0.03 + j * 0.03, Z + h - 0.16, -0.2, 'duz', 0xc06a4a);
  }
  k.kutu(0.25, 0.02, 0.18, 0, Z + 0.05, 0, 'deri', P.deriK, { rx: 0.1 });
  k.sil(0.05, 0.04, 0.08, 8, 0.36, Z, 0.34, 'hasir', 0xc49a5a);
};

// Yerel çerçevede yerleştirme: geometri önce eğilir (rx/rz), sonra `a` kadar döndürülür, sonra konumlanır.
// Yerel +z = bakış yönü (a = π/4 → kameraya dönük). Totem, darphane gibi "ana vitrin" yapılarda kullanılır.
function parca(k, geo, doku, renk, a, lx, ly, lz, rx = 0, rz = 0, o = {}) {
  if (rx) geo.rotateX(rx);
  if (rz) geo.rotateZ(rz);
  geo.rotateY(a);
  const c = Math.cos(a), sn = Math.sin(a);
  geo.translate(lx * c + lz * sn, ly, -lx * sn + lz * c);
  return k.ekle(geo, { doku, renk, ...o });
}
const kutuG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const koniG = (r, h, seg = 5) => new THREE.ConeGeometry(r, h, seg);

M.totem = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const a = Math.PI / 4, S = c.s;
  const siyah = 0x1a1410, beyaz = 0xf0e8d4, kirmizi = 0xb6402a, mavi = 0x2f6f9a, sari = 0xe2b23a, yesil = 0x3f8a5a;
  // zemin: höyük, taş halka, adak çanağı
  k.sil(0.36, 0.42, 0.05, 10, 0, Z, 0, 'duz', 0x9a7a4c);
  for (let i = 0; i < 9; i++) { const q = (i / 9) * Math.PI * 2 + 0.2; k.tas(Math.cos(q) * 0.33, Math.sin(q) * 0.33, Z + 0.03, 0.045 + (i % 3) * 0.01, i % 2 ? 0xb4ae9e : 0x9a9486); }
  // gövde: hafif konik, dikey oluklu
  const h = 1.0 * S, w0 = 0.115;
  k.sil(w0 * 0.82, w0, h, 8, 0, Z + 0.04, 0, 'kutuk', 0x6a4426);
  for (let i = 0; i < 8; i++) { const q = (i / 8) * Math.PI * 2; k.kutu(0.012, h * 0.96, 0.012, Math.cos(q) * w0 * 0.9, Z + 0.06, Math.sin(q) * w0 * 0.9, 'kutuk', 0x4e301a); }
  const z0 = Z + 0.04;
  const yuzK = w0 * 0.86; // gövde yarıçapı civarı: yüz özellikleri bu mesafede
  // ---- 1) AYI (alt): geniş kafa, kulaklar, burun, dişler, patiler ----
  let y = z0 + 0.19 * S;
  parca(k, kutuG(0.27, 0.2, 0.17), 'kutuk', 0x8a5a30, a, 0, y, 0.02);
  parca(k, kutuG(0.15, 0.1, 0.1), 'kutuk', 0xa87040, a, 0, y - 0.04, yuzK + 0.07);        // burun/ağız bloğu
  parca(k, kutuG(0.06, 0.04, 0.03), 'duz', siyah, a, 0, y - 0.01, yuzK + 0.125);           // burun ucu
  for (const sx of [-1, 1]) {
    parca(k, kutuG(0.05, 0.05, 0.03), 'duz', beyaz, a, sx * 0.07, y + 0.05, yuzK + 0.07);   // göz akı
    parca(k, kutuG(0.025, 0.03, 0.03), 'duz', siyah, a, sx * 0.07, y + 0.05, yuzK + 0.085);
    parca(k, kutuG(0.07, 0.07, 0.05), 'kutuk', 0x6a4220, a, sx * 0.12, y + 0.12, 0);        // kulak
    parca(k, kutuG(0.05, 0.12, 0.05), 'kutuk', 0x8a5a30, a, sx * 0.17, y - 0.05, 0.05, 0, sx * 0.25); // pati/kol
    for (let t = -1; t <= 1; t++) parca(k, koniG(0.012, 0.04, 4), 'duz', beyaz, a, sx * 0.17 + t * 0.014, y - 0.13, 0.07, Math.PI, 0); // pençe
  }
  for (let t = -2; t <= 2; t++) parca(k, kutuG(0.016, 0.03, 0.012), 'duz', beyaz, a, t * 0.025, y - 0.1, yuzK + 0.12); // dişler
  parca(k, kutuG(0.27, 0.02, 0.17), 'duz', kirmizi, a, 0, y + 0.105, 0.02);                  // boyalı şerit
  // ---- 2) KURT / ruh yüzü (orta): mavi, büyük göz, açık ağız ----
  y = z0 + 0.47 * S;
  parca(k, kutuG(0.25, 0.22, 0.16), 'kutuk', mavi, a, 0, y, 0.02);
  for (const sx of [-1, 1]) {
    parca(k, kutuG(0.08, 0.06, 0.03), 'duz', beyaz, a, sx * 0.075, y + 0.05, yuzK + 0.065);
    parca(k, kutuG(0.035, 0.035, 0.03), 'duz', kirmizi, a, sx * 0.075, y + 0.05, yuzK + 0.082);
    parca(k, koniG(0.045, 0.12, 4), 'kutuk', 0x244f70, a, sx * 0.1, y + 0.15, 0);          // sivri kulak
  }
  parca(k, kutuG(0.15, 0.06, 0.04), 'duz', siyah, a, 0, y - 0.06, yuzK + 0.07);               // ağız boşluğu
  parca(k, kutuG(0.05, 0.05, 0.02), 'duz', kirmizi, a, 0, y - 0.09, yuzK + 0.085);            // dil
  for (let t = -2; t <= 2; t++) parca(k, kutuG(0.014, 0.025, 0.012), 'duz', beyaz, a, t * 0.028, y - 0.035, yuzK + 0.095);
  parca(k, kutuG(0.25, 0.02, 0.16), 'duz', sari, a, 0, y - 0.115, 0.02);
  // ---- 3) KARTAL (üst): gaga, kanatlar (üç kat tüy), kuyruk ----
  y = z0 + 0.77 * S;
  parca(k, kutuG(0.2, 0.2, 0.15), 'kutuk', sari, a, 0, y, 0.02);
  parca(k, koniG(0.07, 0.17, 4), 'duz', 0xe8862a, a, 0, y - 0.02, yuzK + 0.1, Math.PI / 2 + 0.25, 0, { ry: 0 });    // kıvrık gaga
  for (const sx of [-1, 1]) {
    parca(k, kutuG(0.05, 0.05, 0.03), 'duz', beyaz, a, sx * 0.06, y + 0.06, yuzK + 0.05);
    parca(k, kutuG(0.025, 0.03, 0.03), 'duz', siyah, a, sx * 0.06, y + 0.06, yuzK + 0.065);
    // kanat: üç sıra tüy, dışa doğru uzar ve hafif yukarı kıvrılır
    const kat = [[0.3, 0.07, kirmizi, 0.0], [0.27, 0.06, mavi, -0.06], [0.22, 0.05, sari, -0.11]];
    kat.forEach(([L, hh, col, dy], q) => {
      parca(k, kutuG(L, hh, 0.03), 'kumas', col, a, sx * (0.1 + L / 2), y + 0.0 + dy, -0.02 - q * 0.012, 0, sx * 0.18);
      for (let t = 0; t < 4; t++) parca(k, kutuG(0.045, 0.02, 0.025), 'kumas', col, a, sx * (0.12 + t * L / 4.2 + 0.03), y + dy - hh / 2 - 0.008 + sx * 0 - t * 0.003, -0.02 - q * 0.012, 0, sx * 0.18);
    });
  }
  // ---- tepe: tüy tacı ----
  const tepe = z0 + h * 0.98;
  const tuyr = [kirmizi, sari, mavi, yesil, kirmizi, sari, mavi];
  for (let i = 0; i < 7; i++) {
    const q = (i - 3) * 0.32;
    parca(k, koniG(0.03, 0.2 - Math.abs(i - 3) * 0.02, 4), 'kumas', tuyr[i], a, Math.sin(q) * 0.09, tepe + 0.1, 0, 0, -q * 0.9);
  }
  parca(k, kutuG(0.2, 0.04, 0.17), 'kutuk', 0x4e301a, a, 0, tepe - 0.01, 0.02);
  // yan şeritler / bağlı kuşaklar
  k.kutu(0.2, 0.025, 0.2, 0, z0 + 0.33 * S, 0, 'kumas', beyaz, { ry: a });
  k.kutu(0.2, 0.025, 0.2, 0, z0 + 0.62 * S, 0, 'kumas', kirmizi, { ry: a });
  // adak: çanak + ateş, kafatası, kürk
  k.sil(0.06, 0.04, 0.04, 8, 0.3, Z + 0.04, 0.3, 'tasBlok', 0x8f8a80);
  k.atesYeri(0.3, 0.3, Z + 0.07, 0.35);
  k.kutu(0.2, 0.012, 0.14, -0.3, Z + 0.045, 0.22, 'deri', 0xb59868, { ry: 0.5 });
  k.kure(0.035, -0.3, Z + 0.07, 0.22, 'duz', beyaz);
  for (const [x, zz, ry] of [[-0.2, -0.3, 0.4], [0.05, -0.34, 1.2]]) k.kutu(0.1, 0.012, 0.012, x, Z + 0.05, zz, 'kemik', P.kemik, { ry });
};

M.gozcu_diregi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const h = 0.9 * c.s;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.direk(sx * 0.2, sz * 0.2, Z, h, 0.018, P.direk, { rz: sx * 0.08, rx: -sz * 0.08 });
  k.kutu(0.34, 0.03, 0.34, 0, Z + h - 0.03, 0, 'tahta', 0x8a6a44);
  for (const [w, d, x, z] of [[0.34, 0.015, 0, 0.165], [0.34, 0.015, 0, -0.165], [0.015, 0.34, 0.165, 0], [0.015, 0.34, -0.165, 0]]) k.kutu(w, 0.08, d, x, Z + h, z, 'tahta', 0x7a5634);
  k.koni(0.26, 0.2, 6, 0, Z + h + 0.12, 0, 'deri', P.deri);
  for (let i = 0; i < 2; i++) k.direk(0, 0, Z + h - 0.01, 0.14, 0.01);
  // merdiven
  for (const x of [0.05, -0.05]) k.kutu(0.015, h, 0.015, x, Z, 0.26, 'kutuk', P.direk, { rx: -0.08 });
  for (let i = 1; i < 6; i++) k.kutu(0.1, 0.012, 0.012, 0, Z + (i * h) / 6, 0.26 - i * 0.012, 'kutuk', P.direk);
  k.bayrak(0.17, -0.17, Z + h + 0.05, 0.3, P.kumasK);
};

M.sifaci_cadiri = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const s = c.s;
  k.koni(0.3 * s, 0.52 * s, 6, -0.05, Z, -0.05, 'deri', 0xd6c09a);
  k.koni(0.302 * s, 0.06, 6, -0.05, Z + 0.12, -0.05, 'kumas', 0x3a8a6a, { acik: true });
  k.koni(0.2 * s, 0.04, 6, -0.05, Z + 0.24 * s, -0.05, 'kumas', P.asi, { acik: true });
  for (let i = 0; i < 4; i++) k.direk(-0.05 + (i - 1.5) * 0.02, -0.05, Z + 0.45 * s, 0.15, 0.008, P.direk, { rz: (i - 1.5) * 0.3 });
  // ot ipi
  k.direk(0.3, -0.3, Z, 0.3, 0.01); k.direk(0.3, 0.3, Z, 0.3, 0.01);
  k.kutu(0.008, 0.008, 0.6, 0.3, Z + 0.28, 0, 'duz', 0x6a5a40);
  for (let i = 0; i < 5; i++) k.kutu(0.03, 0.08, 0.02, 0.3, Z + 0.2, -0.22 + i * 0.11, 'duz', [0x6a8a3a, 0x8aa040, 0x9a6a8a][i % 3]);
  // kazan + buhar
  k.sil(0.07, 0.05, 0.07, 8, -0.2, Z + 0.03, 0.27, 'duz', 0x3a3632);
  k.sil(0.06, 0.06, 0.005, 8, -0.2, Z + 0.1, 0.27, 'duz', 0x6ab08a, { isil: true });
  k.atesYeri(-0.2, 0.27, Z - 0.02, 0.45);
};

// ---------- TAŞ DEVRİ ----------
M.kulube = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const s = c.s, h = 0.24 * s;
  k.sil(0.29, 0.31, h, 9, 0, Z, 0, 'moloz', 0x9a8a70);
  k.koni(0.4 * s, 0.42 * s, 9, 0, Z + h - 0.03, 0, 'saman', P.saman);
  k.sil(0.04, 0.06, 0.05, 6, 0, Z + h + 0.36 * s, 0, 'saman', 0x9a8048);
  k.bacaDumani(0, Z + h + 0.42 * s, 0, 0.7);
  k.kapi(0, Z, 0.29, 0.12, 0.17, 'z', 0x4a3220);
  k.pencere(0.3, Z + 0.13, -0.05, 0.06, 0.06, 'x');
  k.odun(0.32, 0.3, Z, 0.8, 0.8);
  if (c.sv >= 2) k.sil(0.06, 0.05, 0.1, 8, -0.33, Z, 0.3, 'hasir', 0xc49a5a);
};

M.tas_ocagi = (k, c) => {
  const Z = k.kaide(2, 'toprak');
  // basamaklı kesilmiş kaya
  k.kutu(1.2, 0.5 * c.s, 0.7, -0.2, Z, -0.45, 'moloz', 0x9a958a);
  k.kutu(0.9, 0.32 * c.s, 0.45, -0.25, Z, 0.05, 'tasBlok', 0xa8a294);
  k.kutu(0.5, 0.15, 0.3, -0.35, Z, 0.4, 'tasBlok', 0xb0aa9c);
  for (let i = 0; i < 6; i++) k.kutu(0.12, 0.08, 0.1, 0.45 + (i % 2) * 0.15, Z + Math.floor(i / 2) * 0.0, 0.2 + Math.floor(i / 2) * 0.17, 'tasBlok', 0xb8b2a4, { ry: k.R() * 0.4 });
  k.kutu(0.12, 0.08, 0.1, 0.52, Z + 0.08, 0.28, 'tasBlok', 0xb8b2a4);
  // ahşap üçayak vinç
  for (const [x, z, rz, rx] of [[0.5, -0.45, 0.25, 0], [0.75, -0.45, -0.25, 0], [0.62, -0.25, 0, -0.3]]) k.direk(x, z, Z, 0.75, 0.015, P.direk, { rz, rx });
  k.kutu(0.012, 0.35, 0.012, 0.62, Z + 0.35, -0.4, 'duz', 0x6a5a40);
  k.kutu(0.1, 0.07, 0.08, 0.62, Z + 0.28, -0.4, 'tasBlok', 0xb8b2a4);
  for (let i = 0; i < 5; i++) k.tas(-0.75 + k.R() * 0.3, 0.6 + k.R() * 0.2, Z, 0.04 + k.R() * 0.03);
};

M.alet_yapimcisi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const h = 0.32 * c.s;
  for (const [x, z] of [[-0.3, -0.25], [0.25, -0.25], [-0.3, 0.2], [0.25, 0.2]]) k.direk(x, z, Z, h + (z < 0 ? 0.1 : 0), 0.016);
  k.kutu(0.7, 0.04, 0.6, -0.025, Z + h + 0.04, -0.025, 'saman', P.saman, { rx: 0.18 });
  k.kutu(0.62, 0.22, 0.04, -0.025, Z, -0.27, 'hasir', 0xa08058);
  // çalışma taşı + aletler
  k.kutu(0.24, 0.1, 0.16, -0.05, Z, 0.0, 'moloz', 0x8a8478);
  for (let i = 0; i < 3; i++) k.koni(0.02, 0.06, 4, -0.12 + i * 0.07, Z + 0.1, 0.0, 'duz', [0x3a3a44, 0x5a5a66, 0x2a2a30][i], { rz: Math.PI / 2, y: Z + 0.12 });
  k.kutu(0.015, 0.12, 0.015, 0.1, Z + 0.1, 0.03, 'kutuk', P.direk, { rz: -0.6 });
  k.atesYeri(0.3, 0.3, Z, 0.5);
  k.tas(-0.3, 0.32, Z, 0.05); k.tas(-0.2, 0.36, Z, 0.035);
  k.bacaDumani(0.3, Z + 0.1, 0.3, 0.5);
};

M.erzak_cukuru = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  k.sil(0.27, 0.3, 0.07, 10, 0, Z, 0, 'moloz', P.tas);
  k.sil(0.21, 0.21, 0.005, 10, 0, Z + 0.07, 0, 'duz', 0x2a2018);
  k.kutu(0.44, 0.02, 0.2, 0, Z + 0.075, -0.08, 'tahta', 0x8a6a44, { ry: 0.15 });
  for (const [x, z] of [[0.3, 0.28], [0.18, 0.34], [-0.3, 0.3]]) {
    k.sil(0.045, 0.035, 0.1, 8, x, Z, z, 'duz', 0xb06a40);
    k.sil(0.025, 0.04, 0.03, 8, x, Z + 0.1, z, 'duz', 0xb06a40);
  }
  if (c.sv >= 2) k.kubbe(0.12, -0.3, Z, -0.28, 'saman', P.saman, { sy: 1.2 });
};

M.nobet_citi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  const h = 0.4 * c.s;
  for (let i = 0; i < 7; i++) {
    const x = -0.33 + i * 0.11;
    k.sil(0.04, 0.045, h, 6, x, Z, -0.3, 'kutuk', 0x8a6238);
    k.koni(0.04, 0.08, 6, x, Z + h, -0.3, 'kutuk', 0x9a7a50);
  }
  for (let i = 0; i < 4; i++) {
    const z = -0.2 + i * 0.11;
    k.sil(0.04, 0.045, h, 6, -0.33, Z, z, 'kutuk', 0x8a6238);
    k.koni(0.04, 0.08, 6, -0.33, Z + h, z, 'kutuk', 0x9a7a50);
  }
  k.kutu(0.25, 0.2, 0.2, 0.1, Z, 0.0, 'tahta', 0x8a6a44);
  k.kutu(0.28, 0.02, 0.24, 0.1, Z + 0.2, 0.0, 'tahta', 0x6a4a2a);
  k.atesYeri(0.2, 0.28, Z, 0.45);
  for (let i = 0; i < 3; i++) k.direk(0.3 + i * 0.03, -0.1, Z, 0.4, 0.007, 0x9a8060, { rz: -0.2 });
};

M.balikci_siginagi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  for (const [x, z] of [[-0.25, -0.25], [0.15, -0.25], [-0.25, 0.1], [0.15, 0.1]]) k.direk(x, z, Z, 0.16, 0.016);
  k.kutu(0.48, 0.03, 0.43, -0.05, Z + 0.16, -0.075, 'tahta', 0x8a6a44);
  k.kutu(0.38, 0.18, 0.32, -0.05, Z + 0.19, -0.1, 'hasir', 0xa08058);
  k.besik(0.48, 0.44, 0.22, -0.05, Z + 0.37, -0.1, 'saman', P.saman);
  k.kapi(-0.05, Z + 0.19, 0.065, 0.1, 0.13, 'z');
  // kano + ağ + balık asması
  k.ekle(new THREE.SphereGeometry(0.06, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { doku: 'kutuk', renk: 0x6a4a2a, x: 0.15, y: Z + 0.06, z: 0.33, sx: 4, sz: 1, ry: 0.2 });
  k.direk(0.36, -0.3, Z, 0.32, 0.01); k.direk(0.36, 0.05, Z, 0.32, 0.01);
  k.kutu(0.006, 0.2, 0.33, 0.36, Z + 0.1, -0.125, 'hasir', 0xd8d0b0);
  for (let i = 0; i < 4; i++) k.kutu(0.02, 0.07, 0.012, -0.3, Z + 0.06, -0.2 + i * 0.06, 'duz', 0x9ab0c0);
};

const tarla = (k, c, g, ekinRenk, sec = {}) => {
  const Z = ZEMIN_Y + 0.005;
  const w = g - 0.12;
  k.kutu(w, 0.03, w, 0, Z - 0.02, 0, 'toprak', 0x7a5a32);
  const n = Math.round(g * 4);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / n;
    k.kutu((w / n) * 0.55, 0.06 + 0.02 * c.sv, w - 0.16, x, Z + 0.01, 0, 'ekin', ekinRenk);
  }
  if (sec.cit !== false) {
    const a = w / 2 + 0.02;
    k.cit(-a, -a, a, -a, Z, 0x7a5634); k.cit(-a, -a, -a, a, Z, 0x7a5634); k.cit(a, -a, a, a * 0.3, Z, 0x7a5634);
  }
  return Z;
};

M.tahil_bahcesi = (k, c) => {
  const Z = tarla(k, c, 2, P.ekinY);
  // korkuluk
  k.direk(0.3, 0.2, Z, 0.42, 0.012);
  k.kutu(0.24, 0.015, 0.015, 0.3, Z + 0.32, 0.2, 'kutuk', P.direk);
  k.kutu(0.1, 0.13, 0.06, 0.3, Z + 0.22, 0.2, 'kumas', 0x8a5a3a);
  k.kure(0.045, 0.3, Z + 0.42, 0.2, 'saman', P.saman);
  k.koni(0.07, 0.06, 6, 0.3, Z + 0.44, 0.2, 'saman', 0xa08040);
  k.sil(0.05, 0.04, 0.08, 8, 0.8, Z, 0.8, 'hasir', 0xc49a5a);
};

M.agil = (k, c) => {
  const Z = k.kaide(2, 'toprak');
  const a = 0.82;
  k.cit(-a, -a, a, -a, Z, 0x7a5634, 0.16); k.cit(-a, a, a, a, Z, 0x7a5634, 0.16);
  k.cit(-a, -a, -a, a, Z, 0x7a5634, 0.16); k.cit(a, -a, a, -0.1, Z, 0x7a5634, 0.16); k.cit(a, 0.25, a, a, Z, 0x7a5634, 0.16);
  // sığınak
  k.kutu(0.5, 0.25, 0.35, -0.45, Z, -0.5, 'tahta', 0x8a6a44);
  k.besik(0.6, 0.45, 0.2, -0.45, Z + 0.25, -0.5, 'saman', P.saman);
  k.kutu(0.3, 0.05, 0.08, 0.3, Z, -0.55, 'tahta', 0x7a5634);
  k.kutu(0.26, 0.01, 0.05, 0.3, Z + 0.045, -0.55, 'duz', P.su);
  // koyunlar
  const n = 3 + c.sv;
  for (let i = 0; i < n; i++) {
    const x = -0.4 + ((i * 0.37) % 1.1), z = 0.0 + ((i * 0.53) % 0.7), ry = k.R() * 6;
    k.ekle(new THREE.IcosahedronGeometry(0.07, 0), { doku: 'duz', renk: P.yun, x, y: Z + 0.09, z, sx: 1.4, sy: 0.9, ry });
    k.kutu(0.04, 0.045, 0.04, x + Math.cos(ry) * 0.1, Z + 0.07, z - Math.sin(ry) * 0.1, 'duz', 0x2a2420, { ry });
  }
  k.odun(0.5, -0.2, Z, 1.57, 0.8);
};

M.magara_resmi = (k, c) => {
  const Z = k.kaide(2, 'toprak');
  // kaya çıkıntısı
  const kayalar = [[-0.3, -0.35, 0.5], [0.25, -0.45, 0.4], [-0.55, 0.1, 0.32], [0.45, 0.0, 0.25]];
  for (const [x, z, r] of kayalar) k.ekle(new THREE.DodecahedronGeometry(r, 0), { doku: 'moloz', renk: 0x8a8274, x, y: Z + r * 0.45, z, sy: 0.85 * c.s, ry: k.R() * 3 });
  k.ekle(new THREE.SphereGeometry(0.18, 8, 4, 0, Math.PI), { doku: 'duz', renk: 0x15100c, x: -0.1, y: Z, z: 0.02, sz: 0.4, rx: 0 });
  // el izleri / boyalar
  for (let i = 0; i < 5; i++) k.kutu(0.04, 0.04, 0.01, 0.1 + i * 0.07, Z + 0.25 + (i % 2) * 0.06, 0.0, 'duz', [P.asi, 0x7a2a1a, 0xd8b04a][i % 3], { rx: -0.6, z: -0.02 + i * 0.01 });
  for (let i = 0; i < 4; i++) k.kutu(0.08, 0.3 + (i % 2) * 0.15, 0.07, -0.7 + i * 0.4, Z, 0.7, 'moloz', P.tas, { ry: i });
  k.atesYeri(0.15, 0.4, Z, 0.8);
};

// ---------- BRONZ / DEMİR ----------
M.kerpic_ev = (k, c) => {
  const Z = k.kaide(1, 'kerpic');
  const h = 0.34 * c.s, w = 0.6;
  const duvar = P.kerpic, acik = 0xd8a878, koyu = 0xa87a52;
  // gövde: hafif konik kerpiç blok + alt kaide şeridi + düz dam bordürü
  k.kutu(w, h, w, 0, Z, 0, 'kerpic', duvar);
  k.kutu(w + 0.04, 0.04, w + 0.04, 0, Z, 0, 'kerpic', koyu);
  k.kutu(w + 0.05, 0.045, w + 0.05, 0, Z + h, 0, 'kerpic', acik);
  for (const [bx, bz, bw, bd] of [[0, w / 2 + 0.01, w + 0.05, 0.025], [0, -w / 2 - 0.01, w + 0.05, 0.025], [w / 2 + 0.01, 0, 0.025, w + 0.05], [-w / 2 - 0.01, 0, 0.025, w + 0.05]]) k.kutu(bw, 0.04, bd, bx, Z + h + 0.045, bz, 'kerpic', acik);
  // dam kirişleri (ön ve yan yüzde dışarı taşan kütük uçları) + kırmızı biber / mısır şeritleri
  for (let i = 0; i < 4; i++) k.sil(0.017, 0.017, 0.1, 6, -0.21 + i * 0.14, Z + h - 0.045, w / 2 + 0.02, 'kutuk', P.kutuk, { rx: Math.PI / 2, y: Z + h - 0.03, z: w / 2 + 0.02 });
  for (let i = 0; i < 3; i++) k.sil(0.017, 0.017, 0.1, 6, w / 2 + 0.02, Z + h - 0.045, -0.15 + i * 0.15, 'kutuk', P.kutuk, { rz: Math.PI / 2, y: Z + h - 0.03, x: w / 2 + 0.02 });
  for (const [x, col] of [[-0.14, 0xc83a2a], [0, 0xe0a83a], [0.14, 0xc83a2a]]) for (let q = 0; q < 4; q++) k.kutu(0.022, 0.034, 0.016, x + (q % 2) * 0.008, Z + h - 0.095 - q * 0.032, w / 2 + 0.085, 'kumas', col);
  // kapı (kemerli) + lento + eşik; kapının yanında iki pencere
  k.kutu(0.2, 0.05, 0.02, -0.12, Z + 0.215, w / 2 + 0.008, 'kerpic', acik);
  k.kemer(-0.12, Z + 0.01, w / 2 + 0.012, 0.14, 0.22, 0x5a3b24, false);
  k.kutu(0.17, 0.016, 0.07, -0.12, Z, w / 2 + 0.04, 'tasBlok', 0xb4ae9e);
  k.pencere(0.17, Z + 0.15, w / 2 + 0.006, 0.09, 0.1, 'z', { isikli: true, panjur: true, panjurRenk: 0x3f7a9a });
  k.pencere(w / 2 + 0.006, Z + 0.15, 0.1, 0.09, 0.1, 'x', { panjur: true, panjurRenk: 0x3f7a9a });
  // gölgelik (çatı tentesi) ve kerpiç çatı merdiveni
  k.kutu(0.34, 0.018, 0.2, -0.12, Z + 0.28, w / 2 + 0.1, 'kumas', 0xd0603a, { rx: 0.28 });
  for (const x of [-0.27, 0.03]) k.direk(x, w / 2 + 0.17, Z, 0.27, 0.014);
  for (const x of [0.4, 0.46]) k.kutu(0.012, h + 0.12, 0.012, x, Z, w / 2 + 0.03, 'kutuk', P.direk, { rz: -0.12 });
  for (let i = 1; i < 6; i++) k.kutu(0.08, 0.012, 0.012, 0.43 - i * 0.008, Z + (i * (h + 0.05)) / 6, w / 2 + 0.03, 'kutuk', P.direk);
  if (c.sv >= 2) { // üst kat odası + küçük balkon
    k.kutu(0.34, 0.2, 0.34, -0.1, Z + h + 0.08, -0.1, 'kerpic', duvar);
    k.kutu(0.38, 0.04, 0.38, -0.1, Z + h + 0.28, -0.1, 'kerpic', acik);
    k.kemer(-0.1, Z + h + 0.1, 0.075, 0.1, 0.14, 0xffcf7a, false, { isil: true });
  }
  if (c.sv >= 3) { for (let i = 0; i < 3; i++) k.kure(0.05, 0.12 + i * 0.07, Z + h + 0.12, 0.2 - i * 0.07, 'duz', 0x5a8a3a, { det: 1 }); k.bayrak(-0.24, -0.24, Z + h + 0.32, 0.2, P.asi); }
  baca(k, 0.2, -0.2, Z + h + 0.085, 0.12, 'kerpic', koyu);
  // avlu: çömlekler, su küpü, kurutma çuvalı
  k.sil(0.045, 0.035, 0.09, 8, -0.38, Z, 0.38, 'duz', 0xb06a40);
  k.sil(0.03, 0.025, 0.06, 8, -0.3, Z, 0.43, 'duz', 0xc47a4a);
  k.sil(0.05, 0.05, 0.05, 8, 0.38, Z, 0.4, 'saman', 0xc8a85a);
};

M.kil_ocagi = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  k.sil(0.2, 0.22, 0.04, 9, -0.15, Z - 0.02, -0.15, 'toprak', 0xa86a3a);
  k.sil(0.17, 0.17, 0.005, 9, -0.15, Z + 0.02, -0.15, 'duz', 0x8a4a2a);
  // kuruyan tuğlalar
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) k.kutu(0.07, 0.03, 0.045, 0.1 + i * 0.08, Z, 0.15 + j * 0.08, 'duz', 0xc08050);
  // küçük çömlek fırını
  k.kubbe(0.15 * c.s, -0.2, Z, 0.22, 'kerpic', 0xa86a3a, { sy: 1.2 });
  k.kutu(0.07, 0.06, 0.02, -0.2, Z, 0.36, 'duz', P.kor, { isil: true });
  k.bacaDumani(-0.2, Z + 0.2, 0.22, 0.5);
  for (const [x, z] of [[0.3, -0.25], [0.2, -0.32], [0.35, -0.12]]) k.sil(0.035, 0.03, 0.09, 8, x, Z, z, 'duz', 0xb06a40);
};

M.maden_ocagi = (k, c) => {
  const Z = k.kaide(2, 'toprak');
  k.ekle(new THREE.DodecahedronGeometry(0.7, 0), { doku: 'moloz', renk: 0x7d7466, x: -0.15, y: Z + 0.05, z: -0.3, sy: 0.6 * c.s, ry: 0.4 });
  // ağaç destekli giriş
  k.kutu(0.3, 0.3, 0.1, -0.05, Z, 0.2, 'duz', 0x120d0a);
  for (const x of [-0.22, 0.12]) k.kutu(0.05, 0.34, 0.05, x, Z, 0.25, 'kutuk', P.kutuk);
  k.kutu(0.42, 0.05, 0.06, -0.05, Z + 0.34, 0.25, 'kutuk', P.kutuk);
  // ray + vagon + cevher yığını
  for (const x of [-0.1, 0.0]) k.kutu(0.015, 0.012, 0.6, x, Z, 0.55, 'duz', 0x5a5a5a);
  k.kutu(0.14, 0.08, 0.18, -0.05, Z + 0.03, 0.55, 'tahta', 0x6a4a2a);
  k.kure(0.06, -0.05, Z + 0.12, 0.55, 'moloz', 0x9a7ab0);
  for (let i = 0; i < 5; i++) k.kure(0.06 + k.R() * 0.03, 0.45 + k.R() * 0.25, Z + 0.03, 0.4 + k.R() * 0.3, 'moloz', 0x8a6aa0);
  // bocurgat
  for (const z of [-0.1, 0.1]) k.direk(0.55, z, Z, 0.4, 0.015);
  k.sil(0.04, 0.04, 0.24, 6, 0.55, Z + 0.36, 0, 'kutuk', P.kutuk, { rx: Math.PI / 2, y: Z + 0.38 });
  k.fici(-0.65, 0.6, Z); k.sandik(-0.5, 0.7, Z, 1, 0.3);
  k.bayrak(0.7, -0.7, Z, 0.6, P.asi);
};

M.eritme_firini = (k, c) => {
  const Z = k.kaide(1, 'kerpic');
  const h = 0.55 * c.s;
  k.sil(0.12, 0.22, h, 9, -0.05, Z, -0.05, 'kerpic', 0x9a5a38);
  k.sil(0.13, 0.13, 0.04, 9, -0.05, Z + h, -0.05, 'duz', 0x4a2a1a);
  k.kutu(0.09, 0.09, 0.02, -0.05, Z + 0.04, 0.16, 'duz', P.ates, { isil: true });
  k.sil(0.09, 0.09, 0.005, 9, -0.05, Z + h + 0.04, -0.05, 'duz', P.kor, { isil: true });
  k.bacaDumani(-0.05, Z + h + 0.06, -0.05, 1.1);
  k.ates.push([-0.05, Z + 0.06, 0.2, 0.35]);
  // körük + külçeler
  k.kutu(0.14, 0.05, 0.1, 0.25, Z, 0.2, 'deri', P.deriK, { ry: 0.4 });
  for (let i = 0; i < 3; i++) k.kutu(0.07, 0.025, 0.035, 0.25 + (i % 2) * 0.02, Z + i * 0.026, -0.28, 'duz', P.bronz);
  k.odun(-0.3, 0.3, Z, 0.4, 0.8);
};

M.demirci = (k, c) => {
  const Z = k.kaide(1, 'kerpic');
  const h = 0.36 * c.s;
  for (const [x, z] of [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28]]) k.direk(x, z, Z, h, 0.02, P.kutuk);
  k.kutu(0.6, 0.18, 0.04, 0, Z, -0.28, 'kerpic', P.kerpic);
  k.besik(0.74, 0.72, 0.22, 0, Z + h, 0, 'kiremit', P.kiremitE);
  // ocak + örs
  k.kutu(0.22, 0.14, 0.18, -0.15, Z, -0.12, 'moloz', 0x7a6a5a);
  k.kutu(0.16, 0.01, 0.12, -0.15, Z + 0.14, -0.12, 'duz', P.kor, { isil: true });
  k.ates.push([-0.15, Z + 0.15, -0.12, 0.3]);
  baca(k, -0.15, -0.18, Z + 0.14, h + 0.25, 'kerpic', 0x8a5a3a);
  k.kutu(0.05, 0.08, 0.05, 0.12, Z, 0.08, 'kutuk', P.kutuk);
  k.kutu(0.12, 0.04, 0.05, 0.12, Z + 0.08, 0.08, 'duz', 0x3a3a40);
  k.fici(0.33, 0.35, Z); k.sandik(-0.32, 0.36, Z);
};

M.sulanan_tarla = (k, c) => {
  const Z = tarla(k, c, 2, P.ekin, { cit: false });
  k.kutu(0.07, 0.012, 1.8, -0.88, Z + 0.005, 0, 'duz', P.su);
  k.kutu(1.75, 0.012, 0.07, 0, Z + 0.005, -0.88, 'duz', P.su);
  k.kutu(1.75, 0.012, 0.05, 0, Z + 0.005, 0.0, 'duz', P.su);
  // şaduf (kaldıraçlı su çekme)
  k.direk(-0.8, -0.8, Z, 0.3, 0.015);
  k.kutu(0.5, 0.015, 0.015, -0.8, Z + 0.3, -0.8, 'kutuk', P.direk, { rz: 0.4, ry: 0.8 });
  k.kure(0.04, -0.98, Z + 0.4, -0.62, 'moloz', P.tas);
};

M.ambar = (k, c) => {
  const Z = k.kaide(2, 'kerpic');
  const h = 0.38 * c.s;
  k.kutu(1.2, h, 0.6, 0, Z, -0.4, 'kerpic', P.kerpic);
  k.kutu(1.26, 0.05, 0.66, 0, Z + h, -0.4, 'kerpic', 0xb78258);
  k.kapi(-0.2, Z, -0.095, 0.2, 0.26, 'z');
  k.pencere(0.3, Z + h * 0.6, -0.095, 0.07, 0.07, 'z');
  // arı kovanı silolar
  for (const [x, z, r] of [[-0.5, 0.45, 0.24], [0.05, 0.5, 0.22], [0.55, 0.42, 0.24]]) {
    k.sil(r, r, 0.18, 10, x, Z, z, 'kerpic', P.siva);
    k.kubbe(r, x, Z + 0.18, z, 'kerpic', P.siva, { sy: 1.25 * c.s });
    k.kapi(x, Z + 0.06, z + r - 0.01, 0.07, 0.08, 'z', 0x4a3220);
  }
  k.sandik(0.7, -0.05, Z); k.sandik(0.62, 0.05, Z, 0.9, 0.5); k.fici(-0.75, 0.0, Z);
};

const tezgah = (k, x, z, y, renk, ry = 0) => {
  const c = Math.cos(ry), s = Math.sin(ry);
  const p = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const [lx, lz] of [[-0.15, -0.1], [0.15, -0.1], [-0.15, 0.1], [0.15, 0.1]]) { const [px, pz] = p(lx, lz); k.direk(px, pz, y, 0.28, 0.01); }
  k.kutu(0.36, 0.02, 0.26, x, y + 0.28, z, 'kumas', renk, { ry, rx: 0.15 });
  k.kutu(0.32, 0.03, 0.2, x, y + 0.1, z, 'tahta', 0x8a6a44, { ry });
  for (let i = 0; i < 3; i++) { const [px, pz] = p(-0.1 + i * 0.1, 0); k.kure(0.03, px, y + 0.15, pz, 'duz', [0xd04a3a, 0xe8b84a, 0x7ab040][i]); }
};
M.pazar_yeri = (k, c) => {
  const Z = k.kaide(2, 'kerpic');
  tezgah(k, -0.45, -0.45, Z, 0xc65a36);
  tezgah(k, 0.4, -0.5, Z, 0xe8c050, 0.3);
  tezgah(k, -0.5, 0.35, Z, 0x3f6ea8, -0.2);
  if (c.sv >= 2) tezgah(k, 0.45, 0.45, Z, 0x6a9a4a, 0.5);
  for (let i = 0; i < 4; i++) k.sil(0.04, 0.03, 0.1, 8, 0.0 + i * 0.07, Z, 0.0 + (i % 2) * 0.06, 'duz', 0xb06a40);
  k.sandik(0.1, -0.15, Z); k.sandik(-0.05, 0.1, Z, 0.9, 0.6); k.fici(0.75, 0.0, Z);
  k.bayrak(-0.8, -0.8, Z, 0.75 * c.s, 0xe8c050);
};

M.kuyu = (k, c) => {
  const Z = k.kaide(1, 'toprak');
  k.sil(0.2, 0.22, 0.16, 10, 0, Z, 0, 'moloz', P.tas);
  k.sil(0.15, 0.15, 0.01, 10, 0, Z + 0.15, 0, 'duz', P.su);
  for (const x of [-0.18, 0.18]) k.direk(x, 0, Z + 0.1, 0.32, 0.016);
  k.sil(0.025, 0.025, 0.4, 6, 0, Z + 0.37, 0, 'kutuk', P.kutuk, { rz: Math.PI / 2, y: Z + 0.38 });
  k.besik(0.48, 0.32, 0.12, 0, Z + 0.42, 0, 'kiremit', P.kiremitE);
  k.kutu(0.006, 0.12, 0.006, 0.05, Z + 0.26, 0, 'duz', 0x6a5a40);
  k.sil(0.03, 0.025, 0.05, 8, 0.05, Z + 0.21, 0, 'tahta', 0x8a5a32);
  k.sil(0.04, 0.03, 0.09, 8, 0.3, Z - 0.04, 0.28, 'duz', 0xb06a40);
};

M.muhafiz_kulesi = (k, c) => {
  const Z = k.kaide(1, 'kerpic');
  const h = 0.85 * c.s;
  k.sil(0.2, 0.27, h, 4, 0, Z, 0, 'kerpic', P.kerpic, { ry: Math.PI / 4 });
  k.kutu(0.38, 0.05, 0.38, 0, Z + h, 0, 'kerpic', 0xb78258);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [1, 0], [-1, 0], [0, -1]]) k.kutu(0.07, 0.07, 0.07, x * 0.16, Z + h + 0.05, z * 0.16, 'kerpic', P.kerpic);
  k.pencere(0.0, Z + h * 0.6, 0.165, 0.04, 0.09, 'z');
  k.pencere(0.165, Z + h * 0.45, 0.0, 0.04, 0.09, 'x');
  k.kapi(0, Z, 0.195, 0.1, 0.16, 'z');
  k.bayrak(-0.12, -0.12, Z + h + 0.05, 0.35, P.asi);
};

M.mabet = (k, c) => {
  const Z = k.kaide(2, 'kerpic');
  const s = c.s;
  k.kutu(1.5, 0.28 * s, 1.5, 0, Z, -0.05, 'kerpic', P.kerpic);
  k.kutu(1.05, 0.26 * s, 1.05, 0, Z + 0.28 * s, -0.1, 'kerpic', P.siva);
  k.kutu(0.6, 0.24 * s, 0.6, 0, Z + 0.54 * s, -0.15, 'kerpic', 0xe0c090);
  k.kutu(0.66, 0.04, 0.66, 0, Z + 0.78 * s, -0.15, 'duz', P.bronz);
  k.kapi(0, Z + 0.54 * s, 0.155, 0.12, 0.16, 'z', 0x3a2418);
  // merdiven
  for (let i = 0; i < 6; i++) k.kutu(0.24, 0.09 * s, 0.1, 0, Z + i * 0.09 * s, 0.75 - i * 0.11, 'kerpic', 0xb78258);
  for (const x of [-0.6, 0.6]) {
    k.sil(0.05, 0.035, 0.12, 6, x, Z + 0.28 * s, 0.6, 'duz', P.bronz);
    k.ates.push([x, Z + 0.28 * s + 0.12, 0.6, 0.3]);
  }
  k.bayrak(-0.24, -0.4, Z + 0.78 * s, 0.35, P.asi);
};

// ---------- ANTİK ----------
M.tas_ev = (k, c) => {
  const Z = k.kaide(1, 'tas');
  const h = 0.34 * c.s, w = 0.6, d = 0.5;
  const kirec = P.kirec, kiremit = 0xc4603a;
  // ana gövde + taş kaide + köşe taşları
  k.kutu(w, h, d, 0, Z, 0, 'tasBlok', kirec);
  k.kutu(w + 0.04, 0.05, d + 0.04, 0, Z, 0, 'tasBlok', 0x9a9486);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.kutu(0.05, h, 0.05, sx * w / 2, Z, sz * d / 2, 'tasBlok', 0xece3cf);
  k.kutu(w + 0.06, 0.03, d + 0.06, 0, Z + h, 0, 'mermer', P.mermer); // korniş
  // çatı: saçaklı kırma çatı (tek katman) + mahya şeridi
  k.kirma(w + 0.14, d + 0.14, 0.24, 0, Z + h + 0.03, 0, 'kiremit', kiremit);
  k.kutu(0.3, 0.025, 0.03, 0, Z + h + 0.255, 0, 'kiremit', 0xa8482a);
  // sütunlu sundurma: iki sütun + üçgen alınlık + sundurma çatısı
  for (const x of [-0.26, 0.06]) { k.sil(0.026, 0.03, 0.27, 8, x, Z, d / 2 + 0.14, 'mermer', P.mermer); k.sil(0.036, 0.036, 0.02, 8, x, Z + 0.27, d / 2 + 0.14, 'mermer', 0xe8dcc0); k.sil(0.036, 0.036, 0.02, 8, x, Z, d / 2 + 0.14, 'mermer', 0xe8dcc0); }
  k.kutu(0.46, 0.03, 0.2, -0.1, Z + 0.29, d / 2 + 0.1, 'mermer', P.mermer);
  k.ekle(ucgenGeo([[[-0.23, 0, 0], [0.23, 0, 0], [0, 0.1, 0]]], [0, 0, -1]), { doku: 'mermer', renk: 0xefeae0, x: -0.1, y: Z + 0.32, z: d / 2 + 0.2 });
  k.kemer(-0.1, Z + 0.01, d / 2 + 0.012, 0.13, 0.21, 0x5a3b24, false);
  k.pencere(0.2, Z + 0.15, d / 2 + 0.006, 0.09, 0.11, 'z', { isikli: true, panjur: true, panjurRenk: 0x5a7a4a });
  k.pencere(w / 2 + 0.006, Z + 0.15, -0.08, 0.09, 0.11, 'x', { panjur: true, panjurRenk: 0x5a7a4a });
  k.pencere(w / 2 + 0.006, Z + 0.15, 0.14, 0.09, 0.11, 'x', { isikli: true, panjur: true, panjurRenk: 0x5a7a4a });
  baca(k, 0.16, -0.1, Z + h + 0.12, 0.14, 'tasBlok', kirec);
  // bahçe: zeytin ağacı, amfora, küçük çit
  k.sil(0.018, 0.024, 0.14, 6, 0.38, Z, 0.36, 'kutuk', 0x6a4a2a);
  k.kure(0.1, 0.38, Z + 0.22, 0.36, 'duz', 0x6f9a4a, { det: 1 });
  k.kure(0.07, 0.43, Z + 0.17, 0.4, 'duz', 0x7fae58, { det: 1 });
  k.sil(0.04, 0.03, 0.12, 8, -0.4, Z, 0.4, 'duz', 0xb06a40);
  k.cit(-0.5, 0.5, 0.5, 0.5, Z, 0x9a8a6a, 0.07);
  if (c.sv >= 2) { k.kutu(0.26, 0.26 * c.s, 0.4, -0.45, Z, -0.02, 'tasBlok', kirec); k.kirma(0.34, 0.48, 0.18, -0.45, Z + 0.26 * c.s, -0.02, 'kiremit', kiremit); }
  if (c.sv >= 3) for (const z of [-0.3, 0.3]) k.kure(0.06, 0.4, Z + 0.07, z, 'duz', 0xd05a6a, { det: 0 });
};

M.mermer_ocagi = (k, c) => {
  const Z = k.kaide(2, 'toprak');
  k.kutu(1.4, 0.48 * c.s, 0.6, -0.1, Z, -0.5, 'mermer', 0xe8e4da);
  k.kutu(1.0, 0.3 * c.s, 0.4, -0.2, Z, 0.0, 'mermer', 0xf0ece4);
  k.kutu(0.5, 0.14, 0.3, -0.35, Z, 0.35, 'mermer', 0xf4f0ea);
  for (let i = 0; i < 4; i++) k.kutu(0.2, 0.12, 0.14, 0.45 + (i % 2) * 0.24, Z + (i > 1 ? 0.12 : 0), 0.45, 'mermer', 0xf4f0ea, { ry: 0.1 * i });
  // tekerlekli vinç
  for (const z of [-0.12, 0.12]) k.direk(0.6, z - 0.2, Z, 0.7, 0.018, P.direk, { rz: -0.15 });
  k.sil(0.16, 0.16, 0.05, 10, 0.55, Z + 0.1, -0.2, 'tahta', 0x8a6a44, { rx: Math.PI / 2, y: Z + 0.18 });
  k.kutu(0.5, 0.02, 0.02, 0.4, Z + 0.68, -0.2, 'kutuk', P.direk, { rz: 0.4 });
  k.kutu(0.008, 0.3, 0.008, 0.2, Z + 0.45, -0.2, 'duz', 0x6a5a40);
};

M.bag_bahce = (k, c) => {
  const Z = ZEMIN_Y + 0.005;
  k.kutu(1.88, 0.03, 1.88, 0, Z - 0.02, 0, 'toprak', 0x8a6a3e);
  for (let r = 0; r < 4; r++) {
    const z = -0.7 + r * 0.32;
    for (let i = 0; i < 5; i++) k.direk(-0.7 + i * 0.3, z, Z, 0.2, 0.008);
    k.kutu(1.25, 0.008, 0.008, -0.1, Z + 0.18, z, 'duz', 0x6a5a40);
    for (let i = 0; i < 6; i++) k.kure(0.06 + k.R() * 0.02, -0.7 + i * 0.24, Z + 0.15, z, 'duz', 0x5a8a3a, { det: 0 });
    if (c.sv >= 2) for (let i = 0; i < 4; i++) k.kure(0.022, -0.6 + i * 0.3, Z + 0.1, z + 0.04, 'duz', 0x5a2a5a);
  }
  // zeytin ağacı + şarap teknesi
  k.sil(0.025, 0.035, 0.22, 5, 0.72, Z, 0.6, 'kutuk', 0x6a5a40);
  k.kure(0.2, 0.72, Z + 0.32, 0.6, 'duz', 0x7a9a5a, { det: 1, sy: 0.75 });
  k.kutu(0.26, 0.08, 0.18, 0.7, Z, -0.6, 'tasBlok', P.kirec);
  k.sil(0.04, 0.03, 0.12, 8, 0.55, Z, -0.75, 'duz', 0xb06a40);
};

M.darphane = (k, c) => {
  const Z = k.kaide(1, 'tas');
  const h = 0.4 * c.s, W = 0.62, D = 0.54;
  const taş = 0xd6cdb6, koyuTas = 0x8f8878, altin = 0xe8b84a;
  // gövde: bindirmeli taş duvar + köşe taşları + alt kaide şeridi
  k.kutu(W, h, D, 0, Z, 0, 'tasBlok', taş);
  k.kutu(W + 0.03, 0.05, D + 0.03, 0, Z, 0, 'tasBlok', koyuTas);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let q = 0; q < 4; q++) k.kutu(0.07, h / 4 - 0.012, 0.07, sx * (W / 2), Z + q * h / 4 + 0.05 * (q ? 0 : 0), sz * (D / 2), 'tasBlok', q % 2 ? 0xe8e0cc : 0xc4bba4);
  // korniş (altın şeritli) ve çatı
  k.kutu(W + 0.1, 0.035, D + 0.1, 0, Z + h, 0, 'tasBlok', 0xe8e0cc);
  k.kutu(W + 0.1, 0.012, D + 0.1, 0, Z + h + 0.035, 0, 'duz', altin);
  k.kirma(W + 0.12, D + 0.12, 0.2, 0, Z + h + 0.047, 0, 'arduvaz', 0x5a6674);
  k.kutu(0.2, 0.025, 0.02, 0, Z + h + 0.243, 0, 'duz', altin);                 // mahya süsü
  // ön yüz (+z): kemerli ağır kapı + iki yanda demir parmaklıklı kemerli pencere + madalyon
  k.kutu(0.2, 0.3 * c.s, 0.05, 0, Z, D / 2, 'tasBlok', 0xe8e0cc);              // portal çerçevesi
  k.kemer(0, Z + 0.015, D / 2 + 0.03, 0.14, 0.24 * c.s, 0x4a2e1c, false);
  k.kutu(0.012, 0.2 * c.s, 0.01, 0, Z + 0.02, D / 2 + 0.036, 'duz', 0x2a2420);
  for (const sx of [-1, 1]) {
    k.kemer(sx * 0.2, Z + h * 0.42, D / 2 + 0.006, 0.1, 0.16, 0xffcf7a, false, { isil: true });
    for (let q = -1; q <= 1; q++) k.kutu(0.01, 0.16, 0.012, sx * 0.2 + q * 0.03, Z + h * 0.42, D / 2 + 0.012, 'duz', 0x2a2420);
    k.kutu(0.14, 0.02, 0.04, sx * 0.2, Z + h * 0.42 - 0.02, D / 2 + 0.014, 'tasBlok', koyuTas);
  }
  // alınlık + büyük altın sikke madalyonu
  k.ekle(ucgenGeo([[[-0.3, 0, 0], [0.3, 0, 0], [0, 0.17, 0]]], [0, 0, -1]), { doku: 'mermer', renk: 0xefeae0, x: 0, y: Z + h + 0.047, z: D / 2 + 0.07 });
  k.sil(0.065, 0.065, 0.014, 14, 0, Z + h + 0.1, D / 2 + 0.078, 'duz', altin, { rx: Math.PI / 2, y: Z + h + 0.1 });
  k.sil(0.045, 0.045, 0.016, 14, 0, Z + h + 0.1, D / 2 + 0.08, 'duz', 0xf3cf6a, { rx: Math.PI / 2, y: Z + h + 0.1 });
  // yan yüz (+x): ocak ışıklı kemer pencere + baca
  k.kemer(0, Z + h * 0.3, 0, 0.1, 0.17, 0xff9a40, false, { isil: true, x: W / 2 + 0.006, z: -0.05, ry: Math.PI / 2 });
  k.kemer(0, Z + h * 0.3, 0, 0.1, 0.17, 0xffcf7a, false, { isil: true, x: W / 2 + 0.006, z: 0.16, ry: Math.PI / 2 });
  baca(k, -0.2, -0.12, Z + h + 0.12, 0.22, 'tasBlok', koyuTas);
  // ön avlu: örs, sikke yığınları, külçe istifi, fıçı, bayrak
  k.kutu(0.09, 0.04, 0.06, 0.36, Z, 0.4, 'duz', 0x3a3632);
  k.kutu(0.05, 0.05, 0.05, 0.36, Z + 0.04, 0.4, 'duz', 0x2f2b28);
  k.kutu(0.13, 0.028, 0.05, 0.36, Z + 0.09, 0.4, 'duz', 0x3a3632);
  for (let q = 0; q < 4; q++) k.sil(0.026, 0.026, 0.014, 10, -0.36, Z + q * 0.015, 0.38, 'duz', altin);
  for (let q = 0; q < 3; q++) k.sil(0.026, 0.026, 0.014, 10, -0.29, Z + q * 0.015, 0.42, 'duz', 0xf3cf6a);
  for (let q = 0; q < 3; q++) for (let r = 0; r <= 2 - q; r++) k.kutu(0.07, 0.03, 0.04, -0.4 + (r + q * 0.5) * 0.075, Z + q * 0.03, -0.38, 'duz', altin);
  k.fici(0.44, 0.1, Z, 0.9); k.sandik(0.4, -0.4, Z, 0.8);
  k.bayrak(-0.42, 0.28, Z, 0.55, 0xb03a2e);
};

M.liman = (k, c) => {
  const Z = ZEMIN_Y + 0.02;
  // iskele platformu (direkler üstünde)
  k.kutu(1.9, 0.04, 0.6, 0, Z, -0.6, 'tahta', 0x9a7a54);
  k.kutu(0.4, 0.04, 1.3, 0.55, Z, 0.35, 'tahta', 0x9a7a54);
  for (let i = 0; i < 6; i++) k.direk(-0.85 + i * 0.34, -0.3, Z - 0.1, 0.15, 0.025);
  for (let i = 0; i < 4; i++) k.direk(0.75, -0.2 + i * 0.3, Z - 0.1, 0.18, 0.025);
  // depo
  k.kutu(0.7, 0.32 * c.s, 0.45, -0.5, Z + 0.04, -0.62, 'tasBlok', P.kirec);
  k.besik(0.8, 0.55, 0.2, -0.5, Z + 0.04 + 0.32 * c.s, -0.62, 'kiremit', P.kiremit);
  k.kapi(-0.5, Z + 0.04, -0.39, 0.16, 0.2, 'z');
  // tekne + yelken
  k.ekle(new THREE.SphereGeometry(0.1, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { doku: 'tahta', renk: 0x6a4a2a, x: 0.1, y: Z + 0.02, z: 0.45, sx: 3.2, sz: 1.2, ry: 0.15 });
  k.direk(0.1, 0.45, Z, 0.55, 0.012);
  k.kutu(0.01, 0.28, 0.24, 0.1, Z + 0.22, 0.45, 'kumas', 0xece0c8, { ry: 0.15 + Math.PI / 2 });
  k.sandik(0.5, -0.5, Z + 0.04); k.sandik(0.62, -0.42, Z + 0.04, 0.8); k.fici(0.15, -0.45, Z + 0.04);
  for (let i = 0; i < 3; i++) k.sil(0.035, 0.03, 0.11, 8, -0.05 + i * 0.07, Z + 0.04, -0.5, 'duz', 0xb06a40);
};

M.su_kemeri = (k, c) => {
  const Z = k.kaide(2, 'tas');
  const h = 0.66 * c.s, L = 1.8, n = 3, bw = L / n;
  const sh = new THREE.Shape();
  sh.moveTo(-L / 2, 0); sh.lineTo(L / 2, 0); sh.lineTo(L / 2, h); sh.lineTo(-L / 2, h); sh.lineTo(-L / 2, 0);
  for (let i = 0; i < n; i++) {
    const cx = -L / 2 + bw * (i + 0.5), r = bw * 0.36, d = h - 0.14 - r;
    const de = new THREE.Path();
    de.moveTo(cx - r, 0); de.lineTo(cx - r, d); de.absarc(cx, d, r, Math.PI, 0, true); de.lineTo(cx + r, 0); de.lineTo(cx - r, 0);
    sh.holes.push(de);
  }
  const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false, curveSegments: 6 });
  eg.translate(0, 0, -0.12);
  k.ekle(eg, { doku: 'tasBlok', renk: P.kirec, x: 0, y: Z, z: -0.1 });
  k.kutu(L + 0.06, 0.06, 0.3, 0, Z + h, -0.1, 'tasBlok', 0xd8ccb0);
  k.kutu(L, 0.02, 0.14, 0, Z + h + 0.05, -0.1, 'duz', P.su);
  // çeşme havuzu
  k.sil(0.2, 0.22, 0.08, 10, 0.5, Z, 0.6, 'tasBlok', P.kirec);
  k.sil(0.17, 0.17, 0.01, 10, 0.5, Z + 0.075, 0.6, 'duz', P.su);
  k.sil(0.03, 0.04, 0.2, 6, 0.5, Z, 0.6, 'tasBlok', P.kirec);
};

M.hamam = (k, c) => {
  const Z = k.kaide(2, 'tas');
  const h = 0.4 * c.s;
  k.kutu(1.4, h, 1.0, 0, Z, -0.2, 'tasBlok', P.kirec);
  k.kutu(1.46, 0.05, 1.06, 0, Z + h, -0.2, 'mermer', P.mermer);
  k.kubbe(0.38, -0.25, Z + h + 0.05, -0.25, 'kiremit', 0xc88a5a, { sy: 0.85 });
  k.kubbe(0.22, 0.4, Z + h + 0.05, -0.3, 'kiremit', 0xc88a5a, { sy: 0.85 });
  for (let i = 0; i < 4; i++) k.sil(0.012, 0.012, 0.03, 6, -0.25 + Math.cos(i * 1.6) * 0.16, Z + h + 0.34, -0.25 + Math.sin(i * 1.6) * 0.16, 'duz', 0xffe9b0, { isil: true });
  k.kapi(0, Z, 0.305, 0.2, 0.26, 'z');
  for (const x of [-0.12, 0.12]) k.sil(0.025, 0.03, 0.3, 8, x, Z, 0.36, 'mermer', P.mermer);
  for (const x of [-0.5, 0.5]) k.pencere(x, Z + h * 0.5, 0.305, 0.08, 0.1, 'z');
  baca(k, 0.6, -0.6, Z + h, 0.2, 'tasBlok', P.kirec);
  k.bacaDumani(-0.25, Z + h + 0.4, -0.25, 0.6);
};

M.kutuphane = (k, c) => {
  const Z = k.kaide(2, 'mermer');
  const y = Z + 0.06, h = 0.5 * c.s;
  k.kutu(1.6, 0.06, 1.3, 0, Z, -0.1, 'mermer', P.mermer);
  k.kutu(1.1, h, 0.8, 0, y, -0.25, 'tasBlok', P.kirec);
  for (let i = 0; i < 6; i++) k.sil(0.035, 0.04, h, 8, -0.6 + i * 0.24, y, 0.3, 'mermer', P.mermer);
  for (let i = 0; i < 3; i++) k.sil(0.035, 0.04, h, 8, -0.6, y, 0.1 - i * 0.3, 'mermer', P.mermer);
  k.kutu(1.4, 0.07, 1.0, 0, y + h, -0.1, 'mermer', P.mermer);
  k.besik(1.0, 1.44, 0.26, 0, y + h + 0.07, -0.1, 'kiremit', P.kiremit, { ry: Math.PI / 2 });
  k.ekle(ucgenGeo([[[-0.45, 0, 0], [0.45, 0, 0], [0, 0.22, 0]]], [0, 0, -1]), { doku: 'mermer', renk: P.mermer, x: 0, y: y + h + 0.08, z: 0.41 });
  k.kapi(0, y, 0.155, 0.18, 0.3, 'z', 0x3a2418);
  for (const x of [-0.35, 0.35]) k.pencere(x, y + h * 0.55, 0.155, 0.08, 0.13, 'z', { isikli: true });
  k.bayrak(0.75, 0.6, Z, 0.8, P.lacivert);
};

M.tiyatro = (k, c) => {
  const Z = k.kaide(3, 'tas');
  // yarım daire oturma basamakları (dışa doğru yükselir)
  for (let i = 0; i < 5; i++) {
    const r = 1.3 - i * 0.18, h = 0.08 * c.s * (5 - i);
    k.ekle(new THREE.CylinderGeometry(r, r, h, 18, 1, false, Math.PI / 2, Math.PI), { doku: 'tasBlok', renk: i % 2 ? P.kirec : 0xd8ccb0, x: 0, y: Z + h / 2, z: 0.3 });
  }
  k.sil(0.4, 0.4, 0.02, 16, 0, Z, 0.35, 'mermer', P.mermer);
  // sahne binası (alçak, önde)
  k.kutu(1.7, 0.3 * c.s, 0.22, 0, Z, 1.1, 'tasBlok', P.kirec);
  for (let i = 0; i < 7; i++) k.sil(0.028, 0.032, 0.26, 8, -0.72 + i * 0.24, Z, 0.9, 'mermer', P.mermer);
  k.kutu(1.6, 0.04, 0.14, 0, Z + 0.26, 0.92, 'mermer', P.mermer);
  for (let i = 0; i < 3; i++) k.kemer(-0.5 + i * 0.5, Z, 1.215, 0.16, 0.24, 0x2a1e16);
  for (const x of [-1.25, 1.25]) k.bayrak(x, 1.1, Z, 0.8, P.lacivert);
};

M.kisla = (k, c) => {
  const Z = k.kaide(2, 'tas');
  const h = 0.36 * c.s;
  k.kutu(1.5, h, 0.55, 0, Z, -0.5, 'tasBlok', P.kirec);
  k.kirma(1.62, 0.67, 0.22, 0, Z + h, -0.5, 'kiremit', P.kiremit);
  for (let i = 0; i < 5; i++) k.pencere(-0.6 + i * 0.3, Z + h * 0.55, -0.22, 0.06, 0.08, 'z');
  k.kapi(0.0, Z, -0.22, 0.14, 0.22, 'z');
  // avlu duvarı
  k.kutu(0.05, 0.16, 1.0, -0.8, Z, 0.25, 'tasBlok', P.kirec);
  k.kutu(0.05, 0.16, 1.0, 0.8, Z, 0.25, 'tasBlok', P.kirec);
  k.kutu(0.5, 0.16, 0.05, -0.55, Z, 0.78, 'tasBlok', P.kirec);
  k.kutu(0.5, 0.16, 0.05, 0.55, Z, 0.78, 'tasBlok', P.kirec);
  // talim kuklaları + mızrak sehpası
  for (const x of [-0.3, 0.3]) {
    k.direk(x, 0.2, Z, 0.28, 0.014);
    k.kutu(0.18, 0.02, 0.02, x, Z + 0.2, 0.2, 'kutuk', P.direk);
    k.kure(0.05, x, Z + 0.3, 0.2, 'saman', P.saman);
  }
  for (let i = 0; i < 4; i++) k.direk(0.55 + i * 0.04, 0.4, Z, 0.4, 0.007, 0x9a8060, { rz: -0.15 });
  k.bayrak(0.75, -0.8, Z + h, 0.45, P.sancak);
};

// ---------- ORTA ÇAĞ ----------
M.yari_ahsap_ev = (k, c) => {
  const Z = k.kaide(1, 'tas');
  const h1 = 0.22, h2 = 0.22 * c.s, w = 0.54;
  const siva = P.sivaB, kiris = 0x4a3222;
  // taş zemin kat + öne taşan ahşap üst kat (çıkma)
  k.kutu(w, h1, w - 0.06, 0, Z, 0, 'moloz', 0xb0a898);
  k.kutu(w + 0.08, 0.035, w + 0.04, 0.02, Z + h1 - 0.012, 0.02, 'tahta', kiris);
  k.kutu(w + 0.08, h2, w + 0.04, 0.02, Z + h1 + 0.02, 0.02, 'yariAhsap', siva);
  const zy = Z + h1 + 0.02, zf = w / 2 + 0.065, xf = w / 2 + 0.065;
  // üst kat iskeleti: köşe direkleri + yatay kuşak + çapraz payandalar (ön ve yan yüz)
  for (const sx of [-1, 0, 1]) k.kutu(0.025, h2, 0.025, 0.02 + sx * (w / 2 + 0.04), zy, zf, 'kutuk', kiris);
  k.kutu(w + 0.1, 0.025, 0.025, 0.02, zy + h2 - 0.012, zf, 'kutuk', kiris);
  k.kutu(w + 0.1, 0.025, 0.025, 0.02, zy, zf, 'kutuk', kiris);
  k.kutu(0.02, h2 * 1.28, 0.02, -0.12, zy + h2 / 2 - h2 * 0.64, zf + 0.002, 'kutuk', kiris, { rz: 0.8 });
  k.kutu(0.02, h2 * 1.28, 0.02, 0.17, zy + h2 / 2 - h2 * 0.64, zf + 0.002, 'kutuk', kiris, { rz: -0.8 });
  for (const sz of [-1, 0, 1]) k.kutu(0.025, h2, 0.025, xf, zy, 0.02 + sz * (w / 2 + 0.01), 'kutuk', kiris);
  k.kutu(0.025, 0.025, w + 0.04, xf, zy + h2 - 0.012, 0.02, 'kutuk', kiris);
  k.kutu(0.02, h2 * 1.2, 0.02, xf + 0.002, zy + h2 / 2 - h2 * 0.6, 0.0, 'kutuk', kiris, { rx: 0.9 });
  // dik arduvaz çatı (saçaklı) + çatı penceresi
  k.besik(w + 0.2, w + 0.18, 0.4 * c.s, 0.02, zy + h2, 0.02, 'arduvaz', c.sv >= 3 ? 0x7a4a3a : 0x5a6674, { ry: Math.PI / 2 });
  k.kutu(0.14, 0.12, 0.1, 0.02, zy + h2 + 0.1, w / 2 + 0.02, 'yariAhsap', siva);
  k.besik(0.18, 0.14, 0.08, 0.02, zy + h2 + 0.22, w / 2 + 0.02, 'arduvaz', 0x5a6674, { ry: Math.PI / 2 });
  k.pencere(0.02, zy + h2 + 0.115, w / 2 + 0.075, 0.07, 0.07, 'z', { isikli: true, panjur: false });
  // kapı (yuvarlak kemer) + zemin kat pencereleri + üst kat pencereleri
  k.kapi(-0.12, Z, w / 2 - 0.025, 0.12, 0.19, 'z', 0x6a3a22);
  k.kutu(0.2, 0.025, 0.07, -0.12, Z + 0.215, w / 2 + 0.02, 'kutuk', kiris); // kapı üstü korkuluk/tente
  k.pencere(0.13, Z + 0.09, w / 2 - 0.025, 0.08, 0.08, 'z', { isikli: true });
  for (const x of [-0.13, 0.15]) k.pencere(x, zy + 0.055, zf + 0.005, 0.07, 0.09, 'z', { isikli: true, panjur: true, panjurRenk: 0x7a3a2c });
  k.pencere(xf + 0.004, zy + 0.055, 0.1, 0.07, 0.09, 'x', { panjur: true, panjurRenk: 0x7a3a2c });
  // baca, çiçek kutusu, fener, fıçı
  baca(k, -0.18, -0.15, zy + h2 + 0.1, 0.3 * c.s, 'moloz', 0x8a8278);
  k.kutu(0.1, 0.03, 0.03, 0.15, zy + 0.01, zf + 0.025, 'tahta', kiris);
  k.kure(0.022, 0.12, zy + 0.05, zf + 0.025, 'duz', 0xd04a5a); k.kure(0.022, 0.17, zy + 0.05, zf + 0.025, 'duz', 0xe8b84a);
  k.direk(-0.28, w / 2 + 0.02, Z, 0.2, 0.012, kiris); k.kutu(0.04, 0.05, 0.04, -0.28, Z + 0.2, w / 2 + 0.02, 'duz', P.pencere, { isil: true });
  k.fici(0.34, w / 2 + 0.06, Z, 0.9);
};

M.ciftlik = (k, c) => {
  const Z = ZEMIN_Y + 0.005;
  k.kutu(2.9, 0.03, 2.9, 0, Z - 0.02, 0, 'toprak', 0x7a5a32);
  // tarla şeritleri (arka yarı)
  for (let i = 0; i < 9; i++) k.kutu(0.16, 0.08, 1.1, -1.25 + i * 0.3, Z + 0.01, -0.75, 'ekin', i % 3 === 2 ? P.ekinY : P.ekin);
  // ahır
  const h = 0.38 * c.s;
  k.kutu(0.9, h, 0.6, -0.65, Z, 0.55, 'tahta', 0x9a4a32);
  k.besik(1.0, 0.72, 0.36, -0.65, Z + h, 0.55, 'arduvaz', 0x6a5a4a);
  k.kapi(-0.65, Z, 0.855, 0.26, 0.3, 'z', 0x6a2a1a);
  k.kutu(0.04, 0.3, 0.27, -0.65, Z, 0.875, 'tahta', 0xe8e0d0, { ry: Math.PI / 4, sx: 0.3 });
  // çiftlik evi
  k.kutu(0.55, 0.3, 0.45, 0.6, Z, 0.6, 'yariAhsap', P.sivaB);
  k.besik(0.65, 0.55, 0.3, 0.6, Z + 0.3, 0.6, 'saman', P.saman);
  k.kapi(0.6, Z, 0.83, 0.11, 0.18, 'z');
  k.pencere(0.88, Z + 0.15, 0.6, 0.07, 0.07, 'x');
  baca(k, 0.75, 0.5, Z + 0.4, 0.2);
  // saman balyaları + çit
  for (const [x, z] of [[1.15, -0.05], [1.05, 0.15], [0.05, 0.1]]) k.sil(0.1, 0.1, 0.14, 10, x, Z, z, 'saman', P.saman, { rx: Math.PI / 2, y: Z + 0.1 });
  k.cit(-1.4, 1.4, 1.4, 1.4, Z, 0x7a5634);
  k.cit(1.4, -1.4, 1.4, 1.4, Z, 0x7a5634);
  k.fici(0.1, 0.9, Z); k.odun(0.25, 1.1, Z, 0.3);
};

M.degirmen = (k, c) => {
  const Z = k.kaide(2, 'tas');
  const h = 0.95 * c.s;
  k.sil(0.24, 0.36, h, 10, 0, Z, 0, 'tasBlok', P.sivaB);
  k.koni(0.32, 0.36, 10, 0, Z + h, 0, 'saman', 0x8a6a44);
  k.kapi(0, Z, 0.34, 0.14, 0.22, 'z', 0x6a3a22);
  k.pencere(0.0, Z + h * 0.6, 0.27, 0.06, 0.08, 'z');
  k.pervane = { x: 0.0, y: Z + h - 0.05, z: 0.33, r: 0.75 * c.s };
  // un çuvalları + el arabası
  for (let i = 0; i < 4; i++) k.kure(0.06, 0.55 + (i % 2) * 0.1, Z + 0.05 + Math.floor(i / 2) * 0.08, 0.5, 'kumas', 0xe8dcc0, { sy: 0.8 });
  k.kutu(0.18, 0.06, 0.12, -0.55, Z + 0.06, 0.55, 'tahta', 0x8a6a44);
  k.sil(0.05, 0.05, 0.02, 8, -0.48, Z + 0.05, 0.62, 'duz', 0x3a2a1a, { rx: Math.PI / 2, y: Z + 0.05 });
  k.cit(-0.85, -0.85, 0.85, -0.85, Z, 0x7a5634);
};

M.dokuma_atolyesi = (k, c) => {
  const Z = k.kaide(1, 'tas');
  const h = 0.36 * c.s;
  evGovdesi(k, 0.5, h, 0.46, Z, 'yariAhsap', P.sivaB, { kapiX: -0.08 });
  k.besik(0.62, 0.58, 0.3, 0, Z + h, -0.02, 'arduvaz', 0x7a5a3a);
  // boyalı kumaş ipleri
  for (const z of [-0.3, 0.32]) k.direk(0.38, z, Z, 0.32, 0.01);
  k.kutu(0.006, 0.006, 0.62, 0.38, Z + 0.31, 0.01, 'duz', 0x6a5a40);
  for (let i = 0; i < 4; i++) k.kutu(0.008, 0.18, 0.12, 0.38, Z + 0.13, -0.22 + i * 0.15, 'kumas', [0xb03a2e, 0x3f6ea8, 0xe8b84a, 0x5a8a3a][i]);
  baca(k, -0.15, -0.12, Z + h + 0.1, 0.18);
};

M.manastir = (k, c) => {
  const Z = k.kaide(3, 'tas');
  const h = 0.55 * c.s;
  // nef
  k.kutu(0.7, h, 1.7, -0.6, Z, -0.2, 'tasBlok', P.surTas);
  k.besik(1.9, 0.82, 0.42, -0.6, Z + h, -0.2, 'arduvaz', P.arduvaz, { ry: Math.PI / 2 });
  for (let i = 0; i < 4; i++) k.pencere(-0.245, Z + h * 0.5, -0.8 + i * 0.4, 0.05, 0.14, 'x', { isikli: true });
  // çan kulesi
  const kh = 1.3 * c.s;
  k.kutu(0.38, kh, 0.38, -0.6, Z, 0.85, 'tasBlok', P.surTas);
  k.kirma(0.44, 0.44, 0.5, -0.6, Z + kh, 0.85, 'arduvaz', P.arduvaz);
  k.pencere(-0.6, Z + kh - 0.2, 1.045, 0.08, 0.14, 'z', { isikli: false });
  k.kapi(-0.6, Z, 1.045, 0.14, 0.24, 'z', 0x5a3020);
  k.koni(0.03, 0.12, 4, -0.6, Z + kh + 0.5, 0.85, 'duz', P.altin);
  // revak / avlu
  k.kutu(0.05, 0.25, 1.4, 0.6, Z, -0.2, 'tasBlok', P.surTas);
  k.kutu(0.9, 0.25, 0.05, 0.15, Z, -1.25, 'tasBlok', P.surTas);
  for (let i = 0; i < 4; i++) k.sil(0.02, 0.025, 0.22, 6, 0.15 + (i % 2) * 0.3, Z, -0.9 + Math.floor(i / 2) * 0.5, 'tasBlok', P.sivaB);
  // bostan
  for (let i = 0; i < 4; i++) k.kutu(0.6, 0.04, 0.08, 0.95, Z, -0.9 + i * 0.25, 'ekin', P.ekinY);
  k.kure(0.15, 1.0, Z + 0.2, 0.6, 'duz', P.yaprak, { det: 1 });
  k.sil(0.02, 0.03, 0.12, 5, 1.0, Z, 0.6, 'kutuk', 0x6a4a2a);
  baca(k, 0.4, 0.4, Z, 0.4);
};

M.lonca_binasi = (k, c) => {
  const Z = k.kaide(2, 'tas');
  const h1 = 0.3, h2 = 0.32 * c.s;
  k.kutu(1.2, h1, 1.0, 0, Z, -0.2, 'tasBlok', P.surTas);
  for (let i = 0; i < 4; i++) k.kutu(0.16, 0.2, 0.02, -0.45 + i * 0.3, Z, 0.305, 'duz', 0x2a1e16);
  k.kutu(1.3, h2, 1.1, 0, Z + h1, -0.2, 'yariAhsap', P.sivaB);
  k.besik(1.2, 1.4, 0.7 * c.s, 0, Z + h1 + h2, -0.2, 'arduvaz', 0x4a5260, { ry: Math.PI / 2 });
  // basamaklı alın
  for (let i = 0; i < 4; i++) k.kutu(1.1 - i * 0.26, 0.15, 0.06, 0, Z + h1 + h2 + i * 0.15, 0.38, 'tasBlok', P.sivaB);
  for (const x of [-0.4, 0, 0.4]) k.pencere(x, Z + h1 + 0.1, 0.355, 0.1, 0.14, 'z', { isikli: true });
  k.pencere(0, Z + h1 + h2 + 0.2, 0.415, 0.08, 0.1, 'z', { isikli: true });
  for (const x of [-0.5, 0.5]) k.kutu(0.12, 0.26, 0.01, x, Z + h1 + 0.02, 0.36, 'kumas', P.sancak);
  k.bayrak(0.62, -0.75, Z + h1 + h2, 0.6, P.altin);
  baca(k, -0.4, -0.6, Z + h1 + h2 + 0.2, 0.35);
};

M.han = (k, c) => {
  const Z = k.kaide(2, 'tas');
  const h = 0.5 * c.s;
  k.kutu(1.3, h, 0.55, -0.1, Z, -0.5, 'yariAhsap', P.sivaB);
  k.besik(1.42, 0.7, 0.36, -0.1, Z + h, -0.5, 'arduvaz', 0x6a4a3a);
  k.kutu(0.55, h, 0.6, -0.5, Z, 0.25, 'yariAhsap', 0xe8d8b8);
  k.besik(0.68, 0.7, 0.33, -0.5, Z + h, 0.25, 'arduvaz', 0x6a4a3a, { ry: Math.PI / 2 });
  k.kapi(-0.5, Z, 0.555, 0.16, 0.24, 'z', 0x6a3a22);
  for (const x of [-0.6, -0.4]) k.pencere(x, Z + h * 0.7, 0.555, 0.07, 0.09, 'z', { isikli: true });
  for (const x of [0.1, 0.4]) k.pencere(x, Z + h * 0.5, -0.215, 0.07, 0.1, 'z', { isikli: true });
  // tabela
  k.kutu(0.12, 0.012, 0.012, -0.18, Z + h * 0.7, 0.5, 'kutuk', P.kiris);
  k.kutu(0.08, 0.06, 0.01, -0.14, Z + h * 0.7 - 0.07, 0.5, 'tahta', P.altin);
  // ahır sundurması
  for (const x of [0.3, 0.75]) k.direk(x, 0.6, Z, 0.3, 0.018);
  k.kutu(0.55, 0.025, 0.55, 0.52, Z + 0.3, 0.35, 'saman', P.saman, { rx: -0.12 });
  k.kutu(0.2, 0.08, 0.06, 0.55, Z, 0.4, 'saman', P.saman);
  baca(k, -0.6, -0.55, Z + h + 0.15, 0.3);
  baca(k, 0.35, -0.55, Z + h + 0.1, 0.3);
  k.fici(0.1, 0.25, Z); k.fici(0.2, 0.32, Z);
};

M.darussifa = (k, c) => {
  const Z = k.kaide(2, 'tas');
  const h = 0.5 * c.s;
  k.kutu(1.4, h, 1.2, 0, Z, -0.15, 'tasBlok', 0xd8c8a8);
  k.kutu(1.46, 0.05, 1.26, 0, Z + h, -0.15, 'tasBlok', 0xc8b898);
  k.sil(0.28, 0.32, 0.12, 12, 0, Z + h + 0.05, -0.2, 'tasBlok', 0xd8c8a8);
  k.kubbe(0.3, 0, Z + h + 0.17, -0.2, 'duz', P.firuze, { sy: 1.05, seg: 12 });
  k.koni(0.02, 0.1, 6, 0, Z + h + 0.48, -0.2, 'duz', P.altin);
  // taç kapı (taçkapı) çıkıntısı
  k.kutu(0.5, h + 0.18, 0.12, 0, Z, 0.5, 'tasBlok', 0xe8d8b8);
  k.kemer(0, Z + 0.02, 0.562, 0.34, 0.56, 0x3a2a20, true);
  k.kemer(0, Z, 0.564, 0.2, 0.34, 0x1e1510, true);
  for (let i = 0; i < 6; i++) k.kutu(0.04, 0.04, 0.012, -0.2 + i * 0.08, Z + h + 0.1, 0.565, 'duz', P.firuze);
  for (const x of [-0.5, 0.5]) k.pencere(x, Z + h * 0.5, 0.455, 0.08, 0.14, 'z');
  k.kure(0.12, 0.7, Z + 0.15, 0.65, 'duz', P.yaprak, { det: 1 });
};

// Çevre parçaları (cevre: true): hücre merkezinde direk, `c.bag` bit maskesiyle komşu parçalara uzanan kol (1 = +x, 2 = −x, 4 = +z, 8 = −z).
// Komşu hücre karşı yarıyı çizer; böylece ardışık parçalar kesintisiz çit/sur olur. Maske sahne.js'te hesaplanır (`cevreMaskeleri`).
const CEVRE_KOL = [[1, 1, 0], [2, -1, 0], [4, 0, 1], [8, 0, -1]];
M.cit = (k, c) => {
  const Z = ZEMIN_Y + 0.01, h = 0.2, renk = 0x7a5634, acik = 0x9a7648;
  k.kutu(0.05, h + 0.06, 0.05, 0, Z, 0, 'kutuk', 0x6a4828);
  k.koni(0.04, 0.05, 4, 0, Z + h + 0.06, 0, 'kutuk', 0x5e4022);
  const kollar = CEVRE_KOL.filter(([bit]) => c.bag & bit);
  if (!kollar.length) { // yalnız direk: iki yana kısa kol
    for (const [, dx, dz] of [CEVRE_KOL[0], CEVRE_KOL[1]]) {
      for (const yy of [0.07, 0.15]) k.kutu(Math.abs(dx) ? 0.22 : 0.018, 0.022, Math.abs(dz) ? 0.22 : 0.018, dx * 0.12, Z + yy, dz * 0.12, 'tahta', acik);
    }
    return;
  }
  for (const [, dx, dz] of kollar) {
    const yatay = Math.abs(dx) > 0;
    for (const yy of [0.06, 0.14]) k.kutu(yatay ? 0.5 : 0.022, 0.026, yatay ? 0.022 : 0.5, dx * 0.25, Z + yy, dz * 0.25, 'tahta', acik);
    for (const t of [0.17, 0.34]) { // kazıklar
      const y2 = h - 0.02 - (t > 0.3 ? 0.02 : 0);
      k.kutu(yatay ? 0.03 : 0.03, y2, 0.03, dx * t + (yatay ? 0 : 0), Z, dz * t, 'kutuk', renk);
      k.koni(0.022, 0.04, 4, dx * t, Z + y2, dz * t, 'kutuk', 0x5e4022);
    }
  }
};

M.sur_parcasi = (k, c) => {
  const Z = ZEMIN_Y + 0.01;
  const h = 0.42 * c.s;
  const kollar = CEVRE_KOL.filter(([bit]) => c.bag & bit);
  k.kutu(0.42, h + 0.1, 0.42, 0, Z, 0, 'tasBlok', P.surTas);
  k.kutu(0.46, 0.05, 0.46, 0, Z + h + 0.1, 0, 'tasBlok', 0x8a847a);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.kutu(0.1, 0.07, 0.1, sx * 0.17, Z + h + 0.15, sz * 0.17, 'tasBlok', P.surTas);
  for (const [, dx, dz] of kollar) {
    const yatay = Math.abs(dx) > 0;
    k.kutu(yatay ? 0.3 : 0.3, h, yatay ? 0.3 : 0.3, dx * 0.35, Z, dz * 0.35, 'tasBlok', P.surTas);
    k.kutu(yatay ? 0.3 : 0.36, 0.04, yatay ? 0.36 : 0.3, dx * 0.35, Z + h, dz * 0.35, 'tasBlok', 0x8a847a);
    for (const t of [0.28, 0.42]) k.kutu(yatay ? 0.08 : 0.12, 0.08, yatay ? 0.12 : 0.08, dx * t, Z + h + 0.04, dz * t, 'tasBlok', P.surTas);
  }
};

M.kale = (k, c) => {
  const Z = k.kaide(3, 'tas');
  const s = c.s, hs = 0.5 * s, a = 1.2;
  // surlar
  for (const [w, d, x, z] of [[2.2, 0.16, 0, -a], [0.16, 2.2, -a, 0], [0.16, 2.2, a, 0], [0.85, 0.16, -0.68, a], [0.85, 0.16, 0.68, a]]) {
    k.kutu(w, hs, d, x, Z, z, 'tasBlok', P.surTas);
    const n = Math.round(Math.max(w, d) / 0.16);
    for (let i = 0; i < n; i += 2) {
      const t = -0.5 + (i + 0.5) / n;
      k.kutu(w > d ? 0.08 : 0.18, 0.07, w > d ? 0.18 : 0.08, x + (w > d ? t * w : 0), Z + hs, z + (w > d ? 0 : t * d), 'tasBlok', P.surTas);
    }
  }
  // köşe kuleleri
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const th = hs + 0.3;
    k.sil(0.2, 0.22, th, 10, sx * a, Z, sz * a, 'tasBlok', 0x8e887e);
    k.koni(0.26, 0.38, 10, sx * a, Z + th, sz * a, 'arduvaz', P.arduvaz);
    k.pencere(sx * a, Z + th * 0.7, sz * a + 0.205, 0.04, 0.08, 'z', { isikli: true });
  }
  // kapı kulesi
  k.kutu(0.5, hs + 0.2, 0.3, 0, Z, a, 'tasBlok', 0x8e887e);
  k.kutu(0.2, 0.3, 0.02, 0, Z, a + 0.155, 'tahta', 0x4a2e1a);
  // iç kale (donjon)
  const dh = 1.05 * s;
  k.kutu(0.75, dh, 0.75, -0.15, Z, -0.2, 'tasBlok', 0xa29c90);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [1, 0], [-1, 0], [0, -1]]) k.kutu(0.12, 0.09, 0.12, -0.15 + x * 0.32, Z + dh, -0.2 + z * 0.32, 'tasBlok', 0xa29c90);
  for (const y of [0.4, 0.7]) { k.pencere(-0.15, Z + dh * y, 0.18, 0.05, 0.1, 'z', { isikli: true }); k.pencere(0.23, Z + dh * y, -0.2, 0.05, 0.1, 'x'); }
  k.bayrak(-0.15, -0.2, Z + dh, 0.5, P.sancak);
  k.bayrak(a, -a, Z + hs + 0.65, 0.25, P.sancak);
  // avlu: yapı + fıçılar
  k.kutu(0.5, 0.28, 0.35, 0.6, Z, -0.55, 'yariAhsap', P.sivaB);
  k.besik(0.6, 0.45, 0.2, 0.6, Z + 0.28, -0.55, 'arduvaz', 0x6a4a3a);
  k.fici(0.6, 0.4, Z); k.fici(0.72, 0.5, Z); k.sandik(-0.6, 0.6, Z);
  baca(k, 0.75, -0.6, Z + 0.3, 0.2);
};

M.katedral = (k, c) => {
  const Z = k.kaide(3, 'tas');
  const h = 0.85;
  // nef + yan nefler
  k.kutu(0.9, h, 2.0, 0, Z, -0.3, 'tasBlok', 0xd8d0c0);
  k.besik(2.1, 1.0, 0.7, 0, Z + h, -0.3, 'arduvaz', P.arduvaz, { ry: Math.PI / 2 });
  for (const sx of [-1, 1]) {
    k.kutu(0.35, 0.5, 1.8, sx * 0.62, Z, -0.35, 'tasBlok', 0xcfc7b6);
    k.kutu(0.42, 0.04, 1.8, sx * 0.62, Z + 0.5, -0.35, 'arduvaz', P.arduvaz, { rz: -sx * 0.35 });
    for (let i = 0; i < 4; i++) {
      k.kutu(0.08, 0.6, 0.1, sx * 0.84, Z, -1.1 + i * 0.5, 'tasBlok', 0xbfb7a6);
      k.koni(0.05, 0.14, 4, sx * 0.84, Z + 0.6, -1.1 + i * 0.5, 'tasBlok', 0xbfb7a6);
      if (sx > 0) k.pencere(0.455, Z + 0.66, -1.0 + i * 0.5, 0.07, 0.15, 'x', { isikli: true });
    }
  }
  // transept
  k.kutu(1.9, h * 0.9, 0.5, 0, Z, -0.7, 'tasBlok', 0xd8d0c0);
  k.besik(2.0, 0.6, 0.45, 0, Z + h * 0.9, -0.7, 'arduvaz', P.arduvaz);
  // ön cephe ikiz kuleler + sivri kuleler
  const kh = 1.45;
  for (const sx of [-1, 1]) {
    k.kutu(0.38, kh, 0.38, sx * 0.4, Z, 0.85, 'tasBlok', 0xd8d0c0);
    k.koni(0.27, 0.95, 4, sx * 0.4, Z + kh, 0.85, 'arduvaz', P.arduvaz, { ry: Math.PI / 4 });
    k.koni(0.02, 0.1, 4, sx * 0.4, Z + kh + 0.95, 0.85, 'duz', P.altin);
    for (const y of [0.5, 0.9, 1.2]) k.pencere(sx * 0.4, Z + y, 1.045, 0.07, 0.15, 'z', { isikli: y < 1 });
  }
  k.kutu(0.44, h + 0.2, 0.2, 0, Z, 0.88, 'tasBlok', 0xd8d0c0);
  // gül pencere + portal
  k.sil(0.13, 0.13, 0.02, 12, 0, Z + 0.72, 0.985, 'duz', 0xffc070, { rx: Math.PI / 2, y: Z + 0.72, isil: true });
  for (let i = 0; i < 6; i++) k.kutu(0.24, 0.012, 0.025, 0, Z + 0.72, 0.995, 'duz', 0x6a5a4a, { rz: (i / 6) * Math.PI });
  k.kemer(0, Z, 0.982, 0.24, 0.46, 0x3a2418, true);
  // geçiş kulesi (sivri)
  k.kutu(0.3, 0.3, 0.3, 0, Z + h + 0.2, -0.7, 'tasBlok', 0xd8d0c0);
  k.koni(0.2, 0.75, 8, 0, Z + h + 0.5, -0.7, 'arduvaz', P.arduvaz);
  k.koni(0.015, 0.1, 4, 0, Z + h + 1.25, -0.7, 'duz', P.altin);
};

// ---------- genel yedek şablon (çağ tipine göre) ----------
function sablon(k, c, t) {
  const g = t.boyut[0];
  const cag = c.cag;
  const doku = ['deri', 'hasir', 'kerpic', 'tasBlok', 'yariAhsap'][cag];
  const renk = [P.deri, 0xa08058, P.kerpic, P.kirec, P.sivaB][cag];
  const catiD = ['deri', 'saman', 'kiremit', 'kiremit', 'arduvaz'][cag];
  const catiR = [P.deriK, P.saman, P.kiremitE, P.kiremit, P.arduvaz][cag];
  const Z = k.kaide(g, cag < 2 ? 'toprak' : cag === 2 ? 'kerpic' : 'tas');
  const w = g - 0.35, h = (0.32 + 0.12 * (g - 1)) * c.s;
  if (cag === 0) { k.koni(w * 0.55, 0.6 * c.s, 7, 0, Z, 0, doku, renk); return; }
  evGovdesi(k, w, h, w, Z, doku, renk, {});
  k.besik(w + 0.12, w + 0.12, 0.3, 0, Z + h, 0, catiD, catiR);
  baca(k, w * 0.25, -w * 0.25, Z + h + 0.08, 0.2);
}

// ---------- seviye / durum ekleri ----------
function ekler(k, c, t, durum) {
  const g = t.boyut[0], a = g / 2 - 0.12, Z = ZEMIN_Y + 0.03;
  const cagBayrak = [P.kumasK, P.asi, P.asi, P.lacivert, P.sancak][c.cag];
  if (c.sv >= 2 && t.tur !== 'merkez') {
    k.fici(a, -a + 0.05, Z, 0.9); k.sandik(a - 0.06, -a + 0.15, Z, 0.8, 0.4);
  }
  if (c.sv >= 3 && t.tur !== 'merkez') k.bayrak(-a + 0.02, -a + 0.02, Z, (0.55 + 0.15 * g) * 1, cagBayrak);
  // seviye pulları (kaide önü)
  for (let i = 1; i < c.sv; i++) k.kutu(0.05, 0.03, 0.02, -g / 2 + 0.1 + (i - 1) * 0.07, ZEMIN_Y + 0.01, g / 2 - 0.03, 'duz', P.altin);
  if (durum === 'h') {
    for (let i = 0; i < 4; i++) k.tas(-a + k.R() * g * 0.7, a - k.R() * 0.15, Z, 0.03 + k.R() * 0.03, 0x4a4038);
    k.kutu(0.3 * g, 0.03, 0.03, 0.05, Z + 0.02, a - 0.05, 'kutuk', 0x2a1e16, { rz: 0.25, ry: 0.5 });
    k.duman.push([0, Z + 0.25 * g, 0, 0.8, 'is']);
  }
}

function iskele(k, g, tepe, kismi) {
  const a = g / 2 - 0.06, Z = ZEMIN_Y + 0.03, h = Math.max(0.35, tepe - Z + 0.05);
  const koseler = kismi ? [[1, -1], [1, 1]] : [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sz] of koseler) k.kutu(0.025, h, 0.025, sx * a, Z, sz * a, 'kutuk', 0x9a7a50);
  const katlar = Math.max(1, Math.round(h / 0.28));
  for (let i = 1; i <= katlar; i++) {
    const y = Z + (i * h) / (katlar + 0.3);
    k.kutu(0.025, 0.02, 2 * a, a, y, 0, 'tahta', 0xb08a5a);
    k.kutu(0.08, 0.012, 2 * a, a + 0.03, y + 0.02, 0, 'tahta', 0xc09a68);
    if (!kismi) { k.kutu(2 * a, 0.02, 0.025, 0, y, a, 'tahta', 0xb08a5a); k.kutu(2 * a, 0.012, 0.08, 0, y + 0.02, a + 0.03, 'tahta', 0xc09a68); }
  }
  // çapraz destek
  k.kutu(0.015, h * 1.05, 0.015, a, Z, 0, 'kutuk', 0x8a6a44, { rx: Math.atan2(2 * a, h) * 0.8 });
  if (!kismi) {
    k.kutu(0.015, h * 1.05, 0.015, 0, Z, a, 'kutuk', 0x8a6a44, { rz: Math.atan2(2 * a, h) * 0.8 });
    // malzeme yığını
    k.odun(-a + 0.1, a - 0.05, Z, 0.2, 0.8);
    k.kutu(0.1, 0.06, 0.08, a - 0.12, Z, a + 0.0, 'tasBlok', 0xb0aa9c);
  }
}

// ===================================================================================
const geoOnbellek = new Map();
const kenarOnbellek = new Map();

function modelVerisi(id, sv, durumTam) {
  const anahtar = `${id}|${sv}|${durumTam}`;
  const [durum, bagStr = '0'] = durumTam.split('#'); // çevre parçalarında "#<maske>": komşu bağlantıları
  let v = geoOnbellek.get(anahtar);
  if (v) return v;
  const t = BINA[id];
  const cag = CAG_SIRA[t.cag] ?? 0;
  const k = new Kurucu(hash(id) + sv * 31);
  const c = { g: t.boyut[0], sv, s: 1 + 0.12 * (sv - 1), cag, bag: Number(bagStr) };
  (M[id] || ((kk, cc) => sablon(kk, cc, t)))(k, c);
  const govdeTepe = Math.max(...k.parcalar.map((p) => p.max), TABAN_Y + 0.2);
  if (durum.startsWith('i')) {
    // inşaat: tamamlanan kısım (alt parçalar) + iskele; taslak ayrı malzemeyle tam modelden çizilir
    const p = (Number(durum.slice(1)) + 1) / 4;
    const kes = ZEMIN_Y + (govdeTepe - ZEMIN_Y) * p * 0.85;
    k.parcalar = k.parcalar.filter((q) => q.min <= kes - 0.02 || q.max <= TABAN_Y + 0.02);
    k.duman = []; k.ates = []; k.pervane = null;
    if (!t.cevre) iskele(k, c.g, kes + 0.1, false); // çit/sur küçük: iskele yerine taslak katmanı yeter
  } else {
    ekler(k, c, t, durum);
    if ((durum === 'y' || durum === 'o') && !t.cevre) iskele(k, c.g, govdeTepe * 0.8, true);
    if (durum === 'h') { k.ton = [0.55, 0.5, 0.46]; k.duman = k.duman.filter((d) => d[4] === 'is'); k.ates = []; }
    if (durum === 'k') { k.ton = [0.72, 0.72, 0.74]; k.duman = []; k.ates = []; }
  }
  const { ana, isil } = k.birlestir();
  // Ölçek geometriye pişirilir (zemin çizgisi ZEMIN_Y sabit): grup ölçeği gölgelendiricide benekli kenar çizgisi üretiyordu.
  const os = t.cevre ? 1 : (t.tur === 'merkez' ? 1.3 : 1.24) + 0.04 * (sv - 1);
  const ol = (n) => { for (const g of [ana, isil]) { if (!g) continue; const p = g.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * n, ZEMIN_Y + (p.getY(i) - ZEMIN_Y) * n, p.getZ(i) * n); p.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); } };
  const dz = (a) => a.map((e) => [e[0] * os, ZEMIN_Y + (e[1] - ZEMIN_Y) * os, e[2] * os, ...e.slice(3)]);
  if (os !== 1) {
    ol(os);
    k.duman = dz(k.duman); k.ates = dz(k.ates);
    if (k.pervane) k.pervane = { ...k.pervane, x: k.pervane.x * os, y: ZEMIN_Y + (k.pervane.y - ZEMIN_Y) * os, z: k.pervane.z * os, r: k.pervane.r * os };
  }
  v = { ana, isil, duman: k.duman, ates: k.ates, pervane: k.pervane, tepe: ZEMIN_Y + (govdeTepe - ZEMIN_Y) * os, g: c.g, cag };
  geoOnbellek.set(anahtar, v);
  return v;
}

// yel değirmeni kanatları (ortak geometri)
let pervaneGeo = null;
function pervane() {
  if (pervaneGeo) return pervaneGeo;
  const k = new Kurucu(7);
  k.sil(0.04, 0.04, 0.06, 8, 0, -0.03, 0, 'duz', P.kiris, { rx: Math.PI / 2, y: 0 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a);
    k.kutu(0.025, 1, 0.02, 0, 0, 0, 'kutuk', P.kiris, { rz: a - Math.PI / 2, x: cx * 0.5, y: sy * 0.5, z: 0.03 });
    k.kutu(0.16, 0.62, 0.008, 0, 0, 0, 'hasir', 0xe8dcc0, { rz: a - Math.PI / 2, x: cx * 0.62 - sy * 0.09, y: sy * 0.62 + cx * 0.09, z: 0.04 });
  }
  pervaneGeo = k.birlestir().ana;
  return pervaneGeo;
}

export function modeliTemizle(grup) {
  grup.traverse((o) => { if (o.geometry && o.userData.tekGeo) o.geometry.dispose(); });
  grup.clear();
}

export function durumKodu(durum = {}) {
  if (durum.insa != null) return `i${Math.min(3, Math.max(0, Math.floor(durum.insa * 4)))}`;
  if (durum.hasarli) return 'h';
  if (durum.isi === 'yukselt') return 'y';
  if (durum.isi === 'onar') return 'o';
  if (durum.kapali) return 'k';
  return '';
}

// durum: { insa: 0..1 | null, hasarli, isi: 'yukselt'|'onar'|null, kapali }; secenek.hayalet: renk (yarı saydam önizleme).
// Dönen grup.userData: { tepe, duman: [[x,y,z,s,tip]], ates: [[x,y,z,s]], pervane: Mesh|null, g }
export function binaModeli(b, durum = {}, secenek = {}) {
  const t = BINA[b.id];
  const sv = Math.min(3, Math.max(1, b.seviye || 1));
  const kod = secenek.hayalet ? '' : durumKodu(durum);
  const bag = t.cevre ? `#${(secenek.bag ?? durum.bag) | 0}` : '';
  const v = modelVerisi(b.id, sv, kod + bag);
  const grup = new THREE.Group();
  const golge = !secenek.hayalet;
  if (secenek.hayalet) {
    const m = new THREE.Mesh(v.ana, hayaletMat(secenek.hayalet));
    m.renderOrder = 12;
    grup.add(m);
    const kenarAnahtar = b.id + bag;
    let kenar = kenarOnbellek.get(kenarAnahtar);
    if (!kenar) { kenar = new THREE.EdgesGeometry(v.ana, 40); kenarOnbellek.set(kenarAnahtar, kenar); }
    const cz = new THREE.LineSegments(kenar, cizgiMat(secenek.hayalet));
    cz.renderOrder = 13;
    grup.add(cz);
  } else {
    const m = new THREE.Mesh(v.ana, binaMat());
    m.castShadow = golge; m.receiveShadow = true;
    grup.add(m);
    if (v.isil) grup.add(new THREE.Mesh(v.isil, isilMat()));
    if (kod.startsWith('i')) {
      const tam = modelVerisi(b.id, sv, bag);
      const taslak = new THREE.Mesh(tam.ana, taslakMat());
      taslak.renderOrder = 5;
      grup.add(taslak);
    }
  }
  let pv = null;
  if (v.pervane) {
    pv = new THREE.Mesh(pervane(), secenek.hayalet ? hayaletMat(secenek.hayalet) : binaMat());
    pv.position.set(v.pervane.x, v.pervane.y, v.pervane.z);
    pv.scale.setScalar(v.pervane.r);
    grup.add(pv);
  }
  grup.userData = { tepe: v.tepe, duman: v.duman, ates: v.ates, pervane: pv, g: t.boyut[0], durum: kod };
  return grup;
}

// ---------- köy süsleri (InstancedMesh için ortak geometri, binaMat ile çizilir) ----------
const susOnbellek = {};
export const SUS_TIPLERI = ['fici', 'sandik', 'odun', 'balya', 'tas', 'cit', 'sepet', 'deri'];
export function susGeo(tip) {
  if (susOnbellek[tip]) return susOnbellek[tip];
  const k = new Kurucu(hash(tip));
  const Z = ZEMIN_Y;
  if (tip === 'fici') { k.fici(0, 0, Z); k.fici(0.1, 0.04, Z, 0.85); }
  else if (tip === 'sandik') { k.sandik(0, 0, Z); k.sandik(0.06, 0.1, Z, 0.8, 0.5); k.sandik(0.02, 0.03, Z + 0.09, 0.7, 0.2); }
  else if (tip === 'odun') k.odun(0, 0, Z, 0.3, 1.1);
  else if (tip === 'balya') { k.sil(0.08, 0.08, 0.12, 10, 0, Z, 0, 'saman', P.saman, { rx: Math.PI / 2, y: Z + 0.08 }); k.sil(0.07, 0.07, 0.1, 10, 0.12, Z, 0.08, 'saman', P.saman, { y: Z + 0.05 }); }
  else if (tip === 'tas') { k.tas(0, 0, Z, 0.07); k.tas(0.09, 0.05, Z, 0.045); k.tas(-0.05, 0.08, Z, 0.035); }
  else if (tip === 'cit') k.cit(-0.3, 0, 0.3, 0, Z, 0x7a5634, 0.12);
  else if (tip === 'sepet') { k.sil(0.05, 0.04, 0.07, 8, 0, Z, 0, 'hasir', 0xc49a5a); k.sil(0.04, 0.035, 0.06, 8, 0.08, Z, 0.03, 'hasir', 0xb08a50); k.kure(0.03, 0, Z + 0.075, 0, 'duz', 0xc04040); }
  else if (tip === 'deri') { k.kutu(0.2, 0.012, 0.14, 0, Z, 0, 'deri', P.deri, { ry: 0.4 }); k.direk(0.12, -0.05, Z, 0.18, 0.008); }
  susOnbellek[tip] = k.birlestir().ana;
  return susOnbellek[tip];
}

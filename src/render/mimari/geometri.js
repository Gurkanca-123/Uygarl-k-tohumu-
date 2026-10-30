// Mimari geometri üreticileri: dışbükey katılar, çokgen prizmalar, kirişler, çatı kabukları. Yalnız three'ye bağlıdır (DOM yok).
// `Yerel`: bir cephe/kanat çerçevesi (konum + yatay dönüş) içinde parça ekleyen sarmalayıcı; parçalar `Kurucu.ekle` ile birleşir.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();

// Dışbükey katı: köşeler + yüzler (köşe indeks dizisi). Yüz yönü katının merkezine göre otomatik düzeltilir.
export function katiGeo(kose, yuzler) {
  const m = [0, 0, 0];
  for (const p of kose) { m[0] += p[0]; m[1] += p[1]; m[2] += p[2]; }
  m[0] /= kose.length; m[1] /= kose.length; m[2] /= kose.length;
  const pos = [];
  const ucgen = (p, q, r) => {
    _a.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    _b.set(r[0] - p[0], r[1] - p[1], r[2] - p[2]);
    _n.crossVectors(_a, _b);
    const cx = (p[0] + q[0] + r[0]) / 3 - m[0], cy = (p[1] + q[1] + r[1]) / 3 - m[1], cz = (p[2] + q[2] + r[2]) / 3 - m[2];
    const s = _n.x * cx + _n.y * cy + _n.z * cz < 0 ? [p, r, q] : [p, q, r];
    for (const v of s) pos.push(v[0], v[1], v[2]);
  };
  for (const y of yuzler) for (let i = 1; i < y.length - 1; i++) ucgen(kose[y[0]], kose[y[i]], kose[y[i + 1]]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

// Dışbükey çokgenin (u,v) düzleminde prizması. eksen 'z': (u,v,t); 'x': (t,v,u). t ∈ [t0,t1].
export function prizmaGeo(poly, t0, t1, eksen = 'z') {
  const n = poly.length, kose = [];
  const nok = (u, v, t) => (eksen === 'x' ? [t, v, u] : [u, v, t]);
  for (const [u, v] of poly) kose.push(nok(u, v, t0));
  for (const [u, v] of poly) kose.push(nok(u, v, t1));
  const yuzler = [Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => n + i)];
  for (let i = 0; i < n; i++) yuzler.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  return katiGeo(kose, yuzler);
}

// a→b arası kiriş (kesit w×h, uzunluk boyunca); düşey kirişte yukarı eksen x alınır.
export function kirisGeo(a, b, w, h) {
  const z = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = z.length();
  z.normalize();
  const yukari = Math.abs(z.y) > 0.98 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const x = new THREE.Vector3().crossVectors(yukari, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  const g = new THREE.BoxGeometry(w, h, L);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z).setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
  return g;
}

// Kemerli (yarım daire) dışbükey profil: genişlik w, toplam yükseklik h, alt y=0. Çokgen [u,v].
export function kemerProfil(w, h, seg = 6) {
  const r = w / 2, d = Math.max(0, h - r), p = [[-r, 0], [r, 0], [r, d]];
  for (let i = 1; i < seg; i++) { const q = (i / seg) * Math.PI; p.push([r * Math.cos(q), d + r * Math.sin(q)]); }
  p.push([-r, d]);
  return p;
}

// BoxGeometry yüz sırası: +x, -x, +y, -y, +z, -z (her biri 6 indeks). -y her zaman, -z istenirse atılır.
export function kutuGeo(w, h, d, arkaAt = false) {
  const g = new THREE.BoxGeometry(w, h, d);
  const idx = g.index.array, yeni = [];
  for (let f = 0; f < 6; f++) {
    if (f === 3 || (f === 5 && arkaAt)) continue;
    for (let i = 0; i < 6; i++) yeni.push(idx[f * 6 + i]);
  }
  g.setIndex(yeni);
  return g;
}

export class Yerel {
  // s: tek biçimli ölçek (alt çerçeveler miras alır): yerel birimler dünyada s ile çarpılır, çerçeve başlangıcı sabit kalır.
  constructor(k, x = 0, y = 0, z = 0, ry = 0, s = 1) { this.k = k; this.x = x; this.y = y; this.z = z; this.ry = ry; this.s = s; this.cephe = false; }

  // alt çerçeve: bu çerçevenin yerel (lx,lz) noktasında, ek ry dönüşüyle
  alt(lx, lz, ry = 0, ly = 0) {
    const n = this.nokta(lx, ly, lz);
    return new Yerel(this.k, n[0], n[1], n[2], this.ry + ry, this.s);
  }
  nokta(lx, ly, lz) {
    const c = Math.cos(this.ry), s = Math.sin(this.ry);
    const k = this.s;
    return [this.x + (lx * c + lz * s) * k, this.y + ly * k, this.z + (-lx * s + lz * c) * k];
  }

  // geo: yerel koordinatlarda hazır geometri. o.rx/ry/rz: geometrinin kendi merkezi çevresinde ön dönüş.
  ekle(geo, lx, ly, lz, doku, renk, o = {}) {
    const { rx, ry, rz, sx, sy, sz, ...diger } = o;
    if (sx || sy || sz) geo.scale(sx || 1, sy || 1, sz || 1); // geometrinin kendi merkezinde ölçek
    if (rx) geo.rotateX(rx);
    if (rz) geo.rotateZ(rz);
    if (ry) geo.rotateY(ry);
    geo.translate(lx, ly, lz);
    if (this.s !== 1) geo.scale(this.s, this.s, this.s);
    geo.rotateY(this.ry);
    geo.translate(this.x, this.y, this.z);
    return this.k.ekle(geo, { doku, renk, ...diger });
  }
  // ly = alt kenar
  // Alt yüz hiç görünmez (kamera yukarıdan bakar) → atılır. Cephe çerçevesinde arka yüz (duvara bitişik) de atılır.
  kutu(w, h, d, lx, ly, lz, doku, renk, o = {}) {
    return this.ekle(kutuGeo(w, h, d, this.cephe && !o.arka), lx, ly + h / 2, lz, doku, renk, o);
  }
  prizma(poly, t0, t1, eksen, lx, ly, lz, doku, renk, o = {}) { return this.ekle(prizmaGeo(poly, t0, t1, eksen), lx, ly, lz, doku, renk, o); }
  kiris(a, b, w, h, doku, renk, o = {}) { return this.ekle(kirisGeo(a, b, w, h), 0, 0, 0, doku, renk, o); }
  silindir(rt, rb, h, seg, lx, ly, lz, doku, renk, o = {}) {
    return this.ekle(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.acik), lx, ly + h / 2, lz, doku, renk, { yumusak: seg > 7, ...o });
  }
  koni(r, h, seg, lx, ly, lz, doku, renk, o = {}) { return this.ekle(new THREE.ConeGeometry(r, h, seg), lx, ly + h / 2, lz, doku, renk, o); }
  kure(r, lx, ly, lz, doku, renk, o = {}) { return this.ekle(new THREE.IcosahedronGeometry(r, o.det ?? 0), lx, ly, lz, doku, renk, o); }
}

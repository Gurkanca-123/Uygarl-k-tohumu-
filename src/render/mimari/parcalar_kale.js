// Kale/sur parçaları: mazgallı sur parçası, yuvarlak kule (konsollu, külahlı ya da mazgallı), kare donjon, kapı kulesi (asma köprü + kafes kapı).
// Ortak: `Yerel` çerçeveleri; y mutlak (çerçeve y'sine göre). Savunma mimarisi için kale, sur parçası, muhafız kulesi tarifleri kullanır.
import * as THREE from 'three';
import { kuleKulah } from './cati.js';
import { kapi, pencere } from './parcalar.js';
import { kemerProfil } from './geometri.js';

const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

/**
 * Sur parçası (x0,z0)→(x1,z1). Dışa bakan taraf yönün sağıdır: ön sur x artan, sağ sur z azalan, arka x azalan, sol z artan.
 * o: { x0,z0,x1,z1,y,h,t, mazgal = true, ok = true }
 */
export function surParca(Y, S, o) {
  const { x0, z0, x1, z1, y, h = 0.5, t = 0.14, mazgal = true, ok = true } = o;
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
  if (L < 0.02) return;
  const W = Y.alt((x0 + x1) / 2, (z0 + z1) / 2, Math.atan2(-dz, dx));
  W.cephe = false;
  W.kutu(L, h, t, 0, y, 0, 'tasBlok', S.tas);
  W.kutu(L, 0.07, t + 0.04, 0, y, 0, 'tasBlok', carp(S.tas, 0.9));                  // eğimli taban (batter)
  W.kutu(L + 0.01, 0.03, t + 0.05, 0, y + h, 0, 'tasBlok', S.tasAcik);              // tepe silmesi
  if (mazgal) {
    const n = Math.max(2, Math.round(L / 0.16)), g = L / n;
    for (let i = 0; i < n; i += 1) if (i % 2 === 0 || Y.k.lod) W.kutu(g * (Y.k.lod ? 0.9 : 0.55), 0.07, 0.04, -L / 2 + g * (i + 0.5), y + h + 0.03, t / 2 + 0.015, 'tasBlok', S.tasAcik);
    W.kutu(L, 0.035, 0.03, 0, y + h + 0.03, -t / 2 - 0.01, 'tasBlok', S.tas); // iç korkuluk
  }
  if (ok && !Y.k.lod) {
    const n = Math.max(1, Math.floor(L / 0.45));
    for (let i = 0; i < n; i++) W.kutu(0.014, 0.065, 0.012, -L / 2 + (L * (i + 0.5)) / n, y + h * 0.5, t / 2 + 0.002, 'duz', 0x1c1814, { arka: true });
  }
}

/**
 * Yuvarlak kule. o: { x, z, y, r, h, seg = 10, uc: 'kulah'|'mazgal', kulahH, pencere = true }
 * Konsollu (machicolation) tepe halkası; 'kulah' sivri külah, 'mazgal' açık mazgal tepe. Dönüş: tepe y.
 */
export function yuvarlakKule(Y, S, o) {
  const { x, z, y, r, h, seg = 10, uc = 'kulah', kulahH = 0.38 } = o;
  const gri = S.tas, acik = S.tasAcik;
  Y.silindir(r * 1.1, r * 1.12, 0.05, seg, x, y, z, 'tasBlok', carp(gri, 0.88));                 // kaide
  Y.silindir(r * 0.96, r * 1.06, h, seg, x, y + 0.03, z, 'tasBlok', gri);
  if (!Y.k.lod) for (const t of [0.4, 0.7]) Y.silindir(r * 1.0, r * 1.0, 0.016, seg, x, y + h * t, z, 'tasBlok', acik);
  const top = y + 0.03 + h;
  Y.silindir(r * 1.22, r * 0.98, 0.07, seg, x, top - 0.01, z, 'tasBlok', carp(acik, 0.95));      // konsol halkası
  if (uc === 'mazgal') {
    const n = seg;
    for (let i = 0; i < n; i++) if (i % 2 === 0) {
      const a = (i / n) * Math.PI * 2;
      Y.kutu(0.07, 0.07, 0.05, x + Math.cos(a) * r * 1.16, top + 0.06, z + Math.sin(a) * r * 1.16, 'tasBlok', acik, { ry: -a + Math.PI / 2 });
    }
    return top + 0.1;
  }
  const g = kuleKulah(Y, { lx: x, lz: z, y: top + 0.05, r: r * (o.kulahR ?? 1.2), h: kulahH, seg, renk: S.arduvaz, doku: 'arduvaz' });
  // ok yarıkları + bir ışıklı pencere (+z / +x yüzleri)
  if (o.pencere !== false) for (const [a, t] of [[0.55, 0.35], [1.05, 0.65], [0.15, 0.62]]) {
    const px = x + Math.sin(a) * (r * 1.0 + 0.005), pz = z + Math.cos(a) * (r * 1.0 + 0.005);
    Y.kutu(0.016, 0.07, 0.012, px, y + h * t, pz, 'duz', t > 0.6 ? S.camIsik : 0x1c1814, { ry: a, isil: t > 0.6 });
  }
  return g.tepe;
}

/**
 * Kare donjon (ana kule): gövde, köşe burçları, mazgallı tepe, romanesk pencereler, içerdeki küçük külah.
 * o: { x, z, y, w, h, burc = 'yuvarlak'|'kare'|'yok', ic: 'kulah'|'duz' }
 */
export function donjon(Y, S, o) {
  const { x, z, y, w, h, burc = 'kare', ic = 'duz' } = o;
  Y.kutu(w + 0.08, 0.06, w + 0.08, x, y, z, 'tasBlok', carp(S.tas, 0.9));
  Y.kutu(w, h, w, x, y + 0.03, z, 'tasBlok', S.tas);
  for (const t of [0.34, 0.68]) Y.kutu(w + 0.025, 0.02, w + 0.025, x, y + h * t, z, 'tasBlok', S.tasAcik);
  // köşe payandaları
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.07, h * 0.8, 0.07, x + sx * (w / 2 + 0.005), y + 0.03, z + sz * (w / 2 + 0.005), 'tasBlok', S.tasAcik);
  // pencereler (z+ ve x+)
  const F = Y.alt(x, z + w / 2, 0, 0); F.cephe = true;
  const G = Y.alt(x + w / 2, z, Math.PI / 2, 0); G.cephe = true;
  for (const f of [F, G]) {
    pencere(f, S, { x: -0.08, y: y + h * 0.55, w: 0.07, h: 0.11, tip: 'kemer', panjur: null, isikli: true });
    pencere(f, S, { x: 0.1, y: y + h * 0.55, w: 0.07, h: 0.11, tip: 'kemer', panjur: null, isikli: false });
    if (!Y.k.lod) for (const px of [-0.12, 0.12]) f.kutu(0.014, 0.07, 0.012, px, y + h * 0.82, 0.002, 'duz', 0x1c1814, { arka: true });
  }
  // mazgallı tepe
  const top = y + 0.03 + h;
  Y.kutu(w + 0.1, 0.045, w + 0.1, x, top - 0.02, z, 'tasBlok', S.tasAcik);
  const n = Math.max(4, Math.round(w / 0.14)), g = (w + 0.08) / n;
  for (let i = 0; i < n; i++) if (i % 2 === 0 || Y.k.lod) for (const sx of [-1, 1]) {
    Y.kutu(g * 0.7, 0.07, 0.045, x - (w + 0.08) / 2 + g * (i + 0.5), top + 0.02, z + sx * (w / 2 + 0.03), 'tasBlok', S.tasAcik);
    Y.kutu(0.045, 0.07, g * 0.7, x + sx * (w / 2 + 0.03), top + 0.02, z - (w + 0.08) / 2 + g * (i + 0.5), 'tasBlok', S.tasAcik);
  }
  let tepe = top + 0.09;
  if (burc !== 'yok') for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (burc === 'yuvarlak') {
      const r = 0.075;
      Y.silindir(r, r * 1.05, 0.16, 8, x + sx * (w / 2), top - 0.02, z + sz * (w / 2), 'tasBlok', S.tas);
      kuleKulah(Y, { lx: x + sx * (w / 2), lz: z + sz * (w / 2), y: top + 0.14, r: r * 1.25, h: 0.2, seg: 8, renk: S.arduvaz, doku: 'arduvaz' });
    } else {
      Y.kutu(0.13, 0.17, 0.13, x + sx * (w / 2), top - 0.02, z + sz * (w / 2), 'tasBlok', S.tas);
      Y.koni(0.11, 0.18, 4, x + sx * (w / 2), top + 0.15, z + sz * (w / 2), 'arduvaz', S.arduvazUst, { ry: Math.PI / 4 });
    }
  }
  if (ic === 'kulah') {
    Y.kutu(w * 0.5, 0.16, w * 0.5, x, top, z, 'tasBlok', S.tas);
    kuleKulah(Y, { lx: x, lz: z, y: top + 0.16, r: w * 0.4, h: 0.36, seg: 4, renk: S.arduvaz, doku: 'arduvaz' });
    tepe = top + 0.52;
  }
  return { tepe };
}

/**
 * Kapı kulesi (+z'ye bakar): iki yuvarlak yan kule + kemerli kapı + yukarı çekilmiş kafes + asma köprü + zincirler + sancak.
 * o: { x, z, y, w, h, kuleR }; z = sur düzlemi. Dönüş: tepe.
 */
export function kaleKapisi(Y, S, o) {
  const { x, z, y, w = 0.5, h = 0.64, kuleR = 0.17 } = o;
  const G = Y.alt(x, z, 0); G.cephe = true;
  // gövde (kapı üstü kütle)
  G.kutu(w, h, 0.3, 0, y, 0, 'tasBlok', S.tas);
  G.kutu(w + 0.02, 0.03, 0.34, 0, y + h, 0, 'tasBlok', S.tasAcik);
  // kemerli kapı + kafes
  kapi(G, S, { x: 0, w: 0.22, h: 0.3 });
  if (!Y.k.lod) {
    for (let i = -2; i <= 2; i++) G.kutu(0.01, 0.14, 0.012, i * 0.04, y + 0.36, 0.152, 'duz', S.demir, { arka: true });
    for (const yy of [0.4, 0.46]) G.kutu(0.2, 0.01, 0.014, 0, y + yy, 0.152, 'duz', S.demir, { arka: true });
  }
  // mazgallar + konsollar (kapı üstü)
  const n = 6;
  for (let i = 0; i < n; i++) {
    G.kutu(0.045, 0.07, 0.05, -w / 2 + (w * (i + 0.5)) / n, y + h + 0.03, 0.12, 'tasBlok', S.tasAcik);
    if (i % 2 === 0 && !Y.k.lod) G.kutu(0.05, 0.06, 0.07, -w / 2 + (w * (i + 0.5)) / n, y + h - 0.07, 0.17, 'tasBlok', S.tas);
  }
  // asma köprü: tahta tabliye + iki zincir
  const bz = 0.3;
  G.kutu(0.2, 0.018, bz, 0, y + 0.0, 0.15 + bz / 2, 'tahta', 0x7a5634, { arka: true });
  for (let i = 0; i < 6 && !Y.k.lod; i++) G.kutu(0.2, 0.006, 0.008, 0, y + 0.02, 0.17 + i * 0.05, 'kutuk', S.kiris, { arka: true });
  for (const s of [-1, 1]) G.kiris([s * 0.09, y + h * 0.82, 0.16], [s * 0.09, y + 0.02, 0.15 + bz], 0.008, 0.008, 'duz', S.demir);
  // yan kuleler
  const t1 = yuvarlakKule(Y, S, { x: x - w / 2 - 0.02, z: z, y, r: kuleR, h: h + 0.2, seg: 10, uc: 'kulah', kulahH: 0.36 });
  yuvarlakKule(Y, S, { x: x + w / 2 + 0.02, z: z, y, r: kuleR, h: h + 0.2, seg: 10, uc: 'kulah', kulahH: 0.36 });
  return { tepe: t1 };
}

/** Sancak direği (taş/kule üstü): direk + dalgalı bayrak (iki parça) + altın küre. Dünya koordinatı (Y çerçevesine göre). */
export function sancak(Y, S, x, z, y, h = 0.34, renk = 0xb03a2e) {
  Y.silindir(0.007, 0.009, h, 5, x, y, z, 'kutuk', S.kiris);
  Y.kutu(0.14, 0.07, 0.008, x + 0.075, y + h - 0.08, z, 'kumas', renk, { rz: -0.05 });
  Y.kutu(0.07, 0.07, 0.008, x + 0.17, y + h - 0.085, z, 'kumas', carp(renk, 0.85), { rz: 0.05 });
  Y.kure(0.014, x, y + h + 0.01, z, 'duz', S.altin);
}

export { kemerProfil };

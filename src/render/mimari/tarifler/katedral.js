// Orta Çağ Katedrali (3×3, tekil anıt, zafer yapısı): haç planlı gotik. Nef + yan nefler + transept + vierung kulesi + apsis + ikiz batı kuleleri.
// Üç varyant: 0 ikiz piramit külahlı kuleler · 1 sekizgen külahlı ikiz kule + galeri · 2 asimetrik (biri yüksek külahlı, biri mazgallı).
// Koordinat: karo birimi; batı cephesi +z (kamera görür), nef ekseni z, sağ yan +x (kamera görür). Yalnız +z/+x yüzleri ayrıntılıdır.
import { Yerel } from '../geometri.js';
import { catiBesik, catiTek } from '../cati.js';
import { sivriPencere, gulPencere, portal, ayak, ucanPayanda, kuleGovde, sivriKulah, mahyaSusu, sahanlik, sivriProfil } from '../parcalar_anit.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;

const VARYANTLAR = [
  { ad: 'ikiz piramit', sol: { h: 1.3, kule: 'piramit', sh: 0.88, seg: 4 }, sag: { h: 1.3, kule: 'piramit', sh: 0.88, seg: 4 }, kes: { h: 0.72, sh: 0.82, seg: 8 }, kademe: 4, galeri: false },
  { ad: 'sekizgen', sol: { h: 1.38, kule: 'piramit', sh: 0.98, seg: 8 }, sag: { h: 1.38, kule: 'piramit', sh: 0.98, seg: 8 }, kes: { h: 0.66, sh: 0.62, seg: 8 }, kademe: 3, galeri: true },
  { ad: 'asimetrik', sol: { h: 0.98, kule: 'mazgal', sh: 0.34, seg: 4 }, sag: { h: 1.5, kule: 'piramit', sh: 1.0, seg: 8 }, kes: { h: 0.78, sh: 0.9, seg: 8 }, kademe: 4, galeri: false },
];

export function katedral(k, c, vr = 0) {
  const S = c.stil, V = VARYANTLAR[vr % VARYANTLAR.length];
  const ZW = k.kaide(3, 'tas'); // dünya yüksekliği (kaide üstü); yerel yükseklikler buna göre göreli
  const Y = new Yerel(k, 0, ZW, 0, 0, 1.12);
  const Z = 0;
  const hN = 0.95, hA = 0.46, hT = 0.95;
  const T = S.tasKrem, rf = S.arduvaz, kenar = 0x3a3f4a;
  const blok = (w, h, d, x, y, z, renk = T) => Y.kutu(w, h, d, x, y, z, 'tasBlok', renk);

  // ---- zemin: sahanlık ve nef/yan nef/transept/apsis gövdeleri ----
  sahanlik(Y, S, { x: 0, z: 0.96, y: Z, w: 0.6, d: 0.3, adim: 3 });
  blok(0.72, hN, 1.7, 0, Z, -0.05);                         // nef
  for (const sx of [-1, 1]) blok(0.3, hA, 1.6, sx * 0.51, Z, 0.0, k.R() < 0.5 ? T : S.tasKrem); // yan nefler
  blok(2.2, hT, 0.42, 0, Z, -0.42);                         // transept
  Y.silindir(0.36, 0.36, hN, 10, 0, Z, -0.9, 'tasBlok', T);   // apsis
  Y.silindir(0.0, 0.42, 0.5, 10, 0, Z + hN, -0.9, 'arduvaz', rf[1], { yumusak: false });

  // ---- çatılar ----
  const nefR = Y.alt(0, -0.05, PI / 2);
  catiBesik(nefR, { x0: 0, z0: 0, w: 1.7, d: 0.72, y: Z + hN, H: 0.5, oh: 0.05, rake: 0.02, kal: 0.03, kivrim: 0, renk: rf, doku: 'arduvaz', kabukRenk: kenar, th: 0.012, alin: false, yosun: null, sutun: 16 });
  mahyaSusu(Y.alt(0, 0, PI / 2), S, { x0: -0.8, x1: 0.9, y: Z + hN + 0.5, z: 0, aralik: 0.11 });
  // yan nef çatıları batı kulesinin arka yüzünde (z=0.44) biter
  for (const sx of [-1, 1]) catiTek(Y.alt(sx * 0.51, -0.18, sx * PI / 2), { x0: 0, z0: 0, w: 1.24, d: 0.3, y: Z + hA, yuk: 0.14, oh: 0.04, rake: 0.02, renk: rf, doku: 'arduvaz', kabukRenk: kenar, th: 0.011 });
  catiBesik(Y, { x0: 0, z0: -0.42, w: 2.2, d: 0.42, y: Z + hT, H: 0.34, oh: 0.05, rake: 0.03, kal: 0.03, kivrim: 0, renk: rf, doku: 'arduvaz', kabukRenk: kenar, th: 0.012, alin: false, sutun: 14 });
  mahyaSusu(Y, S, { x0: -1.1, x1: 1.1, y: Z + hT + 0.34, z: -0.42, aralik: 0.11 });
  // transept alınları (taş üçgen) + nef batı alını
  for (const sx of [-1, 1]) Y.prizma([[-0.63, Z + hT], [-0.21, Z + hT], [-0.42, Z + hT + 0.3]], sx > 0 ? 1.05 : -1.1, sx > 0 ? 1.1 : -1.05, 'x', 0, 0, 0, 'tasBlok', T);
  Y.prizma([[-0.36, Z + hN], [0.36, Z + hN], [0, Z + hN + 0.42]], 0.77, 0.83, 'z', 0, 0, 0, 'tasBlok', T);
  for (const e of [-1, 1]) Y.kiris([e * 0.36, Z + hN, 0.84], [0, Z + hN + 0.43, 0.84], 0.02, 0.026, 'tasBlok', S.tas);
  Y.koni(0.03, 0.16, 4, 0, Z + hN + 0.42, 0.8, 'tasBlok', T, { ry: PI / 4 });
  if (!k.lod) { Y.kutu(0.008, 0.08, 0.008, 0, Z + hN + 0.58, 0.8, 'duz', S.altin); Y.kutu(0.04, 0.008, 0.008, 0, Z + hN + 0.63, 0.8, 'duz', S.altin); }

  // ---- batı cephesi ----
  const F0 = Y.alt(0, 0.8, 0, 0); F0.cephe = true;
  portal(Y.alt(0, 0.8, 0), S, { x: 0, w: 0.3, h: 0.5, kademe: V.kademe, y: Z });
  gulPencere(F0, S, { x: 0, y: Z + 0.82, r: 0.12 });
  // kör kemer galerisi (portal ile gül pencere arası)
  if (!k.lod) for (let i = 0; i < 7; i++) F0.prizma(sivriProfil(0.027, 0.04, 3), 0.0, 0.016, 'z', -0.24 + i * 0.08, Z + 0.58, 0, 'duz', i % 2 ? 0x7a7466 : 0x6c665a);
  F0.kutu(0.64, 0.022, 0.034, 0, Z + 0.555, 0.006, 'tasBlok', S.tas); // galeri altı silme
  // nef cephesi lanset çifti (gül pencere iki yanı)
  for (const s of [-1, 1]) sivriPencere(F0, S, { x: s * 0.24, y: Z + 0.74, w: 0.07, h: 0.2 });
  // cephe payandaları
  for (const s of [-1, 1]) ayak(Y, S, { x: s * 0.3, z: 0.84, y: Z, w: 0.1, h: 1.0 });

  // ---- batı kuleleri ----
  const kuleler = [[-0.48, V.sol], [0.48, V.sag]];
  for (const [kx, kv] of kuleler) {
    const g = kuleGovde(Y, S, { x: kx, z: 0.62, y: Z, w: 0.36, h: kv.h, kule: kv.kule, pencereler: [0.2, 0.46] });
    if (kv.kule === 'mazgal') {
      // yarım kalmış/mazgallı kule: alçak çatı külahsız, bayrak direği
      Y.koni(0.17, 0.2, 4, kx, g.tepe, 0.62, 'arduvaz', rf[2], { ry: PI / 4 });
      Y.silindir(0.006, 0.006, 0.26, 5, kx, g.tepe + 0.12, 0.62, 'duz', S.demir);
      Y.kutu(0.14, 0.07, 0.008, kx + 0.07, g.tepe + 0.3, 0.62, 'kumas', 0xb03a2e);
    } else {
      sivriKulah(Y, S, { x: kx, z: 0.62, y: g.tepe, r: kv.seg === 4 ? 0.265 : 0.23, h: kv.sh, seg: kv.seg });
    }
  }
  // kule kapıları: sağ kule tabanında küçük sivri portal
  portal(Y.alt(0.48, 0.8, 0), S, { x: 0, w: 0.15, h: 0.27, kademe: 2, y: Z });
  portal(Y.alt(-0.48, 0.8, 0), S, { x: 0, w: 0.15, h: 0.27, kademe: 2, y: Z });
  if (V.galeri) {
    // iki kule arası mazgallı galeri (üst)
    for (let i = 0; i < 9; i++) Y.kutu(0.05, 0.06, 0.04, -0.24 + i * 0.06, Z + hN + 0.0, 0.82, 'tasBlok', T);
  }

  // ---- vierung (geçiş) kulesi + külah ----
  const kg = kuleGovde(Y, S, { x: 0, z: -0.42, y: Z + 0.86, w: 0.3, h: V.kes.h, kule: 'piramit', pencereler: [0.45] });
  sivriKulah(Y, S, { x: 0, z: -0.42, y: kg.tepe, r: 0.2, h: V.kes.sh, seg: V.kes.seg });

  // ---- sağ yan: yan nef pencereleri, nef (clerestory) pencereleri, payandalar ve uçan payandalar ----
  const Ar = Y.alt(0.66, 0, PI / 2); Ar.cephe = true;
  const Nr = Y.alt(0.36, 0, PI / 2); Nr.cephe = true;
  const bay = [0.33, 0.07];
  for (const z of bay) {
    sivriPencere(Ar, S, { x: -z, y: Z + 0.1, w: 0.085, h: 0.28 });
    sivriPencere(Nr, S, { x: -z, y: Z + 0.7, w: 0.12, h: 0.22, sut: k.lod ? 1 : 2 });
  }
  sivriPencere(Nr, S, { x: 0.68, y: Z + 0.7, w: 0.1, h: 0.22 }); // transept arkası nef penceresi
  for (const z of [0.46, 0.2, -0.06]) {
    ayak(Y, S, { x: 0.745, z, y: Z, w: 0.085, h: 0.66 });
    ucanPayanda(Y, S, { xA: 0.745, yA: Z + 0.55, xB: 0.37, yB: Z + 0.82, z });
  }
  // transept sağ alın: lansetler + gül pencere
  const Tr = Y.alt(1.1, -0.42, PI / 2); Tr.cephe = true;
  sivriPencere(Tr, S, { x: 0, y: Z + 0.18, w: 0.2, h: 0.5, sut: 2 });
  for (const s of [-1, 1]) sivriPencere(Tr, S, { x: s * 0.15, y: Z + 0.22, w: 0.06, h: 0.3 });
  gulPencere(Tr, S, { x: 0, y: Z + hT + 0.1, r: 0.07 });
  for (const s of [-1, 1]) ayak(Y, S, { x: 1.11, z: -0.42 + s * 0.2, y: Z, w: 0.08, h: 0.85 });
  // sol taraf payandaları (yalnız siluet; ayrıntı yok)
  if (!k.lod) for (const z of [0.46, 0.2, -0.06]) ayak(Y, S, { x: -0.745, z, y: Z, w: 0.085, h: 0.66 });

  // ---- avlu: sokak lambaları, mezar taşları, çalılık ----
  for (const [x, z] of [[-0.66, 1.1], [0.66, 1.1], [-1.2, 0.55], [1.2, 0.55]]) {
    Y.silindir(0.012, 0.016, 0.36, 5, x, Z, z, 'kutuk', S.kiris);
    Y.kutu(0.05, 0.06, 0.05, x, Z + 0.36, z, 'duz', S.camIsik, { isil: true });
    Y.kutu(0.07, 0.014, 0.07, x, Z + 0.42, z, 'duz', S.demir);
  }
  if (!k.lod) for (let i = 0; i < 7; i++) {
    const x = (i % 2 ? 1 : -1) * (0.85 + (i % 3) * 0.12), z = 0.98 + (i % 3) * 0.1;
    Y.kutu(0.06, 0.1, 0.02, x, Z, z, 'tasBlok', S.tas, { ry: (k.R() - 0.5) * 0.4 });
    Y.prizma([[-0.03, 0.1], [0.03, 0.1], [0, 0.13]], -0.01, 0.01, 'z', x, Z, z, 'tasBlok', S.tas);
  }
  void blok;
}

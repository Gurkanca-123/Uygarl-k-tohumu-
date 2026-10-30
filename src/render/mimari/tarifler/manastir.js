// Orta Çağ Manastırı (3×3, bilgi): romanesk kilise (nef + apsis + çan kulesi), revaklı avlu (kloster), yurt/yemekhane kanatları, bostan, alçak duvar.
// Üç varyant: 0 klasik (yan çan kulesi, kuyulu avlu) · 1 ön kuleli kilise, çeşmeli avlu, bağ sıraları · 2 dağ manastırı (yüksek teras, yuvarlak çan kulesi, kovan/zeytin).
// Kapı/ön +z; kilise solda (x−), avlu sağda. Yalnız +z/+x yüzleri ayrıntılı.
import { Yerel } from '../geometri.js';
import { catiBesik } from '../cati.js';
import { kanat } from '../kanat.js';
import { kapi, pencere } from '../parcalar.js';
import { kuleGovde, sivriKulah } from '../parcalar_anit.js';
import { yuvarlakKule, surParca } from '../parcalar_kale.js';
import { kuyu, cesme, fici, saman, bostan, agac, kovan, revak } from '../parcalar_avlu.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;

function rahip(Y, x, z, y, ry = 0) {
  Y.silindir(0.016, 0.034, 0.075, 7, x, y, z, 'kumas', 0x5a4030, { ry });
  Y.kure(0.02, x, y + 0.092, z, 'duz', 0xe0b890);
  Y.silindir(0.024, 0.024, 0.01, 7, x, y + 0.075, z, 'kumas', 0x4a3424);
}
function bag(Y, x, z, y, w, d, sira = 3) { // üzüm asmaları: direkli sıralar
  const R = Y.k.R;
  for (let i = 0; i < sira; i++) {
    const zz = z - d / 2 + (d * (i + 0.5)) / sira;
    Y.kutu(w, 0.01, 0.01, x, y + 0.09, zz, 'kutuk', 0x5a4030);
    for (const px of [-0.5, 0.5]) Y.silindir(0.008, 0.01, 0.1, 5, x + px * w, y, zz, 'kutuk', 0x5a4030);
    if (!Y.k.lod) for (let j = 0; j < Math.round(w / 0.05); j++) Y.kure(0.022, x - w / 2 + 0.03 + j * 0.05, y + 0.05 + R() * 0.03, zz, 'duz', j % 5 === 0 ? 0x6a3a5a : 0x5a9a3a);
    else Y.kutu(w * 0.95, 0.05, 0.03, x, y + 0.04, zz, 'duz', 0x5a9a3a);
  }
}
// Romanesk kilise: nef kutusu + beşik çatı (mahya z boyunca) + apsis + ön alın, yuvarlak kemerli pencereler (sağ yüz) ve kapı.
function kilise(Y, S, k, o) {
  const { x, zOn, zArka, w = 0.62, h = 0.6, y } = o;
  const len = zOn - zArka, zc = (zOn + zArka) / 2;
  Y.kutu(w, h, len, x, y, zc, 'tasBlok', S.tasKrem);
  Y.kutu(w + 0.04, 0.05, len + 0.04, x, y, zc, 'tasBlok', S.tas); // kaide
  Y.silindir(w / 2, w / 2, h, 10, x, y, zArka, 'tasBlok', S.tasKrem);
  Y.silindir(0, w / 2 + 0.05, 0.3, 10, x, y + h, zArka, 'arduvaz', S.arduvaz[1], { yumusak: false });
  const nefR = Y.alt(x, zc, PI / 2);
  catiBesik(nefR, { x0: 0, z0: 0, w: len, d: w, y: y + h, H: 0.32, oh: 0.045, rake: 0.02, kal: 0.028, kivrim: 0, renk: S.arduvaz, doku: 'arduvaz', kabukRenk: 0x3a3f4a, alin: false, th: 0.011 });
  // ön alın
  Y.prizma([[x - w / 2, y + h], [x + w / 2, y + h], [x, y + h + 0.3]], zOn - 0.03, zOn + 0.02, 'z', 0, 0, 0, 'tasBlok', S.tasKrem);
  const F = Y.alt(x, zOn + 0.02, 0, 0); F.cephe = true;
  kapi(F, S, { x: 0, w: 0.17, h: 0.3 });
  Y.silindir(0.045, 0.045, 0.014, 10, x, y + h * 0.82, zOn + 0.02, 'duz', 0xffc070, { rx: PI / 2, isil: true });
  Y.silindir(0.062, 0.062, 0.016, 10, x, y + h * 0.82 - 0.0, zOn + 0.012, 'tasBlok', S.tas, { rx: PI / 2 });
  Y.kutu(0.008, 0.07, 0.008, x, y + h + 0.3, zOn, 'duz', S.altin); Y.kutu(0.04, 0.008, 0.008, x, y + h + 0.355, zOn, 'duz', S.altin); // haç
  const Sx = Y.alt(x + w / 2, zc, PI / 2); Sx.cephe = true;
  const nB = Math.floor(len / 0.34);
  for (let i = 0; i < nB; i++) {
    const zz = zOn - 0.3 - i * 0.3;
    pencere(Sx, S, { x: -(zz - zc), y: y + h * 0.4, w: 0.06, h: 0.2, tip: 'kemer', panjur: null, isikli: i % 3 !== 1 });
  }
  for (let i = 0; i < nB && !Y.k.lod; i++) { // payandalar
    const zz = zOn - 0.15 - i * 0.3;
    Y.kutu(0.05, h * 0.9, 0.05, x + w / 2 + 0.01, y, zz, 'tasBlok', S.tasAcik);
  }
}

export function manastir(k, c, vr = 0) {
  const S = c.stil;
  const Z = k.kaide(3, 'tas');
  const Y = new Yerel(k, 0, 0, 0, 0);
  const s = c.s;
  const siva = S.siva[(vr + 1) % S.siva.length];
  const R = k.R;
  const wallH = 0.2;

  let zOn = 0.55, zArka = -0.9, kx = -0.88, tabanY = Z;
  if (vr === 2) { tabanY = Z + 0.16; } // yüksek teras
  const yz = tabanY;

  if (vr === 2) { // teras: taş podyum + merdiven
    Y.kutu(1.62, 0.16, 2.0, -0.66, Z, -0.2, 'tasBlok', S.tas);
    Y.kutu(1.66, 0.03, 2.04, -0.66, Z + 0.16, -0.2, 'tasBlok', S.tasAcik);
    for (let i = 0; i < 5; i++) Y.kutu(0.34, 0.032, 0.07, -0.88, Z + i * 0.032, 0.85 + (4 - i) * 0.07, 'tasBlok', i % 2 ? S.tas : S.tasAcik);
  }
  if (vr === 1) { zOn = 0.45; }

  kilise(Y, S, k, { x: kx, zOn, zArka, y: yz, h: 0.6 * s });

  // ---- çan kulesi ----
  if (vr === 0) {
    const g = kuleGovde(Y, S, { x: -0.36, z: 0.34, y: yz, w: 0.34, h: 1.1 * s, kule: 'piramit', pencereler: [0.28, 0.55] });
    sivriKulah(Y, S, { x: -0.36, z: 0.34, y: g.tepe, r: 0.24, h: 0.6, seg: 4 });
  } else if (vr === 1) {
    const g = kuleGovde(Y, S, { x: kx, z: 0.28, y: yz, w: 0.36, h: 1.2 * s, kule: 'piramit', pencereler: [0.2, 0.5] });
    sivriKulah(Y, S, { x: kx, z: 0.28, y: g.tepe, r: 0.26, h: 0.7, seg: 8 });
  } else {
    const t = yuvarlakKule(Y, S, { x: -0.3, z: 0.3, y: yz, r: 0.14, h: 1.0 * s, seg: 10, uc: 'kulah', kulahH: 0.46 });
    void t;
  }

  // ---- kloster (revaklı avlu) + kanatlar ----
  const gx0 = -0.25, gx1 = 0.85, gz0 = -0.8, gz1 = 0.12;
  // revaklar arka ve sol yanda (yapılara yaslı, kamera iç yüzü görür); ön ve sağ taraf alçak çit/duvar: avlu görünür kalır
  revak(Y, S, { x0: gx0, z0: gz0 + 0.0, x1: gx1, z1: gz0 + 0.0, y: Z, h: 0.18, adet: 6 });
  revak(Y, S, { x0: gx0, z0: gz1, x1: gx0, z1: gz0, y: Z, h: 0.18, adet: 4 });
  for (const [x0, z0, x1, z1] of [[gx0, gz1, gx1, gz1], [gx1, gz1, gx1, gz0]]) {
    surParca(Y, S, { x0, z0, x1, z1, y: Z, h: 0.07, t: 0.07, mazgal: false, ok: false });
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
    Y.kutu(Math.abs(dx) + 0.03, 0.07, Math.abs(dz) + 0.03, (x0 + x1) / 2, Z + 0.07, (z0 + z1) / 2, 'duz', 0x4f8a3a, { arka: true });
    void L;
  }
  // arka kanat (yurt): mahya x boyunca
  kanat(Y, S, { Z, w: 1.25, d: 0.34, h1: 0.16, h2: 0.17 * s, H: 0.22 * s, cx: 0.32, cz: -1.0, cikma: [], renk: S.kiremit, doku: S.catiDoku, siva, desen: 'ince',
    yuz: { 'z+': { zemin: [{ x: -0.35, w: 0.06, h: 0.08 }, { x: 0.0, w: 0.06, h: 0.08 }, { x: 0.35, w: 0.06, h: 0.08 }], ust: [{ x: -0.4, w: 0.07 }, { x: -0.13, w: 0.07, tip: 'cift' }, { x: 0.15, w: 0.07 }, { x: 0.42, w: 0.07 }] }, 'x+': { ust: [{ x: 0, w: 0.07 }] } },
    baca: [{ x: 0.3, h: 0.16 }] });
  // sağ kanat (yemekhane): mahya z boyunca
  kanat(Y, S, { Z, w: 0.95, d: 0.3, h1: 0.16, h2: 0.16 * s, H: 0.22 * s, cx: 1.05, cz: -0.4, ry: -PI / 2, cikma: [], renk: S.kiremit, doku: S.catiDoku, siva, desen: 'carpraz',
    yuz: { 'x+': { zemin: [], ust: [{ x: 0, w: 0.07 }], alinPencere: true }, 'z-': { zemin: [{ x: -0.25, w: 0.06, h: 0.08 }, { x: 0.05, w: 0.06, h: 0.08 }, { x: 0.3, w: 0.06, h: 0.08 }], ust: [{ x: -0.28, w: 0.07 }, { x: 0.0, w: 0.07, tip: 'cift' }, { x: 0.28, w: 0.07 }] } },
    baca: [{ x: -0.1, h: 0.15 }] });

  // ---- avlu içi ----
  if (vr === 1) cesme(Y, S, 0.3, -0.3, Z); else kuyu(Y, S, 0.3, -0.32, Z);
  for (const [px, pz] of [[0.0, -0.1], [0.62, -0.55]]) agac(Y, px, pz, Z, 'selvi', 0.9);
  rahip(Y, 0.1, -0.2, Z, 0.4); rahip(Y, 0.55, -0.1, Z, -0.8);
  if (vr !== 2) rahip(Y, -0.05, 0.6, Z, 0.3);

  // ---- bostan / bağ / kovan ----
  if (vr === 0) { bostan(Y, S, 0.5, 0.78, Z, 0.7, 0.4, 4); bostan(Y, S, -0.35, 0.95, Z, 0.4, 0.3, 3); }
  else if (vr === 1) { bag(Y, 0.5, 0.78, Z, 0.8, 0.44, 4); bostan(Y, S, -0.28, 0.95, Z, 0.4, 0.3, 3); agac(Y, 1.1, 0.5, Z, 'mese', 1); }
  else { kovan(Y, 0.4, 0.82, Z); kovan(Y, 0.4, 0.98, Z); agac(Y, 0.95, 0.85, Z, 'zeytin', 1.1); agac(Y, 1.1, 0.6, Z, 'zeytin', 1.0); agac(Y, 0.7, 1.05, Z, 'zeytin', 0.9); bostan(Y, S, 0.0, 1.0, Z, 0.5, 0.3, 3); }
  fici(Y, -0.12, 0.75, Z); saman(Y, 0.95, 0.35, Z, 0.4);
  // ---- alçak çevre duvarı (önde, kilise ekseninde kapı boşluğu) ----
  const gy = Z;
  surParca(Y, S, { x0: -1.3, z0: 1.28, x1: kx - 0.2, z1: 1.28, y: gy, h: wallH, t: 0.1, mazgal: false, ok: false });
  surParca(Y, S, { x0: kx + 0.2, z0: 1.28, x1: 1.3, z1: 1.28, y: gy, h: wallH, t: 0.1, mazgal: false, ok: false });
  surParca(Y, S, { x0: 1.3, z0: 1.28, x1: 1.3, z1: -1.2, y: gy, h: wallH, t: 0.1, mazgal: false, ok: false });
  for (const sx of [-1, 1]) { // kapı direkleri + fener
    Y.kutu(0.07, 0.3, 0.07, kx + sx * 0.2, gy, 1.28, 'tasBlok', S.tasAcik);
    Y.koni(0.06, 0.07, 4, kx + sx * 0.2, gy + 0.3, 1.28, 'arduvaz', S.arduvazUst, { ry: PI / 4 });
  }
  if (c.sv >= 2) { Y.silindir(0.008, 0.01, 0.26, 5, kx + 0.28, gy, 1.12, 'kutuk', S.kiris); Y.kutu(0.045, 0.05, 0.045, kx + 0.28, gy + 0.26, 1.12, 'duz', S.camIsik, { isil: true }); }
  void R;
}

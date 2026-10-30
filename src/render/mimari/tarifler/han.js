// Orta Çağ Hanı (2×2, kamu: yolcular sikke/haber getirir). Üç varyant: 0 avlulu yol hanı (galerili ana bina + ahır kanadı) ·
// 1 köşe hanı (L plan, yuvarlak merdiven kulesi, arabalık geçidi) · 2 kervansaray (taş duvarlı avlu, büyük kemerli kapı, kubbeli odalar).
// Kapı/ön +z. Ortak: kanat.js, parcalar_han.js, parcalar_avlu.js, parcalar_kale.js, parcalar_anit.js.
import { Yerel } from '../geometri.js';
import { kanat, yuzCercevesi } from '../kanat.js';
import { galeri, tabelaDirek, gecit, yalak, baglamaKirisi, kucukKubbe } from '../parcalar_han.js';
import { kuyu, fici, saman, agac } from '../parcalar_avlu.js';
import { arabaKasa, cuvalYigini } from '../parcalar_su.js';
import { yuvarlakKule, surParca } from '../parcalar_kale.js';
import { portal } from '../parcalar_anit.js';
import { pencere } from '../parcalar.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;

export function han(k, c, vr = 0) {
  const S = c.stil;
  const Z = k.kaide(2, 'tas');
  const Y = new Yerel(k, 0, 0, 0, 0);
  const s = c.s;
  const siva = S.siva[(vr + c.sv + 1) % S.siva.length];
  const sv2 = c.sv >= 2, sv3 = c.sv >= 3;

  if (vr === 0) {
    // AVLULU YOL HANI: arka ana bina + öne bakan ahşap galeri; sağda ahır/samanlık kanadı
    const ana = kanat(Y, S, { Z, w: 1.3, d: 0.46, h1: 0.2, h2: 0.23 * s, H: 0.27 * s, cx: -0.05, cz: -0.5, cikma: [], desen: 'carpraz', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: {
        'z+': { kapi: { x: -0.4, w: 0.12, h: 0.19 }, zemin: [{ x: -0.13, w: 0.07, h: 0.09 }, { x: 0.13, w: 0.07, h: 0.09 }, { x: 0.38, w: 0.07, h: 0.09 }], ust: [{ x: -0.4, w: 0.085 }, { x: -0.12, w: 0.085, tip: 'cift' }, { x: 0.16, w: 0.085 }, { x: 0.42, w: 0.085, panjur: 'kapali' }] },
        'x+': { zemin: [{ x: 0, w: 0.07, h: 0.09 }], ust: [{ x: 0, w: 0.085 }], alinPencere: true },
      }, dorm: [{ x: 0.25, z: 0.3 }], baca: [{ x: -0.4, h: 0.17 }, { x: 0.38, h: 0.17 }] });
    const U = yuzCercevesi(ana.W, 'z+', 1.3, 0.46, 0, ana.yU, 0); U.cephe = false;
    galeri(U, S, { x0: -0.58, x1: 0.58, y: 0.0, y0: Z - ana.yU, derin: 0.14, direk: 5 });
    // ahır kanadı (mahya z boyunca): zemin geniş kapılar, üst samanlık
    kanat(Y, S, { Z, w: 0.82, d: 0.34, h1: 0.19, h2: 0.14 * s, H: 0.2 * s, cx: 0.8, cz: 0.12, ry: -PI / 2, cikma: [], desen: 'ince', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z-': { zemin: [{ x: -0.2, w: 0.1, h: 0.1 }, { x: 0.22, w: 0.1, h: 0.1 }], ust: [{ x: 0.0, w: 0.09, panjur: 'kapali' }] }, 'x+': { ust: [{ x: 0, w: 0.08 }] } } });
    kuyu(Y, S, -0.3, 0.2, Z); yalak(Y, S, 0.35, 0.58, Z, 0.4); yalak(Y, S, 0.1, 0.62, Z, 0.4);
    baglamaKirisi(Y, S, 0.38, 0.4, Z, 0.4); arabaKasa(Y, S, -0.05, 0.62, Z, 0.6); fici(Y, -0.55, 0.45, Z); fici(Y, -0.65, 0.35, Z, 0.9); saman(Y, 0.55, 0.0, Z, 0.5);
    tabelaDirek(Y, S, -0.78, 0.72, Z, 0.52, 0.0);
  } else if (vr === 1) {
    // KÖŞE HANI: arka kanat + sağ kanat (L), köşede yuvarlak merdiven kulesi, sağ kanat alında kemerli arabalık geçidi
    kanat(Y, S, { Z, w: 1.1, d: 0.44, h1: 0.2, h2: 0.24 * s, H: 0.27 * s, cx: -0.15, cz: -0.5, cikma: ['z+', 'x+'], desen: 'x', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z+': { kapi: { x: -0.3, w: 0.12, h: 0.19 }, tente: true, zemin: [{ x: 0.1, w: 0.07, h: 0.09 }, { x: 0.32, w: 0.07, h: 0.09 }], ust: [{ x: -0.3, w: 0.085, saksi: true }, { x: -0.05, w: 0.085, tip: 'cift' }, { x: 0.22, w: 0.085 }] } },
      dorm: [{ x: 0.0, z: 0.3 }], baca: [{ x: -0.35, h: 0.17 }] });
    const B = kanat(Y, S, { Z, w: 0.98, d: 0.44, h1: 0.2, h2: 0.24 * s, H: 0.28 * s, cx: 0.55, cz: 0.0, ry: -PI / 2, cikma: ['x+'], desen: 'v', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'x+': { ust: [{ x: -0.1, w: 0.085, saksi: true }, { x: 0.12, w: 0.085 }], alinPencere: true }, 'z-': { zemin: [{ x: -0.3, w: 0.07, h: 0.09 }, { x: 0.3, w: 0.07, h: 0.09 }], ust: [{ x: -0.3, w: 0.085 }, { x: 0.0, w: 0.085, tip: 'cift' }, { x: 0.3, w: 0.085 }] } },
      baca: [{ x: 0.2, h: 0.16 }] });
    const G = yuzCercevesi(B.W, 'x+', 0.44, 0.98, 0, Z, 0);
    gecit(G, S, { x: 0, w: 0.26, h: 0.3 });
    yuvarlakKule(Y, S, { x: 0.86, z: 0.5, y: Z, r: 0.11, h: 0.78 * s, seg: 9, uc: 'kulah', kulahH: 0.36, pencere: true });
    tabelaDirek(Y, S, 0.62, 0.78, Z, 0.5, PI / 2 - 0.4);
    kuyu(Y, S, -0.5, 0.28, Z); yalak(Y, S, -0.1, 0.55, Z, 0.2); arabaKasa(Y, S, 0.2, 0.6, Z, 0.9); fici(Y, -0.7, 0.55, Z); saman(Y, -0.55, 0.62, Z, 0.4);
    baglamaKirisi(Y, S, -0.3, 0.72, Z, 0.0);
  } else {
    // KERVANSARAY: taş duvarlı avlu, ön ortada yüksek kemerli kapı kütlesi, arka ve yan kanatlar düz damlı + kubbeli odalar, avluda kuyu
    const a = 0.74, hw = 0.34;
    surParca(Y, S, { x0: -a, z0: a, x1: -0.26, z1: a, y: Z, h: hw, t: 0.1, mazgal: false, ok: false });
    surParca(Y, S, { x0: 0.26, z0: a, x1: a, z1: a, y: Z, h: hw, t: 0.1, mazgal: false, ok: false });
    surParca(Y, S, { x0: a, z0: a, x1: a, z1: -a, y: Z, h: hw, t: 0.1, mazgal: false, ok: false });
    surParca(Y, S, { x0: a, z0: -a, x1: -a, z1: -a, y: Z, h: hw, t: 0.1, mazgal: false, ok: false });
    surParca(Y, S, { x0: -a, z0: -a, x1: -a, z1: a, y: Z, h: hw, t: 0.1, mazgal: false, ok: false });
    // kapı kütlesi
    const T = Y.alt(0, a, 0); T.cephe = true;
    T.kutu(0.64, 0.62 * s, 0.26, 0, Z, 0, 'tasBlok', S.tasKrem);
    T.kutu(0.7, 0.04, 0.3, 0, Z + 0.62 * s, 0, 'tasBlok', S.tasAcik);
    portal(Y.alt(0, a + 0.13, 0), S, { x: 0, w: 0.34, h: 0.46, kademe: 3, y: Z });
    for (let i = 0; i < 5; i++) T.kutu(0.07, 0.05, 0.05, -0.28 + i * 0.14, Z + 0.66 * s, 0.1, 'tasBlok', S.tasAcik);
    pencere(Y.alt(0, a + 0.13, 0), S, { x: -0.2, y: Z + 0.5 * s, w: 0.06, h: 0.09, tip: 'kemer', panjur: null, isikli: true });
    pencere(Y.alt(0, a + 0.13, 0), S, { x: 0.2, y: Z + 0.5 * s, w: 0.06, h: 0.09, tip: 'kemer', panjur: null, isikli: true });
    // arka kanat (düz dam) + yan kanat; üstlerinde küçük kubbeler
    const oda = (cx, cz, w, d, rot) => {
      const O = Y.alt(cx, cz, rot);
      O.kutu(w, 0.3 * s, d, 0, Z, 0, 'tasBlok', S.tasKrem);
      O.kutu(w + 0.04, 0.03, d + 0.04, 0, Z + 0.3 * s, 0, 'tasBlok', S.tasAcik);
      const n = Math.max(1, Math.round(w / 0.3));
      for (let i = 0; i < n; i++) {
        const px = -w / 2 + (w * (i + 0.5)) / n;
        kucukKubbe(O, S, px, 0, Z + 0.33 * s, Math.min(0.12, w / n * 0.38), i % 2 ? 0x8a9aa8 : 0x9aa8b4);
        const F = O.alt(px, d / 2, 0); F.cephe = true;
        pencere(F, S, { x: 0, y: Z + 0.1 * s, w: 0.06, h: 0.12, tip: 'kemer', panjur: null, isikli: i % 2 === 0 });
      }
    };
    oda(0.0, -0.56, 1.3, 0.3, 0);
    oda(0.56, 0.0, 0.9, 0.3, PI / 2);
    kuyu(Y, S, -0.15, 0.1, Z);
    arabaKasa(Y, S, -0.4, 0.4, Z, 0.5); cuvalYigini(Y, S, -0.55, -0.35, Z, 0.3); fici(Y, -0.55, 0.0, Z); yalak(Y, S, 0.3, 0.45, Z, 0.0);
    agac(Y, -0.6, 0.55, Z, 'zeytin', 1.0);
    tabelaDirek(Y, S, 0.38, a + 0.08, Z, 0.5, 0.0);
  }
  if (sv2) { Y.silindir(0.008, 0.01, 0.26, 5, -0.82, Z, 0.9, 'kutuk', S.kiris); Y.kutu(0.045, 0.05, 0.045, -0.82, Z + 0.26, 0.9, 'duz', S.camIsik, { isil: true }); }
  if (sv3) k.bayrak(0.85, -0.85, Z, 0.5, 0xb03a2e);
}

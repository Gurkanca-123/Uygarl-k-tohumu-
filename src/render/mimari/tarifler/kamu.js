// Orta Çağ kamu yapıları: Lonca Binası ve Darüşşifa (2×2). Her biri 3 varyant. Ortak: kanat.js, parcalar_lonca.js, parcalar_avlu.js, parcalar_han.js, parcalar_kale.js.
import { Yerel, kemerProfil } from '../geometri.js';
import { kanat, yuzCercevesi } from '../kanat.js';
import { catiBesik } from '../cati.js';
import { kademeliAlin, kemerSirasi, saatKulesi, flama, sifaHaci } from '../parcalar_lonca.js';
import { kuyu, cesme, bostan, agac, fici, revak } from '../parcalar_avlu.js';
import { yuvarlakKule } from '../parcalar_kale.js';
import { kucukKubbe, tabelaDirek } from '../parcalar_han.js';
import { portal } from '../parcalar_anit.js';
import { pencere } from '../parcalar.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;

// ===================== LONCA BİNASI =====================
export function loncaBinasi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const siva = S.siva[(vr + 2) % S.siva.length];
  if (vr === 0) {
    // FLAMAN KADEMELİ ALINLIKLI LONCA: dar yüksek cephe +z'de, mahya z boyunca
    const cz = -0.05, w = 1.25, d = 0.8;
    const a = kanat(Y, S, { Z, w, d, h1: 0.26, h2: 0.26 * s, H: 0.3 * s, cx: 0.0, cz, ry: -PI / 2, cikma: ['x+'], desen: 'ince', alinKiris: false, renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'x+': { kapi: { x: 0, w: 0.16, h: 0.24 }, zemin: [{ x: -0.26, w: 0.08, h: 0.12, tip: 'kemer' }, { x: 0.26, w: 0.08, h: 0.12, tip: 'kemer' }], ust: [{ x: -0.22, w: 0.1 }, { x: 0.0, w: 0.1, tip: 'cift' }, { x: 0.22, w: 0.1 }] },
        'z-': { zemin: [{ x: -0.3, w: 0.08, h: 0.12, tip: 'kemer' }, { x: 0.0, w: 0.08, h: 0.12, tip: 'kemer' }, { x: 0.3, w: 0.08, h: 0.12, tip: 'kemer' }], ust: [{ x: -0.3, w: 0.1 }, { x: 0.0, w: 0.1 }, { x: 0.3, w: 0.1 }] } }, baca: [{ x: -0.2, h: 0.16 }] });
    const zf = cz + w / 2 + 0.048;
    const G = Y.alt(0, zf + 0.02, 0); G.cephe = true;
    kademeliAlin(G, S, { x: 0, y: a.y2 - 0.02, w: d + 0.04, adim: 4, hs: 0.082 * s });
    pencere(G, S, { x: 0, y: a.y2 + 0.04, w: 0.09, h: 0.13, tip: 'kemer', panjur: null, isikli: true });
    for (const sx of [-1, 1]) pencere(G, S, { x: sx * 0.2, y: a.y2 + 0.045, w: 0.06, h: 0.09, tip: 'kemer', panjur: null, isikli: true });
    pencere(G, S, { x: 0, y: a.y2 + 0.2, w: 0.045, h: 0.07, tip: 'kemer', panjur: null, isikli: true });
    const F = Y.alt(0, zf, 0); F.cephe = true;
    flama(F, S, -0.32, a.yU + 0.05, 0xb03a2e); flama(F, S, 0.32, a.yU + 0.05, 0x2f5f8a);
    tabelaDirek(Y, S, 0.5, zf + 0.12, Z, 0.46, 0.0);
    kuyu(Y, S, -0.5, 0.82, Z); fici(Y, 0.0, 0.88, Z, 0.9);
  } else if (vr === 1) {
    // KEMERLİ ÇARŞI KATLI LONCA: altı açık kemerli, üstü kirişli salon; mahya üstünde saat kulesi
    const cz = -0.1, w = 1.4, d = 0.7;
    kemerSirasi(Y.alt(0, cz + d / 2 + 0.0, 0), S, { x0: -w / 2 + 0.02, x1: w / 2 - 0.02, y: Z, h: 0.24, adet: 6 });
    const R = kanat(Y, S, { Z: Z + 0.25, w, d, h1: 0.04, h2: 0.27 * s, H: 0.3 * s, cx: 0.0, cz, cikma: ['z+', 'x+'], desen: 'carpraz', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z+': { ust: [{ x: -0.5, w: 0.1 }, { x: -0.25, w: 0.1, tip: 'cift' }, { x: 0.0, w: 0.1 }, { x: 0.25, w: 0.1, tip: 'cift' }, { x: 0.5, w: 0.1 }] }, 'x+': { ust: [{ x: -0.15, w: 0.09 }, { x: 0.15, w: 0.09 }], alinPencere: true } }, baca: [{ x: 0.45, h: 0.16 }] });
    // yan (x+) kemerli çarşı
    const Sx = Y.alt(w / 2 - 0.0, cz, PI / 2); Sx.cephe = true;
    kemerSirasi(Sx, S, { x0: -d / 2 + 0.02, x1: d / 2 - 0.02, y: Z, h: 0.24, adet: 3 });
    saatKulesi(Y, S, { x: -0.2, z: cz, y: R.cati.yR - 0.04, w: 0.2, h: 0.24 });
    Y.kutu(0.3, 0.04, 0.34, 0.0, Z, cz + d / 2 + 0.12, 'tasBlok', S.tas); // taş sahanlık
    kuyu(Y, S, -0.55, 0.78, Z); tabelaDirek(Y, S, 0.6, 0.75, Z, 0.46, 0.0);
  } else {
    // L PLANLI LONCA + KÖŞE KULESİ: arka kanat + sağ kanat, köşede yuvarlak kule (sancaklı), ortada küçük avlu
    kanat(Y, S, { Z, w: 1.3, d: 0.5, h1: 0.22, h2: 0.25 * s, H: 0.28 * s, cx: -0.1, cz: -0.55, cikma: ['z+'], desen: 'v', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z+': { kapi: { x: -0.3, w: 0.13, h: 0.2 }, tente: true, zemin: [{ x: 0.0, w: 0.08, h: 0.1 }, { x: 0.3, w: 0.08, h: 0.1 }], ust: [{ x: -0.3, w: 0.09 }, { x: -0.05, w: 0.09, tip: 'cift' }, { x: 0.25, w: 0.09 }] } }, dorm: [{ x: 0.25, z: 0.3 }], baca: [{ x: -0.45, h: 0.16 }] });
    kanat(Y, S, { Z, w: 0.95, d: 0.5, h1: 0.22, h2: 0.25 * s, H: 0.28 * s, cx: 0.65, cz: 0.05, ry: -PI / 2, cikma: ['x+'], desen: 'carpraz', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'x+': { zemin: [{ x: 0.0, w: 0.09, h: 0.12, tip: 'kemer' }], ust: [{ x: -0.12, w: 0.09 }, { x: 0.12, w: 0.09 }], alinPencere: true }, 'z-': { zemin: [{ x: -0.25, w: 0.08, h: 0.1 }, { x: 0.05, w: 0.08, h: 0.1 }, { x: 0.3, w: 0.08, h: 0.1 }], ust: [{ x: -0.25, w: 0.09 }, { x: 0.05, w: 0.09, tip: 'cift' }, { x: 0.3, w: 0.09 }] } }, baca: [{ x: 0.0, h: 0.16 }] });
    const t = yuvarlakKule(Y, S, { x: 0.78, z: 0.6, y: Z, r: 0.12, h: 0.85 * s, seg: 9, uc: 'kulah', kulahH: 0.38 });
    Y.silindir(0.006, 0.006, 0.2, 5, 0.78, t - 0.02, 0.6, 'kutuk', S.kiris); Y.kutu(0.12, 0.06, 0.008, 0.85, t + 0.12, 0.6, 'kumas', 0xb03a2e);
    kuyu(Y, S, -0.2, 0.3, Z); fici(Y, -0.55, 0.35, Z); bostan(Y, S, -0.5, 0.78, Z, 0.5, 0.25, 3); tabelaDirek(Y, S, 0.3, 0.8, Z, 0.46, 0.0);
  }
  if (c.sv >= 2) { Y.silindir(0.008, 0.01, 0.26, 5, -0.85, Z, 0.9, 'kutuk', S.kiris); Y.kutu(0.045, 0.05, 0.045, -0.85, Z + 0.26, 0.9, 'duz', S.camIsik, { isil: true }); }
}

// ===================== DARÜŞŞİFA =====================
export function darussifa(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const siva = S.siva[(vr + 1) % S.siva.length];
  const otlar = (x, z, w, d, sira) => bostan(Y, S, x, z, Z, w, d, sira);
  if (vr === 0) {
    // ŞİFA SALONU + ŞAPEL APSİSİ + ŞİFALI OT BAHÇESİ
    const a = kanat(Y, S, { Z, w: 1.0, d: 0.52, h1: 0.22, h2: 0.22 * s, H: 0.26 * s, cx: -0.1, cz: -0.35, cikma: [], desen: 'carpraz', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z+': { kapi: { x: -0.25, w: 0.13, h: 0.2 }, tente: true, zemin: [{ x: 0.05, w: 0.08, h: 0.12, tip: 'kemer' }, { x: 0.3, w: 0.08, h: 0.12, tip: 'kemer' }], ust: [{ x: -0.3, w: 0.09 }, { x: -0.1, w: 0.09 }, { x: 0.1, w: 0.09 }, { x: 0.3, w: 0.09 }] }, 'x+': { zemin: [{ x: 0, w: 0.08, h: 0.12, tip: 'kemer' }], ust: [{ x: 0, w: 0.09 }], alinPencere: true } }, dorm: [{ x: -0.1, z: 0.3 }], baca: [{ x: -0.4, h: 0.16 }] });
    // şapel: apsis + küçük alın
    Y.silindir(0.2, 0.2, 0.3, 9, 0.62, Z, -0.35, 'tasBlok', S.tasKrem); Y.silindir(0.0, 0.25, 0.2, 9, 0.62, Z + 0.3, -0.35, 'arduvaz', S.arduvaz[1], { yumusak: false });
    sifaHaci(Y, S, 0.62, Z + 0.52, -0.05);
    pencere(Y.alt(0.62, -0.15, 0), S, { x: 0, y: Z + 0.1, w: 0.06, h: 0.12, tip: 'kemer', panjur: null, isikli: true });
    otlar(-0.45, 0.35, 0.8, 0.5, 4); otlar(0.4, 0.55, 0.5, 0.4, 3); cesme(Y, S, 0.0, 0.2, Z, 0.09);
    // çit + kapı direkleri
    for (const [x0, z0, x1, z1] of [[-0.9, 0.9, 0.9, 0.9], [0.9, 0.9, 0.9, 0.0]]) k.cit(Y.nokta(x0, 0, z0)[0], Y.nokta(x0, 0, z0)[2], Y.nokta(x1, 0, z1)[0], Y.nokta(x1, 0, z1)[2], Z, 0x7a5a3a, 0.09);
    agac(Y, -0.8, 0.0, Z, 'selvi', 0.9); void a;
  } else if (vr === 1) {
    // AVLULU ŞİFAHANE: arka ana kanat + iki yan kanat, revaklı avlu ortasında çeşme
    kanat(Y, S, { Z, w: 1.3, d: 0.4, h1: 0.2, h2: 0.22 * s, H: 0.25 * s, cx: 0.0, cz: -0.62, cikma: [], desen: 'ince', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z+': { kapi: { x: 0, w: 0.14, h: 0.2 }, zemin: [{ x: -0.3, w: 0.08, h: 0.12, tip: 'kemer' }, { x: 0.3, w: 0.08, h: 0.12, tip: 'kemer' }], ust: [{ x: -0.4, w: 0.09 }, { x: -0.15, w: 0.09 }, { x: 0.15, w: 0.09 }, { x: 0.4, w: 0.09 }] } }, baca: [{ x: -0.5, h: 0.16 }] });
    for (const sx of [-1, 1]) kanat(Y, S, { Z, w: 0.8, d: 0.34, h1: 0.2, h2: 0.2 * s, H: 0.22 * s, cx: sx * 0.78, cz: -0.1, ry: -PI / 2, cikma: [], desen: 'carpraz', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'x+': { ust: [{ x: 0, w: 0.08 }], alinPencere: true }, 'z-': sx > 0 ? { zemin: [{ x: -0.2, w: 0.07, h: 0.1 }, { x: 0.2, w: 0.07, h: 0.1 }], ust: [{ x: -0.2, w: 0.08 }, { x: 0.0, w: 0.08, tip: 'cift' }, { x: 0.2, w: 0.08 }] } : {} } });
    revak(Y, S, { x0: -0.55, z0: -0.4, x1: 0.55, z1: -0.4, y: Z, h: 0.16, adet: 5 });
    cesme(Y, S, 0.0, 0.1, Z, 0.13); otlar(-0.45, 0.62, 0.5, 0.3, 3); otlar(0.45, 0.62, 0.5, 0.3, 3); agac(Y, -0.9, 0.7, Z, 'selvi', 0.9); agac(Y, 0.9, 0.7, Z, 'selvi', 0.9);
    sifaHaci(Y, S, 0.0, Z + 0.62 * s, -0.4);
  } else {
    // KUBBELİ DARÜŞŞİFA: ortada sekizgen tamburlu kubbe, yan kanatlar düz damlı küçük kubbeli, ön taç kapı
    Y.silindir(0.34, 0.37, 0.28 * s, 8, 0.0, Z, -0.15, 'kerpic', S.tasKrem ?? 0xd9d1bf);
    Y.silindir(0.37, 0.37, 0.03, 8, 0.0, Z + 0.28 * s, -0.15, 'tasBlok', S.tasAcik);
    Y.silindir(0.27, 0.3, 0.14, 8, 0.0, Z + 0.31 * s, -0.15, 'tasBlok', S.tasKrem);
    kucukKubbe(Y, S, 0.0, -0.15, Z + 0.45 * s, 0.28, 0x7a98a8);
    for (const sx of [-1, 1]) {
      const W = Y.alt(sx * 0.62, -0.15, 0);
      W.kutu(0.36, 0.22, 0.6, 0, Z, 0, 'tasBlok', S.tasKrem); W.kutu(0.4, 0.025, 0.64, 0, Z + 0.22, 0, 'tasBlok', S.tasAcik);
      kucukKubbe(W, S, 0, -0.12, Z + 0.245, 0.12, 0x8a9aa8); kucukKubbe(W, S, 0, 0.12, Z + 0.245, 0.12, 0x9aa8b4);
      const F = W.alt(0, 0.3, 0); F.cephe = true;
      pencere(F, S, { x: -0.08, y: Z + 0.08, w: 0.06, h: 0.1, tip: 'kemer', panjur: null, isikli: true }); pencere(F, S, { x: 0.08, y: Z + 0.08, w: 0.06, h: 0.1, tip: 'kemer', panjur: null, isikli: false });
    }
    Y.kutu(0.36, 0.36 * s, 0.24, 0.0, Z, 0.25, 'tasBlok', S.tasKrem); Y.kutu(0.4, 0.03, 0.28, 0.0, Z + 0.36 * s, 0.25, 'tasBlok', S.tasAcik);
    portal(Y.alt(0, 0.37, 0), S, { x: 0, w: 0.22, h: 0.3, kademe: 2, y: Z });
    sifaHaci(Y, S, 0.0, Z + 0.4 * s, 0.37);
    cesme(Y, S, 0.0, 0.7, Z, 0.1); otlar(-0.55, 0.78, 0.55, 0.28, 3); otlar(0.55, 0.78, 0.55, 0.28, 3); agac(Y, -0.9, 0.3, Z, 'selvi', 0.9);
  }
  if (c.sv >= 2) { Y.silindir(0.008, 0.01, 0.26, 5, -0.85, Z, 0.95, 'kutuk', S.kiris); Y.kutu(0.045, 0.05, 0.045, -0.85, Z + 0.26, 0.95, 'duz', S.camIsik, { isil: true }); }
}

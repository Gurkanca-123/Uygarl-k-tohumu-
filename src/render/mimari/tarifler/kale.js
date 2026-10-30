// Orta Çağ Kalesi (3×3, savunma): mazgallı sur, köşe kuleleri, kapı kulesi, donjon, avluda salon/kuyu. Üç varyant:
// 0 dörtgen şato (dört yuvarlak köşe kulesi + kare donjon) · 1 yuvarlak donjonlu kale · 2 höyük (motte) kalesi: toprak tepe + taş kule + sivri uçlu çit.
// Kapı +z (kamera görür). Sur yönü: ön x artan, sağ z azalan, arka x azalan, sol z artan (dışa bakan taraf sağ).
import { Yerel } from '../geometri.js';
import { kanat } from '../kanat.js';
import { kuyu, fici, saman, hedef } from '../parcalar_avlu.js';
import { surParca, yuvarlakKule, donjon, kaleKapisi, sancak } from '../parcalar_kale.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;

export function kale(k, c, vr = 0) {
  const S = c.stil;
  const Z = k.kaide(3, 'tas');
  const Y = new Yerel(k, 0, 0, 0, 0);
  const s = c.s;
  const siva = S.siva[vr % S.siva.length];
  const a = 1.12, hs = 0.5 * s;

  // ---- sur çemberi (ön duvarda kapı boşluğu) ----
  const duvar = (h = hs) => {
    surParca(Y, S, { x0: -a, z0: a, x1: -0.31, z1: a, y: Z, h });
    surParca(Y, S, { x0: 0.31, z0: a, x1: a, z1: a, y: Z, h });
    surParca(Y, S, { x0: a, z0: a, x1: a, z1: -a, y: Z, h });
    surParca(Y, S, { x0: a, z0: -a, x1: -a, z1: -a, y: Z, h });
    surParca(Y, S, { x0: -a, z0: -a, x1: -a, z1: a, y: Z, h });
  };

  if (vr === 0) {
    duvar();
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) yuvarlakKule(Y, S, { x: sx * a, z: sz * a, y: Z, r: 0.2, h: hs + 0.3, seg: 10, uc: 'kulah', kulahH: 0.4 });
    kaleKapisi(Y, S, { x: 0, z: a, y: Z, w: 0.5, h: 0.62 * s });
    donjon(Y, S, { x: 0.18, z: -0.3, y: Z, w: 0.62, h: 1.05 * s, burc: 'yuvarlak', ic: 'duz' });
    sancak(Y, S, 0.18, -0.3, Z + 1.05 * s + 0.1, 0.32);
    // iç salon (yarı ahşap) arka solda
    kanat(Y, S, { Z, w: 0.62, d: 0.32, h1: 0.14, h2: 0.14 * s, H: 0.2 * s, cx: -0.62, cz: -0.78, yuz: { 'z+': { zemin: [{ x: -0.15, w: 0.06, h: 0.07 }], ust: [{ x: -0.15, w: 0.07 }, { x: 0.08, w: 0.07, tip: 'cift' }] }, 'x+': { ust: [{ x: 0, w: 0.07 }] } }, renk: S.kiremit, doku: S.catiDoku, siva, baca: [{ x: -0.2, h: 0.14 }] });
    kuyu(Y, S, -0.55, 0.3, Z); fici(Y, -0.3, 0.45, Z); fici(Y, -0.2, 0.5, Z, 0.9); saman(Y, 0.7, 0.6, Z, 0.4); hedef(Y, S, 0.6, 0.15, Z);
  } else if (vr === 1) {
    duvar(0.46 * s);
    for (const sx of [-1, 1]) yuvarlakKule(Y, S, { x: sx * a, z: a, y: Z, r: 0.19, h: hs + 0.26, seg: 10, uc: 'kulah', kulahH: 0.36 });
    for (const sx of [-1, 1]) donjon(Y, S, { x: sx * a, z: -a, y: Z, w: 0.36, h: hs + 0.32, burc: 'yok', ic: 'duz' });
    kaleKapisi(Y, S, { x: 0, z: a, y: Z, w: 0.5, h: 0.6 * s });
    // büyük yuvarlak donjon
    const t = yuvarlakKule(Y, S, { x: 0, z: -0.25, y: Z, r: 0.44, h: 1.35 * s, seg: 14, uc: 'kulah', kulahH: 0.55, kulahR: 0.98 });
    sancak(Y, S, 0, -0.25, t, 0.3, 0x2f5f8a);
    for (const [px, pz, ry] of [[0.1, 0.12, 0.2], [-0.2, 0.1, -0.4]]) { Y.kutu(0.05, 0.08, 0.05, px, Z, pz, 'tasBlok', S.tasAcik, { ry }); }
    // sağda ahır/depo (yarı ahşap)
    kanat(Y, S, { Z, w: 0.6, d: 0.34, h1: 0.14, h2: 0.13 * s, H: 0.19 * s, cx: 0.7, cz: 0.58, ry: 0, yuz: { 'z+': { zemin: [{ x: -0.15, w: 0.06, h: 0.07 }, { x: 0.15, w: 0.06, h: 0.07 }], ust: [{ x: 0, w: 0.08 }] }, 'x+': { ust: [{ x: 0, w: 0.07 }] } }, renk: S.kiremit, doku: S.catiDoku, siva });
    kuyu(Y, S, -0.6, 0.45, Z); fici(Y, -0.4, 0.6, Z); saman(Y, -0.75, 0.0, Z, 0.2); saman(Y, -0.62, -0.05, Z, -0.3); hedef(Y, S, 0.4, -0.7, Z);
  } else {
    // HÖYÜK KALESİ: toprak tepe + taş kule + sivri uçlu çit, önde alçak surlu avlu
    const R = k.R;
    Y.silindir(0.55, 1.0, 0.5 * s, 16, 0, Z, -0.25, 'toprak', 0x6e8a4e, { yumusak: true });
    Y.silindir(0.5, 0.56, 0.05, 16, 0, Z + 0.45 * s, -0.25, 'toprak', 0x8a7a4a);
    donjon(Y, S, { x: 0, z: -0.25, y: Z + 0.5 * s, w: 0.52, h: 0.78 * s, burc: 'kare', ic: 'kulah' });
    sancak(Y, S, 0.0, -0.25, Z + 0.5 * s + 0.78 * s + 0.58, 0.28, 0xb03a2e);
    // höyük çevresi: çit (sivri uçlu kazıklar halka)
    for (let i = 0; i < 28; i++) {
      const q = (i / 28) * Math.PI * 2;
      if (Math.sin(q) > 0.55 && Math.abs(Math.cos(q)) < 0.3) continue; // merdiven boşluğu (ön)
      const rr = 0.92 + (R() - 0.5) * 0.03;
      Y.silindir(0.016, 0.02, 0.17 + R() * 0.03, 5, Math.cos(q) * rr, Z + 0.02, -0.25 + Math.sin(q) * rr, 'kutuk', 0x6a4a2c);
      Y.koni(0.02, 0.04, 5, Math.cos(q) * rr, Z + 0.19 + R() * 0.03, -0.25 + Math.sin(q) * rr, 'kutuk', 0x6a4a2c);
    }
    // höyüğe tahta merdiven
    for (let i = 0; i < 8; i++) Y.kutu(0.14, 0.02, 0.07, 0, Z + 0.04 + i * 0.055, 0.5 - i * 0.075, 'tahta', 0x8a6238, { arka: true });
    for (const sx of [-1, 1]) Y.kiris([sx * 0.085, Z + 0.1, 0.52], [sx * 0.085, Z + 0.5, -0.1], 0.012, 0.012, 'kutuk', 0x5a3a22);
    duvar(0.34 * s);
    for (const sx of [-1, 1]) yuvarlakKule(Y, S, { x: sx * a, z: -a, y: Z, r: 0.18, h: hs + 0.15, seg: 9, uc: 'kulah', kulahH: 0.34 });
    kaleKapisi(Y, S, { x: 0, z: a, y: Z, w: 0.46, h: 0.5 * s, kuleR: 0.15 });
    kanat(Y, S, { Z, w: 0.62, d: 0.34, h1: 0.14, h2: 0.14 * s, H: 0.2 * s, cx: 0.66, cz: 0.62, yuz: { 'z+': { zemin: [{ x: -0.15, w: 0.06, h: 0.07 }], ust: [{ x: -0.15, w: 0.07 }, { x: 0.1, w: 0.07, tip: 'cift' }] }, 'x+': { ust: [{ x: 0, w: 0.07 }] } }, renk: S.kiremit, doku: S.catiDoku, siva, baca: [{ x: 0.1, h: 0.14 }] });
    kuyu(Y, S, -0.6, 0.55, Z); fici(Y, -0.4, 0.6, Z); saman(Y, -0.7, 0.8, Z, 0.5); hedef(Y, S, -0.7, 0.2, Z);
  }
  if (c.sv >= 2) for (const [x, z] of [[-0.3, 1.2], [0.3, 1.2]]) { Y.silindir(0.01, 0.013, 0.3, 5, x, Z, z, 'kutuk', S.kiris); Y.kutu(0.045, 0.055, 0.045, x, Z + 0.3, z, 'duz', S.camIsik, { isil: true }); }
}

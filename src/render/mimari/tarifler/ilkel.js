// İlkel çağ yapıları (göçebe + taş devri): Çadır, Avcı Kulübesi, Toplayıcı Barınağı, Oduncu Kampı, Totem, Şifacı Çadırı, Kulübe, Taş Ocağı,
// Balıkçı Sığınağı, Mağara Resmi Yeri. Her biri 3 varyant; deri/kütük/saman/taş/kemik dili. Ortak: parcalar_ilkel.js, parcalar_atolye.js, parcalar_avlu.js.
import * as THREE from 'three';
import { Yerel, kemerProfil } from '../geometri.js';
import { catiBesik } from '../cati.js';
import { tipi, yurt, yuvarlakKulube, sepet, otDemeti, balta, kutukTomruk, boynuz, totemYuzu, agCercevesi, kayaYuzu } from '../parcalar_ilkel.js';
import { deriBarinak, cakmakTasi, ogutmeTasi, atesNokta, dumanNokta, komurYigini } from '../parcalar_atolye.js';
import { agac } from '../parcalar_avlu.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;
const DERI = 0xc9a57a, KUTUK = 0x6b4a2c, KUTUK_A = 0x7a5634, SAMAN = 0xc8a85a;

function atesHalka(Y, x, z, y, r = 0.09, n = 7) {
  for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; Y.kure(0.028, x + Math.cos(a) * r, y + 0.028, z + Math.sin(a) * r, 'moloz', 0x7d7870); }
  Y.koni(0.045, 0.04, 6, x, y, z, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, x, y + 0.045, z, 0.8);
}
const ctx = (k, boyut, kaide = 'toprak') => ({ Z: k.kaide(boyut, kaide), Y: new Yerel(k, 0, 0, 0, 0) });
const kulahHasir = (Y, x, z, y, r, h, renk = SAMAN) => Y.silindir(0.0, r, h, 10, x, y, z, 'saman', renk, { yumusak: false });

// ===================== ÇADIR (göçebe) =====================
export function cadir(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  if (vr === 0) {
    tipi(Y, { x: -0.05, z: -0.05, y: Z, r: 0.3, h: 0.55 * s }); tipi(Y, { x: 0.28, z: 0.2, y: Z, r: 0.16, h: 0.3, renk: 0xb89860, kusak: 0x2f5f8a, kapi: false });
    atesHalka(Y, -0.1, 0.32, Z, 0.07, 6); Y.kutu(0.18, 0.02, 0.1, -0.35, Z + 0.1, 0.25, 'deri', 0x8a6a48, { rx: 0.3 });
  } else if (vr === 1) {
    yurt(Y, { x: 0.0, z: -0.08, y: Z, r: 0.32 }); kutukTomruk(Y, -0.38, 0.28, Z, 0.3, 0.3); kutukTomruk(Y, -0.36, 0.34, Z + 0.06, 0.28, 0.2); sepet(Y, 0.32, 0.3, Z, 1.1);
    dumanNokta(Y, 0.0, Z + 0.12 + 0.32 * 0.72 + 0.04, -0.08, 0.8);
  } else {
    const A = Y.alt(0, -0.05, 0);
    A.prizma([[-0.26, 0], [0.26, 0], [0, 0.34 * s]], -0.22, 0.22, 'x', 0, Z, 0, 'deri', DERI);
    A.kiris([0, Z + 0.34 * s + 0.1, -0.28], [0, Z + 0.34 * s + 0.1, 0.28], 0.024, 0.024, 'kutuk', KUTUK);
    for (const sz of [-1, 1]) A.kiris([-0.28, Z, sz * 0.22], [0, Z + 0.36 * s, sz * 0.22], 0.02, 0.02, 'kutuk', KUTUK_A);
    for (const sz of [-1, 1]) A.kiris([0.28, Z, sz * 0.22], [0, Z + 0.36 * s, sz * 0.22], 0.02, 0.02, 'kutuk', KUTUK_A);
    A.kutu(0.01, 0.2, 0.2, 0.0, Z, 0.23, 'deri', 0x8a6a48);
    for (let i = 0; i < 3; i++) Y.kutu(0.16, 0.09, 0.01, -0.3 + i * 0.1, Z + 0.1, 0.4, 'deri', [0x8a6a48, 0xb89860, 0x6a5a4a][i], { ry: 0.2 * i });
    boynuz(Y, 0, Z + 0.34 * s + 0.12, -0.05, 1.2);
  }
}

// ===================== KULÜBE (taş devri) =====================
export function kulube(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  if (vr === 0) {
    yuvarlakKulube(Y, { x: 0, z: -0.05, y: Z, r: 0.29, h: 0.2 * s, cat: 0.26 * s });
    atesHalka(Y, 0.0, 0.4, Z, 0.06, 6); kutukTomruk(Y, -0.34, 0.3, Z, 0.26, 0.4); sepet(Y, 0.34, 0.3, Z, 1.0, false);
  } else if (vr === 1) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.04, 0.24, 0.04, sx * 0.26, Z, -0.05 + sz * 0.2, 'kutuk', KUTUK);
    Y.kutu(0.5, 0.2, 0.38, 0, Z, -0.05, 'hasir', KUTUK_A);
    catiBesik(Y, { x0: 0, z0: -0.05, w: 0.54, d: 0.4, y: Z + 0.22, H: 0.2 * s, oh: 0.06, rake: 0.05, kal: 0.03, kivrim: 0.02, renk: [0xd0aa58, 0xc8a050, 0xb89040], doku: 'saman', kabukRenk: KUTUK, th: 0.014, alin: false, satirUst: 3, satirAlt: 3 });
    Y.prizma(kemerProfil(0.1, 0.15, 4), 0, 0.012, 'z', 0, Z, 0.15, 'duz', 0x1c1410); boynuz(Y, 0, Z + 0.45 * s, -0.05, 1.0);
    atesHalka(Y, 0.3, 0.38, Z, 0.05, 6);
  } else {
    Y.silindir(0.34, 0.42, 0.14 * s, 10, 0, Z, -0.05, 'toprak', 0x6e8a4e, { yumusak: true });
    Y.silindir(0.2, 0.34, 0.07, 10, 0, Z + 0.14 * s, -0.05, 'toprak', 0x7a9a58, { yumusak: true });
    for (let i = 0; i < 3; i++) Y.kutu(0.14 - i * 0.02, 0.025, 0.16, 0, Z + 0.015 + i * 0.025, 0.42 - i * 0.08, 'tahta', 0x7a5634, { arka: true });
    Y.prizma(kemerProfil(0.14, 0.14, 4), 0, 0.02, 'z', 0, Z, 0.27, 'duz', 0x1c1410);
    for (let i = 0; i < 5; i++) Y.kiris([-0.12 + i * 0.06, Z + 0.2 * s, -0.05], [-0.12 + i * 0.06, Z + 0.32 * s, -0.05], 0.014, 0.014, 'kutuk', KUTUK_A);
    dumanNokta(Y, 0.0, Z + 0.34 * s, -0.05, 0.8); Y.kutu(0.1, 0.05, 0.08, 0.32, Z, 0.3, 'kutuk', KUTUK, { ry: 0.3 });
  }
}

// ===================== AVCI KULÜBESİ (göçebe) =====================
export function avciKulubesi(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  const deriCerceve = (x, z, ry) => { const A = Y.alt(x, z, ry); for (const sx of [-1, 1]) A.kutu(0.02, 0.26, 0.02, sx * 0.13, Z, 0, 'kutuk', KUTUK); A.kutu(0.3, 0.016, 0.016, 0, Z + 0.26, 0, 'kutuk', KUTUK_A); A.kutu(0.2, 0.2, 0.008, 0, Z + 0.05, 0.004, 'deri', 0xb89860); };
  if (vr === 0) {
    deriBarinak(Y, S, { x: 0, z: -0.12, y: Z, w: 0.5, d: 0.4, h: 0.3 * s, ry: 0 }); boynuz(Y, 0.0, Z + 0.3 * s + 0.03, -0.2, 1.4);
    deriCerceve(-0.3, 0.3, 0.3); cakmakTasi(Y, 0.3, 0.3, Z, 4);
    for (let i = 0; i < 3; i++) Y.kiris([0.38 + i * 0.03, Z, 0.0], [0.4 + i * 0.03, Z + 0.3, -0.04], 0.008, 0.008, 'kutuk', KUTUK);
  } else if (vr === 1) {
    tipi(Y, { x: -0.1, z: -0.1, y: Z, r: 0.27, h: 0.46 * s, kusak: 0x4a4038 });
    Y.silindir(0.012, 0.016, 0.42, 6, 0.3, Z, 0.25, 'kutuk', KUTUK); for (let i = 0; i < 3; i++) Y.kure(0.03, 0.3, Z + 0.22 + i * 0.05, 0.25, 'kemik', 0xe8dcc0, { sy: 0.85 });
    Y.kiris([0.15, Z + 0.2, 0.4], [0.45, Z + 0.2, 0.3], 0.01, 0.01, 'kutuk', KUTUK_A); boynuz(Y, 0.3, Z + 0.46, 0.25, 0.9);
  } else {
    yuvarlakKulube(Y, { x: -0.08, z: -0.1, y: Z, r: 0.26, h: 0.18, cat: 0.22 });
    for (const sx of [-1, 1]) Y.kutu(0.02, 0.2, 0.02, 0.15 + sx * 0.16, Z, 0.32, 'kutuk', KUTUK); Y.kutu(0.34, 0.014, 0.014, 0.15, Z + 0.2, 0.32, 'kutuk', KUTUK_A);
    for (let i = 0; i < 4; i++) Y.kutu(0.06, 0.012, 0.03, 0.04 + i * 0.07, Z + 0.17 - (i % 2) * 0.03, 0.32, 'deri', i % 2 ? 0xb86a50 : 0xd8b890);
    for (let i = 0; i < 3; i++) Y.kiris([-0.38 + i * 0.03, Z, 0.25], [-0.34 + i * 0.03, Z + 0.3, 0.2], 0.008, 0.008, 'kutuk', KUTUK);
  }
}

// ===================== TOPLAYICI BARINAĞI (göçebe) =====================
export function toplayiciBarinagi(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  const R = k.R;
  const calilik = (x, z) => { for (let i = 0; i < 3; i++) Y.kure(0.05 + R() * 0.02, x + (i - 1) * 0.06, Z + 0.06 + R() * 0.03, z + (R() - 0.5) * 0.06, 'duz', [0x4f7a3a, 0x5a8a42][i % 2]); for (let i = 0; i < 4; i++) Y.kure(0.012, x + (i - 1.5) * 0.05, Z + 0.09, z + 0.04, 'duz', 0xb03a2e); };
  if (vr === 0) {
    Y.ekle(new THREE.SphereGeometry(0.3, 10, 6, 0, PI * 2, 0, PI / 2), 0, Z, -0.08, 'saman', 0x9a8a50, { yumusak: true, sy: 0.85 });
    Y.prizma(kemerProfil(0.14, 0.15, 4), 0, 0.02, 'z', 0, Z, 0.2, 'duz', 0x1c1410);
    sepet(Y, -0.3, 0.28, Z, 1.2); sepet(Y, -0.18, 0.36, Z, 1.0); sepet(Y, 0.3, 0.3, Z, 1.1); calilik(0.32, -0.2);
  } else if (vr === 1) {
    deriBarinak(Y, S, { x: 0, z: -0.14, y: Z, w: 0.5, d: 0.36, h: 0.26, ry: 0 });
    Y.kiris([-0.22, Z + 0.3, 0.1], [0.22, Z + 0.3, 0.1], 0.012, 0.012, 'kutuk', KUTUK_A);
    for (let i = 0; i < 5; i++) otDemeti(Y, -0.2 + i * 0.1, Z + 0.22, 0.1, [0x7a9a4a, 0xa8854e][i % 2]);
    sepet(Y, -0.3, 0.4, Z, 1.2); sepet(Y, 0.3, 0.4, Z, 1.0); calilik(-0.35, -0.2);
  } else {
    yuvarlakKulube(Y, { x: -0.05, z: -0.1, y: Z, r: 0.25, h: 0.17, cat: 0.2, saman: 0xb09850 });
    ogutmeTasi(Y, S, 0.3, 0.28, Z); sepet(Y, 0.18, 0.38, Z, 1.1); sepet(Y, -0.3, 0.3, Z, 1.0); calilik(0.32, -0.2); otDemeti(Y, -0.35, Z, -0.2);
  }
}

// ===================== ODUNCU KAMPI (göçebe) =====================
export function oduncuKampi(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  const yigin = (x, z, ry = 0, n = 6) => { for (let i = 0; i < n; i++) { const sr = i < 3 ? 0 : i < 5 ? 1 : 2, kk = sr === 0 ? i - 1 : sr === 1 ? i - 3.5 : 0; kutukTomruk(Y, x, z + kk * 0.06, Z + sr * 0.045, 0.26, ry, 0.026); } };
  if (vr === 0) {
    deriBarinak(Y, S, { x: 0.05, z: -0.2, y: Z, w: 0.42, d: 0.3, h: 0.24, ry: 0 });
    Y.silindir(0.06, 0.07, 0.1, 8, -0.25, Z, 0.2, 'kutuk', 0xc9a66a); balta(Y, -0.25, 0.2, Z + 0.1, 0.5);
    yigin(0.12, 0.28, 0.0); Y.kutu(0.2, 0.02, 0.1, 0.0, Z, 0.45, 'toprak', 0xb09868);
  } else if (vr === 1) {
    for (const sx of [-1, 1]) { Y.kiris([sx * 0.22, Z, -0.05], [sx * 0.1, Z + 0.22, 0.0], 0.03, 0.03, 'kutuk', KUTUK); Y.kiris([sx * 0.22, Z, 0.1], [sx * 0.1, Z + 0.22, 0.0], 0.03, 0.03, 'kutuk', KUTUK); }
    kutukTomruk(Y, -0.3, 0.0, Z + 0.2, 0.6, 0.0, 0.04);
    yigin(0.0, 0.35, 0.0, 6); yigin(-0.1, 0.45, 0.0, 3);
    Y.kutu(0.3, 0.02, 0.14, 0.3, Z, -0.25, 'tahta', 0x8a6a44, { rx: -0.15 }); Y.kiris([0.18, Z + 0.03, -0.25], [0.45, Z + 0.07, -0.25], 0.012, 0.012, 'kutuk', KUTUK);
  } else {
    kutukTomruk(Y, -0.35, -0.2, Z, 0.7, 0.2, 0.04); kutukTomruk(Y, -0.3, -0.05, Z, 0.6, -0.1, 0.035); yigin(0.1, 0.3, 0.3);
    yuvarlakKulube(Y, { x: 0.25, z: -0.25, y: Z, r: 0.18, h: 0.14, cat: 0.16 }); balta(Y, -0.1, 0.05, Z, 1.0);
    for (let i = 0; i < 5; i++) Y.kure(0.015 + (i % 2) * 0.01, -0.2 + i * 0.07, Z + 0.015, 0.45 + (i % 2) * 0.03, 'kutuk', 0xc9a66a);
  }
}

// ===================== TOTEM (göçebe) =====================
export function totem(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  const ring = (r, n) => { for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; Y.kure(0.05 + (i % 3) * 0.01, Math.cos(a) * r, Z + 0.04, Math.sin(a) * r, 'moloz', i % 2 ? 0xb4ae9e : 0x9a9486); } };
  if (vr === 0) {
    ring(0.36, 9);
    const boy = [[0xb6402a, 0.2], [0x2f6f9a, 0.2], [0xe2b23a, 0.18]];
    let yy = Z;
    boy.forEach(([renk, h], i) => { totemYuzu(Y, 0, yy, 0, 0.17 - i * 0.012, h * s, renk, 0); yy += h * s; });
    for (const sx of [-1, 1]) { Y.kutu(0.2, 0.05, 0.02, sx * 0.17, Z + 0.46 * s, 0, 'kutuk', 0x3f8a5a, { rz: sx * 0.35 }); }
    Y.kure(0.05, 0, yy + 0.04, 0, 'kemik', 0xf0e8d4); Y.koni(0.025, 0.07, 5, 0, yy + 0.07, 0, 'kutuk', 0x1a1410);
  } else if (vr === 1) {
    ring(0.4, 11);
    Y.kutu(0.1, 0.56 * s, 0.06, 0, Z, 0, 'moloz', 0x9a9486, { ry: 0.2 });
    Y.prizma([[-0.05, 0], [0.05, 0], [0.0, 0.07]], -0.03, 0.03, 'z', 0, Z + 0.56 * s, 0, 'moloz', 0x9a9486, { ry: 0.2 });
    for (const [x, z, ry] of [[0.24, 0.16, 0.3], [-0.24, 0.12, -0.2]]) totemYuzu(Y, x, Z, z, 0.1, 0.22, x > 0 ? 0xb6402a : 0x2f6f9a, ry);
    atesHalka(Y, 0.0, 0.26, Z, 0.05, 5);
  } else {
    for (const [x, h, renk] of [[-0.18, 0.62, 0xb6402a], [0.18, 0.5, 0x2f6f9a]]) { totemYuzu(Y, x, Z, 0, 0.12, h * s * 0.55, renk, 0.2); totemYuzu(Y, x, Z + h * s * 0.55, 0, 0.1, h * s * 0.4, 0xe2b23a, 0.2); Y.koni(0.03, 0.06, 5, x, Z + h * s * 0.95, 0, 'kutuk', 0x1a1410); }
    Y.kiris([-0.18, Z + 0.4, 0.0], [0.18, Z + 0.34, 0.0], 0.008, 0.008, 'duz', 0xb09a70);
    for (let i = 0; i < 5; i++) Y.kutu(0.045, 0.1, 0.006, -0.12 + i * 0.07, Z + 0.28 - Math.abs(i - 2) * 0.01, 0.0, 'kumas', [0xb03a2e, 0xe0b04a, 0x2f5f8a, 0x5a8a4a, 0xf0e8d4][i]);
    ring(0.34, 8);
  }
}

// ===================== ŞİFACI ÇADIRI (göçebe) =====================
export function sifaciCadiri(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  const R = k.R;
  const kazan = (x, z) => { Y.silindir(0.05, 0.04, 0.05, 8, x, Z + 0.03, z, 'duz', 0x3a3632); for (let i = 0; i < 3; i++) Y.kiris([x + Math.cos(i * 2.1) * 0.06, Z, z + Math.sin(i * 2.1) * 0.06], [x, Z + 0.1, z], 0.008, 0.008, 'kutuk', KUTUK); Y.silindir(0.04, 0.04, 0.006, 8, x, Z + 0.075, z, 'duz', 0x6aaa88); dumanNokta(Y, x, Z + 0.1, z, 0.7); };
  if (vr === 0) {
    tipi(Y, { x: -0.05, z: -0.1, y: Z, r: 0.3, h: 0.52 * s, renk: 0xb89860, kusak: 0x5a8a4a });
    for (let i = 0; i < 6; i++) otDemeti(Y, -0.27 + i * 0.1, Z + 0.3, 0.17, [0x7a9a4a, 0xa8854e, 0x9a6ad0][i % 3]);
    Y.kiris([-0.3, Z + 0.34, 0.18], [0.2, Z + 0.34, 0.18], 0.01, 0.01, 'kutuk', KUTUK_A);
    ogutmeTasi(Y, S, -0.3, 0.35, Z); kazan(0.25, 0.3);
  } else if (vr === 1) {
    yurt(Y, { x: -0.1, z: -0.12, y: Z, r: 0.28 });
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { Y.kutu(0.2, 0.03, 0.06, 0.28, Z, 0.0 + j * 0.12 - 0.05 + i * 0.0, 'toprak', 0x5a4028); for (let q = 0; q < 4; q++) Y.kure(0.016, 0.2 + q * 0.04, Z + 0.04, j * 0.12 - 0.05, 'duz', [0x5a9a3a, 0x9a6ad0, 0xe0b04a, 0x6aaa44][q]); break; }
    Y.kutu(0.2, 0.03, 0.06, 0.3, Z, 0.35, 'toprak', 0x5a4028); kazan(-0.3, 0.32);
  } else {
    yuvarlakKulube(Y, { x: -0.08, z: -0.12, y: Z, r: 0.24, h: 0.17, cat: 0.2 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; Y.kure(0.035 + (i % 2) * 0.01, 0.1 + Math.cos(a) * 0.17, Z + 0.035, 0.28 + Math.sin(a) * 0.17, 'moloz', [0x9ac0b0, 0xb4ae9e][i % 2]); }
    kazan(0.1, 0.28); for (let i = 0; i < 4; i++) otDemeti(Y, -0.35 + i * 0.05, Z, 0.25 + (i % 2) * 0.05);
  }
}

// ===================== TAŞ OCAĞI (taş devri 2×2) =====================
export function tasOcagi(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 2), s = c.s;
  const blok = (x, z, w, h, d, ry = 0) => Y.kutu(w, h, d, x, Z, z, 'tasBlok', [0xb4ae9e, 0xa8a292, 0xc0baa8][Math.round(x * 7 + 9) % 3], { ry });
  if (vr === 0) {
    kayaYuzu(Y, S, { x: 0, z: -0.55, y: Z, w: 1.6, d: 0.7, h: 0.55 * s, adim: 4 });
    blok(-0.4, 0.2, 0.3, 0.14, 0.2, 0.2); blok(-0.1, 0.35, 0.26, 0.12, 0.2, -0.15); blok(0.35, 0.25, 0.3, 0.16, 0.22, 0.3); blok(0.5, 0.55, 0.24, 0.1, 0.18, 0.0);
    cakmakTasi(Y, -0.7, 0.45, Z, 6, 1.4); Y.kiris([-0.2, Z, 0.7], [0.4, Z + 0.1, 0.7], 0.05, 0.02, 'kutuk', KUTUK);
    for (let i = 0; i < 3; i++) Y.kiris([0.6 + i * 0.06, Z, 0.0], [0.64 + i * 0.06, Z + 0.28, 0.0], 0.012, 0.012, 'kutuk', KUTUK_A);
  } else if (vr === 1) {
    for (let i = 0; i < 4; i++) Y.silindir(0.62 - i * 0.12, 0.66 - i * 0.12, 0.09 * s, 11, 0.0, Z - 0.03 * i, -0.05, 'moloz', [0x8f8a80, 0x9a9486, 0xa8a292, 0xb4ae9e][i], { yumusak: false });
    for (const [x, z, ry] of [[0.1, -0.05, 0.3], [-0.12, 0.05, -0.2]]) Y.kutu(0.2, 0.08, 0.16, x, Z + 0.3 * s, z, 'tasBlok', 0xc0baa8, { ry });
    for (let i = 0; i < 6; i++) Y.kiris([-0.3 + i * 0.1, Z + 0.34 * s, 0.1], [-0.2 + i * 0.1, Z + 0.4 * s, 0.18], 0.012, 0.012, 'kutuk', KUTUK_A);
    Y.kiris([0.0, Z + 0.05, 0.7], [0.0, Z + 0.3 * s, 0.38], 0.12, 0.02, 'tahta', 0x8a6a44); komurYigini(Y, -0.6, 0.55, Z, 1.3, 0x9a9486); cakmakTasi(Y, 0.6, 0.5, Z, 6, 1.3);
  } else {
    for (const [x, z] of [[-0.45, -0.3], [0.2, -0.45]]) { for (const sx of [-1, 1]) Y.kutu(0.04, 0.26, 0.04, x + sx * 0.12, Z, z, 'kutuk', KUTUK); Y.kutu(0.3, 0.04, 0.04, x, Z + 0.26, z, 'kutuk', KUTUK_A); Y.kutu(0.18, 0.12, 0.14, x, Z, z + 0.0, 'duz', 0x1c1410, { arka: true }); }
    for (const [x, z, r] of [[-0.5, 0.2, 0.2], [0.5, 0.05, 0.16], [0.0, 0.5, 0.18]]) Y.silindir(0.0, r, r * 0.9, 8, x, Z, z, 'moloz', 0xa8a292, { yumusak: false });
    cakmakTasi(Y, 0.3, -0.05, Z, 8, 1.4); Y.kutu(0.3, 0.02, 0.1, -0.1, Z, 0.2, 'tahta', 0x8a6a44, { rx: -0.2 });
  }
}

// ===================== BALIKÇI SIĞINAĞI (taş devri) =====================
export function balikciSiginagi(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  const kano = (x, z, ry) => { const A = Y.alt(x, z, ry); A.prizma([[-0.17, 0.04], [0.17, 0.04], [0.14, 0.0], [-0.14, 0.0]], -0.05, 0.05, 'z', 0, Z, 0, 'kutuk', 0x8a5a32); A.koni(0.05, 0.1, 4, 0.19, Z + 0.025, 0, 'kutuk', 0x8a5a32, { rz: -PI / 2 }); };
  const balikSira = (x, z, y, n) => { for (let i = 0; i < n; i++) Y.kutu(0.02, 0.07, 0.008, x + i * 0.035, y, z, 'duz', i % 2 ? 0x9ab0c0 : 0xb8c8d0); };
  if (vr === 0) {
    deriBarinak(Y, S, { x: 0.0, z: -0.15, y: Z, w: 0.46, d: 0.34, h: 0.26, ry: 0 }); agCercevesi(Y, -0.25, 0.3, Z, 0.34, 0.22, 0.2); kano(0.3, 0.38, 0.3);
    Y.kutu(0.2, 0.014, 0.014, 0.0, Z + 0.22, 0.3, 'kutuk', KUTUK_A); balikSira(-0.06, 0.3, Z + 0.15, 4);
  } else if (vr === 1) {
    Y.silindir(0.3, 0.32, 0.012, 12, 0.0, Z, 0.16, 'duz', 0x4a98bc);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.03, 0.2, 0.03, sx * 0.17, Z, -0.1 + sz * 0.13, 'kutuk', KUTUK);
    Y.kutu(0.4, 0.025, 0.34, 0.0, Z + 0.2, -0.1, 'tahta', 0x8a6a44);
    Y.kutu(0.36, 0.16, 0.3, 0.0, Z + 0.225, -0.1, 'hasir', KUTUK_A); Y.silindir(0.0, 0.3, 0.17, 4, 0.0, Z + 0.385, -0.1, 'saman', SAMAN, { ry: PI / 4, yumusak: false });
    Y.kiris([0.0, Z + 0.2, 0.13], [0.0, Z + 0.01, 0.34], 0.07, 0.014, 'tahta', 0x8a6a44); kano(0.26, 0.28, 0.5); agCercevesi(Y, -0.3, 0.3, Z, 0.24, 0.18, 0.3);
  } else {
    yuvarlakKulube(Y, { x: -0.1, z: -0.12, y: Z, r: 0.22, h: 0.16, cat: 0.18, saman: 0x8a9a5a, duvar: 0x8a9a5a });
    for (let i = 0; i < 3; i++) { Y.silindir(0.03, 0.04, 0.09, 7, 0.3, Z, 0.1 + i * 0.1, 'hasir', 0xa8854e); Y.silindir(0.018, 0.03, 0.04, 6, 0.3, Z + 0.09, 0.1 + i * 0.1, 'hasir', 0xa8854e); }
    kano(0.1, 0.42, 0.1); balikSira(-0.3, 0.3, Z + 0.1, 5); Y.kutu(0.2, 0.014, 0.014, -0.22, Z + 0.17, 0.3, 'kutuk', KUTUK_A); for (const sx of [-1, 1]) Y.kutu(0.016, 0.2, 0.016, -0.22 + sx * 0.1, Z, 0.3, 'kutuk', KUTUK);
  }
}

// ===================== MAĞARA RESMİ YERİ (taş devri 2×2) =====================
export function magaraResmi(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 2), s = c.s;
  const boya = (x, y, z, ry, tur) => { // basit hayvan/el silüeti: ocre/kömür
    const A = Y.alt(x, z, ry);
    if (tur === 'el') { A.kutu(0.035, 0.04, 0.006, 0, y, 0, 'duz', 0xa83a22); for (let i = 0; i < 4; i++) A.kutu(0.007, 0.03, 0.006, -0.015 + i * 0.01, y + 0.04, 0, 'duz', 0xa83a22); }
    else { A.kutu(0.14, 0.05, 0.006, 0, y, 0, 'duz', 0x2a1e14); A.kutu(0.05, 0.05, 0.006, 0.08, y + 0.03, 0, 'duz', 0x2a1e14); for (let i = 0; i < 3; i++) A.kutu(0.01, 0.05, 0.006, -0.05 + i * 0.05, y - 0.04, 0, 'duz', 0x2a1e14); A.kutu(0.07, 0.03, 0.006, 0, y + 0.01, 0.0, 'duz', 0xa8431f); }
  };
  if (vr === 0) {
    Y.ekle(new THREE.SphereGeometry(0.7, 12, 6, 0, PI * 2, 0, PI / 2), 0, Z, -0.34, 'moloz', 0x8f8a80, { yumusak: true, sy: 0.62 });
    Y.kutu(1.2, 0.34, 0.14, 0, Z, 0.2, 'moloz', 0xa8a292); Y.kutu(0.9, 0.12, 0.14, 0, Z + 0.34, 0.14, 'moloz', 0x9a9486);
    Y.prizma(kemerProfil(0.4, 0.3, 6), 0, 0.03, 'z', 0, Z, 0.275, 'duz', 0x120d09);
    boya(-0.4, Z + 0.17, 0.276, 0, 'hayvan'); boya(0.4, Z + 0.15, 0.276, 0, 'el'); boya(0.52, Z + 0.1, 0.276, 0, 'el'); boya(-0.52, Z + 0.26, 0.276, 0, 'el');
    atesHalka(Y, 0.0, 0.5, Z, 0.1, 8); for (const [x, z] of [[-0.3, 0.55], [0.3, 0.6]]) kutukTomruk(Y, x, z, Z, 0.24, 0.4);
  } else if (vr === 1) {
    kayaYuzu(Y, S, { x: 0, z: -0.65, y: Z, w: 1.7, d: 0.55, h: 0.7 * s, adim: 3 });
    Y.kutu(1.0, 0.5, 0.03, 0.0, Z + 0.04, -0.37, 'moloz', 0xc8c0a8);
    for (let i = 0; i < 4; i++) boya(-0.38 + i * 0.25, Z + 0.3, -0.355, 0, i % 2 ? 'el' : 'hayvan');
    for (const [x, z, h] of [[-0.6, 0.2, 0.34], [0.55, 0.3, 0.28], [0.1, 0.65, 0.22]]) Y.kutu(0.14, h, 0.1, x, Z, z, 'moloz', 0x9a9486, { ry: x });
    atesHalka(Y, 0.0, 0.3, Z, 0.08, 7); cakmakTasi(Y, -0.4, 0.6, Z, 5);
  } else {
    for (let i = 0; i < 3; i++) { const A = Y.alt(-0.45 + i * 0.45, -0.25 + (i % 2) * 0.1, 0.2 - i * 0.2); for (const sx of [-1, 1]) A.kutu(0.02, 0.34, 0.02, sx * 0.17, Z, 0, 'kutuk', KUTUK); A.kutu(0.36, 0.28, 0.01, 0, Z + 0.04, 0, 'deri', [0xd8b890, 0xc9a57a, 0xb89860][i]); boya(0, Z + 0.17, 0.008, 0, i % 2 ? 'el' : 'hayvan'); }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2; Y.kutu(0.07, 0.12 + (i % 3) * 0.03, 0.06, Math.cos(a) * 0.55, Z, 0.35 + Math.sin(a) * 0.4, 'moloz', 0x9a9486, { ry: a }); }
    atesHalka(Y, 0.0, 0.35, Z, 0.1, 8);
  }
}

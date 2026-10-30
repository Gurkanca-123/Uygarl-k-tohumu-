// Bronz çağı yapıları (antik stil paketi): Kerpiç Ev, Kil Ocağı, Maden Ocağı, Pazar Yeri, Kuyu, Mabet. Her biri 3 varyant.
// Kerpiç/taş/kil dili, düz damlı kütle + çıkıntılı kirişler, kiremit/saman çatı. Ortak: parcalar_atolye.js, parcalar_tarim.js (küp), parcalar_avlu.js, parcalar_su.js.
import * as THREE from 'three';
import { Yerel, kemerProfil } from '../geometri.js';
import { catiBesik, catiTek } from '../cati.js';
import { ocak, komurYigini, atesNokta, dumanNokta, sutunCephe } from '../parcalar_atolye.js';
import { kup, mantarTasi } from '../parcalar_tarim.js';
import { cuvalYigini, arabaKasa } from '../parcalar_su.js';
import { agac, kuyu as kuyuGovde } from '../parcalar_avlu.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;
const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

// ===================== KERPİÇ EV =====================
export function kerpicEv(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const siva = S.siva[vr % S.siva.length];
  const kapiPenc = (x, z, w) => { Y.prizma(kemerProfil(0.1, 0.17, 4), 0, 0.02, 'z', x, Z, z, 'tahta', 0x4a2e1c); Y.kutu(0.14, 0.02, 0.04, x, Z + 0.18, z, 'kutuk', S.kiris, { arka: true }); };
  const kucukPenc = (x, y, z, ry = 0) => { const A = Y.alt(x, z, ry); A.kutu(0.07, 0.08, 0.02, 0, y, 0, 'duz', 0x2a1e14, { arka: true }); A.kutu(0.095, 0.014, 0.034, 0, y + 0.085, 0.004, 'kutuk', S.kiris, { arka: true }); };
  if (vr === 0) {
    Y.kutu(0.56, 0.3 * s, 0.5, 0, Z, -0.05, 'kerpic', siva);
    Y.kutu(0.6, 0.035, 0.54, 0, Z + 0.3 * s, -0.05, 'kerpic', carp(siva, 0.92));
    for (let i = 0; i < 5; i++) Y.silindir(0.016, 0.016, 0.08, 6, -0.22 + i * 0.11, Z + 0.22 * s, 0.25 + 0.0, 'kutuk', S.kirisAcik, { rx: PI / 2 });
    for (let i = 0; i < 4; i++) Y.silindir(0.016, 0.016, 0.08, 6, 0.28 + 0.0, Z + 0.22 * s, -0.25 + i * 0.12, 'kutuk', S.kirisAcik, { rz: PI / 2 });
    kapiPenc(-0.14, 0.205); kucukPenc(0.14, Z + 0.1, 0.205); kucukPenc(0.285, Z + 0.1, -0.1, PI / 2);
    Y.kiris([0.2, Z, 0.38], [0.24, Z + 0.3 * s + 0.03, 0.2], 0.03, 0.012, 'kutuk', S.kiris); Y.kiris([0.28, Z, 0.38], [0.32, Z + 0.3 * s + 0.03, 0.2], 0.03, 0.012, 'kutuk', S.kiris);
    kup(Y, S, -0.35, 0.35, Z, 0.9); dumanNokta(Y, -0.15, Z + 0.34 * s, -0.2, 0.7);
  } else if (vr === 1) {
    Y.kutu(0.5, 0.22 * s, 0.4, 0, Z, -0.05, 'kerpic', siva);
    catiBesik(Y, { x0: 0, z0: -0.05, w: 0.54, d: 0.44, y: Z + 0.22 * s, H: 0.16 * s, oh: 0.07, rake: 0.05, kal: 0.026, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, th: 0.01, alin: false });
    kapiPenc(-0.1, 0.15); kucukPenc(0.14, Z + 0.09, 0.15); kucukPenc(0.255, Z + 0.09, -0.05, PI / 2);
    for (const sx of [-1, 1]) Y.silindir(0.016, 0.02, 0.2 * s, 6, -0.1 + sx * 0.14, Z, 0.34, 'tasBlok', S.tasAcik); Y.kutu(0.36, 0.025, 0.04, -0.1, Z + 0.2 * s, 0.34, 'kutuk', S.kiris);
    Y.kutu(0.3, 0.02, 0.2, -0.1, Z, 0.26, 'tasBlok', S.tas); kup(Y, S, 0.3, 0.3, Z, 0.8); dumanNokta(Y, 0.15, Z + 0.4 * s, -0.12, 0.7);
  } else {
    Y.kutu(0.5, 0.26 * s, 0.44, 0, Z, -0.08, 'kerpic', siva);
    Y.kutu(0.34, 0.22 * s, 0.34, 0.06, Z + 0.26 * s, -0.12, 'kerpic', carp(siva, 1.05));
    Y.kutu(0.54, 0.03, 0.48, 0, Z + 0.26 * s, -0.08, 'kerpic', carp(siva, 0.92)); Y.kutu(0.38, 0.03, 0.38, 0.06, Z + 0.48 * s, -0.12, 'kerpic', carp(siva, 0.92));
    kapiPenc(-0.1, 0.145); kucukPenc(0.1, Z + 0.1, 0.145); kucukPenc(0.06, Z + 0.34 * s, 0.065); kucukPenc(0.235, Z + 0.34 * s, -0.12, PI / 2);
    Y.kiris([-0.18, Z + 0.26 * s + 0.03, 0.18], [-0.18, Z + 0.26 * s + 0.03, 0.34], 0.02, 0.02, 'kutuk', S.kiris);
    catiTek(Y, { x0: -0.1, z0: 0.3, w: 0.3, d: 0.18, y: Z + 0.2, yuk: 0.04, oh: 0.02, rake: 0.02, renk: [0xd8c8a0, 0xc8b890, 0xe0d0a8], doku: 'kumas', kabukRenk: S.kiris });
    for (const sx of [-1, 1]) Y.kutu(0.025, 0.2, 0.025, -0.1 + sx * 0.14, Z, 0.39, 'kutuk', S.kiris);
    Y.kiris([0.22, Z, 0.3], [0.24, Z + 0.26 * s + 0.03, 0.1], 0.03, 0.012, 'kutuk', S.kiris);
    kup(Y, S, 0.3, 0.3, Z, 0.8);
  }
}

// ===================== KİL OCAĞI =====================
export function kilOcagi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const kil = 0xb87a52;
  const cark = (x, z) => { Y.silindir(0.07, 0.09, 0.05, 9, x, Z, z, 'tahta', 0x8a5a32); Y.silindir(0.06, 0.06, 0.012, 9, x, Z + 0.05, z, 'kerpic', kil); Y.kure(0.03, x, Z + 0.07, z, 'kerpic', kil, { sy: 1.3 }); };
  if (vr === 0) {
    Y.ekle(new THREE.SphereGeometry(0.26, 10, 6, 0, PI * 2, 0, PI / 2), 0.0, Z + 0.06, -0.1, 'kerpic', kil, { yumusak: true, sy: 0.9 });
    Y.silindir(0.27, 0.3, 0.06, 10, 0.0, Z, -0.1, 'tasBlok', S.tas);
    Y.prizma(kemerProfil(0.12, 0.13, 4), 0, 0.02, 'z', 0.0, Z + 0.04, 0.16, 'duz', 0x1c1410); Y.kutu(0.07, 0.05, 0.012, 0.0, Z + 0.07, 0.18, 'duz', 0xff7a2a, { isil: true, arka: true }); atesNokta(Y, 0.0, Z + 0.09, 0.18, 0.8);
    Y.silindir(0.03, 0.04, 0.1, 7, 0.0, Z + 0.28, -0.1, 'kerpic', carp(kil, 0.9)); dumanNokta(Y, 0.0, Z + 0.4, -0.1, 0.9);
    for (let i = 0; i < 3; i++) kup(Y, S, -0.3 + i * 0.06, 0.38, Z, 0.5, [0xa86a44, 0x9a5c3a, 0xb87a52][i]); cark(0.3, 0.32);
  } else if (vr === 1) {
    Y.silindir(0.22, 0.25, 0.04, 10, -0.15, Z, -0.1, 'toprak', 0x6a4a30); Y.silindir(0.18, 0.18, 0.02, 10, -0.15, Z + 0.04, -0.1, 'kerpic', carp(kil, 0.8));
    cark(0.22, 0.2); for (let i = 0; i < (k.lod ? 2 : 4); i++) kup(Y, S, 0.1 + i * 0.07, -0.3, Z, 0.5, [0xa86a44, 0x9a5c3a][i % 2]);
    Y.kutu(0.34, 0.02, 0.1, 0.2, Z + 0.16, -0.3, 'tahta', 0x8a6a44); Y.kutu(0.02, 0.16, 0.02, 0.04, Z, -0.3, 'kutuk', S.kiris); Y.kutu(0.02, 0.16, 0.02, 0.36, Z, -0.3, 'kutuk', S.kiris);
    for (let i = 0; i < (k.lod ? 2 : 5); i++) kup(Y, S, 0.06 + i * 0.07, -0.3, Z + 0.18, 0.4, 0xb87a52);
  } else {
    Y.silindir(0.2, 0.23, 0.22 * s, 9, 0.0, Z, -0.1, 'kerpic', kil); Y.silindir(0.0, 0.2, 0.14, 9, 0.0, Z + 0.22 * s, -0.1, 'kerpic', carp(kil, 1.05));
    Y.silindir(0.045, 0.055, 0.22, 7, 0.0, Z + 0.34 * s, -0.1, 'tasBlok', S.tas); Y.silindir(0.06, 0.05, 0.02, 7, 0.0, Z + 0.56 * s, -0.1, 'tasBlok', S.tasAcik); dumanNokta(Y, 0.0, Z + 0.6 * s, -0.1, 1.1);
    Y.prizma(kemerProfil(0.1, 0.1, 4), 0, 0.02, 'z', 0.0, Z, 0.11, 'duz', 0x1c1410); Y.kutu(0.06, 0.04, 0.012, 0.0, Z + 0.02, 0.125, 'duz', 0xff7a2a, { isil: true, arka: true }); atesNokta(Y, 0.0, Z + 0.05, 0.13, 0.8);
    for (let i = 0; i < 6; i++) kup(Y, S, -0.3 + (i % 3) * 0.08, 0.3 + Math.floor(i / 3) * 0.1, Z, 0.5, 0xa86a44); komurYigini(Y, 0.3, 0.25, Z, 1.1);
  }
}

// ===================== MADEN OCAĞI (2×2) =====================
export function madenOcagi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const cevher = (x, z, n = 6, s2 = 1) => { for (let i = 0; i < n; i++) Y.ekle(new THREE.DodecahedronGeometry(0.04 * s2 * (0.7 + (i % 3) * 0.2)), x + (i % 3) * 0.06 * s2 - 0.06, Z + 0.035 + Math.floor(i / 3) * 0.04, z + (i % 2) * 0.05, 'moloz', [0x6a6a78, 0xa87a4a, 0x7a6a58][i % 3], { sy: 0.8, ry: i }); };
  const arabaRay = (x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz); const A = Y.alt((x0 + x1) / 2, (z0 + z1) / 2, Math.atan2(-dz, dx)); for (const sz of [-1, 1]) A.kutu(L, 0.012, 0.014, 0, Z, sz * 0.045, 'duz', 0x4a4a52); for (let i = 0; i < Math.round(L / 0.1); i++) A.kutu(0.025, 0.012, 0.14, -L / 2 + 0.05 + i * 0.1, Z - 0.004, 0, 'kutuk', S.kiris); };
  if (vr === 0) {
    Y.ekle(new THREE.SphereGeometry(0.62, 12, 6, 0, PI * 2, 0, PI / 2), 0.0, Z, -0.42, 'moloz', 0x8f8a80, { yumusak: true, sy: 0.62 });
    Y.kutu(0.7, 0.24, 0.12, 0.0, Z, 0.1, 'moloz', 0x9a9486);
    for (const sx of [-1, 1]) Y.kutu(0.07, 0.34, 0.07, sx * 0.2, Z, 0.2, 'kutuk', 0x5e4022); Y.kutu(0.5, 0.07, 0.08, 0.0, Z + 0.34, 0.2, 'kutuk', 0x6b4a2c);
    Y.kutu(0.34, 0.28, 0.06, 0.0, Z, 0.15, 'duz', 0x120d09, { arka: true });
    arabaRay(0.0, 0.25, 0.1, 0.85); arabaKasa(Y, S, 0.06, 0.55, Z, PI / 2 + 0.1); cevher(0.4, 0.45, 8, 1.2); cevher(-0.5, 0.6, 6);
    for (const [x, z] of [[-0.45, 0.2]]) { for (const sx of [-1, 1]) Y.kutu(0.03, 0.26, 0.03, x + sx * 0.09, Z, z, 'kutuk', S.kiris); Y.silindir(0.03, 0.03, 0.2, 7, x, Z + 0.22 - 0.1, z, 'kutuk', S.kirisAcik, { rz: PI / 2 }); }
  } else if (vr === 1) {
    for (let i = 0; i < 4; i++) Y.silindir(0.7 - i * 0.14, 0.74 - i * 0.14, 0.07 * s, 11, 0.0, Z - 0.035 * i, -0.05, 'moloz', [0x8f8a80, 0x9a9486, 0xa87a4a, 0x6a6a78][i], { yumusak: false });
    Y.kiris([0.0, Z + 0.04, 0.9], [0.0, Z - 0.0, 0.5], 0.12, 0.016, 'tahta', 0x8a6238); for (let i = 0; i < 6; i++) Y.kutu(0.12, 0.014, 0.02, 0.0, Z + 0.01 + i * 0.002, 0.52 + i * 0.07, 'kutuk', S.kiris);
    cevher(-0.55, 0.55, 8, 1.3); cevher(0.55, 0.6, 6, 1.1); for (let i = 0; i < 3; i++) { Y.silindir(0.04, 0.03, 0.05, 8, -0.6 + i * 0.08, Z, 0.25, 'hasir', 0xa8854e); }
    Y.kutu(0.04, 0.3, 0.04, 0.1, Z, 0.0, 'kutuk', S.kiris, { rz: 0.4 });
  } else {
    for (const sx of [-1, 1]) Y.kiris([sx * 0.2, Z, -0.3], [0.0, Z + 0.62 * s, -0.3], 0.05, 0.05, 'kutuk', S.kiris);
    Y.kutu(0.07, 0.05, 0.05, 0.0, Z + 0.6 * s, -0.3, 'kutuk', S.kirisAcik);
    Y.silindir(0.1, 0.1, 0.03, 12, 0.0, Z + 0.58 * s, -0.3, 'kutuk', S.kirisAcik, { rx: PI / 2 }); for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; Y.kutu(0.09, 0.012, 0.012, Math.cos(a) * 0.05, Z + 0.58 * s + Math.sin(a) * 0.05, -0.3, 'kutuk', S.kiris, { rz: a }); }
    Y.kutu(0.003, 0.4, 0.003, 0.0, Z + 0.18, -0.3, 'duz', 0xb09a70); Y.silindir(0.04, 0.03, 0.05, 8, 0.0, Z + 0.14, -0.3, 'tahta', 0x8a5a32);
    Y.kutu(0.36, 0.14, 0.3, 0.0, Z, -0.3, 'tasBlok', S.tas, { arka: true });
    cevher(0.5, 0.2, 9, 1.4); cevher(-0.5, 0.35, 7, 1.2); arabaKasa(Y, S, 0.1, 0.4, Z, 0.4); komurYigini(Y, -0.2, 0.6, Z, 1.2, 0x6a6a78);
    Y.kutu(0.5, 0.025, 0.2, 0.3, Z + 0.0, 0.7, 'tahta', 0x8a6a44, { ry: 0.2 });
  }
}

// ===================== PAZAR YERİ (2×2) =====================
function tezgahDukkan(Y, S, x, z, ry, renk, y) {
  const A = Y.alt(x, z, ry);
  for (const sx of [-1, 1]) A.kutu(0.022, 0.22, 0.022, sx * 0.14, y, -0.07, 'kutuk', S.kiris);
  for (const sx of [-1, 1]) A.kutu(0.022, 0.16, 0.022, sx * 0.14, y, 0.08, 'kutuk', S.kiris);
  const n = 6, w = 0.3 / n;
  for (let i = 0; i < n; i++) A.prizma([[0.0, 0.0], [0.17, -0.06], [0.17, -0.1], [0.0, -0.04]], -0.15 + i * w, -0.15 + (i + 1) * w - 0.002, 'x', 0, y + 0.22, -0.05, 'kumas', i % 2 ? 0xe8dcc0 : renk);
  A.kutu(0.3, 0.08, 0.06, 0, y, 0.0, 'tahta', 0x8a6a44);
  for (let i = 0; i < 4; i++) A.kure(0.022, -0.1 + i * 0.065, y + 0.1, 0.0, 'duz', [0xb03a2e, 0xe0b04a, 0x5a8a3a, 0xd8c08a][i]);
}
export function pazarYeri(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const renkler = [0xb03a2e, 0x2f5f8a, 0xe0b04a, 0x5a8a3a, 0x8a5a9a];
  if (vr === 0) {
    kuyuGovde(Y, S, 0.0, 0.0, Z);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.4; tezgahDukkan(Y, S, Math.cos(a) * 0.62, Math.sin(a) * 0.62, -a + PI / 2 + PI, renkler[i % 5], Z); }
    for (let i = 0; i < 3; i++) kup(Y, S, -0.3 + i * 0.3, 0.85, Z, 0.7); cuvalYigini(Y, S, 0.0, -0.9, Z, 0.4);
  } else if (vr === 1) {
    // KAPALI ÇARŞI HANGARI: uzun kiremit çatılı direkli sundurma + tezgâhlar
    for (let i = 0; i < 5; i++) for (const sz of [-1, 1]) Y.kutu(0.05, 0.3 * s, 0.05, -0.7 + i * 0.35, Z, -0.15 + sz * 0.3, 'kutuk', S.kiris);
    catiBesik(Y, { x0: 0.0, z0: -0.15, w: 1.6, d: 0.74, y: Z + 0.3 * s, H: 0.18 * s, oh: 0.06, rake: 0.05, kal: 0.026, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, th: 0.01, alin: false });
    for (let i = 0; i < 4; i++) { const A = Y.alt(-0.52 + i * 0.35, -0.3, 0); A.kutu(0.24, 0.08, 0.1, 0, Z, 0, 'tahta', 0x8a6a44); for (let q = 0; q < 3; q++) A.kure(0.025, -0.07 + q * 0.07, Z + 0.1, 0, 'duz', renkler[(i + q) % 5]); }
    tezgahDukkan(Y, S, -0.4, 0.6, 0.0, renkler[0], Z); tezgahDukkan(Y, S, 0.0, 0.62, 0.0, renkler[1], Z); tezgahDukkan(Y, S, 0.4, 0.6, 0.0, renkler[2], Z);
    arabaKasa(Y, S, 0.7, 0.2, Z, 0.5); kup(Y, S, -0.8, 0.45, Z, 0.7);
  } else {
    for (let i = 0; i < 3; i++) Y.kutu(0.62 - i * 0.12, 0.04, 0.62 - i * 0.12, 0.0, Z + i * 0.04, 0.0, 'tasBlok', i % 2 ? S.tasAcik : S.tas);
    Y.kutu(0.07, 0.34 * s, 0.07, 0.0, Z + 0.12, 0.0, 'tasBlok', S.tasAcik); Y.koni(0.05, 0.1, 4, 0.0, Z + 0.12 + 0.34 * s, 0.0, 'tasBlok', S.tasAcik, { ry: PI / 4 }); Y.kure(0.02, 0.0, Z + 0.12 + 0.34 * s + 0.1, 0.0, 'duz', S.altin);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2 + 0.2; tezgahDukkan(Y, S, Math.cos(a) * 0.78, Math.sin(a) * 0.78, -a + PI / 2 + PI, renkler[i], Z); }
    for (const [x, z] of [[-0.5, 0.9], [0.5, 0.9]]) { Y.silindir(0.01, 0.013, 0.34, 5, x, Z, z, 'kutuk', S.kiris); Y.kutu(0.03, 0.16, 0.006, x + 0.02, Z + 0.17, z, 'kumas', renkler[(x > 0 ? 2 : 0)]); }
    for (let i = 0; i < 3; i++) cuvalYigini(Y, S, -0.3 + i * 0.3, -0.9, Z, i);
  }
}

// ===================== KUYU (1×1) =====================
export function kuyu(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  if (vr === 0) {
    Y.silindir(0.18, 0.2, 0.14 * s, 10, 0, Z, 0, 'tasBlok', S.tasAcik); Y.silindir(0.14, 0.14, 0.012, 10, 0, Z + 0.1 * s, 0, 'duz', 0x2a6a8a); Y.silindir(0.2, 0.2, 0.02, 10, 0, Z + 0.14 * s, 0, 'tasBlok', S.tas);
    for (const sx of [-1, 1]) Y.kutu(0.03, 0.34, 0.03, sx * 0.18, Z, 0, 'kutuk', S.kiris); catiBesik(Y, { x0: 0, z0: 0, w: 0.44, d: 0.34, y: Z + 0.34, H: 0.12, oh: 0.04, rake: 0.03, kal: 0.02, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false, sutun: 4 });
    Y.silindir(0.02, 0.02, 0.4, 6, 0, Z + 0.28 - 0.2, 0, 'kutuk', S.kirisAcik, { rz: PI / 2 }); Y.kutu(0.03, 0.1, 0.03, 0.22, Z + 0.2, 0.0, 'kutuk', S.kiris, { rz: 0.2 });
    Y.silindir(0.04, 0.03, 0.05, 7, 0.0, Z + 0.2, 0.0, 'tahta', 0x8a5a32); ficiYanina(Y, S, Z);
  } else if (vr === 1) {
    for (let i = 0; i < 3; i++) Y.silindir(0.3 - i * 0.07, 0.32 - i * 0.07, 0.035, 10, 0, Z + i * 0.035, 0, 'tasBlok', i % 2 ? S.tasAcik : S.tas);
    Y.silindir(0.1, 0.1, 0.012, 10, 0, Z + 0.1, 0, 'duz', 0x2a6a8a); Y.silindir(0.12, 0.13, 0.12, 8, 0, Z + 0.1, 0, 'tasBlok', S.tasAcik); Y.silindir(0.09, 0.09, 0.012, 8, 0, Z + 0.22, 0, 'duz', 0x2a6a8a);
    Y.kutu(0.2, 0.06, 0.08, 0.28, Z, 0.2, 'tasBlok', S.tas, { ry: 0.3 }); Y.kutu(0.17, 0.01, 0.05, 0.28, Z + 0.06, 0.2, 'duz', 0x4a98bc, { ry: 0.3 });
  } else {
    Y.silindir(0.1, 0.12, 0.1, 9, -0.1, Z, 0.0, 'tasBlok', S.tasAcik); Y.silindir(0.08, 0.08, 0.012, 9, -0.1, Z + 0.09, 0, 'duz', 0x2a6a8a);
    for (const sz of [-1, 1]) Y.kutu(0.025, 0.3, 0.025, 0.1, Z, sz * 0.03, 'kutuk', S.kiris);
    Y.kiris([-0.12, Z + 0.3, 0], [0.34, Z + 0.34, 0], 0.02, 0.02, 'kutuk', S.kirisAcik); Y.kure(0.035, 0.36, Z + 0.3, 0, 'moloz', S.tas); Y.kutu(0.003, 0.16, 0.003, -0.1, Z + 0.15, 0, 'duz', 0xb09a70); Y.silindir(0.03, 0.022, 0.035, 7, -0.1, Z + 0.1, 0, 'tahta', 0x8a5a32);
    kup(Y, S, 0.3, 0.3, Z, 0.9);
  }
}
function ficiYanina(Y, S, Z) { Y.silindir(0.04, 0.036, 0.08, 8, 0.3, Z, 0.25, 'tahta', 0x8a5a32); }

// ===================== MABET (2×2) =====================
export function mabet(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  if (vr === 0) {
    // KADEMELİ TAPINAK (zigurat tipi): rampa + tepe tapınağı
    for (let i = 0; i < 4; i++) Y.kutu(1.4 - i * 0.28, 0.1 * s, 1.4 - i * 0.28, 0.0, Z + i * 0.1 * s, -0.05, 'kerpic', carp(S.siva[0], 1 - i * 0.04));
    for (let i = 0; i < 4; i++) Y.kutu(1.4 - i * 0.28 + 0.03, 0.02, 1.4 - i * 0.28 + 0.03, 0.0, Z + (i + 1) * 0.1 * s - 0.01, -0.05, 'tasBlok', S.tasAcik);
    for (let i = 0; i < 9; i++) Y.kutu(0.22, 0.02 + 0, 0.09, 0.0, Z + i * 0.045 * s, 0.7 - i * 0.09, 'tasBlok', i % 2 ? S.tas : S.tasAcik, { arka: true });
    Y.kutu(0.36, 0.2 * s, 0.32, 0.0, Z + 0.4 * s, -0.05, 'kerpic', S.siva[1]); catiBesik(Y, { x0: 0, z0: -0.05, w: 0.4, d: 0.36, y: Z + 0.6 * s, H: 0.1, oh: 0.04, rake: 0.03, kal: 0.02, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false, sutun: 4 });
    Y.prizma(kemerProfil(0.12, 0.16, 4), 0, 0.02, 'z', 0.0, Z + 0.4 * s, 0.115, 'duz', 0xffc070, { isil: true });
    for (const sx of [-1, 1]) { Y.kutu(0.05, 0.22, 0.05, sx * 0.62, Z, 0.7, 'tasBlok', S.tasAcik); Y.kure(0.03, sx * 0.62, Z + 0.24, 0.7, 'duz', 0xff7a2a, { isil: true }); }
  } else if (vr === 1) {
    for (let i = 0; i < 3; i++) Y.kutu(1.2 - i * 0.08, 0.04, 1.0 - i * 0.08, 0.0, Z + i * 0.04, 0, 'tasBlok', i % 2 ? S.tas : S.tasAcik);
    Y.kutu(0.7, 0.34 * s, 0.6, 0.0, Z + 0.12, -0.15, 'kerpic', S.siva[0]);
    sutunCephe(Y, S, { x: 0.0, z: 0.28, y: Z + 0.12, w: 0.6, h: 0.3 * s, adet: 4, derin: 0.16 });
    catiBesik(Y, { x0: 0, z0: -0.15, w: 0.78, d: 0.68, y: Z + 0.12 + 0.34 * s, H: 0.13, oh: 0.05, rake: 0.04, kal: 0.022, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false });
    Y.kutu(0.14, 0.08, 0.1, 0.0, Z + 0.12, 0.62, 'tasBlok', S.tasAcik); Y.silindir(0.05, 0.04, 0.04, 8, 0.0, Z + 0.2, 0.62, 'duz', 0x3a3632); Y.koni(0.035, 0.05, 6, 0.0, Z + 0.24, 0.62, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, 0.0, Z + 0.26, 0.62, 0.9);
  } else {
    // TAŞ ÇEMBERİ (henge): dikili taşlar + üst lento + sunak ve mangal
    const n = 8;
    for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; const px = Math.cos(a) * 0.62, pz = Math.sin(a) * 0.62; Y.kutu(0.14, 0.4 * s, 0.1, px, Z, pz, 'tasBlok', i % 2 ? S.tas : S.tasAcik, { ry: -a + PI / 2 }); }
    for (let i = 0; i < n; i += 2) { const a0 = (i / n) * PI * 2, a1 = ((i + 1) / n) * PI * 2, am = (a0 + a1) / 2; Y.kutu(0.5, 0.07, 0.1, Math.cos(am) * 0.6, Z + 0.4 * s, Math.sin(am) * 0.6, 'tasBlok', S.tasAcik, { ry: -am + PI / 2 }); }
    Y.kutu(0.3, 0.1, 0.2, 0.0, Z, 0.0, 'tasBlok', S.tasAcik); Y.silindir(0.07, 0.05, 0.04, 8, 0.0, Z + 0.1, 0.0, 'duz', 0x3a3632); Y.koni(0.05, 0.07, 6, 0.0, Z + 0.14, 0.0, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, 0.0, Z + 0.17, 0.0, 1.0); dumanNokta(Y, 0.0, Z + 0.3, 0.0, 0.8);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2 + 0.4; Y.kutu(0.03, 0.14, 0.03, Math.cos(a) * 0.25, Z, Math.sin(a) * 0.25, 'tasBlok', S.tas); }
  }
}
void mantarTasi; void agac; void ocak;

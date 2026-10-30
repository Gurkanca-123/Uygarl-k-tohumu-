// Antik çağ yapıları: Taş Ev, Mermer Ocağı, Liman, Su Kemeri, Hamam, Kütüphane, Tiyatro. Her biri 3 varyant. Mermer/taş + kırmızı kiremit, dor sütun, kemer, kubbe.
// Ortak: parcalar_atolye.js (sütun cephe), parcalar_han.js (küçük kubbe), parcalar_lonca.js (kemer sırası), parcalar_su.js, parcalar_tarim.js.
import * as THREE from 'three';
import { Yerel, kemerProfil } from '../geometri.js';
import { catiBesik, catiTek } from '../cati.js';
import { sutunCephe, dumanNokta, komurYigini } from '../parcalar_atolye.js';
import { kucukKubbe } from '../parcalar_han.js';
import { kemerSirasi } from '../parcalar_lonca.js';
import { cuvalYigini, arabaKasa } from '../parcalar_su.js';
import { kup } from '../parcalar_tarim.js';
import { agac, cesme } from '../parcalar_avlu.js';
import { pencere } from '../parcalar.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;
const SU = 0x4a98bc;
const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
const ctx = (k, b, kaide = 'tas') => ({ Z: k.kaide(b, kaide), Y: new Yerel(k, 0, 0, 0, 0) });
const kirem = (Y, S, o) => catiBesik(Y, { oh: 0.05, rake: 0.04, kal: 0.022, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, th: 0.009, alin: false, ...o });
const sutunlar = (Y, S, pts, y, h, r = 0.022) => { for (const [x, z] of pts) { Y.silindir(r * 0.85, r, h, 8, x, y, z, 'mermer', S.tasAcik); Y.kutu(r * 2.6, 0.016, r * 2.6, x, y + h, z, 'mermer', S.tasAcik); Y.kutu(r * 2.3, 0.012, r * 2.3, x, y - 0.0, z, 'mermer', S.tasAcik); } };

// ===================== TAŞ EV (1×1) =====================
export function tasEv(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 1), s = c.s;
  const siva = S.siva[vr % S.siva.length];
  const pen = (x, y, z, ry = 0) => pencere(Y.alt(x, z, ry), S, { x: 0, y, w: 0.06, h: 0.1, tip: 'kemer', panjur: null, isikli: true });
  if (vr === 0) {
    Y.kutu(0.52, 0.26 * s, 0.42, 0, Z, -0.1, 'tasBlok', siva); kirem(Y, S, { x0: 0, z0: -0.1, w: 0.56, d: 0.46, y: Z + 0.26 * s, H: 0.15 * s });
    sutunCephe(Y, S, { x: 0.0, z: 0.16, y: Z, w: 0.3, h: 0.22 * s, adet: 3, derin: 0.12, alinlik: false }); Y.kutu(0.38, 0.03, 0.16, 0.0, Z + 0.26 * s - 0.02, 0.12, 'tasBlok', S.tasAcik);
    Y.prizma(kemerProfil(0.1, 0.17, 4), 0, 0.02, 'z', 0.0, Z, 0.115, 'tahta', 0x4a2e1c); pen(0.2, Z + 0.07, 0.115); pen(-0.2, Z + 0.07, 0.115); kup(Y, S, 0.3, 0.3, Z, 0.7);
  } else if (vr === 1) {
    Y.kutu(0.46, 0.4 * s, 0.4, 0, Z, -0.1, 'tasBlok', siva); Y.kutu(0.5, 0.025, 0.44, 0, Z + 0.2, -0.1, 'tasBlok', S.tasAcik);
    kirem(Y, S, { x0: 0, z0: -0.1, w: 0.5, d: 0.44, y: Z + 0.4 * s, H: 0.14 * s });
    Y.prizma(kemerProfil(0.09, 0.15, 4), 0, 0.02, 'z', -0.1, Z, 0.1, 'tahta', 0x4a2e1c); pen(0.12, Z + 0.06, 0.1); pen(-0.1, Z + 0.26 * s, 0.1); pen(0.12, Z + 0.26 * s, 0.1);
    Y.kutu(0.34, 0.025, 0.1, 0.0, Z + 0.2, 0.15, 'tahta', 0x8a6a44); for (const sx of [-1, 1]) Y.kutu(0.02, 0.2, 0.02, sx * 0.16, Z, 0.19, 'kutuk', S.kiris); Y.kutu(0.34, 0.07, 0.014, 0.0, Z + 0.225, 0.19, 'kutuk', S.kiris);
  } else {
    for (const sz of [-1, 1]) Y.kutu(0.7, 0.05, 0.04, 0, Z, sz * 0.32, 'tasBlok', S.tasAcik); for (const sx of [-1, 1]) Y.kutu(0.04, 0.05, 0.64, sx * 0.33, Z, 0, 'tasBlok', S.tasAcik);
    for (const [x, z, w, d, ry] of [[0, -0.22, 0.6, 0.2, 0], [0.22, 0.05, 0.2, 0.4, 0]]) { Y.kutu(w, 0.22 * s, d, x, Z, z, 'tasBlok', siva); kirem(Y, S, { x0: x, z0: z, w, d, y: Z + 0.22 * s, H: 0.1 * s, oh: 0.04 }); void ry; }
    Y.silindir(0.1, 0.1, 0.02, 8, -0.1, Z, 0.06, 'tasBlok', S.tasAcik); Y.silindir(0.08, 0.08, 0.012, 8, -0.1, Z + 0.015, 0.06, 'duz', SU);
    Y.prizma(kemerProfil(0.1, 0.15, 4), 0, 0.02, 'z', 0.0, Z, -0.115, 'tahta', 0x4a2e1c); agac(Y, -0.3, 0.3, Z, 'zeytin', 0.9); kup(Y, S, 0.3, 0.35, Z, 0.7);
  }
}

// ===================== MERMER OCAĞI (2×2) =====================
export function mermerOcagi(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 2), s = c.s;
  const mermerBlok = (x, z, w, h, d, ry = 0) => Y.kutu(w, h, d, x, Z, z, 'mermer', S.tasAcik, { ry });
  const vinç = (x, z, ry) => { const A = Y.alt(x, z, ry); for (const sx of [-1, 1]) A.kiris([sx * 0.1, Z, 0], [0, Z + 0.46, 0], 0.03, 0.03, 'kutuk', S.kiris); A.kiris([-0.3, Z + 0.44, 0], [0.3, Z + 0.4, 0], 0.025, 0.025, 'kutuk', S.kirisAcik); A.kutu(0.003, 0.2, 0.003, 0.26, Z + 0.28, 0, 'duz', 0xb09a70); A.kutu(0.07, 0.07, 0.07, 0.26, Z + 0.2, 0, 'mermer', S.tasAcik); A.silindir(0.07, 0.07, 0.03, 10, -0.0, Z + 0.34, 0.0, 'tahta', 0x8a5a32, { rx: PI / 2 }); };
  if (vr === 0) {
    for (let i = 0; i < 4; i++) Y.kutu(1.5 - i * 0.24, 0.12 * s, 0.9 - i * 0.16, 0.0, Z + i * 0.12 * s, -0.4 - i * 0.05, 'mermer', carp(S.tasAcik, 0.9 + i * 0.03));
    mermerBlok(-0.4, 0.45, 0.34, 0.14, 0.22, 0.2); mermerBlok(0.0, 0.62, 0.3, 0.12, 0.2, -0.1); mermerBlok(0.45, 0.4, 0.34, 0.16, 0.24, 0.3); vinç(-0.7, 0.3, 0.4);
    Y.kiris([0.3, Z, 0.85], [0.8, Z + 0.1, 0.85], 0.05, 0.02, 'kutuk', S.kiris); komurYigini(Y, 0.7, 0.7, Z, 1.3, 0xd8d4c8);
  } else if (vr === 1) {
    for (let i = 0; i < 5; i++) Y.silindir(0.1, 0.1, 0.07, 10, -0.5 + i * 0.22, Z + 0.1, 0.1, 'mermer', S.tasAcik, { rz: PI / 2 });
    for (let i = 0; i < 4; i++) Y.silindir(0.09, 0.09, 0.2, 9, -0.5 + i * 0.3, Z + 0.09 - 0.1, 0.5, 'mermer', S.tasAcik, { rz: PI / 2 });
    Y.kiris([0.6, Z, -0.6], [0.0, Z + 0.34, -0.1], 0.2, 0.02, 'tahta', 0x8a6238);
    mermerBlok(-0.5, -0.5, 0.5, 0.3, 0.4, 0.2); mermerBlok(0.2, -0.6, 0.6, 0.4, 0.4, -0.1); vinç(0.6, 0.55, -0.4);
  } else {
    Y.silindir(0.7, 0.74, 0.1, 11, 0.0, Z - 0.08, -0.1, 'mermer', 0xb4b0a4, { yumusak: false }); Y.silindir(0.5, 0.52, 0.1, 11, 0.0, Z - 0.16, -0.1, 'mermer', 0xa8a498, { yumusak: false });
    for (const [x, z] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.1], [0.35, 0.1]]) Y.kutu(0.04, 0.5, 0.04, x, Z, z, 'kutuk', S.kiris);
    for (const z of [-0.3, 0.1]) Y.kutu(0.74, 0.03, 0.04, 0.0, Z + 0.3, z, 'kutuk', S.kirisAcik); for (const x of [-0.35, 0.35]) Y.kutu(0.04, 0.03, 0.44, x, Z + 0.5, -0.1, 'kutuk', S.kirisAcik);
    Y.kutu(0.14, 0.56, 0.14, 0.0, Z - 0.1, -0.1, 'mermer', S.tasAcik, { arka: true }); Y.koni(0.1, 0.06, 4, 0.0, Z + 0.46, -0.1, 'mermer', S.tasAcik, { ry: PI / 4 });
    mermerBlok(-0.6, 0.55, 0.3, 0.12, 0.2, 0.3); mermerBlok(0.55, 0.5, 0.34, 0.14, 0.22, -0.2); vinç(0.0, 0.7, 0.0);
  }
}

// ===================== LİMAN (2×2) =====================
function gemi(Y, S, x, z, ry, boy = 0.7, yelken = true, renk = 0x8a5a32, yb = 0) {
  const A = Y.alt(x, z, ry, yb); // yb: su yüzeyi yüksekliği
  A.ekle(new THREE.SphereGeometry(1, 10, 6, 0, PI * 2, PI / 2, PI / 2), 0, 0.06, 0, 'tahta', renk, { sx: boy / 2, sy: 0.07, sz: 0.11, yumusak: true });
  A.kutu(boy * 0.86, 0.016, 0.16, 0, 0.055, 0.0, 'tahta', 0xa8854e);
  A.koni(0.03, 0.12, 4, boy / 2 + 0.01, 0.07, 0, 'tahta', renk, { rz: -PI / 2 + 0.2 });
  A.kutu(0.05, 0.08, 0.1, -boy / 2 + 0.05, 0.065, 0, 'tahta', renk);
  if (yelken) { A.kutu(0.012, 0.36, 0.012, 0.02, 0.06, 0, 'kutuk', S.kiris); A.kutu(0.01, 0.01, 0.3, 0.02, 0.38, 0, 'kutuk', S.kiris); A.kutu(0.012, 0.26, 0.28, 0.025, 0.1, 0, 'kumas', 0xe8dcc0); A.kutu(0.013, 0.26, 0.05, 0.026, 0.1, -0.06, 'kumas', 0xb03a2e); }
  if (!Y.k.lod) for (let i = 0; i < 4; i++) for (const sz of [-1, 1]) A.kiris([-boy * 0.3 + i * boy * 0.18, 0.09, sz * 0.09], [-boy * 0.3 + i * boy * 0.18 - 0.03, 0.04, sz * 0.2], 0.006, 0.006, 'kutuk', 0x6a4a30);
}
export function liman(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 2), s = c.s;
  const su = (x, z, w, d) => { Y.kutu(w, 0.04, d, x, Z, z, 'duz', SU); };
  const rihtim = (x, z, w, d) => { Y.kutu(w, 0.07, d, x, Z, z, 'tasBlok', S.tasAcik); };
  const baba = (x, z) => { Y.silindir(0.02, 0.026, 0.06, 6, x, Z + 0.07, z, 'duz', 0x3a3632); };
  if (vr === 0) {
    su(0.3, 0.0, 1.3, 2.0); Y.kutu(0.5, 0.07, 1.7, -0.75, Z, 0.0, 'tasBlok', S.tasAcik);
    Y.kutu(0.44, 0.26 * s, 0.66, -0.7, Z + 0.07, -0.45, 'tasBlok', S.siva[0]); kirem(Y, S, { x0: -0.7, z0: -0.45, w: 0.48, d: 0.7, y: Z + 0.07 + 0.26 * s, H: 0.13 * s });
    for (const z of [-0.25, -0.6]) Y.prizma(kemerProfil(0.1, 0.16, 4), 0, 0.02, 'z', -0.48, Z + 0.07, z, 'duz', 0x1c1410, { ry: PI / 2 });
    gemi(Y, S, 0.3, 0.1, PI / 2 - 0.1, 0.8, true, 0x8a5a32, Z + 0.02); for (let i = 0; i < 4; i++) baba(-0.52, -0.2 + i * 0.35);
    for (let i = 0; i < 3; i++) kup(Y, S, -0.8 + i * 0.1, 0.45, Z + 0.07, 0.6); cuvalYigini(Y, S, -0.78, 0.15, Z + 0.07, 0.3);
    const A = Y.alt(-0.7, 0.62, 0); for (const sx of [-1, 1]) A.kiris([sx * 0.07, Z + 0.07, 0], [0, Z + 0.5, 0], 0.03, 0.03, 'kutuk', S.kiris); A.kiris([-0.0, Z + 0.46, 0], [0.34, Z + 0.4, 0], 0.025, 0.025, 'kutuk', S.kirisAcik);
  } else if (vr === 1) {
    su(0.0, 0.0, 2.0, 2.0); rihtim(-0.8, 0.0, 0.4, 2.0);
    Y.kutu(0.2, 0.1, 1.2, 0.4, Z + 0.0, -0.2, 'tasBlok', S.tas); for (let i = 0; i < 7; i++) Y.kutu(0.1, 0.05, 0.1, 0.4, Z + 0.1, -0.76 + i * 0.19, 'tasBlok', S.tasAcik);
    Y.silindir(0.1, 0.14, 0.4 * s, 8, 0.4, Z + 0.1, -0.78, 'tasBlok', S.tasKrem ?? S.tasAcik); Y.silindir(0.13, 0.1, 0.03, 8, 0.4, Z + 0.1 + 0.4 * s, -0.78, 'tasBlok', S.tasAcik);
    Y.koni(0.07, 0.07, 6, 0.4, Z + 0.13 + 0.4 * s, -0.78, 'duz', 0xff7a2a, { isil: true });
    gemi(Y, S, -0.3, -0.4, 0.0, 0.5, true, 0x7a5030, Z + 0.02); gemi(Y, S, 0.05, 0.5, PI / 2 + 0.2, 0.45, false, 0xa8854e, Z + 0.02); gemi(Y, S, 0.7, 0.55, PI / 2, 0.4, true, 0x8a5a32, Z + 0.02);
    for (let i = 0; i < 3; i++) baba(-0.62, -0.5 + i * 0.5);
  } else {
    Y.kutu(2.0, 0.07, 0.9, 0.0, Z, 0.55, 'tasBlok', S.tasAcik); su(0.0, -0.45, 2.0, 1.1);
    for (let i = 0; i < 6; i++) Y.kutu(0.07, 0.03, 0.6, -0.5 + i * 0.2, Z + 0.03 + 0.0, 0.08 + 0.0, 'tahta', 0x7a5634, { rx: 0.0, arka: true });
    gemi(Y, S, 0.1, -0.35, 0.2, 1.0, true, 0x7a5030, Z + 0.02);
    Y.kutu(0.5, 0.24 * s, 0.4, -0.7, Z + 0.07, 0.6, 'tasBlok', S.siva[0]); kirem(Y, S, { x0: -0.7, z0: 0.6, w: 0.54, d: 0.44, y: Z + 0.07 + 0.24 * s, H: 0.12 * s });
    for (let i = 0; i < 4; i++) kup(Y, S, 0.1 + i * 0.12, 0.7, Z + 0.07, 0.7); cuvalYigini(Y, S, 0.7, 0.5, Z + 0.07, 0.2); arabaKasa(Y, S, 0.4, 0.5, Z + 0.07, 0.4); for (let i = 0; i < 4; i++) baba(-0.5 + i * 0.5, 0.2);
  }
}

// ===================== SU KEMERİ (2×2) =====================
function kemerAyaklari(Y, S, o) { // çift taraflı kemer sırası (x boyunca), çerçeve y'ye göre
  const { x0, x1, z, y, h, adet, kal = 0.2, ust = 0.05 } = o;
  const g = (x1 - x0) / adet, R = Math.min(g * 0.4, h * 0.46), seg = Y.k.lod ? 3 : 5;
  for (let i = 0; i <= adet; i++) Y.kutu(g * 0.2, h - R, kal, x0 + i * g, y, z, 'tasBlok', S.tasKrem);
  for (let i = 0; i < adet; i++) {
    const cx = x0 + (i + 0.5) * g, by = y + h - R;
    for (let q = 0; q < seg; q++) { const a0 = (q / seg) * PI, a1 = ((q + 1) / seg) * PI, ri = R * 0.78, ro = R * 1.0; const poly = [[cx + Math.cos(a0) * ro, by + Math.sin(a0) * ro], [cx + Math.cos(a1) * ro, by + Math.sin(a1) * ro], [cx + Math.cos(a1) * ri, by + Math.sin(a1) * ri], [cx + Math.cos(a0) * ri, by + Math.sin(a0) * ri]]; Y.prizma(poly, z - kal / 2, z + kal / 2, 'z', 0, 0, 0, 'tasBlok', S.tasKrem); }
    Y.kutu(g - g * 0.2 + 0.0, h - R - (by - y) + R * 0.0 + 0.0 + (by - y) - (h - R) + 0.0 + R * 0.28 + 0.02, kal, cx, by + R * 0.98, z, 'tasBlok', S.tasKrem);
  }
  Y.kutu(x1 - x0 + g * 0.2, ust, kal + 0.03, (x0 + x1) / 2, y + h, z, 'tasBlok', S.tasAcik);
}
export function suKemeri(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 2), s = c.s;
  const oluk = (x0, x1, z, y) => { Y.kutu(x1 - x0 + 0.1, 0.09, 0.2, (x0 + x1) / 2, y, z, 'tasBlok', S.tasAcik); Y.kutu(x1 - x0 + 0.06, 0.03, 0.14, (x0 + x1) / 2, y + 0.07, z, 'duz', SU); };
  if (vr === 0) {
    kemerAyaklari(Y, S, { x0: -0.85, x1: 0.85, z: 0.0, y: Z, h: 0.62 * s, adet: 5 }); oluk(-0.85, 0.85, 0.0, Z + 0.62 * s + 0.05);
    Y.kutu(0.26, 0.12, 0.34, -0.85, Z, 0.0, 'tasBlok', S.tas); Y.kutu(0.26, 0.12, 0.34, 0.85, Z, 0.0, 'tasBlok', S.tas); agac(Y, -0.6, 0.6, Z, 'zeytin', 1.0); kup(Y, S, 0.5, 0.55, Z, 0.8);
  } else if (vr === 1) {
    kemerAyaklari(Y, S, { x0: -1.0, x1: 1.0, z: 0.0, y: Z, h: 0.4 * s, adet: 5, ust: 0.04 });
    kemerAyaklari(Y, S, { x0: -0.8, x1: 0.8, z: 0.0, y: Z + 0.4 * s + 0.04, h: 0.34 * s, adet: 4, ust: 0.04 }); oluk(-0.8, 0.8, 0.0, Z + 0.78 * s + 0.08);
  } else {
    kemerAyaklari(Y, S, { x0: -1.0, x1: 0.2, z: -0.2, y: Z, h: 0.5 * s, adet: 3 }); oluk(-1.0, 0.2, -0.2, Z + 0.5 * s + 0.05);
    Y.kutu(0.44, 0.34 * s, 0.4, 0.45, Z, -0.2, 'tasBlok', S.tasKrem); Y.kutu(0.5, 0.03, 0.46, 0.45, Z + 0.34 * s, -0.2, 'tasBlok', S.tasAcik); Y.kutu(0.34, 0.03, 0.3, 0.45, Z + 0.37 * s, -0.2, 'duz', SU);
    for (let i = 0; i < 3; i++) Y.kutu(0.04, 0.12, 0.02, 0.32 + i * 0.12, Z + 0.1 * s, 0.01, 'duz', 0x2a1e14, { arka: true });
    cesme(Y, S, 0.5, 0.55, Z, 0.16); Y.kutu(0.5, 0.04, 0.1, 0.4, Z, 0.25, 'duz', SU, { arka: true }); agac(Y, -0.4, 0.6, Z, 'selvi', 1.0);
  }
}

// ===================== HAMAM (2×2) =====================
export function hamam(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 2), s = c.s;
  const salon = (x, z, w, d, h, r, renk) => { Y.kutu(w, h, d, x, Z, z, 'tasBlok', S.tasKrem ?? S.tasAcik); Y.kutu(w + 0.04, 0.025, d + 0.04, x, Z + h, z, 'tasBlok', S.tasAcik); kucukKubbe(Y, S, x, z, Z + h + 0.01, r, renk); };
  const portalHam = (x, z) => { Y.prizma(kemerProfil(0.18, 0.28, 5), 0, 0.03, 'z', x, Z, z, 'tahta', 0x4a2e1c); for (const sx of [-1, 1]) Y.kutu(0.04, 0.26, 0.05, x + sx * 0.11, Z, z - 0.0, 'tasBlok', S.tasAcik); Y.kutu(0.3, 0.04, 0.06, x, Z + 0.28, z, 'tasBlok', S.tasAcik); };
  if (vr === 0) {
    salon(-0.3, -0.35, 0.7, 0.6, 0.3 * s, 0.26, 0x8a9aa8); salon(0.5, -0.4, 0.5, 0.5, 0.26 * s, 0.2, 0x9aa8b4); salon(0.0, 0.3, 0.6, 0.4, 0.24 * s, 0.17, 0x8a9aa8);
    portalHam(0.0, 0.5); Y.silindir(0.05, 0.06, 0.55 * s, 7, -0.7, Z, -0.55, 'tasBlok', S.tas); Y.silindir(0.065, 0.05, 0.03, 7, -0.7, Z + 0.55 * s, -0.55, 'tasBlok', S.tasAcik); dumanNokta(Y, -0.7, Z + 0.6 * s, -0.55, 1.1);
    for (const [x, z] of [[0.0, -0.35], [-0.3, -0.35]]) for (let i = 0; i < 4 && !k.lod; i++) Y.kutu(0.02, 0.02, 0.02, x - 0.15 + i * 0.1, Z + 0.3 * s + 0.2, z, 'duz', 0xffe8a0, { isil: true });
  } else if (vr === 1) {
    Y.kutu(0.9, 0.32 * s, 0.7, -0.15, Z, -0.3, 'tasBlok', S.tasKrem ?? S.tasAcik);
    for (let i = 0; i < 3; i++) Y.silindir(0.2, 0.2, 0.9, 10, -0.15, Z + 0.32 * s - 0.2 - 0.0, -0.3, 'tasBlok', S.tasAcik, { rz: PI / 2 }); // beşik tonoz
    Y.silindir(0.04, 0.05, 0.6 * s, 7, 0.55, Z, -0.55, 'tasBlok', S.tas); dumanNokta(Y, 0.55, Z + 0.62 * s, -0.55, 1.1);
    Y.kutu(0.7, 0.06, 0.5, 0.0, Z, 0.5, 'tasBlok', S.tasAcik); Y.kutu(0.56, 0.02, 0.36, 0.0, Z + 0.05, 0.5, 'duz', SU);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.silindir(0.016, 0.02, 0.2, 7, sx * 0.32, Z, 0.5 + sz * 0.2, 'mermer', S.tasAcik);
    Y.prizma(kemerProfil(0.16, 0.24, 5), 0, 0.03, 'z', -0.15, Z, 0.055, 'tahta', 0x4a2e1c);
  } else {
    Y.kutu(0.9, 0.04, 0.5, 0.0, Z, 0.5, 'mermer', S.tasAcik); sutunlar(Y, S, [-0.4, -0.15, 0.1, 0.35].map((x) => [x, 0.68]), Z + 0.04, 0.26 * s); Y.kutu(0.96, 0.05, 0.1, -0.02, Z + 0.3 * s + 0.04, 0.68, 'mermer', S.tasAcik);
    for (let i = 0; i < 5; i++) { const x = -0.7 + i * 0.35; Y.kutu(0.3, 0.26 * s, 0.5, x, Z, -0.2, 'tasBlok', S.tasKrem ?? S.tasAcik); kucukKubbe(Y, S, x, -0.2, Z + 0.26 * s + 0.01, 0.14, i % 2 ? 0x8a9aa8 : 0x9aa8b4); }
    Y.silindir(0.05, 0.06, 0.5 * s, 7, 0.85, Z, -0.2, 'tasBlok', S.tas); dumanNokta(Y, 0.85, Z + 0.52 * s, -0.2, 1.0);
    Y.prizma(kemerProfil(0.14, 0.22, 5), 0, 0.03, 'z', -0.02, Z + 0.04, 0.43, 'tahta', 0x4a2e1c);
  }
}

// ===================== KÜTÜPHANE (2×2) =====================
export function kutuphane(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 2), s = c.s;
  const basamak = (x, z, w, n = 3) => { for (let i = 0; i < n; i++) Y.kutu(w + (n - i) * 0.06, 0.03, 0.2 - i * 0.04, x, Z + i * 0.03, z - i * 0.0, 'mermer', i % 2 ? S.tasAcik : S.tasKrem ?? S.tasAcik); };
  const kucukPen = (x, y, z, ry = 0) => pencere(Y.alt(x, z, ry), S, { x: 0, y, w: 0.07, h: 0.14, tip: 'kemer', panjur: null, isikli: true });
  if (vr === 0) {
    Y.kutu(0.9, 0.04, 0.8, 0, Z, 0.0, 'mermer', S.tasAcik);
    Y.silindir(0.34, 0.36, 0.34 * s, 12, 0.0, Z + 0.04, -0.2, 'tasBlok', S.tasKrem ?? S.tasAcik); kucukKubbe(Y, S, 0.0, -0.2, Z + 0.04 + 0.34 * s, 0.34, 0x8a9aa8);
    sutunCephe(Y, S, { x: 0.0, z: 0.28, y: Z + 0.04, w: 0.62, h: 0.3 * s, adet: 5, derin: 0.16 }); Y.kutu(0.66, 0.3 * s, 0.1, 0.0, Z + 0.04, 0.14, 'tasBlok', S.tasKrem ?? S.tasAcik); basamak(0.0, 0.5, 0.6);
    Y.prizma(kemerProfil(0.12, 0.2, 5), 0, 0.02, 'z', 0.0, Z + 0.04, 0.2, 'tahta', 0x4a2e1c); for (const sx of [-1, 1]) kucukPen(sx * 0.22, Z + 0.1, 0.2); for (let i = 0; i < 4; i++) { const a = -0.8 + i * 0.5; kucukPen(Math.sin(a + 0.0) * 0.36, Z + 0.14, -0.2 + Math.cos(a) * 0.36, a); }
  } else if (vr === 1) {
    Y.kutu(0.95, 0.3 * s, 0.7, 0.0, Z, -0.2, 'tasBlok', S.tasKrem ?? S.tasAcik); catiBesik(Y, { x0: 0, z0: -0.2, w: 1.0, d: 0.74, y: Z + 0.3 * s, H: 0.14 * s, oh: 0.05, rake: 0.04, kal: 0.022, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false });
    Y.silindir(0.2, 0.2, 0.3 * s, 8, 0.0, Z, -0.55, 'tasBlok', S.tasKrem ?? S.tasAcik); Y.silindir(0.0, 0.25, 0.15, 8, 0.0, Z + 0.3 * s, -0.55, 'kiremit', S.kiremit[0], { yumusak: false });
    sutunCephe(Y, S, { x: 0.0, z: 0.22, y: Z, w: 0.7, h: 0.26 * s, adet: 6, derin: 0.14, alinlik: false }); basamak(0.0, 0.42, 0.7, 4);
    for (const x of [-0.3, 0.0, 0.3]) kucukPen(x, Z + 0.08, 0.15);
  } else {
    Y.kutu(1.0, 0.04, 0.8, 0, Z, 0, 'mermer', S.tasAcik); Y.kutu(0.9, 0.2 * s, 0.5, 0.0, Z + 0.04, -0.2, 'tasBlok', S.tasKrem ?? S.tasAcik);
    Y.kutu(0.7, 0.16 * s, 0.4, 0.0, Z + 0.04 + 0.2 * s, -0.2, 'tasBlok', S.tasKrem ?? S.tasAcik); catiBesik(Y, { x0: 0, z0: -0.2, w: 0.74, d: 0.44, y: Z + 0.04 + 0.36 * s, H: 0.1, oh: 0.04, rake: 0.03, kal: 0.02, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false });
    for (const x of [-0.25, 0.0, 0.25]) kucukPen(x, Z + 0.04 + 0.22 * s, 0.01);
    sutunlar(Y, S, [-0.4, -0.2, 0.0, 0.2, 0.4].map((x) => [x, 0.16]), Z + 0.04, 0.2 * s); Y.kutu(0.96, 0.04, 0.1, 0.0, Z + 0.04 + 0.2 * s + 0.016, 0.16, 'mermer', S.tasAcik); basamak(0.0, 0.34, 0.8, 3);
    kucukPen(-0.3, Z + 0.1, 0.03); kucukPen(0.3, Z + 0.1, 0.03);
  }
}

// ===================== TİYATRO (3×3) =====================
export function tiyatro(k, c, vr = 0) {
  const S = c.stil, { Z, Y } = ctx(k, 3), s = c.s;
  const cavea = (cx, cz, r0, sira, h, a0, a1) => {
    for (let i = 0; i < sira; i++) {
      const r = r0 + i * 0.075, n = Math.max(6, Math.round((a1 - a0) * r / (Y.k.lod ? 0.22 : 0.12)));
      for (let j = 0; j < n; j++) { const a = a0 + ((j + 0.5) / n) * (a1 - a0); const w = ((a1 - a0) * r / n) * 1.05; Y.kutu(0.075, h + i * 0.045, w, cx + Math.cos(a) * r, Z, cz + Math.sin(a) * r, 'tasBlok', (j + i) % 2 ? S.tasAcik : S.tasKrem ?? S.tasAcik, { ry: -a }); }
    }
  };
  const sahne = (x, z, w, d, h) => { Y.kutu(w, h, d, x, Z, z, 'tasBlok', S.tasKrem ?? S.tasAcik); Y.kutu(w + 0.04, 0.03, d + 0.04, x, Z + h, z, 'tasBlok', S.tasAcik); for (let i = 0; i < 5; i++) { Y.prizma(kemerProfil(0.1, 0.16, 4), 0, 0.02, 'z', x - w * 0.4 + i * w * 0.2, Z + 0.0, z + d / 2, 'duz', 0x2a2018); } sutunlar(Y, S, Array.from({ length: 6 }, (_, i) => [x - w * 0.45 + i * w * 0.18, z + d / 2 + 0.04]), Z + h + 0.03, 0.16 * s); Y.kutu(w, 0.04, 0.08, x, Z + h + 0.19 * s, z + d / 2 + 0.04, 'mermer', S.tasAcik); };
  if (vr === 0) {
    Y.silindir(1.3, 1.34, 0.05, 20, 0.0, Z, 0.0, 'tasBlok', S.tas);
    cavea(0.0, 0.0, 0.34, 11, 0.04, 0.0, PI * 2);   // AMFİTİYATRO: tam halka, ortada kumlu arena, iki ucunda giriş kemeri
    Y.silindir(0.32, 0.32, 0.012, 14, 0.0, Z, 0.0, 'toprak', 0xc8a870);
    for (const sz of [-1, 1]) Y.prizma(kemerProfil(0.16, 0.2, 5), 0, 0.03, 'z', 0.0, Z, sz * 1.18, 'duz', 0x2a2018, { ry: sz > 0 ? 0 : PI });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + 0.2; Y.silindir(0.012, 0.015, 0.34, 5, Math.cos(a) * 1.22, Z, Math.sin(a) * 1.22, 'kutuk', S.kiris); Y.kutu(0.045, 0.05, 0.045, Math.cos(a) * 1.22, Z + 0.34, Math.sin(a) * 1.22, 'duz', 0xff9a30, { isil: true }); }
  } else if (vr === 1) {
    Y.silindir(1.3, 1.34, 0.05, 20, 0.0, Z, 0.0, 'tasBlok', S.tas);
    cavea(0.0, 0.15, 0.4, 9, 0.04, PI * 1.02, PI * 1.98);
    Y.silindir(0.4, 0.4, 0.05, 12, 0.0, Z, 0.15, 'mermer', S.tasAcik);
    sahne(0.0, 0.95, 1.4, 0.36, 0.36 * s); for (let i = 0; i < 5; i++) kup(Y, S, -0.5 + i * 0.25, -1.2, Z, 0.5);
  } else {
    Y.kutu(2.4, 0.05, 2.4, 0.0, Z, 0.0, 'tasBlok', S.tas);
    cavea(0.0, 0.3, 0.38, 9, 0.04, PI * 1.05, PI * 1.95); for (let i = 0; i < 9; i++) { const a = PI * 1.07 + i * 0.2; Y.kutu(0.07, 0.5 * s, 0.07, Math.cos(a) * 1.15, Z, 0.3 + Math.sin(a) * 1.15, 'tasBlok', S.tasKrem ?? S.tasAcik); }
    Y.kutu(0.66, 0.012, 0.66, 0.0, Z + 0.05, 0.3, 'toprak', 0xc8a870, { arka: true }); sahne(0.0, 0.95, 1.5, 0.3, 0.3 * s);
    for (const sx of [-1, 1]) { Y.silindir(0.01, 0.013, 0.34, 5, sx * 0.9, Z, 1.1, 'kutuk', S.kiris); Y.kutu(0.06, 0.12, 0.008, sx * 0.9 + 0.04, Z + 0.26, 1.1, 'kumas', sx > 0 ? 0xb03a2e : 0x2f5f8a); }
  }
}
void catiTek; void kemerSirasi; void pencere; void cuvalYigini;

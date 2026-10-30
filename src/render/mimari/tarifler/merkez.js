// Merkez binalar (2×2, çağın kimliği): Kamp Ateşi (göçebe), Ocak Meydanı (taş devri), Köy Meydanı (bronz), Agora (antik), Şehir Meydanı (Orta Çağ). 3 varyant.
// Her biri çağının "yerleşim çekirdeği": ateş çemberi → ortak ocak → köy meydanı → stoa/çeşme → belediye + saat kulesi. Merkezler 1.3 ölçekle çizilir (binalar.js).
import * as THREE from 'three';
import { Yerel, kemerProfil } from '../geometri.js';
import { catiBesik, catiTek } from '../cati.js';
import { kanat } from '../kanat.js';
import { tipi, yuvarlakKulube, sepet, kutukTomruk, totemYuzu, boynuz } from '../parcalar_ilkel.js';
import { atesNokta, dumanNokta, sutunCephe, cakmakTasi } from '../parcalar_atolye.js';
import { deriBarinak } from '../parcalar_atolye.js';
import { kuyu, cesme, fici, saman, agac } from '../parcalar_avlu.js';
import { cuvalYigini } from '../parcalar_su.js';
import { kup } from '../parcalar_tarim.js';
import { tabelaDirek } from '../parcalar_han.js';
import { saatKulesi, flama, kademeliAlin, kemerSirasi } from '../parcalar_lonca.js';
import { portal } from '../parcalar_anit.js';
import { pencere } from '../parcalar.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;
const KUTUK = 0x6b4a2c, KUTUK_A = 0x7a5634;

function atesCemberi(Y, x, z, y, r = 0.12, n = 9, buyuk = 1) {
  for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; Y.kure(0.035 * buyuk + (i % 3) * 0.006, x + Math.cos(a) * r, y + 0.035, z + Math.sin(a) * r, 'moloz', [0x7d7870, 0x8f8a80][i % 2]); }
  for (let i = 0; i < 4; i++) Y.silindir(0.016, 0.016, 0.2 * buyuk, 5, x, y + 0.04, z, 'kutuk', 0x4a3220, { rz: PI / 2 - 0.35, ry: (i / 4) * PI * 2 });
  Y.koni(0.07 * buyuk, 0.07, 6, x, y, z, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, x, y + 0.06, z, 1.3 * buyuk);
}
function oturak(Y, x, z, y, ry = 0) { const A = Y.alt(x, z, ry); A.silindir(0.04, 0.04, 0.22, 7, 0, y + 0.04 - 0.11, 0, 'kutuk', KUTUK_A, { rz: PI / 2 }); }
const ctx = (k) => ({ Z: k.kaide(2, 'tas'), Y: new Yerel(k, 0, 0, 0, 0) });
const zemin = (Y, y, r, renk, n = 14) => Y.silindir(r, r * 1.02, 0.014, n, 0, y, 0, 'toprak', renk);

// ===================== KAMP ATEŞİ =====================
export function kampAtesi(k, c, vr = 0) {
  const { Y } = ctx(k), Z = k.kaide(2, 'toprak'), s = c.s, S = c.stil;
  const tri = (x, z, r, h, renk, kusak) => tipi(Y, { x, z, y: Z, r, h, renk, kusak });
  if (vr === 0) {
    atesCemberi(Y, 0.0, 0.05, Z, 0.16, 10, 1.4); for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.3; oturak(Y, Math.cos(a) * 0.36, 0.05 + Math.sin(a) * 0.36, Z, -a); }
    for (let i = 0; i < 3; i++) Y.kiris([Math.cos(i * 2.1) * 0.13, Z, 0.05 + Math.sin(i * 2.1) * 0.13], [0, Z + 0.34, 0.05], 0.014, 0.014, 'kutuk', KUTUK);
    Y.silindir(0.06, 0.05, 0.06, 8, 0, Z + 0.22, 0.05, 'duz', 0x3a3632);
    tri(-0.65, -0.55, 0.26, 0.46 * s, 0xc9a57a, 0xa8432f); tri(0.7, -0.4, 0.22, 0.38, 0xb89860, 0x2f5f8a); tri(0.55, 0.7, 0.2, 0.34, 0xd8b890, 0x5a8a4a);
    dumanNokta(Y, 0, Z + 0.34, 0.05, 1.2);
  } else if (vr === 1) {
    atesCemberi(Y, 0.0, 0.0, Z, 0.14, 9, 1.3); for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; oturak(Y, Math.cos(a) * 0.34, Math.sin(a) * 0.34, Z, -a + 0.3); }
    for (const sx of [-1, 1]) Y.kutu(0.025, 0.4, 0.025, sx * 0.3, Z, -0.7, 'kutuk', KUTUK); Y.kutu(0.64, 0.02, 0.02, 0.0, Z + 0.4, -0.7, 'kutuk', KUTUK_A);
    for (let i = 0; i < 6; i++) Y.kutu(0.04, 0.16 + (i % 3) * 0.03, 0.012, -0.24 + i * 0.1, Z + 0.22 - (i % 3) * 0.015, -0.7, 'duz', [0xb86a50, 0xd8b890][i % 2]);
    tri(-0.75, 0.35, 0.24, 0.42, 0xc9a57a, 0x4a4038); sepet(Y, 0.6, 0.5, Z, 1.3); sepet(Y, 0.75, 0.4, Z, 1.1); cakmakTasi(Y, 0.7, -0.45, Z, 6, 1.3);
  } else {
    atesCemberi(Y, 0.0, 0.1, Z, 0.15, 10, 1.4); for (let i = 0; i < 3; i++) kutukTomruk(Y, Math.cos(i * 2.1 + 0.3) * 0.4, 0.1 + Math.sin(i * 2.1 + 0.3) * 0.4, Z, 0.4, i * 2.1 + 1.0, 0.04);
    totemYuzu(Y, -0.7, Z, -0.5, 0.14, 0.26, 0xb6402a, 0.3); totemYuzu(Y, -0.7, Z + 0.26, -0.5, 0.12, 0.22, 0x2f6f9a, 0.3); boynuz(Y, -0.7, Z + 0.52, -0.5, 1.3);
    tri(0.55, -0.5, 0.26, 0.46 * s, 0xb89860, 0x5a8a4a); tri(0.75, 0.5, 0.2, 0.34, 0xc9a57a, 0xa8432f);
    for (let i = 0; i < 4; i++) Y.kiris([-0.3 + i * 0.1, Z + 0.0, 0.7], [-0.26 + i * 0.1, Z + 0.3, 0.64], 0.01, 0.01, 'kutuk', KUTUK);
  }
}

// ===================== OCAK MEYDANI =====================
export function ocakMeydani(k, c, vr = 0) {
  const { Y } = ctx(k), Z = k.kaide(2, 'toprak'), s = c.s, S = c.stil;
  const taslar = (x, z, r, n, h = 0.34) => { for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; Y.kutu(0.1, h * (0.8 + (i % 3) * 0.15), 0.07, x + Math.cos(a) * r, Z, z + Math.sin(a) * r, 'moloz', [0x9a9486, 0xa8a292, 0x8f8a80][i % 3], { ry: -a + PI / 2 }); } };
  if (vr === 0) {
    yuvarlakKulube(Y, { x: -0.45, z: -0.45, y: Z, r: 0.42, h: 0.28 * s, cat: 0.4 * s }); Y.silindir(0.0, 0.04, 0.4, 5, -0.45, Z + 0.28 * s + 0.4 * s - 0.02, -0.45, 'kutuk', KUTUK);
    atesCemberi(Y, 0.4, 0.3, Z, 0.17, 10, 1.5); dumanNokta(Y, 0.4, Z + 0.3, 0.3, 1.1); for (let i = 0; i < 4; i++) oturak(Y, 0.4 + Math.cos(i * 1.6) * 0.38, 0.3 + Math.sin(i * 1.6) * 0.38, Z, i);
    yuvarlakKulube(Y, { x: 0.65, z: -0.55, y: Z, r: 0.22, h: 0.16, cat: 0.2 }); cakmakTasi(Y, -0.6, 0.45, Z, 5, 1.3); sepet(Y, -0.35, 0.65, Z, 1.2);
  } else if (vr === 1) {
    taslar(0.0, 0.0, 0.8, 9); atesCemberi(Y, 0.0, 0.0, Z, 0.2, 11, 1.7); dumanNokta(Y, 0.0, Z + 0.35, 0.0, 1.3);
    for (let i = 0; i < 5; i++) oturak(Y, Math.cos(i * 1.3) * 0.45, Math.sin(i * 1.3) * 0.45, Z, -i * 1.3 + 0.5);
    deriBarinak(Y, S, { x: -0.6, z: -0.35, y: Z, w: 0.4, d: 0.3, h: 0.22, ry: 0.6 }); sepet(Y, 0.55, 0.6, Z, 1.2); kutukTomruk(Y, 0.5, -0.55, Z, 0.4, 0.4, 0.04);
  } else {
    // UZUN EV: iki sıra direkli, saman çatılı ortak salon + önünde ocak
    for (const sz of [-1, 1]) for (let i = 0; i < 4; i++) Y.kutu(0.05, 0.3 * s, 0.05, -0.55 + i * 0.37, Z, -0.4 + sz * 0.24, 'kutuk', KUTUK);
    Y.kutu(1.2, 0.26 * s, 0.48, 0.0, Z, -0.4, 'hasir', KUTUK_A);
    catiBesik(Y, { x0: 0, z0: -0.4, w: 1.3, d: 0.58, y: Z + 0.28 * s, H: 0.24 * s, oh: 0.07, rake: 0.06, kal: 0.03, kivrim: 0.03, renk: [0xd0aa58, 0xc8a050, 0xb89040], doku: 'saman', kabukRenk: KUTUK, th: 0.014, alin: false, satirUst: 3, satirAlt: 3 });
    Y.prizma(kemerProfil(0.18, 0.22, 4), 0, 0.02, 'z', 0.0, Z, -0.16, 'duz', 0x1c1410); boynuz(Y, 0.0, Z + 0.52 * s, -0.4, 1.5); dumanNokta(Y, 0.3, Z + 0.5 * s, -0.4, 1.0);
    atesCemberi(Y, 0.1, 0.35, Z, 0.17, 10, 1.5); taslar(0.1, 0.35, 0.62, 6, 0.22); cakmakTasi(Y, -0.6, 0.55, Z, 6, 1.3);
  }
}

// ===================== KÖY MEYDANI =====================
export function koyMeydani(k, c, vr = 0) {
  const { Y } = ctx(k), Z = k.kaide(2, 'tas'), s = c.s, S = c.stil;
  const siva = S.siva[vr % S.siva.length];
  const salon = (x, z, w, d, h, ry = 0) => { const A = Y.alt(x, z, ry); A.kutu(w, h, d, 0, Z, 0, 'kerpic', siva); A.kutu(w + 0.04, 0.035, d + 0.04, 0, Z + h, 0, 'kerpic', 0xb0906a); for (let i = 0; i < Math.round(w / 0.12); i++) A.silindir(0.016, 0.016, 0.08, 6, -w / 2 + 0.06 + i * 0.12, Z + h - 0.06, d / 2, 'kutuk', S.kirisAcik, { rx: PI / 2 }); A.prizma(kemerProfil(0.16, 0.24, 5), 0, 0.02, 'z', 0, Z, d / 2, 'tahta', 0x4a2e1c); A.kutu(0.22, 0.03, 0.05, 0, Z + 0.26, d / 2, 'kutuk', S.kiris); };
  if (vr === 0) {
    salon(-0.1, -0.55, 1.2, 0.5, 0.3 * s); kuyu(Y, S, 0.3, 0.3, Z); for (let i = 0; i < (k.lod ? 2 : 4); i++) kup(Y, S, -0.6 + i * 0.09, 0.45, Z, 0.9);
    Y.kutu(0.3, 0.1, 0.3, -0.35, Z, 0.2, 'tasBlok', S.tasAcik); Y.kutu(0.22, 0.04, 0.22, -0.35, Z + 0.1, 0.2, 'tasBlok', S.tas); Y.silindir(0.045, 0.05, 0.05, 8, -0.35, Z + 0.14, 0.2, 'duz', 0x3a3632); Y.koni(0.035, 0.05, 6, -0.35, Z + 0.19, 0.2, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, -0.35, Z + 0.21, 0.2, 0.9);
    cuvalYigini(Y, S, 0.7, -0.3, Z, 0.3); agac(Y, 0.75, 0.6, Z, 'zeytin', 1.0);
  } else if (vr === 1) {
    salon(-0.05, -0.6, 0.9, 0.46, 0.28 * s); salon(0.7, -0.15, 0.55, 0.4, 0.24 * s, -PI / 2);
    for (const [x, z, ry] of [[-0.5, 0.35, 0.2], [0.0, 0.55, -0.1], [0.5, 0.45, 0.3]]) { const A = Y.alt(x, z, ry); for (const sx of [-1, 1]) A.kutu(0.02, 0.2, 0.02, sx * 0.12, Z, 0, 'kutuk', S.kiris); if (!k.lod) A.kutu(0.26, 0.07, 0.07, 0, Z, 0.06, 'tahta', 0x8a6a44); A.prizma([[0, 0.22], [0.2, 0.0], [0.2, -0.04], [0, 0.18]], -0.14, 0.14, 'x', 0.0, Z, 0.0, 'kumas', [0xb03a2e, 0x2f5f8a, 0xe0b04a][Math.round(x * 5 + 3) % 3]); }
    kuyu(Y, S, -0.1, 0.1, Z); kup(Y, S, -0.7, 0.2, Z); kup(Y, S, -0.8, 0.28, Z, 0.8);
  } else {
    // MEYDAN: ortada sunak platformu (mabet işareti) + çevrede kerpiç ev sırası + sütunlu direk
    for (let i = 0; i < 3; i++) Y.kutu(0.7 - i * 0.14, 0.05, 0.7 - i * 0.14, 0.0, Z + i * 0.05, 0.0, 'tasBlok', i % 2 ? S.tas : S.tasAcik);
    Y.silindir(0.05, 0.06, 0.32 * s, 7, 0.0, Z + 0.15, 0.0, 'tasBlok', S.tasAcik); Y.kure(0.04, 0.0, Z + 0.15 + 0.32 * s + 0.03, 0.0, 'duz', S.altin);
    for (const [x, z, ry] of [[-0.75, -0.6, 0.0], [0.7, -0.65, 0.1], [-0.75, 0.65, 0.1]]) { const A = Y.alt(x, z, ry); A.kutu(0.4, 0.22 * s, 0.34, 0, Z, 0, 'kerpic', siva); A.kutu(0.44, 0.03, 0.38, 0, Z + 0.22 * s, 0, 'kerpic', 0xb0906a); A.prizma(kemerProfil(0.1, 0.15, 4), 0, 0.02, 'z', 0, Z, 0.17, 'tahta', 0x4a2e1c); }
    kuyu(Y, S, 0.6, 0.65, Z); cuvalYigini(Y, S, -0.3, 0.8, Z, 0.4); kup(Y, S, 0.2, 0.85, Z);
  }
}

// ===================== AGORA =====================
export function agora(k, c, vr = 0) {
  const { Y } = ctx(k), Z = k.kaide(2, 'tas'), s = c.s, S = c.stil;
  const stoa = (x, z, w, ry = 0) => { const A = Y.alt(x, z, ry); A.kutu(w + 0.06, 0.04, 0.34, 0, Z, 0, 'mermer', S.tasAcik); A.kutu(w, 0.28 * s, 0.16, 0, Z + 0.04, -0.07, 'tasBlok', S.tasKrem ?? S.tasAcik); catiTek(A, { x0: 0, z0: -0.03, w: w + 0.04, d: 0.3, y: Z + 0.34 * s, yuk: 0.07, oh: 0.03, rake: 0.03, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris }); const n = Math.round(w / 0.16); for (let i = 0; i <= n; i++) { A.silindir(0.02, 0.026, 0.26 * s, 8, -w / 2 + (w * i) / n, Z + 0.04, 0.1, 'mermer', S.tasAcik); A.kutu(0.06, 0.014, 0.06, -w / 2 + (w * i) / n, Z + 0.3 * s, 0.1, 'mermer', S.tasAcik); } A.kutu(w + 0.04, 0.035, 0.1, 0, Z + 0.31 * s, 0.1, 'mermer', S.tasAcik); };
  const heykel = (x, z) => { Y.kutu(0.14, 0.14, 0.14, x, Z, z, 'mermer', S.tasAcik); Y.kutu(0.1, 0.03, 0.1, x, Z + 0.14, z, 'mermer', S.tasAcik); Y.silindir(0.02, 0.03, 0.14, 7, x, Z + 0.17, z, 'mermer', 0xf0ece0); Y.kure(0.025, x, Z + 0.34, z, 'mermer', 0xf0ece0); };
  if (vr === 0) {
    stoa(0.0, -0.8, 1.9); cesme(Y, S, 0.0, 0.1, Z, 0.2); heykel(-0.6, 0.35); heykel(0.6, 0.35); for (let i = 0; i < 4; i++) Y.kutu(0.5 - i * 0.08, 0.03, 0.14, 0.0, Z + i * 0.03 - 0.0, 0.85 - i * 0.0, 'mermer', i % 2 ? S.tasAcik : S.tasKrem ?? S.tasAcik, { arka: true });
    agac(Y, -0.85, 0.7, Z, 'zeytin', 1.1); agac(Y, 0.85, 0.75, Z, 'selvi', 1.0);
  } else if (vr === 1) {
    stoa(0.0, -0.85, 1.8); stoa(-0.85, 0.0, 1.5, -PI / 2);
    Y.silindir(0.4, 0.42, 0.04, 14, 0.25, Z, 0.25, 'mermer', S.tasAcik); Y.silindir(0.3, 0.3, 0.012, 14, 0.25, Z + 0.04, 0.25, 'duz', 0x4a98bc); for (let i = 0; i < 4; i++) Y.silindir(0.02, 0.026, 0.2, 7, 0.25 + Math.cos(i * 1.57 + 0.78) * 0.34, Z + 0.04, 0.25 + Math.sin(i * 1.57 + 0.78) * 0.34, 'mermer', S.tasAcik);
    Y.silindir(0.04, 0.05, 0.2, 7, 0.25, Z + 0.04, 0.25, 'mermer', S.tasAcik); heykel(0.8, -0.2); agac(Y, 0.8, 0.8, Z, 'zeytin', 1.0);
  } else {
    // TAPINAK CEPHELİ AGORA: ortada küçük tholos/sunak + çevre sütun sırası
    for (let i = 0; i < 3; i++) Y.silindir(0.5 - i * 0.07, 0.52 - i * 0.07, 0.04, 12, 0.0, Z + i * 0.04, 0.0, 'mermer', S.tasAcik);
    const n = 8; for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; Y.silindir(0.02, 0.026, 0.26 * s, 8, Math.cos(a) * 0.3, Z + 0.12, Math.sin(a) * 0.3, 'mermer', S.tasAcik); Y.kutu(0.06, 0.014, 0.06, Math.cos(a) * 0.3, Z + 0.12 + 0.26 * s, Math.sin(a) * 0.3, 'mermer', S.tasAcik, { ry: -a }); }
    Y.silindir(0.34, 0.34, 0.03, 12, 0.0, Z + 0.12 + 0.26 * s + 0.014, 0.0, 'mermer', S.tasAcik); Y.silindir(0.0, 0.32, 0.16, 12, 0.0, Z + 0.17 + 0.26 * s, 0.0, 'kiremit', S.kiremit[0], { yumusak: false }); Y.kure(0.02, 0.0, Z + 0.33 + 0.26 * s, 0.0, 'duz', S.altin);
    stoa(0.0, -0.84, 1.7); heykel(-0.75, 0.5); heykel(0.75, 0.5);
  }
}

// ===================== ŞEHİR MEYDANI =====================
export function sehirMeydani(k, c, vr = 0) {
  const { Y } = ctx(k), Z = k.kaide(2, 'tas'), s = c.s, S = c.stil;
  const siva = S.siva[(vr + 2) % S.siva.length];
  const ev = (o) => kanat(Y, S, { Z, h1: 0.2, h2: 0.22 * s, H: 0.26 * s, renk: S.kiremit, doku: S.catiDoku, siva, ...o });
  if (vr === 0) {
    // BELEDİYE + SAAT KULESİ: arka geniş kanat, mahyada saat kulesi; önde çeşme
    const a = ev({ w: 1.4, d: 0.52, cx: 0.0, cz: -0.55, cikma: ['z+'], desen: 'carpraz', yuz: { 'z+': { kapi: { x: 0, w: 0.14, h: 0.2 }, tente: true, zemin: [{ x: -0.35, w: 0.08, h: 0.11, tip: 'kemer' }, { x: 0.35, w: 0.08, h: 0.11, tip: 'kemer' }, { x: -0.18, w: 0.07, h: 0.1 }, { x: 0.18, w: 0.07, h: 0.1 }], ust: [{ x: -0.45, w: 0.09 }, { x: -0.22, w: 0.09, tip: 'cift' }, { x: 0.22, w: 0.09, tip: 'cift' }, { x: 0.45, w: 0.09 }] } }, baca: [{ x: -0.55, h: 0.16 }] });
    saatKulesi(Y, S, { x: 0.0, z: -0.55, y: a.cati.yR - 0.04, w: 0.24, h: 0.3 });
    cesme(Y, S, 0.0, 0.5, Z, 0.18); tabelaDirek(Y, S, -0.7, 0.55, Z, 0.46, 0.0); tabelaDirek(Y, S, 0.7, 0.6, Z, 0.46, 0.0);
    for (let i = 0; i < 3; i++) { Y.silindir(0.008, 0.01, 0.3, 5, -0.3 + i * 0.3, Z, 0.0, 'kutuk', S.kiris); Y.kutu(0.05, 0.07, 0.05, -0.3 + i * 0.3, Z + 0.3, 0.0, 'duz', S.camIsik, { isil: true }); }
  } else if (vr === 1) {
    // KEMERLİ ÇARŞI SARAYI: çarşı katlı belediye + yan lonca evi, ortada taş meydan haçı
    const b = ev({ w: 1.2, d: 0.5, cx: -0.1, cz: -0.6, cikma: ['z+', 'x+'], desen: 'x', yuz: { 'z+': { kapi: { x: 0, w: 0.14, h: 0.2 }, zemin: [{ x: -0.3, w: 0.08, h: 0.11 }, { x: 0.3, w: 0.08, h: 0.11 }], ust: [{ x: -0.4, w: 0.09 }, { x: -0.15, w: 0.09 }, { x: 0.15, w: 0.09, tip: 'cift' }, { x: 0.4, w: 0.09 }] }, 'x+': { ust: [{ x: 0, w: 0.09 }], alinPencere: true } }, dorm: [{ x: 0.0, z: 0.3 }], baca: [{ x: 0.45, h: 0.16 }] });
    const L = ev({ w: 0.8, d: 0.46, cx: 0.78, cz: 0.1, ry: -PI / 2, cikma: ['x+'], desen: 'ince', alinKiris: false, yuz: { 'x+': { zemin: [{ x: 0, w: 0.09, h: 0.12, tip: 'kemer' }], ust: [{ x: -0.1, w: 0.09 }, { x: 0.1, w: 0.09 }], alinPencere: true }, 'z-': { zemin: [{ x: -0.2, w: 0.08, h: 0.1 }, { x: 0.2, w: 0.08, h: 0.1 }], ust: [{ x: -0.2, w: 0.08 }, { x: 0.2, w: 0.08, tip: 'cift' }] } } }); void L;
    // meydan haçı
    for (let i = 0; i < 3; i++) Y.kutu(0.3 - i * 0.07, 0.04, 0.3 - i * 0.07, -0.25, Z + i * 0.04, 0.4, 'tasBlok', i % 2 ? S.tas : S.tasAcik);
    Y.kutu(0.05, 0.3, 0.05, -0.25, Z + 0.12, 0.4, 'tasBlok', S.tasKrem); Y.kutu(0.16, 0.04, 0.05, -0.25, Z + 0.32, 0.4, 'tasBlok', S.tasKrem); Y.koni(0.03, 0.06, 4, -0.25, Z + 0.4, 0.4, 'tasBlok', S.tasKrem, { ry: PI / 4 });
    kuyu(Y, S, 0.4, 0.6, Z); void b;
  } else {
    // KULELİ SARAY MEYDANI: kare belediye kulesi + salon, yuvarlak köşe kulesi, bayraklar
    const a = ev({ w: 1.1, d: 0.5, cx: -0.15, cz: -0.55, cikma: ['z+'], desen: 'v', yuz: { 'z+': { kapi: { x: -0.2, w: 0.14, h: 0.2 }, tente: true, zemin: [{ x: 0.15, w: 0.08, h: 0.11 }, { x: 0.35, w: 0.08, h: 0.11 }], ust: [{ x: -0.3, w: 0.09 }, { x: 0.0, w: 0.09, tip: 'cift' }, { x: 0.3, w: 0.09 }] } }, dorm: [{ x: 0.2, z: 0.3 }], baca: [{ x: -0.4, h: 0.16 }] });
    Y.kutu(0.36, 0.7 * s, 0.36, 0.7, Z, -0.55, 'tasBlok', S.tasKrem); Y.kutu(0.42, 0.04, 0.42, 0.7, Z + 0.7 * s, -0.55, 'tasBlok', S.tasAcik);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) Y.kutu(0.09, 0.08, 0.09, 0.7 + dx * 0.16, Z + 0.74 * s, -0.55 + dz * 0.16, 'tasBlok', S.tasAcik);
    Y.koni(0.3, 0.3, 4, 0.7, Z + 0.78 * s, -0.55, 'arduvaz', S.arduvazUst, { ry: PI / 4 }); for (const y of [0.3, 0.5]) pencere(Y.alt(0.7, -0.37, 0), S, { x: 0, y: Z + y * s, w: 0.07, h: 0.12, tip: 'kemer', panjur: null, isikli: true });
    flama(Y.alt(-0.3, -0.29, 0), S, 0.0, Z + 0.36, 0xb03a2e); flama(Y.alt(0.3, -0.29, 0), S, 0.0, Z + 0.36, 0x2f5f8a);
    cesme(Y, S, 0.1, 0.45, Z, 0.16); tabelaDirek(Y, S, -0.7, 0.55, Z, 0.46, 0.0); void a;
  }
}
void saman; void fici; void kemerSirasi; void kademeliAlin; void portal; void sutunCephe; void THREE;

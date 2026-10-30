// Atölyeler (1×1): Demirci, Eritme Fırını (bronz); Dokuma Atölyesi (Orta Çağ); Darphane (antik); Alet Yapımcısı (taş devri). Her biri 3 varyant.
// Stil paketi bina çağından gelir (bronz/antik → 'antik', taş devri → 'ilkel'). Ortak: parcalar_atolye.js (+ kanat.js, parcalar.js, parcalar_avlu.js, parcalar_su.js).
import * as THREE from 'three';
import { Yerel, kemerProfil } from '../geometri.js';
import { catiBesik, catiTek } from '../cati.js';
import { kanat } from '../kanat.js';
import { ocak, ors, koruk, suKabi, aletRafi, komurYigini, kilFirin, gerdirme, boyaKazani, tezgah, sutunCephe, deriBarinak, cakmakTasi, ogutmeTasi, atesNokta, dumanNokta } from '../parcalar_atolye.js';
import { fici, saman, agac } from '../parcalar_avlu.js';
import { arabaKasa, cuvalYigini } from '../parcalar_su.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;

const govde = (Y, S, w, h, d, x, y, z, siva) => Y.kutu(w, h, d, x, y, z, 'kerpic', siva);
const atlak = (Y, S, o) => catiBesik(Y, { oh: 0.05, rake: 0.04, kal: 0.022, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, th: 0.009, alin: false, ...o });
function kapiAgzi(Y, S, x, z, y, w, h, parlak = true) { // +z'ye bakan kemerli koyu ağız (+ ışıltı)
  Y.prizma(kemerProfil(w, h, 5), 0, 0.02, 'z', x, y, z, 'duz', 0x1c1410);
  if (parlak) Y.kutu(w * 0.6, h * 0.35, 0.012, x, y + 0.02, z + 0.014, 'duz', 0xff7a2a, { isil: true, arka: true });
}

// ================= DEMİRCİ =================
export function demirci(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const siva = S.siva[vr % S.siva.length];
  if (vr === 0) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.035, 0.34, 0.035, sx * 0.3, Z, sz * 0.22, 'kutuk', S.kiris);
    govde(Y, S, 0.7, 0.3, 0.05, 0, Z, -0.24, siva); govde(Y, S, 0.05, 0.3, 0.46, -0.32, Z, 0, siva);
    atlak(Y, S, { x0: 0, z0: 0, w: 0.72, d: 0.54, y: Z + 0.34, H: 0.17 * s });
    ocak(Y, S, { x: -0.16, z: -0.15, y: Z, w: 0.26, h: 0.2, bacaH: 0.38 * s });
    koruk(Y, S, -0.01, -0.15, Z); ors(Y, S, 0.1, 0.0, Z); suKabi(Y, S, 0.22, 0.06, Z); aletRafi(Y, S, 0.16, -0.21, Z, 0, 0.3);
    komurYigini(Y, -0.27, 0.15, Z);
  } else if (vr === 1) {
    govde(Y, S, 0.56, 0.26, 0.4, -0.04, Z, -0.04, siva);
    atlak(Y, S, { x0: -0.04, z0: -0.04, w: 0.56, d: 0.4, y: Z + 0.26, H: 0.17 * s });
    kapiAgzi(Y, S, -0.04, 0.162, Z, 0.2, 0.2);
    Y.kutu(0.09, 0.62 * s, 0.1, 0.31, Z, -0.04, 'tasBlok', S.tas); Y.kutu(0.12, 0.025, 0.13, 0.31, Z + 0.62 * s, -0.04, 'tasBlok', S.tasAcik);
    dumanNokta(Y, 0.31, Z + 0.66 * s, -0.04, 1);
    atesNokta(Y, -0.04, Z + 0.07, 0.17, 0.9);
    ors(Y, S, 0.08, 0.3, Z); koruk(Y, S, -0.2, 0.3, Z, PI); suKabi(Y, S, 0.24, 0.26, Z); komurYigini(Y, -0.3, 0.28, Z);
    // nal tabelası
    Y.ekle(new THREE.TorusGeometry(0.03, 0.007, 5, 9, PI * 1.6), -0.26, Z + 0.2, 0.172, 'duz', 0x4a4a52, { rz: PI / 2 + 0.3 });
    Y.kiris([-0.26, Z + 0.26, 0.16], [-0.26, Z + 0.2, 0.172], 0.006, 0.006, 'duz', S.demir);
  } else {
    govde(Y, S, 0.4, 0.26, 0.34, -0.1, Z, -0.14, siva);
    atlak(Y, S, { x0: -0.1, z0: -0.14, w: 0.4, d: 0.34, y: Z + 0.26, H: 0.16 * s });
    // sundurma (önde tek eğimli çatı + iki direk)
    catiTek(Y, { x0: 0.0, z0: 0.24, w: 0.64, d: 0.3, y: Z + 0.2, yuk: 0.06, oh: 0.04, rake: 0.03, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris });
    for (const sx of [-1, 1]) Y.kutu(0.035, 0.22, 0.035, sx * 0.3, Z, 0.36, 'kutuk', S.kiris);
    ocak(Y, S, { x: -0.2, z: 0.0, y: Z, w: 0.24, h: 0.2, bacaH: 0.42 * s });
    ors(Y, S, 0.06, 0.26, Z); suKabi(Y, S, 0.22, 0.22, Z); koruk(Y, S, -0.06, 0.1, Z, 0);
    aletRafi(Y, S, 0.24, 0.12, Z, 0, 0.22);
    // asılı kalkan tabelası
    Y.silindir(0.04, 0.04, 0.008, 10, -0.3, Z + 0.16, 0.382, 'duz', 0xb03a2e, { rx: PI / 2 }); Y.silindir(0.012, 0.012, 0.012, 7, -0.3, Z + 0.16, 0.39, 'duz', S.altin, { rx: PI / 2 });
    komurYigini(Y, -0.3, 0.3, Z);
  }
}

// ================= ERİTME FIRINI =================
export function eritmeFirini(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  if (vr === 0) {
    kilFirin(Y, S, { x: 0.05, z: -0.05, y: Z, r: 0.17, h: 0.55 * s });
    komurYigini(Y, -0.3, 0.2, Z, 1.1, 0x8a5a3a); komurYigini(Y, 0.3, 0.25, Z, 1.0, 0x4a4640); cuvalYigini(Y, S, -0.32, -0.2, Z, 0.4);
    Y.kutu(0.2, 0.05, 0.12, 0.0, Z, 0.34, 'tahta', 0x8a6238); koruk(Y, S, 0.18, 0.2, Z, -PI / 2);
  } else if (vr === 1) {
    govde(Y, S, 0.7, 0.3, 0.22, 0, Z, -0.2, S.siva[1]);
    Y.kutu(0.74, 0.03, 0.26, 0, Z + 0.3, -0.2, 'tasBlok', S.tasAcik);
    for (const sx of [-1, 1]) ocak(Y, S, { x: sx * 0.18, z: -0.14, y: Z, w: 0.24, h: 0.24, bacaH: 0.46 * s, doku: 'kerpic', renk: 0xb87a52 });
    arabaKasa(Y, S, -0.15, 0.25, Z, 0.5); komurYigini(Y, 0.25, 0.26, Z, 1.2, 0x8a5a3a); komurYigini(Y, 0.0, 0.34, Z, 0.9, 0x4a4640);
  } else {
    kilFirin(Y, S, { x: -0.15, z: -0.1, y: Z, r: 0.14, h: 0.5 * s });
    // kömür ocağı (kerpiç/toprak höyük, dumanlı)
    Y.ekle(new THREE.SphereGeometry(0.2, 10, 5, 0, PI * 2, 0, PI / 2), 0.22, Z, 0.0, 'toprak', 0x3a3028, { yumusak: true });
    for (let i = 0; i < 8 && !k.lod; i++) { const a = (i / 8) * PI * 2; Y.silindir(0.016, 0.016, 0.2, 5, 0.22 + Math.cos(a) * 0.26, Z, Math.sin(a) * 0.26, 'kutuk', 0x6a4a2c, { rz: Math.cos(a) * 0.3, rx: -Math.sin(a) * 0.3 }); }
    dumanNokta(Y, 0.22, Z + 0.22, 0.0, 1.1);
    catiTek(Y, { x0: -0.1, z0: 0.34, w: 0.5, d: 0.2, y: Z + 0.18, yuk: 0.05, oh: 0.03, rake: 0.03, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris });
    for (const sx of [-1, 1]) Y.kutu(0.03, 0.2, 0.03, -0.1 + sx * 0.24, Z, 0.42, 'kutuk', S.kiris);
    komurYigini(Y, -0.1, 0.35, Z, 1.1, 0x8a5a3a);
  }
}

// ================= DOKUMA ATÖLYESİ =================
export function dokumaAtolyesi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const siva = S.siva[(vr + 1) % S.siva.length];
  if (vr === 0) {
    kanat(Y, S, { Z, w: 0.56, d: 0.4, h1: 0.18, h2: 0.2 * s, H: 0.22 * s, cx: 0.0, cz: -0.08, cikma: ['z+'], desen: 'carpraz', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z+': { kapi: { x: 0.14, w: 0.1, h: 0.16 }, zemin: [{ x: -0.14, w: 0.14, h: 0.09, tip: 'cift' }], ust: [{ x: -0.14, w: 0.14, tip: 'cift' }, { x: 0.14, w: 0.08 }] }, 'x+': { ust: [{ x: 0, w: 0.085 }] } },
      baca: [{ x: -0.15, h: 0.14 }] });
    gerdirme(Y, S, { x: -0.3, z: 0.36, y: Z, w: 0.36, h: 0.26, ry: 0 }); boyaKazani(Y, S, 0.06, 0.38, Z, 3);
  } else if (vr === 1) {
    kanat(Y, S, { Z, w: 0.5, d: 0.4, h1: 0.18, h2: 0.22 * s, H: 0.24 * s, cx: -0.05, cz: -0.1, cikma: ['z+', 'x+'], desen: 'ince', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z+': { kapi: { x: -0.12, w: 0.1, h: 0.16 }, zemin: [{ x: 0.12, w: 0.1, h: 0.09 }], ust: [{ x: -0.12, w: 0.08 }, { x: 0.1, w: 0.12, tip: 'cift' }] }, 'x+': { zemin: [{ x: 0, w: 0.07, h: 0.09 }], ust: [{ x: 0, w: 0.085 }] } }, baca: [{ x: 0.12, h: 0.14 }] });
    gerdirme(Y, S, { x: 0.36, z: 0.3, y: Z, w: 0.26, h: 0.24, ry: PI / 2 }); gerdirme(Y, S, { x: -0.32, z: 0.36, y: Z, w: 0.28, h: 0.22, ry: 0 });
    tezgah(Y, S, 0.08, 0.38, Z, 0.2);
  } else {
    const a = kanat(Y, S, { Z, w: 0.5, d: 0.38, h1: 0.18, h2: 0.22 * s, H: 0.26 * s, cx: 0.0, cz: -0.1, cikma: ['z+'], desen: 'v', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: { 'z+': { kapi: { x: 0.14, w: 0.1, h: 0.16 }, zemin: [{ x: -0.12, w: 0.12, h: 0.09, tip: 'cift' }], ust: [{ x: -0.12, w: 0.1 }, { x: 0.14, w: 0.08 }] }, 'x+': { ust: [{ x: 0, w: 0.085 }] } } });
    // kurutma tavanarası: yan alında kafesli (jaluzi) açıklık
    const g = a.W.alt(0.25 + 0.05, a.czU, Math.PI / 2, a.yU + 0.2 * s + 0.06); g.cephe = true;
    for (let i = 0; i < 4; i++) g.kutu(0.14 - i * 0.025, 0.012, 0.02, 0, i * 0.026, 0.004, 'tahta', 0x6a4a2c, { rx: -0.35 });
    boyaKazani(Y, S, -0.3, 0.4, Z, 3); gerdirme(Y, S, { x: 0.3, z: 0.38, y: Z, w: 0.3, h: 0.24, ry: PI / 2 });
  }
}

// ================= DARPHANE (antik) =================
export function darphane(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  if (vr === 0) {
    for (let i = 0; i < 3; i++) Y.kutu(0.7 - i * 0.04, 0.025, 0.7 - i * 0.04, 0, Z + i * 0.025, 0, 'mermer', i % 2 ? S.tasAcik : S.tasKrem ?? S.tasAcik);
    govde(Y, S, 0.4, 0.3 * s, 0.34, 0, Z + 0.075, -0.1, 0xe8d8b8);
    sutunCephe(Y, S, { x: 0, z: 0.2, y: Z + 0.075, w: 0.36, h: 0.3 * s, adet: 4, derin: 0.14 });
    atlak(Y, S, { x0: 0, z0: -0.1, w: 0.46, d: 0.42, y: Z + 0.075 + 0.3 * s, H: 0.09 * s });
    Y.silindir(0.03, 0.03, 0.01, 9, 0, Z + 0.075 + 0.3 * s + 0.1, 0.27, 'duz', S.altin, { rx: PI / 2 });
    Y.kutu(0.07, 0.15, 0.02, 0, Z + 0.075, 0.11, 'tahta', 0x6a4a2a, { arka: true });
  } else if (vr === 1) {
    govde(Y, S, 0.5, 0.3 * s, 0.42, 0, Z, -0.02, 0xe8d8b8);
    atlak(Y, S, { x0: 0, z0: -0.02, w: 0.5, d: 0.42, y: Z + 0.3 * s, H: 0.15 * s });
    Y.prizma(kemerProfil(0.14, 0.2, 6), 0, 0.03, 'z', 0, Z, 0.19, 'tahta', 0x4a2e1c);
    for (const sx of [-1, 1]) { Y.prizma(kemerProfil(0.06, 0.12, 5), 0, 0.02, 'z', sx * 0.17, Z + 0.1, 0.19, 'duz', 0xffc070, { isil: true }); Y.kutu(0.09, 0.012, 0.03, sx * 0.17, Z + 0.09, 0.2, 'tasBlok', S.tas); }
    Y.silindir(0.008, 0.01, 0.4, 5, 0.32, Z, 0.3, 'kutuk', S.kiris); Y.kutu(0.12, 0.07, 0.008, 0.38, Z + 0.34, 0.3, 'kumas', 0x6a3a8a);
    Y.kutu(0.07, 0.06, 0.06, -0.3, Z, 0.32, 'tahta', 0x9a6a3a, { ry: 0.3 }); Y.silindir(0.03, 0.03, 0.01, 8, -0.3, Z + 0.065, 0.32, 'duz', S.altin);
  } else {
    // THOLOS: yuvarlak hücre + çevre sütunlar + konik çatı
    Y.silindir(0.4, 0.42, 0.04, 14, 0, Z, 0, 'mermer', S.tasAcik);
    Y.silindir(0.22, 0.22, 0.3 * s, 12, 0, Z + 0.04, 0, 'kerpic', 0xe8d8b8);
    const n = k.lod ? 5 : 8;
    for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; Y.silindir(0.022, 0.028, 0.3 * s, 8, Math.cos(a) * 0.32, Z + 0.04, Math.sin(a) * 0.32, 'mermer', S.tasAcik); Y.kutu(0.06, 0.014, 0.06, Math.cos(a) * 0.32, Z + 0.04 + 0.3 * s, Math.sin(a) * 0.32, 'mermer', S.tasAcik, { ry: -a }); }
    Y.silindir(0.37, 0.37, 0.035, 14, 0, Z + 0.04 + 0.3 * s + 0.014, 0, 'mermer', S.tasAcik);
    Y.silindir(0.0, 0.34, 0.22 * s, 14, 0, Z + 0.09 + 0.3 * s, 0, 'kiremit', S.kiremit[0], { yumusak: false });
    Y.kure(0.025, 0, Z + 0.09 + 0.3 * s + 0.22 * s, 0, 'duz', S.altin);
    Y.prizma(kemerProfil(0.12, 0.2, 5), 0, 0.03, 'z', 0, Z + 0.04, 0.215, 'tahta', 0x4a2e1c);
  }
}

// ================= ALET YAPIMCISI (taş devri) =================
export function aletYapimcisi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'toprak'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  if (vr === 0) {
    deriBarinak(Y, S, { x: -0.05, z: -0.1, y: Z, w: 0.5, d: 0.4, h: 0.3 * s, ry: 0 });
    cakmakTasi(Y, 0.25, 0.25, Z, 8, 1.1); Y.silindir(0.045, 0.05, 0.07, 7, -0.2, Z, 0.3, 'kutuk', 0x8a6238); ogutmeTasi(Y, S, 0.0, 0.32, Z);
    Y.kutu(0.14, 0.03, 0.1, 0.3, Z, -0.2, 'tasBlok', S.tas, { ry: 0.3 });
  } else if (vr === 1) {
    Y.silindir(0.26, 0.28, 0.2, 10, 0, Z, -0.04, 'kutuk', 0x7a5634);
    Y.silindir(0.0, 0.34, 0.26 * s, 10, 0, Z + 0.2, -0.04, 'saman', 0xc8a85a, { yumusak: false });
    Y.prizma(kemerProfil(0.12, 0.15, 4), 0, 0.02, 'z', 0, Z, 0.235, 'duz', 0x1c1410);
    cakmakTasi(Y, -0.3, 0.28, Z, 7, 1.1); cakmakTasi(Y, 0.3, 0.2, Z, 5, 0.9); Y.silindir(0.04, 0.045, 0.07, 7, 0.22, Z, 0.34, 'kutuk', 0x8a6238);
    Y.silindir(0.005, 0.005, 0.07, 5, 0.0, Z + 0.46 * s, -0.04, 'kutuk', 0x6b4a2c);
  } else {
    for (const [x, ry] of [[-0.25, 0.3], [0.25, -0.3]]) Y.kutu(0.3, 0.26 * s, 0.025, x, Z, -0.2, 'deri', 0xc9a57a, { ry });
    Y.kiris([-0.38, Z, -0.14], [-0.38, Z + 0.28, -0.14], 0.022, 0.022, 'kutuk', 0x6b4a2c); Y.kiris([0.38, Z, -0.14], [0.38, Z + 0.28, -0.14], 0.022, 0.022, 'kutuk', 0x6b4a2c);
    ogutmeTasi(Y, S, -0.1, 0.1, Z); cakmakTasi(Y, 0.2, 0.0, Z, 6, 1.2);
    // ateş çukuru
    for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2; Y.kure(0.035, 0.22 + Math.cos(a) * 0.1, Z + 0.03, 0.28 + Math.sin(a) * 0.1, 'moloz', 0x7d7870); }
    Y.koni(0.06, 0.05, 6, 0.22, Z, 0.28, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, 0.22, Z + 0.05, 0.28, 0.9);
    Y.silindir(0.05, 0.055, 0.07, 7, -0.25, Z, 0.3, 'kutuk', 0x8a6238);
  }
}

void fici; void saman; void agac;

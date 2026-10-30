// Tarım ailesi: Çiftlik (Orta Çağ 3×3), Ambar (bronz 2×2), Ağıl, Tahıl Bahçesi, Erzak Çukuru (taş devri), Sulanan Tarla (bronz), Bağ-Bahçe (antik), Kurutma Rafı (göçebe).
// Ortak aile dili: tahta/taş taban, saman-kiremit çatı, mantar taşlı yüksek ambar, silo, ahır; hayvanlar, tarla sıraları ve çitler. Her biri 3 varyant.
import * as THREE from 'three';
import { Yerel, kemerProfil } from '../geometri.js';
import { catiBesik, catiTek } from '../cati.js';
import { kanat } from '../kanat.js';
import { ahirGovde, acikSamanlik, silo, yuksekAmbar, kumes, koyun, inek, tavuk, tarla, korkuluk, samanYigini, kup, sadaf, agilCiti, cardak, mantarTasi } from '../parcalar_tarim.js';
import { kuyu, fici, saman, agac, kovan } from '../parcalar_avlu.js';
import { arabaKasa, cuvalYigini, suKanali, havuz } from '../parcalar_su.js';
import { yalak } from '../parcalar_han.js';
import { deriBarinak, cakmakTasi, ogutmeTasi, atesNokta, dumanNokta } from '../parcalar_atolye.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;

// ===================== ÇİFTLİK (Orta Çağ 3×3) =====================
export function ciftlik(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(3, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const siva = S.siva[(vr + 1) % S.siva.length];
  const ev = (o) => kanat(Y, S, { Z, h1: 0.2, h2: 0.22 * s, H: 0.27 * s, renk: S.kiremit, doku: S.catiDoku, siva, ...o });
  if (vr === 0) {
    // AVLULU: arkada uzun ahır, solda çiftlik evi, sağda yüksek ambar; avluda kuyu, saman, hayvanlar; önde tarlalar
    ahirGovde(Y, S, { x: -0.1, z: -1.0, y: Z, w: 1.5, d: 0.62, h: 0.4 * s, H: 0.36 * s, cati: 'kiremit' });
    ev({ w: 0.9, d: 0.46, cx: -1.0, cz: 0.05, ry: -PI / 2, cikma: ['x+'], desen: 'carpraz',
      yuz: { 'z-': { kapi: { x: -0.1, w: 0.11, h: 0.19 }, tente: true, zemin: [{ x: 0.2, w: 0.07, h: 0.09 }, { x: -0.32, w: 0.07, h: 0.09 }], ust: [{ x: -0.3, w: 0.085 }, { x: 0.0, w: 0.085, tip: 'cift' }, { x: 0.3, w: 0.085 }] }, 'x+': { ust: [{ x: 0, w: 0.085 }], alinPencere: true } }, baca: [{ x: 0.1, h: 0.17 }] });
    yuksekAmbar(Y, S, { x: 1.0, z: -0.15, y: Z, w: 0.52, d: 0.42 });
    kuyu(Y, S, -0.1, 0.15, Z); samanYigini(Y, 0.45, 0.3, Z, 1.2); arabaKasa(Y, S, -0.4, 0.5, Z, 0.5);
    for (const [x, z, r] of [[0.3, 0.62, 0.3], [0.5, 0.5, 1.0], [0.18, 0.5, -0.5]]) koyun(Y, x, z, Z, r);
    inek(Y, -0.4, -0.45, Z, 0.2); inek(Y, 0.0, -0.5, Z, -0.4, 1, 0xc8a070);
    kumes(Y, S, 0.8, 0.4, Z, 0.4); for (const [x, z] of [[0.7, 0.55], [0.9, 0.55], [0.82, 0.62]]) tavuk(Y, x, z, Z, x * 3);
    tarla(Y, S, { x: -0.55, z: 1.05, y: Z, w: 1.2, d: 0.5, tur: 'bugday', ry: 0 }); tarla(Y, S, { x: 0.75, z: 1.1, y: Z, w: 0.8, d: 0.4, tur: 'sebze' });
    korkuluk(Y, S, -0.55, 0.8, Z); agac(Y, 1.2, 0.85, Z, 'mese', 1.1);
  } else if (vr === 1) {
    // HOLLANDA AMBARLI: büyük açık samanlık, sağ önde çiftlik evi, solda silo, mısır tarlası
    acikSamanlik(Y, S, { x: 0.15, z: -0.85, y: Z, w: 1.5, d: 0.8, h: 0.36 * s, H: 0.34 * s });
    ev({ w: 0.82, d: 0.46, cx: 0.7, cz: 0.4, cikma: ['z+', 'x+'], desen: 'x',
      yuz: { 'z+': { kapi: { x: -0.2, w: 0.11, h: 0.19 }, tente: true, zemin: [{ x: 0.15, w: 0.07, h: 0.09 }, { x: 0.32, w: 0.06 }], ust: [{ x: -0.25, w: 0.085, saksi: true }, { x: 0.0, w: 0.085, tip: 'cift' }, { x: 0.28, w: 0.085 }] }, 'x+': { ust: [{ x: 0, w: 0.085 }], alinPencere: true } }, dorm: [{ x: -0.05, z: 0.3 }], baca: [{ x: 0.2, h: 0.17 }] });
    silo(Y, S, { x: -1.0, z: -0.4, y: Z, r: 0.27, h: 0.8 * s });
    tarla(Y, S, { x: -0.7, z: 0.7, y: Z, w: 0.8, d: 0.9, tur: 'misir', sira: 6 }); tarla(Y, S, { x: -0.1, z: 1.05, y: Z, w: 0.9, d: 0.45, tur: 'bugday' });
    for (const [x, z, r] of [[0.2, -0.3, 0.2], [0.5, -0.35, -0.6], [-0.05, -0.2, 0.9]]) inek(Y, x, z, Z, r, 1, [0xf0ead8, 0xc8a070, 0x6a5040][Math.round(x * 5 + 6) % 3]);
    koyun(Y, -0.4, 0.2, Z, 0.5); koyun(Y, -0.3, 0.3, Z, -0.4);
    yalak(Y, S, 0.7, 0.0, Z, 0.0); samanYigini(Y, -0.6, -0.05, Z, 1.0); arabaKasa(Y, S, 0.3, 0.12, Z, 1.0); fici(Y, 1.2, 0.2, Z); kumes(Y, S, 1.15, 0.7, Z, -0.3);
    korkuluk(Y, S, -0.7, 0.4, Z);
  } else {
    // TAŞ AHIRLI + AĞIL: arka solda taş ahır, arka sağda küçük ev, ortada koyun ağılı, önde meyve bahçesi ve kovanlar
    ahirGovde(Y, S, { x: -0.7, z: -0.9, y: Z, w: 1.0, d: 0.6, h: 0.38 * s, H: 0.3 * s, cati: 'kiremit', tas: true });
    ev({ w: 0.7, d: 0.42, cx: 0.75, cz: -0.85, cikma: ['z+'], desen: 'v',
      yuz: { 'z+': { kapi: { x: -0.18, w: 0.11, h: 0.19 }, tente: true, zemin: [{ x: 0.15, w: 0.07, h: 0.09 }], ust: [{ x: -0.18, w: 0.085, saksi: true }, { x: 0.15, w: 0.085, tip: 'cift' }] }, 'x+': { ust: [{ x: 0, w: 0.085 }], alinPencere: true } }, dorm: [], baca: [{ x: 0.2, h: 0.17 }] });
    const px0 = -0.1, px1 = 1.2, pz0 = -0.1, pz1 = 0.8;
    agilCiti(Y, S, [[px0, pz0], [px1, pz0], [px1, pz1], [px0, pz1]], Z);
    for (let i = 0; i < 6; i++) koyun(Y, px0 + 0.2 + (i % 3) * 0.35, pz0 + 0.2 + Math.floor(i / 3) * 0.35, Z, i * 1.7);
    catiTek(Y, { x0: 1.0, z0: -0.0, w: 0.35, d: 0.25, y: Z + 0.2, yuk: 0.06, oh: 0.04, rake: 0.03, renk: [0xd0aa58, 0xc8a050, 0xb89040], doku: 'saman', kabukRenk: S.kiris });
    for (const sx of [-1, 1]) Y.kutu(0.03, 0.2, 0.03, 1.0 + sx * 0.16, Z, 0.14, 'kutuk', S.kiris);
    yalak(Y, S, 0.4, 0.9, Z, 0.0, 0.3); samanYigini(Y, 1.05, 0.55, Z);
    for (let i = 0; i < 5; i++) agac(Y, -1.1 + (i % 3) * 0.35, 0.35 + Math.floor(i / 3) * 0.4, Z, 'mese', 1.0);
    kovan(Y, -0.9, 1.05, Z); kumes(Y, S, -0.3, 0.4, Z, 0.3); tavuk(Y, -0.2, 0.5, Z, 1); tavuk(Y, -0.35, 0.55, Z, 2);
    inek(Y, -0.4, -0.45, Z, 0.4);
  }
  if (c.sv >= 2) { Y.silindir(0.008, 0.01, 0.26, 5, 0.0, Z, 1.28, 'kutuk', S.kiris); Y.kutu(0.05, 0.055, 0.05, 0.0, Z + 0.26, 1.28, 'duz', S.camIsik, { isil: true }); }
}

// ===================== AMBAR (bronz 2×2) =====================
export function ambar(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  if (vr === 0) {
    yuksekAmbar(Y, S, { x: -0.1, z: -0.2, y: Z, w: 0.86, d: 0.62, h: 0.3 * s, H: 0.22 * s });
    yuksekAmbar(Y, S, { x: 0.6, z: 0.35, y: Z, w: 0.4, d: 0.34, h: 0.2, H: 0.16 });
    for (let i = 0; i < 3; i++) kup(Y, S, -0.5 + i * 0.12, 0.5, Z, 1);
    cuvalYigini(Y, S, 0.2, 0.55, Z, 0.3); arabaKasa(Y, S, -0.6, 0.15, Z, 0.5);
  } else if (vr === 1) {
    Y.kutu(0.92, 0.32 * s, 0.6, 0, Z, -0.18, 'kerpic', S.siva[0]);
    catiBesik(Y, { x0: 0, z0: -0.18, w: 0.92, d: 0.6, y: Z + 0.32 * s, H: 0.13 * s, oh: 0.06, rake: 0.05, kal: 0.024, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, th: 0.01, alin: false });
    Y.prizma(kemerProfil(0.18, 0.24, 6), 0, 0.03, 'z', -0.25, Z, 0.123, 'tahta', 0x4a2e1c);
    for (const x of [0.05, 0.3, 0.5]) Y.kutu(0.05, 0.03, 0.02, x, Z + 0.22, 0.123, 'duz', 0x2a2018, { arka: true });
    for (let i = 0; i < 5; i++) kup(Y, S, -0.6 + i * 0.28, 0.45 + (i % 2) * 0.1, Z, 1.15, [0xa86a44, 0x9a5c3a][i % 2]);
    Y.kiris([0.4, Z, 0.5], [0.5, Z + 0.1, 0.12], 0.14, 0.02, 'tahta', 0x8a6238);
  } else {
    silo(Y, S, { x: -0.38, z: -0.1, y: Z, r: 0.3, h: 0.6 * s, doku: 'kerpic', renk: S.siva[0], kulah: 'kiremit' });
    silo(Y, S, { x: 0.4, z: -0.2, y: Z, r: 0.26, h: 0.52 * s, doku: 'kerpic', renk: S.siva[1], kulah: 'saman' });
    Y.silindir(0.17, 0.2, 0.025, 10, 0.1, Z, 0.5, 'toprak', 0x6a5a40);
    Y.silindir(0.14, 0.14, 0.02, 10, 0.1, Z + 0.025, 0.5, 'tahta', 0x7a5a38);
    cuvalYigini(Y, S, -0.5, 0.55, Z, 0.5); kup(Y, S, 0.5, 0.45, Z); kup(Y, S, 0.62, 0.52, Z, 0.9);
  }
}

// ===================== AĞIL (taş devri 2×2) =====================
const dairesel = (r, n, cx = 0, cz = 0, bosluk = -1) => Array.from({ length: n }, (_, i) => { const a = (i / n) * PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; }).filter((_, i) => i !== bosluk);
export function agil(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'toprak'), Y = new Yerel(k, 0, 0, 0, 0);
  if (vr === 0) {
    agilCiti(Y, S, dairesel(0.78, 16, 0, 0.05), Z, 0x6b4a2c, 0.12);
    for (let i = 0; i < 6; i++) koyun(Y, Math.cos(i * 1.1) * 0.35, 0.05 + Math.sin(i * 1.1) * 0.3, Z, i * 1.3);
    deriBarinak(Y, S, { x: 0.0, z: -0.45, y: Z, w: 0.5, d: 0.3, h: 0.24, ry: 0 });
    saman(Y, 0.4, 0.35, Z, 0.3); Y.kutu(0.2, 0.03, 0.05, -0.4, Z + 0.05, 0.35, 'kutuk', 0x6b4a2c);
  } else if (vr === 1) {
    const a = 0.8;
    agilCiti(Y, S, [[-a, -a * 0.8], [a, -a * 0.8], [a, a * 0.8], [-a, a * 0.8]], Z, 0x6b4a2c, 0.12);
    deriBarinak(Y, S, { x: -0.3, z: -0.5, y: Z, w: 0.6, d: 0.34, h: 0.28, ry: 0 });
    for (let i = 0; i < 5; i++) koyun(Y, -0.5 + (i % 3) * 0.4, 0.0 + Math.floor(i / 3) * 0.3, Z, i);
    Y.kutu(0.3, 0.05, 0.08, 0.45, Z, -0.1, 'kutuk', 0x6b4a2c); Y.kutu(0.26, 0.012, 0.05, 0.45, Z + 0.05, -0.1, 'duz', 0x4a98bc);
    saman(Y, 0.5, 0.35, Z, 0.5);
  } else {
    agilCiti(Y, S, dairesel(0.5, 10, -0.4, -0.2), Z, 0x6b4a2c, 0.12); agilCiti(Y, S, dairesel(0.34, 8, 0.5, 0.35), Z, 0x6b4a2c, 0.1);
    for (let i = 0; i < 4; i++) koyun(Y, -0.4 + Math.cos(i * 1.6) * 0.2, -0.2 + Math.sin(i * 1.6) * 0.2, Z, i * 1.3);
    for (let i = 0; i < 3; i++) koyun(Y, 0.5 + Math.cos(i * 2.1) * 0.12, 0.35 + Math.sin(i * 2.1) * 0.12, Z, i, 0.7);
    Y.silindir(0.2, 0.22, 0.14, 8, 0.5, Z, -0.4, 'kutuk', 0x7a5634); Y.silindir(0.0, 0.26, 0.2, 8, 0.5, Z + 0.14, -0.4, 'saman', 0xc8a85a, { yumusak: false });
    Y.prizma(kemerProfil(0.09, 0.1, 4), 0, 0.02, 'z', 0.5, Z, -0.2, 'duz', 0x1c1410);
  }
}

// ===================== TAHIL BAHÇESİ (taş devri 2×2) =====================
export function tahilBahcesi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'toprak'), Y = new Yerel(k, 0, 0, 0, 0);
  const tasKenar = (x, z, w, d) => { for (const sz of [-1, 1]) Y.kutu(w + 0.04, 0.04, 0.04, x, Z, z + sz * d / 2, 'moloz', 0x8a8478); for (const sx of [-1, 1]) Y.kutu(0.04, 0.04, d, x + sx * w / 2, Z, z, 'moloz', 0x8a8478); };
  if (vr === 0) {
    for (let i = 0; i < 3; i++) { tarla(Y, S, { x: -0.1, z: -0.5 + i * 0.5, y: Z + i * 0.03, w: 1.1 - i * 0.1, d: 0.34, tur: 'bugday', sira: 3 }); tasKenar(-0.1, -0.5 + i * 0.5, 1.1 - i * 0.1, 0.34); }
    ogutmeTasi(Y, S, 0.6, 0.6, Z); cakmakTasi(Y, -0.6, 0.65, Z, 4, 1.1);
    for (const sx of [-1, 1]) Y.kutu(0.03, 0.2, 0.03, 0.35 + sx * 0.14, Z, -0.6, 'kutuk', 0x6b4a2c); Y.kutu(0.3, 0.02, 0.03, 0.35, Z + 0.2, -0.6, 'kutuk', 0x6b4a2c);
  } else if (vr === 1) {
    for (const [x, z, r] of [[-0.35, -0.3, 0.32], [0.4, -0.2, 0.28], [0.0, 0.4, 0.3]]) {
      Y.silindir(r + 0.04, r + 0.05, 0.04, 12, x, Z, z, 'moloz', 0x8a8478); Y.silindir(r, r, 0.03, 12, x, Z + 0.01, z, 'toprak', 0x5a4028);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2, rr = r * 0.6 * ((i % 3) / 3 + 0.4); Y.kutu(0.04, 0.07, 0.04, x + Math.cos(a) * rr, Z + 0.03, z + Math.sin(a) * rr, 'ekin', i % 2 ? 0xd9bf52 : 0xc8a840); }
    }
    for (let i = 0; i < 3; i++) Y.kutu(0.01, 0.2, 0.01, 0.62, Z, 0.45 + i * 0.05, 'kutuk', 0x6b4a2c, { rz: 0.2 });
    ogutmeTasi(Y, S, -0.55, 0.45, Z);
  } else {
    agilCiti(Y, S, [[-0.8, -0.6], [0.3, -0.6], [0.3, 0.5], [-0.8, 0.5]], Z, 0x6b4a2c, 0.1);
    tarla(Y, S, { x: -0.25, z: -0.05, y: Z, w: 0.95, d: 0.95, tur: 'bugday', sira: 7 });
    korkuluk(Y, S, -0.25, -0.05, Z + 0.02);
    deriBarinak(Y, S, { x: 0.62, z: -0.3, y: Z, w: 0.4, d: 0.34, h: 0.26, ry: PI / 2 }); cakmakTasi(Y, 0.6, 0.45, Z, 5); ogutmeTasi(Y, S, 0.4, 0.62, Z);
  }
}

// ===================== ERZAK ÇUKURU (taş devri 1×1) =====================
export function erzakCukuru(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'toprak'), Y = new Yerel(k, 0, 0, 0, 0);
  if (vr === 0) {
    Y.silindir(0.2, 0.22, 0.03, 10, 0, Z, 0, 'toprak', 0x4a3622);
    for (let i = 0; i < 5; i++) Y.kutu(0.07, 0.025, 0.4, -0.15 + i * 0.075, Z + 0.03, 0, 'kutuk', i % 2 ? 0x7a5634 : 0x6a4a2c);
    cuvalYigini(Y, S, 0.3, 0.2, Z, 0.4); for (let i = 0; i < 4; i++) Y.kure(0.035, -0.28 + (i % 2) * 0.05, Z + 0.035, 0.2 + i * 0.04, 'moloz', 0x8a8478);
  } else if (vr === 1) {
    for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2; Y.kure(0.05, Math.cos(a) * 0.22, Z + 0.04, Math.sin(a) * 0.22, 'moloz', [0x8a8478, 0x7d7870][i % 2]); }
    Y.silindir(0.2, 0.2, 0.02, 10, 0, Z + 0.03, 0, 'deri', 0xc9a57a); for (const [x, z] of [[-0.1, 0.1], [0.12, -0.05]]) Y.kure(0.04, x, Z + 0.07, z, 'moloz', 0x8a8478);
    Y.kutu(0.14, 0.05, 0.1, 0.32, Z, 0.1, 'kutuk', 0x6b4a2c, { ry: 0.3 });
  } else {
    Y.silindir(0.22, 0.24, 0.03, 10, 0, Z, 0, 'toprak', 0x4a3622);
    Y.prizma([[-0.22, 0], [0.22, 0], [0, 0.22]], -0.18, 0.18, 'x', 0, Z + 0.03, 0, 'saman', 0xc8a85a);
    for (const sz of [-1, 1]) Y.kiris([-0.22, Z + 0.03, sz * 0.18], [0.0, Z + 0.26, sz * 0.18], 0.02, 0.02, 'kutuk', 0x6b4a2c);
    cuvalYigini(Y, S, -0.3, 0.3, Z, 0.2); kup(Y, S, 0.3, 0.25, Z, 0.9, 0x8a6a48);
  }
}

// ===================== SULANAN TARLA (bronz 2×2) =====================
export function sulananTarla(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const kulube = (x, z, w = 0.34) => { Y.kutu(w, 0.2, 0.28, x, Z, z, 'kerpic', S.siva[0]); catiBesik(Y, { x0: x, z0: z, w, d: 0.28, y: Z + 0.2, H: 0.1, oh: 0.04, rake: 0.03, kal: 0.02, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false, sutun: 4 }); Y.prizma(kemerProfil(0.08, 0.13, 4), 0, 0.02, 'z', x, Z, z + 0.14, 'tahta', 0x4a2e1c); };
  if (vr === 0) {
    suKanali(Y, S, { x: -0.1, z: 0.0, y: Z, w: 0.14, uzun: 1.85, ry: 0, kenarH: 0.05 });
    for (const sx of [-1, 1]) for (let j = 0; j < 2; j++) tarla(Y, S, { x: -0.1 + sx * 0.52, z: -0.55 + j * 1.0, y: Z, w: 0.62, d: 0.8, tur: j ? 'sebze' : 'bugday', sira: 5, ry: 0 });
    sadaf(Y, S, 0.18, 0.0, Z, PI / 2); kulube(-0.75, 0.75);
  } else if (vr === 1) {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = -0.42 + i * 0.84, z = -0.4 + j * 0.8;
      for (const sz of [-1, 1]) Y.kutu(0.76, 0.045, 0.05, x, Z, z + sz * 0.34, 'toprak', 0x6a5a40);
      for (const sx of [-1, 1]) Y.kutu(0.05, 0.045, 0.72, x + sx * 0.36, Z, z, 'toprak', 0x6a5a40);
      Y.kutu(0.68, 0.016, 0.62, x, Z, z, 'duz', 0x4a98bc);
      if (!k.lod) for (let q = 0; q < 6; q++) Y.kutu(0.02, 0.07, 0.02, x - 0.25 + (q % 3) * 0.25, Z + 0.016, z - 0.15 + Math.floor(q / 3) * 0.3, 'ekin', 0x6aa040);
    }
    suKanali(Y, S, { x: 0.0, z: 0.0, y: Z + 0.03, w: 0.1, uzun: 0.1, ry: 0 }); sadaf(Y, S, 0.0, 0.0, Z, 0);
  } else {
    for (let i = 0; i < 3; i++) { tarla(Y, S, { x: 0.0, z: -0.55 + i * 0.55, y: Z + i * 0.04, w: 1.4 - i * 0.12, d: 0.42, tur: i === 1 ? 'sebze' : 'bugday', sira: 4 }); Y.kutu(1.46 - i * 0.12, 0.05 + i * 0.04, 0.05, 0, Z, -0.55 + i * 0.55 + 0.26, 'tasBlok', S.tas); }
    suKanali(Y, S, { x: 0.8, z: 0.0, y: Z, w: 0.1, uzun: 1.8, ry: 0, kenarH: 0.04 });
    kulube(-0.6, 0.85, 0.3); agac(Y, 0.55, 0.85, Z, 'mese', 1.1); sadaf(Y, S, 0.65, 0.5, Z, PI / 2);
  }
}

// ===================== BAĞ-BAHÇE (antik 2×2) =====================
export function bagBahce(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const R = k.R;
  const asma = (x, z, w, d, sira) => { for (let i = 0; i < sira; i++) { const zz = z - d / 2 + (d * (i + 0.5)) / sira; Y.kutu(w, 0.014, 0.014, x, Z + 0.15, zz, 'kutuk', 0x5a4030); for (const px of [-0.5, -0.17, 0.17, 0.5]) Y.silindir(0.009, 0.012, 0.16, 5, x + px * w, Z, zz, 'kutuk', 0x5a4030); Y.kutu(w * 0.97, 0.07, 0.05, x, Z + 0.08, zz, 'duz', 0x5a9a3a); if (!k.lod) for (let j = 0; j < Math.round(w / 0.08); j++) Y.kure(0.02, x - w / 2 + 0.03 + j * 0.08, Z + 0.07, zz + 0.03, 'duz', j % 3 === 0 ? 0x6a3a5a : 0x8aa850); } };
  const sikma = (x, z) => { Y.kutu(0.4, 0.18 * s, 0.34, x, Z, z, 'tasBlok', S.tasKrem); catiBesik(Y, { x0: x, z0: z, w: 0.4, d: 0.34, y: Z + 0.18 * s, H: 0.1, oh: 0.05, rake: 0.04, kal: 0.02, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false, sutun: 4 }); Y.prizma(kemerProfil(0.1, 0.13, 4), 0, 0.02, 'z', x, Z, z + 0.17, 'tahta', 0x4a2e1c); Y.silindir(0.05, 0.055, 0.04, 8, x + 0.28, Z, z + 0.1, 'tahta', 0x8a5a32); };
  const amfora = (x, z, s2 = 1) => { Y.ekle(new THREE.SphereGeometry(0.04 * s2, 8, 6), x, Z + 0.07 * s2, z, 'kerpic', 0xa86a44, { sy: 1.3, yumusak: true }); Y.silindir(0.015 * s2, 0.025 * s2, 0.04 * s2, 6, x, Z + 0.12 * s2, z, 'kerpic', 0xa86a44); Y.silindir(0.02, 0.012, 0.03, 6, x, Z, z, 'kerpic', 0x9a5c3a); };
  if (vr === 0) {
    asma(-0.15, -0.3, 1.0, 0.8, 4); asma(-0.15, 0.55, 1.0, 0.4, 2); sikma(0.6, -0.4); for (const [x, z] of [[0.45, 0.1], [0.6, 0.2], [0.72, 0.1]]) amfora(x, z);
    agac(Y, 0.65, 0.65, Z, 'zeytin', 1.0);
  } else if (vr === 1) {
    for (let i = 0; i < 9; i++) agac(Y, -0.6 + (i % 3) * 0.55, -0.55 + Math.floor(i / 3) * 0.55, Z, 'zeytin', 1.0 + R() * 0.2);
    for (const [x0, z0, x1, z1] of [[-0.9, 0.85, 0.9, 0.85], [0.9, 0.85, 0.9, -0.85]]) Y.k.cit(Y.nokta(x0, 0, z0)[0], Y.nokta(x0, 0, z0)[2], Y.nokta(x1, 0, z1)[0], Y.nokta(x1, 0, z1)[2], Z, 0x8a8478, 0.08);
    amfora(-0.8, 0.6); amfora(-0.68, 0.7); cuvalYigini(Y, S, 0.7, 0.62, Z, 0.4);
  } else {
    cardak(Y, S, { x: -0.1, z: -0.2, y: Z, w: 0.8, d: 0.7 }); asma(-0.1, 0.62, 0.9, 0.3, 2);
    // küçük sütunlu köşk
    Y.kutu(0.34, 0.03, 0.3, 0.62, Z, -0.55, 'mermer', S.tasAcik);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.silindir(0.016, 0.02, 0.2, 7, 0.62 + sx * 0.13, Z + 0.03, -0.55 + sz * 0.11, 'mermer', S.tasAcik);
    catiBesik(Y, { x0: 0.62, z0: -0.55, w: 0.38, d: 0.34, y: Z + 0.23, H: 0.08, oh: 0.03, rake: 0.03, kal: 0.02, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false, sutun: 3 });
    for (const [x, z] of [[0.55, 0.35], [0.7, 0.45], [0.62, 0.3]]) amfora(x, z, 0.9); agac(Y, 0.7, 0.75, Z, 'selvi', 1.0);
  }
}

// ===================== KURUTMA RAFI (göçebe 1×1) =====================
export function kurutmaRafi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'toprak'), Y = new Yerel(k, 0, 0, 0, 0);
  const seritler = (x, z, y, n, ry = 0, renk = [0xb86a50, 0xd8b890]) => { const A = Y.alt(x, z, ry); for (let i = 0; i < n; i++) A.kutu(0.025, 0.1 + (i % 2) * 0.03, 0.012, -0.09 + (i * 0.18) / Math.max(1, n - 1), y, 0, 'kumas', renk[i % 2]); };
  if (vr === 0) {
    for (const sz of [-1, 1]) { Y.kiris([-0.3, Z, sz * 0.14], [0, Z + 0.34, sz * 0.02], 0.025, 0.025, 'kutuk', 0x6b4a2c); Y.kiris([0.3, Z, sz * 0.14], [0, Z + 0.34, sz * 0.02], 0.025, 0.025, 'kutuk', 0x6b4a2c); }
    Y.kutu(0.64, 0.02, 0.02, 0, Z + 0.34, 0, 'kutuk', 0x6b4a2c);
    for (const t of [-0.2, 0, 0.2]) seritler(t, 0.0, Z + 0.18, 3);
    for (let i = 0; i < 3; i++) Y.kutu(0.02, 0.1, 0.012, -0.2 + i * 0.2, Z + 0.22, 0.0, 'kumas', i % 2 ? 0xd8b890 : 0xb86a50);
    cakmakTasi(Y, 0.0, 0.34, Z, 4);
  } else if (vr === 1) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.03, 0.28, 0.03, sx * 0.24, Z, sz * 0.18, 'kutuk', 0x6b4a2c);
    for (let i = 0; i < 5; i++) Y.kutu(0.55, 0.02, 0.03, 0, Z + 0.26, -0.15 + i * 0.075, 'kutuk', 0x7a5634);
    for (let i = 0; i < 4; i++) Y.kutu(0.07, 0.025, 0.12, -0.18 + i * 0.12, Z + 0.285, 0, 'kumas', i % 2 ? 0xd8b890 : 0xb86a50);
    Y.kiris([0.3, Z, 0.2], [0.3, Z + 0.24, 0.12], 0.04, 0.012, 'kutuk', 0x6b4a2c);
  } else {
    for (const sx of [-1, 1]) Y.kiris([sx * 0.28, Z, 0], [0, Z + 0.4, 0], 0.025, 0.025, 'kutuk', 0x6b4a2c);
    Y.kutu(0.04, 0.02, 0.4, 0, Z + 0.4, 0, 'kutuk', 0x6b4a2c);
    for (let i = 0; i < 5; i++) Y.kutu(0.02, 0.18, 0.012, 0, Z + 0.2 + 0.0, -0.16 + i * 0.08, 'kumas', i % 2 ? 0xd8b890 : 0xb86a50, { rz: (i % 2 ? 0.45 : -0.45) });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; Y.kure(0.03, Math.cos(a) * 0.1 + 0.0, Z + 0.025, 0.32 + Math.sin(a) * 0.08, 'moloz', 0x7d7870); }
    Y.koni(0.05, 0.05, 6, 0.0, Z, 0.32, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, 0.0, Z + 0.05, 0.32, 0.8); dumanNokta(Y, 0.0, Z + 0.45, 0.0, 0.8);
  }
}

// Savunma yapıları: Sur Parçası ve Çit (komşu bağlantılı çevre parçaları), Nöbet Çiti, Gözcü Direği, Muhafız Kulesi, Kışla. Her biri 3 varyant.
// Çevre parçaları (cit, sur_parcasi): `c.bag` maskesi (1:+x 2:-x 4:+z 8:-z) komşuya uzanan kolları belirler; kollar tüm varyantlarda aynı,
// varyant yalnız düğüm (direk/kule) tepesini değiştirir → zincir bütünlüğü korunur. Kaide yok (taban ZEMIN_Y+0.01), ölçek 1.
import * as THREE from 'three';
import { Yerel, kemerProfil } from '../geometri.js';
import { catiBesik, catiTek } from '../cati.js';
import { surParca, yuvarlakKule, kaleKapisi, sancak } from '../parcalar_kale.js';
import { deriBarinak, atesNokta, dumanNokta, komurYigini } from '../parcalar_atolye.js';
import { sutunCephe } from '../parcalar_atolye.js';
import { hedef, kuyu, agac } from '../parcalar_avlu.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;
const ZC = 0.31; // ZEMIN_Y + 0.01 (çevre parçaları kaidesiz)
const KOL = [[1, 1, 0], [2, -1, 0], [4, 0, 1], [8, 0, -1]];

// ===================== SUR PARÇASI (Orta Çağ, çevre) =====================
export function surParcasi(k, c, vr = 0) {
  const S = c.stil, Y = new Yerel(k, 0, 0, 0, 0), s = c.s, Z = ZC;
  const h = 0.36 * s;
  const kollar = KOL.filter(([b]) => c.bag & b);
  for (const [, dx, dz] of kollar) surParca(Y, S, { x0: 0, z0: 0, x1: dx * 0.5, z1: dz * 0.5, y: Z, h, t: 0.15, cift: true });
  if (vr === 0) {
    // kare bastion
    Y.kutu(0.36, h + 0.1, 0.36, 0, Z, 0, 'tasBlok', S.tas);
    Y.kutu(0.4, 0.04, 0.4, 0, Z + h + 0.1, 0, 'tasBlok', S.tasAcik);
    for (const t of [0.4]) Y.kutu(0.38, 0.02, 0.38, 0, Z + (h + 0.1) * t, 0, 'tasBlok', S.tasAcik);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) Y.kutu(0.1, 0.08, 0.1, sx * 0.15, Z + h + 0.14, sz * 0.15, 'tasBlok', S.tasAcik);
    for (const sx of [-1, 0, 1]) { Y.kutu(0.06, 0.06, 0.04, sx * 0.14, Z + h + 0.14, 0.19, 'tasBlok', S.tasAcik); Y.kutu(0.04, 0.06, 0.06, 0.19, Z + h + 0.14, sx * 0.14, 'tasBlok', S.tasAcik); }
    if (!k.lod) { Y.kutu(0.014, 0.07, 0.012, 0, Z + h * 0.55, 0.182, 'duz', 0x1c1814, { arka: true }); Y.kutu(0.012, 0.07, 0.014, 0.182, Z + h * 0.55, 0, 'duz', 0x1c1814, { arka: true }); }
  } else if (vr === 1) {
    // yuvarlak kule düğümü
    yuvarlakKule(Y, S, { x: 0, z: 0, y: Z, r: 0.2, h: (h + 0.28), seg: 10, uc: 'kulah', kulahH: 0.3 * s });
  } else {
    // konsollu (machicolation) taş direk + fener + sancak
    Y.kutu(0.34, h + 0.06, 0.34, 0, Z, 0, 'tasBlok', S.tas);
    Y.kutu(0.44, 0.07, 0.44, 0, Z + h + 0.04, 0, 'tasBlok', S.tasAcik);
    for (const t of [-1, 0, 1]) for (const sd of [-1, 1]) { Y.kutu(0.05, 0.08, 0.05, t * 0.14, Z + h - 0.02, sd * 0.2, 'tasBlok', S.tas); Y.kutu(0.05, 0.08, 0.05, sd * 0.2, Z + h - 0.02, t * 0.14, 'tasBlok', S.tas); }
    Y.kutu(0.3, 0.05, 0.3, 0, Z + h + 0.11, 0, 'tasBlok', S.tasAcik);
    sancak(Y, S, 0, 0, Z + h + 0.16, 0.26, 0xb03a2e);
    if (c.sv >= 1) Y.kutu(0.05, 0.06, 0.05, 0.12, Z + h + 0.16, 0.12, 'duz', S.camIsik, { isil: true });
  }
}

// ===================== ÇİT (göçebe, çevre) =====================
export function cit(k, c, vr = 0) {
  const S = c.stil, Y = new Yerel(k, 0, 0, 0, 0), Z = ZC;
  const kollar = KOL.filter(([b]) => c.bag & b);
  const R = k.R;
  const ark = kollar.length ? kollar : [KOL[0], KOL[1]];
  // düğüm direği (tüm varyantlar)
  Y.kutu(0.055, 0.24, 0.055, 0, Z, 0, 'kutuk', 0x6a4828);
  if (vr === 0) Y.koni(0.045, 0.06, 4, 0, Z + 0.24, 0, 'kutuk', 0x5e4022);
  else if (vr === 1) { Y.kutu(0.07, 0.025, 0.07, 0, Z + 0.24, 0, 'kutuk', 0x5e4022); Y.kure(0.03, 0, Z + 0.28, 0, 'kemik', 0xe8dcc0); }
  else { Y.koni(0.045, 0.05, 4, 0, Z + 0.24, 0, 'kutuk', 0x5e4022); Y.kutu(0.012, 0.1, 0.012, 0.02, Z + 0.22, 0.0, 'kumas', 0xa8432f); }
  for (const [, dx, dz] of ark) {
    const A = Y.alt(0, 0, Math.atan2(-dz, dx));  // yerel x = kol yönü
    const L = kollar.length ? 0.5 : 0.24;
    if (vr === 0) { // sivri kazık duvarı
      for (const t of [0.08, 0.15, 0.22, 0.29, 0.36, 0.43]) if (t < L) { const hh = 0.18 + (R() - 0.5) * 0.04; A.kutu(0.035, hh, 0.035, t, Z, (R() - 0.5) * 0.01, 'kutuk', 0x7a5634); A.koni(0.026, 0.045, 4, t, Z + hh, 0, 'kutuk', 0x5e4022); }
      for (const yy of [0.06, 0.13]) A.kutu(L, 0.022, 0.018, L / 2, Z + yy, 0.022, 'tahta', 0x9a7648);
    } else if (vr === 1) { // hasır örgü paneller
      for (let i = 0; i < 6; i++) A.kutu(L, 0.022, 0.03, L / 2, Z + 0.03 + i * 0.024, (i % 2) * 0.008 - 0.004, 'hasir', i % 2 ? 0xa8854e : 0xb89860);
      for (const t of [0.16, 0.33, 0.5]) if (t <= L + 0.001) A.kutu(0.026, 0.19, 0.026, Math.min(t, L), Z, 0, 'kutuk', 0x6a4828);
    } else { // kütük korkuluk + dikenli çalı
      for (const yy of [0.07, 0.14]) A.silindir(0.014, 0.014, L, 6, L / 2, Z + yy - L / 2, 0.0, 'kutuk', 0x7a5634, { rz: PI / 2 }); // yatay silindir: merkez y = ly + h/2
      for (const t of [0.17, 0.34]) if (t < L) A.kutu(0.028, 0.18, 0.028, t, Z, 0, 'kutuk', 0x6a4828);
      if (!k.lod) for (let i = 0; i < 5; i++) A.kure(0.03 + R() * 0.012, 0.07 + i * (L - 0.1) / 4, Z + 0.05 + R() * 0.03, (R() - 0.5) * 0.04, 'duz', i % 2 ? 0x5a6a3a : 0x6a5a34);
    }
  }
}

// ===================== NÖBET ÇİTİ (taş devri) =====================
export function nobetCiti(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'toprak'), Y = new Yerel(k, 0, 0, 0, 0);
  const R = k.R;
  const atesCukuru = (x, z) => { for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2; Y.kure(0.03, x + Math.cos(a) * 0.08, Z + 0.03, z + Math.sin(a) * 0.08, 'moloz', 0x7d7870); } Y.koni(0.05, 0.045, 6, x, Z, z, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, x, Z + 0.05, z, 0.8); };
  if (vr === 0) {
    for (let i = 0; i < 9; i++) { const x = -0.38 + i * 0.095, z = 0.18 + Math.pow((x) * 1.6, 2) * 0.25; const hh = 0.24 + (R() - 0.5) * 0.05; Y.kiris([x, Z, z], [x + (x > 0 ? 0.012 : -0.012), Z + hh, z - 0.03], 0.03, 0.03, 'kutuk', 0x7a5634); Y.koni(0.02, 0.05, 4, x + (x > 0 ? 0.012 : -0.012), Z + hh, z - 0.03, 'kutuk', 0x5e4022); }
    atesCukuru(0.0, -0.15); Y.silindir(0.045, 0.05, 0.07, 7, -0.25, Z, -0.2, 'kutuk', 0x8a6238);
    for (let i = 0; i < 3; i++) Y.kiris([0.3 + i * 0.035, Z, -0.2], [0.34 + i * 0.035, Z + 0.26, -0.2], 0.008, 0.008, 'kutuk', 0x6b4a2c);
  } else if (vr === 1) {
    for (let i = 0; i < 6; i++) Y.silindir(0.026, 0.026, 0.62, 6, 0, Z + 0.025 + i * 0.043 - 0.31, 0.2, 'kutuk', i % 2 ? 0x7a5634 : 0x6a4a2c, { rz: PI / 2 });
    for (const sx of [-1, 1]) Y.kutu(0.04, 0.34, 0.04, sx * 0.3, Z, 0.2, 'kutuk', 0x5e4022);
    // gözcü platformu: kazıklar üstünde tahta zemin + deri çatı
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.03, 0.36, 0.03, 0.0 + sx * 0.14, Z, -0.2 + sz * 0.12, 'kutuk', 0x5e4022);
    Y.kutu(0.36, 0.025, 0.32, 0.0, Z + 0.36, -0.2, 'tahta', 0x8a6a44);
    Y.prizma([[-0.17, 0], [0.17, 0], [0, 0.12]], -0.16, 0.16, 'x', 0.0, Z + 0.4, -0.2, 'deri', 0xc9a57a);
    Y.kiris([0.2, Z, 0.0], [0.15, Z + 0.37, -0.12], 0.02, 0.012, 'kutuk', 0x6b4a2c);
  } else {
    if (!k.lod) for (let i = 0; i < 11; i++) { const a = -0.9 + (i / 10) * 1.8; Y.kure(0.05 + R() * 0.02, Math.sin(a) * 0.42, Z + 0.05 + R() * 0.04, 0.2 + (1 - Math.cos(a)) * 0.18, 'duz', [0x5a6a3a, 0x6a5a34, 0x4f5f34][i % 3]); } else for (let i = 0; i < 4; i++) Y.kure(0.07, -0.3 + i * 0.2, Z + 0.06, 0.2, 'duz', 0x5a6a3a);
    for (let i = 0; i < 9; i++) { const a = -0.8 + i * 0.2; Y.koni(0.012, 0.07, 4, Math.sin(a) * 0.42, Z + 0.1, 0.2 + (1 - Math.cos(a)) * 0.18, 'kutuk', 0x6a4a2c, { rx: -0.4 }); }
    deriBarinak(Y, S, { x: 0.0, z: -0.22, y: Z, w: 0.4, d: 0.28, h: 0.24, ry: 0 }); atesCukuru(0.32, -0.1);
  }
}

// ===================== GÖZCÜ DİREĞİ (göçebe) =====================
export function gozcuDiregi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'toprak'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const bag = (x, y, z, a = 0.0) => Y.kutu(0.07, 0.014, 0.014, x, y, z, 'kumas', 0xa8432f, { ry: a });
  if (vr === 0) {
    Y.silindir(0.025, 0.035, 0.85 * s, 7, 0, Z, 0, 'kutuk', 0x6b4a2c);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kiris([sx * 0.1, Z + 0.55 * s, sz * 0.1], [0, Z + 0.4 * s, 0], 0.016, 0.016, 'kutuk', 0x6b4a2c);
    Y.kutu(0.3, 0.025, 0.3, 0, Z + 0.62 * s, 0, 'tahta', 0x8a6a44);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.016, 0.14, 0.016, sx * 0.14, Z + 0.645 * s, sz * 0.14, 'kutuk', 0x6b4a2c);
    Y.koni(0.22, 0.12, 4, 0, Z + 0.78 * s, 0, 'deri', 0xc9a57a, { ry: PI / 4 });
    for (let i = 0; i < 6; i++) Y.kutu(0.1, 0.012, 0.012, 0.12, Z + 0.06 + i * 0.09, 0.0 + (i % 2) * 0.008, 'kutuk', 0x6b4a2c);
    Y.kiris([0.04, Z, 0.16], [0.1, Z + 0.62 * s, 0.1], 0.012, 0.012, 'kutuk', 0x7a5634); bag(0.0, Z + 0.84 * s, 0.0);
  } else if (vr === 1) {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2 + 0.4; Y.kiris([Math.cos(a) * 0.22, Z, Math.sin(a) * 0.22], [0, Z + 0.7 * s, 0], 0.03, 0.03, 'kutuk', 0x6b4a2c); }
    Y.silindir(0.1, 0.06, 0.07, 8, 0, Z + 0.7 * s, 0, 'duz', 0x4a4a52);
    Y.koni(0.08, 0.1, 6, 0, Z + 0.77 * s, 0, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, 0, Z + 0.8 * s, 0, 1.1); dumanNokta(Y, 0, Z + 0.9 * s, 0, 0.9);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; Y.kure(0.03, Math.cos(a) * 0.3, Z + 0.03, Math.sin(a) * 0.3, 'moloz', 0x7d7870); }
    Y.silindir(0.04, 0.045, 0.07, 7, 0.25, Z, -0.25, 'kutuk', 0x8a6238);
  } else {
    Y.silindir(0.15, 0.2, 0.34 * s, 9, 0, Z, 0, 'kutuk', 0x7a5634);
    for (let i = 0; i < 4; i++) Y.silindir(0.17, 0.17, 0.012, 9, 0, Z + 0.06 + i * 0.07, 0, 'kutuk', 0x5e4022);
    Y.kutu(0.4, 0.025, 0.4, 0, Z + 0.34 * s, 0, 'tahta', 0x8a6a44);
    for (const sx of [-1, 1]) Y.kutu(0.018, 0.12, 0.4, sx * 0.19, Z + 0.365 * s, 0, 'kutuk', 0x6b4a2c);
    Y.kutu(0.4, 0.12, 0.018, 0, Z + 0.365 * s, -0.19, 'kutuk', 0x6b4a2c);
    for (let i = 0; i < 6; i++) Y.kutu(0.14, 0.014, 0.012, 0.0, Z + 0.04 + i * 0.055, 0.2, 'kutuk', 0x6b4a2c, { ry: 0 });
    Y.kiris([0.05, Z, 0.22], [0.09, Z + 0.34 * s, 0.18], 0.012, 0.012, 'kutuk', 0x7a5634);
    Y.silindir(0.007, 0.009, 0.3, 5, 0.17, Z + 0.36 * s, -0.17, 'kutuk', 0x5e4022); Y.kutu(0.14, 0.07, 0.008, 0.24, Z + 0.6 * s, -0.17, 'kumas', 0xa8432f);
  }
}

// ===================== MUHAFIZ KULESİ (bronz) =====================
export function muhafizKulesi(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(1, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  if (vr === 0) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kiris([sx * 0.2, Z, sz * 0.2], [sx * 0.14, Z + 0.62 * s, sz * 0.14], 0.045, 0.045, 'kutuk', 0x5e4022);
    for (const yy of [0.2, 0.4]) Y.kutu(0.4 - yy * 0.2, 0.02, 0.4 - yy * 0.2, 0, Z + yy * s, 0, 'kutuk', 0x6b4a2c);
    Y.kutu(0.34, 0.03, 0.34, 0, Z + 0.62 * s, 0, 'tahta', 0x8a6a44);
    for (const sx of [-1, 1]) { Y.kutu(0.02, 0.1, 0.34, sx * 0.16, Z + 0.65 * s, 0, 'tahta', 0x7a5634); Y.kutu(0.34, 0.1, 0.02, 0, Z + 0.65 * s, sx * 0.16, 'tahta', 0x7a5634); }
    catiBesik(Y, { x0: 0, z0: 0, w: 0.42, d: 0.42, y: Z + 0.62 * s + 0.2, H: 0.14, oh: 0.05, rake: 0.04, kal: 0.02, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false, sutun: 4, satirUst: 3, satirAlt: 2 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.025, 0.2, 0.025, sx * 0.17, Z + 0.65 * s, sz * 0.17, 'kutuk', 0x5e4022);
    for (let i = 0; i < 9; i++) Y.kutu(0.14, 0.014, 0.012, 0.0, Z + 0.04 + i * 0.065, 0.22 - i * 0.002, 'kutuk', 0x6b4a2c, { rz: 0 });
    Y.kiris([0.05, Z, 0.26], [0.1, Z + 0.62 * s, 0.17], 0.014, 0.014, 'kutuk', 0x7a5634);
  } else if (vr === 1) {
    Y.kutu(0.34, 0.5 * s, 0.34, 0, Z, 0, 'kerpic', S.siva[0]);
    Y.kutu(0.4, 0.04, 0.4, 0, Z + 0.5 * s, 0, 'tasBlok', S.tasAcik);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) Y.kutu(0.09, 0.08, 0.09, sx * 0.15, Z + 0.54 * s, sz * 0.15, 'kerpic', S.siva[0]);
    Y.prizma(kemerProfil(0.09, 0.14, 4), 0, 0.02, 'z', 0, Z, 0.17, 'tahta', 0x4a2e1c);
    Y.kutu(0.015, 0.07, 0.012, 0.1, Z + 0.3 * s, 0.172, 'duz', 0x1c1814, { arka: true }); Y.kutu(0.015, 0.07, 0.012, -0.1, Z + 0.3 * s, 0.172, 'duz', 0x1c1814, { arka: true });
    Y.silindir(0.06, 0.045, 0.05, 8, 0, Z + 0.54 * s, 0, 'duz', 0x4a4a52); Y.koni(0.05, 0.08, 6, 0, Z + 0.59 * s, 0, 'duz', 0xff5a1a, { isil: true }); atesNokta(Y, 0, Z + 0.62 * s, 0, 1.0); dumanNokta(Y, 0, Z + 0.72 * s, 0, 0.8);
    Y.kiris([0.0, Z, 0.34], [0.0, Z + 0.4 * s, 0.17], 0.12, 0.014, 'tahta', 0x8a6238);
  } else {
    yuvarlakKule(Y, S, { x: 0, z: 0, y: Z, r: 0.17, h: 0.58 * s, seg: 9, uc: 'kulah', kulahH: 0.3 * s });
    Y.prizma(kemerProfil(0.09, 0.13, 4), 0, 0.02, 'z', 0, Z, 0.168, 'tahta', 0x4a2e1c);
    for (let i = 0; i < 4; i++) Y.kutu(0.18 - i * 0.025, 0.022, 0.07, 0, Z + i * 0.022, 0.2 - i * 0.02, 'tasBlok', S.tas, { arka: true });
  }
}

// ===================== KIŞLA (antik 2×2) =====================
export function kisla(k, c, vr = 0) {
  const S = c.stil, Z = k.kaide(2, 'tas'), Y = new Yerel(k, 0, 0, 0, 0), s = c.s;
  const govde = (w, h, d, x, z, renk = S.siva[0]) => Y.kutu(w, h, d, x, Z, z, 'kerpic', renk);
  const cati = (x, z, w, d, y, H) => catiBesik(Y, { x0: x, z0: z, w, d, y, H, oh: 0.05, rake: 0.04, kal: 0.022, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, th: 0.009, alin: false });
  const cadirYap = (x, z, ry, renk = 0xe8dcc0) => { const A = Y.alt(x, z, ry); A.prizma([[-0.1, 0], [0.1, 0], [0, 0.14]], -0.14, 0.14, 'x', 0, Z, 0, 'kumas', renk); A.kutu(0.01, 0.17, 0.01, 0.0, Z, 0.145, 'kutuk', S.kiris, { arka: true }); };
  if (vr === 0) {
    // KASTRUM: dört köşe kulesi + sur + ön kapı + iç kışla binası
    const a = 0.62, hs = 0.3 * s;
    surParca(Y, S, { x0: -a, z0: a, x1: -0.2, z1: a, y: Z, h: hs, t: 0.1, ok: false }); surParca(Y, S, { x0: 0.2, z0: a, x1: a, z1: a, y: Z, h: hs, t: 0.1, ok: false });
    surParca(Y, S, { x0: a, z0: a, x1: a, z1: -a, y: Z, h: hs, t: 0.1, ok: false }); surParca(Y, S, { x0: a, z0: -a, x1: -a, z1: -a, y: Z, h: hs, t: 0.1, ok: false }); surParca(Y, S, { x0: -a, z0: -a, x1: -a, z1: a, y: Z, h: hs, t: 0.1, ok: false });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) yuvarlakKule(Y, S, { x: sx * a, z: sz * a, y: Z, r: 0.12, h: hs + 0.16, seg: 8, uc: 'kulah', kulahH: 0.22 });
    kaleKapisi(Y, S, { x: 0, z: a, y: Z, w: 0.34, h: 0.4 * s, kuleR: 0.1, kopruBoy: 0.16 });
    govde(0.8, 0.2, 0.34, 0.0, -0.45); cati(0.0, -0.45, 0.8, 0.34, Z + 0.2, 0.1);
    for (const sx of [-1, 1]) { Y.kutu(0.05, 0.2, 0.05, sx * 0.33, Z, -0.26, 'tasBlok', S.tasAcik); }
    hedef(Y, S, 0.4, 0.2, Z); hedef(Y, S, 0.55, 0.0, Z); sancak(Y, S, -0.4, 0.2, Z, 0.34, 0xb03a2e);
    for (let i = 0; i < 3; i++) Y.kutu(0.05, 0.13, 0.018, -0.5 + i * 0.07, Z, 0.55, 'duz', 0x6a5a4a, { ry: 0.1 * i });
  } else if (vr === 1) {
    // UZUN KIŞLA + SÜTUNLU REVAK + BAYRAK DİREĞİ + TALİM ALANI
    govde(1.4, 0.26 * s, 0.55, 0.0, -0.35); cati(0.0, -0.35, 1.4, 0.55, Z + 0.26 * s, 0.14 * s);
    sutunCephe(Y, S, { x: 0.0, z: -0.02, y: Z, w: 1.2, h: 0.2 * s, adet: 7, derin: 0.12, alinlik: false });
    for (const x of [-0.45, -0.15, 0.15, 0.45]) { Y.prizma(kemerProfil(0.09, 0.13, 4), 0, 0.02, 'z', x, Z, -0.075, 'tahta', 0x4a2e1c); }
    Y.silindir(0.012, 0.016, 0.7, 6, 0.75, Z, 0.45, 'kutuk', S.kiris); Y.kutu(0.18, 0.1, 0.01, 0.84, Z + 0.62, 0.45, 'kumas', 0xb03a2e);
    for (let i = 0; i < 3; i++) hedef(Y, S, -0.5 + i * 0.35, 0.55, Z);
    for (const x of [-0.7, 0.7]) Y.kutu(0.07, 0.14, 0.05, x, Z, 0.2, 'duz', 0x6a5a4a);
  } else {
    // PALİSATLI KAMP: sivri uçlu çit çemberi, gözcü kulesi, kapı, çadırlar
    const r = 0.8;
    for (let i = 0; i < 36; i++) { const q = (i / 36) * PI * 2; if (Math.sin(q) > 0.9 || (k.lod && i % 2)) continue; Y.silindir(0.014, 0.018, 0.22, 5, Math.cos(q) * r, Z, Math.sin(q) * r, 'kutuk', 0x6a4a2c); Y.koni(0.02, 0.04, 5, Math.cos(q) * r, Z + 0.22, Math.sin(q) * r, 'kutuk', 0x5e4022); }
    for (const sx of [-1, 1]) { Y.kutu(0.05, 0.34, 0.05, sx * 0.14, Z, 0.8, 'kutuk', 0x5e4022); Y.koni(0.05, 0.06, 4, sx * 0.14, Z + 0.34, 0.8, 'kutuk', 0x5e4022); }
    Y.kutu(0.34, 0.03, 0.04, 0, Z + 0.3, 0.8, 'kutuk', 0x5e4022);
    cadirYap(-0.35, -0.2, 0.2); cadirYap(0.0, -0.4, -0.1, 0xd8c8a8); cadirYap(0.38, -0.15, 0.4); cadirYap(-0.35, 0.3, -0.3, 0xd8c8a8);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.kutu(0.03, 0.4, 0.03, 0.55 + sx * 0.1, Z, 0.35 + sz * 0.1, 'kutuk', 0x5e4022);
    Y.kutu(0.26, 0.025, 0.26, 0.55, Z + 0.4, 0.35, 'tahta', 0x8a6a44); Y.koni(0.22, 0.12, 4, 0.55, Z + 0.46, 0.35, S.catiDoku, S.kiremit[0], { ry: PI / 4 });
    Y.kiris([0.45, Z, 0.5], [0.5, Z + 0.4, 0.4], 0.012, 0.012, 'kutuk', 0x7a5634);
    atesNokta(Y, 0.0, Z + 0.04, 0.2, 0.8); for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; Y.kure(0.03, Math.cos(a) * 0.08, Z + 0.03, 0.2 + Math.sin(a) * 0.08, 'moloz', 0x7d7870); } Y.koni(0.05, 0.045, 6, 0, Z, 0.2, 'duz', 0xff5a1a, { isil: true });
    hedef(Y, S, 0.3, 0.6, Z);
  }
}
void komurYigini; void kuyu; void agac; void catiTek; void THREE;

// Tarım/çiftlik parçaları: hayvanlar (koyun, inek, tavuk), tarla (ekin sıraları), korkuluk, saman yığını, silo, yüksek ambar (mantar taşlı),
// tahta kaplı ahır gövdesi, açık samanlık, kümes, sadaf (su kaldıraç), küp (pithos), ağıl çiti, asma/çardak.
// Ahır ailesi: ahır + samanlık + ambar + silo aynı malzeme dilini (tahta kaplama, saman/kiremit çatı, taş taban) paylaşır.
import * as THREE from 'three';
import { catiBesik } from './cati.js';
import { kemerProfil } from './geometri.js';

const PI = Math.PI;
const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

// ---------- hayvanlar ----------
export function koyun(Y, x, z, y, ry = 0, s = 1) {
  const A = Y.alt(x, z, ry);
  A.ekle(new THREE.IcosahedronGeometry(0.045 * s, Y.k.lod ? 0 : 1), 0, y + 0.07 * s, 0, 'kumas', 0xf0ead8, { sx: 1.25, sy: 0.9 });
  A.kutu(0.04 * s, 0.045 * s, 0.04 * s, 0.065 * s, y + 0.075 * s, 0, 'duz', 0x3a302a);
  if (!Y.k.lod) for (const [lx, lz] of [[-0.03, -0.02], [-0.03, 0.02], [0.03, -0.02], [0.03, 0.02]]) A.kutu(0.01 * s, 0.045 * s, 0.01 * s, lx * s, y, lz * s, 'duz', 0x3a302a);
}
export function inek(Y, x, z, y, ry = 0, s = 1, renk = 0xf0ead8) {
  const A = Y.alt(x, z, ry);
  A.kutu(0.16 * s, 0.075 * s, 0.07 * s, 0, y + 0.06 * s, 0, 'kumas', renk);
  A.kutu(0.06 * s, 0.06 * s, 0.055 * s, 0.11 * s, y + 0.085 * s, 0, 'kumas', carp(renk, 0.92));
  A.kutu(0.025 * s, 0.025 * s, 0.05 * s, 0.14 * s, y + 0.085 * s, 0, 'duz', 0xe0b8a0);
  if (!Y.k.lod) {
    for (const [lx, lz] of [[-0.06, -0.025], [-0.06, 0.025], [0.06, -0.025], [0.06, 0.025]]) A.kutu(0.018 * s, 0.065 * s, 0.018 * s, lx * s, y, lz * s, 'duz', carp(renk, 0.8));
    A.kutu(0.045 * s, 0.03 * s, 0.073 * s, -0.02 * s, y + 0.1 * s, 0, 'duz', 0x4a3a30); // leke
    for (const sz of [-1, 1]) A.kutu(0.01 * s, 0.025 * s, 0.01 * s, 0.1 * s, y + 0.125 * s, sz * 0.025 * s, 'duz', 0xe8dcc0);
  }
}
export function tavuk(Y, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  A.ekle(new THREE.IcosahedronGeometry(0.02, 0), 0, y + 0.03, 0, 'kumas', 0xf2eee4, { sx: 1.2 });
  A.kure(0.011, 0.02, y + 0.052, 0, 'duz', 0xf2eee4); A.kutu(0.012, 0.008, 0.008, 0.032, y + 0.054, 0, 'duz', 0xd04a3a);
}

// ---------- tarla ----------
/** Ekin sıraları. o: { x,z,y,w,d,tur: 'bugday'|'sebze'|'misir'|'saman', yon: 'x'|'z', sira, ry } */
export function tarla(Y, S, o) {
  const { x, z, y, w, d, tur = 'bugday', sira = Math.max(3, Math.round(d / 0.08)), ry = 0 } = o;
  const R = Y.k.R;
  const A = Y.alt(x, z, ry);
  A.kutu(w + 0.03, 0.02, d + 0.03, 0, y, 0, 'toprak', 0x5a4028);
  const bd = d / sira;
  const renkler = { bugday: [0xd9bf52, 0xc8a840, 0xe0c860], sebze: [0x5a9a3a, 0x6aaa44, 0x8fb23a], misir: [0x6aa040, 0x7ab04a], saman: [0xd8b858, 0xc8a848] }[tur] || [0xd9bf52];
  for (let i = 0; i < sira; i++) {
    const zz = -d / 2 + bd * (i + 0.5);
    A.kutu(w * 0.96, 0.016, bd * 0.34, 0, y + 0.02, zz, 'toprak', 0x6a4a30);
    if (tur === 'misir') {
      const n = Y.k.lod ? 3 : Math.round(w / 0.07);
      for (let j = 0; j < n; j++) A.kutu(0.012, 0.11 + R() * 0.03, 0.012, -w / 2 + (w * (j + 0.5)) / n, y + 0.02, zz, 'duz', renkler[j % 2]);
    } else {
      A.kutu(w * 0.94, tur === 'bugday' ? 0.075 : 0.045, bd * 0.46, 0, y + 0.02, zz, 'ekin', renkler[i % renkler.length]);
    }
  }
}
export function korkuluk(Y, S, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  A.silindir(0.008, 0.01, 0.2, 5, 0, y, 0, 'kutuk', S.kiris);
  A.kutu(0.17, 0.01, 0.01, 0, y + 0.14, 0, 'kutuk', S.kiris);
  A.kutu(0.05, 0.07, 0.025, 0, y + 0.08, 0, 'kumas', 0x8a6a50);
  A.kure(0.022, 0, y + 0.225, 0, 'duz', 0xd8c08a);
  A.koni(0.04, 0.025, 6, 0, y + 0.235, 0, 'saman', 0xc8a050);
}
export function samanYigini(Y, x, z, y, s = 1) {
  Y.silindir(0.01 * s, 0.075 * s, 0.14 * s, 8, x, y, z, 'saman', 0xd0aa58, { yumusak: false });
  Y.silindir(0.075 * s, 0.075 * s, 0.05 * s, 8, x, y, z, 'saman', 0xc09a48);
  Y.silindir(0.004, 0.004, 0.06 * s, 4, x, y + 0.13 * s, z, 'kutuk', 0x5a4030);
}
/** Mantar taşı (fare engeli): sap + yassı başlık */
export function mantarTasi(Y, S, x, z, y) {
  Y.silindir(0.016, 0.022, 0.06, 6, x, y, z, 'tasBlok', S.tas);
  Y.silindir(0.04, 0.03, 0.02, 7, x, y + 0.06, z, 'tasBlok', S.tasAcik);
}
/** Küp (pithos): geniş karınlı depolama küpü */
export function kup(Y, S, x, z, y, s = 1, renk = 0xa86a44) {
  Y.silindir(0.03 * s, 0.025 * s, 0.03 * s, 8, x, y, z, 'kerpic', renk);
  Y.ekle(new THREE.SphereGeometry(0.05 * s, 9, 6), x, y + 0.06 * s, z, 'kerpic', renk, { sy: 1.1, yumusak: true });
  Y.silindir(0.028 * s, 0.04 * s, 0.025 * s, 8, x, y + 0.105 * s, z, 'kerpic', carp(renk, 0.95));
  Y.silindir(0.034 * s, 0.034 * s, 0.01 * s, 8, x, y + 0.13 * s, z, 'kerpic', carp(renk, 1.1));
}

// ---------- ahır ailesi ----------
/**
 * Tahta kaplamalı ahır/depo gövdesi (+z ön): taş taban, dikey tahta + çıta, alın, çift kanatlı X çıtalı kapı, samanlık kapağı, havalandırma.
 * o: { x,z,y,w,d,h, cati: 'saman'|'kiremit'|'arduvaz', H, tas: false(true=taş duvar), kapi: true, samanlik: true }
 * Dönüş: { cati } (yAt için).
 */
export function ahirGovde(Y, S, o) {
  const { x, z, y, w, d, h, H = 0.34, cati = 'saman', tas = false, kapiVar = true, samanlik = true } = o;
  const doku = tas ? 'tasBlok' : 'tahta', renk = tas ? S.tas : 0x9a7a54;
  Y.kutu(w + 0.04, 0.06, d + 0.04, x, y, z, 'tasBlok', S.tas);                                // taş taban
  Y.kutu(w, h, d, x, y + 0.05, z, doku, renk);
  if (!tas && !Y.k.lod) for (let i = 0; i <= Math.round(w / 0.14); i++) Y.kutu(0.018, h - 0.02, 0.012, x - w / 2 + (w * i) / Math.round(w / 0.14), y + 0.06, z + d / 2 + 0.004, 'kutuk', 0x6a4a2c);
  const yr = cati === 'saman' ? [[0xd0aa58, 0xc8a050, 0xb89040, 0xd8b460], 'saman'] : cati === 'arduvaz' ? [S.arduvaz, 'arduvaz'] : [S.kiremit, S.catiDoku];
  const ct = catiBesik(Y, { x0: x, z0: z, w, d, y: y + 0.05 + h, H, oh: 0.07, rake: 0.05, kal: 0.03, kivrim: cati === 'saman' ? 0.03 : 0.015, renk: yr[0], doku: yr[1], kabukRenk: S.kiris, th: cati === 'saman' ? 0.014 : 0.009, alin: false, satirUst: cati === 'saman' ? 3 : undefined, satirAlt: cati === 'saman' ? 3 : undefined });
  // alın tahtaları (üçgen)
  for (const sx of [-1, 1]) Y.prizma([[z - d / 2 + 0.02, y + 0.05 + h], [z + d / 2 - 0.02, y + 0.05 + h], [z, y + 0.05 + h + H - 0.06]], x + sx * (w / 2) - (sx > 0 ? 0.03 : 0), x + sx * (w / 2) + (sx > 0 ? 0 : 0.03), 'x', 0, 0, 0, doku, renk);
  Y.prizma([[x - w / 2 + 0.02, y + 0.05 + h], [x + w / 2 - 0.02, y + 0.05 + h], [x, y + 0.05 + h + H - 0.06]], z + d / 2 - 0.03, z + d / 2, 'z', 0, 0, 0, doku, renk);
  const F = Y.alt(x, z + d / 2, 0, 0); F.cephe = true;
  if (kapiVar) {
    const kw = Math.min(0.34, w * 0.4), kh = Math.min(0.3, h * 0.85);
    F.kutu(kw + 0.05, kh + 0.03, 0.03, 0, y + 0.05, 0.004, 'kutuk', S.kiris);
    F.kutu(kw / 2 - 0.004, kh, 0.03, -kw / 4, y + 0.05, 0.012, 'tahta', 0x8a5a3a); F.kutu(kw / 2 - 0.004, kh, 0.03, kw / 4, y + 0.05, 0.012, 'tahta', 0x8a5a3a);
    for (const s of [-1, 1]) { F.kiris([s * kw / 2 - s * 0.01, y + 0.05 + 0.02, 0.03], [s * 0.01, y + 0.05 + kh - 0.02, 0.03], 0.016, 0.01, 'kutuk', S.kiris); F.kiris([s * 0.01, y + 0.05 + 0.02, 0.03], [s * kw / 2 - s * 0.01, y + 0.05 + kh - 0.02, 0.03], 0.016, 0.01, 'kutuk', S.kiris); }
  }
  if (samanlik) { // alın üstünde samanlık kapağı + vinç kirişi
    const hy = y + 0.05 + h + 0.04;
    F.kutu(0.13, 0.12, 0.02, 0, hy, 0.004, 'kutuk', S.kiris);
    F.kutu(0.1, 0.1, 0.02, 0, hy + 0.01, 0.012, 'duz', 0x2a2018, { arka: true });
    if (!Y.k.lod) F.kiris([0, hy + 0.2, 0.0], [0, hy + 0.2, 0.15], 0.016, 0.018, 'kutuk', S.kirisAcik);
  }
  return { cati: ct };
}
/** Açık samanlık (hollanda tipi): direkler + büyük çatı + içinde saman balyaları. o: { x,z,y,w,d,h,H } */
export function acikSamanlik(Y, S, o) {
  const { x, z, y, w, d, h = 0.34, H = 0.32 } = o;
  const n = Math.max(3, Math.round(w / 0.4));
  for (let i = 0; i < n; i++) for (const sz of [-1, 1]) Y.kutu(0.04, h, 0.04, x - w / 2 + (w * i) / (n - 1), y, z + sz * d / 2, 'kutuk', S.kiris);
  for (const sz of [-1, 1]) Y.kutu(w + 0.04, 0.03, 0.04, x, y + h - 0.02, z + sz * d / 2, 'kutuk', S.kirisAcik);
  catiBesik(Y, { x0: x, z0: z, w, d, y: y + h, H, oh: 0.06, rake: 0.05, kal: 0.03, kivrim: 0.025, renk: [0xd0aa58, 0xc8a050, 0xb89040], doku: 'saman', kabukRenk: S.kiris, th: 0.014, alin: false, satirUst: 3, satirAlt: 3 });
  Y.kutu(w - 0.08, 0.04, d - 0.06, x, y, z, 'tahta', 0x7a5a38); // zemin
  for (let i = 0; i < (Y.k.lod ? 3 : 7); i++) Y.kutu(0.12, 0.07, 0.08, x - w / 2 + 0.14 + (i % 4) * 0.15 * (w / 0.8), y + 0.04 + Math.floor(i / 4) * 0.07, z + (i % 2 ? 0.05 : -0.06), 'saman', 0xd0aa58, { ry: (i % 3) * 0.2 });
}
/** Silo (yuvarlak tahıl ambarı): taş/kerpiç gövde + konik saman çatı + merdiven. o: { x,z,y,r,h } */
export function silo(Y, S, o) {
  const { x, z, y, r, h, doku = 'tasBlok', renk = S.tasKrem ?? S.tas, kulah = 'saman' } = o;
  Y.silindir(r * 1.08, r * 1.12, 0.05, 10, x, y, z, 'tasBlok', S.tas);
  Y.silindir(r * 0.94, r, h, 10, x, y + 0.04, z, doku, renk);
  for (const t of [0.35, 0.7]) Y.silindir(r * 1.02, r * 1.02, 0.014, 10, x, y + 0.04 + h * t, z, 'tasBlok', S.tas);
  const top = y + 0.04 + h;
  Y.silindir(r * 1.16, r * 0.96, 0.04, 10, x, top - 0.01, z, 'tasBlok', S.tasAcik);
  const kh = r * 1.1;
  if (kulah === 'saman') Y.silindir(0.0, r * 1.26, kh, 10, x, top + 0.03, z, 'saman', 0xc8a050, { yumusak: false });
  else Y.silindir(0.0, r * 1.2, kh, 10, x, top + 0.03, z, S.catiDoku, S.kiremit[0], { yumusak: false });
  Y.silindir(0.006, 0.006, 0.08, 5, x, top + 0.03 + kh - 0.01, z, 'kutuk', S.kiris);
  Y.prizma(kemerProfil(0.1, 0.16, 4), 0, 0.02, 'z', x, y + 0.04, z + r * 0.97, 'tahta', 0x6a4a2a); // kapı
  if (!Y.k.lod) Y.kiris([x + r * 0.8, y + 0.04, z + r * 1.0], [x + r * 0.5, y + 0.04 + h * 0.35, z + r * 1.0], 0.02, 0.016, 'kutuk', S.kiris);
}
/** Yüksek ambar (mantar taşları üzerinde, merdivenli): tahta kasa + çatı. o: { x,z,y,w,d,h, cati } */
export function yuksekAmbar(Y, S, o) {
  const { x, z, y, w, d, h = 0.22, H = 0.2, cati = 'kiremit' } = o;
  const taban = y + 0.09;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mantarTasi(Y, S, x + sx * (w / 2 - 0.05), z + sz * (d / 2 - 0.05), y);
  Y.kutu(w + 0.02, 0.025, d + 0.02, x, taban, z, 'tahta', 0x6a4a2c);
  Y.kutu(w, h, d, x, taban + 0.025, z, 'tahta', 0x9a7a54);
  if (!Y.k.lod) for (let i = 1; i < Math.round(w / 0.12); i++) Y.kutu(0.012, h, 0.01, x - w / 2 + (w * i) / Math.round(w / 0.12), taban + 0.025, z + d / 2 + 0.003, 'kutuk', 0x6a4a2c);
  const yr = cati === 'saman' ? [[0xd0aa58, 0xc8a050, 0xb89040], 'saman'] : [S.kiremit, S.catiDoku];
  catiBesik(Y, { x0: x, z0: z, w, d, y: taban + 0.025 + h, H, oh: 0.05, rake: 0.04, kal: 0.025, kivrim: 0, renk: yr[0], doku: yr[1], kabukRenk: S.kiris, th: 0.01, alin: false });
  Y.kutu(0.08, 0.13, 0.02, x, taban + 0.025, z + d / 2 + 0.005, 'tahta', 0x5a3a22);
  // merdiven (eğik) + küçük sahanlık
  Y.kiris([x + 0.12, y, z + d / 2 + 0.16], [x + 0.12, taban + 0.025, z + d / 2 + 0.01], 0.02, 0.014, 'kutuk', S.kiris);
  Y.kiris([x + 0.16, y, z + d / 2 + 0.16], [x + 0.16, taban + 0.025, z + d / 2 + 0.01], 0.02, 0.014, 'kutuk', S.kiris);
}
export function kumes(Y, S, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  A.kutu(0.14, 0.07, 0.1, 0, y + 0.04, 0, 'tahta', 0x9a7a54);
  catiBesik(A, { x0: 0, z0: 0, w: 0.14, d: 0.1, y: y + 0.11, H: 0.05, oh: 0.02, rake: 0.015, kal: 0.014, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false, satirUst: 2, satirAlt: 2, sutun: 3 });
  for (const sx of [-1, 1]) A.kutu(0.01, 0.04, 0.01, sx * 0.06, y, 0.06, 'kutuk', S.kiris);
  A.kutu(0.06, 0.012, 0.05, 0.1, y + 0.02, 0.0, 'tahta', 0x8a6a44, { rz: 0.4 });
}
/** Sadaf (şaduf): dikme + dengeli uzun kol + ağırlık taşı + kova. */
export function sadaf(Y, S, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  for (const s of [-1, 1]) A.kutu(0.02, 0.2, 0.02, 0, y, s * 0.02, 'kutuk', S.kiris);
  A.kiris([-0.14, y + 0.2, 0], [0.2, y + 0.24, 0], 0.016, 0.016, 'kutuk', S.kirisAcik);
  A.kure(0.032, -0.15, y + 0.19, 0, 'moloz', S.tas);
  A.kutu(0.003, 0.14, 0.003, 0.2, y + 0.1, 0, 'duz', 0xb09a70);
  A.silindir(0.022, 0.016, 0.03, 7, 0.2, y + 0.07, 0, 'tahta', 0x8a5a32);
}
/** Ağıl çiti (alçak dairesel/dörtgen) için k.cit sarmalayıcı: noktalar listesi (kapalı döngü) */
export function agilCiti(Y, S, noktalar, y, renk = 0x7a5a3a, h = 0.1, kapali = true) {
  for (let i = 0; i < noktalar.length - (kapali ? 0 : 1); i++) {
    const a = noktalar[i], b = noktalar[(i + 1) % noktalar.length];
    const p = Y.nokta(a[0], 0, a[1]), q = Y.nokta(b[0], 0, b[1]);
    Y.k.cit(p[0], p[2], q[0], q[2], y, renk, h);
  }
}
/** Asma çardağı (üzüm): direkler + kiriş + salkımlar. o: { x,z,y,w,d } */
export function cardak(Y, S, o) {
  const { x, z, y, w, d } = o;
  const R = Y.k.R;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.silindir(0.016, 0.02, 0.2, 6, x + sx * w / 2, y, z + sz * d / 2, 'tasBlok', S.tasAcik);
  for (const sz of [-1, 1]) Y.kutu(w + 0.06, 0.02, 0.025, x, y + 0.2, z + sz * d / 2, 'kutuk', S.kiris);
  for (let i = 0; i <= 4; i++) Y.kutu(0.018, 0.018, d + 0.06, x - w / 2 + (w * i) / 4, y + 0.22, z, 'kutuk', S.kirisAcik);
  for (let i = 0; i < (Y.k.lod ? 4 : 12); i++) Y.kure(0.03 + R() * 0.012, x - w / 2 + R() * w, y + 0.235, z - d / 2 + R() * d, 'duz', 0x5a9a3a);
  if (!Y.k.lod) for (let i = 0; i < 5; i++) Y.kure(0.014, x - w / 2 + R() * w, y + 0.18, z - d / 2 + R() * d, 'duz', i % 2 ? 0x6a3a5a : 0x8aa850);
}
export { PI };

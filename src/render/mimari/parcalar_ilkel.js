// İlkel çağ parçaları (göçebe + taş devri): tipi/konik deri çadır, yurt kubbesi, yuvarlak kulübe, sepet, ot demeti, balta/kütük, totem yüzü,
// kemik/boynuz süsleri, balık ağı, kaya yüzü. Malzeme: deri, kütük, saman, taş, kemik. `Yerel` çerçevesi; y mutlak.
import * as THREE from 'three';
import { kemerProfil } from './geometri.js';
import { atesNokta, dumanNokta } from './parcalar_atolye.js';

const PI = Math.PI;
const DERI = 0xc9a57a, DERI_K = 0x8a6a48, KUTUK = 0x6b4a2c, KUTUK_A = 0x7a5634, SAMAN = 0xc8a85a, KEMIK = 0xe8dcc0;
const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

/** Tipi: konik deri çadır, tepede çıkıntılı direkler, boyalı kuşak, giriş kapağı, kazıklar. o: { x,z,y,r,h,renk,kusak } */
export function tipi(Y, o) {
  const { x, z, y, r = 0.3, h = 0.5, renk = DERI, kusak = 0xa8432f, kapi = true } = o;
  Y.silindir(0.02, r, h, 10, x, y, z, 'deri', renk, { yumusak: false });
  Y.silindir(r * 0.62, r * 0.66, 0.035, 10, x, y + h * 0.3, z, 'kumas', kusak);
  for (let i = 0; i < 4 + (Y.k.lod ? 0 : 2); i++) { const a = (i / 6) * PI * 2 + 0.3; Y.kiris([x + Math.cos(a) * 0.012, y + h - 0.02, z + Math.sin(a) * 0.012], [x + Math.cos(a) * 0.05, y + h + 0.16, z + Math.sin(a) * 0.05], 0.014, 0.014, 'kutuk', KUTUK); }
  if (kapi) { Y.prizma(kemerProfil(r * 0.36, h * 0.42, 4), 0, 0.012, 'z', x, y, z + r * 0.9, 'duz', 0x2a1e14); Y.kutu(r * 0.36, h * 0.36, 0.01, x - r * 0.33, y + 0.02, z + r * 0.86, 'deri', carp(renk, 0.9), { rz: 0.1, ry: 0.5 }); }
  if (!Y.k.lod) for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.5; Y.kutu(0.012, 0.06, 0.012, x + Math.cos(a) * (r + 0.015), y, z + Math.sin(a) * (r + 0.015), 'kutuk', KUTUK, { rz: 0.4 * Math.cos(a), rx: -0.4 * Math.sin(a) }); }
}
/** Yurt/kubbe çadırı: yarım küre deri örtü + kemer direkler + giriş. */
export function yurt(Y, o) {
  const { x, z, y, r = 0.3, renk = DERI } = o;
  Y.silindir(r, r, 0.12, 12, x, y, z, 'deri', carp(renk, 0.95));
  Y.ekle(new THREE.SphereGeometry(r, 12, 6, 0, PI * 2, 0, PI / 2), x, y + 0.12, z, 'deri', renk, { yumusak: true, sy: 0.75 });
  Y.silindir(r * 0.22, r * 0.24, 0.03, 8, x, y + 0.12 + r * 0.72, z, 'kutuk', KUTUK);
  if (!Y.k.lod) for (let i = 0; i < 3; i++) { const a = (i / 3) * PI; Y.kiris([x + Math.cos(a) * r, y + 0.12, z + Math.sin(a) * r], [x - Math.cos(a) * r, y + 0.12, z - Math.sin(a) * r], 0.012, 0.012, 'kutuk', KUTUK_A); }
  Y.prizma(kemerProfil(r * 0.4, 0.2, 4), 0, 0.012, 'z', x, y, z + r * 0.97, 'duz', 0x2a1e14);
  Y.silindir(r * 1.0, r * 1.02, 0.012, 12, x, y + 0.115, z, 'kumas', 0xa8432f);
}
/** Yuvarlak kulübe: hasır/çubuk duvar + saman konik çatı. */
export function yuvarlakKulube(Y, o) {
  const { x, z, y, r = 0.26, h = 0.18, cat = 0.22, saman = SAMAN, duvar = KUTUK_A } = o;
  Y.silindir(r, r * 1.04, h, 10, x, y, z, 'hasir', duvar);
  Y.silindir(0.0, r * 1.28, cat, 10, x, y + h, z, 'saman', saman, { yumusak: false });
  Y.silindir(0.005, 0.005, 0.07, 5, x, y + h + cat - 0.01, z, 'kutuk', KUTUK);
  Y.prizma(kemerProfil(r * 0.4, h * 0.85, 4), 0, 0.012, 'z', x, y, z + r * 0.99, 'duz', 0x1c1410);
}
export function sepet(Y, x, z, y, s = 1, doluluk = true) {
  Y.silindir(0.04 * s, 0.03 * s, 0.05 * s, 8, x, y, z, 'hasir', 0xa8854e);
  if (doluluk && !Y.k.lod) for (let i = 0; i < 3; i++) Y.kure(0.018 * s, x + (i - 1) * 0.02 * s, y + 0.055 * s, z + (i % 2) * 0.01, 'duz', [0xb03a2e, 0x6a3a8a, 0x5a8a3a][i]);
}
export function otDemeti(Y, x, y, z, renk = 0x7a9a4a) {
  Y.kutu(0.018, 0.07, 0.018, x, y, z, 'duz', renk, { rz: 0.15 }); Y.kutu(0.018, 0.07, 0.018, x + 0.012, y, z, 'duz', carp(renk, 1.15), { rz: -0.1 });
  Y.kutu(0.04, 0.008, 0.008, x + 0.006, y + 0.02, z, 'duz', 0xa8432f);
}
export function balta(Y, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  A.kutu(0.012, 0.12, 0.012, 0, y, 0, 'kutuk', KUTUK_A, { rz: 0.15 });
  A.kutu(0.045, 0.04, 0.01, 0.02, y + 0.095, 0, 'duz', 0x6a6a70, { rz: 0.15 });
}
export function kutukTomruk(Y, x, z, y, uzun = 0.3, ry = 0, r = 0.03) {
  const A = Y.alt(x, z, ry);
  A.silindir(r, r, uzun, 7, uzun / 2, y + r - uzun / 2, 0, 'kutuk', KUTUK_A, { rz: PI / 2 });
  A.kure(r * 0.9, uzun, y + r, 0, 'kutuk', 0xc9a66a, { det: 0 });
}
/** Kemik/boynuz çifti (çatı tepesi süsü) */
export function boynuz(Y, x, y, z, s = 1, ry = 0) {
  const A = Y.alt(x, z, ry);
  for (const sx of [-1, 1]) A.kiris([sx * 0.02 * s, y, 0], [sx * 0.07 * s, y + 0.09 * s, 0], 0.012 * s, 0.012 * s, 'kemik', KEMIK);
}
/** Totem yüzü bloğu: yüz (göz, burun, ağız) boyalı. */
export function totemYuzu(Y, x, y, z, w, h, renk, ry = 0) {
  const A = Y.alt(x, z, ry);
  A.kutu(w, h, w, 0, y, 0, 'kutuk', renk);
  const cz = w / 2 + 0.003;
  for (const sx of [-1, 1]) A.kutu(w * 0.2, h * 0.14, 0.008, sx * w * 0.2, y + h * 0.62, cz, 'duz', 0xf0e8d4);
  for (const sx of [-1, 1]) A.kutu(w * 0.08, h * 0.08, 0.01, sx * w * 0.2, y + h * 0.64, cz + 0.002, 'duz', 0x1a1410);
  A.kutu(w * 0.14, h * 0.2, 0.01, 0, y + h * 0.42, cz, 'duz', carp(renk, 0.6));
  A.kutu(w * 0.5, h * 0.1, 0.01, 0, y + h * 0.18, cz, 'duz', 0x1a1410);
  for (let i = 0; i < 4; i++) A.kutu(w * 0.06, h * 0.09, 0.012, -w * 0.18 + i * w * 0.12, y + h * 0.2, cz + 0.002, 'duz', 0xf0e8d4);
}
/** Balık ağı çerçevesi: iki direk + gerili ağ (ince çapraz çizgiler) + yüzdürücüler */
export function agCercevesi(Y, x, z, y, w = 0.3, h = 0.22, ry = 0) {
  const A = Y.alt(x, z, ry);
  for (const s of [-1, 1]) A.kutu(0.02, h + 0.06, 0.02, s * w / 2, y, 0, 'kutuk', KUTUK);
  A.kutu(w + 0.03, 0.014, 0.014, 0, y + h + 0.05, 0, 'kutuk', KUTUK_A);
  const n = Y.k.lod ? 4 : 9;
  for (let i = 0; i < n; i++) A.kutu(0.004, h, 0.004, -w / 2 + 0.01 + (w - 0.02) * i / (n - 1), y + 0.06, 0.004, 'duz', 0xc8b890);
  for (let j = 0; j < (Y.k.lod ? 2 : 5); j++) A.kutu(w - 0.02, 0.004, 0.004, 0, y + 0.07 + j * (h / 5), 0.004, 'duz', 0xc8b890);
  for (let i = 0; i < 4; i++) A.kure(0.012, -w / 2 + 0.03 + i * (w - 0.06) / 3, y + h + 0.0, 0.006, 'kutuk', 0xb89860);
}
/** Kaya yüzü (taş ocağı): basamaklı kaya kütlesi + kesilmiş bloklar */
export function kayaYuzu(Y, S, o) {
  const { x, z, y, w, d, h, adim = 3 } = o;
  for (let i = 0; i < adim; i++) Y.kutu(w - i * w * 0.18, h / adim, d - i * d * 0.2, x, y + (h / adim) * i, z - i * d * 0.06, 'moloz', carp(0x8f8a80, 0.92 + i * 0.07));
}
export { atesNokta, dumanNokta };

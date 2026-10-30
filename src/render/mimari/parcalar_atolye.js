// Atölye parçaları (demirci, eritme fırını, dokuma, darphane, alet yapımcısı): ocak + baca, örs, körük, su kabı, alet rafı, kömür/cüruf, kil fırın,
// gerdirme çerçevesi (boyalı kumaş), boya kazanları, tezgâh (dokuma), dor sütun sırası + alınlık, deri barınak, çakmaktaşı yığını.
// `Yerel` çerçevesi; y mutlak. Ateş/duman noktaları `Y.nokta` ile modele yazılır (`k.ates`, `k.bacaDumani`).
import * as THREE from 'three';
import { kemerProfil } from './geometri.js';

const PI = Math.PI;
const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
const ATES = 0xff9a30, KOR = 0xff5a1a;

/** Ateş ve duman noktası kaydı (model koordinatı). */
export function atesNokta(Y, lx, ly, lz, s = 1) { const p = Y.nokta(lx, ly, lz); Y.k.ates.push([p[0], p[1], p[2], s]); }
export function dumanNokta(Y, lx, ly, lz, s = 1) { const p = Y.nokta(lx, ly, lz); Y.k.bacaDumani(p[0], p[1], p[2], s); }

/**
 * Ocak (örgü ocak + davlumbaz + baca): ön yüzü +z. o: { x, z, y, w, h, bacaH, ry, ates = true }
 * Işıldayan ağız (kor), taş/kerpiç gövde, davlumbaz (kama), ince konik baca, başlık, duman.
 */
export function ocak(Y, S, o) {
  const { x, z, y, w = 0.26, h = 0.2, bacaH = 0.5, ry = 0, ates = true, doku = 'tasBlok', renk = S.tas } = o;
  const O = Y.alt(x, z, ry);
  O.kutu(w, h, w * 0.8, 0, y, 0, doku, renk);
  O.kutu(w + 0.03, 0.025, w * 0.8 + 0.03, 0, y + h, 0, 'tasBlok', S.tasAcik);
  // ağız: koyu oyuk + kor
  O.prizma(kemerProfil(w * 0.5, h * 0.62, 5), 0, 0.02, 'z', 0, y + 0.015, w * 0.4, 'duz', 0x1c1410);
  O.kutu(w * 0.4, 0.045, 0.014, 0, y + 0.025, w * 0.4 + 0.012, 'duz', KOR, { isil: true, arka: true });
  O.kutu(w * 0.3, 0.06, 0.012, 0, y + 0.07, w * 0.4 + 0.016, 'duz', ATES, { isil: true, arka: true });
  // davlumbaz (kama) + baca
  O.prizma([[-w * 0.4, 0], [w * 0.4, 0], [w * 0.14, 0.12], [-w * 0.14, 0.12]], -w * 0.38, w * 0.3, 'z', 0, y + h + 0.025, 0, doku, renk);
  O.prizma([[-w * 0.14, 0], [w * 0.14, 0], [w * 0.1, bacaH], [-w * 0.1, bacaH]], -w * 0.1, w * 0.1, 'z', 0, y + h + 0.145, -w * 0.02, doku, carp(renk, 0.95));
  O.kutu(w * 0.3, 0.02, w * 0.3, 0, y + h + 0.145 + bacaH, -w * 0.02, 'tasBlok', S.tasAcik);
  if (!Y.k.lod) O.kutu(w * 0.14, 0.03, w * 0.14, 0, y + h + 0.145 + bacaH + 0.02, -w * 0.02, 'tasBlok', S.tas);
  if (ates) atesNokta(O, 0, y + 0.08, w * 0.42, 0.9);
  dumanNokta(O, 0, y + h + 0.17 + bacaH, -w * 0.02, 1);
}
/** Örs: kütük kaide + örs gövdesi + boynuz. */
export function ors(Y, S, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  A.silindir(0.04, 0.045, 0.08, 7, 0, y, 0, 'kutuk', 0x6a4a2c);
  A.kutu(0.09, 0.03, 0.045, 0, y + 0.08, 0, 'duz', 0x3a3a40);
  A.kutu(0.05, 0.018, 0.035, 0, y + 0.1, 0, 'duz', 0x4a4a52);
  A.koni(0.016, 0.06, 5, 0.07, y + 0.085, 0, 'duz', 0x3a3a40, { rz: -PI / 2 });
  if (!Y.k.lod) { A.kutu(0.045, 0.008, 0.012, 0.012, y + 0.12, 0.02, 'duz', 0x6a6a74, { rz: 0.1 }); }
}
/** Körük: iki kama + ağızlık borusu. Ocağa (−z) doğru. */
export function koruk(Y, S, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  A.prizma([[0, 0], [0.1, 0.02], [0.1, 0.08], [0, 0.1]], -0.045, 0.045, 'z', 0, y, 0, 'tahta', 0x8a5a32);
  A.prizma([[0, 0.1], [0.1, 0.08], [0.1, 0.12], [0, 0.13]], -0.045, 0.045, 'z', 0, y + 0.0, 0, 'deri', 0x6a4a30);
  A.kiris([0.0, y + 0.1, 0.0], [-0.1, y + 0.08, 0.0], 0.014, 0.014, 'duz', 0x4a4a52);
  A.kutu(0.04, 0.012, 0.012, 0.1, y + 0.13, 0, 'kutuk', S.kiris);
}
/** Su kabı (söndürme): fıçı + su. */
export function suKabi(Y, S, x, z, y) {
  Y.silindir(0.052, 0.046, 0.075, 8, x, y, z, 'tahta', 0x8a5a32);
  Y.silindir(0.044, 0.044, 0.008, 8, x, y + 0.07, z, 'duz', 0x4a98bc);
  Y.silindir(0.054, 0.054, 0.008, 8, x, y + 0.03, z, 'duz', 0x2e2a28);
}
/** Alet rafı: iki dikme + kiriş + asılı çekiç/kerpeten/kılıç silüetleri. */
export function aletRafi(Y, S, x, z, y, ry = 0, w = 0.3) {
  const A = Y.alt(x, z, ry);
  for (const s of [-1, 1]) A.kutu(0.022, 0.2, 0.022, s * w / 2, y, 0, 'kutuk', S.kiris);
  A.kutu(w + 0.03, 0.018, 0.026, 0, y + 0.17, 0, 'kutuk', S.kirisAcik);
  const n = Y.k.lod ? 2 : 5;
  for (let i = 0; i < n; i++) {
    const px = -w / 2 + (w * (i + 0.5)) / n;
    A.kutu(0.008, 0.1 + (i % 2) * 0.03, 0.008, px, y + 0.06 - (i % 2) * 0.02, 0.012, 'duz', 0x4a4a52);
    if (i % 2 === 0) A.kutu(0.032, 0.02, 0.012, px, y + 0.14, 0.012, 'duz', 0x3a3a40);
  }
}
/** Kömür / cüruf yığını */
export function komurYigini(Y, x, z, y, s = 1, renk = 0x2a2624) {
  const R = Y.k.R;
  const n = Y.k.lod ? 3 : 7;
  for (let i = 0; i < n; i++) Y.kure(0.03 * s + R() * 0.012, x + (R() - 0.5) * 0.09 * s, y + 0.02 + R() * 0.03 * s, z + (R() - 0.5) * 0.09 * s, 'moloz', carp(renk, 0.9 + R() * 0.35), { det: 0 });
}
/** Kil eritme fırını: kademeli konik gövde, halka bantlar, tepe ağzı, taban hava deliği (parlak), şarj rampası, cüruf. o: { x,z,y,r,h } */
export function kilFirin(Y, S, o) {
  const { x, z, y, r, h } = o;
  const kil = 0xb87a52;
  Y.silindir(r * 1.2, r * 1.28, 0.05, 10, x, y, z, 'tasBlok', S.tas);
  const tier = [[1.05, 0.92, 0.38], [0.92, 0.7, 0.34], [0.7, 0.48, 0.28]];
  let yy = y + 0.04;
  tier.forEach(([rb, rt, f], i) => { Y.silindir(r * rt, r * rb, h * f, 10, x, yy, z, 'kerpic', carp(kil, 1 - i * 0.05)); yy += h * f; });
  for (const t of [0.3, 0.62]) Y.silindir(r * (1.0 - t * 0.4), r * (1.0 - t * 0.4), 0.014, 10, x, y + 0.04 + h * t, z, 'tasBlok', S.tas);
  Y.silindir(r * 0.55, r * 0.48, 0.03, 10, x, yy - 0.01, z, 'tasBlok', S.tas);
  Y.silindir(r * 0.34, r * 0.34, 0.012, 9, x, yy + 0.02, z, 'duz', ATES, { isil: true });
  // taban deliği (üfleme) parlak
  Y.kutu(0.045, 0.04, 0.03, x, y + 0.07, z + r * 1.05, 'duz', KOR, { isil: true, arka: true });
  Y.prizma(kemerProfil(0.07, 0.07, 4), 0, 0.02, 'z', x, y + 0.045, z + r * 1.0, 'duz', 0x1c1410);
  // şarj rampası (tahta eğik)
  Y.kiris([x - r * 0.7, y + 0.04, z - r * 1.6], [x - r * 0.3, y + h * 0.78, z - r * 0.2], 0.05, 0.016, 'tahta', 0x8a6238);
  atesNokta(Y, x, y + 0.08, z + r * 1.1, 0.8);
  dumanNokta(Y, x, yy + 0.05, z, 1.2);
}
/** Gerdirme çerçevesi: iki direk, üst/alt kiriş, renkli kumaş şeritleri (boyalı kumaş kurutma). o: { x,z,y,w,h,ry } */
export function gerdirme(Y, S, o) {
  const { x, z, y, w = 0.4, h = 0.3, ry = 0 } = o;
  const A = Y.alt(x, z, ry);
  for (const s of [-1, 1]) A.kutu(0.03, h + 0.06, 0.03, s * w / 2, y, 0, 'kutuk', S.kiris);
  A.kutu(w + 0.04, 0.02, 0.025, 0, y + h + 0.04, 0, 'kutuk', S.kirisAcik);
  A.kutu(w + 0.04, 0.016, 0.025, 0, y + 0.07, 0, 'kutuk', S.kirisAcik);
  const renkler = [0xb03a2e, 0x2f5f8a, 0xe0b04a, 0x5a8a4a, 0x8a5a9a, 0xe8dcc0];
  const n = Y.k.lod ? 3 : 5, g = w / n;
  for (let i = 0; i < n; i++) A.kutu(g * 0.86, h - 0.03, 0.01, -w / 2 + g * (i + 0.5), y + 0.085, 0.004, 'kumas', renkler[(i + Math.round(w * 7)) % renkler.length]);
}
/** Boya kazanları: renkli sıvılı fıçılar. */
export function boyaKazani(Y, S, x, z, y, n = 3) {
  const renkler = [0xb03a2e, 0x2f5f8a, 0xe0b04a, 0x5a8a4a];
  for (let i = 0; i < n; i++) {
    Y.silindir(0.048, 0.042, 0.07, 8, x + i * 0.1, y, z, 'tahta', 0x7a5a38);
    Y.silindir(0.04, 0.04, 0.008, 8, x + i * 0.1, y + 0.066, z, 'duz', renkler[i % 4]);
  }
}
/** Dokuma tezgâhı (dikey): iki dikme, üst/alt tomruk, çözgü iplikleri. */
export function tezgah(Y, S, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  for (const s of [-1, 1]) A.kutu(0.02, 0.2, 0.02, s * 0.08, y, 0, 'kutuk', S.kiris);
  A.silindir(0.012, 0.012, 0.18, 6, 0, y + 0.19, 0, 'kutuk', S.kirisAcik, { rz: PI / 2 });
  A.silindir(0.012, 0.012, 0.18, 6, 0, y + 0.03, 0, 'kutuk', S.kirisAcik, { rz: PI / 2 });
  if (!Y.k.lod) for (let i = 0; i < 6; i++) A.kutu(0.003, 0.16, 0.003, -0.07 + i * 0.028, y + 0.03, 0.004, 'duz', 0xe8dcc0);
  A.kutu(0.14, 0.05, 0.012, 0, y + 0.06, 0.006, 'kumas', 0xb03a2e);
}
/** Dor sütun sırası + arşitrav + alınlık (tapınak cepheli). o: { x, z, y, w, h, adet = 4, derin } cephe +z */
export function sutunCephe(Y, S, o) {
  const { x, z, y, w, h, adet = 4, derin = 0.12, alinlik = true } = o;
  const A = Y.alt(x, z, 0);
  A.kutu(w + 0.06, 0.04, derin + 0.08, 0, y, 0, 'mermer', S.tasKrem ?? S.tasAcik);
  const g = w / (adet - 1);
  for (let i = 0; i < adet; i++) {
    const px = -w / 2 + i * g;
    A.silindir(0.026, 0.032, h, 9, px, y + 0.04, derin / 2, 'mermer', S.tasAcik);
    A.kutu(0.07, 0.016, 0.07, px, y + 0.04 + h, derin / 2, 'mermer', S.tasAcik);
    A.kutu(0.06, 0.012, 0.06, px, y + 0.03, derin / 2, 'mermer', S.tasAcik);
  }
  A.kutu(w + 0.1, 0.04, derin + 0.04, 0, y + 0.06 + h, 0.0, 'mermer', S.tasAcik);
  if (alinlik) A.prizma([[-w / 2 - 0.05, 0], [w / 2 + 0.05, 0], [0, 0.1]], -derin / 2 - 0.02, derin / 2 + 0.02, 'z', 0, y + 0.1 + h, 0, 'mermer', S.tasAcik);
  if (alinlik) A.prizma([[-w / 2 - 0.01, 0], [w / 2 + 0.01, 0], [0, 0.08]], derin / 2 + 0.0, derin / 2 + 0.03, 'z', 0, y + 0.105 + h, 0, 'kerpic', S.kiremit[0]);
}
/** Deri barınak: eğik direkler + gerili deri örtü. o: { x, z, y, w, d, h, ry } */
export function deriBarinak(Y, S, o) {
  const { x, z, y, w = 0.5, d = 0.4, h = 0.3, ry = 0 } = o;
  const A = Y.alt(x, z, ry);
  A.prizma([[-d / 2, 0], [d / 2, 0], [d / 2, h * 0.35], [-d / 2 + 0.06, h]], -w / 2, w / 2, 'x', 0, y, 0, 'deri', 0xc9a57a);
  for (const sx of [-1, 1]) {
    A.kiris([sx * w / 2, y, d / 2], [sx * w / 2, y + h * 0.35, d / 2], 0.022, 0.022, 'kutuk', 0x6b4a2c);
    A.kiris([sx * w / 2, y + h, -d / 2 + 0.06], [sx * w / 2 + sx * 0.02, y, -d / 2 - 0.02], 0.02, 0.02, 'kutuk', 0x6b4a2c);
  }
  A.kutu(w + 0.02, 0.016, 0.02, 0, y + h * 0.36, d / 2 + 0.005, 'kutuk', 0x6b4a2c);
  if (!Y.k.lod) for (let i = 0; i < 5; i++) A.kutu(0.01, 0.1, 0.01, -w / 2 + (w * (i + 0.5)) / 5, y + h * 0.4, d / 2 + 0.012, 'duz', 0x8a6a48);
}
/** Çakmaktaşı yığını + yontulmuş parçalar */
export function cakmakTasi(Y, x, z, y, n = 6, s = 1) {
  const R = Y.k.R;
  for (let i = 0; i < (Y.k.lod ? 3 : n); i++) Y.ekle(new THREE.DodecahedronGeometry(0.028 * s * (0.7 + R() * 0.6)), x + (R() - 0.5) * 0.12 * s, y + 0.02, z + (R() - 0.5) * 0.12 * s, 'moloz', [0x6a6a70, 0x8a8a90, 0x55555c][i % 3], { sy: 0.7, ry: R() * 6 });
}
/** Öğütme taşı (el değirmeni) */
export function ogutmeTasi(Y, S, x, z, y) {
  Y.silindir(0.06, 0.065, 0.025, 9, x, y, z, 'tasBlok', S.tas);
  Y.silindir(0.052, 0.052, 0.022, 9, x, y + 0.025, z, 'tasBlok', S.tasAcik);
  Y.kutu(0.012, 0.05, 0.012, x + 0.03, y + 0.045, z, 'kutuk', 0x6b4a2c);
}

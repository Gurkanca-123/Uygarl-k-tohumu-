// Avlu/çevre parçaları: kuyu, çeşme, fıçı, saman, talim hedefi, bostan yatakları, ağaç/selvi, kovan, revak (kemerli yürüme koridoru).
// Kale, manastır, han, atölyeler ortak kullanır. `Yerel` çerçevesi, y mutlak (çerçeve y'sine göre).
import * as THREE from 'three';
import { catiTek } from './cati.js';

const PI = Math.PI;
const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

export function kuyu(Y, S, x, z, y) {
  Y.silindir(0.075, 0.085, 0.07, 9, x, y, z, 'tasBlok', S.tasAcik);
  Y.silindir(0.055, 0.055, 0.012, 9, x, y + 0.05, z, 'duz', 0x2a6a8a);
  for (const s of [-1, 1]) Y.kutu(0.014, 0.17, 0.014, x + s * 0.075, y + 0.04, z, 'kutuk', S.kiris);
  Y.kutu(0.2, 0.012, 0.014, x, y + 0.2, z, 'kutuk', S.kiris);
  Y.silindir(0.012, 0.012, 0.1, 6, x, y + 0.185, z, 'kutuk', S.kirisAcik, { rz: PI / 2 });
}
export function cesme(Y, S, x, z, y, r = 0.12) {
  Y.silindir(r * 1.12, r * 1.18, 0.06, 10, x, y, z, 'tasBlok', S.tasAcik);
  Y.silindir(r * 0.95, r * 0.95, 0.012, 10, x, y + 0.045, z, 'duz', 0x4a98bc);
  Y.silindir(0.02, 0.03, 0.12, 6, x, y + 0.05, z, 'tasBlok', S.tasAcik);
  Y.silindir(0.05, 0.03, 0.025, 8, x, y + 0.16, z, 'tasBlok', S.tasAcik);
  if (!Y.k.lod) Y.kure(0.02, x, y + 0.2, z, 'duz', 0x9ad0e4);
}
export function fici(Y, x, z, y, s = 1) {
  Y.silindir(0.048 * s, 0.044 * s, 0.11 * s, 8, x, y, z, 'tahta', 0x8a5a32);
  for (const t of [0.2, 0.78]) Y.silindir(0.052 * s, 0.052 * s, 0.01 * s, 8, x, y + 0.11 * s * t, z, 'duz', 0x2e2a28);
}
export function saman(Y, x, z, y, ry = 0) {
  Y.kutu(0.16, 0.09, 0.1, x, y, z, 'saman', 0xd0aa58, { ry });
  Y.kutu(0.17, 0.012, 0.11, x, y + 0.06, z, 'saman', 0xb89040, { ry });
}
export function hedef(Y, S, x, z, y) {
  Y.silindir(0.01, 0.012, 0.17, 5, x, y, z, 'kutuk', S.kiris);
  Y.kutu(0.1, 0.012, 0.012, x, y + 0.11, z, 'kutuk', S.kiris);
  Y.silindir(0.04, 0.04, 0.012, 9, x, y + 0.1, z + 0.012, 'kumas', 0xb03a2e, { rx: PI / 2 });
}
/** Bostan: n sıra yükseltilmiş yatak, üzerinde sebze/bitki kümeleri. Çerçeve x boyunca sıralar. */
export function bostan(Y, S, x, z, y, w, d, sira = 3) {
  const R = Y.k.R;
  const bd = d / sira;
  for (let i = 0; i < sira; i++) {
    const zz = z - d / 2 + bd * (i + 0.5);
    Y.kutu(w, 0.03, bd * 0.7, x, y, zz, 'toprak', 0x5a4028);
    if (Y.k.lod) { Y.kutu(w * 0.92, 0.03, bd * 0.5, x, y + 0.03, zz, 'ekin', i % 2 ? 0x6aa040 : 0x8fb23a); continue; }
    const n = Math.round(w / 0.05);
    for (let j = 0; j < n; j++) Y.kure(0.02 + R() * 0.01, x - w / 2 + (w * (j + 0.5)) / n, y + 0.045 + R() * 0.01, zz, 'duz', [0x5a9a3a, 0x6aaa44, 0x8fb23a, 0xb0903a][(i + j) % 4]);
  }
}
/** Ağaç: 'selvi' (uzun koni), 'meşe' (iki kümeli), 'zeytin' (alçak, gümüşi) */
export function agac(Y, x, z, y, tur = 'mese', s = 1) {
  const R = Y.k.R;
  if (tur === 'selvi') {
    Y.silindir(0.01 * s, 0.014 * s, 0.05 * s, 5, x, y, z, 'kutuk', 0x5a4030);
    Y.koni(0.05 * s, 0.34 * s, 7, x, y + 0.04 * s, z, 'duz', 0x2f5a34, { yumusak: false });
    return;
  }
  const yaprak = tur === 'zeytin' ? [0x7a9a6a, 0x8aaa7a] : [0x4f8a3a, 0x5a9a42, 0x6aa84a];
  Y.silindir(0.012 * s, 0.02 * s, 0.1 * s, 5, x, y, z, 'kutuk', 0x6a4a30);
  const n = Y.k.lod ? 1 : 3;
  for (let i = 0; i < n; i++) Y.kure(0.07 * s * (1 - i * 0.12), x + (R() - 0.5) * 0.05 * s, y + (0.13 + i * 0.05) * s, z + (R() - 0.5) * 0.05 * s, 'duz', yaprak[i % yaprak.length], { det: 1 });
}
/** Hasır kovan (bal peteği) sırası */
export function kovan(Y, x, z, y) {
  for (let i = 0; i < 3; i++) {
    Y.silindir(0.035, 0.045, 0.05, 7, x + i * 0.07, y, z, 'saman', 0xd0aa58);
    Y.koni(0.04, 0.035, 7, x + i * 0.07, y + 0.05, z, 'saman', 0xb89040);
  }
  Y.kutu(0.24, 0.015, 0.07, x + 0.07, y - 0.012, z, 'tahta', 0x7a5634);
}
/**
 * Revak (kemerli yürüme koridoru): bir doğru boyunca yarım daire kemerler + sütunlar + alçak korkuluk + tek eğimli çatı.
 * Dışa bakan taraf yönün sağı (sur yönüyle aynı). o: { x0,z0,x1,z1,y,h,adet }
 */
export function revak(Y, S, o) {
  const { x0, z0, x1, z1, y, h = 0.2, adet = 5 } = o;
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
  const W = Y.alt((x0 + x1) / 2, (z0 + z1) / 2, Math.atan2(-dz, dx));
  const g = L / adet;
  const R = h * 0.0 + g * 0.36;
  for (let i = 0; i <= adet; i++) {
    const px = -L / 2 + i * g;
    W.silindir(0.016, 0.019, h, 7, px, y, 0, 'tasBlok', S.tasKrem);
    W.kutu(0.045, 0.02, 0.045, px, y + h, 0, 'tasBlok', S.tasAcik);
    W.kutu(0.04, 0.02, 0.04, px, y, 0, 'tasBlok', S.tas);
  }
  const seg = Y.k.lod ? 3 : 5;
  for (let i = 0; i < adet; i++) {
    const cx = -L / 2 + (i + 0.5) * g;
    // yarım daire kemer: iç yarıçap R, kalınlık 0.016; yay merkezi sütun başlığı üstünde
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * PI, a1 = ((k + 1) / seg) * PI, ri = R * 0.86, ro = R;
      const q = [[cx + Math.cos(a0) * ro, y + h + 0.02 + Math.sin(a0) * ro], [cx + Math.cos(a1) * ro, y + h + 0.02 + Math.sin(a1) * ro], [cx + Math.cos(a1) * ri, y + h + 0.02 + Math.sin(a1) * ri], [cx + Math.cos(a0) * ri, y + h + 0.02 + Math.sin(a0) * ri]];
      W.prizma(q, -0.028, 0.028, 'z', 0, 0, 0, 'tasBlok', S.tasKrem);
    }
    W.kutu(g - 0.04, 0.05, 0.04, cx, y, 0, 'tasBlok', S.tas); // alçak korkuluk
  }
  // üst: duvar bandı + tek eğimli çatı (iç tarafa yüksek)
  W.kutu(L + 0.05, 0.04, 0.09, 0, y + h + 0.02 + R + 0.0, -0.01, 'tasBlok', S.tasKrem);
  catiTek(W, { x0: 0, z0: -0.05, w: L, d: 0.2, y: y + h + R + 0.07, yuk: 0.07, oh: 0.06, rake: 0.03, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris });
}

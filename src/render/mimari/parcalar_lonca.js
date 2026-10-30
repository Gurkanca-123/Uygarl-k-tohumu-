// Lonca/kamu yapıları parçaları: kademeli (basamaklı) alınlık, taş kemer sırası (çarşı katı), saat/çan kulesi, asılı flama, şifa haçı.
// `Yerel` çerçevesi cephe düzleminde (+z dışarı), y çerçeveye göre.
import * as THREE from 'three';
import { kemerProfil } from './geometri.js';
import { catiBesik } from './cati.js';

const PI = Math.PI;
const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

/**
 * Kademeli alınlık (Flaman tipi): taş basamaklar, her basamak ucunda küçük sivri uç, tepede altın arma. Cephe düzleminde.
 * o: { x, y (taban), w, adim = 4, hs = 0.075, kal = 0.05, pencere: true }
 */
export function kademeliAlin(Y, S, o) {
  const { x, y, w, adim = 4, hs = 0.075, kal = 0.05 } = o;
  const kalan = Math.max(0.16, w * 0.22);
  for (let i = 0; i < adim; i++) {
    const wi = Math.max(0.12, w - i * (w - 0.16) / adim * 1.0);
    Y.kutu(wi, hs, kal, x, y + i * hs, 0, 'tasBlok', i % 2 ? S.tasKrem : carp(S.tasKrem, 0.94));
    Y.kutu(wi + 0.014, 0.014, kal + 0.012, x, y + (i + 1) * hs - 0.007, 0, 'tasBlok', S.tasAcik); // silme
    for (const s of [-1, 1]) if (!Y.k.lod || i === adim - 1) Y.koni(0.014, 0.038, 4, x + s * (wi / 2 - 0.006), y + (i + 1) * hs, 0, 'tasBlok', S.tasKrem, { ry: PI / 4 });
  }
  const top = y + adim * hs;
  Y.silindir(0.03, 0.03, 0.014, 9, x, top + 0.016, 0.0, 'duz', S.altin, { rx: PI / 2 });
  Y.koni(0.01, 0.06, 4, x, top + 0.03, 0, 'duz', S.altin, { ry: PI / 4 });
  void kalan;
}

/** Taş kemer sırası (açık çarşı katı): sütunlar + yuvarlak kemerler + koyu iç duvar. Cephe düzleminde, +z'ye bakar. o: { x0, x1, y, h, adet } */
export function kemerSirasi(Y, S, o) {
  const { x0, x1, y, h, adet = 5, derin = 0.1 } = o;
  const L = x1 - x0, g = L / adet, xm = (x0 + x1) / 2;
  Y.kutu(L, h, 0.04, xm, y, -derin, 'duz', 0x2a2018);                       // karanlık iç
  const R = Math.min(g * 0.4, h * 0.45);
  for (let i = 0; i <= adet; i++) {
    const px = x0 + i * g;
    Y.kutu(0.07, h - R - 0.02, 0.09, px, y, 0.0, 'tasBlok', S.tasKrem);
    Y.kutu(0.09, 0.025, 0.1, px, y + h - R - 0.04, 0.0, 'tasBlok', S.tasAcik);
  }
  const seg = Y.k.lod ? 3 : 5;
  for (let i = 0; i < adet; i++) {
    const cx = x0 + (i + 0.5) * g, base = y + h - R - 0.015;
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * PI, a1 = ((k + 1) / seg) * PI, ri = R * 0.8, ro = R * 1.04;
      const q = [[cx + Math.cos(a0) * ro, base + Math.sin(a0) * ro], [cx + Math.cos(a1) * ro, base + Math.sin(a1) * ro], [cx + Math.cos(a1) * ri, base + Math.sin(a1) * ri], [cx + Math.cos(a0) * ri, base + Math.sin(a0) * ri]];
      Y.prizma(q, -0.045, 0.045, 'z', 0, 0, 0, 'tasBlok', S.tasKrem);
    }
  }
  Y.kutu(L + 0.08, 0.03, 0.1, xm, y + h, 0, 'tasBlok', S.tasAcik);          // üst silme
}

/** Saat/çan kulesi (mahya üstünde): kare gövde + saat kadranı (+z/+x) + sivri külah + ışıklı çan açıklığı. o: { x,z,y,w,h } */
export function saatKulesi(Y, S, o) {
  const { x, z, y, w = 0.2, h = 0.26 } = o;
  Y.kutu(w, h, w, x, y, z, 'tasBlok', S.tasKrem);
  Y.kutu(w + 0.03, 0.025, w + 0.03, x, y + h, z, 'tasBlok', S.tasAcik);
  for (const [dx, dz, ry] of [[0, w / 2 + 0.004, 0], [w / 2 + 0.004, 0, PI / 2]]) {
    Y.silindir(0.055, 0.055, 0.012, 12, x + dx, y + h * 0.58, z + dz, 'duz', 0xefe6c8, { rx: PI / 2, ry });
    Y.kutu(0.006, 0.045, 0.006, x + dx + (ry ? 0.008 : 0), y + h * 0.58, z + dz + (ry ? 0 : 0.008), 'duz', 0x2a2018, { ry });
    if (!Y.k.lod) Y.kutu(0.035, 0.006, 0.006, x + dx + (ry ? 0.008 : 0.0), y + h * 0.58, z + dz + (ry ? 0.0 : 0.008), 'duz', 0x2a2018, { ry });
  }
  Y.prizma(kemerProfil(0.07, 0.1, 4), 0, 0.02, 'z', x, y + h * 0.15, z + w / 2, 'duz', 0x2a2018);
  Y.koni(w * 0.78, 0.22, 4, x, y + h + 0.025, z, 'arduvaz', S.arduvazUst, { ry: PI / 4 });
  Y.silindir(0.005, 0.005, 0.07, 5, x, y + h + 0.22, z, 'duz', S.altin); Y.kure(0.012, x, y + h + 0.29, z, 'duz', S.altin);
}

/** Asılı flama (dikey bayrak): konsol + iki sarkık kumaş + arma. Cephe düzleminde. */
export function flama(Y, S, x, y, renk = 0xb03a2e, h = 0.2) {
  Y.kiris([x, y + h + 0.02, 0], [x, y + h + 0.02, 0.07], 0.008, 0.008, 'duz', S.demir);
  Y.kutu(0.07, h, 0.008, x, y, 0.07, 'kumas', renk);
  Y.prizma([[-0.035, 0], [0.035, 0], [0, -0.03]], 0.066, 0.074, 'z', x, y, 0, 'kumas', renk);
  Y.silindir(0.016, 0.016, 0.006, 8, x, y + h * 0.55, 0.077, 'duz', S.altin, { rx: PI / 2 });
}

/** Şifa haçı / madalyon (alınlık süsü) */
export function sifaHaci(Y, S, x, y, z = 0.0, renk = 0xb03a2e) {
  Y.kutu(0.028, 0.09, 0.012, x, y, z, 'duz', renk); Y.kutu(0.09, 0.028, 0.012, x, y + 0.031, z, 'duz', renk);
}
export { catiBesik };

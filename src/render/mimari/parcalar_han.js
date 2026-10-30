// Han/ticaret yapıları parçaları: ahşap galeri (balkon), asılı tabela direği, arabalık geçidi (kemerli), su yalağı, bağlama kirişi, küçük kubbe.
// `Yerel` çerçevesi: cephe düzleminde başlar, +z dışarı; y çerçeveye göre.
import * as THREE from 'three';
import { kemerProfil } from './geometri.js';

const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

/**
 * Ahşap galeri: cephe önünde döşeme + direkler (zemine iner) + korkuluk (tırabzan + baluster) + payandalar.
 * o: { x0, x1, y (döşeme üstü), y0 (zemin), derin = 0.14, direk = 3 }
 */
export function galeri(Y, S, o) {
  const { x0, x1, y, y0, derin = 0.14, direk = 4 } = o;
  const L = x1 - x0, xm = (x0 + x1) / 2;
  Y.kutu(L, 0.03, derin, xm, y - 0.03, derin / 2, 'tahta', S.kirisAcik, { arka: true });                        // döşeme
  Y.kutu(L + 0.02, 0.03, 0.03, xm, y - 0.06, derin - 0.01, 'kutuk', S.kiris, { arka: true });                    // ön kiriş
  for (let i = 0; i < direk; i++) {
    const px = x0 + (L * i) / (direk - 1);
    Y.kutu(0.04, y - y0 - 0.06, 0.04, px, y0, derin - 0.02, 'kutuk', S.kiris, { arka: true });
    if (!Y.k.lod) Y.kiris([px, y - 0.1, derin - 0.02], [px + (i < direk / 2 ? 0.07 : -0.07), y - 0.06, 0.02], 0.016, 0.016, 'kutuk', S.kiris); // payanda
  }
  // korkuluk
  Y.kutu(L + 0.03, 0.022, 0.03, xm, y + 0.12, derin - 0.02, 'kutuk', S.kiris, { arka: true });
  const n = Y.k.lod ? 0 : Math.round(L / 0.055);
  for (let i = 0; i <= n; i++) Y.kutu(0.014, 0.1, 0.014, x0 + (L * i) / Math.max(1, n), y, derin - 0.02, 'kutuk', S.kirisAcik, { arka: true });
  if (Y.k.lod) Y.kutu(L, 0.08, 0.012, xm, y + 0.02, derin - 0.02, 'kutuk', S.kirisAcik, { arka: true });
  for (const x of [x0, x1]) Y.kutu(0.04, 0.14, 0.04, x, y, derin - 0.02, 'kutuk', S.kiris, { arka: true });
}

/** Asılı tabela direği: dikme + konsol + zincirle sarkan levha (altın madalyon/kadeh). Dünya yönü ry. */
export function tabelaDirek(Y, S, x, z, y, h = 0.5, ry = 0) {
  const T = Y.alt(x, z, ry);
  T.silindir(0.012, 0.016, h, 6, 0, y, 0, 'kutuk', S.kiris);
  T.kiris([0, y + h - 0.02, 0], [0.16, y + h - 0.02, 0], 0.012, 0.012, 'kutuk', S.kiris);
  T.kiris([0.02, y + h - 0.12, 0], [0.12, y + h - 0.025, 0], 0.01, 0.01, 'kutuk', S.kiris);
  for (const px of [0.05, 0.145]) T.kutu(0.004, 0.05, 0.004, px, y + h - 0.075, 0, 'duz', S.demir);
  T.kutu(0.14, 0.09, 0.012, 0.1, y + h - 0.165, 0, 'tahta', S.kirisAcik);
  T.silindir(0.026, 0.026, 0.008, 8, 0.1, y + h - 0.14, 0.008, 'duz', S.altin, { rx: Math.PI / 2 });
  T.kure(0.01, 0, y + h + 0.01, 0, 'duz', S.altin);
}

/** Arabalık geçidi (kemerli açık geçit): taş yay halkası + arka duvarda sıcak ışık. o: { x, w, h } */
export function gecit(Y, S, o) {
  const { x, w, h } = o;
  const ri = w / 2, d = h - ri, ro = ri + 0.04, n = 7;
  Y.prizma(kemerProfil(w, h, 6), 0.0, 0.03, 'z', x, 0, 0, 'duz', 0x2a2018);
  Y.prizma(kemerProfil(w * 0.8, h * 0.9, 5), -0.01, 0.008, 'z', x, 0.0, 0.32, 'duz', 0xffc070, { isil: true });
  for (const s of [-1, 1]) Y.kutu(ro - ri, d, 0.05, x + s * (ri + (ro - ri) / 2), 0, 0.02, 'tasBlok', S.tasAcik);
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    const q = [[ri * Math.cos(a0), d + ri * Math.sin(a0)], [ro * Math.cos(a0), d + ro * Math.sin(a0)], [ro * Math.cos(a1), d + ro * Math.sin(a1)], [ri * Math.cos(a1), d + ri * Math.sin(a1)]];
    Y.prizma(q, -0.004, 0.05, 'z', x, 0, 0, 'tasBlok', i % 2 ? S.tasAcik : carp(S.tasAcik, 0.9));
  }
  Y.kutu(w + 0.14, 0.02, 0.1, x, -0.01, 0.06, 'tasBlok', S.tas);
}

/** Su yalağı: oyuk tahta/taş kasa + su. */
export function yalak(Y, S, x, z, y, ry = 0, uzun = 0.24) {
  const A = Y.alt(x, z, ry);
  A.kutu(uzun, 0.06, 0.07, 0, y, 0, 'tasBlok', S.tas);
  A.kutu(uzun - 0.03, 0.01, 0.045, 0, y + 0.055, 0, 'duz', 0x4a98bc);
}
/** Bağlama kirişi (at bağlama): iki dikme + üst kiriş. */
export function baglamaKirisi(Y, S, x, z, y, ry = 0, uzun = 0.3) {
  const A = Y.alt(x, z, ry);
  for (const s of [-1, 1]) A.silindir(0.01, 0.012, 0.11, 5, s * uzun / 2, y, 0, 'kutuk', S.kiris);
  A.kutu(uzun + 0.03, 0.016, 0.016, 0, y + 0.1, 0, 'kutuk', S.kirisAcik);
}
/** Küçük kubbe (düz damlı odalar üzerinde): yarım küre + altın alem. */
export function kucukKubbe(Y, S, x, z, y, r, renk = 0x8a9aa8) {
  Y.ekle(new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), x, y, z, 'arduvaz', renk, { yumusak: true });
  Y.silindir(r * 1.06, r * 1.06, 0.02, 10, x, y - 0.015, z, 'tasBlok', S.tasAcik);
  if (!Y.k.lod) { Y.silindir(0.005, 0.005, 0.06, 5, x, y + r - 0.01, z, 'duz', S.altin); Y.kure(0.011, x, y + r + 0.06, z, 'duz', S.altin); }
}

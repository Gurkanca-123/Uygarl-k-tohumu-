// Su yapıları: su çarkı (dönen ayrı ağ), su kanalı + taş kenarlar, oluk (flume), savak kapağı, yaya köprüsü, çuval yığını, kağnı, çuval vinci.
// Çark, binanın geri kalanından ayrı bir geometridir (oyun onu ekseni etrafında döndürür): `suCarkiGeo` birim yarıçaplı geometri verir.
import * as THREE from 'three';
import { Yerel, kutuGeo } from './geometri.js';

const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
const SU = 0x4a98bc, SU_ACIK = 0x9ad0e4, KOYU_AHSAP = 0x6a4a30;

/**
 * Su çarkı geometrisi (birim yarıçap, eksen +z, merkez orijin). Binanın `Kurucu`'sunun ikinci bir örneği ile kurulur;
 * dönen ağ olarak `k.pervane.geo`'ya konur (mesh ölçeği = gerçek yarıçap).
 * o: { kova = 12, kalinlik (z genişliği, birim yarıçap cinsinden), doku olcek }
 */
export function suCarkiGeo(k, o = {}) {
  const k2 = new k.constructor(97);
  k2.lod = k.lod;
  const Y = new Yerel(k2);
  const n = o.kova ?? (k.lod ? 8 : 12), W = o.kalinlik ?? 0.55, ol = 0.5;
  const ring = (z0, z1) => {
    const seg = k.lod ? 12 : 20;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const q = [[Math.cos(a0) * 1.0, Math.sin(a0) * 1.0], [Math.cos(a1) * 1.0, Math.sin(a1) * 1.0], [Math.cos(a1) * 0.84, Math.sin(a1) * 0.84], [Math.cos(a0) * 0.84, Math.sin(a0) * 0.84]];
      Y.prizma(q, z0, z1, 'z', 0, 0, 0, 'tahta', i % 2 ? KOYU_AHSAP : carp(KOYU_AHSAP, 1.15), { olcek: ol * 0.25 });
    }
  };
  ring(W / 2 - 0.07, W / 2);
  ring(-W / 2, -W / 2 + 0.07);
  // kovalar: halka içinde eğik tahta
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    Y.kutu(0.26, 0.05, W, Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9 - 0, 'tahta', i % 2 ? 0x7a5634 : 0x8a6238, { rz: a + 0.55, olcek: ol * 0.25 });
    void 0;
  }
  // dikmeler: kollar (her iki yüzde)
  if (!k.lod) for (const z of [W / 2 - 0.1, -W / 2 + 0.1]) for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    Y.kiris([Math.cos(a) * 0.1, Math.sin(a) * 0.1, z], [Math.cos(a) * 0.88, Math.sin(a) * 0.88, z], 0.07, 0.05, 'kutuk', carp(KOYU_AHSAP, 1.3), { olcek: ol * 0.25 });
  }
  // göbek + mil
  Y.silindir(0.14, 0.14, W + 0.08, 10, 0, -(W + 0.08) / 2, 0, 'kutuk', carp(KOYU_AHSAP, 1.2), { rx: Math.PI / 2, olcek: ol * 0.25 });
  Y.silindir(0.06, 0.06, W + 0.4, 6, 0, -(W + 0.4) / 2, 0, 'duz', 0x2e2a28, { rx: Math.PI / 2 });
  return k2.birlestir().ana;
}

/** Düz su kanalı: iki taş kenar + su yüzeyi + ince açık dalga çizgileri. Çerçeve kanal ekseni boyunca yerel z. o: { x, z, y, w, uzun, ry } */
export function suKanali(Y, S, o) {
  const { x, z, y, w, uzun, ry = 0, kenarH = 0.07 } = o;
  const C = Y.alt(x, z, ry);
  C.cephe = false;
  C.kutu(w, 0.02, uzun, 0, y, 0, 'toprak', 0x6a5a40);
  C.kutu(w - 0.02, 0.034, uzun - 0.004, 0, y + 0.012, 0, 'duz', SU);
  for (const sx of [-1, 1]) {
    C.kutu(0.07, kenarH, uzun + 0.02, sx * (w / 2 + 0.03), y, 0, 'tasBlok', sx > 0 ? S.tas : S.tasAcik);
    C.kutu(0.085, 0.02, uzun + 0.03, sx * (w / 2 + 0.03), y + kenarH, 0, 'tasBlok', S.tasAcik); // başlık taşı
  }
  if (!Y.k.lod) for (let i = 0; i < Math.floor(uzun / 0.2); i++) {
    const zz = -uzun / 2 + 0.1 + i * 0.2;
    C.kutu(w * 0.45, 0.004, 0.035, (i % 2 ? 1 : -1) * w * 0.12, y + 0.046, zz, 'duz', SU_ACIK);
  }
}

/** Göl/havuz (su birikintisi): düz su + taş halkası. o: { x, z, y, w, d } */
export function havuz(Y, S, o) {
  const { x, z, y, w, d } = o;
  Y.kutu(w + 0.1, 0.03, d + 0.1, x, y, z, 'tasBlok', S.tas);
  Y.kutu(w, 0.04, d, x, y + 0.01, z, 'duz', SU);
  if (!Y.k.lod) for (let i = 0; i < 4; i++) Y.kutu(w * 0.3, 0.004, 0.03, x + (i % 2 ? 0.1 : -0.12), y + 0.05, z - d / 2 + 0.06 + i * (d / 4.5), 'duz', SU_ACIK);
}

/** Savak kapağı: kanal üstünde iki direk, üst kiriş ve yukarı çekilmiş kapak, çevirme volanı. Çerçeve kanal eksenine dik (x genişlik). */
export function savak(Y, S, o) {
  const { x, z, y, w, ry = 0 } = o;
  const C = Y.alt(x, z, ry);
  for (const sx of [-1, 1]) C.kutu(0.045, 0.24, 0.045, sx * (w / 2 + 0.04), y, 0, 'kutuk', S.kiris);
  C.kutu(w + 0.14, 0.04, 0.05, 0, y + 0.22, 0, 'kutuk', S.kirisAcik);
  C.kutu(w * 0.9, 0.1, 0.022, 0, y + 0.1, 0, 'tahta', 0x8a6a44);
  C.silindir(0.035, 0.035, 0.012, 8, 0, y + 0.26, 0.0, 'duz', S.demir, { rz: Math.PI / 2 });
  C.kutu(0.01, 0.07, 0.01, 0, y + 0.19, 0, 'duz', S.demir);
}

/** Yaya köprüsü: tahta tabliye, iki korkuluk. Çerçeve köprü ekseni boyunca yerel x. o: { x, z, y, uzun, genis, ry } */
export function kopru(Y, S, o) {
  const { x, z, y, uzun, genis = 0.14, ry = 0 } = o;
  const B = Y.alt(x, z, ry);
  for (let i = 0; i < Math.round(uzun / 0.045); i++) B.kutu(0.04, 0.016, genis, -uzun / 2 + 0.025 + i * 0.045, y, 0, 'tahta', i % 2 ? 0x8a6238 : 0x7a5634);
  for (const sz of [-1, 1]) {
    B.kutu(uzun, 0.014, 0.014, 0, y + 0.07, sz * (genis / 2 - 0.006), 'kutuk', S.kiris);
    if (!Y.k.lod) for (const px of [-0.5, 0, 0.5]) B.kutu(0.014, 0.07, 0.014, px * uzun * 0.9, y + 0.01, sz * (genis / 2 - 0.006), 'kutuk', S.kiris);
  }
}

/** Un çuvalı yığını (3-2-1 piramit). */
export function cuvalYigini(Y, S, x, z, y, ry = 0, s = 1) {
  const R = Y.k.R;
  const dz = [[0, 0], [0.07, 0], [-0.07, 0], [0.035, 0.06], [-0.035, 0.06], [0, 0.12]];
  const A = Y.alt(x, z, ry);
  const adet = Y.k.lod ? 3 : 6;
  for (let i = 0; i < adet; i++) {
    const [px, py] = dz[i];
    A.ekle(new THREE.IcosahedronGeometry(0.045 * s, 1), px * s, y + 0.03 * s + py * s, (R() - 0.5) * 0.01, 'kumas', i % 2 ? 0xd2bd8e : 0xc4ae7e, { sy: 0.6, sz: 0.8 });
  }
}

/** Kağnı/el arabası: kasa + iki tekerlek + tutamak. */
export function arabaKasa(Y, S, x, z, y, ry = 0) {
  const A = Y.alt(x, z, ry);
  A.kutu(0.16, 0.05, 0.1, 0, y + 0.05, 0, 'tahta', 0x8a6238);
  A.kutu(0.16, 0.035, 0.012, 0, y + 0.095, 0.05, 'tahta', 0x7a5634); A.kutu(0.16, 0.035, 0.012, 0, y + 0.095, -0.05, 'tahta', 0x7a5634);
  for (const sz of [-1, 1]) A.silindir(0.045, 0.045, 0.014, 10, 0, y + 0.0, sz * 0.065, 'tahta', 0x6a4a2a, { rx: Math.PI / 2 });
  A.kiris([-0.08, y + 0.06, 0], [-0.2, y + 0.08, 0], 0.012, 0.012, 'kutuk', S.kiris);
  if (!Y.k.lod) for (let i = 0; i < 3; i++) A.ekle(new THREE.IcosahedronGeometry(0.034, 1), -0.04 + i * 0.04, y + 0.1, (i - 1) * 0.015, 'kumas', 0xd2bd8e, { sy: 0.6 });
}

/** Çuval vinci: çatı penceresinden öne uzanan kiriş + makara + ip + sarkan çuval. Çerçeve çatı penceresi önünde (+z dışarı). */
export function vinc(Y, S, o) {
  const { x, y, uzun = 0.17 } = o;
  const V = Y.alt(x, 0, 0);
  V.kiris([0, y, -0.02], [0, y + 0.01, uzun], 0.022, 0.024, 'kutuk', S.kirisAcik);
  V.kiris([0, y - 0.07, 0.0], [0, y, uzun * 0.62], 0.014, 0.014, 'kutuk', S.kiris);
  V.silindir(0.022, 0.022, 0.014, 8, 0, y - 0.016, uzun + 0.002, 'duz', S.demir, { rz: Math.PI / 2 });
  V.kutu(0.004, 0.2, 0.004, 0, y - 0.2, uzun, 'duz', 0xb09a70);
  V.ekle(new THREE.IcosahedronGeometry(0.04, 1), 0, y - 0.24, uzun, 'kumas', 0xe8dcc0, { sy: 0.85, sz: 0.9 });
}

export { kutuGeo };

// Orta Çağ yarı ahşap konut: 4 kontrollü varyant (klasik, L planlı, kuleli, atölyeli). Tek kanat üreticisi + varyant tabloları.
// Koordinatlar: karo birimi (kaide üstü Z'den yukarı). Kapı/ön cephe +z, ikinci görünür cephe +x (kamera +x,+z yönünden bakar).
import { Yerel } from '../geometri.js';
import { catiBesik, catiTek, kuleKulah } from '../cati.js';
import { pencere, kapi, tente, kirisKafes, cikmaAlti, baca, dormer } from '../parcalar.js';

export const VARYANT_ADET = 4;

const PI = Math.PI;
// Yüz çerçeveleri: yerel (w×d) dikdörtgenin her yüzü için başlangıç, dönüş ve genişlik. Yerel x yüz boyunca soldan sağa (dışarıdan bakarken).
function yuzCercevesi(W, yuz, w, d, zOff, y, dis = 0) {
  const t = { 'z+': [0, d / 2 + dis, 0], 'x+': [w / 2 + dis, 0, PI / 2], 'z-': [0, -d / 2 - dis, PI], 'x-': [-w / 2 - dis, 0, -PI / 2] }[yuz];
  const f = W.alt(t[0], t[1], t[2], y);
  f.cephe = true;
  return f;
}
// Yüz üzerinde yerel x ekseninin dünya merkez kaydırması: üst kat dikdörtgeninin merkezi yüz çerçevesinde nerede
const yuzMerkez = (yuz, cxU, czU) => ({ 'z+': cxU, 'x+': -czU, 'z-': -cxU, 'x-': czU }[yuz]);

function kanat(Y, S, o) {
  const { Z, w, d, h1, h2, H, cx = 0, cz = 0, ry = 0, cikma = [], e = 0.048, yuz = {}, desen = 'carpraz', renk, doku, kabuk = S.kiris, baca: bc = null, dorm = null } = o;
  const W = Y.alt(cx, cz, ry);
  const yU = Z + h1 + 0.034, y2 = yU + h2;
  // üst kat dikdörtgeni (çıkma yönlerinde taşkın)
  const ux0 = -w / 2 - (cikma.includes('x-') ? e : 0), ux1 = w / 2 + (cikma.includes('x+') ? e : 0);
  const uz0 = -d / 2 - (cikma.includes('z-') ? e : 0), uz1 = d / 2 + (cikma.includes('z+') ? e : 0);
  const cxU = (ux0 + ux1) / 2, czU = (uz0 + uz1) / 2, wU = ux1 - ux0, dU = uz1 - uz0;
  // zemin kat: taş + köşe taşları
  W.kutu(w, h1, d, 0, Z, 0, 'tasBlok', S.tas);
  // üst kat gövdesi (sıva)
  W.kutu(wU, h2, dU, cxU, yU, czU, 'duz', o.siva);
  // alın üçgenleri (mahyaya dik yüzler: x±)
  for (const sx of [-1, 1]) {
    const px = sx > 0 ? ux1 : ux0;
    W.prizma([[uz0 + 0.04, y2 - 0.01], [uz1 - 0.04, y2 - 0.01], [czU, y2 + H - 0.065]], sx > 0 ? px - 0.04 : px, sx > 0 ? px : px + 0.04, 'x', 0, 0, 0, 'duz', o.siva);
  }
  // çatı
  const cati = catiBesik(W, { x0: cxU, z0: czU, w: wU, d: dU, y: y2, H, oh: 0.05, rake: 0.04, renk, doku, kabukRenk: kabuk, kuyruk: true, yosun: S.yosun });

  for (const [f, tanim] of Object.entries(yuz)) {
    const gw = f[0] === 'z' ? w : d, uw = f[0] === 'z' ? wU : dU;
    const jetty = cikma.includes(f);
    const x0u = yuzMerkez(f, cxU, czU);
    // zemin kat cephe
    const G = yuzCercevesi(W, f, w, d, 0, Z);
    const dl = [];
    if (tanim.kapi) { const k = tanim.kapi; kapi(G, S, k); dl.push([k.x - k.w / 2, k.x + k.w / 2]); if (tanim.tente) tente(G, S, { x: k.x, y: k.h + 0.04, w: k.w + 0.1 }); }
    for (const p of tanim.zemin || []) pencere(G, S, { y: 0.075, w: 0.07, h: 0.085, tip: 'kemer', panjur: 'acik', ...p });
    // taş taban kuşağı (yağmur/çamur sıçraması için koyu ve çıkıntılı)
    G.kutu(gw + 0.012, 0.034, 0.012, 0, 0, 0.004, 'moloz', S.tas);
    // köşe taşları (dönüşümlü uzun/kısa) iki uçta
    for (const s of [-1, 1]) {
      for (let i = 0; i < Math.floor(h1 / 0.04); i++) {
        const uz = i % 2 ? 0.06 : 0.04;
        G.kutu(uz, 0.036, 0.016, s * (gw / 2 - uz / 2 + 0.002), i * 0.04 + 0.002, 0.004, 'tasBlok', i % 2 ? S.tasAcik : S.tas);
      }
    }
    // çıkma altı kirişler
    if (jetty) cikmaAlti(G, S, { x0: x0u, w: uw, y: h1 + 0.034, oy: e, z: 0 });
    // üst kat cephe
    const U = yuzCercevesi(W, f, w, d, 0, yU, jetty ? e : 0);
    const pj = tanim.ust || [];
    kirisKafes(U, S, { x0: x0u, w: uw, y0: 0, h: h2, delik: pj.map((p) => [x0u + p.x - p.w / 2 - 0.02, x0u + p.x + p.w / 2 + 0.02]), desen });
    for (const p of pj) pencere(U, S, { y: h2 * 0.28, h: h2 * 0.46, panjur: 'acik', ...p, x: x0u + p.x });
    // alın (üçgen) kirişleri: mahyaya dik yüzler
    if (f[0] === 'x') {
      const A = U;
      const hh = H - 0.085;
      A.kiris([x0u - dU / 2 + 0.015, h2 + 0.01, 0.006], [x0u, h2 + hh, 0.006], 0.014, 0.016, 'kutuk', S.kiris);
      A.kiris([x0u + dU / 2 - 0.015, h2 + 0.01, 0.006], [x0u, h2 + hh, 0.006], 0.014, 0.016, 'kutuk', S.kiris);
      A.kutu(0.022, hh, 0.02, x0u, h2, 0.008, 'kutuk', S.kiris);
      A.kutu(dU - 0.02, 0.026, 0.02, x0u, h2, 0.008, 'kutuk', S.kiris);
      A.kiris([x0u - dU * 0.26, h2 + 0.02, 0.006], [x0u - 0.012, h2 + hh * 0.62, 0.006], 0.012, 0.014, 'kutuk', S.kiris);
      A.kiris([x0u + dU * 0.26, h2 + 0.02, 0.006], [x0u + 0.012, h2 + hh * 0.62, 0.006], 0.012, 0.014, 'kutuk', S.kiris);
      if (tanim.alinPencere) pencere(A, S, { x: x0u, y: h2 + 0.035, w: 0.05, h: 0.07, panjur: null, isikli: true });
    }
  }
  if (dorm) for (const dd of dorm) dormer(W, S, { x: cxU + dd.x, zFront: czU + dU * (dd.z ?? 0.3), cati, w: dd.w ?? 0.17, h: dd.h ?? 0.12 });
  if (bc) for (const b of bc) baca(W, S, { x: cxU + b.x, z: czU + (b.z || 0), y: cati.yR - 0.07, h: b.h ?? 0.17 });
  return { W, cati, y2, yU, cxU, czU, wU, dU };
}

// ---------- ek öğeler ----------
function sokak(Y, S, k, R, dekor) {
  const f = Y;
  if (dekor.patika) for (let i = 0; i < 3; i++) f.kutu(0.085 + R() * 0.03, 0.012, 0.075, dekor.patika[0] + (R() - 0.5) * 0.03, 0, dekor.patika[1] + i * 0.095, 'tasBlok', R() < 0.5 ? S.tasAcik : S.tas, { ry: (R() - 0.5) * 0.4 });
}
// Alçak ahşap bahçe çiti (k.cit): ön/yan kenarı tanımlar, avluya kimlik verir.
function citSira(Y, x0, z0, x1, z1, Z) { Y.k.cit(x0, z0, x1, z1, Z, 0x7a5a3a, 0.1); }
function varil(Y, S, x, z, y, s = 1) {
  Y.silindir(0.052 * s, 0.047 * s, 0.12 * s, 9, x, y, z, 'tahta', 0x8a5a32);
  for (const t of [0.22, 0.78]) Y.silindir(0.056 * s, 0.056 * s, 0.012 * s, 9, x, y + 0.12 * s * t - 0.006 * s, z, 'duz', S.demir);
}
function cicekYatagi(Y, S, x, z, y, w, d) {
  const R = Y.k.R;
  Y.kutu(w, 0.03, d, x, y, z, 'tahta', S.saksi);
  Y.kutu(w - 0.02, 0.012, d - 0.02, x, y + 0.028, z, 'toprak', 0x5a4028);
  const n = Y.k.lod ? 0 : Math.round(w / 0.03);
  for (let i = 0; i < n; i++) {
    const cx = x - w / 2 + 0.02 + (i * (w - 0.04)) / Math.max(1, n - 1), cz = z + (R() - 0.5) * (d - 0.03);
    Y.kure(0.017 + R() * 0.006, cx, y + 0.034 + R() * 0.008, cz, 'duz', 0x4a8a3a);
    if (R() < 0.8) Y.kure(0.009 + R() * 0.004, cx + (R() - 0.5) * 0.01, y + 0.056 + R() * 0.012, cz, 'duz', S.cicek[Math.floor(R() * S.cicek.length)]);
  }
}
// Taş köşeye tırmanan sarmaşık: küçük yeşil kümeler (yükseldikçe seyrelir).
function sarmasik(Y, x, z, y, h, yon = 1) {
  if (Y.k.lod) return;
  const R = Y.k.R;
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    Y.kure(0.02 + R() * 0.012 - t * 0.008, x + yon * (R() * 0.03 - t * 0.012), y + t * h + R() * 0.02, z + R() * 0.02, 'duz', [0x3f7a35, 0x4f8a3a, 0x5a9a42][i % 3]);
  }
}
function kule(Y, S, o) {
  const { Z, x, z, r, h, renk, sapka = 0.2 } = o;
  Y.silindir(r * 1.06, r * 1.1, 0.03, 10, x, Z, z, 'tasBlok', S.tas);
  Y.silindir(r, r * 1.03, h, 10, x, Z + 0.02, z, 'tasBlok', S.tasAcik);
  for (const t of [0.34, 0.68]) Y.silindir(r * 1.07, r * 1.07, 0.014, 10, x, Z + 0.02 + h * t, z, 'tasBlok', S.tas);
  Y.silindir(r * 1.18, r * 1.05, 0.04, 10, x, Z + 0.02 + h, z, 'tasBlok', S.tas); // başlık
  // ok yarığı pencereler: +z ve +x yüzlerinde, ışıklı
  for (const [a, yy] of [[0.5, 0.3], [PI / 2 - 0.35, 0.55], [0.1, 0.72]]) {
    const px = x + Math.sin(a) * (r + 0.004), pz = z + Math.cos(a) * (r + 0.004);
    Y.kutu(0.018, 0.058, 0.014, px, Z + 0.02 + h * yy, pz, 'duz', S.camIsik, { ry: a, isil: true });
    Y.kutu(0.026, 0.066, 0.008, px - Math.sin(a) * 0.002, Z + 0.02 + h * yy - 0.004, pz - Math.cos(a) * 0.002, 'tasBlok', S.tas, { ry: a });
  }
  return kuleKulah(Y, { lx: x, lz: z, y: Z + 0.02 + h + 0.04, r, h: sapka, renk, doku: 'arduvaz' });
}
function atolyeEki(Y, S, o) {
  const { Z, x, z, w, d, h, renk } = o;
  const R = Y.k.R;
  const A = Y.alt(x, z, 0);
  A.kutu(w, h, d, 0, Z, 0, 'tasBlok', S.tas);
  // üst kısım sıva + kiriş (vitrin)
  A.kutu(w + 0.01, 0.05, d + 0.01, 0, Z + h, 0, 'duz', o.siva);
  catiTek(A, { x0: 0, z0: 0, w, d, y: Z + h + 0.05, yuk: 0.065, oh: 0.045, rake: 0.03, renk, doku: S.catiDoku, kabukRenk: S.kiris });
  // ön (+z) tezgâh penceresi: geniş açıklık, açık kepenk (tahta, yukarı kalkık), tezgâh
  const F = A.alt(0, d / 2, 0, Z);
  F.kutu(w * 0.62, h * 0.52, 0.03, 0, h * 0.22, 0.006, 'duz', S.camKoyu, { isil: true });
  F.kutu(w * 0.72, 0.026, 0.06, 0, h * 0.2, 0.03, 'tahta', S.kirisAcik);
  F.kutu(w * 0.72, 0.024, 0.034, 0, h * 0.78, 0.018, 'kutuk', S.kiris);
  for (const s of [-1, 1]) F.kutu(0.022, h * 0.62, 0.034, s * w * 0.35, h * 0.18, 0.018, 'kutuk', S.kiris);
  // yukarı açılmış kepenk: eğik tahta + çubuk
  F.kutu(w * 0.7, 0.012, 0.09, 0, h * 0.96, 0.07, 'tahta', S.panjur[0], { rx: -0.35 });
  // çizgili kumaş tente (iki renk)
  for (let i = 0; i < 6; i++) {
    const sx = -w * 0.38 + (i + 0.5) * (w * 0.76 / 6);
    F.prizma([[0.0, h * 0.86], [0.12, h * 0.72], [0.12, h * 0.67], [0.0, h * 0.8]], sx - w * 0.76 / 12 + 0.002, sx + w * 0.76 / 12 - 0.002, 'x', 0, 0, 0, 'kumas', i % 2 ? 0xe8dcc0 : 0xb03a2e);
  }
  // sağ yüz (+x) küçük pencere
  const SY = A.alt(w / 2, 0, PI / 2, Z);
  pencere(SY, S, { x: 0, y: h * 0.3, w: 0.07, h: h * 0.4, panjur: 'acik' });
  // tabela: demir konsol + asılı levha
  const T = A.alt(w / 2 + 0.01, d / 2 - 0.02, 0, Z);
  T.kiris([0, h * 0.7, 0], [0.09, h * 0.7, 0.0], 0.012, 0.012, 'duz', S.demir);
  T.kiris([0, h * 0.7, 0], [0.04, h * 0.5, 0.0], 0.008, 0.008, 'duz', S.demir);
  T.kutu(0.07, 0.06, 0.012, 0.085, h * 0.28, 0.0, 'tahta', S.kirisAcik);
  T.silindir(0.02, 0.02, 0.008, 8, 0.085, h * 0.31, 0.01, 'duz', S.altin, { rx: PI / 2 });
  // çuval / sandık
  A.kutu(0.07, 0.06, 0.06, -w * 0.3, Z, d / 2 + 0.07, 'tahta', 0x9a6a3a, { ry: 0.3 });
  A.kutu(0.06, 0.05, 0.06, -w * 0.3 + 0.01, Z + 0.06, d / 2 + 0.07, 'tahta', 0x8a5a2a, { ry: -0.2 });
  void R;
}

// ---------- varyantlar ----------
export function yariAhsapEv(k, c, vr = 0) {
  const S = c.stil;
  const Y = new Yerel(k, 0, 0, 0, 0);
  const R = k.R;
  const Z = k.kaide(1, 'tas');
  const s = c.s;
  const siva = S.siva[(vr + (c.sv - 1)) % S.siva.length];
  const kirem = S.kiremit, arduvaz = S.arduvaz;
  const sv2 = c.sv >= 2, sv3 = c.sv >= 3;
  let ana;

  if (vr === 0) {
    // KLASİK: tek kanat, çıkma ön ve sağ; çatı penceresi, taş baca, kapı üstü sundurma
    ana = kanat(Y, S, { Z, w: 0.62, d: 0.43, h1: 0.23, h2: 0.25 * s, H: 0.25 * s, cikma: ['z+', 'x+'], renk: kirem, doku: S.catiDoku, siva,
      yuz: {
        'z+': { kapi: { x: -0.16, w: 0.1, h: 0.19 }, tente: true, zemin: [{ x: 0.13 }, { x: 0.25, w: 0.06 }], ust: [{ x: -0.17, w: 0.085, saksi: true }, { x: 0.02, w: 0.085, tip: 'cift' }, { x: 0.2, w: 0.085, saksi: sv2 }] },
        'x+': { zemin: [{ x: 0.0 }], ust: [{ x: -0.07, w: 0.08 }, { x: 0.12, w: 0.08 }], alinPencere: true },
      },
      dorm: [{ x: -0.14, z: 0.3 }, ...(sv3 ? [{ x: 0.14, z: 0.3 }] : [])], baca: [{ x: 0.22, h: 0.17 }] });
    varil(Y, S, 0.33, 0.3, Z, 1);
    Y.k.odun(0.28, 0.44, Z, 0.15, 0.9);
    citSira(Y, -0.44, 0.44, -0.3, 0.44, Z); citSira(Y, -0.44, -0.05, -0.44, 0.44, Z);
    cicekYatagi(Y, S, 0.0, 0.405, Z + 0.0, 0.2, 0.06);
    sarmasik(Y, 0.305, 0.215, Z, 0.2);
    sokak(Y, S, k, R, { patika: [-0.16, 0.2] });
  } else if (vr === 1) {
    // L PLANLI: arka ana kanat (mahya x) + öne uzanan çapraz kanat (mahya z); arduvaz çatı
    const a1 = kanat(Y, S, { Z, w: 0.6, d: 0.36, h1: 0.22, h2: 0.23 * s, H: 0.24 * s, cx: -0.05, cz: -0.14, cikma: ['x+', 'z+'], desen: 'x', renk: arduvaz, doku: 'arduvaz', siva,
      yuz: { 'z+': { zemin: [{ x: -0.2 }], ust: [{ x: -0.2, w: 0.08 }, { x: -0.04, w: 0.08, tip: 'cift' }] } },
      dorm: [], baca: [{ x: -0.2, h: 0.15 }] });
    ana = kanat(Y, S, { Z, w: 0.46, d: 0.34, h1: 0.23, h2: 0.25 * s, H: 0.235 * s, cx: 0.17, cz: 0.07, ry: -PI / 2, cikma: ['x+'], desen: 'x', renk: arduvaz, doku: 'arduvaz', siva,
      yuz: {
        'x+': { kapi: { x: 0.0, w: 0.1, h: 0.19 }, tente: true, ust: [{ x: -0.07, w: 0.08, saksi: true }, { x: 0.075, w: 0.08, panjur: 'kapali' }], alinPencere: true },
        'z-': { zemin: [{ x: -0.1 }, { x: 0.12 }], ust: [{ x: -0.1, w: 0.08, saksi: true }, { x: 0.05, w: 0.085, tip: 'cift' }, { x: 0.18, w: 0.07 }] },
      },
      dorm: [], baca: [{ x: 0.08, h: 0.16 }] });
    void a1;
    cicekYatagi(Y, S, -0.22, 0.2, Z, 0.16, 0.06);
    varil(Y, S, -0.34, 0.12, Z, 1);
    Y.k.odun(-0.22, 0.34, Z, 0.4, 0.9);
    citSira(Y, -0.44, 0.45, -0.04, 0.45, Z);
    sokak(Y, S, k, R, { patika: [0.05, 0.3] });
  } else if (vr === 2) {
    // KULELİ: ana kanat + sağ-ön köşede merdiven kulesi (üç kademeli külah)
    ana = kanat(Y, S, { Z, w: 0.56, d: 0.4, h1: 0.23, h2: 0.25 * s, H: 0.25 * s, cx: -0.06, cz: -0.02, cikma: ['z+'], desen: 'v', renk: kirem, doku: S.catiDoku, siva,
      yuz: {
        'z+': { kapi: { x: -0.1, w: 0.1, h: 0.19 }, tente: true, zemin: [{ x: 0.1 }], ust: [{ x: -0.16, w: 0.085, saksi: true }, { x: 0.02, w: 0.085, tip: 'cift' }] },
        'x+': { zemin: [{ x: -0.08 }], ust: [{ x: 0.0, w: 0.085 }], alinPencere: true },
      },
      dorm: [{ x: -0.12, z: 0.3 }], baca: [{ x: -0.2, h: 0.17 }] });
    kule(Y, S, { Z, x: 0.3, z: 0.22, r: 0.1, h: 0.46 * s, renk: arduvaz });
    cicekYatagi(Y, S, -0.22, 0.34, Z, 0.16, 0.06);
    varil(Y, S, -0.36, 0.22, Z, 0.9);
    citSira(Y, -0.44, -0.2, -0.44, 0.4, Z); citSira(Y, -0.44, 0.44, -0.32, 0.44, Z);
    sokak(Y, S, k, R, { patika: [-0.1, 0.22] });
  } else {
    // ATÖLYELİ: küçük ana ev + sağda tek katlı, tezgâhlı atölye eki; tabela, tente, varil
    ana = kanat(Y, S, { Z, w: 0.5, d: 0.42, h1: 0.23, h2: 0.25 * s, H: 0.25 * s, cx: -0.1, cz: -0.02, cikma: ['z+', 'x+'], desen: 'ince', renk: kirem, doku: S.catiDoku, siva,
      yuz: {
        'z+': { kapi: { x: -0.1, w: 0.1, h: 0.19 }, tente: true, zemin: [{ x: 0.12 }], ust: [{ x: -0.14, w: 0.085, saksi: true }, { x: 0.07, w: 0.085, tip: 'cift', panjur: 'kapali' }] },
        'x+': { ust: [{ x: 0.0, w: 0.085 }], alinPencere: true },
      },
      dorm: [{ x: -0.1, z: 0.3 }], baca: [{ x: 0.12, h: 0.18 }] });
    atolyeEki(Y, S, { Z, x: 0.345, z: -0.04, w: 0.26, d: 0.36, h: 0.2, renk: kirem, siva });
    varil(Y, S, 0.4, 0.3, Z, 0.9);
    varil(Y, S, 0.33, 0.33, Z, 0.8);
    citSira(Y, -0.44, 0.45, -0.2, 0.45, Z);
    sokak(Y, S, k, R, { patika: [-0.1, 0.22] });
  }
  // seviye süsleri
  const yu = Z;
  if (sv2) { Y.silindir(0.006, 0.006, 0.22, 5, -0.38, yu, 0.3, 'kutuk', S.kiris); Y.kutu(0.05, 0.06, 0.05, -0.38, yu + 0.22, 0.3, 'duz', S.camIsik, { isil: true }); }
  if (sv3) k.bayrak(0.36, -0.34, yu, 0.62, 0xb03a2e);
  return ana;
}

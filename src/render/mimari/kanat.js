// Ortak kanat (bina gövdesi) üreticisi: zemin kat (taş) + çıkma + üst kat (kiriş kafesli sıva) + alın üçgenleri + kırık beşik çatı,
// çatı pencereleri ve bacalar. Ev, değirmen ve sonraki Orta Çağ konut/atölye tarifleri bunu kullanır.
// Koordinatlar: karo birimi; cephe çerçevesi `Yerel` (başlangıç cephe düzleminde, +z dışarı). Yüzler: 'z+','x+','z-','x-'.
import { catiBesik } from './cati.js';
import { pencere, kapi, tente, kirisKafes, cikmaAlti, baca, dormer } from './parcalar.js';

const PI = Math.PI;
// Yüz çerçeveleri: yerel (w×d) dikdörtgenin her yüzü için başlangıç, dönüş ve genişlik. Yerel x yüz boyunca soldan sağa (dışarıdan bakarken).
export function yuzCercevesi(W, yuz, w, d, zOff, y, dis = 0) {
  const t = { 'z+': [0, d / 2 + dis, 0], 'x+': [w / 2 + dis, 0, PI / 2], 'z-': [0, -d / 2 - dis, PI], 'x-': [-w / 2 - dis, 0, -PI / 2] }[yuz];
  const f = W.alt(t[0], t[1], t[2], y);
  f.cephe = true;
  return f;
}
// Yüz üzerinde yerel x ekseninin dünya merkez kaydırması: üst kat dikdörtgeninin merkezi yüz çerçevesinde nerede
const yuzMerkez = (yuz, cxU, czU) => ({ 'z+': cxU, 'x+': -czU, 'z-': -cxU, 'x-': czU }[yuz]);

export function kanat(Y, S, o) {
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


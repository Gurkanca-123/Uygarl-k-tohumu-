// Orta Çağ Su Değirmeni (2×2, kamu binası: çevredeki tarımı hızlandırır). Taş tabanlı yarı ahşap değirmen + dönen su çarkı + kanal.
// Çark ayrı ağdır (`k.pervane`): oyun onu kendi ekseni etrafında döndürür. Üç varyant: 0 yan çark (alttan akışlı) · 1 üstten akışlı oluklu çark ·
// 2 ön cephede çark + ambar eki. Eski rüzgâr değirmeni modeli `?mimari=yeni` kapalıyken aynen durur.
import { Yerel } from '../geometri.js';
import { catiTek } from '../cati.js';
import { kanat } from '../kanat.js';
import { suCarkiGeo, suKanali, havuz, savak, kopru, cuvalYigini, arabaKasa, vinc } from '../parcalar_su.js';

export const VARYANT_ADET = 3;
const PI = Math.PI;

function citler(Y, k, Z, hatlar) { for (const [x0, z0, x1, z1] of hatlar) k.cit(x0, z0, x1, z1, Z, 0x7a5a3a, 0.1); }

export function degirmen(k, c, vr = 0) {
  const S = c.stil;
  const Z = k.kaide(2, 'tas');
  const Y = new Yerel(k, 0, 0, 0, 0);
  const s = c.s;
  const siva = S.siva[(vr + c.sv) % S.siva.length];
  const sv2 = c.sv >= 2, sv3 = c.sv >= 3;
  let ana, carkM, carkY = Z + 0.31, carkR = 0.32;

  if (vr === 0) {
    // YAN ÇARK, alttan akışlı: gövde solda, çark sağ (x+) alında, kanal çarkın altından z boyunca akar
    ana = kanat(Y, S, { Z, w: 0.84, d: 0.66, h1: 0.3, h2: 0.25 * s, H: 0.27 * s, cx: -0.3, cz: -0.1, cikma: ['z+'], desen: 'carpraz', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: {
        'z+': { kapi: { x: -0.2, w: 0.11, h: 0.2 }, tente: true, zemin: [{ x: 0.1, w: 0.07, h: 0.09 }, { x: 0.28, w: 0.06 }], ust: [{ x: -0.2, w: 0.085, saksi: sv2 }, { x: 0.05, w: 0.09, tip: 'cift' }, { x: 0.27, w: 0.08, panjur: 'kapali' }] },
        'x+': { ust: [{ x: 0, w: 0.085 }] },
      }, dorm: [{ x: 0.1, z: 0.3, w: 0.18, h: 0.13 }], baca: [{ x: -0.3, h: 0.17 }] });
    carkM = { lx: 0.2, lz: -0.1, ry: PI / 2 };
    suKanali(Y, S, { x: 0.24, z: 0.0, y: Z, w: 0.26, uzun: 1.8, ry: 0 });
    havuz(Y, S, { x: 0.24, z: -0.8, y: Z, w: 0.6, d: 0.26 });
    savak(Y, S, { x: 0.24, z: -0.58, y: Z + 0.04, w: 0.26 });
    kopru(Y, S, { x: 0.24, z: 0.58, y: Z + 0.1, uzun: 0.5, genis: 0.14, ry: PI / 2 });
    cuvalYigini(Y, S, -0.62, 0.36, Z, 0.3);
    arabaKasa(Y, S, 0.66, 0.46, Z, -0.4);
    citler(Y, k, Z, [[0.88, -0.6, 0.88, 0.8], [0.5, 0.88, 0.88, 0.88]]);
  } else if (vr === 1) {
    // ÜSTTEN AKIŞLI: ahşap oluk (flume) kazıklar üstünde, çarkın tepesine su döker; daha büyük çark
    carkR = 0.37; carkY = Z + 0.37;
    ana = kanat(Y, S, { Z, w: 0.8, d: 0.62, h1: 0.3, h2: 0.25 * s, H: 0.28 * s, cx: -0.32, cz: -0.1, cikma: ['z+'], desen: 'x', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: {
        'z+': { kapi: { x: -0.18, w: 0.11, h: 0.2 }, tente: true, zemin: [{ x: 0.12, w: 0.07, h: 0.09 }], ust: [{ x: -0.2, w: 0.085, saksi: true }, { x: 0.04, w: 0.09, tip: 'cift' }, { x: 0.26, w: 0.08 }] },
        'x+': { ust: [{ x: 0.0, w: 0.085 }] },
      }, dorm: [{ x: -0.1, z: 0.3, w: 0.18, h: 0.13 }], baca: [{ x: -0.26, h: 0.17 }] });
    carkM = { lx: 0.2, lz: -0.1, ry: PI / 2 };
    suKanali(Y, S, { x: 0.24, z: 0.2, y: Z, w: 0.26, uzun: 1.3, ry: 0 });
    // oluk: kazıklı yüksek tahta kanal, çarkın üstüne uzanır
    const yo = Z + 0.76;
    Y.kutu(0.26, 0.05, 0.8, 0.24, yo, -0.45, 'tahta', 0x8a6a44);
    for (const sx of [-1, 1]) Y.kutu(0.025, 0.07, 0.8, 0.24 + sx * 0.12, yo + 0.04, -0.45, 'tahta', 0x7a5a38);
    Y.kutu(0.2, 0.025, 0.76, 0.24, yo + 0.05, -0.45, 'duz', 0x4a98bc);
    for (const z of [-0.8, -0.55, -0.3]) for (const sx of [-1, 1]) Y.kiris([0.24 + sx * 0.11, Z, z], [0.24 + sx * 0.11, yo, z], 0.03, 0.03, 'kutuk', S.kiris);
    for (const z of [-0.8, -0.55, -0.3]) Y.kutu(0.3, 0.025, 0.035, 0.24, yo - 0.05, z, 'kutuk', S.kiris);
    havuz(Y, S, { x: 0.24, z: -0.88, y: Z, w: 0.5, d: 0.2 });
    kopru(Y, S, { x: 0.24, z: 0.7, y: Z + 0.1, uzun: 0.5, genis: 0.14, ry: PI / 2 });
    cuvalYigini(Y, S, -0.62, 0.4, Z, -0.2, 1.1);
    cuvalYigini(Y, S, 0.7, 0.2, Z, 0.5, 0.9);
    citler(Y, k, Z, [[0.88, -0.2, 0.88, 0.85]]);
  } else {
    // ÖN ÇARK + AMBAR: gövde geride, çark ön (+z) cephede; kanal önde x boyunca; sağda saman çatılı ambar
    ana = kanat(Y, S, { Z, w: 0.76, d: 0.6, h1: 0.3, h2: 0.25 * s, H: 0.27 * s, cx: -0.22, cz: -0.28, cikma: ['x+'], desen: 'v', renk: S.kiremit, doku: S.catiDoku, siva,
      yuz: {
        'z+': { zemin: [{ x: -0.22, w: 0.08, h: 0.09 }], ust: [{ x: -0.2, w: 0.085 }, { x: 0.12, w: 0.085, panjur: 'kapali' }] },
        'x+': { kapi: { x: 0.0, w: 0.11, h: 0.2 }, tente: true, ust: [{ x: 0.0, w: 0.085, saksi: true }], alinPencere: true },
      }, dorm: [{ x: 0.05, z: 0.3, w: 0.18, h: 0.13 }], baca: [{ x: -0.26, h: 0.17 }] });
    carkM = { lx: -0.18, lz: 0.2, ry: 0 };
    carkY = Z + 0.3;
    suKanali(Y, S, { x: 0.0, z: 0.22, y: Z, w: 0.26, uzun: 1.9, ry: PI / 2 });
    havuz(Y, S, { x: -0.8, z: 0.22, y: Z, w: 0.26, d: 0.5 });
    savak(Y, S, { x: -0.56, z: 0.22, y: Z + 0.04, w: 0.26, ry: PI / 2 });
    kopru(Y, S, { x: 0.58, z: 0.22, y: Z + 0.1, uzun: 0.5, genis: 0.14, ry: 0 });
    // ambar eki (sağ-arka): taş taban + ahşap üst, saman çatı
    const A = Y.alt(0.66, -0.55, 0);
    A.kutu(0.4, 0.2, 0.36, 0, Z, 0, 'tasBlok', S.tas);
    A.kutu(0.38, 0.12, 0.34, 0, Z + 0.2, 0, 'tahta', 0x9a7a54);
    catiTek(A, { x0: 0, z0: 0, w: 0.4, d: 0.36, y: Z + 0.32, yuk: 0.1, oh: 0.05, rake: 0.04, renk: [0xc8a050, 0xb89040, 0xd0aa58], doku: 'saman', kabukRenk: S.kiris });
    A.kutu(0.1, 0.14, 0.02, 0.05, Z, 0.185, 'tahta', 0x6a4a2a);
    cuvalYigini(Y, S, 0.66, -0.2, Z, 0.2);
    arabaKasa(Y, S, -0.6, 0.62, Z, 0.5);
  }
  // seviye süsleri + dönen su çarkı
  if (sv2) { Y.silindir(0.006, 0.006, 0.22, 5, -0.82, Z, 0.7, 'kutuk', S.kiris); Y.kutu(0.05, 0.06, 0.05, -0.82, Z + 0.22, 0.7, 'duz', S.camIsik, { isil: true }); }
  if (sv3) k.bayrak(0.8, -0.8, Z, 0.5, 0xb03a2e);
  const p = Y.nokta(carkM.lx, carkY - Z + Z, carkM.lz);
  k.pervane = { x: p[0], y: carkY, z: p[2], r: carkR, ry: carkM.ry, geo: suCarkiGeo(k) };
  // çark yuvası: çarkın dayandığı taş kemer/mil bloğu (gövde duvarında)
  const mh = Y.alt(carkM.lx, carkM.lz, carkM.ry);
  mh.kutu(0.07, 0.07, 0.12, 0, carkY - 0.035, 0, 'tasBlok', S.tas, { arka: true });
  void vinc; void sv3;
  return ana;
}

// Anıtsal / gotik mimari parçaları: sivri kemer profilleri, vitraylı pencere, gül pencere, kademeli portal, payanda, uçan payanda,
// kuleler (piramit/sekizgen külahlı, mazgallı). Katedral, kale, manastır gibi taş yapılar ortak kullanır.
// `Yerel` çerçevesi: başlangıç cephe düzleminde, +z dışarı; y çerçevenin y'sine göre.
import * as THREE from 'three';

const RT3 = Math.sqrt(3);
export const VITRAY = [0xffc070, 0xffb860, 0xf2a050, 0x7aa8f0, 0xe0705a]; // ağırlıklı sıcak amber, bir mavi, bir kırmızı
const carp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

// Eşkenar sivri kemer: yarım açıklık r, yay başlangıç yüksekliği d. Dışbükey dolu profil [u,v].
export function sivriProfil(r, d, seg = 5) {
  const p = [[-r, 0], [r, 0], [r, d]];
  for (let k = 1; k <= seg; k++) { const a = (Math.PI / 3) * (k / seg); p.push([-r + 2 * r * Math.cos(a), d + 2 * r * Math.sin(a)]); }
  for (let k = 1; k < seg; k++) { const a = Math.PI / 3 + (Math.PI / 3) * (k / seg) + Math.PI / 3; p.push([r + 2 * r * Math.cos(a), d + 2 * r * Math.sin(a)]); }
  p.push([-r, d]);
  return p;
}
// Sol tabandan sağ tabana sivri kemer çizgisi (halka yapmak için; aynı seg ile eşleşir)
export function sivriEgri(r, d, seg = 5) {
  const p = [[-r, 0], [-r, d]];
  for (let k = 1; k <= seg; k++) { const a = Math.PI - (Math.PI / 3) * (k / seg); p.push([r + 2 * r * Math.cos(a), d + 2 * r * Math.sin(a)]); }
  for (let k = 1; k <= seg; k++) { const a = Math.PI / 3 - (Math.PI / 3) * (k / seg); p.push([-r + 2 * r * Math.cos(a), d + 2 * r * Math.sin(a)]); }
  p.push([r, 0]);
  return p;
}
const yaySekli = (w, h) => { const r = w / 2, d = Math.max(0.01, h - r * RT3); return { r, d }; };

// Sivri kemer halkası (taş bileziği): dış r0, kalınlık t, derinlik z0..z1
function halka(Y, r0, d, t, z0, z1, renk, doku = 'tasBlok', seg = 5) {
  const dis = sivriEgri(r0, d, seg), ic = sivriEgri(r0 - t, d, seg);
  for (let i = 0; i < dis.length - 1; i++) {
    const q = [dis[i], dis[i + 1], ic[i + 1], ic[i]];
    // dejenere (kalınlıksız) dörtgeni atla
    const alan = Math.abs((q[1][0] - q[0][0]) * (q[3][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[3][0] - q[0][0]));
    if (alan < 1e-6) continue;
    Y.prizma(q, z0, z1, 'z', 0, 0, 0, doku, renk);
  }
}

/**
 * Sivri (lanset) pencere, vitraylı. o: { x, y (alt), w, h, sut = 1|2, renkler }
 * Taş çerçeve + renkli ışıltılı camlar + taş çıta; iki lansetli pencerede üstte küçük gül. Uzak LOD'da yalnız çerçeve + cam.
 */
export function sivriPencere(Y, S, o) {
  const R = Y.k.R;
  const { x, y, w, h, sut = 1 } = o;
  const { r, d } = yaySekli(w, h);
  Y.prizma(sivriProfil(r + 0.02, d, 5), 0.0, 0.014, 'z', x, y - 0.01, 0, 'tasBlok', S.tasKrem);
  const pick = () => (o.renkler || VITRAY)[Math.floor(R() * (o.renkler || VITRAY).length)];
  if (sut === 1 || Y.k.lod) {
    Y.prizma(sivriProfil(r, d, 4), 0.012, 0.024, 'z', x, y, 0, 'duz', pick(), { isil: true });
    if (!Y.k.lod) {
      Y.kutu(0.008, d * 0.9, 0.034, x, y + 0.01, 0.017, 'tasBlok', S.tasKrem);
      for (const t of [0.32, 0.6]) Y.kutu(r * 1.7, 0.008, 0.034, x, y + d * t, 0.017, 'tasBlok', S.tasKrem);
    }
  } else {
    const lr = (r - 0.006) / 2, ld = d * 0.95;
    for (const s of [-1, 1]) {
      Y.prizma(sivriProfil(lr * 0.92, ld * 0.8, 4), 0.012, 0.024, 'z', x + s * (lr + 0.003), y, 0, 'duz', pick(), { isil: true });
      Y.kutu(lr * 1.8, 0.007, 0.034, x + s * (lr + 0.003), y + ld * 0.4, 0.017, 'tasBlok', S.tasKrem);
    }
    Y.kutu(0.01, d * 0.95, 0.034, x, y, 0.017, 'tasBlok', S.tasKrem);
    Y.silindir(r * 0.34, r * 0.34, 0.012, 8, x, y + d + r * 0.55, 0.02, 'duz', pick(), { rx: Math.PI / 2, isil: true });
  }
  // denizlik
  Y.kutu(w + 0.05, 0.014, 0.04, x, y - 0.022, 0.02, 'tasBlok', S.tas);
}

/** Gül pencere: taş çember, renkli dilimler, taş parmaklıklar. o: { x, y (merkez), r } */
export function gulPencere(Y, S, o) {
  const R = Y.k.R;
  const { x, y, r } = o;
  Y.silindir(r + 0.03, r + 0.03, 0.03, 14, x, y - 0.015, 0.0, 'tasBlok', S.tasKrem, { rx: Math.PI / 2 });
  const n = Y.k.lod ? 1 : 12;
  if (n === 1) { Y.silindir(r, r, 0.014, 12, x, y - 0.007, 0.022, 'duz', 0xffb860, { rx: Math.PI / 2, isil: true }); return; }
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.01, a1 = ((i + 1) / n) * Math.PI * 2 - 0.01;
    const poly = [[0, 0], [r * Math.cos(a0), r * Math.sin(a0)], [r * Math.cos((a0 + a1) / 2) * 1.02, r * Math.sin((a0 + a1) / 2) * 1.02], [r * Math.cos(a1), r * Math.sin(a1)]];
    Y.prizma(poly, 0.016, 0.026, 'z', x, y, 0, 'duz', VITRAY[(i + (R() < 0.3 ? 1 : 0)) % 4], { isil: true });
  }
  for (let i = 0; i < 6; i++) { // parmaklıklar: merkezden çapa
    const a = (i / 6) * Math.PI;
    Y.kiris([x - Math.cos(a) * r, y - Math.sin(a) * r, 0.03], [x + Math.cos(a) * r, y + Math.sin(a) * r, 0.03], 0.008, 0.01, 'tasBlok', S.tasKrem);
  }
  Y.silindir(r * 0.22, r * 0.22, 0.014, 8, x, y - 0.007, 0.03, 'tasBlok', S.tasKrem, { rx: Math.PI / 2 });
  Y.silindir(r * 0.62, r * 0.62, 0.006, 14, x, y - 0.003, 0.032, 'duz', carp(S.tasKrem, 0.8), { rx: Math.PI / 2 });
}

/**
 * Kademeli sivri portal. o: { x, w, h, kademe = 4 }. Dışa doğru artan taş halkalar, derinlik hissi için dönüşümlü ton,
 * koyu ahşap kapı (demir bantlı), üstte aydınlık sivri alınlık, basamaklar.
 */
export function portal(Y, S, o) {
  const { x, w, h, kademe = 4 } = o;
  const f = Y.alt(x, 0, 0, o.y || 0);
  f.cephe = true;
  const r0 = w / 2, d = h - r0 * RT3 + 0.0;
  const t = Math.min(0.034, r0 * 0.2);
  for (let i = 0; i < kademe; i++) {
    const r = r0 - i * t * 0.9;
    halka(f, r + t * 0.1, d, t * 0.95, 0.0, 0.05 - i * 0.008, i % 2 ? S.tasKrem : carp(S.tasKrem, 0.84), 'tasBlok', Y.k.lod ? 3 : 5);
    // kademeli sütunlar (söve): her halkanın altında ince sütun
    if (!Y.k.lod) for (const s of [-1, 1]) f.silindir(0.009, 0.009, d, 6, s * (r - t * 0.5), 0.0, 0.05 - i * 0.008, 'tasBlok', S.tas);
  }
  const ri = r0 - kademe * t * 0.9 + t * 0.2;
  // kapı kanatları (sivri) + tepelik (koyu ışıklı alınlık)
  f.prizma(sivriProfil(ri, d * 0.55, 5), 0.0, 0.022, 'z', 0, 0, 0, 'tahta', S.kapiKoyu);
  if (!Y.k.lod) {
    f.kutu(0.008, d * 0.55 + ri * 0.6, 0.026, 0, 0.0, 0.003, 'duz', S.demir);
    for (const s of [-1, 1]) for (const yy of [0.25, 0.55, 0.85]) f.kutu(ri * 0.9, 0.012, 0.028, s * ri * 0.5, d * 0.55 * yy, 0.004, 'duz', S.demir);
  }
  // alınlık aydınlığı (kemer ile kapı arası)
  f.prizma(sivriProfil(ri, d * 0.55 + ri * 0.3, 4), 0.0, 0.012, 'z', 0, d * 0.55 + ri * 0.55 + 0.012, 0, 'duz', 0xffc070, { isil: true, rol: '' });
  // basamaklar
  for (let i = 0; i < 3; i++) f.kutu(w + 0.2 + i * 0.06, 0.025, 0.07, 0, i * 0.022 - 0.06, 0.06 + i * 0.05, 'tasBlok', i % 2 ? S.tas : S.tasKrem);
}

/** Kademeli taş ayak (payanda) + sivri tepelik. o: { x, z, y, w, h, tepelik = true } */
export function ayak(Y, S, o) {
  const { x, z, y, w, h, tepelik = true } = o;
  const k1 = h * 0.45, k2 = h * 0.35;
  Y.kutu(w, k1, w, x, y, z, 'tasBlok', S.tasKrem);
  Y.kutu(w * 0.84, k2, w * 0.84, x, y + k1, z, 'tasBlok', S.tasKrem);
  Y.kutu(w * 0.98, 0.014, w * 0.98, x, y + k1 - 0.007, z, 'tasBlok', S.tas); // silme
  Y.kutu(w * 0.74, h - k1 - k2, w * 0.74, x, y + k1 + k2, z, 'tasBlok', S.tasKrem);
  if (tepelik) {
    Y.koni(w * 0.66, w * 1.5, 4, x, y + h, z, 'arduvaz', S.arduvazUst, { ry: Math.PI / 4 });
    if (!Y.k.lod) Y.kure(0.012, x, y + h + w * 1.5, z, 'duz', S.altin);
  }
}

/** Uçan payanda: pier tepesi A=(xA,yA) → duvar B=(xB,yB); kemerli bant. z: nef boyunca konum. */
export function ucanPayanda(Y, S, o) {
  const { xA, yA, xB, yB, z, t = 0.04, w = 0.046 } = o;
  const cx = (xA + xB) / 2, cy = (yA + yB) / 2 + 0.11;
  const n = Y.k.lod ? 3 : 5;
  const P = (u) => [(1 - u) * (1 - u) * xA + 2 * u * (1 - u) * cx + u * u * xB, (1 - u) * (1 - u) * yA + 2 * u * (1 - u) * cy + u * u * yB];
  for (let i = 0; i < n; i++) {
    const a = P(i / n), b = P((i + 1) / n);
    Y.prizma([a, b, [b[0], b[1] - t], [a[0], a[1] - t]], z - w / 2, z + w / 2, 'z', 0, 0, 0, 'tasBlok', S.tasKrem);
  }
  // kemer altını dolduran küçük kemerlik (sivri boşluk) — kemer altı dolgu parçası
  if (!Y.k.lod) {
    const m = P(0.5);
    Y.kutu(0.016, 0.03, w * 0.9, m[0], m[1] - t - 0.03, z, 'tasBlok', S.tas);
  }
}

/**
 * Çan/ön kule. o: { x, z, y, w, h, kule: 'piramit'|'sekizgen'|'mazgal', kuleH, pencere: [y1,y2,..] }
 * Dönüş: tepe y. Gövde dört cephede (z+ ve x+ görünür) sivri pencereler; köşe ayakları; silmeler.
 */
export function kuleGovde(Y, S, o) {
  const { x, z, y, w, h, kule = 'piramit', kuleH = 0.8, pencereler = [0.3, 0.6], gen = 0.0 } = o;
  const body = S.tasKrem;
  Y.kutu(w, h, w, x, y, z, 'tasBlok', body);
  // köşe ayakları (iki kademeli)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    Y.kutu(0.05, h * 0.62, 0.05, x + sx * (w / 2 + 0.006), y, z + sz * (w / 2 + 0.006), 'tasBlok', S.tasKrem);
    Y.kutu(0.04, h * 0.3, 0.04, x + sx * (w / 2 + 0.002), y + h * 0.62, z + sz * (w / 2 + 0.002), 'tasBlok', S.tasKrem);
  }
  // silmeler
  for (const t of [0.34, 0.68]) Y.kutu(w + 0.03, 0.02, w + 0.03, x, y + h * t, z, 'tasBlok', S.tas);
  // pencereler: z+ ve x+ cepheleri
  const ya = pencereler;
  ya.forEach((t, i) => {
    const wy = 0.07 - i * 0.008, hy = 0.15 - i * 0.012, yy = y + h * t;
    const F = Y.alt(x, z + w / 2, 0, 0); F.cephe = true;
    sivriPencere(F, S, { x: 0, y: yy, w: wy, h: hy, sut: 1 });
    const G = Y.alt(x + w / 2, z, Math.PI / 2, 0); G.cephe = true;
    sivriPencere(G, S, { x: 0, y: yy, w: wy, h: hy, sut: 1 });
  });
  // çan katı: iki uzun ses delikli sivri açıklık (koyu) z+ ve x+
  const ct = y + h - 0.02;
  const yaz = 0.2;
  for (const [F, gen2] of [[Y.alt(x, z + w / 2, 0, 0), 0], [Y.alt(x + w / 2, z, Math.PI / 2, 0), 0]]) {
    F.cephe = true;
    for (const s of [-1, 1]) F.prizma(sivriProfil(0.028, 0.1, 4), 0.0, 0.018, 'z', s * 0.055, ct - yaz, 0, 'duz', 0x2a2420);
    void gen2;
  }
  // üst silme + korkuluk
  Y.kutu(w + 0.06, 0.03, w + 0.06, x, y + h, z, 'tasBlok', S.tas);
  const top = y + h + 0.03;
  if (kule === 'mazgal') {
    const m = 4;
    for (const sx of [-1, 1]) for (let i = 0; i < m; i++) {
      const p = -w / 2 + (w * (i + 0.5)) / m;
      Y.kutu(0.04, 0.05, 0.04, x + sx * (w / 2 + 0.01), top, z + p, 'tasBlok', S.tasKrem);
      Y.kutu(0.04, 0.05, 0.04, x + p, top, z + sx * (w / 2 + 0.01), 'tasBlok', S.tasKrem);
    }
    return { tepe: top + 0.05 };
  }
  return { tepe: top };
}

/**
 * Sivri külah (kule/vierung): dörtgen ya da sekizgen piramit, tırmanma süsleri (crochet), altın haç/küre.
 * o: { x, z, y, r (taban yarıçapı), h, seg: 4|8, kuyruk = true (alt kenar küçük alınlıklar), haç }
 */
export function sivriKulah(Y, S, o) {
  const { x, z, y, r, h, seg = 4, haç = true } = o;
  const R = Y.k.R;
  const renk = S.arduvaz;
  // iki kademe: alt kısım hafif geniş "kırık" tabanlı
  const h1 = h * 0.18, h2 = h - h1;
  const c1 = new THREE.Color(renk[0]).getHex(), c2 = new THREE.Color(renk[1]).getHex();
  Y.silindir(r * 0.84, r * 1.08, h1, seg, x, y, z, 'arduvaz', c1, { ry: Math.PI / seg, yumusak: false });
  Y.silindir(0.0, r * 0.84, h2, seg, x, y + h1, z, 'arduvaz', c2, { ry: Math.PI / seg, yumusak: false });
  if (!Y.k.lod) {
    // köşe sırtlarında crochet (küçük koniler)
    const nC = 5;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      for (let j = 1; j <= nC; j++) {
        const t = j / (nC + 1);
        const rr = r * 0.84 * (1 - t);
        Y.koni(0.014, 0.036, 4, x + Math.cos(a) * rr * 1.0, y + h1 + h2 * t, z + Math.sin(a) * rr * 1.0, 'tasBlok', S.tasKrem, { ry: Math.PI / 4 });
      }
    }
    // alt kenarda alınlıklı pencereler (lucarne)
    for (let i = 0; i < seg; i++) {
      const a = ((i + 0.5) / seg) * Math.PI * 2 + (seg === 4 ? 0 : 0);
      const px = x + Math.cos(a) * r * 0.72, pz = z + Math.sin(a) * r * 0.72;
      Y.kutu(0.05, 0.07, 0.04, px, y + h1 * 0.6, pz, 'tasBlok', S.tasKrem, { ry: -a + Math.PI / 2 });
      Y.koni(0.036, 0.05, 4, px, y + h1 * 0.6 + 0.07, pz, 'arduvaz', c1, { ry: -a + Math.PI / 4 });
      void R;
    }
  }
  const tepe = y + h;
  Y.silindir(0.006, 0.006, 0.1, 5, x, tepe - 0.01, z, 'duz', S.altin);
  Y.kure(0.015, x, tepe + 0.1, z, 'duz', S.altin);
  if (haç) { Y.kutu(0.008, 0.07, 0.008, x, tepe + 0.1, z, 'duz', S.altin); Y.kutu(0.04, 0.008, 0.008, x, tepe + 0.14, z, 'duz', S.altin); }
  return { tepe: tepe + 0.17 };
}

/** Mahya süsü: sırt boyunca küçük altın sivri uçlar (cresting). Çerçeve çatı ekseninde (x ekseni boyunca). */
export function mahyaSusu(Y, S, o) {
  const { x0, x1, y, z, aralik = 0.1 } = o;
  if (Y.k.lod) { Y.kutu(Math.abs(x1 - x0), 0.012, 0.012, (x0 + x1) / 2, y, z, 'duz', S.altin); return; }
  for (let x = x0 + aralik / 2; x < x1; x += aralik) Y.koni(0.014, 0.05, 4, x, y, z, 'duz', S.altin, { ry: Math.PI / 4 });
  Y.kutu(Math.abs(x1 - x0), 0.01, 0.012, (x0 + x1) / 2, y - 0.004, z, 'duz', S.altin);
}

/** Basamaklı taş sahanlık (anıt önü). o: { x, z, y, w, d, adim } */
export function sahanlik(Y, S, o) {
  const { x, z, y, w, d, adim = 3 } = o;
  for (let i = 0; i < adim; i++) Y.kutu(w + (adim - i) * 0.05, 0.026, d - i * 0.04, x, y + i * 0.026, z + i * 0.02, 'tasBlok', i % 2 ? S.tas : S.tasKrem);
}


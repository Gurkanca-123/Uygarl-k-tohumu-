// Çatı üreticileri: kırık (saçak kıvrımlı) beşik çatı, tek eğimli çatı, külah. Kabuk + sıra sıra kiremit/arduvaz dilimleri.
// Çerçeve `Yerel`: yerel x = mahya yönü, +z = ön. Dönen `yAt(z)` çatı yüzeyinin yerel z'deki yüksekliğini verir (çatı penceresi için).
import * as THREE from 'three';

// Kiremit/arduvaz dilimi: yalnız görünen iki yüz (u→k üst yüzey + k→l öne bakan dudak), 4 üçgen. u üst kenar, l alt kenar, k = l'nin kalkık hali [z,y].
function dilimGeo(u, l, k, a, b, nz, ny, tz, ty) {
  const pos = [];
  const tri = (p, q, r, hz, hy) => {
    const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const ters = n[2] * hz + n[1] * hy < 0;
    for (const v of ters ? [p, r, q] : [p, q, r]) pos.push(v[0], v[1], v[2]);
  };
  const V = (x, p) => [x, p[1], p[0]]; // [x, y, z]
  // üst yüzey: u→k eğimli düzlem (u ve l zeminde, k kalkık): iki üçgen, normal yukarı/dışa (nz, ny)
  tri(V(a, u), V(b, u), V(b, k), nz, ny); tri(V(a, u), V(b, k), V(a, k), nz, ny);
  // dudak: k ile l arası kısa dik şerit, normal yamaç aşağısına (tz, ty)
  tri(V(a, k), V(b, k), V(b, l), tz, ty); tri(V(a, k), V(b, l), V(a, l), tz, ty);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

const rastgeleRenk = (R, liste) => liste[Math.floor(R() * liste.length)];

// (u,v) → yerel (z,y) çizgisi üzerinde kabuk + dilimler. P,Q: [z,y] (P üstte/ridge tarafı, Q alçak kenar).
// Kabuk dikey kalınlık kal ile aşağı sarkar. Dilimler Q'ya doğru üst üste biner (dış kenar kalkık).
function kaplama(Y, o) {
  const { P, Q, kal, x0, L, renk, th, doku, kabukRenk, kabukDoku = 'tahta' } = o;
  const uzak = !!Y.k.lod;
  const satir = uzak ? Math.max(2, Math.ceil(o.satir * 0.6)) : o.satir, sutun = uzak ? Math.max(2, Math.ceil(o.sutun * 0.65)) : o.sutun;
  const R = Y.k.R;
  Y.prizma([P, Q, [Q[0], Q[1] - kal], [P[0], P[1] - kal]], x0 - L / 2, x0 + L / 2, 'x', 0, 0, 0, kabukDoku, kabukRenk);
  // yüzey normali (yukarı bakan): kenar yönüne dik
  const dz = Q[0] - P[0], dy = Q[1] - P[1], len = Math.hypot(dz, dy);
  let nz = -dy / len, ny = dz / len;
  if (ny < 0) { nz = -nz; ny = -ny; }
  const gap = 0.004, cw = L / sutun;
  for (let i = 0; i < satir; i++) {
    const t0 = i / satir, t1 = (i + 1) / satir;
    const u = [P[0] + dz * t0, P[1] + dy * t0], l = [P[0] + dz * t1, P[1] + dy * t1];
    const kalkik = [l[0] + nz * th, l[1] + ny * th];
    const ton = 0.95 + 0.07 * (i / satir);
    for (let j = 0; j < sutun; j++) {
      // her ikinci sırada yarım kayma: duvar örgüsü gibi
      const kay = i % 2 ? cw * 0.5 : 0;
      let a = x0 - L / 2 + j * cw - kay + gap / 2, b = a + cw - gap;
      a = Math.max(a, x0 - L / 2); b = Math.min(b, x0 + L / 2);
      if (b - a < 0.02) continue;
      const eski = R() < 0.05; // yaşlanmış/yama dilim: bazı kiremitler belirgin koyu ya da soluk
      const sakin = uzak ? 0.4 : 1; // uzak görünümde dilim rengi dalgalanması azalır: çatı daha temiz okunur
      const c = new THREE.Color(rastgeleRenk(R, renk)).multiplyScalar(ton * (1 + (R() - 0.5) * 0.08 * sakin) * (eski && !uzak ? (R() < 0.5 ? 0.8 : 1.12) : 1));
      if (!uzak && o.yosun && R() < 0.035) c.lerp(new THREE.Color(o.yosun), 0.55); // yosunlu dilim
      Y.ekle(dilimGeo(u, l, kalkik, a, b, nz, ny, dz / len, dy / len), 0, 0, 0, doku, c.getHex());
    }
  }
}

/**
 * Kırık beşik çatı. o: { x0, z0, w (duvar boyu, x), d (duvar derinliği, z), y (saçak seviyesi = duvar tepesi),
 *   H (mahya yüksekliği), oh (saçak taşkınlığı), rake (alın taşkınlığı), kal, kivrim (saçak kıvrımı), renk[], doku, satir, sutun,
 *   alin (alın kirişi/mahya süsü), kabukRenk, kuyruk }
 * Dönüş: { yAt(z), zE, yR, L, uzun }
 */
export function catiBesik(Y, o) {
  const { x0 = 0, z0 = 0, w, d, y, H, oh = 0.06, rake = 0.05, kal = 0.028, kivrim = 0.02, renk, doku = 'kiremit',
    kabukRenk = 0x4a3222, th = 0.009 } = o;
  const hz = d / 2, zE = hz + oh, L = w + 2 * rake;
  const m = H / hz;
  const yS = (u) => y + H - m * u;
  const uM = 0.56 * zE;
  const R0 = [0, y + H], M0 = [uM, yS(uM) - kivrim], E0 = [zE, yS(zE)];
  const satirUst = o.satirUst ?? Math.max(3, Math.round(Math.hypot(uM, R0[1] - M0[1]) / 0.052));
  const satirAlt = o.satirAlt ?? Math.max(3, Math.round(Math.hypot(zE - uM, M0[1] - E0[1]) / 0.052));
  const sutun = o.sutun ?? Math.max(4, Math.round(L / 0.115));
  for (const s of [1, -1]) {
    const P = (p) => [z0 + s * p[0], p[1]];
    kaplama(Y, { P: P(R0), Q: P(M0), kal, x0, L, renk, satir: satirUst, sutun, th, doku, kabukRenk, yosun: o.yosun });
    kaplama(Y, { P: P(M0), Q: P(E0), kal, x0, L, renk, satir: satirAlt, sutun, th, doku, kabukRenk, yosun: o.yosun });
    // saçak tahtası + alın kirişleri (rüzgârlık)
    Y.kiris([x0 - L / 2, E0[1] - kal * 0.5, z0 + s * (zE - 0.004)], [x0 + L / 2, E0[1] - kal * 0.5, z0 + s * (zE - 0.004)], 0.014, kal + 0.012, 'tahta', kabukRenk);
    for (const e of [-1, 1]) {
      const xe = x0 + e * (L / 2 + 0.004);
      Y.kiris([xe, R0[1] + 0.012, z0], [xe, M0[1] + 0.012, z0 + s * M0[0]], 0.016, 0.022, 'tahta', kabukRenk);
      Y.kiris([xe, M0[1] + 0.012, z0 + s * M0[0]], [xe, E0[1] + 0.006, z0 + s * E0[0]], 0.016, 0.022, 'tahta', kabukRenk);
    }
    if (o.kuyruk && !Y.k.lod) {
      for (let x = x0 - L / 2 + 0.07; x < x0 + L / 2 - 0.05; x += 0.1) {
        Y.kutu(0.016, 0.018, 0.05, x, E0[1] - kal - 0.014, z0 + s * (zE - 0.045), 'kutuk', kabukRenk);
      }
    }
  }
  // mahya sırtlığı + alın tepeliği
  const rc = 0.026;
  Y.prizma([[z0 - rc, R0[1] - 0.004], [z0 - rc * 0.55, R0[1] + rc * 0.9], [z0 + rc * 0.55, R0[1] + rc * 0.9], [z0 + rc, R0[1] - 0.004], [z0, R0[1] - 0.02]],
    x0 - L / 2 - 0.01, x0 + L / 2 + 0.01, 'x', 0, 0, 0, doku, new THREE.Color(renk[0]).multiplyScalar(0.8).getHex());
  if (o.alin !== false) for (const e of [-1, 1]) Y.koni(0.022, 0.07, 5, x0 + e * (L / 2 + 0.004), R0[1] + 0.005, z0, 'kutuk', kabukRenk);
  const yAt = (z) => {
    const u = Math.abs(z - z0);
    if (u >= zE) return E0[1];
    if (u <= uM) return R0[1] + (M0[1] - R0[1]) * (u / uM);
    return M0[1] + (E0[1] - M0[1]) * ((u - uM) / (zE - uM));
  };
  // yüksekliğin ön yamaçtaki z karşılığı (çatı penceresi gömme/yerleştirme için)
  const zOf = (yy) => {
    if (yy >= R0[1]) return z0;
    if (yy >= M0[1]) return z0 + uM * (R0[1] - yy) / (R0[1] - M0[1]);
    return z0 + uM + (zE - uM) * Math.min(1, (M0[1] - yy) / (M0[1] - E0[1]));
  };
  return { yAt, zOf, zE, yR: R0[1], L, uM };
}

/**
 * Tek eğimli çatı (ek yapı / sundurma): arka kenar (z = z0 - d/2 yüksekte) → ön kenar alçak.
 * o: { x0, z0, w, d, y (alçak kenar), yuk (yükseklik farkı), oh, rake, renk[], doku }
 */
export function catiTek(Y, o) {
  const { x0 = 0, z0 = 0, w, d, y, yuk, oh = 0.05, rake = 0.04, kal = 0.024, renk, doku = 'kiremit', kabukRenk = 0x4a3222, th = 0.011 } = o;
  const L = w + 2 * rake;
  const zUst = z0 - d / 2, zAlt = z0 + d / 2 + oh;
  const P = [zUst, y + yuk], Q = [zAlt, y - yuk * (oh / d)];
  const satir = o.satir ?? Math.max(4, Math.round(Math.hypot(zAlt - zUst, P[1] - Q[1]) / 0.05));
  const sutun = o.sutun ?? Math.max(3, Math.round(L / 0.11));
  kaplama(Y, { P, Q, kal, x0, L, renk, satir, sutun, th, doku, kabukRenk });
  Y.kiris([x0 - L / 2, Q[1] - kal * 0.5, zAlt - 0.004], [x0 + L / 2, Q[1] - kal * 0.5, zAlt - 0.004], 0.014, kal + 0.01, 'tahta', kabukRenk);
  for (const e of [-1, 1]) Y.kiris([x0 + e * (L / 2 + 0.004), P[1] + 0.01, zUst], [x0 + e * (L / 2 + 0.004), Q[1] + 0.006, zAlt], 0.016, 0.02, 'tahta', kabukRenk);
  return { yAt: (z) => P[1] + (Q[1] - P[1]) * Math.min(1, Math.max(0, (z - zUst) / (zAlt - zUst))) };
}

/** Kule külahı: üç kademeli, saçakta kalkık "cadı şapkası" profili. */
export function kuleKulah(Y, o) {
  const { lx, lz, y, r, h, seg = 8, renk, doku = 'kiremit', demir = 0x2e2a28 } = o;
  const R = Y.k.R;
  const kad = [[1.28, 0.95, 0.16], [0.95, 0.52, 0.30], [0.52, 0.0, 0.54]];
  let yy = y;
  for (const [rb, rt, f] of kad) {
    const hh = h * f;
    const c = new THREE.Color(rastgeleRenk(R, renk)).multiplyScalar(0.96 + R() * 0.1);
    Y.silindir(r * rt, r * rb, hh, seg, lx, yy, lz, doku, c.getHex(), { yumusak: false });
    yy += hh;
  }
  Y.silindir(0.006, 0.006, 0.09, 5, lx, yy - 0.01, lz, 'duz', demir);
  Y.kure(0.016, lx, yy + 0.085, lz, 'duz', 0xe8b84a);
  return { tepe: yy + 0.1 };
}

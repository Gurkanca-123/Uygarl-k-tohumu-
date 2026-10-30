// Modüler mimari parçalar (Orta Çağ konut dili): pencere, kapı, kiriş kafesi, baca, çıkma, çatı penceresi, sundurma, bahçe süsleri.
// Hepsi `Yerel` çerçevesinde çalışır: çerçeve başlangıcı cephe düzlemindedir, +z dışarı, y mutlak yüksekliktir.
import * as THREE from 'three';
import { kemerProfil } from './geometri.js';
import { catiBesik, catiTek } from './cati.js';

const renkCarp = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

/**
 * Pencere. o: { x, y (alt), w, h, tip: 'kare'|'kemer'|'cift', panjur: 'acik'|'kapali'|null, saksi, isikli, kafes }
 * Düzlemden 0.03 kadar çıkar: denizlik taşı, lento kirişi, çıta, panjur (menteşede dışarı açık).
 */
export function pencere(Y, S, o) {
  const R = Y.k.R;
  const { x, y, w, h, tip = 'kare', panjur = null, saksi = false } = o;
  const isikli = o.isikli ?? R() < 0.5;
  const cam = isikli ? S.camIsik : S.camKoyu;
  const f = 0.012;
  if (tip === 'kemer') {
    const dis = kemerProfil(w + 0.034, h + 0.017, 6);
    Y.prizma(dis, 0.002, 0.02, 'z', x, y - 0.017 + 0, 0, 'kutuk', S.kiris);
    Y.prizma(kemerProfil(w, h - 0.01, 6), 0.012, 0.024, 'z', x, y, 0, 'duz', cam, { isil: true });
    Y.kutu(0.007, h - 0.015, 0.018, x, y, 0.026, 'kutuk', S.kiris);
    Y.kutu(w - 0.004, 0.007, 0.018, x, y + h * 0.42, 0.026, 'kutuk', S.kiris);
  } else {
    const pw = tip === 'cift' ? w : w;
    // çerçeve
    Y.kutu(pw + 0.034, f, 0.022, x, y - f, 0.01, 'kutuk', S.kiris);
    Y.kutu(pw + 0.034, f, 0.022, x, y + h, 0.01, 'kutuk', S.kiris);
    for (const sx of [-1, 1]) Y.kutu(f, h + 0.012, 0.022, x + sx * (pw / 2 + f / 2 + 0.004), y - 0.006, 0.01, 'kutuk', S.kiris);
    Y.kutu(pw, h, 0.02, x, y, 0.008, 'duz', cam, { isil: true });
    // çıtalar: dikey + yatay (kafes: iki yatay)
    if (!Y.k.lod) {
    const nv = tip === 'cift' ? 2 : 1;
    for (let i = 1; i <= nv; i++) Y.kutu(0.007, h, 0.016, x - pw / 2 + (pw * i) / (nv + 1), y, 0.02, 'kutuk', S.kiris);
    for (const t of o.kafes ? [0.33, 0.66] : [0.52]) Y.kutu(pw, 0.007, 0.016, x, y + h * t, 0.02, 'kutuk', S.kiris);
    }
  }
  // denizlik taşı (ön kenarı çıkık) + iki küçük konsol
  Y.kutu(w + 0.07, 0.016, 0.052, x, y - 0.03, 0.026, 'tasBlok', S.tasAcik);
  if (!Y.k.lod) for (const sx of [-1, 1]) Y.kutu(0.014, 0.022, 0.03, x + sx * (w / 2 + 0.006), y - 0.052, 0.015, 'tasBlok', S.tas);
  // lento: ağır kiriş
  Y.kutu(w + 0.1, 0.022, 0.036, x, y + h + 0.014, 0.018, 'kutuk', S.kirisAcik);
  if (panjur) {
    const sw = (w + 0.01) / 2, ph = h + 0.02;
    const a = panjur === 'acik' ? 0.5 + R() * 0.25 : 0;
    const pr = S.panjur[Math.floor(R() * S.panjur.length)];
    for (const s of [-1, 1]) {
      const hx = x + s * (w / 2 + 0.019);
      const g = new THREE.BoxGeometry(sw, ph, 0.01);
      g.translate(s * sw / 2, 0, 0);
      g.rotateY(-s * a);
      Y.ekle(g, hx, y + h / 2 - 0.004, 0.015, 'tahta', pr);
      if (a) Y.kutu(0.004, 0.004, 0.004, hx, y, 0.015, 'duz', S.demir); // menteşe
    }
  }
  if (saksi) {
    const sy = y - 0.045;
    Y.kutu(w + 0.05, 0.03, 0.04, x, sy, 0.056, 'tahta', S.saksi);
    const cicek = S.cicek;
    const n = Y.k.lod ? 0 : Math.max(3, Math.round(w / 0.022));
    for (let i = 0; i < n; i++) {
      const cx = x - w / 2 - 0.01 + ((w + 0.02) * (i + 0.5)) / n;
      Y.kure(0.015 + R() * 0.006, cx, sy + 0.036 + R() * 0.012, 0.056, 'duz', cicek[Math.floor(R() * cicek.length)]);
    }
    Y.kutu(w + 0.03, 0.014, 0.034, x, sy + 0.028, 0.056, 'duz', 0x3f7a35); // yaprak yatağı
  }
}

/**
 * Kemerli kapı: taş kemer taşları (alternatif ton), tahta kanat, demir bantlar, eşik basamağı, fener.
 * o: { x, w, h, sivri? }
 */
export function kapi(Y, S, o) {
  const { x, w, h } = o;
  const ri = w / 2 + 0.004, ro = ri + 0.034, d = h - w / 2; // kemer yayı merkezi y = d
  const n = 7;
  // yan söveler
  for (const s of [-1, 1]) Y.kutu(ro - ri, d, 0.046, x + s * (ri + (ro - ri) / 2), 0, 0.016, 'tasBlok', S.tasAcik);
  // yay taşları
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    const q = [[ri * Math.cos(a0), d + ri * Math.sin(a0)], [ro * Math.cos(a0), d + ro * Math.sin(a0)], [ro * Math.cos(a1), d + ro * Math.sin(a1)], [ri * Math.cos(a1), d + ri * Math.sin(a1)]];
    Y.prizma(q, -0.004, 0.044, 'z', x, 0, 0, 'tasBlok', i % 2 ? S.tasAcik : renkCarp(S.tasAcik, 0.9));
  }
  // anahtar taşı (üstte biraz çıkık)
  Y.kutu(0.04, 0.05, 0.056, x, d + ro - 0.012, 0.018, 'tasBlok', S.tas);
  // kanat
  Y.prizma(kemerProfil(w, h, 6), 0.0, 0.026, 'z', x, 0, 0, 'tahta', S.kapi);
  // dikey tahta çizgileri ve demir bantlar
  if (Y.k.lod) return;
  for (const t of [-0.25, 0.25]) Y.kutu(0.005, d * 0.94, 0.006, x + t * w, 0.01, 0.028, 'kutuk', renkCarp(S.kapi, 0.62));
  for (const t of [0.22, 0.66]) {
    const by = d * t;
    Y.kutu(w * 0.96, 0.018, 0.008, x, by, 0.03, 'duz', S.demir);
    for (const s of [-1, 1]) Y.kure(0.011, x + s * w * 0.4, by + 0.009, 0.034, 'duz', S.demir);
  }
  Y.silindir(0.012, 0.012, 0.008, 8, x + w * 0.3, d * 0.4, 0.032, 'duz', S.altin, { rx: Math.PI / 2 });
  // eşik: iki basamak
  Y.kutu(w + 0.15, 0.022, 0.1, x, -0.01, 0.07, 'tasBlok', S.tas);
  Y.kutu(w + 0.08, 0.022, 0.06, x, 0.012, 0.06, 'tasBlok', S.tasAcik);
}

/** Sundurma (kapı üstü tente): tek eğimli çatı + iki payanda. */
export function tente(Y, S, o) {
  const { x, y, w } = o;
  const f = Y.alt(x, 0, 0);
  const t = catiTek(f, { x0: 0, z0: 0.075, w, d: 0.11, y, yuk: 0.04, oh: 0.025, rake: 0.02, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris });
  for (const s of [-1, 1]) f.kiris([s * (w / 2 - 0.012), y - 0.075, 0.0], [s * (w / 2 - 0.012), y - 0.005, 0.1], 0.012, 0.016, 'kutuk', S.kiris);
  return t;
}

/**
 * Ahşap iskelet: cephe yüzeyine çıkıntılı kirişler. o: { x0, w, y0, h, delik: [[xa,xb]], desen: 'carpraz'|'x'|'ince'|'v', kal }
 * Delikler (pencere/kapı x aralıkları) ortasındaki dikmeler atlanır.
 */
export function kirisKafes(Y, S, o) {
  const R = Y.k.R;
  const { x0, w, y0, h, delik = [], desen = 'carpraz', kal = 0.013, z = 0 } = o;
  const kirisRenk = S.kiris, ust = z + 0.006;
  // yatay kuşaklar
  Y.kutu(w + 0.012, 0.026, 0.02, x0, y0, ust, 'kutuk', kirisRenk);
  Y.kutu(w + 0.012, 0.026, 0.02, x0, y0 + h - 0.026, ust, 'kutuk', kirisRenk);
  // köşe dikmeleri (kalın)
  for (const s of [-1, 1]) Y.kutu(0.028, h, 0.024, x0 + s * (w / 2 - 0.004), y0, ust, 'kutuk', kirisRenk);
  const aralik = desen === 'ince' ? 0.11 : 0.19;
  const n = Math.max(1, Math.round(w / aralik));
  const cw = w / n;
  const delikte = (xa, xb) => delik.some(([a, b]) => xb > a - 0.01 && xa < b + 0.01);
  for (let i = 0; i < n; i++) {
    const xa = x0 - w / 2 + i * cw, xb = xa + cw;
    if (i > 0 && !delik.some(([a, b]) => xa > a - 0.015 && xa < b + 0.015)) {
      Y.kutu(kal, h - 0.05, 0.02, xa + (R() - 0.5) * 0.004, y0 + 0.03, ust, 'kutuk', kirisRenk);
    }
    if (delikte(xa, xb)) continue;
    const alt = y0 + 0.03, tep = y0 + h - 0.03;
    const yon = (i + (desen === 'v' ? 0 : 1)) % 2 ? 1 : -1;
    if (desen === 'x') {
      Y.kiris([xa + 0.012, alt, ust], [xb - 0.012, tep, ust], 0.011, 0.012, 'kutuk', kirisRenk);
      Y.kiris([xb - 0.012, alt, ust], [xa + 0.012, tep, ust], 0.011, 0.012, 'kutuk', kirisRenk);
    } else if (desen === 'v') {
      Y.kiris([xa + 0.012, tep, ust], [(xa + xb) / 2, alt, ust], 0.011, 0.012, 'kutuk', kirisRenk);
      Y.kiris([xb - 0.012, tep, ust], [(xa + xb) / 2, alt, ust], 0.011, 0.012, 'kutuk', kirisRenk);
    } else if (desen !== 'ince' || i % 2) {
      const [p, q] = yon > 0 ? [xa + 0.012, xb - 0.012] : [xb - 0.012, xa + 0.012];
      Y.kiris([p, alt, ust], [q, tep, ust], 0.014, 0.013, 'kutuk', kirisRenk);
    }
  }
}

/**
 * Çıkma altı: kat döşeme kirişi, taşıyıcı konsollar ve öne uzayan kiriş uçları.
 * o: { x0, w (üst kat genişliği), y (üst kat altı), oy (taşkın derinliği), z (zemin kat ön yüzü) }
 */
export function cikmaAlti(Y, S, o) {
  const { x0, w, y, oy, z = 0 } = o;
  // kuşak kirişi (ejderha kirişi)
  Y.kutu(w + 0.02, 0.034, oy + 0.03, x0, y - 0.034, z + oy / 2 - 0.004, 'kutuk', S.kirisAcik);
  // kiriş uçları (yuvarlatılmış)
  for (let x = x0 - w / 2 + 0.06; x < x0 + w / 2 - 0.03; x += 0.088) {
    Y.kutu(0.022, 0.026, oy + 0.015, x, y - 0.058, z + oy / 2 + 0.004, 'kutuk', S.kiris);
  }
  // köşe konsolları (üçgen payanda): duvardan ejderha kirişinin ucuna
  for (const sx of [-1, 1]) {
    const cx = x0 + sx * (w / 2 - 0.035);
    Y.prizma([[z, y - 0.11], [z + oy + 0.005, y - 0.036], [z, y - 0.036]], cx - 0.014, cx + 0.014, 'x', 0, 0, 0, 'kutuk', S.kiris);
  }
}

/** Taş baca: hafif konik gövde, iki kademe konsol, başlık levhası, ince duman çıkışı. */
export function baca(Y, S, o) {
  const { x, z, y, h, w = 0.064 } = o;
  Y.prizma([[-w / 2, 0], [w / 2, 0], [w / 2 - 0.01, h], [-w / 2 + 0.01, h]], -w / 2, w / 2, 'z', x, y, z, 'tasBlok', S.tas);
  Y.kutu(w + 0.02, 0.014, w + 0.02, x, y + h, z, 'tasBlok', S.tasAcik);
  Y.kutu(w + 0.034, 0.014, w + 0.034, x, y + h + 0.012, z, 'tasBlok', S.tas);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) Y.kutu(0.014, 0.026, 0.014, x + dx * w * 0.38, y + h + 0.026, z + dz * w * 0.38, 'tasBlok', S.tas);
  Y.kutu(w + 0.03, 0.01, w + 0.03, x, y + h + 0.052, z, 'tasBlok', S.tasAcik);
  // sıva bandı gövdede
  Y.kutu(w + 0.01, 0.024, w + 0.01, x, y + h * 0.5, z, 'tasBlok', S.tasAcik);
  const p = Y.nokta(x, y + h + 0.07, z);
  Y.k.bacaDumani(p[0], p[1], p[2], 0.9);
}

/**
 * Çatı penceresi (dormer): sıvalı gövde + kiriş kafesi + pencere + küçük beşik çatı. o: { x, zFront, cati (catiBesik dönüşü), w, h }
 * Gövde ön yüzü düşeydir; arka kenarı ana çatı yüzeyine gömülür, kendi çatısı ana çatıya oturur.
 */
export function dormer(Y, S, o) {
  const { x, zFront, cati, w = 0.17, h = 0.12 } = o;
  const yF = cati.yAt(zFront), yBot = yF - 0.03, top = yF + h;
  const zBack = cati.zOf(top) - 0.02;
  Y.kutu(w, top - yBot, zFront - zBack, x, yBot, (zFront + zBack) / 2, 'duz', S.siva);
  const f = Y.alt(x, zFront, 0);
  f.cephe = true;
  kirisKafes(f, S, { x0: 0, w, y0: yBot, h: top - yBot, delik: [[-0.045, 0.045]], desen: 'v', kal: 0.012 });
  pencere(f, S, { x: 0, y: yF + 0.012, w: 0.075, h: h * 0.62, tip: 'kare', panjur: 'acik', isikli: true });
  const Hd = 0.07, zRidge = cati.zOf(top + Hd) - 0.01;
  const len = zFront + 0.03 - zRidge;
  const c = Y.alt(x, (zFront + 0.03 + zRidge) / 2, Math.PI / 2);
  catiBesik(c, { x0: 0, z0: 0, w: len - 0.05, d: w, y: top, H: Hd, oh: 0.028, rake: 0.025, kal: 0.02, kivrim: 0, renk: S.kiremit, doku: S.catiDoku, kabukRenk: S.kiris, alin: false, satirUst: 2, satirAlt: 2, sutun: Math.max(2, Math.round(len / 0.1)) });
  return { top };
}

/** Basit bahçe/sokak süsleri */
export function yigin(Y, S, lx, lz, y, ry = 0) { Y.k.odun(lx, lz, y, ry, 0.9); }

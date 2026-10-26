// Bina modelleri: boyuta / türe göre basit prosedürel low-poly kutu-çatı modelleri. Çekirdeği yalnız okur.
import * as THREE from 'three';
import { BINALAR } from '../data/binalar.js';
import { CAGLAR } from '../data/caglar.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const CAG_SIRA = Object.fromEntries(CAGLAR.map((c) => [c.id, c.sira]));
export const TABAN_Y = 0.46; // temel üstü (en yüksek zemin karosunun üstü)

const DUVAR = [0x9c7b52, 0x9a9588, 0xb98a5a, 0xe2dccb, 0xb0a79a];
const CATI = [0x7a5a36, 0xb89a50, 0xa4512f, 0xc4673c, 0x4f3a30];
const TUR_CATI = { savunma: 0x6e6a66, huzur: 0xd8b04a, depo: 0x6b4a2f, bilgi: 0x4a6fa5, kamu: 0x8a3b32, anit: 0x5b6a8a };

const malzemeler = new Map();
function malzeme(renk, ek = {}) {
  const anahtar = renk + JSON.stringify(ek);
  let m = malzemeler.get(anahtar);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: renk, ...ek }); malzemeler.set(anahtar, m); }
  return m;
}

export function modeliTemizle(grup) {
  grup.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  grup.clear();
}

// durum: { insa: 0..1 | null, hasarli, isi: 'yukselt'|'onar'|null }; secenek.hayalet: tek renkli yarı saydam malzeme.
export function binaModeli(b, durum = {}, secenek = {}) {
  const t = BINA[b.id];
  const [g, h] = t.boyut;
  const grup = new THREE.Group();
  const cag = CAG_SIRA[t.cag] ?? 0;
  const tek = secenek.hayalet ? malzeme(secenek.hayalet, { transparent: true, opacity: 0.6, depthWrite: false }) : null;
  const M = (renk) => tek || malzeme(renk);
  const ekle = (geo, renk, x, y, z, rotY = 0) => {
    const m = new THREE.Mesh(geo, M(renk));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.castShadow = !tek; m.receiveShadow = !tek;
    grup.add(m);
    return m;
  };
  const kutu = (w, yk, d, renk, x, y, z) => ekle(new THREE.BoxGeometry(w, yk, d), renk, x, y, z);
  const piramit = (s, yk, renk, y) => {
    const geo = new THREE.ConeGeometry(s * 0.75, yk, 4);
    geo.rotateY(Math.PI / 4);
    return ekle(geo, renk, 0, y + yk / 2, 0);
  };

  // temel
  kutu(g - 0.04, 0.2, h - 0.04, 0x6a655c, 0, 0.36, 0);

  const duvar = DUVAR[cag];
  let cati = TUR_CATI[t.tur] ?? CATI[cag];
  if (t.tur === 'konut' || t.tur === 'uretim' || t.tur === 'donusum') cati = CATI[cag];
  let govdeRenk = durum.hasarli ? 0x4d443b : duvar;
  const boy = Math.min(g, h);
  const yk = (0.4 + 0.22 * (boy - 1)) + 0.1 * ((b.seviye || 1) - 1);
  let tepe = TABAN_Y;

  if (durum.insa != null && !secenek.hayalet) {
    // inşaat: ilerlemeye göre yükselen gövde + iskele direkleri
    const p = Math.max(0.2, durum.insa);
    kutu(g - 0.3, yk * p, h - 0.3, 0xc9a063, 0, TABAN_Y + (yk * p) / 2, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      kutu(0.07, yk + 0.25, 0.07, 0x7a5a36, sx * (g / 2 - 0.1), TABAN_Y + (yk + 0.25) / 2, sz * (h / 2 - 0.1));
    }
    tepe = TABAN_Y + yk + 0.25;
  } else if (b.id === 'kamp_atesi') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ekle(new THREE.DodecahedronGeometry(0.17), 0x8a867c, Math.cos(a) * 0.55, TABAN_Y + 0.1, Math.sin(a) * 0.55);
    }
    kutu(0.5, 0.12, 0.12, 0x5a3d22, 0, TABAN_Y + 0.08, 0);
    ekle(new THREE.ConeGeometry(0.22, 0.6, 6), 0xff8a2a, 0, TABAN_Y + 0.4, 0);
    tepe = TABAN_Y + 0.8;
  } else if (b.id === 'cadir') {
    ekle(new THREE.ConeGeometry(0.42, 0.75, 5), durum.hasarli ? 0x6a5a48 : 0xb8956a, 0, TABAN_Y + 0.375, 0);
    tepe = TABAN_Y + 0.75;
  } else if ((t.etiketler || []).includes('tarim')) {
    // tarla: toprak + sıralı ekin
    kutu(g - 0.1, 0.1, h - 0.1, 0x6b4f2d, 0, TABAN_Y + 0.05, 0);
    const n = Math.round(g * 2);
    for (let i = 0; i < n; i++) {
      kutu((g - 0.3) / n * 0.55, 0.14, h - 0.3, cag >= 2 ? 0xd9c24a : 0x8fb23a, -(g - 0.3) / 2 + ((i + 0.5) * (g - 0.3)) / n, TABAN_Y + 0.17, 0);
    }
    tepe = TABAN_Y + 0.25;
  } else if (b.id === 'kuyu') {
    ekle(new THREE.CylinderGeometry(0.28, 0.3, 0.3, 8), 0x8a867c, 0, TABAN_Y + 0.15, 0);
    ekle(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), 0x3f77b5, 0, TABAN_Y + 0.15, 0);
    tepe = TABAN_Y + 0.3;
  } else if (b.id === 'totem') {
    kutu(0.25, 0.9, 0.25, 0x7a5a36, 0, TABAN_Y + 0.45, 0);
    kutu(0.5, 0.12, 0.12, 0xd8b04a, 0, TABAN_Y + 0.7, 0);
    ekle(new THREE.ConeGeometry(0.17, 0.25, 4), 0xc0392b, 0, TABAN_Y + 1.02, 0);
    tepe = TABAN_Y + 1.15;
  } else if (t.tur === 'merkez') {
    kutu(g - 0.2, 0.7, h - 0.2, duvar, 0, TABAN_Y + 0.35, 0);
    piramit(Math.max(g, h) - 0.2, 0.55, CATI[cag], TABAN_Y + 0.7);
    kutu(0.04, 0.6, 0.04, 0x4a3a2a, 0, TABAN_Y + 1.5, 0);
    kutu(0.3, 0.18, 0.02, 0xc0392b, 0.17, TABAN_Y + 1.7, 0);
    tepe = TABAN_Y + 1.85;
  } else if (b.id === 'katedral') {
    kutu(g - 0.3, 1.0, h - 0.3, 0xcfc9bd, 0, TABAN_Y + 0.5, 0);
    piramit(g - 0.3, 0.6, 0x5b6a8a, TABAN_Y + 1.0);
    ekle(new THREE.ConeGeometry(0.28, 1.5, 4), 0x5b6a8a, 0, TABAN_Y + 2.3, 0, Math.PI / 4);
    kutu(0.6, 0.9, 0.6, 0xcfc9bd, 0, TABAN_Y + 1.45, 0);
    tepe = TABAN_Y + 3.0;
  } else if (t.tur === 'savunma' && g === 1) {
    const th = b.id === 'sur_parcasi' ? 0.45 : 0.9 + 0.1 * ((b.seviye || 1) - 1);
    kutu(b.id === 'sur_parcasi' ? 0.9 : 0.5, th, b.id === 'sur_parcasi' ? 0.45 : 0.5, 0x8a867c, 0, TABAN_Y + th / 2, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kutu(0.14, 0.14, 0.14, 0x76726a, sx * 0.17, TABAN_Y + th + 0.07, sz * 0.17);
    tepe = TABAN_Y + th + 0.15;
  } else if (t.tur === 'savunma') {
    const kh = 1.0;
    kutu(g - 0.3, kh, h - 0.3, 0x8a867c, 0, TABAN_Y + kh / 2, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      kutu(0.5, kh + 0.4, 0.5, 0x76726a, sx * (g / 2 - 0.25), TABAN_Y + (kh + 0.4) / 2, sz * (h / 2 - 0.25));
      ekle(new THREE.ConeGeometry(0.4, 0.4, 4), 0x8a3b32, sx * (g / 2 - 0.25), TABAN_Y + kh + 0.6, sz * (h / 2 - 0.25), Math.PI / 4);
    }
    tepe = TABAN_Y + kh + 0.9;
  } else if (t.tur === 'bilgi') {
    kutu(g - 0.3, yk, h - 0.3, duvar, 0, TABAN_Y + yk / 2, 0);
    const kub = new THREE.SphereGeometry(Math.min(g, h) * 0.38, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    ekle(kub, 0x4a6fa5, 0, TABAN_Y + yk, 0);
    tepe = TABAN_Y + yk + 0.5;
  } else if (t.tur === 'konut') {
    kutu(0.7, yk, 0.7, govdeRenk, 0, TABAN_Y + yk / 2, 0);
    piramit(0.7, 0.4, durum.hasarli ? 0x3a2f28 : cati, TABAN_Y + yk);
    tepe = TABAN_Y + yk + 0.4;
  } else if (t.tur === 'depo') {
    kutu(g - 0.2, yk * 0.9, h - 0.2, govdeRenk, 0, TABAN_Y + (yk * 0.9) / 2, 0);
    kutu(g - 0.1, 0.1, h - 0.1, cati, 0, TABAN_Y + yk * 0.9 + 0.05, 0);
    tepe = TABAN_Y + yk + 0.15;
  } else if (t.tur === 'huzur') {
    kutu(g - 0.3, yk, h - 0.3, 0xe8e0c8, 0, TABAN_Y + yk / 2, 0);
    piramit(Math.max(g, h) - 0.2, 0.5, cati, TABAN_Y + yk);
    tepe = TABAN_Y + yk + 0.5;
  } else if (t.tur === 'donusum') {
    kutu(0.75, yk, 0.75, govdeRenk, 0, TABAN_Y + yk / 2, 0);
    kutu(0.85, 0.1, 0.85, cati, 0, TABAN_Y + yk + 0.05, 0);
    kutu(0.18, 0.4, 0.18, 0x5a524a, 0.2, TABAN_Y + yk + 0.3, 0.2);
    tepe = TABAN_Y + yk + 0.55;
  } else if (t.tur === 'kamu') {
    kutu(g - 0.25, yk, h - 0.25, govdeRenk, 0, TABAN_Y + yk / 2, 0);
    piramit(Math.max(g, h) - 0.1, 0.45, cati, TABAN_Y + yk);
    tepe = TABAN_Y + yk + 0.45;
  } else {
    // üretim ve diğer: gövde + yassı çatı
    kutu(g - 0.25, yk, h - 0.25, govdeRenk, 0, TABAN_Y + yk / 2, 0);
    kutu(g - 0.1, 0.12, h - 0.1, cati, 0, TABAN_Y + yk + 0.06, 0);
    tepe = TABAN_Y + yk + 0.2;
  }

  if (!secenek.hayalet) {
    // seviye işaretleri (altın küpler) ve durum rozetleri
    for (let i = 1; i < (b.seviye || 1); i++) kutu(0.1, 0.1, 0.1, 0xf5c542, -g / 2 + 0.15 + (i - 1) * 0.15, tepe + 0.08, -h / 2 + 0.15);
    const rozet = durum.hasarli ? 0xe0443a : durum.isi === 'yukselt' ? 0xf39c12 : durum.isi === 'onar' ? 0x3fc1e0 : null;
    if (rozet) ekle(new THREE.SphereGeometry(0.12, 8, 6), rozet, g / 2 - 0.2, tepe + 0.2, h / 2 - 0.2);
  }
  grup.userData.tepe = tepe;
  return grup;
}

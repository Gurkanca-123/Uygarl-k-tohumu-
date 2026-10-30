// Izgara geometrisi ve genel yerleşim denetimi (TASARIM §3.2, §3.3). Saf; DOM/Three.js bilmez.
// Hem oyun durumu (yerlestir.js) hem ham zemin (harita.js garanti denetimi) aynı `yerDenetle` ile denetlenir.
import { BINALAR } from '../data/binalar.js';
import { KAROLAR } from '../data/karolar.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const KARO = Object.fromEntries(KAROLAR.map((k) => [k.id, k]));

export const icinde = (n, x, y) => x >= 0 && y >= 0 && x < n && y < n;

// (x, y, g, h) dikdörtgeninin dışında kenar paylaşan (4 yön) hücreler; harita dışı atılır.
export function kenarHucreleri(x, y, g, h, n) {
  const c = [];
  for (let i = 0; i < g; i++) c.push([x + i, y - 1], [x + i, y + h]);
  for (let j = 0; j < h; j++) c.push([x - 1, y + j], [x + g, y + j]);
  return c.filter(([a, b]) => icinde(n, a, b));
}

// Binanın kapladığı hücreler.
export function binaHucreleri(b) {
  const [g, h] = BINA[b.id].boyut;
  const c = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < g; dx++) c.push([b.x + dx, b.y + dy]);
  return c;
}

// Hücre → bina uid (ya da null). n × n dizi.
export function izgara(d) {
  const n = d.harita.boyut;
  const hucre = new Array(n * n).fill(null);
  for (const b of d.binalar) {
    // Evrim sürerken hedefin (daha büyük olabilir) alanı baştan ayrılır; inşaat bitince alan çakışması olamaz.
    const hedef = d.istatistik?.evrim?.[b.uid]?.hedef;
    const kapsam = hedef && BINA[hedef] ? { ...b, id: hedef } : b;
    for (const [x, y] of binaHucreleri(kapsam)) if (icinde(n, x, y)) hucre[y * n + x] = b.uid;
  }
  return hucre;
}

// Binanın dışında, kenar paylaşan (4 yön) karolar.
export function kenarKomsulari(d, b) {
  const [g, h] = BINA[b.id].boyut;
  return kenarHucreleri(b.x, b.y, g, h, d.harita.boyut);
}

// Binanın dışında, Chebyshev uzaklığı 1..m olan karolar (Sulanan Tarla "2 karo içinde su").
export function mesafeHucreleri(d, b, m) {
  const [g, h] = BINA[b.id].boyut;
  const n = d.harita.boyut;
  const c = [];
  for (let y = b.y - m; y < b.y + h + m; y++) for (let x = b.x - m; x < b.x + g + m; x++) {
    const ic = x >= b.x && x < b.x + g && y >= b.y && y < b.y + h;
    if (!ic && icinde(n, x, y)) c.push([x, y]);
  }
  return c;
}

// İki dikdörtgen bina arasındaki Chebyshev uzaklığı (en yakın karolar arası).
export function binaUzakligi(a, b) {
  const [ag, ah] = BINA[a.id].boyut, [bg, bh] = BINA[b.id].boyut;
  const dx = Math.max(0, a.x - (b.x + bg - 1), b.x - (a.x + ag - 1));
  const dy = Math.max(0, a.y - (b.y + bh - 1), b.y - (a.y + ah - 1));
  return Math.max(dx, dy);
}

// Genel yerleşim denetimi. baglam: { n, karo(x,y) → karo id | null (null = sis / görünmez), dolu(x,y) → bool,
// sinir(x,y) → bool }. Dönüş: Türkçe hata ya da null. Denetim sırası (her kategori tüm karolarda): harita dışı → sis →
// yerleşim sınırı → dolu → karo türü → karoUstu → karoBitisik.
export function yerDenetle(baglam, binaId, x, y) {
  const t = BINA[binaId];
  if (!t) return 'Böyle bir bina yok.';
  if (!Number.isInteger(x) || !Number.isInteger(y)) return 'Geçersiz konum.';
  const [g, h] = t.boyut;
  const { n } = baglam;
  if (x < 0 || y < 0 || x + g > n || y + h > n) return 'Konum harita dışında.';
  const hucreler = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < g; dx++) hucreler.push([x + dx, y + dy]);
  if (hucreler.some(([a, b]) => baglam.karo(a, b) === null)) return 'Bu karolar keşfedilmemiş (sis).';
  if (hucreler.some(([a, b]) => !baglam.sinir(a, b))) return 'Konum yerleşim sınırının dışında.';
  if (hucreler.some(([a, b]) => baglam.dolu(a, b))) return 'Bu karolar dolu.';
  let ustte = false;
  for (const [a, b] of hucreler) {
    const karo = KARO[baglam.karo(a, b)];
    const ozel = karo.yalnizBina || [];
    if (!karo.insaEdilir && !ozel.includes(binaId)) {
      return karo.yalnizBina ? `${karo.ad} yalnız ilgili ocak için.` : `${karo.ad} üstüne inşa edilemez.`;
    }
    if (t.gereksinim.karoUstu && karo.id === t.gereksinim.karoUstu) ustte = true;
  }
  if (t.gereksinim.karoUstu && !ustte) return `${t.ad} en az bir ${KARO[t.gereksinim.karoUstu].ad} karosunun üstüne kurulmalı.`;
  if (t.gereksinim.karoBitisik) {
    const hedef = t.gereksinim.karoBitisik;
    if (!kenarHucreleri(x, y, g, h, n).some(([a, b]) => baglam.karo(a, b) === hedef)) {
      return `${t.ad} bir ${KARO[hedef].ad} karosuna bitişik olmalı.`;
    }
  }
  return null;
}

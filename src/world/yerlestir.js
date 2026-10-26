// Bina yerleştirme (TASARIM §3.2): boyut (1×1/2×2/3×3), harita sınırı, sis, yerleşim sınırı, çakışma, karo şartı
// (insaEdilir / yalnizBina / karoUstu / karoBitisik). Saf; DOM/Three.js bilmez. Komutlar (insaEt, ormanTemizle, yolYap) core/insa.js'de.
import { BINALAR } from '../data/binalar.js';
import { izgara, yerDenetle, kenarKomsulari, icinde } from './izgara.js';
import { gorunurKaro } from './kesif.js';
import { sinirIcinde, merkezNokta, sinirYaricapi } from './harita.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));

// Oyun durumu için yerleşim bağlamı (bkz. izgara.js yerDenetle). `hucre` önceden hesaplanmış izgara olabilir.
export function yerBaglami(d, hucre = izgara(d)) {
  const n = d.harita.boyut;
  return {
    n,
    karo: (x, y) => gorunurKaro(d, x, y),
    dolu: (x, y) => !!hucre[y * n + x],
    sinir: (x, y) => sinirIcinde(d, x, y),
  };
}

// Dönüş: Türkçe hata ya da null.
export function yerUygunMu(d, binaId, x, y, baglam = yerBaglami(d)) {
  return yerDenetle(baglam, binaId, x, y);
}

// Sınır içindeki tüm geçerli yerler [[x, y]], merkeze uzaklığa göre sıralı (arayüz ve bot için).
export function uygunYerler(d, binaId) {
  const t = BINA[binaId];
  if (!t) return [];
  const n = d.harita.boyut;
  const m = merkezNokta(d);
  const r = sinirYaricapi(d);
  const baglam = yerBaglami(d);
  const [g, h] = t.boyut;
  const yerler = [];
  for (let y = Math.max(0, Math.floor(m.y - r - 1)); y <= Math.min(n - h, Math.ceil(m.y + r)); y++) {
    for (let x = Math.max(0, Math.floor(m.x - r - 1)); x <= Math.min(n - g, Math.ceil(m.x + r)); x++) {
      if (!yerDenetle(baglam, binaId, x, y)) yerler.push([x, y, Math.hypot(x + g / 2 - m.x, y + h / 2 - m.y)]);
    }
  }
  yerler.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
  return yerler.map(([x, y]) => [x, y]);
}

// Bina yerleşim sınırının kenarında mı (bir kenar komşusu sınır dışında)? Sur Parçası `savunmaKenar`.
export function sinirKenarinda(d, b) {
  const n = d.harita.boyut;
  const [g, h] = BINA[b.id].boyut;
  const komsu = kenarKomsulari(d, b);
  if (komsu.length < 2 * (g + h)) return true; // harita kenarı
  return komsu.some(([x, y]) => !icinde(n, x, y) || !sinirIcinde(d, x, y));
}

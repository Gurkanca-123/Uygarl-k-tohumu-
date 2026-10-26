// Test yardımcıları: elle durum kurma (bina ekleme, karo koyma, kaynak/atama ayarı).
import { yeniOyun } from '../../src/core/oyun_durumu.js';
import { KAROLAR } from '../../src/data/karolar.js';

export const KOD = Object.fromEntries(KAROLAR.map((k) => [k.id, k.kod]));

// Değişiklikleri yeni oyun üstüne uygular (sığ birleştirme; kaynaklar/atama tamamen değiştirilir).
export function durum(degisiklik = {}, tohum = 1) {
  return { ...yeniOyun(tohum), ...structuredClone(degisiklik) };
}

// Kurulu (ya da `insaKalan` > 0 ise inşaattaki) bina ekler. Dönüş: yeni durum.
export function binaEkle(d, id, x, y, { uid, seviye = 1, insaKalan = 0, hasarli = false } = {}) {
  const yeni = structuredClone(d);
  const u = uid || `t${yeni.binalar.length + 1}`;
  yeni.binalar.push({ uid: u, id, x, y, seviye, insaKalan, hasarli });
  if (insaKalan > 0) yeni.insaatSirasi.push(u);
  return yeni;
}

export function karoKoy(d, x, y, karoId) {
  const yeni = structuredClone(d);
  const n = yeni.harita.boyut;
  const k = [...yeni.harita.karolar];
  k[y * n + x] = KOD[karoId];
  yeni.harita.karolar = k.join('');
  return yeni;
}

export const yuvarla = (x, b = 6) => Math.round(x * 10 ** b) / 10 ** b;

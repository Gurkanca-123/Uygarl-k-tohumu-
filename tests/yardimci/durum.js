// Test yardımcıları: durum kurma (bina ekleme, karo koyma, kaynak/atama ayarı).
//
// Aşama 3: harita gerçek (tohumlu 64×64). Formül testleri için `durum()` varsayılan olarak "düz test zemini" kurar:
// merkez çevresinde DUZ_YARICAP içindeki karolar kalıcı değişimle (oyunun kendi mekanizması: harita.degisim) çimen yapılır ve
// açılır. Böylece eski 16×16 koordinatlı formül testleri `K + x` kaydırmasıyla aynı kalır. Harita/yerleştirme/keşif testleri
// `durum({}, tohum, { duz: false })` ya da doğrudan `yeniOyun` ile GERÇEK haritayı kullanır.
import { yeniOyun } from '../../src/core/oyun_durumu.js';
import { KAROLAR } from '../../src/data/karolar.js';
import { HARITA_BOYUT } from '../../src/data/denge.js';
import { merkezKonumu, karoDegistir, karoAt } from '../../src/world/harita.js';
import { kesifUygula } from '../../src/world/kesif.js';

export const KOD = Object.fromEntries(KAROLAR.map((k) => [k.id, k.kod]));
// Eski 16×16 testlerindeki Kamp Ateşi (7,7) → yeni merkez. Eski (x, y) = yeni (K + x, K + y).
export const K = merkezKonumu(HARITA_BOYUT).x - 7;
export const DUZ_YARICAP = 12;

export function duzle(d0, yaricap = DUZ_YARICAP) {
  const d = structuredClone(d0);
  const c = HARITA_BOYUT / 2;
  for (let y = 0; y < HARITA_BOYUT; y++) for (let x = 0; x < HARITA_BOYUT; x++) {
    if (Math.hypot(x + 0.5 - c, y + 0.5 - c) <= yaricap && karoAt(d, x, y) !== 'cimen') karoDegistir(d, x, y, 'cimen');
  }
  kesifUygula(d, { x: c, y: c }, yaricap + 2);
  return d;
}

const DUZ_ONBELLEK = new Map();
function taban(tohum, duz) {
  if (!duz) return yeniOyun(tohum);
  if (!DUZ_ONBELLEK.has(tohum)) DUZ_ONBELLEK.set(tohum, duzle(yeniOyun(tohum)));
  return structuredClone(DUZ_ONBELLEK.get(tohum));
}

// Değişiklikleri yeni oyun üstüne uygular (sığ birleştirme; kaynaklar/atama tamamen değiştirilir).
export function durum(degisiklik = {}, tohum = 1, { duz = true } = {}) {
  return { ...taban(tohum, duz), ...structuredClone(degisiklik) };
}

// Kurulu (ya da `insaKalan` > 0 ise inşaattaki) bina ekler. Dönüş: yeni durum.
export function binaEkle(d, id, x, y, { uid, seviye = 1, insaKalan = 0, hasarli = false } = {}) {
  const yeni = structuredClone(d);
  const u = uid || `t${yeni.binalar.length + 1}`;
  yeni.binalar.push({ uid: u, id, x, y, seviye, insaKalan, hasarli });
  if (insaKalan > 0) yeni.insaatSirasi.push(u);
  return yeni;
}

// Kalıcı değişimle karo koyar (ve açar).
export function karoKoy(d, x, y, karoId) {
  const yeni = structuredClone(d);
  karoDegistir(yeni, x, y, karoId);
  kesifUygula(yeni, { x: x + 0.5, y: y + 0.5 }, 0.5);
  return yeni;
}

export const yuvarla = (x, b = 6) => Math.round(x * 10 ** b) / 10 ** b;

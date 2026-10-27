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

// ---------- Çağ başlangıç durumları (TEHDIT.md §9 ölçümü; ölüm sarmalı testleri) ----------
// Her çağın "yeni girilmiş" tipik köyü: önceki çağ geçiş nüfusu, yetecek konut, yiyecek üreticileri, önceki çağların buluşları,
// orta düzey stok, otomatik iş dağıtımı açık, tehdit nefesi (çağ atlama sonrası) 8 tur. Binalar düz zeminde ızgaraya dizilir.
const CAG_KOY = {
  gocebe: { nufus: 3, binalar: [], kaynak: {}, buluslar: [] },
  tasdevri: { nufus: 8, binalar: [['cadir', 3], ['totem', 1], ['toplayici_barinagi', 1], ['oduncu_kampi', 1], ['kurutma_rafi', 1]],
    kaynak: { yiyecek: 25, odun: 15, tas: 8, deri: 4, alet: 0 },
    buluslar: ['mizrak_ucu', 'tas_yontma', 'hayvan_izleri', 'deri_isleme', 'yerlesik_hayat'] },
  bronz: { nufus: 20, binalar: [['kulube', 5], ['totem', 1], ['toplayici_barinagi', 2], ['tahil_bahcesi', 2], ['oduncu_kampi', 1],
    ['tas_ocagi', 1], ['erzak_cukuru', 1], ['nobet_citi', 1]],
    kaynak: { yiyecek: 50, odun: 30, tas: 20, deri: 8, alet: 6, kil: 0, cevher: 0, metal: 0 },
    buluslar: ['tohum_ekme', 'balikcilik', 'evcilestirme', 'comlekcilik', 'maden_eritme'] },
  antik: { nufus: 45, binalar: [['kerpic_ev', 9], ['mabet', 1], ['pazar_yeri', 1], ['sulanan_tarla', 3], ['tahil_bahcesi', 3],
    ['ambar', 1], ['oduncu_kampi', 2], ['tas_ocagi', 1], ['muhafiz_kulesi', 1], ['kuyu', 1]],
    kaynak: { yiyecek: 100, odun: 60, tas: 50, deri: 15, alet: 15, kil: 30, cevher: 10, metal: 15, mermer: 0, sikke: 0 },
    buluslar: ['takas', 'sulama', 'tunc_dokum', 'demir_isleme', 'yazi'] },
  ortacag: { nufus: 90, binalar: [['tas_ev', 15], ['kutuphane', 1], ['tiyatro', 1], ['bag_bahce', 3], ['sulanan_tarla', 6],
    ['tahil_bahcesi', 3], ['ambar', 2], ['oduncu_kampi', 2], ['tas_ocagi', 1], ['muhafiz_kulesi', 1], ['kisla', 1], ['mabet', 1],
    ['pazar_yeri', 1], ['darphane', 1]],
    kaynak: { yiyecek: 180, odun: 100, tas: 80, deri: 20, alet: 25, kil: 40, cevher: 15, metal: 30, mermer: 20, sikke: 40,
      kumas: 0, kitap: 0 },
    buluslar: ['para', 'felsefe', 'denizcilik', 'muhendislik', 'feodal_duzen'] },
};
export const CAG_SIRASI = ['gocebe', 'tasdevri', 'bronz', 'antik', 'ortacag'];

export function cagBaslangic(cagId, tohum = 1, { tur = 40, nefes = 8 } = {}) {
  const sira = CAG_SIRASI.indexOf(cagId);
  let d = durum({}, tohum);
  const M = { gocebe: 'kamp_atesi', tasdevri: 'ocak_meydani', bronz: 'koy_meydani', antik: 'agora', ortacag: 'sehir_meydani' };
  d.binalar = d.binalar.filter((b) => b.id === 'kamp_atesi').map((b) => ({ ...b, id: M[cagId] }));
  const k = CAG_KOY[cagId];
  const c = HARITA_BOYUT / 2;
  const yuvalar = [];
  for (let y = -10; y <= 8; y += 3) for (let x = -10; x <= 8; x += 3) if (Math.max(Math.abs(x + 0.5), Math.abs(y + 0.5)) > 3) yuvalar.push([x, y]);
  yuvalar.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  let i = 0;
  if (cagId === 'gocebe') d = binaEkle(d, 'cadir', c + 1, c - 1, { uid: 'b2' });
  for (const [id, n] of k.binalar) for (let j = 0; j < n; j++) {
    const [x, y] = yuvalar[i++];
    d = binaEkle(d, id, c + x, c + y, { uid: `f${i}` });
  }
  const buluslar = CAG_SIRASI.slice(0, sira + 1).flatMap((cg) => CAG_KOY[cg].buluslar);
  const kaynaklar = cagId === 'gocebe' ? d.kaynaklar : { ...k.kaynak };
  return { ...d, cag: cagId, tur: cagId === 'gocebe' ? 0 : tur, cagBaslangicTuru: cagId === 'gocebe' ? 0 : tur, nufus: k.nufus,
    buluslar, kaynaklar, atama: {}, isDagitim: { oto: true, oncelik: 'dengeli' },
    tehdit: { ...d.tehdit, gerginlik: cagId === 'gocebe' ? d.tehdit.gerginlik : 50, nefesKalan: cagId === 'gocebe' ? 0 : nefes } };
}

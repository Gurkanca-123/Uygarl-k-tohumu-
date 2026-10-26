import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hamUretimHesapla, hesaplaBitisiklik, huzurCarpani, mevsimCarpani, adimHamUretim, adimDonusum, adimDepoKirp,
} from '../src/core/uretim.js';
import { depoTavani } from '../src/core/yardimci.js';
import { durum, binaEkle, karoKoy, yuvarla } from './yardimci/durum.js';

const y = (d) => yuvarla(hamUretimHesapla(d).toplam.yiyecek || 0);

test('§2.4 serbest işler: 3 Toplayıcı baharda 6 yiyecek', () => {
  assert.equal(y(durum()), 6);
});

test('mevsim çarpanı: toplama yaz ×1,25, kış ×0,5; etiketsiz 1', () => {
  assert.equal(y(durum({ tur: 5 })), 7.5);
  assert.equal(y(durum({ tur: 15 })), 3);
  const d = durum({ tur: 15 });
  assert.equal(mevsimCarpani(d, 'tarim'), 0);
  assert.equal(mevsimCarpani({ ...d, buluslar: ['uclu_ekim'] }, 'tarim'), 0.3);
  assert.equal(mevsimCarpani(d, null), 1);
});

test('huzur çarpanı eşikleri', () => {
  assert.deepEqual([huzurCarpani(70), huzurCarpani(69), huzurCarpani(30), huzurCarpani(29), huzurCarpani(15), huzurCarpani(14)],
    [1.10, 1.00, 1.00, 0.85, 0.85, 0.70]);
  assert.equal(y(durum({ huzur: 75 })), 6.6);
  assert.equal(y(durum({ huzur: 10 })), 4.2);
});

test('buluş çarpanları: Mızrak Ucu avcılık ×1,25, Deri İşleme deri ×1,25; Taş Yontma Taşçı 1,5', () => {
  const d = durum({ atama: { 'serbest:avci': 2, 'serbest:tasci': 1 }, buluslar: ['mizrak_ucu', 'deri_isleme', 'tas_yontma'] });
  const u = hamUretimHesapla(d).toplam;
  assert.equal(yuvarla(u.yiyecek), 2.5);
  assert.equal(yuvarla(u.deri), yuvarla(2 * 0.5 * 1.25 * 1.25));
  assert.equal(u.tas, 1.5);
});

test('kemer sıkma: açlıkta serbest işler +%50', () => {
  assert.equal(y(durum({ acTur: 1 })), 9);
});

test('bitişiklik: Avcı Kulübesi orman başına +0,25, en çok 2', () => {
  let d = binaEkle(durum({ atama: { k: 2 } }), 'avci_kulubesi', 5, 5, { uid: 'k' });
  assert.equal(y(d), 3); // 2 × 1,5
  d = karoKoy(d, 4, 5, 'orman');
  assert.equal(hesaplaBitisiklik(d).k.uretim, 0.25);
  assert.equal(y(d), 3.75);
  d = karoKoy(karoKoy(d, 5, 4, 'orman'), 6, 5, 'orman');
  assert.equal(hesaplaBitisiklik(d).k.uretim, 0.5);
  // çapraz sayılmaz
  const c = karoKoy(binaEkle(durum(), 'avci_kulubesi', 5, 5, { uid: 'k' }), 4, 4, 'orman');
  assert.equal(hesaplaBitisiklik(c).k.uretim, 0);
});

test('bitişiklik: bina kaplamayan karo sayılır, dizi hedef (orman/su) ortak sınır', () => {
  let d = binaEkle(durum(), 'toplayici_barinagi', 5, 5, { uid: 'k' });
  d = karoKoy(karoKoy(karoKoy(d, 4, 5, 'orman'), 6, 5, 'su'), 5, 6, 'su');
  assert.equal(hesaplaBitisiklik(d).k.uretim, 0.5);
});

test('etki alanı üst üste binmez; farklı türler toplanır; değirmen işçisiz kapalı', () => {
  let d = durum({ cag: 'ortacag', atama: {} });
  d = binaEkle(d, 'tahil_bahcesi', 2, 2, { uid: 'tb' });
  d = binaEkle(d, 'su_kemeri', 5, 2, { uid: 's1' });
  d = binaEkle(d, 'su_kemeri', 2, 5, { uid: 's2' });
  assert.equal(yuvarla(hesaplaBitisiklik(d).tb.alan), 0.2);
  d = binaEkle(d, 'degirmen', 5, 5, { uid: 'dg' });
  assert.equal(yuvarla(hesaplaBitisiklik(d).tb.alan), 0.2);
  d = { ...d, atama: { dg: 1 } };
  assert.equal(yuvarla(hesaplaBitisiklik(d).tb.alan), 0.45);
});

test('atölye gürültüsü: konuta bitişik atölye Bronz+ −2 huzur', () => {
  let d = binaEkle(durum({ cag: 'tasdevri' }), 'alet_yapimcisi', 10, 7, { uid: 'a' });
  assert.equal(hesaplaBitisiklik(d).toplamHuzur, 0);
  d = { ...d, cag: 'bronz' };
  assert.equal(hesaplaBitisiklik(d).toplamHuzur, -2); // Çadır (9,7) bitişik
});

test('inşaattaki ve hasarlı bina üretmez', () => {
  const a = binaEkle(durum({ atama: { k: 2 } }), 'oduncu_kampi', 5, 5, { uid: 'k', insaKalan: 1 });
  assert.equal(hamUretimHesapla(a).toplam.odun || 0, 0);
  const b = binaEkle(durum({ atama: { k: 2 } }), 'oduncu_kampi', 5, 5, { uid: 'k', hasarli: true });
  assert.equal(hamUretimHesapla(b).toplam.odun || 0, 0);
  const c = binaEkle(durum({ atama: { k: 2 } }), 'oduncu_kampi', 5, 5, { uid: 'k' });
  assert.equal(hamUretimHesapla(c).toplam.odun, 4);
});

test('değiştirici: Erken Don toplama ×0,7 serbest işe de uygulanır; yaralı işçi üretmez', () => {
  const d = durum({ degistiriciler: [{ id: 'erken_don', kalan: 5, etki: { uretim: { etiket: 'toplama', carpan: 0.7 } } }] });
  assert.equal(y(d), 4.2);
  const yr = durum({ degistiriciler: [{ id: 'yarali', kalan: 3, etki: { yaraliIsci: 1 } }] });
  assert.equal(y(yr), 4);
});

test('adım d: ham üretim depoya eklenir, kırpma f adımında', () => {
  const d = adimHamUretim(durum({ kaynaklar: { yiyecek: 28, odun: 0, tas: 0, deri: 0 } }));
  assert.equal(d.kaynaklar.yiyecek, 34);
  const f = adimDepoKirp(d, []);
  assert.equal(f.kaynaklar.yiyecek, 30);
  assert.equal(f.istatistik.sonTur.kirpilan.yiyecek, 4);
});

test('adım f: depo tavanı çağdan + depo binalarından; uyarı verilir', () => {
  let d = durum({ kaynaklar: { yiyecek: 60, odun: 31, tas: 0, deri: 0 } });
  d = binaEkle(d, 'kurutma_rafi', 5, 5);
  assert.equal(depoTavani(d, 'yiyecek'), 50);
  const b = [];
  const f = adimDepoKirp(d, b);
  assert.equal(f.kaynaklar.yiyecek, 50);
  assert.equal(f.kaynaklar.odun, 30);
  assert.equal(b[0].kod, 'depo_dolu');
});

test('adım e: dönüşüm girdisi yetmeyen işçi üretmez (kısmi çalışma)', () => {
  let d = durum({ cag: 'tasdevri', kaynaklar: { yiyecek: 10, odun: 5, tas: 1.5, deri: 0, alet: 0 }, atama: { a: 2 } });
  d = binaEkle(d, 'alet_yapimcisi', 5, 5, { uid: 'a' });
  const b = [];
  const e = adimDonusum(d, b);
  assert.equal(e.kaynaklar.alet, 0.5);
  assert.equal(e.kaynaklar.tas, 0.5);
  assert.equal(e.kaynaklar.odun, 4.5);
  assert.equal(b[0].kod, 'girdi_eksik');
  // Sv2: girdi ve çıktı ×1,5
  const s2 = adimDonusum({ ...d, kaynaklar: { ...d.kaynaklar, tas: 10 }, binalar: d.binalar.map((x) => (x.uid === 'a' ? { ...x, seviye: 2 } : x)) });
  assert.equal(s2.kaynaklar.tas, 10 - 3);
  assert.equal(s2.kaynaklar.alet, 1.5);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { adimOlay, olayCoz, kosulSaglanir, olayAgirligi, uygunOlaylar } from '../src/core/olay.js';
import { savunmaHesapla, saldiriGucu, hastalikCarpani } from '../src/core/savunma.js';
import { OLAY } from '../src/core/yardimci.js';
import { ILK_OLAY_TUR } from '../src/data/denge.js';
import { rngBaslat } from '../src/core/rng.js';
import { durum, binaEkle } from './yardimci/durum.js';

const aktifOlay = (id, ek = {}) => durum({ olay: { aktif: { id }, bekleme: {}, zincir: [], kurtarmaKullanildi: {} }, ...ek });

test(`ILK_OLAY_TUR (${ILK_OLAY_TUR}): gün 1–5 olaysız; ilk olay en erken 6. günde (tur 5) gösterilir`, () => {
  const ac = { acTur: 2 };
  for (let tur = 0; tur <= 3; tur++) assert.equal(adimOlay(durum({ ...ac, tur })).olay.aktif, null, `tur ${tur}`);
  const d = adimOlay(durum({ ...ac, tur: 4 }));
  assert.deepEqual(d.olay.aktif, { id: 'komsu_yardimi' });
  // rastgele olaylar da gün 1–5'te çıkmaz (her tohumda)
  for (let t = 0; t < 100; t++) for (let tur = 0; tur < 4; tur++) assert.equal(adimOlay(durum({ tur, rng: rngBaslat(t) })).olay.aktif, null);
});

test('kurtarma olayı: acTur ≥ 2 iken önceliklidir, çağ başına bir kez; sonraki çağda yeniden', () => {
  const d = adimOlay(durum({ tur: 10, acTur: 2, kaynaklar: { yiyecek: 0 } }));
  assert.equal(d.olay.aktif.id, 'komsu_yardimi');
  assert.equal(d.olay.kurtarmaKullanildi.gocebe, true);
  const r = olayCoz(d, 0);
  assert.equal(r.durum.kaynaklar.yiyecek, 15);
  assert.equal(r.durum.olay.aktif, null);
  const tekrar = adimOlay({ ...r.durum, tur: 40, rng: rngBaslat(1) });
  assert.notEqual(tekrar.olay.aktif?.id, 'komsu_yardimi');
  const tas = adimOlay({ ...r.durum, cag: 'tasdevri', tur: 40, kaynaklar: { yiyecek: 0 } });
  assert.equal(tas.olay.aktif.id, 'komsu_yardimi');
  assert.equal(olayCoz(tas, 0).durum.kaynaklar.yiyecek, 30); // 15 × (1 + çağSırası)
});

test('zincir olayı vadesi gelince kesin gelir', () => {
  const d = durum({ tur: 9, olay: { aktif: null, bekleme: {}, zincir: [{ olay: 'yabanci_aile', tur: 12 }], kurtarmaKullanildi: {} } });
  assert.notEqual(adimOlay(d).olay.aktif?.id, 'yabanci_aile');
  const v = adimOlay({ ...d, tur: 11 });
  assert.equal(v.olay.aktif.id, 'yabanci_aile');
  assert.deepEqual(v.olay.zincir, []);
});

test('rastgele olaylar: çağ olasılığıyla, yalnız kendi çağının rastgele havuzundan, bekleme ile', () => {
  let cikan = 0;
  for (let t = 0; t < 800; t++) {
    const d = adimOlay(durum({ tur: 12, rng: rngBaslat(t) }));
    if (!d.olay.aktif) continue;
    cikan++;
    const o = OLAY[d.olay.aktif.id];
    assert.equal(o.tetik, 'rastgele');
    assert.ok(o.cag.includes('gocebe'));
    assert.equal(d.olay.bekleme[o.id], 13 + o.bekleme);
  }
  assert.ok(cikan > 140 && cikan < 260, `çıkan ${cikan}`);
  const bekleyen = durum({ tur: 12, olay: { aktif: null, bekleme: { bereketli_calilik: 20 }, zincir: [], kurtarmaKullanildi: {} } });
  const zaman = { gun: 14, mevsim: 'guz' };
  assert.ok(!uygunOlaylar(bekleyen, 'rastgele', zaman).some((o) => o.id === 'bereketli_calilik'));
});

test('koşul denetimi: turMin (gün), mevsim, kaynak, bina, buluş, işçi türü', () => {
  const d = durum();
  assert.equal(kosulSaglanir(d, { turMin: 8 }, { gun: 7, mevsim: 'yaz' }), false);
  assert.equal(kosulSaglanir(d, { turMin: 8 }, { gun: 8, mevsim: 'yaz' }), true);
  assert.equal(kosulSaglanir(d, { mevsim: ['guz'] }, { gun: 8, mevsim: 'yaz' }), false);
  assert.equal(kosulSaglanir(d, { kaynakMin: { yiyecek: 10 } }), true);
  assert.equal(kosulSaglanir(d, { kaynakMin: { yiyecek: 11 } }), false);
  assert.equal(kosulSaglanir(d, { binaVar: ['totem'] }), false);
  assert.equal(kosulSaglanir(binaEkle(d, 'totem', 5, 5), { binaVar: ['totem'] }), true);
  assert.equal(kosulSaglanir(d, { bulusVar: ['mizrak_ucu'] }), false);
  const k = binaEkle(durum({ cag: 'antik', nufus: 5, atama: { k: 2 } }), 'kisla', 4, 4, { uid: 'k' });
  assert.equal(kosulSaglanir(k, { isciTuruMin: { asker: 2 } }), true);
  assert.equal(kosulSaglanir({ ...k, atama: { k: 1 } }, { isciTuruMin: { asker: 2 } }), false);
});

test('ağırlık: sarmal koruması kötü olayları yarıya indirir; hastalık riski çarpanı', () => {
  const o = OLAY.firtina;
  assert.equal(olayAgirligi(durum(), o), 10);
  assert.equal(olayAgirligi(durum({ acTur: 1 }), o), 5);
  assert.equal(olayAgirligi(durum({ huzur: 29 }), o), 5);
  assert.equal(olayAgirligi(durum({ huzur: 29 }), OLAY.bereketli_calilik), 10);
  assert.equal(hastalikCarpani(durum()), 0.5);
  assert.equal(hastalikCarpani(durum({ nufus: 30 })), 2);
  assert.equal(hastalikCarpani(durum({ nufus: 30, istatistik: { sonTur: { isinmaEksik: true } } })), 4);
  assert.equal(olayAgirligi(durum({ nufus: 30 }), OLAY.oksuruk_salgini), 20 * 1);
});

test('olayCoz: geçersiz seçenek ve gereksinim reddedilir; eksi kaynak stoğun altına inmez', () => {
  assert.match(olayCoz(durum(), 0).hata, /Bekleyen olay yok/);
  const k = aktifOlay('kurt_surusu', { kaynaklar: { yiyecek: 3, odun: 5, tas: 0, deri: 0 } });
  assert.match(olayCoz(k, 5).hata, /seçenek yok/);
  const r = olayCoz(k, 2);
  assert.equal(r.durum.kaynaklar.yiyecek, 0);
  const m = aktifOlay('mamut_surusu', { cag: 'tasdevri', kaynaklar: { yiyecek: 0, odun: 0, tas: 0, deri: 0, alet: 1 } });
  assert.match(olayCoz(m, 0).hata, /gereksinim/);
  assert.equal(olayCoz(m, 1).durum.bilgiHavuz, 3);
});

test('olay sonuçları: göçmen, yaralı işçi, hasar, değiştirici', () => {
  const a = olayCoz(aktifOlay('yabanci_aile'), 0).durum;
  assert.equal(a.nufus, 5);
  assert.equal(a.atama['serbest:toplayici'], 5);
  assert.equal(a.kaynaklar.yiyecek, 6);
  const y = olayCoz(aktifOlay('oksuruk_salgini'), 0).durum;
  assert.deepEqual(y.degistiriciler, [{ id: 'yarali', kalan: 3, etki: { yaraliIsci: 2 } }]);
  const f = olayCoz(aktifOlay('firtina'), 1).durum;
  assert.equal(f.binalar.find((b) => b.id === 'cadir').hasarli, true);
  const e = olayCoz(aktifOlay('erken_don'), 1).durum;
  assert.equal(e.degistiriciler[0].id, 'erken_don');
});

test('§6.3 savunma testi: püskürtme / kısmi / yenilgi', () => {
  const k = aktifOlay('kurt_surusu', { tur: 10, kaynaklar: { yiyecek: 20, odun: 10, tas: 0, deri: 0 } });
  assert.equal(saldiriGucu(k), 4);
  assert.equal(savunmaHesapla(k), 1);
  const yen = olayCoz(k, 0).durum; // 1 < 2 → %25, 1 kişi, 1 bina hasarlı
  assert.equal(yen.kaynaklar.yiyecek, 15);
  assert.equal(yen.nufus, 2);
  assert.equal(yen.binalar.filter((b) => b.hasarli).length, 1);
  const kismi = olayCoz({ ...k, buluslar: ['mizrak_ucu'] }, 0).durum; // 2 ≥ 2
  assert.equal(kismi.kaynaklar.yiyecek, 18);
  assert.equal(kismi.nufus, 3);
  let g = binaEkle({ ...k, buluslar: ['mizrak_ucu'], atama: { g: 1, 'serbest:toplayici': 2 } }, 'gozcu_diregi', 5, 5, { uid: 'g' });
  assert.equal(savunmaHesapla(g), 5);
  g = olayCoz(g, 0).durum;
  assert.equal(g.huzur, 65);
  assert.equal(g.kaynaklar.yiyecek, 20);
});

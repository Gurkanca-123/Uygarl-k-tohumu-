import test from 'node:test';
import assert from 'node:assert/strict';
import { huzurHedefi, adimHuzur, huzurEkle } from '../src/core/huzur.js';
import { durum, binaEkle } from './yardimci/durum.js';

test('başlangıç hedefi 60 = 50 + Kamp Ateşi 5 + barınaklı 5', () => {
  const { hedef, parcalar } = huzurHedefi(durum());
  assert.equal(hedef, 60);
  assert.equal(parcalar.merkez, 5);
  assert.equal(parcalar.barinma, 5);
});

test('evsiz, açlık, ısınma, işsiz, kalabalık cezaları', () => {
  assert.equal(huzurHedefi(durum({ nufus: 5, atama: { 'serbest:toplayici': 5 } })).hedef, 50 + 5 - 10);
  assert.equal(huzurHedefi(durum({ istatistik: { sonTur: { aclik: true } } })).hedef, 45);
  assert.equal(huzurHedefi(durum({ istatistik: { sonTur: { isinmaEksik: true } } })).hedef, 50);
  assert.equal(huzurHedefi(durum({ atama: { 'serbest:toplayici': 1 } })).hedef, 56);
  const k = durum({ nufus: 12, atama: { 'serbest:toplayici': 12 } });
  assert.equal(huzurHedefi(k).parcalar.kalabalik, -2);
});

test('bina huzuru: aynı türden ikincisi %50; Sv2 ×1,5; hasarlı sayılmaz', () => {
  let d = binaEkle(durum({ cag: 'bronz' }), 'kuyu', 5, 5);
  d = binaEkle(d, 'kuyu', 5, 6);
  assert.equal(huzurHedefi(d).parcalar.binalar, 2 + 1);
  d = binaEkle(d, 'kuyu', 5, 4, { seviye: 2 });
  assert.equal(huzurHedefi(d).parcalar.binalar, 3 + 1 + 1);
  const h = binaEkle(durum(), 'totem', 5, 5, { hasarli: true });
  assert.equal(huzurHedefi(h).parcalar.binalar, 0);
});

test('vergi ve değiştirici huzuru hedefe eklenir', () => {
  assert.equal(huzurHedefi(durum({ vergi: 'yuksek' })).hedef, 50);
  assert.equal(huzurHedefi(durum({ degistiriciler: [{ id: 'x', kalan: 2, etki: { huzur: 4 } }] })).hedef, 64);
});

test('adım j: hedefe doğru en çok 5 puan kayar, 0–100 arasında', () => {
  const d = binaEkle(durum(), 'totem', 5, 5); // hedef 66
  assert.equal(adimHuzur(d).huzur, 65);
  assert.equal(adimHuzur({ ...d, huzur: 64 }).huzur, 66);
  assert.equal(adimHuzur(durum({ huzur: 90 })).huzur, 85);
  const x = durum({ huzur: 98 });
  huzurEkle(x, 10);
  assert.equal(x.huzur, 100);
});

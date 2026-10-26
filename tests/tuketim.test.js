import test from 'node:test';
import assert from 'node:assert/strict';
import { yiyecekIhtiyaci, isinmaIhtiyaci, adimTuketim, bozulmaOrani, adimBozulma } from '../src/core/tuketim.js';
import { durum, binaEkle, yuvarla } from './yardimci/durum.js';

test('yiyecek ihtiyacı: nüfus × 1; kemer sıkmada ×0,75', () => {
  assert.equal(yiyecekIhtiyaci(durum()), 3);
  assert.equal(yiyecekIhtiyaci(durum({ acTur: 1 })), 2.25);
});

test('adım g: yiyecek yetmezse stok 0, açlık bayrağı', () => {
  const b = [];
  const d = adimTuketim(durum({ kaynaklar: { yiyecek: 1, odun: 5, tas: 0, deri: 0 } }), b);
  assert.equal(d.kaynaklar.yiyecek, 0);
  assert.equal(d.istatistik.sonTur.aclik, true);
  assert.equal(b[0].kod, 'aclik');
  const tok = adimTuketim(durum());
  assert.equal(tok.kaynaklar.yiyecek, 7);
  assert.equal(tok.istatistik.sonTur.aclik, false);
});

test('ısınma yalnız kışta, kurulu konut başına; inşaattaki konut yakmaz', () => {
  let d = binaEkle(durum({ tur: 15 }), 'cadir', 5, 5);
  d = binaEkle(d, 'cadir', 5, 6, { insaKalan: 1 });
  assert.equal(isinmaIhtiyaci(d), 2);
  assert.equal(isinmaIhtiyaci({ ...d, tur: 14 }), 0);
  const g = adimTuketim(d);
  assert.equal(g.kaynaklar.odun, 3);
  const eksik = adimTuketim({ ...d, kaynaklar: { ...d.kaynaklar, odun: 1 } });
  assert.equal(eksik.kaynaklar.odun, 0);
  assert.equal(eksik.istatistik.sonTur.isinmaEksik, true);
});

test('§2.3 bozulma: %4, depo binası ve Çömlekçilik −1 puan, en az %1', () => {
  assert.equal(bozulmaOrani(durum()), 0.04);
  let d = binaEkle(durum(), 'kurutma_rafi', 5, 5);
  assert.equal(yuvarla(bozulmaOrani(d)), 0.03);
  d = { ...d, buluslar: ['comlekcilik'] };
  assert.equal(yuvarla(bozulmaOrani(d)), 0.02);
  d = binaEkle(binaEkle(d, 'kurutma_rafi', 5, 6), 'kurutma_rafi', 5, 7);
  assert.equal(yuvarla(bozulmaOrani(d)), 0.01);
  assert.equal(adimBozulma(durum({ kaynaklar: { yiyecek: 50 } })).kaynaklar.yiyecek, 48);
});

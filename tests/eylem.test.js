import test from 'node:test';
import assert from 'node:assert/strict';
import { onderEylemiSec, adimOnder, kesifIyiBonusu, eylemOlcegi } from '../src/core/eylem.js';
import { olasilikDagit } from '../src/core/sonuc.js';
import { EYLEM } from '../src/core/yardimci.js';
import { rngBaslat } from '../src/core/rng.js';
import { durum, binaEkle, yuvarla, K } from './yardimci/durum.js';

const sec = (d, id, secim) => {
  const r = onderEylemiSec(d, id, secim);
  assert.equal(r.hata, undefined, r.hata);
  return r.durum;
};

test('Avlan: +4 yiyecek +1 deri (başlangıç derisi 2 üstüne), yorgunluk +2; çağ sırasıyla ölçeklenir', () => {
  const d = adimOnder(sec(durum(), 'avlan'));
  assert.equal(d.kaynaklar.yiyecek, 14);
  assert.equal(d.kaynaklar.deri, 3);
  assert.equal(d.onder.yorgunluk, 2);
  assert.equal(d.onder.eylem, null);
  const t = adimOnder(sec(durum({ cag: 'tasdevri' }), 'avlan'));
  assert.equal(t.kaynaklar.yiyecek, 16);
  assert.equal(t.kaynaklar.deri, 3.5);
  assert.equal(eylemOlcegi(durum({ cag: 'ortacag' }), EYLEM.avlan), 3);
});

test('seçilmeyen tur Dinlen: yorgunluk −3 (0 altına inmez)', () => {
  const d = adimOnder(durum({ onder: { yorgunluk: 4, yaraliKalan: 0, eylem: null, secim: null } }));
  assert.equal(d.onder.yorgunluk, 1);
  assert.equal(adimOnder(durum()).onder.yorgunluk, 0);
});

test('yorgunluk 6 ya da yaralıyken yalnız Dinlen; açılmamış eylem seçilemez', () => {
  const yorgun = durum({ onder: { yorgunluk: 6, yaraliKalan: 0, eylem: null, secim: null } });
  assert.match(onderEylemiSec(yorgun, 'avlan').hata, /yorgun/);
  assert.equal(onderEylemiSec(yorgun, 'dinlen').hata, undefined);
  const yarali = durum({ onder: { yorgunluk: 0, yaraliKalan: 2, eylem: null, secim: null } });
  assert.match(onderEylemiSec(yarali, 'hikaye_anlat').hata, /yaralı/);
  assert.match(onderEylemiSec(durum(), 'alet_yap').hata, /açılmadı/);
  assert.match(onderEylemiSec(durum(), 'yok').hata, /eylem yok/);
});

test('Avlan %10 yaralanma: önder 2 tur yalnız Dinlen, sonra serbest', () => {
  let bulundu = null;
  for (let t = 0; t < 200 && !bulundu; t++) {
    const d = adimOnder(sec(durum({ rng: rngBaslat(t) }), 'avlan'));
    if (d.onder.yaraliKalan === 2) bulundu = d;
  }
  assert.ok(bulundu, 'yaralanan tohum bulunmalı');
  const zorla = { ...bulundu, onder: { ...bulundu.onder, eylem: 'avlan' } }; // seçim zorlanırsa çözümde Dinlen'e döner
  const b = [];
  const s1 = adimOnder(zorla, b);
  assert.equal(s1.kaynaklar.deri, bulundu.kaynaklar.deri);
  assert.equal(b[0].kod, 'eylem_iptal');
  assert.equal(s1.onder.yaraliKalan, 1);
  const s2 = adimOnder(s1);
  assert.equal(s2.onder.yaraliKalan, 0);
  assert.equal(onderEylemiSec(s2, 'avlan').hata, undefined);
});

test('Hikâye Anlat: +2 BP (havuza), +2 huzur anında', () => {
  const d = adimOnder(sec(durum(), 'hikaye_anlat'));
  assert.equal(d.bilgiHavuz, 2);
  assert.equal(d.huzur, 62);
  assert.equal(d.onder.yorgunluk, 1);
});

test('Alet Yap (Taş Devri): 2 taş + 1 odun → 1 alet, ölçekli (×1,5); kaynak yetmezse seçilemez', () => {
  const d0 = durum({ cag: 'tasdevri', kaynaklar: { yiyecek: 10, odun: 5, tas: 3, deri: 0, alet: 0 } });
  const d = adimOnder(sec(d0, 'alet_yap'));
  assert.deepEqual([d.kaynaklar.tas, d.kaynaklar.odun, d.kaynaklar.alet], [0, 3.5, 1.5]);
  assert.match(onderEylemiSec({ ...d0, kaynaklar: { ...d0.kaynaklar, tas: 2 } }, 'alet_yap').hata, /yetersiz/);
});

test('Keşfet iyi sonuç bonusu: iyi dilimler artar, diğerleri orantılı azalır; Hayvan İzleri + Gözcü Direği toplanır', () => {
  const liste = EYLEM.kesfet.sonuc.olasilik;
  const iyi = (l) => yuvarla(l.filter((o) => o.iyi).reduce((a, o) => a + o.p, 0));
  const top = (l) => yuvarla(l.reduce((a, o) => a + o.p, 0));
  assert.equal(iyi(olasilikDagit(liste, 0)), 0.65);
  assert.equal(iyi(olasilikDagit(liste, 0.1)), 0.75);
  assert.equal(top(olasilikDagit(liste, 0.1)), 1);
  let d = durum({ buluslar: ['hayvan_izleri'] });
  assert.equal(kesifIyiBonusu(d, 'kesfet'), 0.1);
  d = binaEkle(d, 'gozcu_diregi', K + 5, K + 5);
  assert.equal(yuvarla(kesifIyiBonusu(d, 'kesfet')), 0.2);
  assert.equal(kesifIyiBonusu(d, 'avlan'), 0);
});

test('Keşfet olay dilimi zincire girer (gecikme 0)', () => {
  let z = null;
  for (let t = 0; t < 300 && !z; t++) {
    const d = adimOnder(sec(durum({ rng: rngBaslat(t) }), 'kesfet'));
    if (d.olay.zincir.length) z = d;
  }
  assert.ok(z);
  assert.ok(['yabanci_aile', 'kurt_surusu'].includes(z.olay.zincir[0].olay));
  assert.equal(z.olay.zincir[0].tur, z.tur);
});

test('Kervan Gönder (Bronz, Pazar Yeri): 20 birim gider, 3 tur sonra 15 birim gelir', () => {
  let d = binaEkle(durum({ cag: 'bronz', tur: 10, kaynaklar: { yiyecek: 50, odun: 30, tas: 0, deri: 0, kil: 0 } }), 'pazar_yeri', K + 4, K + 4);
  assert.match(onderEylemiSec(d, 'kervan_gonder', null).hata, /kaynak seç/);
  d = adimOnder(sec(d, 'kervan_gonder', { ver: 'odun', al: 'kil' }));
  assert.equal(d.kaynaklar.odun, 10);
  assert.deepEqual(d.kervanlar, [{ kaynak: 'kil', miktar: 15, tur: 13 }]);
  d = adimOnder({ ...d, tur: 12 });
  assert.equal(d.kaynaklar.kil, 0);
  d = adimOnder({ ...d, tur: 13 });
  assert.equal(d.kaynaklar.kil, 15);
  assert.deepEqual(d.kervanlar, []);
});

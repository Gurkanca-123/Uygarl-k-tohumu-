// Çocuklar çalışmaz (kullanıcı kararı 2026-10-30): halk defteri, çalışma gücü, iş atama, kayıp sırası, kayıt uyumu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { adimNufus, isAta, kayipUygula } from '../src/core/nufus.js';
import { calismaGucu, cocukSayisi, issizSayisi, etkinAtama, atamaDuzelt, kisiEkle } from '../src/core/yardimci.js';
import { turIlerlet } from '../src/core/tur.js';
import { serialize, yukle } from '../src/save/kayit.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';
import { COCUK_SURE } from '../src/data/denge.js';
import { durum, binaEkle, K } from './yardimci/durum.js';

const dogumlu = () => {
  const temel = binaEkle(durum({ tur: 3, kaynaklar: { yiyecek: 20 } }), 'cadir', K + 5, K + 5);
  return adimNufus(temel); // 4. gün doğum: nüfus 4 (1 çocuk)
};

test('yeni oyun: başlangıç kişileri defterde ve yetişkin', () => {
  const d = yeniOyun(1);
  assert.equal(d.halk.length, d.nufus);
  assert.equal(cocukSayisi(d), 0);
  assert.equal(calismaGucu(d), d.nufus);
});

test('doğan çocuk COCUK_SURE tur çalışamaz, sonra çalışmaya başlar', () => {
  let d = dogumlu();
  assert.equal(d.nufus, 4);
  assert.equal(cocukSayisi(d), 1);
  assert.equal(calismaGucu(d), 3);
  assert.equal(issizSayisi(d), 0); // çocuk işsiz sayılmaz
  assert.match(isAta(d, 'serbest:oduncu', 4).hata, /çocuk çalışamaz/); // 4. kişi çocuk
  d = { ...d, tur: d.tur + COCUK_SURE - 1 };
  assert.equal(cocukSayisi(d), 1);
  d = { ...d, tur: d.tur + 1 };
  assert.equal(cocukSayisi(d), 0); // büyüdü
  assert.equal(calismaGucu(d), 4);
  assert.equal(issizSayisi(d), 1); // yeni işçi boşta
  assert.equal(isAta(d, 'serbest:oduncu', 1).hata, undefined);
});

test('çocuk üretime ve yaralı hesabına katılmaz; atama fazlası çalışma gücüne kırpılır', () => {
  const d = dogumlu();
  assert.deepEqual(etkinAtama(d), { 'serbest:toplayici': 3 });
  const fazla = { ...d, atama: { 'serbest:toplayici': 4 } };
  atamaDuzelt(fazla);
  assert.equal(fazla.atama['serbest:toplayici'], 3);
});

test('kayıp: önce çocuklar gider (iş gücü korunur); defter nüfustan büyük olmaz', () => {
  const d = structuredClone(dogumlu());
  d.huzur = 60;
  const bl = [];
  assert.equal(kayipUygula(d, 1, 'deneme', bl), 1);
  assert.equal(d.nufus, 3);
  assert.equal(cocukSayisi(d), 0);
  assert.equal(calismaGucu(d), 3);
  assert.ok(d.halk.length <= d.nufus);
});

test('göçmen yetişkindir: atanır, deftere yazılır, çocuk sayılmaz', () => {
  const d = structuredClone(durum());
  kisiEkle(d, 2);
  assert.equal(d.nufus, 5);
  assert.equal(cocukSayisi(d), 0);
  assert.equal(d.atama['serbest:toplayici'], 5);
  assert.equal(new Set(d.halk.map((h) => h.id)).size, d.halk.length);
});

test('tur akışı: çocuk yiyecek tüketir ama işsiz huzur cezası vermez', () => {
  const d = dogumlu();
  const t = turIlerlet({ ...d, kaynaklar: { ...d.kaynaklar, yiyecek: 20 } });
  assert.equal(t.hata, undefined);
  assert.ok(t.durum.istatistik.sonTur.tuketim.yiyecek >= 4 - 1e-9); // 4 kişi yer
});

test('kayıt: defter kaydedilip yüklenir; eski kayıt (halk yok) açılır ve herkes yetişkin sayılır', () => {
  const d = dogumlu();
  const y = yukle(serialize(d));
  assert.deepEqual(y.halk, d.halk);
  assert.equal(y.halkSayac, d.halkSayac);
  assert.equal(cocukSayisi(y), 1);
  const eski = JSON.parse(serialize(d));
  delete eski.halk; delete eski.halkSayac;
  const yy = yukle(JSON.stringify(eski));
  assert.equal(yy.nufus, d.nufus);
  assert.equal(cocukSayisi(yy), 0);
  assert.equal(calismaGucu(yy), yy.nufus);
  assert.ok(yy.halk.length <= yy.nufus);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adimAclik, adimNufus, kayipHakki, kayipSiniri, kayipUygula, dogumSartlari, dogumTuruMu, isAta, isOtoAta,
} from '../src/core/nufus.js';
import { etkinAtama, issizSayisi } from '../src/core/yardimci.js';
import { rngBaslat } from '../src/core/rng.js';
import { durum, binaEkle, K } from './yardimci/durum.js';

const sonTurlu = (d, st) => ({ ...d, istatistik: { sonTur: { ...st } } });

test('adım i: açlık sayacı; 3. turda ölüm adayı ve acTur = 1; doyunca 0', () => {
  let d = durum();
  d = adimAclik(sonTurlu(d, { aclik: true }));
  assert.equal(d.acTur, 1);
  d = adimAclik(sonTurlu(d, { aclik: true }));
  assert.equal(d.acTur, 2);
  d = adimAclik(sonTurlu(d, { aclik: true }));
  assert.equal(d.acTur, 1);
  assert.equal(d.istatistik.sonTur.olumAdayi, 1);
  d = adimAclik(sonTurlu(d, { aclik: false }));
  assert.equal(d.acTur, 0);
});

test('§7.3 kayıp kilidi: 3 turluk pencerede max(1, floor(nüfus × 0,05)); nüfus 2 tabanı', () => {
  assert.equal(kayipSiniri(durum({ nufus: 10 })), 1);
  assert.equal(kayipSiniri(durum({ nufus: 40 })), 2);
  const d = durum({ nufus: 40, tur: 10, atama: { 'serbest:toplayici': 40 } });
  assert.equal(kayipUygula(d, 5, 'test'), 2);
  assert.equal(d.nufus, 38);
  assert.equal(d.atama['serbest:toplayici'], 38);
  assert.equal(kayipHakki(d), 0);
  assert.equal(kayipHakki({ ...d, tur: 12 }), 0);
  assert.equal(kayipHakki({ ...d, tur: 13 }), 1); // floor(38 × 0,05) = 1
  const az = durum({ nufus: 2, atama: { 'serbest:toplayici': 2 } });
  assert.equal(kayipUygula(az, 1, 'test'), 0);
  assert.equal(az.nufus, 2);
});

test('kayıpta önce işsizler düşer, sonra serbest işler (Toplayıcı en son), sonra binalar', () => {
  const d = binaEkle(durum({ nufus: 30, atama: { 'serbest:toplayici': 10, 'serbest:tasci': 5, k: 2 } }), 'oduncu_kampi', K + 5, K + 5, { uid: 'k' });
  // 13 işsiz; kayıp işsizden düşer
  kayipUygula(d, 1, 'x');
  assert.deepEqual(d.atama, { 'serbest:toplayici': 10, 'serbest:tasci': 5, k: 2 });
  const tam = binaEkle(durum({ nufus: 4, atama: { 'serbest:toplayici': 1, 'serbest:tasci': 1, k: 2 } }), 'oduncu_kampi', K + 5, K + 5, { uid: 'k' });
  kayipUygula(tam, 1, 'x');
  assert.deepEqual(tam.atama, { 'serbest:toplayici': 1, k: 2 });
});

test('doğum: her 4 turda; boş barınak, yiyecek ≥ 2×nüfus, huzur ≥ 40, açlık yok', () => {
  const temel = binaEkle(durum({ tur: 3, kaynaklar: { yiyecek: 6 } }), 'cadir', K + 5, K + 5);
  assert.equal(dogumTuruMu(temel), true);
  assert.equal(dogumTuruMu({ ...temel, tur: 4 }), false);
  assert.equal(dogumSartlari(temel).uygun, true);
  const d = adimNufus(temel);
  assert.equal(d.nufus, 4);
  assert.equal(d.atama['serbest:toplayici'], 4);
  assert.equal(adimNufus({ ...temel, huzur: 39 }).nufus, 3);
  assert.equal(adimNufus({ ...temel, huzur: 40 }).nufus, 4);
  assert.equal(adimNufus({ ...temel, kaynaklar: { yiyecek: 5.9 } }).nufus, 3);
  assert.equal(adimNufus({ ...temel, acTur: 1 }).nufus, 3);
  assert.equal(adimNufus(durum({ tur: 3, kaynaklar: { yiyecek: 6 } })).nufus, 3); // barınak dolu
  assert.equal(adimNufus({ ...temel, tur: 2 }).nufus, 3);
});

test('doğan sayı = min(1 + floor(nüfus / 30), boş barınak)', () => {
  let d = durum({ tur: 3, nufus: 60, kaynaklar: { yiyecek: 200 }, huzur: 60 });
  for (let i = 0; i < 25; i++) d = binaEkle(d, 'kulube', K + 4 + (i % 8), K + 4 + Math.floor(i / 8) * 4 % 8);
  assert.equal(dogumSartlari(d).adet, 3);
});

test('göç: huzur < 15 iken %20 olasılıkla 1 kişi (tohumlu)', () => {
  let ayrilan = 0;
  for (let t = 0; t < 400; t++) {
    const d = durum({ nufus: 20, huzur: 10, tur: 2, rng: rngBaslat(t), atama: { 'serbest:toplayici': 20 } });
    ayrilan += 20 - adimNufus(d).nufus;
  }
  assert.ok(ayrilan > 50 && ayrilan < 110, `ayrılan ${ayrilan}`);
  assert.equal(adimNufus(durum({ nufus: 20, huzur: 15, tur: 2, atama: {} })).nufus, 20);
});

test('isAta: yuva sınırı, nüfus sınırı, bilinmeyen yuva; geçersiz komut durumu değiştirmez', () => {
  const d = binaEkle(durum(), 'oduncu_kampi', K + 5, K + 5, { uid: 'k' });
  assert.match(isAta(d, 'k', 3).hata, /en çok 2/);
  assert.equal(isAta(d, 'k', 3).durum, d);
  assert.match(isAta(d, 'b2', 1).hata, /işçi almaz/);
  assert.match(isAta(d, 'serbest:yok', 1).hata, /serbest iş/);
  assert.match(isAta(d, 'k', 1).hata, /Yeterli kişi yok/);
  const r = isAta(isAta(d, 'serbest:toplayici', 1).durum, 'k', 2);
  assert.equal(r.hata, undefined);
  assert.deepEqual(r.durum.atama, { 'serbest:toplayici': 1, k: 2 });
  assert.equal(issizSayisi(r.durum), 0);
  assert.equal(issizSayisi(isAta(d, 'serbest:toplayici', 1).durum), 2);
});

test('yaralı işçiler çalışmaz: etkin atama sondan kırpılır', () => {
  const d = durum({ degistiriciler: [{ id: 'yarali', kalan: 2, etki: { yaraliIsci: 2 } }] });
  assert.deepEqual(etkinAtama(d), { 'serbest:toplayici': 1 });
  assert.equal(issizSayisi(d), 0);
});

test('isOtoAta: boştakileri boş yuvalara doldurur, inşaattaki/hasarlıyı atlar, boşta yoksa hata', () => {
  let d = durum({ atama: {} });
  d = binaEkle(d, 'oduncu_kampi', K + 5, K + 5, { uid: 'k' });
  d = binaEkle(d, 'oduncu_kampi', K + 8, K + 5, { uid: 'i', insaKalan: 2 });
  d = binaEkle(d, 'oduncu_kampi', K + 5, K + 8, { uid: 'h', hasarli: true });
  const r = isOtoAta(d);
  assert.equal(r.hata, undefined);
  assert.equal(r.durum.atama.k, 2);
  assert.equal(r.durum.atama.i, undefined);
  assert.equal(r.durum.atama.h, undefined);
  assert.equal(r.atanan, 2);
  assert.equal(isOtoAta(isAta(d, 'serbest:toplayici', d.nufus).durum).hata, 'Boşta kimse yok.');
});

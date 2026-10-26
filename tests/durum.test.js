import test from 'node:test';
import assert from 'node:assert/strict';
import { yeniOyun, turIlerlet } from '../src/core/oyun_durumu.js';
import { takvim } from '../src/core/takvim.js';
import { DURUM_ALANLARI, suz } from '../src/core/durum.js';
import { HARITA_BOYUT } from '../src/data/denge.js';
import { rngBaslat, rngSonraki, rngTamsayi, rngOlasilik, rngAgirlikli, durumRastgele } from '../src/core/rng.js';

test('yeniOyun §7.4 başlangıç değerleri', () => {
  const d = yeniOyun();
  assert.deepEqual(d.kaynaklar, { yiyecek: 10, odun: 5, tas: 0, deri: 0 });
  assert.equal(d.nufus, 3);
  assert.equal(d.huzur, 60);
  assert.equal(d.bilgiHavuz, 0);
  assert.equal(d.acTur, 0);
  assert.equal(d.onder.yorgunluk, 0);
  assert.deepEqual(d.binalar.map((b) => b.id), ['kamp_atesi', 'cadir']);
  assert.deepEqual(d.atama, { 'serbest:toplayici': 3 });
  assert.equal(d.vergi, 'yok');
  assert.deepEqual(Object.keys(d.harita).sort(), ['boyut', 'degisim', 'kesif', 'tohum']);
  assert.equal(d.harita.boyut, HARITA_BOYUT);
  assert.deepEqual(d.harita.degisim, {});
});

test('yeniOyun şemadaki tüm alanları içerir, fazlasını içermez', () => {
  assert.deepEqual(Object.keys(yeniOyun()).sort(), [...DURUM_ALANLARI].sort());
});

test('yeniOyun şema süzgecinden değişmeden geçer', () => {
  const d = yeniOyun(42);
  assert.deepEqual(suz(d, yeniOyun(42)), d);
});

test('Kamp Ateşi ortada, Çadır ona bitişik', () => {
  const [kamp, cadir] = yeniOyun().binalar;
  const m = HARITA_BOYUT / 2 - 1;
  assert.deepEqual([kamp.x, kamp.y], [m, m]);
  assert.deepEqual([cadir.x, cadir.y], [m + 2, m]);
});

test('takvim: Bahar 1. gün başlar, 16. gün ilk kış, 21. gün 2. yıl', () => {
  assert.deepEqual([takvim(0).mevsim, takvim(0).gun, takvim(0).yil, takvim(0).mevsimGunu], ['bahar', 1, 1, 1]);
  assert.equal(takvim(4).mevsim, 'bahar');
  assert.equal(takvim(4).mevsimSonGunu, true);
  assert.equal(takvim(5).mevsim, 'yaz');
  assert.equal(takvim(10).mevsim, 'guz');
  assert.equal(takvim(15).mevsim, 'kis');
  assert.equal(takvim(15).gun, 16);
  assert.equal(takvim(19).yil, 1);
  assert.deepEqual([takvim(20).mevsim, takvim(20).yil], ['bahar', 2]);
});

test('turIlerlet takvimi ilerletir, eski durumu değiştirmez', () => {
  let d = yeniOyun();
  const ilk = structuredClone(d);
  for (let i = 0; i < 15; i++) { d = turIlerlet(d).durum; d.olay.aktif = null; } // olaylar bu testin konusu değil
  assert.equal(d.tur, 15);
  assert.equal(takvim(d.tur).mevsim, 'kis');
  for (let i = 0; i < 5; i++) { d = turIlerlet(d).durum; d.olay.aktif = null; }
  assert.equal(takvim(d.tur).yil, 2);
  assert.deepEqual(yeniOyun(), ilk);
});

test('RNG: aynı tohum aynı dizi, farklı tohum farklı dizi', () => {
  const dizi = (t) => { let r = rngBaslat(t); const o = []; for (let i = 0; i < 5; i++) { const s = rngSonraki(r); o.push(s.deger); r = s.rng; } return o; };
  assert.deepEqual(dizi(7), dizi(7));
  assert.notDeepEqual(dizi(7), dizi(8));
});

test('RNG saf: girdi durumu değişmez, değerler [0,1)', () => {
  const r0 = rngBaslat(123);
  const a = rngSonraki(r0);
  const b = rngSonraki(r0);
  assert.equal(a.deger, b.deger);
  assert.notEqual(a.rng, r0);
  let r = r0;
  for (let i = 0; i < 2000; i++) {
    const s = rngSonraki(r);
    assert.ok(s.deger >= 0 && s.deger < 1);
    assert.ok(Number.isInteger(s.rng) && s.rng >= 0 && s.rng < 2 ** 32);
    r = s.rng;
  }
});

test('RNG yardımcıları: tamsayı aralığı, olasılık, ağırlıklı seçim', () => {
  let r = rngBaslat(9);
  const sayac = { a: 0, b: 0 };
  let evet = 0;
  for (let i = 0; i < 4000; i++) {
    const t = rngTamsayi(r, 1, 6); assert.ok(t.deger >= 1 && t.deger <= 6); r = t.rng;
    const o = rngOlasilik(r, 0.25); if (o.deger) evet++; r = o.rng;
    const s = rngAgirlikli(r, [{ id: 'a', agirlik: 3 }, { id: 'b', agirlik: 1 }]); sayac[s.deger.id]++; r = s.rng;
  }
  assert.ok(evet > 800 && evet < 1200, `olasılık ${evet}`);
  assert.ok(sayac.a > 2700 && sayac.a < 3300, `ağırlık ${sayac.a}`);
  assert.equal(rngAgirlikli(r, []).deger, null);
});

test('durumRastgele durumun rng alanını ilerletir, eskisini değiştirmez', () => {
  const d = yeniOyun(5);
  const { deger, durum } = durumRastgele(d);
  assert.ok(deger >= 0 && deger < 1);
  assert.notEqual(durum.rng, d.rng);
  assert.equal(d.rng, yeniOyun(5).rng);
});

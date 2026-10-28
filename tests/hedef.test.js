// Hedefler (docs/AKSIYON.md §6): "Ayının İzinde" destanı ve mevsim görev kartları.
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum, binaEkle, K } from './yardimci/durum.js';
import { kahramanli, isaretli } from './yardimci/aksiyon.js';
import { botOyna } from './yardimci/bot.js';
import { adimHedef, destanAdim, gorevKartiSec, hedefGorunumu, kartCek, gorevDurumu } from '../src/core/hedef.js';
import { seferGonder, adimSefer, adimIsaret } from '../src/core/sefer.js';
import { huzurHedefi } from '../src/core/huzur.js';
import { ISARET_SURE, GOREV_SURE, MEVSIM_TUR } from '../src/data/denge.js';

test('(d) "Ayının İzinde": iz bul → Ayı Avı başarı → postu Totem\'e sun → Ayı Postu, kalıcı huzur +3, unvan', () => {
  const { d: d0, uid: h } = kahramanli(binaEkle(durum({ nufus: 6, atama: { 'serbest:toplayici': 6 } }), 'totem', K + 4, K + 4), 'avci', { seviye: 3 });
  const { d: d1, uid } = isaretli(d0, 'ayi');
  let d = adimHedef(d1, []);
  assert.equal(d.hedef.destan.adim, 1);
  assert.match(destanAdim(d).hata, /komutla tamamlanmaz/);
  let s = seferGonder(d, 'ayi_avi', uid, { kahraman: [h], isci: 2 }).durum;
  s.sefer.aktif[0].zorluk = 1; s.sefer.aktif[0].kalan = 1; // kesin büyük başarı (test)
  d = adimSefer(s, []);
  assert.equal(d.hedef.destan.adim, 2);
  assert.ok(hedefGorunumu(d).destan.komut.uygun);
  const huzur0 = huzurHedefi(d).hedef;
  const r = destanAdim(d);
  assert.ok(!r.hata, r.hata);
  assert.equal(r.durum.hedef.destan.bitti, true);
  assert.deepEqual(r.durum.hedef.unvanlar, ['Ayı Boyu']);
  assert.equal(huzurHedefi(r.durum).hedef, huzur0 + 3);
  assert.equal(r.durum.sandik.filter((x) => x === 'ayi_postu').length, 1, 'büyük başarıdaki post zaten var → ikinci verilmez');
  assert.ok(r.bildirimler.some((b) => b.kod === 'hedef_destan' && b.bitti));
  assert.match(destanAdim(r.durum).hata, /destan adımı yok/);
  // Totem yoksa sunulamaz
  assert.match(destanAdim({ ...d, binalar: d.binalar.filter((b) => b.id !== 'totem') }).hata, /Totem/);
});

test('destan: 2. adımda ayı izi kaybolursa 1. adıma döner', () => {
  const { d: d1 } = isaretli(durum(), 'ayi');
  let d = adimHedef(d1, []);
  assert.equal(d.hedef.destan.adim, 1);
  for (let i = 0; i < ISARET_SURE; i++) d = adimIsaret(d, []);
  const bl = [];
  d = adimHedef(d, bl);
  assert.equal(d.hedef.destan.adim, 0);
  assert.ok(bl.some((b) => b.kod === 'hedef_destan'));
});

test('(d) bütünleşik: sefer kullanan bot Ayı destanını bitirir (10 tohumdan ≥ 8)', () => {
  const r = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => botOyna(t, { sefer: true, maxTur: 60 }));
  assert.ok(r.filter((x) => x.destanTur !== null).length >= 8, JSON.stringify(r.map((x) => x.destanTur)));
});

test('mevsim görev kartları: Bahar/Yaz/Güz başında ≤ 3 kart (deterministik), seçim, tamam/başarısız', () => {
  let d = durum({ tur: MEVSIM_TUR, kaynaklar: { yiyecek: 10, odun: 0, tas: 0, deri: 0 } });
  const bl = [];
  d = adimHedef(d, bl);
  assert.ok(d.hedef.kartlar.length >= 2 && d.hedef.kartlar.length <= 3);
  assert.deepEqual(kartCek(d), kartCek(d));
  assert.ok(!d.hedef.kartlar.includes('komsu_hediye'), 'komşu yokken hediye kartı yok');
  assert.ok(!d.hedef.kartlar.includes('harac_siz'), 'tehdit yokken haraçsız kartı yok');
  assert.match(gorevKartiSec(d, 'yok').hata, /seçilemez/);
  d = { ...d, hedef: { ...d.hedef, kartlar: ['kis_azigi', 'basarili_sefer'] } };
  const r = gorevKartiSec(d, 'kis_azigi');
  assert.ok(!r.hata);
  assert.match(gorevKartiSec(r.durum, 'basarili_sefer').hata, /Zaten/);
  assert.equal(gorevDurumu(r.durum, r.durum.hedef.gorev), null);
  const dolu = { ...r.durum, kaynaklar: { ...r.durum.kaynaklar, yiyecek: 25 } };
  const t = adimHedef(dolu, []);
  assert.equal(t.hedef.gorev, null);
  assert.equal(t.kaynaklar.deri, 4);
  let f = r.durum;
  const fb = [];
  for (let i = 0; i < GOREV_SURE; i++) f = adimHedef({ ...f, tur: f.tur + 1 }, fb);
  assert.equal(f.hedef.gorev, null);
  assert.ok(fb.some((b) => b.kod === 'hedef_gorev_basarisiz'));
  const g = hedefGorunumu(r.durum);
  assert.equal(g.gorev.id, 'kis_azigi');
  assert.equal(g.destan.adimlar.length, 3);
});

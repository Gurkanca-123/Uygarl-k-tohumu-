// (f) Kayıt sürüm 4 (docs/AKSIYON.md §8.2): v3 → v4 göçü, gidiş-dönüş eşitliği, aynı sonraki tur, bilinmeyen alan reddi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serialize, yukle, KAYIT_SURUM } from '../src/save/kayit.js';
import { turIlerlet } from '../src/core/tur.js';
import { botOyna } from './yardimci/bot.js';
import { cagBaslangic } from './yardimci/durum.js';
import { kahramanli, isaretli, ilerle } from './yardimci/aksiyon.js';
import { seferGonder } from '../src/core/sefer.js';
import { komsuKesfet } from '../src/core/komsu.js';
import { seferVarsayilan } from '../src/core/sefer.js';

const V4 = ['kahramanlar', 'kahramanDurum', 'sandik', 'sefer', 'hedefIsaretleri', 'komsu', 'komsular', 'hedef', 'ordu', 'rutbe', 'savas'];

test('(f) v3 kaydı v4\'e göçer: alan varsayılanları, ayrı RNG akışları tohumdan; yükleme sonrası aynı sonraki tur', () => {
  assert.equal(KAYIT_SURUM, 5);
  const oyun = botOyna(6, { maxTur: 14 }).son;
  const v3 = JSON.parse(serialize(oyun));
  v3.surum = 3;
  for (const k of V4) delete v3[k];
  const y = yukle(JSON.stringify(v3));
  assert.equal(y.surum, 5);
  assert.deepEqual([y.kahramanlar, y.sandik, y.hedefIsaretleri, y.komsular], [[], [], [], []]);
  assert.deepEqual(y.sefer, seferVarsayilan(6));
  assert.equal(y.rng, oyun.rng);
  assert.deepEqual(y.tehdit, oyun.tehdit);
  // gün 6 geçmiş eski oyun: teklif bir sonraki turda gelir
  assert.equal(y.kahramanDurum.ilk, false);
  const t = ilerle(y);
  assert.ok(t.bildirimler.some((b) => b.kod === 'kahraman_teklif'));
  // yükle → kaydet → yükle aynı; aynı sonraki tur
  const geri = yukle(serialize(y));
  assert.deepEqual(geri, y);
  if (!y.olay.aktif) assert.deepEqual(turIlerlet(geri), turIlerlet(y));
});

test('(f) v4 gidiş-dönüş: kahraman, aktif sefer, işaret, komşu ve hedefler aynen; sonraki tur aynı; bilinmeyen alan atılır', () => {
  const { d: d0, uid: h } = kahramanli(cagBaslangic('tasdevri', 4), 'kasif', { seviye: 2 });
  const d1 = structuredClone(d0);
  komsuKesfet(d1, []);
  const { d: d2, uid } = isaretli(d1, 'harabe');
  let d = seferGonder(d2, 'harabe', uid, { kahraman: [h], isci: 1 }).durum;
  d = ilerle(d).d;
  d.sandik = ['eski_harita'];
  d.hedef.kartlar = ['kis_azigi'];
  const geri = yukle(serialize(d));
  assert.deepEqual(geri, d);
  assert.deepEqual(turIlerlet(geri), turIlerlet(d));
  const ham = JSON.parse(serialize(d));
  ham.sefer.aktif[0].hile = 99;
  ham.kahramanlar[0].sinif = 'ejderha';
  ham.komsular[0].bilinmeyen = true;
  ham.sandik.push('altin_kilic');
  const z = yukle(JSON.stringify(ham));
  assert.equal('hile' in z.sefer.aktif[0], false);
  assert.equal(z.kahramanlar.length, 0, 'geçersiz sınıflı kahraman atılır');
  assert.equal('bilinmeyen' in z.komsular[0], false);
  assert.deepEqual(z.sandik, ['eski_harita']);
});

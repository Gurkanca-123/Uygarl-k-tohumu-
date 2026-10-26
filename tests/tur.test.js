// Bütünleşik testler: turIlerlet (§1.2 a–o) uçtan uca.
import test from 'node:test';
import assert from 'node:assert/strict';
import { turIlerlet, ADIMLAR } from '../src/core/tur.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';
import { onderEylemiSec, olayCoz, cagAtla } from '../src/core/komutlar.js';
import { serialize, yukle, turIlerletVeKaydet, ANAHTARLAR, oku } from '../src/save/kayit.js';
import { botTuru } from './yardimci/bot.js';
import { durum, binaEkle, yuvarla } from './yardimci/durum.js';

const oyna = (d, n, fn = botTuru) => { let x = d; for (let i = 0; i < n; i++) x = fn(x).durum; return x; };

test('§1.2 adım sırası a–o sabit (p çekirdek dışında)', () => {
  assert.deepEqual(ADIMLAR.map((a) => a[0]), [...'abcdefghijklmno']);
});

test('turIlerlet saf: girdi durumu değişmez; dönüş { durum, bildirimler }', () => {
  const d = yeniOyun(5);
  const kopya = structuredClone(d);
  const r = turIlerlet(d);
  assert.deepEqual(d, kopya);
  assert.equal(r.durum.tur, 1);
  assert.ok(Array.isArray(r.bildirimler));
});

test('(a) aynı tohum aynı sonuç, farklı tohum farklı gidiş', () => {
  const a = oyna(yeniOyun(42), 30);
  const b = oyna(yeniOyun(42), 30);
  assert.deepEqual(a, b);
  const c = oyna(yeniOyun(43), 30);
  assert.notDeepEqual(a.rng, c.rng);
});

test('(b) bir turun kaynak muhasebesi elle hesaplananla eşleşir', () => {
  // 1 Toplayıcı (2), 1 Avcı (1 yiyecek + 0,5 deri), 1 Oduncu (1); önder Avlan (+4 yiyecek, +1 deri); Bahar, huzur 60.
  let d = durum({ atama: { 'serbest:toplayici': 1, 'serbest:avci': 1, 'serbest:oduncu': 1 } }, 7);
  d = onderEylemiSec(d, 'avlan').durum;
  const s = turIlerlet(d).durum;
  // yiyecek: 10 + 4 + 2 + 1 = 17 → −3 tüketim = 14 → −%4 bozulma = 13,44
  assert.equal(yuvarla(s.kaynaklar.yiyecek), 13.44);
  assert.equal(s.kaynaklar.odun, 6);
  assert.equal(s.kaynaklar.deri, 1.5);
  assert.equal(s.kaynaklar.tas, 0);
  assert.equal(s.bilgiHavuz, 0.5);
  assert.equal(s.huzur, 60);
  assert.equal(s.onder.yorgunluk, 2);
  assert.deepEqual(s.istatistik.sonTur.uretim, { yiyecek: 3, deri: 0.5, odun: 1 });
  assert.equal(s.istatistik.sonTur.tuketim.yiyecek, 3);
  assert.equal(yuvarla(s.istatistik.sonTur.bozulan), 0.56);
});

test('(c) açlık → ölüm → kayıp kilidi → nüfus ≥ 2', () => {
  // Kimse çalışmıyor, yiyecek yok: 3. aç turda ölüm, kilit 3 turda en çok 1 kişi, nüfus 2'de durur.
  let d = durum({ nufus: 6, atama: {}, kaynaklar: { yiyecek: 0, odun: 50, tas: 0, deri: 0 } });
  d = binaEkle(binaEkle(d, 'cadir', 4, 4), 'cadir', 5, 4);
  const nufus = [];
  const olumTurlari = [];
  for (let i = 0; i < 30; i++) {
    const r = turIlerlet(d);
    if (r.durum.olay.aktif) r.durum.olay.aktif = null; // olayları yok say (yalnız açlık denetleniyor)
    if (r.durum.nufus < d.nufus) olumTurlari.push(d.tur);
    d = r.durum;
    nufus.push(d.nufus);
  }
  assert.equal(olumTurlari[0], 2, 'ilk ölüm 3. aç turda (tur 2)');
  for (let i = 1; i < olumTurlari.length; i++) assert.ok(olumTurlari[i] - olumTurlari[i - 1] >= 3, `kilit: ${olumTurlari}`);
  assert.ok(nufus.every((n) => n >= 2));
  assert.equal(d.nufus, 2);
  assert.ok(d.acTur >= 1);
});

test('(d) ilk kış 16. günde (tur 15): ısınma odunu yalnız o turdan itibaren yakılır', () => {
  let d = durum({ tur: 14, atama: { 'serbest:toplayici': 3 }, kaynaklar: { yiyecek: 20, odun: 10, tas: 0, deri: 0 } });
  d = binaEkle(d, 'cadir', 4, 4);
  const s14 = turIlerlet(d).durum;
  assert.equal(s14.kaynaklar.odun, 10);
  assert.equal(s14.istatistik.sonTur.tuketim.odun, undefined);
  const s15 = turIlerlet(s14).durum;
  assert.equal(s15.istatistik.sonTur.tuketim.odun, 2); // 2 Çadır × 1
  assert.equal(s15.kaynaklar.odun, 8);
  // yetmezse ısınma eksik: huzur cezası
  const az = turIlerlet({ ...s14, kaynaklar: { ...s14.kaynaklar, odun: 1 } }).durum;
  assert.equal(az.istatistik.sonTur.isinmaEksik, true);
  assert.equal(az.huzur, 55);
});

test('(e) bot oyunu: şartlar sağlanınca çağ atlanır, sonraki tur Taş Devri olarak çözülür', () => {
  let d = yeniOyun(3);
  let atlandi = null;
  for (let i = 0; i < 80 && !atlandi; i++) {
    const r = botTuru(d);
    if (r.cagAtlandi) atlandi = r.durum;
    d = r.durum;
  }
  assert.ok(atlandi, 'bot çağ atlamalı');
  assert.equal(atlandi.cag, 'tasdevri');
  const sonra = turIlerlet(atlandi).durum;
  assert.equal(sonra.istatistik.sonTur.bilgi, 2); // Ocak Meydanı 1 BP + Totem 1 BP
});

test('(f) olay çözümü ve kurtarma: açlıkta Komşu Kabile Yardımı gelir, çözülünce yiyecek eklenir', () => {
  let d = durum({ tur: 8, atama: {}, kaynaklar: { yiyecek: 0, odun: 20, tas: 0, deri: 0 } });
  let r;
  for (let i = 0; i < 5; i++) {
    r = turIlerlet(d);
    d = r.durum;
    if (d.olay.aktif) break;
  }
  assert.equal(d.olay.aktif.id, 'komsu_yardimi');
  assert.ok(d.acTur >= 2);
  assert.ok(r.bildirimler.some((b) => b.kod === 'olay'));
  assert.match(turIlerlet(d).hata, /bekleyen olayı çöz/);
  const c = olayCoz(d, 0).durum;
  assert.equal(c.kaynaklar.yiyecek, 15);
  assert.equal(c.olay.kurtarmaKullanildi.gocebe, true);
  const s = turIlerlet(c).durum;
  assert.equal(s.acTur, 0);
});

test('(g) kayıt/yükleme sonrası aynı tohumla aynı sonraki tur', () => {
  const d = oyna(yeniOyun(11), 18);
  const y = yukle(serialize(d));
  assert.deepEqual(y, d);
  assert.deepEqual(botTuru(y).durum, botTuru(d).durum);
  assert.deepEqual(oyna(y, 10), oyna(d, 10));
});

test('§1.2 p: otomatik kayıt çağıran katmanda (turIlerletVeKaydet)', () => {
  const m = new Map();
  const depo = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  const r = turIlerletVeKaydet(depo, yeniOyun(2));
  assert.deepEqual(oku(depo, ANAHTARLAR.otomatik).durum, r.durum);
  const kilitli = durum({ olay: { aktif: { id: 'firtina' }, bekleme: {}, zincir: [], kurtarmaKullanildi: {} } });
  m.clear();
  assert.ok(turIlerletVeKaydet(depo, kilitli).hata);
  assert.equal(m.size, 0);
});

test('çağ atlama komutu sonrası geçersiz çağ atlama durumu değiştirmez', () => {
  const d = yeniOyun(1);
  assert.equal(cagAtla(d).durum, d);
});

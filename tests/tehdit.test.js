// Dış tehdit motoru (docs/TEHDIT.md §3–§6, MVP §10). Birim + bütünleşik testler.
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum, binaEkle, K } from './yardimci/durum.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';
import { turIlerlet } from '../src/core/tur.js';
import {
  adimTehdit, tehditGucu, TEHDIT, adayTehditler, tehditTavir, haracOde, tahkimatYap, bekciAta, zorlukAyarla,
  beklenenSonuc, tehditGorunumu, kayipOrani, tehditVarsayilan,
} from '../src/core/tehdit.js';
import { savunmaHesapla, savunmaDokum } from '../src/core/savunma.js';
import { uygunOlaylar, olayCoz } from '../src/core/olay.js';
import { OLAY } from '../src/core/yardimci.js';
import { serialize, yukle } from '../src/save/kayit.js';
import { botOyna } from './yardimci/bot.js';
import { NUFUS_MIN, TEHDIT_BASLANGIC } from '../src/data/denge.js';

// Tehditli test durumu: gerginlik/aktif ayarlı.
const tehditli = (ek = {}, T = {}) => {
  const d = durum({ tur: 20, ...ek });
  return { ...d, tehdit: { ...d.tehdit, ...T } };
};
const aktif = (id, guc, ek = {}) => ({ aktif: { id, guc, aralik: [Math.floor(guc * 0.8), Math.ceil(guc * 1.2)], kalan: 1,
  tavir: 'savun', bilinen: true, erteleme: 0, tahkimat: false, ...ek } });
const varis = (d) => { const bl = []; const x = adimTehdit(d, bl); return { d: x, bl, son: x.tehdit.gecmis.at(-1) }; };

test('yeniOyun: tehdit varsayılanı, zorluk Normal; Barışçıl seçilebilir, geçersiz → Normal', () => {
  const d = yeniOyun(3);
  assert.equal(d.zorluk, 'normal');
  assert.equal(d.tehdit.gerginlik, TEHDIT_BASLANGIC);
  assert.equal(d.tehdit.aktif, null);
  assert.equal(yeniOyun(3, { zorluk: 'barisci' }).zorluk, 'barisci');
  assert.equal(yeniOyun(3, { zorluk: 'yok' }).zorluk, 'normal');
});

test('güç formülü §3.4: taban × çekicilik × kademe, gucUst sınırı', () => {
  const bos = { yiyecek: 0, odun: 0, tas: 0, deri: 0 };
  const d = tehditli({ kaynaklar: bos });           // Göçebe, tur 20: 3 + 2 = 5; doluluk 0 → ×0,85 → ceil 4,25 = 5
  assert.equal(tehditGucu(d, TEHDIT.kurt_surusu), 5);
  assert.equal(tehditGucu({ ...d, tehdit: { ...d.tehdit, haracSayac: 3 } }, TEHDIT.kurt_surusu), 6); // 6,16 → üst 6
  assert.equal(tehditGucu({ ...d, tehdit: { ...d.tehdit, sonSonuc: 'yenilgi' } }, TEHDIT.kurt_surusu), 4); // ×0,85
  const t = tehditli({ cag: 'tasdevri', kaynaklar: { ...bos, alet: 0 }, cagBaslangicTuru: 20 });
  assert.equal(tehditGucu(t, TEHDIT.kurt_surusu), 5);      // 0,8 × 6 = 4,8 × 0,85 → 5 (Taş'ta gucOran 0,8)
  assert.equal(tehditGucu(t, TEHDIT.komsu_baskini), 7);    // 1,2 × 6 = 7,2 × 0,85 → 7
  assert.equal(tehditGucu({ ...t, zorluk: 'barisci' }, TEHDIT.komsu_baskini), 5);
});

test('gerginlik: gün 12 öncesi artmaz; sonra artar ve durum.rng değişmez; nefes sürerken doğum yok', () => {
  const erken = tehditli({ tur: 5 });
  assert.equal(adimTehdit(erken).tehdit.gerginlik, erken.tehdit.gerginlik);
  const d = tehditli();
  const x = adimTehdit(d);
  assert.ok(x.tehdit.gerginlik > d.tehdit.gerginlik);
  assert.equal(x.rng, d.rng);
  assert.notEqual(x.tehdit.rng, d.tehdit.rng);
  const n = adimTehdit(tehditli({}, { gerginlik: 99, nefesKalan: 3 }));
  assert.equal(n.tehdit.aktif, null);
  assert.equal(n.tehdit.nefesKalan, 2);
  assert.ok(n.tehdit.gerginlik <= 95);
});

test('doğum: Göçebe yalnız yırtıcı (kurt/ayı); uyarı 2 tur, varsayılan Savun, güç aralığı; Gözcü +1 tur ve kesin güç', () => {
  const bl = [];
  const d = adimTehdit(tehditli({}, { gerginlik: 99 }), bl);
  assert.ok(['kurt_surusu', 'ayi'].includes(d.tehdit.aktif.id));
  assert.equal(d.tehdit.aktif.kalan, 2);
  assert.equal(d.tehdit.aktif.tavir, 'savun');
  assert.equal(d.tehdit.aktif.bilinen, false);
  assert.ok(bl.some((b) => b.kod === 'tehdit_uyari'));
  const g = binaEkle(tehditli({ buluslar: ['hayvan_izleri'], atama: { g: 1, 'serbest:toplayici': 2 } }, { gerginlik: 99 }),
    'gozcu_diregi', K + 5, K + 5, { uid: 'g' });
  const x = adimTehdit(g);
  assert.equal(x.tehdit.aktif.kalan, 3);
  assert.equal(x.tehdit.aktif.bilinen, true);
  assert.equal(tehditGorunumu(x).aktif.guc, x.tehdit.aktif.guc);
  assert.equal(tehditGorunumu(d).aktif.guc, null);
  assert.equal(tehditGorunumu(tehditli()).gerginlik, null); // gözcüsüz sayı gizli
});

test('tek tehdit: uyarı sürerken gerginlik artmaz, yeni tehdit doğmaz; kalan 1 azalır', () => {
  const d = tehditli({}, { gerginlik: 100, ...aktif('kurt_surusu', 5, { kalan: 2 }) });
  const x = adimTehdit(d);
  assert.equal(x.tehdit.gerginlik, 100);
  assert.equal(x.tehdit.aktif.kalan, 1);
});

test('ölüm sarmalı: açlıkta / huzur < 30 iken doğum yok (95 bekler); gelen tehdit ×0,8', () => {
  for (const ek of [{ acTur: 1 }, { huzur: 20 }]) {
    const x = adimTehdit(tehditli(ek, { gerginlik: 99 }));
    assert.equal(x.tehdit.aktif, null);
    assert.equal(x.tehdit.gerginlik, 95);
  }
  const { son } = varis(tehditli({ acTur: 1 }, aktif('kurt_surusu', 5)));
  assert.equal(son.guc, 4);
});

test('Barışçıl: yalnız yırtıcı aday; Normal Taş Devri: üç MVP tehdidi + Aç Ayı', () => {
  const t = tehditli({ cag: 'tasdevri', kaynaklar: { yiyecek: 0, odun: 0, tas: 0, deri: 0, alet: 0 } });
  assert.deepEqual(adayTehditler(t).map((x) => x.id).sort(), ['avci_cetesi', 'ayi', 'komsu_baskini', 'kurt_surusu']);
  assert.deepEqual(adayTehditler({ ...t, zorluk: 'barisci' }).map((x) => x.id).sort(), ['ayi', 'kurt_surusu']);
});

test('varış: püskürtme (ganimet, gerginlik −20) · kısmi (%10 fazladan) · Göçebe yenilgi: ölüm yok, yaralı + toparlanma', () => {
  const kaynak = { yiyecek: 26, odun: 0, tas: 0, deri: 0 };
  // önder 1 + bekçi 8 × 0,5 = 5 ≥ 5
  const p = varis(tehditli({ kaynaklar: kaynak, atama: { 'serbest:bekci': 3 }, nufus: 3 }, aktif('kurt_surusu', 2)));
  assert.equal(p.son.sonuc, 'puskurtme');
  assert.equal(p.d.kaynaklar.yiyecek, 29);           // + ceil(2 × 1,5)
  assert.equal(p.d.tehdit.gerginlik, -20);
  assert.equal(p.d.tehdit.aktif, null);
  const k = varis(tehditli({ kaynaklar: kaynak, atama: { 'serbest:bekci': 3 } }, aktif('kurt_surusu', 5)));
  assert.equal(k.son.sonuc, 'kismi');                // 2,5 ≥ 2,5
  assert.equal(k.d.kaynaklar.yiyecek, 26 - (26 - 6) * 0.1);
  const y = varis(tehditli({ kaynaklar: kaynak }, aktif('kurt_surusu', 5)));
  assert.equal(y.son.sonuc, 'yenilgi');
  assert.equal(y.d.nufus, 3);
  assert.equal(y.d.kaynaklar.yiyecek, 26 - 20 * 0.25);
  assert.ok(y.d.degistiriciler.some((m) => m.id === 'yarali'));
  assert.ok(y.d.degistiriciler.some((m) => m.id === 'toparlanma'));
  assert.equal(y.d.tehdit.gerginlik, -30);
  assert.equal(y.d.tehdit.artArdaYenilgi, 1);
  assert.ok(y.bl.some((b) => b.kod === 'tehdit_varis' && b.sonuc === 'yenilgi'));
});

test('kayıp sınırları: kış azığı korunur, oran ≤ %25 (Zor %30), kapalı çevre ×0,8', () => {
  const azik = varis(tehditli({ kaynaklar: { yiyecek: 6, odun: 0, tas: 0, deri: 0 } }, aktif('kurt_surusu', 5)));
  assert.equal(azik.d.kaynaklar.yiyecek, 6);          // 2 × nüfus 3 = 6 korunur
  const d = tehditli();
  assert.equal(kayipOrani(d, TEHDIT.komsu_baskini, 'yenilgi'), 0.25);
  assert.equal(kayipOrani({ ...d, zorluk: 'zor' }, TEHDIT.komsu_baskini, 'yenilgi'), 0.3);
  assert.equal(kayipOrani({ ...d, zorluk: 'barisci' }, TEHDIT.komsu_baskini, 'yenilgi'), 0.125);
});

test('Taş Devri baskın yenilgisi: 1 kişi (kilitli, NUFUS_MIN), konut/merkez hasar dışı; Rahat\'ta ölüm yerine yaralı', () => {
  const bos = { yiyecek: 40, odun: 20, tas: 10, deri: 5, alet: 4 };
  let t = durum({ tur: 30, cag: 'tasdevri', cagBaslangicTuru: 26, kaynaklar: bos, nufus: 8, atama: { 'serbest:toplayici': 8 } });
  t = binaEkle(t, 'kulube', K + 3, K + 3, { uid: 'k' });
  t = binaEkle(t, 'oduncu_kampi', K + 1, K + 10, { uid: 'o' });
  t = { ...t, tehdit: { ...t.tehdit, ...aktif('komsu_baskini', 9) } };
  const y = varis(t);
  assert.equal(y.son.sonuc, 'yenilgi');
  assert.equal(y.d.nufus, 7);
  const hasarli = y.d.binalar.filter((b) => b.hasarli).map((b) => b.id);
  assert.deepEqual(hasarli, ['oduncu_kampi']);
  const iki = varis({ ...t, nufus: NUFUS_MIN, atama: { 'serbest:toplayici': 2 } });
  assert.equal(iki.d.nufus, NUFUS_MIN);
  const rahat = varis({ ...t, zorluk: 'rahat' });
  assert.equal(rahat.d.nufus, 8);
  assert.ok(rahat.d.degistiriciler.some((m) => m.id === 'yarali'));
});

test('çit yanar: baskın yenilgisinde yanabilir çevre parçası hasar görür', () => {
  let t = durum({ tur: 30, cag: 'tasdevri', cagBaslangicTuru: 26, kaynaklar: { yiyecek: 40, odun: 20, tas: 10, deri: 5, alet: 4 } });
  t = binaEkle(t, 'cit', K + 3, K + 3, { uid: 'c' });
  t = { ...t, tehdit: { ...t.tehdit, ...aktif('komsu_baskini', 9) } };
  assert.equal(varis(t).d.binalar.find((b) => b.uid === 'c').hasarli, true);
});

test('komutlar: tavır, haraç, tahkimat, bekçi, zorluk; hatalar Türkçe ve durum değişmez', () => {
  const bos = tehditli();
  for (const r of [tehditTavir(bos, 'saklan'), haracOde(bos), tahkimatYap(bos)]) {
    assert.match(r.hata, /tehdit yok/);
    assert.equal(r.durum, bos);
  }
  const d = tehditli({ kaynaklar: { yiyecek: 20, odun: 4, tas: 0, deri: 0 } }, aktif('kurt_surusu', 5, { kalan: 2 }));
  assert.match(tehditTavir(d, 'kac').hata, /Geçersiz/);
  assert.match(tehditTavir(d, 'savun').hata, /zaten/);
  const s = tehditTavir(d, 'saklan').durum;
  assert.equal(s.tehdit.aktif.tavir, 'saklan');
  assert.equal(d.tehdit.aktif.tavir, 'savun');
  const h = haracOde(d).durum;
  assert.equal(h.kaynaklar.yiyecek, 12);              // ceil(5 × 1,5) = 8
  assert.equal(h.tehdit.aktif, null);
  assert.equal(h.tehdit.haracSayac, 1);
  assert.match(haracOde({ ...d, kaynaklar: { ...d.kaynaklar, yiyecek: 3 } }).hata, /Kaynak yetersiz/);
  const th = tahkimatYap(d).durum;
  assert.equal(savunmaHesapla(th) - savunmaHesapla(d), 2);
  assert.equal(th.kaynaklar.odun, 0);
  assert.match(tahkimatYap(th).hata, /zaten/);
  const az = { ...d, atama: { 'serbest:toplayici': 1 } };
  assert.equal(bekciAta(az, 2).durum.atama['serbest:bekci'], 2);
  assert.equal(savunmaHesapla(bekciAta(az, 2).durum) - savunmaHesapla(az), 1);
  assert.match(bekciAta(d, 2).hata, /Yeterli kişi yok/);
  assert.equal(zorlukAyarla(d, 'barisci').durum.zorluk, 'barisci');
  assert.equal(zorlukAyarla(d, 'barisci').durum.tehdit.aktif.id, 'kurt_surusu'); // yırtıcı kalır
  assert.match(zorlukAyarla({ ...d, zorluk: 'barisci' }, 'normal').hata, /yeni oyunda/);
});

test('saklan tavrı varışta: Göçebe kampı taşı (kayıp yok, 2 tur üretim ×0,6), gerginlik 0', () => {
  const d = tehditli({ kaynaklar: { yiyecek: 20, odun: 4, tas: 0, deri: 0 } }, aktif('kurt_surusu', 5, { tavir: 'saklan' }));
  assert.equal(beklenenSonuc(d).sonuc, 'saklan');
  const { d: x, son } = varis(d);
  assert.equal(son.sonuc, 'saklan');
  assert.equal(x.kaynaklar.yiyecek, 20);
  assert.deepEqual(x.degistiriciler.find((m) => m.id === 'saklanma'), { id: 'saklanma', kalan: 2, etki: { uretim: { etiket: '*', carpan: 0.6 } } });
  assert.equal(x.tehdit.gerginlik, 0);
});

test('beklenenSonuc ve döküm: renk/eşik önizlemesi, savunmaDokum toplamı = savunmaHesapla', () => {
  const d = tehditli({ atama: { 'serbest:bekci': 2, 'serbest:toplayici': 1 } }, aktif('kurt_surusu', 4, { kalan: 2 }));
  const b = beklenenSonuc(d);
  assert.equal(b.savunma, 2);
  assert.equal(b.sonuc, 'kismi');
  assert.equal(tehditGorunumu(d).aktif.renk, 'sari');
  assert.equal(savunmaDokum(d).reduce((a, k) => a + k.deger, 0), savunmaHesapla(d));
  assert.deepEqual(tehditGorunumu(d).aktif.secenekler.map((s) => s.id), ['savun', 'harac', 'saklan']);
});

test('olay havuzu: motor açıkken saldırı olayları çıkmaz; varış turunda kötü olay yok', () => {
  const d = durum({ tur: 12 });
  assert.ok(!uygunOlaylar(d, 'rastgele', { gun: 13, mevsim: 'yaz' }).some((o) => o.tur === 'saldiri'));
  const motorsuz = { ...d };
  delete motorsuz.tehdit;
  assert.ok(uygunOlaylar(motorsuz, 'rastgele', { gun: 13, mevsim: 'yaz' }).some((o) => o.id === 'kurt_surusu'));
  const v = { ...d, istatistik: { sonTur: { tehditVaris: true } } };
  assert.ok(!uygunOlaylar(v, 'rastgele', { gun: 13, mevsim: 'guz' }).some((o) => o.kotu));
});

// ---------- Bütünleşik ----------
test('(a) determinizm: aynı tohum aynı tehdit geçmişi', () => {
  const a = botOyna(11, { hedefCag: 'bronz', maxTur: 60 }).son.tehdit;
  const b = botOyna(11, { hedefCag: 'bronz', maxTur: 60 }).son.tehdit;
  assert.ok(a.gecmis.length >= 2);
  assert.deepEqual(a, b);
});

test('(b) akış: uyarı → tavır (Saklan) → varış bildirimi, oyun durmaz', () => {
  let d = { ...durum({ tur: 20, kaynaklar: { yiyecek: 20, odun: 10, tas: 0, deri: 2 } }) };
  d = { ...d, tehdit: { ...d.tehdit, gerginlik: 99 } };
  let r = turIlerlet(d);
  assert.ok(r.bildirimler.some((b) => b.kod === 'tehdit_uyari'));
  assert.equal(r.durum.tehdit.aktif.kalan, 2);
  d = tehditTavir(r.durum, 'saklan').durum;
  const coz = (x) => (x.olay.aktif ? olayCoz(x, OLAY[x.olay.aktif.id].secenekler.length - 1).durum : x);
  r = turIlerlet(d);
  assert.equal(r.hata, undefined);
  assert.equal(r.durum.tehdit.aktif.kalan, 1);
  r = turIlerlet(coz(r.durum));
  const v = r.bildirimler.find((b) => b.kod === 'tehdit_varis');
  assert.equal(v.sonuc, 'saklan');
  assert.equal(r.durum.tehdit.aktif, null);
});

test('(c) ölüm sarmalı korumaları: pasif bot (hiç hazırlık yok) 50 tohumda Göçebe biter ve nüfus ≥ 2 (kış azığı: birim test)', () => {
  for (let t = 1; t <= 50; t++) {
    const r = botOyna(t, { tehditStrateji: 'pasif' });
    assert.ok(r.minNufus >= NUFUS_MIN, `tohum ${t}`);
    assert.ok(r.tamam, `tohum ${t} Göçebe'yi bitiremedi`);
  }
});

test('çağ atlayınca nefes: gerginlik ≤ 50 ve 8 tur doğum yok', () => {
  const r = botOyna(4);
  assert.equal(r.son.cag, 'tasdevri');
  assert.ok(r.son.tehdit.gerginlik <= 50);
  assert.equal(r.son.tehdit.nefesKalan, 8);
});

test('(d) kayıt v2 → v3 göçü; v3 gidiş-dönüş sonrası aynı sonraki tur', () => {
  const v2 = JSON.parse(serialize(yeniOyun(9)));
  v2.surum = 2;
  delete v2.zorluk;
  delete v2.tehdit;
  const y = yukle(JSON.stringify(v2));
  assert.equal(y.surum, 3);
  assert.equal(y.zorluk, 'normal');
  assert.deepEqual(y.tehdit, tehditVarsayilan(9, { gerginlik: 0, nefesKalan: 10 }));
  // Aktif uyarılı bir oyun ortası
  let d = botOyna(5, { maxTur: 22 }).son;
  while (!d.tehdit.aktif) d = turIlerlet(d).durum;
  const geri = yukle(serialize(d));
  assert.deepEqual(geri, d);
  assert.deepEqual(turIlerlet(geri), turIlerlet(d));
});

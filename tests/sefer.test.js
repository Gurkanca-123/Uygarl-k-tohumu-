// Sefer sistemi (docs/AKSIYON.md §2, §7, §9.2): olasılıklar, gönderme kuralları, akış, yaralı, işaretler, tehditle etkileşim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum } from './yardimci/durum.js';
import { kahramanli, isaretli, ilerle } from './yardimci/aksiyon.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';
import { turIlerlet } from '../src/core/tur.js';
import {
  seferOlasiliklari, sonucBelirle, seferOnizleme, seferGonder, seferGeriCagir, seferOlayCoz, ekipGucu, adimSefer, adimIsaret,
  isaretDogur, seferGorunumu, SEFER,
} from '../src/core/sefer.js';
import { etkinAtama, yaraliSayisi } from '../src/core/yardimci.js';
import { yiyecekIhtiyaci } from '../src/core/tuketim.js';
import { savunmaHesapla, savunmaDokum } from '../src/core/savunma.js';
import { rngBaslat, rngSonraki } from '../src/core/rng.js';
import { AKTIF_VARSAYILAN } from '../src/core/tehdit.js';
import { SEFER_SANS, ISARET_SURE, ILK_AYI_GUN, SEFER_ISCI_YARALI_SURE, KAHRAMAN_YARALI } from '../src/data/denge.js';

const kalabalik = (n = 6, ek = {}) => durum({ nufus: n, atama: { 'serbest:toplayici': n }, kaynaklar: { yiyecek: 28, odun: 20, tas: 5, deri: 5 }, ...ek });
const toplam = (o) => Object.values(o).reduce((a, x) => a + x, 0);

test('seferOlasiliklari: toplam 1; 10 000 simülasyonla ±%2 (§9.2.4)', () => {
  for (const r of [0.4, 0.75, 1, 1.1, 1.3, 2]) {
    const p = seferOlasiliklari(r);
    assert.ok(Math.abs(toplam(p) - 1) < 1e-9);
    let rng = rngBaslat(`olasilik:${r}`);
    const say = { buyuk: 0, basari: 0, kismi: 0, basarisiz: 0 };
    for (let i = 0; i < 10000; i++) {
      const x = rngSonraki(rng); rng = x.rng;
      say[sonucBelirle(r * (SEFER_SANS[0] + SEFER_SANS[1] * x.deger))]++;
    }
    for (const k of Object.keys(say)) assert.ok(Math.abs(say[k] / 10000 - p[k]) < 0.02, `${r} ${k}`);
  }
  // Denge (geniş şans aralığı): aşırı güçlü ekip bile asla %100 değil; zayıf ekip başarısızlık ağırlıklı; dengeli ekip büyük başarı %30–40.
  const g = seferOlasiliklari(2);
  assert.ok(g.buyuk + g.basari > 0.9 && g.buyuk + g.basari < 1);
  assert.ok(seferOlasiliklari(0.4).basarisiz > 0.5);
  const b = seferOlasiliklari(1);
  assert.ok(b.buyuk >= 0.3 && b.buyuk <= 0.4 && b.basarisiz >= 0.1 && b.basarisiz <= 0.2 && b.kismi >= 0.15 && b.kismi <= 0.2);
});

test('ekip gücü: işçi 1 + önder 2 (+1 Mızrak Ucu) + kahraman (taban + Sv) × sınıf çarpanı + eşya', () => {
  let { d, uid } = kahramanli(kalabalik(), 'avci');
  assert.equal(ekipGucu(d, SEFER.ayi_avi, { kahraman: [uid], isci: 2 }).toplam, 3 * 1.5 + 2);
  assert.equal(ekipGucu(d, SEFER.harabe, { kahraman: [uid], isci: 0, onder: true }).toplam, 3 + 2);
  d = { ...d, buluslar: ['mizrak_ucu'] };
  d.kahramanlar[0].esya.silah = 'tas_mizrak';
  assert.equal(ekipGucu(d, SEFER.harabe, { kahraman: [uid], onder: true }).toplam, 4 + 3);
});

test('gönderme kuralları: geçersiz komut durumu değiştirmez, Türkçe hata', () => {
  const { d: d0, uid: h } = kahramanli(kalabalik(4), 'avci');
  const { d, uid: ayi } = isaretli(d0, 'ayi');
  const dene = (x, ...a) => { const r = seferGonder(x, ...a); assert.ok(r.hata); assert.equal(r.durum, x); return r.hata; };
  assert.match(dene(d, 'ayi_avi', ayi, { kahraman: [h], isci: 2 }), /en az iki kişi/); // 4 − 3 < 2
  assert.match(dene(d, 'ayi_avi', 'yok', { kahraman: [h] }), /işaret yok/);
  assert.match(dene(d, 'harabe', ayi, { kahraman: [h] }), /Eski harabe/);
  assert.match(dene(d, 'ayi_avi', ayi, {}), /en az 1/);
  assert.match(dene({ ...d, kaynaklar: { ...d.kaynaklar, yiyecek: 1 } }, 'ayi_avi', ayi, { kahraman: [h] }), /Erzak/);
  assert.match(dene({ ...d, olay: { ...d.olay, aktif: { id: 'yabanci_aile' } } }, 'ayi_avi', ayi, { kahraman: [h] }), /olayı çöz/);
  assert.match(dene(d, 'koyun', null, { isci: 1 }), /henüz yok/);
  assert.match(dene(d, 'baskin_seferi', 'kuzey_kurt_boyu', { isci: 1 }), /bu çağda açılmadı/);
  const r = seferGonder(d, 'ayi_avi', ayi, { kahraman: [h] });
  assert.ok(!r.hata);
  assert.match(dene(r.durum, 'kesif', null, { isci: 1 }), /en çok 1 sefer/);
  assert.match(dene(r.durum, 'ayi_avi', ayi, { isci: 1 }), /zaten bir ekip/);
});

test('(b) akış gönder → bekle → sonuç: erzak peşin, seferdekiler üretmez/yemez/savunmaz, süre sonunda döner', () => {
  const { d: d0, uid: h } = kahramanli(kalabalik(6), 'avci');
  const { d, uid: ayi } = isaretli(d0, 'ayi');
  const on = seferOnizleme(d, 'ayi_avi', ayi, { kahraman: [h], isci: 1, onder: true });
  assert.ok(on.uygun, on.hata);
  assert.ok(on.sure >= 2 && on.sure <= 4);
  assert.equal(on.erzak, 3 * on.sure);
  assert.ok(on.savunmaSonra < on.savunmaOnce);
  const r = seferGonder(d, 'ayi_avi', ayi, { kahraman: [h], isci: 1, onder: true });
  const s = r.durum;
  assert.equal(s.kaynaklar.yiyecek, d.kaynaklar.yiyecek - on.erzak);
  assert.equal(toplam(etkinAtama(s)), toplam(etkinAtama(d)) - 1);    // kahraman zaten işçi değil; 1 işçi seferde
  assert.equal(yiyecekIhtiyaci(s), yiyecekIhtiyaci(d) - 2);           // işçi + kahraman köyde yemez
  assert.ok(!savunmaDokum(s).some((k) => k.id === 'onder'));
  assert.match(turIlerlet({ ...s, onder: { ...s.onder, eylem: 'avlan' } }).bildirimler.find((b) => b.kod === 'eylem_iptal').metin, /seferde/);
  let x = s;
  let donus = null;
  for (let i = 0; i < on.sure + 3 && !donus; i++) {
    const t = ilerle(x);
    x = t.d;
    donus = t.bildirimler.find((b) => b.kod === 'sefer_dondu');
    if (!donus) assert.equal(x.sefer.aktif.length, 1);
  }
  assert.ok(donus, 'sefer döndü');
  assert.ok(x.tur - s.tur >= on.sure && x.tur - s.tur <= on.sure + 1); // yolda olay +1 gün ekleyebilir
  assert.equal(x.sefer.aktif.length, 0);
  assert.ok(['buyuk', 'basari', 'kismi', 'basarisiz'].includes(donus.sonuc));
  assert.ok(x.kahramanlar[0].xp > 0);
});

test('(b) başarısız sefer: işçi yaralı 3 tur, kahraman yaralı 4 tur; ölüm yok; yaralı sefer/görev yapamaz', () => {
  const { d: d0, uid: h } = kahramanli(kalabalik(6), 'kasif');
  const { d, uid: ayi } = isaretli(d0, 'ayi');
  let s = seferGonder(d, 'ayi_avi', ayi, { kahraman: [h], isci: 1 }).durum;
  s.sefer.aktif[0].zorluk = 100; // kesin başarısız (test)
  s.sefer.aktif[0].kalan = 1;
  const bl = [];
  const x = adimSefer(s, bl);
  assert.equal(bl.find((b) => b.kod === 'sefer_dondu').sonuc, 'basarisiz');
  assert.equal(x.nufus, s.nufus);
  assert.equal(yaraliSayisi(x), 1);
  assert.equal(x.degistiriciler.find((m) => m.id === 'yarali').kalan, SEFER_ISCI_YARALI_SURE);
  assert.equal(x.kahramanlar[0].yarali, KAHRAMAN_YARALI.sefer);
  assert.ok(x.hedefIsaretleri.some((i) => i.uid === ayi), 'başarısızlıkta işaret kalır');
  assert.match(seferOnizleme(x, 'kesif', null, { kahraman: [h] }).hata, /yaralı/);
  // 4 tur sonra iyileşir
  let y = x;
  for (let i = 0; i < KAHRAMAN_YARALI.sefer; i++) y = adimSefer(y, []);
  assert.equal(y.kahramanlar[0].yarali, 0);
});

test('(a) aynı tohum + aynı komutlar → aynı sefer sonucu; durum.rng ve tehdit.rng akışı seferden etkilenmez', () => {
  const kur = () => {
    const { d: d0, uid: h } = kahramanli(kalabalik(6), 'avci');
    const { d, uid } = isaretli(d0, 'ayi');
    return seferGonder(d, 'ayi_avi', uid, { kahraman: [h], isci: 1 }).durum;
  };
  const a = ilerle(kur(), 5), b = ilerle(kur(), 5);
  assert.deepEqual(a.d, b.d);
  assert.deepEqual(a.d.sefer.son, b.d.sefer.son);
  // Sefersiz eşi: durum.rng aynı ilerler
  const { d: d0 } = kahramanli(kalabalik(6), 'avci');
  const c = ilerle(isaretli(d0, 'ayi').d, 5);
  assert.equal(a.d.rng, c.d.rng);
});

test('geri çağırma yalnız gönderildiği tur: erzakın yarısı iade', () => {
  const { d } = kahramanli(kalabalik(6), 'kasif');
  const r = seferGonder(d, 'kesif', null, { kahraman: ['h1'] });
  const g = seferGeriCagir(r.durum, r.uid);
  assert.ok(!g.hata);
  assert.equal(g.durum.sefer.aktif.length, 0);
  assert.equal(g.durum.kaynaklar.yiyecek, r.durum.kaynaklar.yiyecek + Math.floor(r.durum.sefer.aktif[0].erzak / 2));
  const sonra = ilerle(r.durum).d;
  if (sonra.sefer.aktif.length) assert.match(seferGeriCagir(sonra, r.uid).hata, /geri çağrılamaz/);
});

test('işaretler: ISARET_SURE tur sonra kaybolur; kaybolan ayı ayı tehdidini ağırlaştırır (+gerginlik)', () => {
  const { d, uid } = isaretli(kalabalik(), 'ayi');
  assert.equal(d.hedefIsaretleri[0].kalan, ISARET_SURE);
  let x = d;
  for (let i = 0; i < ISARET_SURE - 1; i++) x = adimIsaret(x, []);
  assert.ok(x.hedefIsaretleri.some((i) => i.uid === uid));
  const g0 = x.tehdit.gerginlik;
  const bl = [];
  x = adimIsaret(x, bl);
  assert.ok(!x.hedefIsaretleri.some((i) => i.uid === uid));
  assert.ok(bl.some((b) => b.kod === 'sefer_isaret_kayboldu'));
  assert.ok(x.sefer.ayiKacti > 0);
  assert.ok(x.tehdit.gerginlik > g0);
  // İşaret yalnız keşifli, geçilebilir karoda
  for (let i = 0; i < 3; i++) x = isaretli(x, 'harabe').d;
  assert.ok(x.hedefIsaretleri.length <= 3);
});

test(`ilk ayı işareti ${ILK_AYI_GUN[0]}–${ILK_AYI_GUN[1]}. günler arasında garanti (20 tohum)`, () => {
  for (let t = 1; t <= 20; t++) {
    let d = yeniOyun(t);
    let gun = null;
    for (let i = 0; i < 14 && gun === null; i++) {
      d = adimIsaret({ ...d, tur: d.tur + 1 }, []);
      if (d.hedefIsaretleri.some((x) => x.tur === 'ayi')) gun = d.tur + 1;
    }
    assert.ok(gun >= ILK_AYI_GUN[0] && gun <= ILK_AYI_GUN[1], `tohum ${t}: gün ${gun}`);
  }
});

test('(g) tehdit varışında seferdeki ekip (önder, işçi, bekçi kahraman) savunmadan düşer', () => {
  const { d: d0, uid: h } = kahramanli(kalabalik(8, { atama: { 'serbest:bekci': 4, 'serbest:toplayici': 4 } }), 'avci', { gorev: { tur: 'bekci', hedef: null } });
  const d = { ...d0, tehdit: { ...d0.tehdit, aktif: { id: 'kurt_surusu', guc: 30, aralik: [24, 36], kalan: 1, ...AKTIF_VARSAYILAN, bilinen: true } } };
  assert.ok(savunmaDokum(d).some((k) => k.id === `kahraman:${h}`));
  const s = seferGonder(d, 'kesif', null, { kahraman: [h], isci: 2, onder: true }).durum;
  assert.ok(savunmaHesapla(s) < savunmaHesapla(d));
  assert.ok(!savunmaDokum(s).some((k) => k.id === `kahraman:${h}` || k.id === 'onder'));
  const a = turIlerlet(d).durum, b = turIlerlet(s).durum;
  assert.ok(b.tehdit.gecmis.at(-1).savunma < a.tehdit.gecmis.at(-1).savunma);
  assert.equal(b.tehdit.gecmis.at(-1).savunma, Math.round(savunmaHesapla(s) * 100) / 100);
  assert.match(seferOnizleme(d, 'kesif', null, { kahraman: [h] }).uyari, /tehdit gelir/);
});

test('Ayı Avı başarısı aktif ayı tehdidini iptal eder; büyük başarıda Ayı Postu', () => {
  const { d: d0, uid: h } = kahramanli(kalabalik(6), 'avci', { seviye: 5 });
  const { d: d1, uid } = isaretli(d0, 'ayi');
  const d = { ...d1, tehdit: { ...d1.tehdit, aktif: { id: 'ayi', guc: 10, aralik: [8, 12], kalan: 5, ...AKTIF_VARSAYILAN } } };
  let s = seferGonder(d, 'ayi_avi', uid, { kahraman: [h], isci: 2 }).durum;
  s.sefer.aktif[0].kalan = 1;
  const bl = [];
  const x = adimSefer(s, bl);
  assert.equal(bl.find((b) => b.kod === 'sefer_dondu').sonuc, 'buyuk');
  assert.equal(x.tehdit.aktif, null);
  assert.ok(x.sandik.includes('ayi_postu'));
  assert.ok(!x.hedefIsaretleri.some((i) => i.uid === uid));
});

test('yolda sefer olayı oyunu durdurmaz; seçim süreyi uzatır; olay kotasını doldurur', () => {
  const { d: d0, uid: h } = kahramanli(kalabalik(6, { tur: 10 }), 'avci');
  const { d, uid } = isaretli(d0, 'harabe');
  let s = seferGonder(d, 'harabe', uid, { kahraman: [h] }).durum;
  s.sefer.aktif[0].kalan = 3;
  // olay çıkana kadar farklı sefer.rng dene
  let x = null;
  for (let i = 0; i < 50 && !x?.sefer.aktif[0]?.olay; i++) x = adimSefer({ ...s, sefer: { ...s.sefer, rng: i * 7919 } }, []);
  assert.ok(x.sefer.aktif[0].olay);
  assert.ok(x.istatistik.sonTur.seferOlayi);
  assert.equal(x.olay.aktif, null);
  const kalan = x.sefer.aktif[0].kalan;
  const r = seferOlayCoz(x, x.sefer.aktif[0].uid, x.sefer.aktif[0].olay.id === 'nehir_tasti' ? 0 : 1);
  assert.equal(r.durum.sefer.aktif[0].kalan, kalan + 1);
  assert.match(seferOlayCoz(r.durum, x.sefer.aktif[0].uid, 0).hata, /bekleyen olay yok/);
  assert.equal(seferGorunumu(x).aktif[0].olay.secenekler.length, 2);
});

test('keşif seferi: harita açar, BP; seferGorunumu alanları', () => {
  const { d, uid: h } = kahramanli(kalabalik(6), 'kasif', { seviye: 3 });
  let s = seferGonder(d, 'kesif', null, { kahraman: [h], isci: 1 }).durum;
  s.sefer.aktif[0].kalan = 1;
  const bl = [];
  const x = adimSefer(s, bl);
  const b = bl.find((y) => y.kod === 'sefer_dondu');
  assert.ok(['buyuk', 'basari'].includes(b.sonuc));
  assert.notEqual(x.harita.kesif, s.harita.kesif);
  assert.ok(x.bilgiHavuz > s.bilgiHavuz || x.arastirma);
  const g = seferGorunumu(x);
  assert.ok(Array.isArray(g.isaretler) && g.turler.some((t) => t.id === 'kesif' && t.acik));
  assert.equal(g.son.at(-1).sonuc, b.sonuc);
});

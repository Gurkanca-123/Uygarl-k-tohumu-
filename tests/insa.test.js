import test from 'node:test';
import assert from 'node:assert/strict';
import {
  maliyetHesapla, insaEt, yukselt, onar, yik, adimInsaat, adimBakim, yukseltmeMaliyeti, enYuksekSeviye,
} from '../src/core/insa.js';
import { hamUretimHesapla } from '../src/core/uretim.js';
import { huzurHedefi } from '../src/core/huzur.js';
import { isAta } from '../src/core/nufus.js';
import { turIlerlet } from '../src/core/tur.js';
import { isciYuvasi } from '../src/core/yardimci.js';
import { durum, binaEkle, karoKoy, K } from './yardimci/durum.js';

const bol = { yiyecek: 30, odun: 30, tas: 30, deri: 30 };

test('§7.2 maliyet artışı: konut k=1,10, diğer k=1,15; taban altına inmez', () => {
  const d = durum();
  assert.deepEqual(maliyetHesapla(d, 'cadir'), { odun: 6, deri: 2 }); // 2. Çadır: 5,5 → 6
  assert.deepEqual(maliyetHesapla(d, 'avci_kulubesi'), { odun: 8 });
  const iki = binaEkle(d, 'avci_kulubesi', K + 5, K + 5);
  assert.deepEqual(maliyetHesapla(iki, 'avci_kulubesi'), { odun: 9 });
});

test('insaEt: maliyet anında düşer, sıraya girer; inşaattaki binaya işçi önceden atanabilir', () => {
  const d0 = durum({ kaynaklar: { ...bol } });
  const r = insaEt(d0, 'oduncu_kampi', K + 5, K + 5);
  assert.equal(r.hata, undefined);
  assert.equal(r.durum.kaynaklar.odun, 24);
  assert.deepEqual(r.durum.insaatSirasi, [r.uid]);
  assert.equal(r.durum.binalar.at(-1).insaKalan, 1);
  const a = isAta(isAta(r.durum, 'serbest:toplayici', 1).durum, r.uid, 2);
  assert.equal(a.hata, undefined);
  // b adımında biter ve AYNI tur üretir (§1.2 b)
  const t = turIlerlet(a.durum).durum;
  assert.deepEqual(t.insaatSirasi, []);
  assert.equal(t.istatistik.sonTur.uretim.odun, 4);
});

test('insaEt reddi: eşzamanlı sınır, yerleşim sınırı, dolu karo, karo türü, tekil, buluş, kaynak', () => {
  const d0 = durum({ kaynaklar: { ...bol } });
  const bir = insaEt(d0, 'oduncu_kampi', K + 5, K + 5).durum;
  assert.match(insaEt(bir, 'oduncu_kampi', K + 5, K + 6).hata, /Aynı anda en çok 1/);
  assert.match(insaEt(d0, 'oduncu_kampi', K + 0, K + 0).hata, /yerleşim sınırının dışında/);
  assert.match(insaEt(d0, 'oduncu_kampi', K + 7, K + 7).hata, /dolu/);
  assert.match(insaEt(karoKoy(d0, K + 5, K + 5, 'orman'), 'oduncu_kampi', K + 5, K + 5).hata, /inşa edilemez/);
  assert.match(insaEt(d0, 'totem', K + 5, K + 5).hata, /Taş Yontma/);
  const t = binaEkle({ ...d0, buluslar: ['tas_yontma'] }, 'totem', K + 4, K + 4);
  assert.match(insaEt(t, 'totem', K + 5, K + 5).hata, /tekil/);
  assert.match(insaEt(durum(), 'avci_kulubesi', K + 5, K + 5).hata, /Kaynak yetersiz: Odun 2/);
  assert.match(insaEt(d0, 'kulube', K + 5, K + 5).hata, /gereken çağ/);
  assert.match(insaEt(d0, 'kamp_atesi', K + 5, K + 5).hata, /Merkez/);
  assert.equal(insaEt(d0, 'kulube', K + 5, K + 5).durum, d0);
});

test('yükseltme: Sv2 taban × 1,5; çalışmaya devam eder; Sv3 sonraki çağda; yuva +1', () => {
  let d = binaEkle(durum({ kaynaklar: { ...bol }, atama: { k: 2, 'serbest:toplayici': 1 } }), 'oduncu_kampi', K + 5, K + 5, { uid: 'k' });
  assert.deepEqual(yukseltmeMaliyeti(d.binalar.at(-1)), { odun: 9 });
  const r = yukselt(d, 'k');
  assert.equal(r.hata, undefined);
  assert.equal(r.durum.kaynaklar.odun, 21);
  assert.equal(hamUretimHesapla(r.durum).toplam.odun, 4); // yükseltme sırasında çalışır
  assert.match(yukselt(r.durum, 'k').hata, /süren bir iş/);
  d = adimInsaat(r.durum);
  const k = d.binalar.find((b) => b.uid === 'k');
  assert.equal(k.seviye, 2);
  assert.equal(isciYuvasi(k), 3);
  assert.match(yukselt(d, 'k').hata, /sonraki çağda/);
  assert.equal(enYuksekSeviye({ ...d, cag: 'tasdevri' }, 'oduncu_kampi'), 3);
  assert.equal(enYuksekSeviye({ ...d, cag: 'ortacag' }, 'katedral'), 1);
  assert.equal(enYuksekSeviye({ ...d, cag: 'ortacag' }, 'han'), 2);
  assert.equal(enYuksekSeviye({ ...d, cag: 'ortacag', buluslar: ['gotik_mimari'] }, 'han'), 3);
});

test('onarım: taban × 0,25, 1 tur; yıkım: taban × 0,5 iade, işçiler işsiz; merkez yıkılmaz', () => {
  let d = binaEkle(durum({ kaynaklar: { ...bol, odun: 20 }, atama: { k: 2 } }), 'oduncu_kampi', K + 5, K + 5, { uid: 'k', hasarli: true });
  assert.match(onar(durum(), 'b2').hata, /hasarlı değil/);
  const o = onar(d, 'k');
  assert.equal(o.durum.kaynaklar.odun, 20 - 2); // round(6 × 0,25) = 2 (1,5 → 2)
  d = adimInsaat(o.durum);
  assert.equal(d.binalar.find((b) => b.uid === 'k').hasarli, false);
  const y = yik(d, 'k').durum;
  assert.equal(y.kaynaklar.odun, 18 + 3);
  assert.equal(yik({ ...d, kaynaklar: { ...d.kaynaklar, odun: 29 } }, 'k').durum.kaynaklar.odun, 30); // iade depo tavanında durur
  assert.equal(y.binalar.some((b) => b.uid === 'k'), false);
  assert.deepEqual(y.atama, {});
  assert.match(yik(d, 'b1').hata, /Merkez/);
});

test('adım c: bakımı ödenemeyen bina bu tur kapalı (huzur yok); ödenince açık', () => {
  let d = binaEkle(durum({ cag: 'bronz', kaynaklar: { yiyecek: 0, odun: 0, tas: 0, deri: 0 } }), 'mabet', K + 4, K + 4, { uid: 'm' });
  const b = [];
  const kapali = adimBakim(d, b);
  assert.deepEqual(kapali.istatistik.sonTur.kapali, ['m']);
  assert.equal(b[0].kod, 'bakim_yok');
  assert.equal(huzurHedefi(kapali).parcalar.binalar, 0);
  const acik = adimBakim({ ...d, kaynaklar: { yiyecek: 2 } });
  assert.deepEqual(acik.istatistik.sonTur.kapali, []);
  assert.equal(acik.kaynaklar.yiyecek, 1);
  assert.equal(huzurHedefi(acik).parcalar.binalar, 12);
});

test('ilk dakika: yeni oyunda (başlangıç kaynağıyla) ilk Çadır ilk günde kurulabilir', () => {
  const d = durum();
  const r = insaEt(d, 'cadir', K + 5, K + 5);
  assert.equal(r.hata, undefined);
  assert.equal(r.durum.kaynaklar.odun, 0);
  assert.equal(r.durum.kaynaklar.deri, 0);
});

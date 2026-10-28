// Kahramanlar (docs/AKSIYON.md §3): ilk kahraman teklifi, terfi/Ateş Yemini, XP/seviye/yetenek, görev yeri, eşya, ölümsüzlük.
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum, binaEkle, K } from './yardimci/durum.js';
import { kahramanli, ilerle } from './yardimci/aksiyon.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';
import {
  kahramanTerfi, kahramanGorev, kahramanEsyaGiy, kahramanEsyaCikar, esyaYap, kahramanGorunumu, xpEkle, seviyeHesapla,
  kahramanGucu, ilkKahramanTeklifi,
} from '../src/core/kahraman.js';
import { hamUretimHesapla } from '../src/core/uretim.js';
import { savunmaDokum } from '../src/core/savunma.js';
import { etkinAtama, issizSayisi } from '../src/core/yardimci.js';
import { kayipHakki } from '../src/core/nufus.js';
import { adimSefer } from '../src/core/sefer.js';
import { AKTIF_VARSAYILAN } from '../src/core/tehdit.js';
import { XP_ESIK } from '../src/data/kahramanlar.js';
import { KAHRAMAN_ILK_GUN } from '../src/data/denge.js';

const toplam = (o) => Object.values(o).reduce((a, x) => a + x, 0);

test(`(c) ilk kahraman teklifi "Ateş Başında Bir Ses" ${KAHRAMAN_ILK_GUN}. günde garanti; oyunu durdurmaz; Avcı ya da Kaşif`, () => {
  for (const t of [1, 2, 3, 7, 11]) {
    let d = yeniOyun(t);
    let gun = null;
    for (let i = 0; i < 10 && gun === null; i++) {
      const r = ilerle(d);
      d = r.d;
      if (r.bildirimler.some((b) => b.kod === 'kahraman_teklif')) gun = d.tur + 1;
    }
    assert.equal(gun, KAHRAMAN_ILK_GUN, `tohum ${t}`);
    assert.deepEqual(d.kahramanDurum.teklif.siniflar, ['avci', 'kasif']);
  }
  const d = { ...yeniOyun(1), tur: 5 };
  const x = structuredClone(d);
  ilkKahramanTeklifi(x, []);
  assert.match(kahramanTerfi(x, 'saman').hata, /henüz yok/);
  const r = kahramanTerfi(x, 'kasif');
  assert.ok(!r.hata, r.hata);
  assert.equal(r.durum.kahramanlar[0].sinif, 'kasif');
  assert.equal(r.durum.kahramanDurum.teklif, null);
  assert.equal(r.durum.nufus, 3); // nüfustan terfi
  assert.equal(toplam(etkinAtama(r.durum)), 2); // işçi yuvasına girmez
  assert.equal(issizSayisi(r.durum), 0);
  assert.ok(r.bildirimler.some((b) => b.kod === 'kahraman_yeni'));
});

test('Ateş Yemini (teklifsiz terfi): maliyet, çağ başına 1, tavan, köyde ≥2 sıradan kişi', () => {
  const d = durum({ nufus: 4, kaynaklar: { yiyecek: 25, odun: 0, tas: 0, deri: 6 } });
  const r = kahramanTerfi(d, 'avci');
  assert.ok(!r.hata, r.hata);
  assert.deepEqual([r.durum.kaynaklar.yiyecek, r.durum.kaynaklar.deri], [15, 3]);
  assert.match(kahramanTerfi(r.durum, 'kasif').hata, /en çok 1 kahraman/);
  const t = { ...r.durum, cag: 'tasdevri', nufus: 3 };
  assert.match(kahramanTerfi(t, 'kasif').hata, /iki sıradan kişi/);
  const t2 = { ...t, nufus: 6, kaynaklar: { ...t.kaynaklar, yiyecek: 20, alet: 4 } };
  const r2 = kahramanTerfi(t2, 'kasif');
  assert.ok(!r2.hata, r2.hata);
  assert.match(kahramanTerfi({ ...r2.durum, kahramanlar: r2.durum.kahramanlar.slice(0, 1) }, 'kasif').hata, /zaten yapıldı/);
  assert.match(kahramanTerfi(durum({ nufus: 4, kaynaklar: { yiyecek: 2 } }), 'avci').hata, /Kaynak yetersiz/);
  assert.equal(kahramanTerfi(d, 'avci').durum === d, false);
  assert.equal(kahramanTerfi(durum({ nufus: 4 }), 'xx').hata, 'Bu sınıf henüz yok.');
});

test('XP eşikleri 0/10/25/45/70; seviye atlama bildirimi, yetenek açılır; Kurt Dişi XP +%25', () => {
  assert.deepEqual(XP_ESIK.map(seviyeHesapla), [1, 2, 3, 4, 5]);
  assert.equal(seviyeHesapla(9), 1);
  const { d, uid } = kahramanli(durum({ nufus: 5 }), 'avci');
  const k = d.kahramanlar[0];
  const bl = [];
  xpEkle(d, k, 25, bl);
  assert.equal(k.seviye, 3);
  assert.match(bl[0].metin, /Pusu/);
  k.esya.tilsim = 'kurt_disi';
  xpEkle(d, k, 8, []);
  assert.equal(k.xp, 35);
  assert.equal(kahramanGucu(k, null), 2 + 3);
  assert.ok(uid);
});

test('görev yeri: usta +%25 bina üretimi (bina başına 1), bekçi savunma kalemi, danışman Kaşif Sv3 tehdit gücünü kesinleştirir', () => {
  let d = binaEkle(durum({ nufus: 5, atama: {} }), 'toplayici_barinagi', K + 4, K + 4, { uid: 'tb' });
  d = { ...d, atama: { tb: 2, 'serbest:toplayici': 2 } };
  const { d: d1, uid } = kahramanli(d, 'avci');
  const once = hamUretimHesapla(d1).kaynaklar.tb.yiyecek;
  const u = kahramanGorev(d1, uid, { tur: 'usta', hedef: 'tb' });
  assert.ok(!u.hata, u.hata);
  assert.ok(Math.abs(hamUretimHesapla(u.durum).kaynaklar.tb.yiyecek - once * 1.25) < 1e-9);
  const { d: d2, uid: u2 } = kahramanli(u.durum, 'kasif');
  assert.match(kahramanGorev(d2, u2, { tur: 'usta', hedef: 'tb' }).hata, /zaten bir usta/);
  assert.match(kahramanGorev(d2, u2, { tur: 'usta', hedef: 'b1' }).hata, /usta olunamaz/);
  assert.equal(kahramanGorev(d2, u2, 'yok').hata, 'Geçersiz görev.');
  const b = kahramanGorev(d2, uid, 'bekci').durum;
  assert.equal(savunmaDokum(b).find((x) => x.id === `kahraman:${uid}`).deger, 1 + 1);
  b.kahramanlar[0].yarali = 2;
  assert.ok(!savunmaDokum(b).some((x) => x.id === `kahraman:${uid}`), 'yaralı bekçi sayılmaz');
  let dn = kahramanGorev(d2, u2, 'danisman').durum;
  dn.kahramanlar[1].seviye = 3;
  dn = { ...dn, tehdit: { ...dn.tehdit, aktif: { id: 'kurt_surusu', guc: 5, aralik: [4, 6], kalan: 3, ...AKTIF_VARSAYILAN } } };
  assert.equal(adimSefer(dn, []).tehdit.aktif.bilinen, true);
});

test('eşya: sandıktan giy, aynı yuvadaki sandığa döner; çıkar; Taş Mızrak tarifi; seferdeyken değişmez', () => {
  const { d: d0, uid } = kahramanli(durum({ nufus: 5, sandik: ['tas_mizrak', 'eski_harita', 'sifali_ot'] }), 'avci');
  let r = kahramanEsyaGiy(d0, uid, 'eski_harita');
  r = kahramanEsyaGiy(r.durum, uid, 'sifali_ot');
  assert.equal(r.durum.kahramanlar[0].esya.tilsim, 'sifali_ot');
  assert.deepEqual([...r.durum.sandik].sort(), ['eski_harita', 'tas_mizrak']);
  assert.match(kahramanEsyaGiy(r.durum, uid, 'ayi_postu').hata, /sandıkta yok/);
  const c = kahramanEsyaCikar(r.durum, uid, 'tilsim');
  assert.equal(c.durum.kahramanlar[0].esya.tilsim, null);
  assert.match(kahramanEsyaCikar(c.durum, uid, 'tilsim').hata, /boş/);
  let t = binaEkle({ ...durum({ nufus: 5 }), cag: 'tasdevri', kaynaklar: { yiyecek: 10, alet: 2, deri: 1 } }, 'alet_yapimcisi', K + 4, K + 4);
  const e = esyaYap(t, 'tas_mizrak');
  assert.ok(!e.hata, e.hata);
  assert.deepEqual(e.durum.sandik, ['tas_mizrak']);
  assert.match(esyaYap(e.durum, 'tas_mizrak').hata, /Kaynak yetersiz/);
  assert.match(esyaYap(t, 'ayi_postu').hata, /yapılamaz/);
});

test('kahraman ölmez: kayıp hakkı kahramanları ve seferdeki işçileri saymaz', () => {
  const { d } = kahramanli(durum({ nufus: 3 }), 'avci');
  assert.equal(kayipHakki(d), 1); // 3 − 1 kahraman = 2 sıradan; NUFUS_MIN 2 → tavan 1 (pencere sınırı)
  const x = { ...d, nufus: 3, sefer: { ...d.sefer, aktif: [{ ekip: { kahraman: [], isci: 2, onder: false } }] } };
  assert.equal(kayipHakki(x), 0);
});

test('kahramanGorunumu: kart alanları, sandık, teklif, terfi bilgisi', () => {
  const { d } = kahramanli(durum({ nufus: 5, sandik: ['kurt_disi'] }), 'kasif', { seviye: 3 });
  const g = kahramanGorunumu(d);
  assert.equal(g.liste[0].sinifAd, 'Kaşif');
  assert.deepEqual(g.liste[0].yetenekler.map((y) => y.acik), [true, true, false]);
  assert.equal(g.liste[0].xpSonraki, XP_ESIK[3]);
  assert.equal(g.sandik[0].yuvaAd, 'Tılsım');
  assert.equal(g.teklif, null);
  assert.ok(g.terfi.every((t) => t.hata));
  assert.equal(g.tavan, 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { cagSartlari, cagAtla, adimTakvim, zaferSaglandi } from '../src/core/cag.js';
import { vergiAyarla, takasYap, mevsimSonunaIlerlet, isAta, insaEt, onderEylemiSec, arastirmaSec } from '../src/core/komutlar.js';
import { depoTavani } from '../src/core/yardimci.js';
import { durum, binaEkle, K } from './yardimci/durum.js';

// Göçebe → Taş Devri şartlarının tamamı sağlanmış durum (§4.1).
function hazir() {
  let d = durum({ tur: 24, nufus: 8, atama: { 'serbest:toplayici': 8 }, buluslar: ['mizrak_ucu', 'tas_yontma', 'deri_isleme', 'yerlesik_hayat'],
    kaynaklar: { yiyecek: 35, odun: 25, tas: 15, deri: 10 } });
  d = binaEkle(d, 'cadir', K + 4, K + 4);
  d = binaEkle(d, 'cadir', K + 5, K + 4);
  d = binaEkle(d, 'totem', K + 6, K + 4);
  d = binaEkle(d, 'kurutma_rafi', K + 7, K + 4);
  return d;
}

test('(e) çağ atlama şartları: nüfus, binalar, buluş, maliyet; eksikler Türkçe listelenir', () => {
  assert.deepEqual(cagSartlari(hazir()), { uygun: true, eksikler: [], sonraki: cagSartlari(hazir()).sonraki });
  const s = cagSartlari(durum());
  assert.equal(s.uygun, false);
  assert.ok(s.eksikler.includes('Nüfus 3/8'));
  assert.ok(s.eksikler.includes('Çadır 1/3'));
  assert.ok(s.eksikler.includes('Totem 0/1'));
  assert.ok(s.eksikler.includes('Buluş: Yerleşik Hayat'));
  assert.ok(s.eksikler.some((x) => x.startsWith('Kaynak eksik')));
  // inşaattaki bina sayılmaz
  const i = hazir();
  i.binalar.find((b) => b.id === 'totem').insaKalan = 1;
  i.insaatSirasi.push(i.binalar.find((b) => b.id === 'totem').uid);
  assert.ok(cagSartlari(i).eksikler.includes('Totem 0/1'));
  assert.equal(cagSartlari({ ...hazir(), kaynaklar: { ...hazir().kaynaklar, deri: 9 } }).uygun, false);
});

test('cagAtla: maliyet ödenir, merkez dönüşür, yeni kaynak açılır, açık alan ve depo büyür', () => {
  const r = cagAtla(hazir());
  assert.equal(r.hata, undefined);
  const d = r.durum;
  assert.equal(d.cag, 'tasdevri');
  assert.equal(d.cagBaslangicTuru, 24);
  assert.equal(d.binalar.find((b) => b.uid === 'b1').id, 'ocak_meydani');
  assert.deepEqual(d.kaynaklar, { yiyecek: 5, odun: 0, tas: 0, deri: 0, alet: 0 });
  assert.equal(depoTavani(d, 'odun'), 60);
  assert.equal(r.bildirimler[0].kod, 'cag_atlandi');
  assert.match(cagAtla(durum()).hata, /Çağ atlanamaz/);
  assert.equal(cagAtla(durum()).durum.cag, 'gocebe');
  // Kulübe artık kurulabilir, alet_yap açıldı
  assert.equal(insaEt({ ...d, kaynaklar: { ...d.kaynaklar, odun: 20, tas: 10 } }, 'kulube', K + 4, K + 6).hata, undefined);
  assert.equal(onderEylemiSec({ ...d, kaynaklar: { ...d.kaynaklar, tas: 5, odun: 5 } }, 'alet_yap').hata, undefined);
});

test('adım o: tur +1; şartlar sağlanınca bir kez bildirim; son çağda zafer → serbest kip', () => {
  const b = [];
  const d = adimTakvim(hazir(), b);
  assert.equal(d.tur, 25);
  assert.equal(b[0].kod, 'cag_hazir');
  const b2 = [];
  adimTakvim(d, b2);
  assert.equal(b2.length, 0);
  let o = binaEkle(durum({ cag: 'ortacag', nufus: 150, atama: {} }), 'katedral', K + 2, K + 2);
  assert.equal(zaferSaglandi(o), true);
  o = adimTakvim(o);
  assert.deepEqual(o.istatistik.zafer, { tur: 1 });
  assert.equal(o.istatistik.serbestKip, true);
  assert.match(cagAtla(o).hata, /Son çağdasın/);
});

test('vergi: Para buluşu gerekir; düzey geçerli olmalı', () => {
  assert.match(vergiAyarla(durum(), 'dusuk').hata, /Para/);
  const d = durum({ cag: 'antik', buluslar: ['para'] });
  assert.equal(vergiAyarla(d, 'yuksek').durum.vergi, 'yuksek');
  assert.match(vergiAyarla(d, 'cok').hata, /Geçersiz/);
});

test('takas: Pazar Yeri 3 → 2, tur başına en çok 20 birim; ticaret kapalıyken yok', () => {
  assert.match(takasYap(durum(), 'odun', 'tas', 3).hata, /Pazar/);
  const d = binaEkle(durum({ cag: 'bronz', tur: 30, kaynaklar: { yiyecek: 0, odun: 60, tas: 0, deri: 0, kil: 0 } }), 'pazar_yeri', K + 4, K + 4);
  const r = takasYap(d, 'odun', 'kil', 15);
  assert.equal(r.alinan, 10);
  assert.equal(r.durum.kaynaklar.odun, 45);
  assert.match(takasYap(r.durum, 'odun', 'kil', 6).hata, /en çok 5/);
  assert.equal(takasYap({ ...r.durum, tur: 31 }, 'odun', 'kil', 6).hata, undefined);
  assert.match(takasYap(d, 'odun', 'mermer', 3).hata, /Geçersiz/);
  const kapali = { ...d, degistiriciler: [{ id: 'karantina', kalan: 2, etki: { ticaretKapali: true } }] };
  assert.match(takasYap(kapali, 'odun', 'kil', 3).hata, /kapalı/);
});

test('bekleyen olay varken komutlar kilitli (olayCoz hariç)', () => {
  const d = durum({ olay: { aktif: { id: 'firtina' }, bekleme: {}, zincir: [], kurtarmaKullanildi: {} } });
  for (const r of [isAta(d, 'serbest:avci', 1), insaEt(d, 'cadir', K + 5, K + 5), arastirmaSec(d, 'mizrak_ucu'),
    onderEylemiSec(d, 'avlan'), cagAtla(d), mevsimSonunaIlerlet(d)]) {
    assert.match(r.hata, /bekleyen olayı çöz/);
    assert.equal(r.durum, d);
  }
});

test('mevsim sonuna ilerlet: en çok 5 tur, önder Dinlen; mevsim bitince durur', () => {
  const r = mevsimSonunaIlerlet(durum({ onder: { yorgunluk: 0, yaraliKalan: 0, eylem: 'avlan', secim: null } }));
  assert.equal(r.durum.tur, 5);
  assert.equal(r.turSayisi, 5);
  assert.equal(r.neden, 'mevsim_sonu');
  assert.equal(r.durum.kaynaklar.deri, 0); // Avlan değil Dinlen
  const orta = mevsimSonunaIlerlet(durum({ tur: 2 }));
  assert.equal(orta.durum.tur, 5);
  assert.equal(orta.turSayisi, 3);
  const ins = mevsimSonunaIlerlet(insaEt(durum({ tur: 6, kaynaklar: { yiyecek: 20, odun: 10, tas: 0, deri: 0 } }), 'oduncu_kampi', K + 5, K + 5).durum);
  assert.equal(ins.neden, 'insaat');
  assert.equal(ins.turSayisi, 1);
});

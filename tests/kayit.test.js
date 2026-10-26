import test from 'node:test';
import assert from 'node:assert/strict';
import { serialize, yukle, kaydet, oku, ANAHTARLAR, KayitHatasi, KAYIT_SURUM } from '../src/save/kayit.js';
import { yeniOyun, turIlerlet } from '../src/core/oyun_durumu.js';
import { rngSonraki } from '../src/core/rng.js';

function sahteDepo() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

test('kaydet → yükle aynı durumu verir', () => {
  let d = yeniOyun(77);
  d = turIlerlet(turIlerlet(d).durum).durum;
  d = { ...d, kaynaklar: { ...d.kaynaklar, alet: 3 }, buluslar: ['mizrak_ucu'], arastirma: { id: 'tas_yontma', ilerleme: 4 } };
  assert.deepEqual(yukle(serialize(d)), d);
});

test('RNG durumu kayda girer: yüklenen kayıt aynı zarı atar', () => {
  const d = { ...yeniOyun(99), rng: rngSonraki(rngSonraki(yeniOyun(99).rng).rng).rng };
  const y = yukle(serialize(d));
  assert.equal(y.tohum, 99);
  assert.equal(y.rng, d.rng);
  assert.equal(rngSonraki(y.rng).deger, rngSonraki(d.rng).deger);
});

test('beyaz liste: bilinmeyen alanlar atılır (üst düzey ve iç içe)', () => {
  const d = yeniOyun();
  const ham = JSON.parse(serialize(d));
  ham.hile = true;
  ham.onder.uçmak = 1;
  ham.kaynaklar.altin = 999;
  ham.binalar[0].sihir = 'x';
  const y = yukle(JSON.stringify(ham));
  assert.equal('hile' in y, false);
  assert.equal('uçmak' in y.onder, false);
  assert.equal('altin' in y.kaynaklar, false);
  assert.equal('sihir' in y.binalar[0], false);
  assert.deepEqual(y, d);
});

test('eksik alanlar yeniOyun varsayılanıyla doldurulur', () => {
  const y = yukle(JSON.stringify({ surum: KAYIT_SURUM, tohum: 5, tur: 12, nufus: 6 }));
  const v = yeniOyun(5);
  assert.equal(y.tur, 12);
  assert.equal(y.nufus, 6);
  assert.equal(y.huzur, v.huzur);
  assert.equal(y.rng, v.rng);
  assert.deepEqual(y.binalar, v.binalar);
  assert.deepEqual(Object.keys(y).sort(), Object.keys(v).sort());
});

test('tür hatalı alanlar ve geçersiz kimlikler süzülür', () => {
  const ham = JSON.parse(serialize(yeniOyun()));
  ham.huzur = 'çok';
  ham.cag = 'uzay_cagi';
  ham.buluslar = ['mizrak_ucu', 'isinlanma', 5];
  ham.binalar.push({ uid: 'b9', id: 'uzay_ussu', x: 1, y: 1 });
  ham.binalar.push({ uid: 'b10', id: 'kulube', x: 2, y: 2 }); // eksik seviye vb. → varsayılan
  ham.harita.kesif = 'zz';
  ham.olay.bekleme = { kurt_surusu: 3, yok_olay: 2 };
  const y = yukle(JSON.stringify(ham));
  assert.equal(y.huzur, 60);
  assert.equal(y.cag, 'gocebe');
  assert.deepEqual(y.buluslar, ['mizrak_ucu']);
  assert.deepEqual(y.binalar.map((b) => b.uid), ['b1', 'b2', 'b10']);
  assert.deepEqual(y.binalar[2], { uid: 'b10', id: 'kulube', x: 2, y: 2, seviye: 1, insaKalan: 0, hasarli: false });
  assert.deepEqual(y.harita, yeniOyun().harita); // bozuk harita → varsayılan
  assert.deepEqual(y.olay.bekleme, { kurt_surusu: 3 });
});

test('null alanlar korunur (arastirma, onder.eylem, kalıcı değiştirici)', () => {
  const d = { ...yeniOyun(), degistiriciler: [{ id: 'lonca_ayricalik', kalan: null, etki: { bakim: { sikke: 2 } } }] };
  const y = yukle(serialize(d));
  assert.equal(y.arastirma, null);
  assert.equal(y.onder.eylem, null);
  assert.equal(y.degistiriciler[0].kalan, null);
});

test('sürüm denetimi: sürümsüz, yeni sürüm ve bozuk JSON reddedilir', () => {
  assert.throws(() => yukle('{"tur":3}'), KayitHatasi);
  assert.throws(() => yukle(JSON.stringify({ surum: KAYIT_SURUM + 1 })), KayitHatasi);
  assert.throws(() => yukle('{bozuk'), KayitHatasi);
  assert.throws(() => yukle('[]'), KayitHatasi);
});

test('göçler sırayla uygulanır, eksik göç hata verir', () => {
  const sira = [];
  const gocler = {
    1: (d) => { sira.push(1); return { ...d, kaynaklar: d.stok }; },      // 1 → 2: "stok" alanı "kaynaklar" oldu
    2: (d) => { sira.push(2); return { ...d, nufus: d.nufus + 1 }; },     // 2 → 3
  };
  const y = yukle(JSON.stringify({ surum: 1, tohum: 4, nufus: 5, stok: { yiyecek: 3 } }), gocler, 3);
  assert.deepEqual(sira, [1, 2]);
  assert.equal(y.surum, 3);
  assert.deepEqual(y.kaynaklar, { yiyecek: 3 });
  assert.equal(y.nufus, 6);
  assert.equal('stok' in y, false);
  assert.throws(() => yukle(JSON.stringify({ surum: 1 }), { 1: (d) => d }, 3), KayitHatasi);
});

test('depo: kaydet/oku, kayıt yoksa null, bozuksa :bozuk yedeği + yeni oyun', () => {
  const depo = sahteDepo();
  assert.deepEqual(oku(depo, ANAHTARLAR.otomatik), { durum: null, hata: null });
  const d = turIlerlet(yeniOyun(3)).durum;
  kaydet(depo, ANAHTARLAR.otomatik, d);
  assert.deepEqual(oku(depo, ANAHTARLAR.otomatik).durum, d);

  depo.setItem(ANAHTARLAR.elle, '{çöp');
  const r = oku(depo, ANAHTARLAR.elle, 11);
  assert.equal(r.hata, 'Kayıt okunamadı');
  assert.deepEqual(r.durum, yeniOyun(11));
  assert.equal(depo.getItem(ANAHTARLAR.elle + ':bozuk'), '{çöp');
  assert.equal(depo.getItem(ANAHTARLAR.elle), '{çöp'); // eski kayıt silinmez
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { arastirmaSec, adimArastirma, bilgiUretimi } from '../src/core/arastirma.js';
import { turIlerlet } from '../src/core/tur.js';
import { durum, binaEkle, K } from './yardimci/durum.js';

test('BP üretimi: merkez tabanı + bina sabit BP + işçi BP', () => {
  assert.equal(bilgiUretimi(durum()), 0.5);
  assert.equal(bilgiUretimi(binaEkle(durum(), 'totem', K + 5, K + 5)), 1.5);
  const m = binaEkle(durum({ cag: 'tasdevri', atama: { m: 1 } }), 'magara_resmi', K + 4, K + 4, { uid: 'm' });
  assert.equal(bilgiUretimi(m), 1 + 1 + 0.5);
});

test('seçim: havuz aktarılır; değiştirince ilerleme havuza döner; şartlar denetlenir', () => {
  const d = durum({ bilgiHavuz: 4 });
  const a = arastirmaSec(d, 'mizrak_ucu').durum;
  assert.deepEqual(a.arastirma, { id: 'mizrak_ucu', ilerleme: 4 });
  assert.equal(a.bilgiHavuz, 0);
  const b = arastirmaSec(a, 'tas_yontma').durum;
  assert.deepEqual(b.arastirma, { id: 'tas_yontma', ilerleme: 4 });
  assert.match(arastirmaSec(d, 'deri_isleme').hata, /Mızrak Ucu/);
  assert.match(arastirmaSec(d, 'balikcilik').hata, /sonraki bir çağda/);
  assert.match(arastirmaSec({ ...d, buluslar: ['mizrak_ucu'] }, 'mizrak_ucu').hata, /zaten/);
  assert.match(arastirmaSec(a, 'mizrak_ucu').hata, /zaten araştırılıyor/);
  assert.match(arastirmaSec(d, 'yok').hata, /buluş yok/);
});

test('adım l: seçili buluş yoksa havuzda birikir; dolunca tamamlanır, artan havuza', () => {
  assert.equal(adimArastirma(durum()).bilgiHavuz, 0.5);
  const b = [];
  const d = adimArastirma(durum({ arastirma: { id: 'mizrak_ucu', ilerleme: 5.8 } }), b);
  assert.deepEqual(d.buluslar, ['mizrak_ucu']);
  assert.equal(d.arastirma, null);
  assert.ok(Math.abs(d.bilgiHavuz - 0.3) < 1e-9);
  assert.equal(b[0].kod, 'bulus_tamam');
});

test('kitap maliyeti tamamlanmada düşülür; yetmezse buluş bekler', () => {
  const temel = durum({ cag: 'ortacag', buluslar: ['dokumacilik'], arastirma: { id: 'lonca_sistemi', ilerleme: 150 },
    kaynaklar: { yiyecek: 0, kitap: 5 } });
  assert.equal(adimArastirma(temel).arastirma.id, 'lonca_sistemi');
  const d = adimArastirma({ ...temel, kaynaklar: { yiyecek: 0, kitap: 12 } });
  assert.ok(d.buluslar.includes('lonca_sistemi'));
  assert.equal(d.kaynaklar.kitap, 2);
});

test('tamamlanan buluşun etkisi bir sonraki turdan: Mızrak Ucu avcılık', () => {
  const d0 = durum({ atama: { 'serbest:avci': 3 }, arastirma: { id: 'mizrak_ucu', ilerleme: 5.5 }, kaynaklar: { yiyecek: 10, odun: 5, tas: 0, deri: 0 } });
  const t1 = turIlerlet(d0).durum;
  assert.deepEqual(t1.buluslar, ['mizrak_ucu']);
  assert.equal(t1.istatistik.sonTur.uretim.yiyecek, 3);
  const t2 = turIlerlet(t1).durum;
  assert.equal(t2.istatistik.sonTur.uretim.yiyecek, 3.75);
});

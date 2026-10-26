// İş dağıtımı: öneri, komut, otomatik kip (varsayılan kapalı), kayıt (docs: İş sekmesi "Kadro").
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum, binaEkle, K } from './yardimci/durum.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';
import { turIlerlet } from '../src/core/tur.js';
import { isDagit, isDagitimAyarla } from '../src/core/komutlar.js';
import { dagitimOnerisi } from '../src/core/isdagit.js';
import { issizSayisi } from '../src/core/yardimci.js';
import { serialize, yukle } from '../src/save/kayit.js';

const kur = (nufus = 6, atama = {}) => {
  let d = durum({ nufus, atama, kaynaklar: { yiyecek: 20, odun: 20, tas: 0, deri: 0 } });
  d = binaEkle(d, 'oduncu_kampi', K + 5, K + 5, { uid: 'od' });
  d = binaEkle(d, 'toplayici_barinagi', K + 5, K + 7, { uid: 'top' });
  return d;
};

test('yeni oyunda otomatik dağıtım KAPALI, öncelik dengeli', () => {
  assert.deepEqual(yeniOyun(1).isDagitim, { oto: false, oncelik: 'dengeli' });
});

test('isDagit: yalnız boştakileri yerleştirir, mevcut atamaya dokunmaz, yuva kapasitesini aşmaz', () => {
  const d = kur(6, { od: 1 });
  const r = isDagit(d);
  assert.equal(r.hata, undefined);
  assert.equal(r.durum.atama.od >= 1, true);
  assert.equal(issizSayisi(r.durum), 0);
  assert.equal(r.dagitilan, 5);
  assert.equal(d.atama.od, 1); // girdi değişmez
  for (const [k, n] of Object.entries(r.durum.atama)) if (k === 'od' || k === 'top') assert.ok(n <= 3);
});

test('öncelik: odun seçilince oduncu yuvası, yiyecek seçilince toplayıcı önce dolar', () => {
  const d = kur(2);
  assert.equal(dagitimOnerisi(d, 'odun').atama.od, 2);
  assert.equal(dagitimOnerisi(d, 'yiyecek').atama.top, 2);
});

test('açlıkta yiyecek öncelikli', () => {
  const d = { ...kur(2), acTur: 2, kaynaklar: { yiyecek: 0, odun: 0, tas: 0, deri: 0 } };
  assert.equal(dagitimOnerisi(d, 'dengeli').atama.top, 2);
});

test('hata: boşta kimse yok; geçersiz öncelik', () => {
  const d = kur(1, { od: 1 });
  assert.match(isDagit(d).hata, /Boşta/);
  assert.match(isDagit(kur(2), 'yok').hata, /öncelik/);
});

test('hasarlı/inşaattaki bina yuvası doldurulmaz', () => {
  let d = durum({ nufus: 3, atama: {}, kaynaklar: { yiyecek: 20, odun: 20, tas: 0, deri: 0 } });
  d = binaEkle(d, 'oduncu_kampi', K + 5, K + 5, { uid: 'od', hasarli: true });
  const o = dagitimOnerisi(d, 'odun');
  assert.equal(o.atama.od, undefined);
});

test('isDagitimAyarla + otomatik kip: tur adımı boştakileri dağıtır; kapalıyken dağıtmaz', () => {
  const d = kur(4);
  assert.equal(turIlerlet(d).durum.atama.od, undefined);
  const a = isDagitimAyarla(d, { oto: true, oncelik: 'odun' }).durum;
  assert.deepEqual(a.isDagitim, { oto: true, oncelik: 'odun' });
  const r = turIlerlet(a);
  assert.ok((r.durum.atama.od || 0) > 0);
  assert.ok(r.bildirimler.some((b) => b.kod === 'is_dagit'));
  assert.match(isDagitimAyarla(d, { oncelik: 'x' }).hata, /öncelik/);
});

test('kayıt: isDagitim korunur; eski kayıtta eksikse varsayılan kapalı', () => {
  const d = isDagitimAyarla(yeniOyun(2), { oto: true, oncelik: 'tas' }).durum;
  assert.deepEqual(yukle(serialize(d)).isDagitim, { oto: true, oncelik: 'tas' });
  const ham = JSON.parse(serialize(yeniOyun(2)));
  delete ham.isDagitim;
  assert.deepEqual(yukle(JSON.stringify(ham)).isDagitim, { oto: false, oncelik: 'dengeli' });
});

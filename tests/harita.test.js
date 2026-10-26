// Aşama 3: tohumlu harita üretimi, garantiler, keşif sisi, kayıt biçimi ve sürüm 1 göçü. GERÇEK harita kullanılır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haritaUret, zemin, haritaDenetle, haritaTohumu, haritaIstatistik, karoAt, merkezNokta, sinirIcinde,
} from '../src/world/harita.js';
import {
  kesifli, kesifSayisi, kesfet, gorunurKaro, kesifYaricapi, kesifHedefi, bitKodla, bitCoz, yonAdi,
} from '../src/world/kesif.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';
import { rngBaslat } from '../src/core/rng.js';
import { onderEylemiSec } from '../src/core/eylem.js';
import { adimOnder } from '../src/core/eylem.js';
import { adimInsaat } from '../src/core/insa.js';
import { cagAtla } from '../src/core/cag.js';
import { calisanBinalar, BINA, KARO } from '../src/core/yardimci.js';
import { serialize, yukle, KAYIT_SURUM } from '../src/save/kayit.js';
import { binaHucreleri } from '../src/world/izgara.js';
import { HARITA_BOYUT, GORUS_BASLANGIC, KESIF_YARICAP, YERLESIM_YARICAP, HARITA_URETIM } from '../src/data/denge.js';
import { botOyna } from './yardimci/bot.js';
import { binaEkle } from './yardimci/durum.js';

const N = HARITA_BOYUT;
const C = N / 2;
const uz = (x, y) => Math.hypot(x + 0.5 - C, y + 0.5 - C);
// Gerçek haritada ilk eşleşen hücre (merkeze en yakın).
function karoBul(d, karo, kosul = () => true) {
  let en = null;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (karoAt(d, x, y) === karo && kosul(x, y) && (!en || uz(x, y) < en.u)) en = { x, y, u: uz(x, y) };
  }
  return en;
}

test('harita deterministik: aynı tohum aynı zemin, farklı tohum farklı; önbellek aynı sonucu verir', () => {
  const a = haritaUret(12345), b = haritaUret(12345), c = haritaUret(54321);
  assert.deepEqual(a.karo, b.karo);
  assert.notDeepEqual(a.karo, c.karo);
  assert.deepEqual(zemin(12345).karo, a.karo);
  assert.equal(a.karo.length, N * N);
  assert.deepEqual(yeniOyun(9).harita, yeniOyun(9).harita);
});

test('harita üretimi oyun RNG\'sine dokunmaz (ayrı alt-tohum)', () => {
  const d = yeniOyun(77);
  assert.equal(d.rng, rngBaslat(77));
  assert.equal(d.harita.tohum, haritaTohumu(77));
  assert.notEqual(d.harita.tohum, d.rng);
});

test('garantiler 200 tohumda: güvenli merkez, kaynak sayıları, erişim, ocak yerleri', () => {
  let denemeToplam = 0;
  for (let t = 1; t <= 200; t++) {
    const z = zemin(haritaTohumu(t));
    denemeToplam += z.deneme;
    assert.deepEqual(haritaDenetle(z.karo, N), [], `tohum ${t}`);
    const d = yeniOyun(t);
    for (const b of d.binalar) for (const [x, y] of binaHucreleri(b)) assert.equal(karoAt(d, x, y), 'cimen', `tohum ${t} başlangıç binası`);
  }
  assert.ok(denemeToplam / 200 < 2, `ortalama yeniden deneme ${denemeToplam / 200}`);
});

test('kaynaklar kademeli uzaklıkta: taş/orman yakın, cevher ve mermer sis içinde uzakta', () => {
  const ort = { orman: 0, tasli: 0, su: 0, kil: 0, cevher: 0, mermer: 0 };
  const T = 40;
  for (let t = 1; t <= T; t++) {
    const s = haritaIstatistik(haritaTohumu(t));
    for (const k of Object.keys(ort)) ort[k] += s.enYakin[k] / T;
    assert.ok(s.enYakin.cevher > GORUS_BASLANGIC, `tohum ${t} cevher başta görünür`);
    assert.ok(s.enYakin.mermer > YERLESIM_YARICAP.tasdevri, `tohum ${t} mermer çok yakın`);
    assert.ok(s.enYakin.tasli <= YERLESIM_YARICAP.gocebe, `tohum ${t} taş uzak`);
  }
  assert.ok(ort.orman < ort.tasli && ort.tasli < ort.cevher && ort.cevher < ort.mermer, JSON.stringify(ort));
  // Garanti tablosu kendi içinde tutarlı: mermer yarıçapı Antik sınırı içinde.
  assert.ok(HARITA_URETIM.sayim.find((g) => g.karo === 'mermer').yaricap <= YERLESIM_YARICAP.antik);
});

test('keşif sisi: yeni oyunda yalnız başlangıç görüşü açık', () => {
  const d = yeniOyun(3);
  let beklenen = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ac = uz(x, y) <= GORUS_BASLANGIC;
    if (ac) beklenen++;
    assert.equal(kesifli(d, x, y), ac);
  }
  assert.equal(kesifSayisi(d), beklenen);
  assert.equal(gorunurKaro(d, C + 9, C), null); // sis: karo bilgisi yok
  assert.equal(gorunurKaro(d, -1, 0), null);
  assert.ok(d.harita.kesif.length < 1000); // 64×64 bit → 684 karakter
});

test('bit kümesi base64 gidiş-dönüş', () => {
  const u8 = new Uint8Array(512).map((_, i) => (i * 37) & 255);
  assert.deepEqual(bitCoz(bitKodla(u8), 512), u8);
});

test('kesfet saf: yarıçap açar, girdiyi değiştirmez, tekrarında açılan 0', () => {
  const d = yeniOyun(4);
  const once = structuredClone(d);
  const r = kesfet(d, { x: C + 12, y: C }, 3);
  assert.deepEqual(d, once);
  assert.ok(r.acilan > 20);
  assert.equal(kesifli(r.durum, C + 12, C), true);
  assert.equal(kesifSayisi(r.durum), kesifSayisi(d) + r.acilan);
  assert.equal(kesfet(r.durum, { x: C + 12, y: C }, 3).acilan, 0);
});

test('keşif bulguları yönlü bildirilir; cevher Bronz\'dan önce kayalık görünür, bildirilmez', () => {
  const d = yeniOyun(5);
  const tas = karoBul(d, 'tasli', (x, y) => !kesifli(d, x, y));
  const r = kesfet(d, { x: tas.x + 0.5, y: tas.y + 0.5 }, 1);
  const b = r.bulgular.find((x) => x.karo === 'tasli');
  assert.ok(b);
  const m = merkezNokta(d);
  assert.equal(b.metin, `${yonAdi(b.x + 0.5 - m.x, b.y + 0.5 - m.y)} bir taşlık bulundu.`);
  assert.deepEqual([yonAdi(0, -5), yonAdi(5, 0), yonAdi(0, 5), yonAdi(-5, 0), yonAdi(3, -3)],
    ['Kuzeyde', 'Doğuda', 'Güneyde', 'Batıda', 'Kuzeydoğuda']);
  const ce = karoBul(d, 'cevher');
  const rc = kesfet(d, { x: ce.x + 0.5, y: ce.y + 0.5 }, 1);
  assert.equal(rc.bulgular.some((x) => x.karo === 'cevher'), false);
  assert.equal(gorunurKaro(rc.durum, ce.x, ce.y), 'kayalik');
  assert.equal(gorunurKaro({ ...rc.durum, cag: 'bronz' }, ce.x, ce.y), 'cevher');
});

test('Keşfet eylemi sisin kenarını açar, bildirim yazar, RNG akışını değiştirmez', () => {
  let d = yeniOyun(6);
  const ilk = kesifSayisi(d);
  const hedef = kesifHedefi(d);
  assert.ok(uz(hedef.x, hedef.y) > GORUS_BASLANGIC && uz(hedef.x, hedef.y) <= GORUS_BASLANGIC + 1.5);
  const b = [];
  const s = adimOnder(onderEylemiSec(d, 'kesfet').durum, b);
  assert.ok(kesifSayisi(s) > ilk + 20);
  assert.ok(b.some((x) => x.kod === 'kesif' || x.kod === 'kesif_bulgu'));
  // RNG: harita tamamen açıkken (keşif yapılamaz) de aynı zar dizisi → keşif zar kullanmaz.
  const acik = { ...d, harita: { ...d.harita, kesif: bitKodla(new Uint8Array(N * N / 8).fill(255)) } };
  const b2 = [];
  const kesifsiz = adimOnder(onderEylemiSec(acik, 'kesfet').durum, b2);
  assert.equal(s.rng, kesifsiz.rng);
  assert.deepEqual(s.kaynaklar, kesifsiz.kaynaklar);
  assert.ok(b2.some((x) => /tamamı keşfedildi/.test(x.metin)));
  // Art arda keşifler farklı yönlere, dışa doğru ilerler.
  for (let i = 0; i < 6; i++) { d = adimOnder(onderEylemiSec({ ...d, tur: i, onder: { ...d.onder, yorgunluk: 0 } }, 'kesfet').durum, []); }
  assert.ok(kesifSayisi(d) > ilk + 150);
});

test('görüş bonusları: Hayvan İzleri ve Gözcü Direği keşif yarıçapını artırır; Gözcü tamamlanınca çevresini açar', () => {
  const d = yeniOyun(2);
  assert.equal(kesifYaricapi(d, calisanBinalar(d)), KESIF_YARICAP);
  const h = { ...d, buluslar: ['hayvan_izleri'] };
  assert.equal(kesifYaricapi(h, calisanBinalar(h)), KESIF_YARICAP + 1);
  const g = binaEkle(h, 'gozcu_diregi', C + 2, C + 2, { uid: 'g', insaKalan: 1 });
  assert.equal(kesifYaricapi(g, calisanBinalar(g)), KESIF_YARICAP + 1); // inşaatta sayılmaz
  const bitti = adimInsaat(g, []);
  assert.equal(kesifYaricapi(bitti, calisanBinalar(bitti)), KESIF_YARICAP + 2);
  assert.ok(kesifSayisi(bitti) > kesifSayisi(g));
  assert.equal(kesifli(bitti, C + 2 + 7, C + 2), true); // görüş 8
});

test('çağ atlayınca keşfedilmiş topraktaki yeni görünür kaynak bildirilir', () => {
  let d = yeniOyun(8);
  const ce = karoBul(d, 'cevher');
  d = kesfet(d, { x: ce.x + 0.5, y: ce.y + 0.5 }, 1).durum;
  d = { ...d, cag: 'tasdevri', buluslar: ['maden_eritme'], nufus: 20, kaynaklar: { yiyecek: 60, odun: 50, tas: 40, alet: 15, deri: 0 } };
  for (const [i, id] of ['kulube', 'kulube', 'kulube', 'kulube', 'kulube', 'tas_ocagi', 'tahil_bahcesi', 'tahil_bahcesi'].entries()) {
    d = binaEkle(d, id, i * 3, 0);
  }
  const r = cagAtla(d);
  assert.equal(r.hata, undefined);
  assert.ok(r.bildirimler.some((b) => b.kod === 'kesif_bulgu' && /cevher damarı görüldü/.test(b.metin)));
});

test('kayıt sığ: yalnız tohum/boyut/keşif/değişim; tipik kayıt < 20 KB; gidiş-dönüş', () => {
  const s = botOyna(11, { maxTur: 60 }).son;
  const metin = serialize(s);
  assert.ok(metin.length < 20000, `kayıt ${metin.length} bayt`);
  const ham = JSON.parse(metin);
  assert.deepEqual(Object.keys(ham.harita).sort(), ['boyut', 'degisim', 'kesif', 'tohum']);
  assert.deepEqual(yukle(metin), s);
  // Kalıcı değişimler kayda girer ve zeminin üstüne yazılır.
  const d = yeniOyun(11);
  const o = karoBul(d, 'orman');
  const deg = { ...d, harita: { ...d.harita, degisim: { [o.y * N + o.x]: KARO.cimen.kod } } };
  const y = yukle(serialize(deg));
  assert.equal(karoAt(y, o.x, o.y), 'cimen');
});

test('sürüm 1 kaydı göçle açılır: binalar yeni merkeze kayar, altları kurulabilir, köy keşfedilmiş', () => {
  const eski = {
    surum: 1, tohum: 21, rng: 999, tur: 30, cag: 'tasdevri', cagBaslangicTuru: 28, kaynaklar: { yiyecek: 20, odun: 10, tas: 5, deri: 1, alet: 2 },
    nufus: 9, atama: { b3: 2, 'serbest:toplayici': 7 },
    binalar: [
      { uid: 'b1', id: 'ocak_meydani', x: 7, y: 7, seviye: 1, insaKalan: 0, hasarli: false },
      { uid: 'b2', id: 'cadir', x: 9, y: 7, seviye: 1, insaKalan: 0, hasarli: false },
      { uid: 'b3', id: 'oduncu_kampi', x: 4, y: 4, seviye: 2, insaKalan: 0, hasarli: false },
      { uid: 'b4', id: 'tahil_bahcesi', x: 2, y: 10, seviye: 1, insaKalan: 0, hasarli: false },
    ],
    harita: { boyut: 16, karolar: 'c'.repeat(256) },
  };
  const y = yukle(JSON.stringify(eski));
  assert.equal(y.surum, KAYIT_SURUM);
  const kay = N / 2 - 8;
  assert.deepEqual(y.binalar.map((b) => [b.uid, b.x, b.y]), eski.binalar.map((b) => [b.uid, b.x + kay, b.y + kay]));
  assert.equal(y.harita.tohum, haritaTohumu(21));
  assert.equal(y.harita.boyut, N);
  assert.equal(y.rng, 999);
  for (const b of y.binalar) {
    for (const [x, yy] of binaHucreleri(b)) {
      const k = KARO[gorunurKaro(y, x, yy)];
      assert.ok(k.insaEdilir || (k.yalnizBina || []).includes(b.id), `${b.uid} ${k.id}`);
    }
  }
  for (let yy = 0; yy < N; yy++) for (let x = 0; x < N; x++) if (sinirIcinde(y, x, yy)) assert.equal(kesifli(y, x, yy), true);
  assert.deepEqual(yukle(serialize(y)), y);
  assert.equal(BINA[y.binalar[0].id].tur, 'merkez');
});

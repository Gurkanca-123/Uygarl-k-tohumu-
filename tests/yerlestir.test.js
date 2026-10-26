// Aşama 3: bina yerleştirme (sis, sınır, çakışma, karo şartı), orman temizleme, bitişiklik ve yol — GERÇEK haritada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { insaEt, ormanTemizle, yolYap, yolKaldir, adimInsaat, uygunYerler } from '../src/core/insa.js';
import { hesaplaBitisiklik, hamUretimHesapla, yolCarpani } from '../src/core/uretim.js';
import { savunmaHesapla } from '../src/core/savunma.js';
import { yik } from '../src/core/insa.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';
import { karoAt, merkezNokta, sinirIcinde } from '../src/world/harita.js';
import { kesfet, kesifli, gorunurKaro, bosKesif } from '../src/world/kesif.js';
import { kenarKomsulari, binaHucreleri } from '../src/world/izgara.js';
import { yolAgi } from '../src/world/yol.js';
import { sinirKenarinda } from '../src/world/yerlestir.js';
import { HARITA_BOYUT, YERLESIM_YARICAP, GORUS_BASLANGIC, YOL_CEZA } from '../src/data/denge.js';
import { durum, binaEkle, karoKoy, K, yuvarla } from './yardimci/durum.js';

const N = HARITA_BOYUT;
const C = N / 2;
const uz = (x, y) => Math.hypot(x + 0.5 - C, y + 0.5 - C);
const bol = { yiyecek: 30, odun: 30, tas: 30, deri: 30 };
const gercek = (deg = {}, tohum = 1) => ({ ...yeniOyun(tohum), ...structuredClone(deg) });
// Merkezden r yarıçapını açar (sınırı keşfetmiş oyuncu).
const acik = (d, r) => kesfet(d, merkezNokta(d), r).durum;
function hucreBul(d, kosul) {
  let en = null;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (kosul(x, y) && (!en || uz(x, y) < en.u)) en = { x, y, u: uz(x, y) };
  return en;
}

test('sis içine inşa edilemez; keşfedilince edilir', () => {
  for (const t of [1, 2, 3]) {
    const d = gercek({ kaynaklar: { ...bol } }, t);
    const h = hucreBul(d, (x, y) => uz(x, y) > GORUS_BASLANGIC + 0.5 && sinirIcinde(d, x, y) && karoAt(d, x, y) === 'cimen');
    assert.equal(kesifli(d, h.x, h.y), false);
    assert.match(insaEt(d, 'cadir', h.x, h.y).hata, /keşfedilmemiş/);
    const k = kesfet(d, { x: h.x + 0.5, y: h.y + 0.5 }, 1).durum;
    assert.equal(insaEt(k, 'cadir', h.x, h.y).hata, undefined, `tohum ${t}`);
  }
});

test('yerleşim sınırı çağla büyür: keşfedilmiş ama sınır dışı reddedilir', () => {
  const d = acik(gercek({ kaynaklar: { ...bol } }), 14);
  const h = hucreBul(d, (x, y) => uz(x, y) > YERLESIM_YARICAP.gocebe && uz(x, y) <= YERLESIM_YARICAP.tasdevri && karoAt(d, x, y) === 'cimen');
  assert.match(insaEt(d, 'cadir', h.x, h.y).hata, /yerleşim sınırının dışında/);
  const t = { ...d, cag: 'tasdevri', kaynaklar: { ...bol } };
  assert.equal(insaEt(t, 'kulube', h.x, h.y).hata, undefined);
});

test('çakışma ve harita dışı: merkez dolu, 2×2 çadırla çakışmaz', () => {
  const d = gercek({ cag: 'tasdevri', kaynaklar: { ...bol, alet: 10 } });
  const m = d.binalar[0];
  assert.match(insaEt(d, 'kulube', m.x, m.y).hata, /dolu/);
  assert.match(insaEt(d, 'kulube', -1, 0).hata, /harita dışında/);
  for (const [x, y] of uygunYerler(d, 'erzak_cukuru').slice(0, 5)) {
    assert.equal(d.binalar.some((b) => binaHucreleri(b).some(([a, c]) => a === x && c === y)), false);
  }
});

test('karo şartı: orman/su üstüne kurulmaz; Taş Ocağı taşlığa bitişik; Maden cevher üstüne (gerçek harita)', () => {
  for (const t of [1, 4, 9]) {
    let d = acik(gercek({ kaynaklar: { ...bol } }, t), YERLESIM_YARICAP.gocebe);
    const o = hucreBul(d, (x, y) => karoAt(d, x, y) === 'orman' && sinirIcinde(d, x, y));
    assert.match(insaEt(d, 'cadir', o.x, o.y).hata, /Orman üstüne inşa edilemez/);
    d = acik({ ...d, cag: 'tasdevri', kaynaklar: { ...bol, alet: 10 } }, YERLESIM_YARICAP.tasdevri);
    const yerler = uygunYerler(d, 'tas_ocagi');
    assert.ok(yerler.length > 0, `tohum ${t}`);
    for (const [x, y] of yerler) {
      assert.ok(kenarKomsulari(d, { id: 'tas_ocagi', x, y }).some(([a, b]) => gorunurKaro(d, a, b) === 'tasli'));
    }
    assert.equal(insaEt(d, 'tas_ocagi', ...yerler[0]).hata, undefined);
    const cim = hucreBul(d, (x, y) => sinirIcinde(d, x, y) && uz(x, y) > 3
      && [[0, 0], [1, 0], [0, 1], [1, 1]].every(([a, b]) => karoAt(d, x + a, y + b) === 'cimen')
      && !kenarKomsulari(d, { id: 'tas_ocagi', x, y }).some(([a, b]) => karoAt(d, a, b) === 'tasli'));
    assert.match(insaEt(d, 'tas_ocagi', cim.x, cim.y).hata, /Taşlık karosuna bitişik olmalı/);
    // Bronz: cevher görünür, Maden yalnız üstüne.
    const b = acik({ ...d, cag: 'bronz', kaynaklar: { ...bol, alet: 10, kil: 0 } }, YERLESIM_YARICAP.bronz);
    const madenYer = uygunYerler(b, 'maden_ocagi');
    assert.ok(madenYer.length > 0, `tohum ${t} maden`);
    const [mx, my] = madenYer[0];
    assert.ok(binaHucreleri({ id: 'maden_ocagi', x: mx, y: my }).some(([a, c]) => karoAt(b, a, c) === 'cevher'));
    assert.equal(insaEt(b, 'maden_ocagi', mx, my).hata, undefined);
    const ce = hucreBul(b, (x, y) => karoAt(b, x, y) === 'cevher' && sinirIcinde(b, x, y));
    assert.match(insaEt(b, 'oduncu_kampi', ce.x, ce.y).hata, /yalnız ilgili ocak/);
    // Taş Devri'nde cevher kayalık görünür: Maden'in karo şartı sağlanamaz.
    assert.equal(gorunurKaro({ ...b, cag: 'tasdevri' }, ce.x, ce.y), 'kayalik');
    assert.ok(uygunYerler(b, 'kil_ocagi').length > 0, `tohum ${t} kil`);
  }
});

test('orman temizleme: inşaat sırasına girer, 1 tur sonra çimen ve +5 odun; sonra üstüne kurulur', () => {
  const d = gercek({ kaynaklar: { yiyecek: 10, odun: 5, tas: 0, deri: 0 } }, 3);
  const o = hucreBul(d, (x, y) => karoAt(d, x, y) === 'orman' && kesifli(d, x, y) && sinirIcinde(d, x, y));
  const r = ormanTemizle(d, o.x, o.y);
  assert.equal(r.hata, undefined);
  assert.equal(r.durum.insaatSirasi.length, 1);
  assert.match(ormanTemizle(r.durum, o.x, o.y).hata, /zaten temizleniyor/);
  const b = [];
  const s = adimInsaat(r.durum, b);
  assert.equal(karoAt(s, o.x, o.y), 'cimen');
  assert.equal(s.kaynaklar.odun, 10);
  assert.deepEqual(s.insaatSirasi, []);
  assert.equal(b[0].kod, 'temizlendi');
  assert.equal(insaEt({ ...s, kaynaklar: { ...bol } }, 'oduncu_kampi', o.x, o.y).hata, undefined);
  assert.match(ormanTemizle(s, o.x, o.y).hata, /Çimen temizlenemez/);
  const sis = hucreBul(d, (x, y) => karoAt(d, x, y) === 'orman' && !kesifli(d, x, y));
  assert.match(ormanTemizle(d, sis.x, sis.y).hata, /keşfedilmemiş/);
});

test('bitişiklik gerçek haritada: Oduncu Kampı orman kenar komşusu başına +0,25 (tavan 2), elle sayım', () => {
  let sinanan = 0;
  for (const t of [1, 2, 3, 5, 8]) {
    const d0 = acik(gercek({ kaynaklar: { ...bol } }, t), YERLESIM_YARICAP.gocebe);
    for (const [x, y] of uygunYerler(d0, 'oduncu_kampi')) {
      // Elle: 4 kenar komşusundan kaçı orman?
      const elle = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => karoAt(d0, a, b) === 'orman').length;
      if (!elle) continue;
      const d = binaEkle({ ...d0, atama: { k: 2, 'serbest:toplayici': 1 } }, 'oduncu_kampi', x, y, { uid: 'k' });
      assert.equal(hesaplaBitisiklik(d).k.uretim, Math.min(elle, 2) * 0.25);
      assert.equal(yuvarla(hamUretimHesapla(d).toplam.odun), yuvarla(2 * 2 * (1 + Math.min(elle, 2) * 0.25)));
      sinanan++;
      break;
    }
  }
  assert.ok(sinanan >= 4);
});

test('bitişiklik: bina komşusu, sis karosu sayılmaz; +%50 tavanı', () => {
  let d = durum({ atama: { k: 2 } });
  d = binaEkle(d, 'toplayici_barinagi', K + 5, K + 5, { uid: 'k' });
  d = karoKoy(karoKoy(karoKoy(karoKoy(d, K + 4, K + 5, 'orman'), K + 6, K + 5, 'su'), K + 5, K + 6, 'su'), K + 5, K + 4, 'orman');
  assert.equal(hesaplaBitisiklik(d).k.uretim, 0.5); // 4 hedef, max 2
  // Sis: aynı komşular keşfedilmemişse sayılmaz.
  const sisli = { ...d, harita: { ...d.harita, kesif: bosKesif(N) } };
  assert.equal(hesaplaBitisiklik(sisli).k.uretim, 0);
});

test('Sulanan Tarla: 2 karo içinde su +0,25; 3 karoda yok', () => {
  const t = durum({ cag: 'bronz', atama: {} });
  const d = binaEkle(t, 'sulanan_tarla', K + 4, K + 4, { uid: 's' });
  assert.equal(hesaplaBitisiklik(d).s.uretim, 0);
  assert.equal(hesaplaBitisiklik(karoKoy(d, K + 4, K + 7, 'su')).s.uretim, 0.25); // Chebyshev 2
  assert.equal(hesaplaBitisiklik(karoKoy(d, K + 4, K + 8, 'su')).s.uretim, 0);
});

test('yol (§3.4): Bronz+, 1 taş, çimen/verimli; bağlı olmayan Bronz binası ×0,75, yolla bağlanınca ×1', () => {
  const m = merkezNokta(durum());
  const mx = m.x - 1, my = m.y - 1; // merkez sol üst
  let d = durum({ cag: 'bronz', kaynaklar: { ...bol, kil: 30 } });
  assert.match(yolYap(durum(), mx + 2, my + 2).hata, /Bronz/);
  // Kerpiç Ev merkezin 3 karo güneyinde (bağsız)
  d = binaEkle(d, 'kerpic_ev', mx, my + 5, { uid: 'e' });
  d = binaEkle(d, 'cadir', mx + 4, my + 5, { uid: 'c' });
  const e = d.binalar.find((b) => b.uid === 'e');
  assert.equal(yolCarpani(d, e), YOL_CEZA);
  assert.equal(yolCarpani(d, d.binalar.find((b) => b.uid === 'c')), 1); // Göçebe binası muaf
  let r = yolYap(d, mx, my + 2);
  assert.equal(r.hata, undefined);
  assert.equal(r.durum.kaynaklar.tas, 29);
  assert.equal(karoAt(r.durum, mx, my + 2), 'yol');
  assert.match(yolYap(r.durum, mx, my + 2).hata, /zaten yol/);
  r = yolYap(r.durum, mx, my + 3);
  assert.equal(yolCarpani(r.durum, e), YOL_CEZA); // boşluk var (my+4)
  r = yolYap(r.durum, mx, my + 4);
  assert.equal(yolAgi(r.durum).size, 3);
  assert.equal(yolCarpani(r.durum, e), 1);
  assert.match(insaEt(r.durum, 'kuyu', mx, my + 3).hata, /Yol üstüne inşa edilemez/);
  const kaldir = yolKaldir(r.durum, mx, my + 3);
  assert.equal(karoAt(kaldir.durum, mx, my + 3), 'cimen');
  assert.equal(yolCarpani(kaldir.durum, e), YOL_CEZA);
  assert.match(yolYap(karoKoy(r.durum, mx + 5, my, 'orman'), mx + 5, my).hata, /Orman üstüne yol/);
  // Merkeze doğrudan bitişik bina bağlıdır.
  const yan = binaEkle(d, 'kerpic_ev', mx - 1, my, { uid: 'y' });
  assert.equal(yolCarpani(yan, yan.binalar.find((b) => b.uid === 'y')), 1);
});

test('Sur Parçası yerleşim sınırı kenarında +1 savunma', () => {
  const d = durum({ cag: 'ortacag', atama: {} });
  const ic = binaEkle(d, 'sur_parcasi', K + 6, K + 6, { uid: 's' });
  const r = YERLESIM_YARICAP.ortacag;
  const x = Math.floor(C + r - 0.6); // sınırın son karosu (doğu)
  const kenar = binaEkle(d, 'sur_parcasi', x, C, { uid: 's' });
  assert.equal(sinirIcinde(kenar, x, C), true);
  assert.equal(sinirKenarinda(ic, ic.binalar.at(-1)), false);
  assert.equal(sinirKenarinda(kenar, kenar.binalar.at(-1)), true);
  assert.equal(savunmaHesapla(kenar) - savunmaHesapla(ic), 1);
});

test('yıkım sonrası yer yeniden kullanılabilir', () => {
  const d = gercek({ kaynaklar: { ...bol } });
  const [x, y] = uygunYerler(d, 'oduncu_kampi')[0];
  const a = insaEt(d, 'oduncu_kampi', x, y);
  assert.match(insaEt({ ...a.durum, insaatSirasi: [] }, 'toplayici_barinagi', x, y).hata, /dolu/);
  const yk = yik(a.durum, a.uid).durum;
  assert.equal(insaEt(yk, 'toplayici_barinagi', x, y).hata, undefined);
});

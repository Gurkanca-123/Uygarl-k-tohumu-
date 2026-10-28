// Komşular — model B (docs/AKSIYON.md §4, §9.2.6): keşif, ilişki (tehdit.iliski ile tek kaynak), 6 kurallı niyet, ticaret,
// hediye/elçi, haraç yanıtı, baskın seferi, tehdit motoruna etkiler.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cagBaslangic } from './yardimci/durum.js';
import { kahramanli } from './yardimci/aksiyon.js';
import {
  komsuKesfet, komsuNiyeti, adimKomsu, komsuTicaret, komsuElciGonder, komsuYanit, komsuGorunumu, hediyeBilgi,
} from '../src/core/komsu.js';
import { komsuIliski, komsuGucu, komsuTehditEtkisi, iliskiDegistir } from '../src/core/komsu_temel.js';
import { seferGonder, adimSefer, seferOnizleme } from '../src/core/sefer.js';
import { gerginlikArtisTabani, adimTehdit } from '../src/core/tehdit.js';
import { kesifUygula } from '../src/world/kesif.js';
import { merkezNokta } from '../src/world/harita.js';
import { NIYET_KURALLARI } from '../src/data/komsular.js';
import { KOMSU_MESAFE, KOMSU_ILISKI, MEVSIM_TUR } from '../src/data/denge.js';

const tas = (ek = {}) => ({ ...cagBaslangic('tasdevri', 3), ...ek });
function komsulu(d0, iliski = 0, mizac = null) {
  const d = structuredClone(d0);
  komsuKesfet(d, []);
  if (mizac) d.komsular[0].mizac = mizac;
  iliskiDegistir(d, d.komsular[0], iliski - komsuIliski(d, d.komsular[0]));
  return d;
}

test('(e) komşu keşfi: Göçebe\'de yok; Taş\'ta başarılı keşif seferiyle ya da keşifli alan ≥ %25 ile; konum 14–22 karo', () => {
  const g = structuredClone(cagBaslangic('gocebe', 3));
  assert.equal(komsuKesfet(g, []), null);
  const { d: d0, uid } = kahramanli(tas(), 'kasif');
  let s = seferGonder(d0, 'kesif', null, { kahraman: [uid], isci: 2 }).durum;
  s.sefer.aktif[0].zorluk = 0.5; s.sefer.aktif[0].kalan = 1; // kesin büyük başarı (test)
  const bl = [];
  const x = adimSefer(s, bl);
  assert.equal(x.komsular.length, 1);
  assert.ok(bl.some((b) => b.kod === 'komsu_bulundu'));
  const k = x.komsular[0];
  const m = merkezNokta(x);
  const u = Math.hypot(k.x + 0.5 - m.x, k.y + 0.5 - m.y);
  assert.ok(u >= KOMSU_MESAFE[0] && u <= KOMSU_MESAFE[1]);
  assert.ok(['baris', 'tuccar', 'saldirgan'].includes(k.mizac));
  // Keşif oranı yolu
  const y = structuredClone(tas());
  kesifUygula(y, merkezNokta(y), 20);
  const z = adimKomsu(y, []);
  assert.equal(z.komsular.length, 1);
  // ikinci komşu MVP'de yok
  assert.equal(komsuKesfet(structuredClone(z), []), null);
});

test('ilişki tek kaynak: tehdit.iliski.komsu (TEHDIT §7) ile ortak; bulunurken eski puan aktarılır', () => {
  const d0 = tas();
  const d = structuredClone({ ...d0, tehdit: { ...d0.tehdit, iliski: { komsu: -15 } } });
  komsuKesfet(d, []);
  assert.equal(komsuIliski(d, d.komsular[0]), -15);
  iliskiDegistir(d, d.komsular[0], 25);
  assert.equal(d.tehdit.iliski.komsu, 10);
  assert.equal(d.komsular[0].iliski, 10);
});

test('niyet kuralları sabit sırada (6 kural, ilk tutan): ittifak · ticaret · haraç · baskın · düşmanca · sessiz', () => {
  assert.deepEqual(NIYET_KURALLARI.map((r) => r.id), ['ittifak', 'ticaret', 'harac', 'baskin', 'dusmanca', 'sessiz']);
  const b = cagBaslangic('bronz', 3);
  const tablo = [
    [b, 70, 'baris', 'ittifak'], [tas(), 70, 'baris', 'ticaret'], [b, 25, 'tuccar', 'ticaret'], [tas(), 0, 'baris', 'sessiz'],
    [tas(), -25, 'baris', 'dusmanca'], [tas({ nufus: 3, atama: {} }), -60, 'baris', 'baskin'],
  ];
  for (const [d, il, mz, beklenen] of tablo) assert.equal(komsuNiyeti(d, komsulu(d, il, mz).komsular[0]).id, beklenen, `${il} ${mz}`);
  // haraç: saldırgan, güç oranı ≥ 1,2, ilişki < 20
  const zayif = { ...tas(), binalar: tas().binalar.filter((x) => !['nobet_citi'].includes(x.id)), atama: {}, buluslar: [] };
  const h = komsulu(zayif, 0, 'saldirgan');
  assert.ok(komsuGucu(h, h.komsular[0]) >= 1.2, 'güç');
  assert.equal(komsuNiyeti(h, h.komsular[0]).id, 'harac');
  // Barışçıl: 3–5 kapalı
  assert.equal(komsuNiyeti({ ...h, zorluk: 'barisci' }, h.komsular[0]).id, 'sessiz');
});

test('mevsim başı: ilişki 0\'a doğru kayar, ticaret teklifi kurulur; komsuTicaret bir kez', () => {
  let d = komsulu(tas({ tur: 39 }), 40, 'tuccar');
  d = { ...d, tur: 40 };
  const bl = [];
  d = adimKomsu(d, bl);
  assert.equal(komsuIliski(d, d.komsular[0]), 38);
  const n = d.komsular[0].niyet;
  assert.equal(n.tur, 'ticaret');
  assert.ok(bl.some((b) => b.kod === 'komsu_niyet'));
  d.kaynaklar[n.takas.ver] = 30;
  const r = komsuTicaret(d, d.komsular[0].id);
  assert.ok(!r.hata, r.hata);
  assert.equal(r.durum.kaynaklar[n.takas.ver], 30 - n.takas.verMiktar);
  assert.equal(komsuIliski(r.durum, r.durum.komsular[0]), 38 + KOMSU_ILISKI.ticaret);
  assert.match(komsuTicaret(r.durum, d.komsular[0].id).hata, /teklifi yok/);
  assert.equal(komsuTicaret(d, 'yok').hata, 'Böyle bir komşu bilinmiyor.');
});

test('elçi + hediye: güç × 2 yiyecek, ilişki +12, mevsimde bir kez; görev sayacı', () => {
  const d = komsulu(tas(), 0);
  const k = d.komsular[0];
  const b = hediyeBilgi(d, k);
  assert.deepEqual(b.maliyet, { yiyecek: Math.ceil(komsuGucu(d, k) * 2) });
  const r = komsuElciGonder(d, k.id);
  assert.ok(!r.hata, r.hata);
  assert.equal(komsuIliski(r.durum, r.durum.komsular[0]), KOMSU_ILISKI.hediye);
  assert.equal(r.durum.hedef.sayac.hediye, 1);
  assert.match(komsuElciGonder(r.durum, k.id).hata, /Bu mevsim/);
  const sonraki = { ...r.durum, tur: (Math.floor(r.durum.tur / MEVSIM_TUR) + 1) * MEVSIM_TUR };
  assert.ok(!komsuElciGonder(sonraki, k.id).hata);
});

test('haraç talebi: öde (%10 stok, ilişki +3) / reddet (ilişki −10, gerginlik +20); cevapsız = red', () => {
  const d = komsulu(tas(), 0, 'saldirgan');
  d.komsular[0].niyet = { tur: 'harac', kalan: 1, etki: null, kullanildi: false, harac: { yiyecek: 3 } };
  const kabul = komsuYanit(d, d.komsular[0].id, 'kabul');
  assert.equal(kabul.durum.kaynaklar.yiyecek, d.kaynaklar.yiyecek - 3);
  assert.equal(komsuIliski(kabul.durum, kabul.durum.komsular[0]), 3);
  const red = komsuYanit({ ...d, tehdit: { ...d.tehdit, gerginlik: 10 } }, d.komsular[0].id, 'red');
  assert.equal(komsuIliski(red.durum, red.durum.komsular[0]), -10);
  assert.equal(red.durum.tehdit.gerginlik, 30);
  assert.match(komsuYanit(kabul.durum, d.komsular[0].id, 'red').hata, /bekleyen talep yok/);
  assert.match(komsuYanit(d, d.komsular[0].id, 'belki').hata, /kabul/);
  const cevapsiz = adimKomsu({ ...d, tur: 40 }, []);
  assert.equal(komsuIliski(cevapsiz, cevapsiz.komsular[0]) <= -10 + 2, true);
});

test('düşmanca komşu tehdit motorunu etkiler: gerginlik artışı ×1,3; baskın niyetinde sonraki doğum kesin komşu baskını', () => {
  const d = komsulu(tas(), -30);
  const a0 = gerginlikArtisTabani(d);
  d.komsular[0].niyet = { tur: 'dusmanca', kalan: 1, etki: { tehditAgirlik: 2, gerginlik: 1.3 }, kullanildi: false };
  assert.ok(Math.abs(gerginlikArtisTabani(d) - a0 * 1.3) < 1e-9);
  d.komsular[0].niyet = { tur: 'baskin', kalan: 1, etki: { tehditAgirlik: 2, gerginlik: 1.3, kesin: true }, kullanildi: false };
  assert.equal(komsuTehditEtkisi(d).kesin, true);
  const x = adimTehdit({ ...d, tur: 60, tehdit: { ...d.tehdit, gerginlik: 99, nefesKalan: 0, aktif: null } }, []);
  assert.equal(x.tehdit.aktif?.id, 'komsu_baskini');
});

test('(e) baskın seferi (Bronz+, savaş modeli (b)): ganimet, ilişki −30, 15 tur bekleme; Barışçıl ve Taş\'ta kapalı', () => {
  const b0 = cagBaslangic('bronz', 3);
  const d = komsulu(b0, 0);
  const id = d.komsular[0].id;
  assert.match(seferOnizleme(komsulu(tas(), 0), 'baskin_seferi', id, { isci: 3 }).hata, /bu çağda açılmadı/);
  assert.match(seferOnizleme({ ...d, zorluk: 'barisci' }, 'baskin_seferi', id, { isci: 3 }).hata, /Barışçıl/);
  const on = seferOnizleme(d, 'baskin_seferi', id, { isci: 4 });
  assert.ok(on.uygun, on.hata);
  assert.equal(on.zorluk, komsuGucu(d, d.komsular[0]));
  let s = seferGonder(d, 'baskin_seferi', id, { isci: 4 }).durum;
  s.sefer.aktif[0].zorluk = 1; s.sefer.aktif[0].kalan = 1; // kesin başarı (test)
  const bl = [];
  const x = adimSefer(s, bl);
  const r = bl.find((y) => y.kod === 'sefer_dondu');
  assert.equal(r.sonuc, 'buyuk');
  assert.ok(r.kazanc.yiyecek > 0);
  assert.equal(komsuIliski(x, x.komsular[0]), KOMSU_ILISKI.baskin);
  assert.match(seferOnizleme(x, 'baskin_seferi', id, { isci: 2 }).hata, /beklemelisin/);
  const g = komsuGorunumu(x)[0];
  assert.equal(g.etiket, 'soguk');
  assert.ok(g.baskin.bekleme > 0);
  assert.ok(g.hediye.maliyet.yiyecek > 0);
});

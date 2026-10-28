// Görev sıklığı (kullanıcı geri bildirimi 2026-10-28): kartlar çağ başına 2–3 kez ve isteğe bağlı, aynı anda en çok 1 bekleyen karar,
// işaretler en çok 2, komşu talepleri nadir, toast birleştirme. Sıklık denge.js SIKLIK; çekirdeğe parametre olarak geçer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum as durum0, cagBaslangic } from './yardimci/durum.js';
import { kahramanli } from './yardimci/aksiyon.js';
import { adimHedef } from '../src/core/hedef.js';
import { adimKomsu, komsuKesfet } from '../src/core/komsu.js';
import { adimIsaret, isaretDogur } from '../src/core/sefer.js';
import { bekleyenKararSayisi } from '../src/core/yardimci.js';
import { SIKLIK, SIKLIK_SECENEKLERI, SIKLIK_VARSAYILAN } from '../src/data/denge.js';
import { toastSuz } from '../src/ui/toast.js';

// İlk kahraman teklifi çözülmüş sayılır (bekleyen karar yok).
const durum = (o = {}, ...r) => durum0({ kahramanDurum: { teklif: null, ilk: true, yemin: {}, sayac: 0 }, ...o }, ...r);

// Seçmeden tur tur ilerler; kart seti verilen turları döner.
function kartTurlari(d0, bitis, sec) {
  let d = d0;
  const turlar = [];
  for (let t = d.tur + 1; t <= bitis; t++) {
    const onceki = d.hedef.kart.son;
    d = adimHedef({ ...d, tur: t }, [], sec);
    if (d.hedef.kart.son !== onceki) turlar.push(t);
  }
  return { d, turlar };
}

test('sıklık: varsayılan Az; üç seçenek; Az < Normal < Çok', () => {
  assert.equal(SIKLIK_VARSAYILAN, 'az');
  assert.deepEqual(SIKLIK_SECENEKLERI, ['az', 'normal', 'cok']);
  assert.ok(SIKLIK.az.kartCagAdet < SIKLIK.normal.kartCagAdet && SIKLIK.normal.kartCagAdet < SIKLIK.cok.kartCagAdet);
  assert.ok(SIKLIK.az.seferOlay < SIKLIK.normal.seferOlay && SIKLIK.normal.seferOlay < SIKLIK.cok.seferOlay);
  assert.ok(SIKLIK.az.komsuTalepAralik > SIKLIK.normal.komsuTalepAralik);
});

test('kartlar (Az): erken değil, çağ başına en çok 2 set, setler arası ≥ 10 tur; seçilmezse kendiliğinden kapanır', () => {
  const { turlar } = kartTurlari(durum({ tur: 0 }), 80, {});
  assert.ok(turlar.length === 2, `kart setleri: ${turlar}`);
  assert.ok(turlar[0] >= SIKLIK.az.kartIlkTur, 'ilk kart erken değil');
  assert.ok(turlar[1] - turlar[0] >= SIKLIK.az.kartAralik);
  const { d } = kartTurlari(durum({ tur: 0 }), turlar[0] + SIKLIK.az.kartOmur, {});
  assert.equal(d.hedef.kartlar.length, 0, 'görmezden gelinen kart süresiz beklemez');
});

test('kartlar (Çok): eski ritim, her Bahar/Yaz/Güz başında', () => {
  const { turlar } = kartTurlari(durum({ tur: 0 }), 19, { siklik: 'cok' });
  assert.deepEqual(turlar, [5, 10], `kart setleri: ${turlar}`);
});

test('aynı anda en çok 1 bekleyen karar: kahraman teklifi bekliyorsa kart çıkmaz', () => {
  const d0 = durum({ tur: 9 });
  d0.kahramanDurum = { ...d0.kahramanDurum, teklif: { tur: 5, siniflar: ['avci', 'kasif'] } };
  assert.equal(bekleyenKararSayisi(d0), 1);
  const bl = [];
  const d = adimHedef({ ...d0, tur: 10 }, bl, {});
  assert.equal(d.hedef.kartlar.length, 0);
  assert.ok(!bl.some((b) => b.kod === 'hedef_kartlar'));
});

test('işaretler (Az): haritada aynı anda en çok 2; Çok profilde çağ tablosu', () => {
  let d = structuredClone(durum({ tur: 20 }));
  let n = 0;
  for (let i = 0; i < 6; i++) if (isaretDogur(d, [], {})) n++;
  assert.equal(n, SIKLIK.az.isaretMax);
  const e = structuredClone(durum({ tur: 20 }));
  let m = 0;
  for (let i = 0; i < 6; i++) if (isaretDogur(e, [], { pr: SIKLIK.cok })) m++;
  assert.ok(m > SIKLIK.az.isaretMax);
});

test('mevsim işareti Az profilde her mevsim doğmaz (olasılıklı); en çok 2 işaret', () => {
  let say = 0;
  const N = 40;
  for (let t = 1; t <= N; t++) {
    let d = structuredClone(durum({ tur: 4 }, t));
    d = adimIsaret({ ...d, tur: 5 }, [], {});
    d = adimIsaret({ ...d, tur: 20 }, [], {});
    say += d.hedefIsaretleri.length;
    assert.ok(d.hedefIsaretleri.length <= SIKLIK.az.isaretMax);
  }
  assert.ok(say < N * 2, 'her mevsim işaret doğmuyor');
});

test('komşu talepleri nadir: iki takas/haraç/ittifak teklifi arası ≥ komsuTalepAralik tur; bekleyen karar varken yeni teklif yok', () => {
  let d = structuredClone(cagBaslangic('tasdevri', 3));
  komsuKesfet(d, []);
  d.komsular[0].mizac = 'tuccar';
  d.komsular[0].iliski = 40;
  d.tehdit.iliski = { ...d.tehdit.iliski, komsu: 40 };
  const talepTurlari = [];
  for (let t = 40; t <= 100; t += 5) {
    d = adimKomsu({ ...d, tur: t }, [], {});
    const n = d.komsular[0].niyet;
    if (n && ['ticaret', 'harac', 'ittifak'].includes(n.tur) && talepTurlari.at(-1) !== t) talepTurlari.push(t);
    if (d.komsular[0].niyet) d.komsular[0].niyet.kullanildi = true;  // oyuncu yanıtladı
  }
  assert.ok(talepTurlari.length >= 2, `talepler: ${talepTurlari}`);
  for (let i = 1; i < talepTurlari.length; i++) assert.ok(talepTurlari[i] - talepTurlari[i - 1] >= SIKLIK.az.komsuTalepAralik);
  assert.ok(talepTurlari.length <= 6, 'her mevsim teklif yok');
});

test('toastSuz: sessiz kodlar ve sessiz bildirimler elenir, aynı tür birleşir', () => {
  const l = toastSuz([
    { kod: 'insaat_bitti', seviye: 'iyi', metin: 'Çadır tamamlandı.' },
    { kod: 'insaat_bitti', seviye: 'iyi', metin: 'Odun kampı tamamlandı.' },
    { kod: 'sefer_isaret_kayboldu', seviye: 'bilgi', metin: 'Ayı izi kayboldu.' },
    { kod: 'hedef_destan', seviye: 'iyi', metin: 'ara adım', sessiz: true },
    { kod: 'tehdit_uyari', seviye: 'uyari', metin: 'Kurt sürüsü yaklaşıyor.' },
  ]);
  assert.equal(l.length, 2);
  assert.match(l[0].metin, /\(\+1 benzeri\)/);
  assert.equal(l[1].kod, 'tehdit_uyari');
});

test('toastSuz: tekrarlayan uyarılar (depo dolu) en az 6 tur arayla gösterilir', () => {
  const son = {};
  const b = [{ kod: 'depo_dolu', seviye: 'uyari', metin: 'Depo dolu.' }];
  assert.equal(toastSuz(b, { tur: 10, son }).length, 1);
  assert.equal(toastSuz(b, { tur: 12, son }).length, 0);
  assert.equal(toastSuz(b, { tur: 16, son }).length, 1);
  assert.equal(toastSuz(b).length, 1, 'bağlamsız çağrıda seyreltme yok');
});

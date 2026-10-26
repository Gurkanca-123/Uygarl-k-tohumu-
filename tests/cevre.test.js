// Çevre (çit / sur) zinciri, kapalı halka, boşluk sayısı ve çok parçalı inşa (docs/TEHDIT.md §12).
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum, binaEkle, karoKoy, K } from './yardimci/durum.js';
import { cevreDurumu, cevreKapali, baglantiMaskeleri } from '../src/world/cevre.js';
import { savunmaHesapla, savunmaDokum, cevreSavunmasi } from '../src/core/savunma.js';
import { insaEtCok, insaEt, maliyetHesapla, suankiInsaatSayisi } from '../src/core/insa.js';

// Merkez (K+7..K+8, K+7..K+8) + Çadır (K+9, K+7). Halka: x K+6..K+10, y K+6..K+9 dikdörtgeninin köşesiz kenarı (10 parça).
function halkaHucreleri() {
  const c = [];
  for (let x = 7; x <= 9; x++) c.push([K + x, K + 6], [K + x, K + 9]);
  for (let y = 7; y <= 8; y++) c.push([K + 6, K + y], [K + 10, K + y]);
  return c;
}
function halkali(haric = []) {
  let d = durum();
  halkaHucreleri().forEach(([x, y], i) => {
    if (!haric.some(([a, b]) => a === x && b === y)) d = binaEkle(d, 'cit', x, y, { uid: `c${i}` });
  });
  return d;
}

test('çevre: parça yokken açık; boşluk = merkez + çadırı saran en küçük kesim (9)', () => {
  const c = cevreDurumu(durum());
  assert.equal(c.kapali, false);
  assert.equal(c.parca, 0);
  assert.equal(c.bosluk, 9);
  assert.equal(c.bosluklar.length, 9);
});

test('çevre: köşesiz 10 parçalık halka kapalı; içerde 2/2 bina; boşluk 0', () => {
  const c = cevreDurumu(halkali());
  assert.deepEqual({ kapali: c.kapali, bosluk: c.bosluk, parca: c.parca, ic: c.ic, toplam: c.toplam },
    { kapali: true, bosluk: 0, parca: 10, ic: 2, toplam: 2 });
});

test('çevre: bir parça eksik → açık, boşluk 1 ve boşluk hücresi o karo', () => {
  const eksik = [K + 8, K + 6];
  const c = cevreDurumu(halkali([eksik]));
  assert.equal(c.kapali, false);
  assert.equal(c.bosluk, 1);
  assert.deepEqual(c.bosluklar, [eksik]);
});

test('çevre: su doğal engel; yol iki çit arasında geçittir, çit yanında değilse boşluk', () => {
  const ac = [K + 8, K + 6];
  assert.equal(cevreKapali(karoKoy(halkali([ac]), ac[0], ac[1], 'su')).kapali, true);
  assert.equal(cevreKapali(karoKoy(halkali([ac]), ac[0], ac[1], 'yol')).kapali, true);
  const kenar = [K + 7, K + 6]; // sol komşusu (K+6, K+6) köşe: çit yok → geçit değil
  assert.equal(cevreKapali(karoKoy(halkali([kenar]), kenar[0], kenar[1], 'yol')).kapali, false);
});

test('çevre: inşaattaki ve hasarlı parça duvar sayılmaz', () => {
  let d = halkali([[K + 8, K + 6]]);
  d = binaEkle(d, 'cit', K + 8, K + 6, { uid: 'x', insaKalan: 1 });
  let c = cevreDurumu(d);
  assert.equal(c.kapali, false);
  assert.equal(c.insaatta, 1);
  d = binaEkle(halkali([[K + 8, K + 6]]), 'cit', K + 8, K + 6, { uid: 'x', hasarli: true });
  c = cevreDurumu(d);
  assert.equal(c.kapali, false);
  assert.equal(c.hasarli, 1);
});

test('çevre savunması (Göçebe): parça tavanı 1 + kapalı bonus × içerdeki oran; döküm toplamı = savunmaHesapla', () => {
  const bos = savunmaHesapla(durum());
  const d = halkali();
  const c = cevreSavunmasi(d);
  assert.equal(c.parcaHam, 2.5);
  assert.equal(c.parca, 1);
  assert.equal(c.halka, 2);
  assert.equal(savunmaHesapla(d) - bos, 3);
  const disari = binaEkle(d, 'cadir', K + 2, K + 2, { uid: 'dis' });
  assert.equal(cevreSavunmasi(disari).halka, 1.33);
  for (const x of [d, disari]) assert.equal(savunmaDokum(x).reduce((a, k) => a + k.deger, 0), savunmaHesapla(x));
});

test('Sur Parçası aynı sistemde: parça tavanı uygulanır (kenar +1: yerlestir.test)', () => {
  const d0 = durum({ cag: 'ortacag' });
  let d = d0;
  for (let i = 0; i < 40; i++) d = binaEkle(d, 'sur_parcasi', K + 6 + (i % 10), K + 1 + Math.floor(i / 10), { uid: `s${i}` });
  assert.equal(cevreSavunmasi(d).parca, 16); // 40 × 0,5 = 20 → tavan 16
});

test('insaEtCok: kaynak bitince kalanlar atlanır; dolu hücre atlanıp devam edilir; hiçbiri olmazsa hata ve durum aynı', () => {
  const d = durum({ kaynaklar: { yiyecek: 10, odun: 3, tas: 0, deri: 2 } });
  const hucreler = [[K + 7, K + 7], [K + 7, K + 5], [K + 8, K + 5], [K + 9, K + 5], [K + 10, K + 5]];
  const r = insaEtCok(d, 'cit', hucreler);
  assert.equal(r.hata, undefined);
  assert.equal(r.kurulan.length, 3);
  assert.deepEqual(r.atlanan.map((a) => [a.x, a.y]), [[K + 7, K + 7], [K + 10, K + 5]]);
  assert.match(r.atlanan[0].hata, /dolu/);
  assert.match(r.atlanan[1].hata, /Kaynak yetersiz/);
  assert.equal(r.durum.kaynaklar.odun, 0);
  const yok = insaEtCok({ ...d, kaynaklar: { ...d.kaynaklar, odun: 0 } }, 'cit', hucreler.slice(1));
  assert.match(yok.hata, /Kaynak yetersiz/);
  assert.equal(yok.kurulan.length, 0);
  assert.match(insaEtCok(d, 'cit', []).hata, /Hücre/);
});

test('çit: maliyet adetle büyümez, eşzamanlı inşaat sınırına sayılmaz, 1 günde biter', () => {
  const d = durum({ kaynaklar: { yiyecek: 10, odun: 30, tas: 0, deri: 4 } });
  const r = insaEtCok(d, 'cit', [[K + 7, K + 5], [K + 8, K + 5], [K + 9, K + 5]]);
  assert.deepEqual(maliyetHesapla(r.durum, 'cit'), { odun: 1 });
  assert.equal(suankiInsaatSayisi(r.durum), 0);
  const c = insaEt(r.durum, 'cadir', K + 3, K + 3); // Göçebe sınırı 1: çitler sınırı doldurmaz
  assert.equal(c.hata, undefined);
});

test('bağlantı maskesi: yalnız kenar komşuları (1=+x, 2=−x, 4=+y, 8=−y), çapraz sayılmaz', () => {
  const m = baglantiMaskeleri([[0, 0], [1, 0], [2, 0], [2, 1], [3, 3]]);
  assert.equal(m.get('0,0'), 1);
  assert.equal(m.get('1,0'), 1 | 2);
  assert.equal(m.get('2,0'), 2 | 4);
  assert.equal(m.get('2,1'), 8);
  assert.equal(m.get('3,3'), 0);
});

// Bina evrimi (yerinde dönüşüm): zincirler, %70 maliyet, durum korunumu, rollback, toplu seçim, kayıt.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evrimYap, evrimCok, evrimEdilebilirMi, evrimMaliyeti, evrimAdaylari, maliyetHesapla, insaEt, insaatSinirDolu, adimInsaat, yik,
} from '../src/core/insa.js';
import { EVRIM_MALIYET } from '../src/data/denge.js';
import { BINALAR } from '../src/data/binalar.js';
import { binaCalisir, binaBul, binaIsi, barinmaKapasitesi, evsizSayisi, kaynakYeter } from '../src/core/yardimci.js';
import { cagAtla } from '../src/core/cag.js';
import { turIlerlet } from '../src/core/tur.js';
import { isAta } from '../src/core/nufus.js';
import { serialize, yukle } from '../src/save/kayit.js';
import { izgara } from '../src/world/izgara.js';
import { durum, binaEkle, K } from './yardimci/durum.js';

const BOL = { yiyecek: 500, odun: 500, tas: 500, deri: 500, alet: 500, kil: 500, cevher: 500, metal: 500, mermer: 500, sikke: 500, kumas: 500, kitap: 500 };
const TUM_BULUS = ['deri_isleme', 'sulama', 'tunc_dokum', 'uclu_ekim'];
const tamam = (d, kaynak) => ({ ...d, kaynaklar: { ...d.kaynaklar, ...(kaynak || BOL) } });
// Evrimi bitirir: kuyruktaki işi süre dolana kadar adım adım ilerletir.
const bitir = (d) => { let x = d; for (let i = 0; i < 12 && x.insaatSirasi.some((s) => s.startsWith('evrim:')); i++) x = adimInsaat(x); return x; };

const ZINCIRLER = [
  ['cadir', 'kulube'], ['kulube', 'kerpic_ev'], ['kerpic_ev', 'tas_ev'], ['tas_ev', 'yari_ahsap_ev'],
  ['tahil_bahcesi', 'sulanan_tarla'], ['alet_yapimcisi', 'demirci'], ['cit', 'sur_parcasi'], ['kurutma_rafi', 'erzak_cukuru'],
  ['sulanan_tarla', 'ciftlik'],
];

test('veri: evrim zincirleri tabloda tanımlı ve hedefler gerçek binalar', () => {
  for (const [a, b] of ZINCIRLER) {
    assert.equal(BINALAR.find((x) => x.id === a).evrim, b, `${a} → ${b}`);
    assert.ok(BINALAR.find((x) => x.id === b), b);
  }
  assert.equal(EVRIM_MALIYET, 0.7);
});

test('maliyet: hedefin normal inşa maliyetinin %70\'i (tek merkez, tutarlı yuvarlama)', () => {
  const d = durum({ cag: 'tasdevri' });
  assert.deepEqual(maliyetHesapla(d, 'kulube'), { odun: 8, tas: 4 });
  assert.deepEqual(evrimMaliyeti(d, 'kulube'), { odun: 6, tas: 3 }); // 5,6 → 6 · 2,8 → 3
  // adet çarpanı da yansır: 2. Kulübe normalde 9 odun → evrim 6
  const iki = binaEkle(d, 'kulube', K + 5, K + 5);
  assert.deepEqual(maliyetHesapla(iki, 'kulube'), { odun: 9, tas: 4 });
  assert.deepEqual(evrimMaliyeti(iki, 'kulube'), { odun: 6, tas: 3 });
  // maliyetSabit hedef (Sur Parçası: 10 taş) → 7
  assert.deepEqual(evrimMaliyeti(durum({ cag: 'ortacag' }), 'sur_parcasi'), { tas: 7 });
});

for (const [a, b] of ZINCIRLER) {
  test(`zincir: ${a} → ${b} (maliyet düşer, eski bina sürer, bitince dönüşür, konum/uid korunur)`, () => {
    const hedef = BINALAR.find((x) => x.id === b);
    let d = durum({ cag: 'ortacag', buluslar: TUM_BULUS });
    d = tamam(d);
    d = binaEkle(d, a, K + 4, K + 4, { uid: 'e1', seviye: 2 });
    assert.equal(evrimEdilebilirMi(d, 'e1'), null, evrimEdilebilirMi(d, 'e1'));
    const maliyet = evrimMaliyeti(d, b);
    const once = { ...d.kaynaklar };
    const r = evrimYap(d, 'e1');
    assert.equal(r.hata, undefined);
    for (const [k, m] of Object.entries(maliyet)) assert.equal(r.durum.kaynaklar[k], once[k] - m, k);
    // süreç: anında değil; eski bina hâlâ eski kimlikte ve çalışır
    assert.equal(binaBul(r.durum, 'e1').id, a);
    assert.equal(binaIsi(r.durum, binaBul(r.durum, 'e1')), 'evrim');
    assert.equal(binaCalisir(r.durum, binaBul(r.durum, 'e1')), true);
    const bit = bitir(r.durum);
    const nb = binaBul(bit, 'e1');
    assert.equal(nb.id, b);
    assert.deepEqual([nb.x, nb.y, nb.uid], [K + 4, K + 4, 'e1']);
    assert.equal(nb.seviye, Math.min(1, hedef.maxSeviye)); // Sv2 → max(1, 1)
    assert.equal(bit.insaatSirasi.length, 0);
    assert.equal(bit.istatistik.evrim?.e1, undefined);
  });
}

test('çağ ve buluş şartı: hedef çağ açık değilse / buluş yoksa evrim başlamaz', () => {
  let d = tamam(durum({ cag: 'gocebe' }));
  d = binaEkle(d, 'cadir', K + 4, K + 4, { uid: 'c1' });
  assert.match(evrimEdilebilirMi(d, 'c1'), /gereken çağ/);
  assert.equal(evrimYap(d, 'c1').hata !== undefined, true);
  let t = tamam(durum({ cag: 'bronz', buluslar: [] }));
  t = binaEkle(t, 'tahil_bahcesi', K + 4, K + 4, { uid: 't1' });
  assert.match(evrimEdilebilirMi(t, 't1'), /buluşu gerekir/); // Sulama
  t = binaEkle(tamam(durum({ cag: 'bronz', buluslar: [] })), 'alet_yapimcisi', K + 4, K + 4, { uid: 'a1' });
  assert.match(evrimEdilebilirMi(t, 'a1'), /buluşu gerekir/); // Tunç Döküm
});

test('seviye aktarımı: max(1, eski − 1), hedef sınırını aşmaz', () => {
  for (const [eski, beklenen] of [[1, 1], [2, 1], [3, 2]]) {
    let d = tamam(durum({ cag: 'ortacag' }));
    d = binaEkle(d, 'kerpic_ev', K + 4, K + 4, { uid: 'k1', seviye: eski });
    assert.equal(binaBul(bitir(evrimYap(d, 'k1').durum), 'k1').seviye, beklenen);
  }
  // Çit (maxSeviye 1) hedef Sur Parçası; Sv1 → Sv1. Hedef sınırı 1 olsaydı sınır korunurdu.
  let d = tamam(durum({ cag: 'ortacag' }));
  d = binaEkle(d, 'cit', K + 4, K + 4, { uid: 'z1' });
  assert.equal(binaBul(bitir(evrimYap(d, 'z1').durum), 'z1').seviye, 1);
});

test('işçi ataması korunur (Alet Yapımcısı → Demirci)', () => {
  let d = tamam(durum({ cag: 'ortacag', buluslar: TUM_BULUS, nufus: 6, atama: { 'serbest:toplayici': 4 } }));
  d = binaEkle(d, 'alet_yapimcisi', K + 4, K + 4, { uid: 'a1' });
  d = isAta(d, 'a1', 2).durum;
  assert.equal(d.atama.a1, 2);
  const bit = bitir(evrimYap(d, 'a1').durum);
  assert.equal(binaBul(bit, 'a1').id, 'demirci');
  assert.equal(bit.atama.a1, 2);
});

test('konut evrimi: evsiz kalma yok, kapasite dönüşünce yeni binaya göre', () => {
  let d = tamam(durum({ cag: 'bronz', nufus: 3, atama: { 'serbest:toplayici': 3 } }));
  const eskiKap = barinmaKapasitesi(d);
  d = binaEkle(d, 'cadir', K + 5, K + 5, { uid: 'c1' });
  d = binaEkle(d, 'kulube', K + 6, K + 5, { uid: 'k1' });
  d = { ...d, nufus: barinmaKapasitesi(d), atama: { 'serbest:toplayici': barinmaKapasitesi(d) } };
  const kap = barinmaKapasitesi(d);
  assert.equal(evsizSayisi(d), 0);
  const r = evrimYap(d, 'k1'); // Kulübe → Kerpiç Ev
  assert.equal(r.hata, undefined);
  assert.equal(barinmaKapasitesi(r.durum), kap); // evrim sürerken kapasite aynı
  assert.equal(evsizSayisi(r.durum), 0);
  const bit = bitir(r.durum);
  assert.equal(barinmaKapasitesi(bit), kap + 1); // Kulübe 4 → Kerpiç 5
  assert.ok(eskiKap >= 0);
});

test('eşzamanlı inşaat sınırını tüketmez; evrim sırasında yeni inşaat başlatılabilir', () => {
  let d = tamam(durum({ cag: 'tasdevri' })); // eşzamanlı sınır 2
  d = binaEkle(d, 'cadir', K + 4, K + 4, { uid: 'c1' });
  d = binaEkle(d, 'cadir', K + 5, K + 4, { uid: 'c2' });
  d = evrimYap(evrimYap(d, 'c1').durum, 'c2').durum;
  assert.equal(d.insaatSirasi.length, 2);
  assert.equal(insaatSinirDolu(d), false);
  const yeni = insaEt(d, 'oduncu_kampi', K + 6, K + 6);
  assert.equal(yeni.hata, undefined);
});

test('rollback: geçersiz/yetersiz evrim durumu ve kaynakları değiştirmez', () => {
  let d = durum({ cag: 'tasdevri', kaynaklar: { yiyecek: 0, odun: 1, tas: 0, deri: 0 } });
  d = binaEkle(d, 'cadir', K + 4, K + 4, { uid: 'c1' });
  const once = structuredClone(d);
  const r = evrimYap(d, 'c1');
  assert.match(r.hata, /Kaynak yetersiz/);
  assert.deepEqual(r.durum, once);
  assert.deepEqual(d, once);
  // hasarlı bina
  let h = binaEkle(tamam(durum({ cag: 'tasdevri' })), 'cadir', K + 4, K + 4, { uid: 'c1', hasarli: true });
  const hOnce = structuredClone(h);
  assert.match(evrimYap(h, 'c1').hata, /hasarlı/);
  assert.deepEqual(h, hOnce);
  // merkez / evrimi olmayan / olmayan uid
  assert.ok(evrimYap(h, 'b1').hata);
  assert.ok(evrimYap(h, 'yok').hata);
  // aynı bina ikinci kez
  const ilk = evrimYap(tamam(binaEkle(durum({ cag: 'tasdevri' }), 'cadir', K + 4, K + 4, { uid: 'c1' })), 'c1').durum;
  assert.match(evrimYap(ilk, 'c1').hata, /süren bir iş/);
});

test('bozuk/yarım evrim kaydı: kuyruk girdisi düşer, bina bozulmaz; yıkınca kayıt temizlenir', () => {
  let d = tamam(durum({ cag: 'tasdevri' }));
  d = binaEkle(d, 'cadir', K + 4, K + 4, { uid: 'c1' });
  const r = evrimYap(d, 'c1').durum;
  const bozuk = { ...r, istatistik: { ...r.istatistik, evrim: {} } };
  const bit = bitir(bozuk);
  assert.equal(binaBul(bit, 'c1').id, 'cadir');
  assert.equal(bit.insaatSirasi.length, 0);
  const y = yik(r, 'c1').durum;
  assert.equal(y.insaatSirasi.length, 0);
  assert.equal(y.istatistik.evrim.c1, undefined);
});

test('toplu evrim: yalnız seçilenler dönüşür, kaynak bitince kalanlar atlanır, hiçbiri olmazsa durum aynı', () => {
  let d = tamam(durum({ cag: 'tasdevri' }));
  for (const [i, uid] of ['c1', 'c2', 'c3'].entries()) d = binaEkle(d, 'cadir', K + 3 + i, K + 4, { uid });
  const r = evrimCok(d, ['c1', 'c3']);
  assert.deepEqual(r.yapilan, ['c1', 'c3']);
  const bit = bitir(r.durum);
  assert.deepEqual(['c1', 'c2', 'c3'].map((u) => binaBul(bit, u).id), ['kulube', 'cadir', 'kulube']);
  // kaynak yalnız birine yetiyor
  const az = { ...d, kaynaklar: { ...d.kaynaklar, odun: 7, tas: 3 } };
  const k = evrimCok(az, ['c1', 'c2', 'c3']);
  assert.deepEqual(k.yapilan, ['c1']);
  assert.equal(k.atlanan.length, 2);
  // hiçbiri olmazsa durum değişmez
  const bos = { ...d, kaynaklar: { ...d.kaynaklar, odun: 0, tas: 0 } };
  const h = evrimCok(bos, ['c1', 'c2']);
  assert.ok(h.hata);
  assert.deepEqual(h.durum, bos);
  assert.ok(evrimCok(d, []).hata);
});

test('koşullu evrim: Sulanan Tarla (2×2) → Çiftlik (3×3) yalnız yer uygunsa; alan evrim sırasında ayrılır', () => {
  const kur = (engel) => {
    let d = tamam(durum({ cag: 'ortacag', buluslar: ['sulama', 'uclu_ekim'] }));
    d = binaEkle(d, 'sulanan_tarla', K + 4, K + 4, { uid: 's1' });
    if (engel) d = binaEkle(d, 'cadir', K + 6, K + 4, { uid: 'engel' }); // 3×3'ün sağ sütununu işgal eder
    return d;
  };
  assert.match(evrimEdilebilirMi(kur(true), 's1'), /sığmaz/);
  assert.ok(evrimYap(kur(true), 's1').hata);
  const d = kur(false);
  assert.equal(evrimEdilebilirMi(d, 's1'), null);
  const r = evrimYap(d, 's1').durum;
  const hucre = izgara(r);
  const n = r.harita.boyut;
  assert.equal(hucre[(K + 6) * n + (K + 6)], 's1'); // 3×3 köşesi ayrıldı
  assert.ok(insaEt(r, 'cadir', K + 6, K + 6).hata); // üstüne bina kurulamaz
  assert.equal(binaBul(bitir(r), 's1').id, 'ciftlik');
});

test('çağ atlayınca dönüştürülebilir yapılar bildirilir; otomatik dönüşüm yapılmaz', () => {
  let d = tamam(durum({ cag: 'gocebe', nufus: 8, buluslar: ['yerlesik_hayat', 'tas_yontma'] }));
  d = binaEkle(d, 'cadir', K + 4, K + 4, { uid: 'c1' });
  d = binaEkle(d, 'cadir', K + 5, K + 4, { uid: 'c2' });
  d = binaEkle(d, 'cadir', K + 6, K + 4, { uid: 'c3' });
  d = binaEkle(d, 'totem', K + 7, K + 4, { uid: 't1' });
  const r = cagAtla(d);
  assert.equal(r.hata, undefined, r.hata);
  const b = r.bildirimler.find((x) => x.kod === 'evrim_hazir');
  assert.ok(b);
  assert.match(b.metin, /4 Çadır/); // 3 eklenen + başlangıç konutu
  assert.ok(['c1', 'c2', 'c3'].every((u) => binaBul(r.durum, u).id === 'cadir'));
  assert.deepEqual(evrimAdaylari(r.durum).sort(), ['b2', 'c1', 'c2', 'c3']);
});

test('kayıt: evrim sürerken kaydet → yükle aynı durumu verir ve evrim tamamlanır', () => {
  let d = tamam(durum({ cag: 'tasdevri' }));
  d = binaEkle(d, 'cadir', K + 4, K + 4, { uid: 'c1' });
  const r = evrimYap(d, 'c1').durum;
  const y = yukle(serialize(r));
  assert.deepEqual(y.insaatSirasi, r.insaatSirasi);
  assert.deepEqual(y.istatistik.evrim, r.istatistik.evrim);
  assert.equal(binaBul(bitir(y), 'c1').id, 'kulube');
  assert.equal(binaBul(y, 'c1').id, 'cadir');
});

test('tur akışı: evrim turIlerlet içinde tamamlanır ve bildirim verir', () => {
  let d = tamam(durum({ cag: 'tasdevri' }));
  d = binaEkle(d, 'cadir', K + 4, K + 4, { uid: 'c1' });
  let x = evrimYap(d, 'c1').durum;
  let metin = [];
  for (let i = 0; i < 4 && binaBul(x, 'c1').id === 'cadir'; i++) {
    const t = turIlerlet(x);
    x = t.durum;
    metin.push(...t.bildirimler.map((b) => b.metin));
  }
  assert.equal(binaBul(x, 'c1').id, 'kulube');
  assert.ok(metin.some((m) => /Çadır, Kulübe oldu/.test(m)), metin.join(' | '));
  assert.ok(kaynakYeter(x, {}));
});

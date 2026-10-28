// Görsel otomatik savaş F1 (docs/SAVAS.md §5–§6, §11): kademe kilidi, olay listesi determinizmi, ölüm yok, ayar kapalı = eski yol,
// yerleşim/öneri, nüfustan asker terfisi, kayıt v4 → v5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum, cagBaslangic } from './yardimci/durum.js';
import { kahramanli, isaretli } from './yardimci/aksiyon.js';
import { turIlerlet, mevsimSonunaIlerlet } from '../src/core/tur.js';
import { olayCoz, secenekUygunMu } from '../src/core/olay.js';
import { OLAY, askerToplam } from '../src/core/yardimci.js';
import { seferGonder, seferOnizleme, sonucBelirle, seferOlasiliklari } from '../src/core/sefer.js';
import {
  savasOlayListesi, savasKur, yerlesimKaydet, yerlesimOnizle, savasBaslat, savasIzle, savasGorunumu, savasCarpanlari, birlikListesi,
  oneriYerlesim, birlikTerfi, birlikTerhis, orduGorunumu, KADEMELER,
} from '../src/core/savas.js';
import { savunmaDokum, savunmaHesapla } from '../src/core/savunma.js';
import { rngSonraki } from '../src/core/rng.js';
import { serialize, yukle, KAYIT_SURUM } from '../src/save/kayit.js';
import { SEFER_SANS, NUFUS_MIN } from '../src/data/denge.js';
import { FORM_SINIR, KARS_SINIR, SAVAS_ZORLUK } from '../src/data/savas.js';

const ACIK = { savasSahnesi: true };
const kalabalik = (n = 7, ek = {}) => durum({ nufus: n, atama: { 'serbest:toplayici': n }, kaynaklar: { yiyecek: 40, odun: 20, tas: 5, deri: 5 }, ...ek });
// Olayları ilk uygun seçenekle çözerek tur ilerletir (sec ile).
function ilerle(d0, sec = {}) {
  let d = d0;
  if (d.olay.aktif) d = olayCoz(d, OLAY[d.olay.aktif.id].secenekler.findIndex((s) => secenekUygunMu(d, s))).durum;
  const r = turIlerlet(d, sec);
  return { d: r.durum, bildirimler: r.bildirimler };
}
// Ayı seferi gönderilmiş durum.
function ayiSeferi(tohum = 3, isci = 2) {
  const { d: d0, uid: h } = kahramanli(kalabalik(7, {}), 'avci', { seviye: 2 });
  const d1 = { ...d0, tohum };
  const { d, uid: ayi } = isaretli(d1, 'ayi');
  const r = seferGonder(d, 'ayi_avi', ayi, { kahraman: [h], isci });
  assert.ok(!r.hata, r.hata);
  return { d: r.durum, uid: r.uid, h };
}
const GIRDI = (tohum, kademe, birimler) => ({ no: 1, tohum, uid: `s${tohum}`, sefer: 'ayi_avi', dusman: 'ayi', cag: 'gocebe', kademe, turNo: 5,
  rutbe: 'lider', yildiz: 1, izgara: [3, 3], birimler });
const EKIPLER = [
  [{ id: 'k:h1', tur: 'kahraman', sira: 1, sutun: 1, sinif: 'avci', sv: 1, ad: 'Tuna', silah: 0, giysi: 0 }],
  [{ id: 'k:h1', tur: 'kahraman', sira: 1, sutun: 1, sinif: 'avci', sv: 2, ad: 'Tuna', silah: 0, giysi: 1 }, { id: 'i0', tur: 'mizrakci', sira: 0, sutun: 1 }],
  [{ id: 'k:h1', tur: 'kahraman', sira: 1, sutun: 1, sinif: 'kasif', sv: 3, ad: 'Alp', silah: 1, giysi: 1 }, { id: 'i0', tur: 'mizrakci', sira: 0, sutun: 0 },
    { id: 'i1', tur: 'mizrakci', sira: 0, sutun: 2 }, { id: 'i2', tur: 'okcu', sira: 2, sutun: 1 }],
  [{ id: 'i0', tur: 'mizrakci', sira: 0, sutun: 1 }, { id: 'i1', tur: 'okcu', sira: 2, sutun: 1 }, { id: 'onder', tur: 'onder', sira: 1, sutun: 1 }],
  [{ id: 'k:h1', tur: 'kahraman', sira: 1, sutun: 1, sinif: 'avci', sv: 4, ad: 'Ece', silah: 1, giysi: 1 }, { id: 'i0', tur: 'okcu', sira: 0, sutun: 0 },
    { id: 'i1', tur: 'okcu', sira: 0, sutun: 1 }, { id: 'i2', tur: 'okcu', sira: 0, sutun: 2 }, { id: 'i3', tur: 'mizrakci', sira: 2, sutun: 1 }],
];
const IZINLI = new Set(['yuru', 'saldiri', 'mermi', 'vurus', 'yetenek', 'sersem', 'cokme', 'geri_cekil', 'kacis', 'zafer', 'bitis']);

test('olay listesi saf ve yeniden üretilebilir: aynı girdi → bit düzeyinde aynı liste; girdi değişmez', () => {
  const g = GIRDI(42, 'basari', EKIPLER[2]);
  const once = JSON.stringify(g);
  const a = savasOlayListesi(g), b = savasOlayListesi(structuredClone(g));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(JSON.stringify(g), once);
  assert.notEqual(JSON.stringify(savasOlayListesi(GIRDI(43, 'basari', EKIPLER[2])).olaylar), JSON.stringify(a.olaylar), 'tohum akışı etkili');
});

test('kademe kilidi 1000 girdi: sim kademesi = çekirdek kademesi %100; ölçüt ≥ %98 doğal (zorunlu bitiş az); sim < 20 ms; süre 6–23 sn', (t) => {
  let zorla = 0, enCok = 0;
  const sure = [];
  for (let i = 1; i <= 1000; i++) {
    const kd = KADEMELER[i % 4];
    const t0 = performance.now();
    const l = savasOlayListesi(GIRDI(i, kd, EKIPLER[i % EKIPLER.length]));
    enCok = Math.max(enCok, performance.now() - t0);
    assert.equal(l.kademe, kd);
    assert.equal(l.olaylar.at(-1).tur, 'bitis');
    assert.equal(l.olaylar.at(-1).ek.kademe, kd);
    if (l.zorla) zorla++;
    sure.push(l.sure);
    const dc = l.olaylar.some((x) => x.tur === 'cokme' && x.h === 'd0');
    if (kd === 'buyuk' || kd === 'basari') assert.ok(dc || l.zorla, 'düşman çöker');
    if (kd === 'kismi') assert.ok(!dc && l.olaylar.some((x) => x.tur === 'kacis'), 'kısmi: düşman kaçar');
    if (kd === 'basarisiz') assert.ok(!dc && l.olaylar.some((x) => x.tur === 'geri_cekil' && x.ek?.ekip), 'başarısız: ekip çekilir');
    if (kd === 'buyuk' && !l.zorla) assert.ok(l.ozet.ekipCan >= 0.6 && l.ozet.coken.length <= 1);
  }
  sure.sort((a, b) => a - b);
  t.diagnostic(`zorunlu bitiş ${zorla}/1000 · en uzun sim ${enCok.toFixed(1)} ms · süre min/ortanca/max ${sure[0]}/${sure[500]}/${sure[999]} sn (+ sahne girişi ~2,5 sn)`);
  assert.ok(zorla <= 20);
  assert.ok(enCok < 20);
  assert.ok(sure[0] >= 6 && sure[999] <= 23);
});

test('ölüm yok: yalnız izinli olay türleri; çöken her biz birimi geri çekilir ya da savaş biter; can 0 altına inmez; ≤ 60 birim', () => {
  for (let i = 1; i <= 200; i++) {
    const l = savasOlayListesi(GIRDI(i, KADEMELER[i % 4], EKIPLER[i % EKIPLER.length]));
    assert.ok(l.birimler.length <= 60);
    for (const o of l.olaylar) {
      assert.ok(IZINLI.has(o.tur), o.tur);
      if (o.tur === 'vurus') assert.ok(o.kalan >= 0 && o.d >= 1);
    }
    for (const c of l.olaylar.filter((x) => x.tur === 'cokme' && x.h !== 'd0')) {
      const sonra = l.olaylar.some((x) => x.tur === 'geri_cekil' && x.h === c.h && x.t >= c.t);
      assert.ok(sonra || c.t >= l.tick - 4, 'çöken arkaya çekilir');
    }
  }
});

test('ayar KAPALI = eski yol: savaş durumu doğmaz, sonuç tek sefer.rng çekiminden eski formülle; açık/kapalı aynı u', () => {
  const { d: s } = ayiSeferi(3, 2);
  const u = rngSonraki(s.sefer.rng).deger;
  const sf = s.sefer.aktif[0];
  // kapalı
  let x = s, donus = null;
  for (let i = 0; i < 6 && !donus; i++) {
    const r = ilerle(x);
    x = r.d;
    assert.ok(!r.bildirimler.some((b) => b.kod.startsWith('savas_')));
    assert.ok((x.sefer.aktif[0]?.savas ?? null) === null);
    donus = r.bildirimler.find((b) => b.kod === 'sefer_dondu');
  }
  assert.ok(donus);
  // yolda olay yoksa (bu kurulumda yok) sefer.rng'nin ilk çekimi sonuçtur
  assert.equal(donus.sonuc, sonucBelirle((sf.guc / sf.zorluk) * (SEFER_SANS[0] + SEFER_SANS[1] * u)));
  // açık: varış → bekliyor → (saldırtılmazsa) sonraki tur otomatik savaş; kademe aynı u ile savaş r'sinden
  let y = s, hazir = null, oto = null, donus2 = null;
  for (let i = 0; i < 6 && !donus2; i++) {
    const r = ilerle(y, ACIK);
    y = r.d;
    hazir = hazir || r.bildirimler.find((b) => b.kod === 'savas_hazir');
    oto = oto || r.bildirimler.find((b) => b.kod === 'savas_izle');
    donus2 = r.bildirimler.find((b) => b.kod === 'sefer_dondu');
    if (hazir && !oto && !donus2) {
      const k = savasKur(y, sf.uid);
      assert.equal(k.durum, 'bekliyor');
      const rr = (sf.guc * k.carpanlar.carpan) / (sf.zorluk * SAVAS_ZORLUK.ayi_avi);
      assert.equal(k.oran, Math.round(rr * 100) / 100);
      var beklenen = sonucBelirle(rr * (SEFER_SANS[0] + SEFER_SANS[1] * u)); // eslint-disable-line no-var
    }
  }
  assert.ok(hazir && oto && donus2, 'varış bildirimi, otomatik savaş ve dönüş');
  assert.equal(oto.kademe, beklenen);
  assert.equal(donus2.sonuc, oto.kademe, 'dönüş sonucu savaş kademesi');
  assert.ok(oto.izle && savasIzle(y, oto.savas)?.liste.kademe === oto.kademe, 'İzle: kayıtlı girdiden olay listesi');
  // Kademe aynıysa iki modda sefer.rng aynı sayıda çekilmiştir (tek çekim savaşa taşındı).
  if (beklenen === donus.sonuc) assert.equal(y.sefer.rng, x.sefer.rng);
});

test('yerleşim: öneri mızrakçıyı öne, kahraman ortada sabit; kötü düzen (okçu önde) daha düşük; çarpanlar sınırlarda', () => {
  const { d: s, uid } = ayiSeferi(5, 3);
  let y = s;
  while (!y.sefer.aktif[0].savas) y = ilerle(y, ACIK).d;
  const k = savasKur(y, uid);
  assert.equal(k.izgara.acik.length, 4);
  assert.deepEqual(k.izgara.kahraman, { sira: 1, sutun: 1 });
  const kah = k.oneri.find((x) => x.rol === 'kahraman');
  assert.deepEqual([kah.sira, kah.sutun], [1, 1]);
  assert.ok(k.oneri.filter((x) => x.rol === 'mizrakci').every((x) => x.sira === 0));
  const kotu = k.oneri.map((x) => (x.rol === 'kahraman' ? x : { ...x, rol: 'okcu', sira: 0 }));
  const ko = yerlesimOnizle(y, uid, kotu);
  assert.ok(!ko.hata, ko.hata);
  assert.ok(ko.carpanlar.carpan < k.oneriCarpanlar.carpan);
  for (const c of [ko.carpanlar, k.oneriCarpanlar]) {
    assert.ok(c.formC >= FORM_SINIR[0] && c.formC <= FORM_SINIR[1] && c.karsC >= KARS_SINIR[0] && c.karsC <= KARS_SINIR[1]);
  }
  assert.match(yerlesimOnizle(y, uid, k.oneri.map((x) => (x.rol === 'kahraman' ? { ...x, sira: 0, sutun: 0 } : x))).hata, /ortada/);
  assert.match(yerlesimOnizle(y, uid, k.oneri.slice(1)).hata, /Tüm birlikler/);
  // kaydet → savasKur aynı yerleşimi gösterir; olasılık çubuğu bu düzenin
  const kay = yerlesimKaydet(y, uid, kotu);
  assert.ok(!kay.hata);
  const k2 = savasKur(kay.durum, uid);
  assert.deepEqual(k2.yerlesim, kotu);
  assert.deepEqual(k2.olasiliklar, ko.olasiliklar);
  // Saldır → kademe; ikinci kez hata; sonuç girdisi kayıtta
  const b = savasBaslat(kay.durum, uid);
  assert.ok(!b.hata, b.hata);
  assert.ok(KADEMELER.includes(b.savas.kademe));
  assert.equal(b.liste.kademe, b.savas.kademe);
  assert.match(savasBaslat(b.durum, uid).hata, /zaten/);
  assert.equal(savasGorunumu(b.durum, ACIK).son.length, 1);
  assert.ok(b.durum.rutbe.zp >= 0);
});

test('birlik yoksa (yalnız kahraman) formC = karsC = 1: bugünkü sonuç birebir (yalnız zorluk çarpanı)', () => {
  const { d } = kahramanli(kalabalik(), 'avci');
  const e = { kahraman: [d.kahramanlar[0].uid], isci: 0 };
  const b = birlikListesi(d, e);
  const c = savasCarpanlari(d, b, oneriYerlesim(d, b, 'canavar', 3), 'canavar', 3);
  assert.equal(c.formC, 1); assert.equal(c.karsC, 1);
  const { d: d2, uid: ayi } = isaretli(d, 'ayi');
  const kapali = seferOnizleme(d2, 'ayi_avi', ayi, e), acik = seferOnizleme(d2, 'ayi_avi', ayi, e, ACIK);
  assert.ok(Math.abs(acik.oran - Math.round((kapali.guc / kapali.zorluk / SAVAS_ZORLUK.ayi_avi) * 100) / 100) < 0.011);
  assert.equal(kapali.savas, null);
  assert.deepEqual(seferOlasiliklari(kapali.oran), kapali.olasiliklar);
});

test('asker = nüfustan terfi: Göçebe\'de yok; tavan nüfusun %30\'u; köyde ≥ 2 sivil; terhis; savunmada "Ordu" kalemi; seferde', () => {
  const g = kalabalik(10);
  assert.match(birlikTerfi(g, 'mizrakci', 1).hata, /Taş Devri/);
  let d = cagBaslangic('tasdevri', 2);
  d = { ...d, nufus: 10, atama: {}, kaynaklar: { ...d.kaynaklar, yiyecek: 60, odun: 30, deri: 10 } };
  assert.match(birlikTerfi(d, 'mizrakci', 4).hata, /En çok 3/);
  const r = birlikTerfi(d, 'mizrakci', 2);
  assert.ok(!r.hata, r.hata);
  assert.equal(askerToplam(r.durum), 2);
  assert.equal(r.durum.kaynaklar.yiyecek, d.kaynaklar.yiyecek - 6);
  assert.equal(orduGorunumu(r.durum).birlikler.find((b) => b.id === 'mizrakci').koyde, 2);
  const ordu = savunmaDokum(r.durum).find((k) => k.id === 'ordu');
  assert.equal(ordu.deger, 1.5);
  assert.equal(savunmaHesapla(r.durum), savunmaDokum(r.durum).reduce((a, k) => a + k.deger, 0));
  // köyde ≥ 2 sivil: 3 kişilik köyde terfi yok
  const kucuk = { ...d, nufus: 3 };
  assert.ok(birlikTerfi(kucuk, 'mizrakci', 1).hata);
  // terhis
  const t = birlikTerhis(r.durum, 'mizrakci', 1);
  assert.equal(askerToplam(t.durum), 1);
  assert.match(birlikTerhis(r.durum, 'okcu', 1).hata, /Köyde 0/);
  // asker sefere katılır: ekip gücü kalemi, köydeki asker düşer, savaşta sabit rollü birlik
  const { d: dk, uid: h } = kahramanli(r.durum, 'avci');
  const { d: di, uid: ayi } = isaretli(dk, 'ayi');
  const on = seferOnizleme(di, 'ayi_avi', ayi, { kahraman: [h], asker: { mizrakci: 1 } }, ACIK);
  assert.ok(on.uygun, on.hata);
  assert.ok(on.kalemler.some((k) => k.id === 'asker:mizrakci'));
  const sg = seferGonder(di, 'ayi_avi', ayi, { kahraman: [h], asker: { mizrakci: 1 } });
  assert.equal(orduGorunumu(sg.durum).birlikler.find((b) => b.id === 'mizrakci').koyde, 1);
  assert.ok(birlikListesi(sg.durum, sg.durum.sefer.aktif[0].ekip).some((b) => b.id === 'a:mizrakci:0' && b.roller.join() === 'mizrakci'));
  assert.match(seferOnizleme(sg.durum, 'ayi_avi', ayi, { asker: { mizrakci: 2 } }).hata || '', /.+/);
  // nüfus ≥ NUFUS_MIN her tur (askerli köy)
  let x = r.durum;
  for (let i = 0; i < 6; i++) { x = ilerle(x, ACIK).d; assert.ok(x.nufus >= NUFUS_MIN); assert.ok(askerToplam(x) <= x.nufus); }
});

test('kayıt v5: v4 kaydı açılır (ordu boş, rütbe Lider, savaş geçmişi boş; yolda sefer savas:null); bekleyen savaş gidiş-dönüş aynı', () => {
  assert.equal(KAYIT_SURUM, 5);
  const { d: s } = ayiSeferi(7, 1);
  const v4 = JSON.parse(serialize(s));
  v4.surum = 4;
  delete v4.ordu; delete v4.rutbe; delete v4.savas;
  for (const sf of v4.sefer.aktif) { delete sf.savas; delete sf.ekip.asker; }
  const y = yukle(JSON.stringify(v4));
  assert.equal(y.surum, 5);
  assert.deepEqual(y.ordu, { asker: {}, kademe: {}, yerlesim: {} });
  assert.deepEqual(y.rutbe, { zp: 0, sira: 0, yildiz: 1 });
  assert.deepEqual(y.savas, { sayac: 0, son: [] });
  assert.equal(y.sefer.aktif[0].savas, null);
  assert.deepEqual(y.sefer.aktif[0].ekip.asker, {});
  assert.deepEqual(turIlerlet(y), turIlerlet(s), 'göç sonrası aynı sonraki tur');
  // Taş çağında göç: ZP = 5 × çağSırası
  const t = JSON.parse(serialize(cagBaslangic('tasdevri', 2)));
  t.surum = 4; delete t.rutbe;
  assert.equal(yukle(JSON.stringify(t)).rutbe.zp, 5);
  // bekleyen + bitmiş savaş gidiş-dönüş
  let z = s;
  while (!z.sefer.aktif[0]?.savas) z = ilerle(z, ACIK).d;
  const k = savasKur(z, z.sefer.aktif[0].uid);
  z = yerlesimKaydet(z, k.uid, k.oneri).durum;
  assert.deepEqual(yukle(serialize(z)), z);
  const b = savasBaslat(z, k.uid).durum;
  const geri = yukle(serialize(b));
  assert.deepEqual(geri, b);
  assert.deepEqual(turIlerlet(geri, ACIK), turIlerlet(b, ACIK));
  assert.ok(serialize(b).length - serialize(s).length < 900, 'kayıt büyümesi küçük');
  // bozuk girdi atılır
  const ham = JSON.parse(serialize(b));
  ham.savas.son.push({ no: 'x' }); ham.ordu.asker.ejderha = 3; ham.rutbe.sira = 99;
  const zz = yukle(JSON.stringify(ham));
  assert.equal(zz.savas.son.length, 1);
  assert.equal('ejderha' in zz.ordu.asker, false);
  assert.equal(zz.rutbe.sira, 0);
});

test('mevsimSonunaIlerlet: savaş sahnesi açıkken savas_hazir gelince durur (neden savas); kapalıyken savas_hazir üretilmez, durmaz', () => {
  const { d: s } = ayiSeferi(3, 2);
  // yerleşim bekleyen savaş ortaya çıkana dek tek tek ilerle, bir önceki durumu ayır
  let x = s, onceki = null;
  for (let i = 0; i < 8; i++) {
    const r = ilerle(x, ACIK);
    if (r.bildirimler.some((b) => b.kod === 'savas_hazir')) { onceki = x; break; }
    x = r.d;
  }
  assert.ok(onceki, 'savas_hazir üretildi');
  const ac = mevsimSonunaIlerlet({ ...onceki, onder: { ...onceki.onder } }, ACIK);
  assert.equal(ac.neden, 'savas');
  assert.ok(ac.bildirimler.some((b) => b.kod === 'savas_hazir'));
  assert.ok(ac.turSayisi >= 1);
  const kapali = mevsimSonunaIlerlet(s);
  assert.ok(!kapali.bildirimler.some((b) => b.kod.startsWith('savas_')));
  assert.notEqual(kapali.neden, 'savas');
});

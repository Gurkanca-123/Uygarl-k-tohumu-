// Dış tehditler tüm çağlarda (docs/TEHDIT.md §2.2, §5, §9; 2026-10-26 "tüm çağlara yay" dilimi):
// çağ başına aday/güç, özel koşullar, çağ darbesi, kuşatma evresi + karar, Silah Dağıt, Nöbet Tut, Elçi Gönder, kayıt,
// çağ başlangıç durumlarında ölüm sarmalı koruması ve tempo ölçümü.
import test from 'node:test';
import assert from 'node:assert/strict';
import { durum, binaEkle, karoKoy, K, cagBaslangic, CAG_SIRASI } from './yardimci/durum.js';
import { turIlerlet } from '../src/core/tur.js';
import {
  adimTehdit, tehditGucu, TEHDIT, adayTehditler, haracOde, tahkimatYap, tehditTavir, tehditGorunumu, kayipOrani,
  silahDagit, kusatmaKarar, elciBilgi, haracMaliyeti, ozelKosulSaglanir, beklenenSonuc, tehditCagda,
} from '../src/core/tehdit.js';
import { onderEylemiSec, adimOnder } from '../src/core/eylem.js';
import { savunmaHesapla, savunmaDokum } from '../src/core/savunma.js';
import { olayCoz, secenekUygunMu } from '../src/core/olay.js';
import { OLAY, etkinDegistiriciler } from '../src/core/yardimci.js';
import { serialize, yukle } from '../src/save/kayit.js';
import { VERI } from '../src/data/index.js';
import { dogrula } from '../src/data/dogrula.js';
import { CAGLAR } from '../src/data/caglar.js';
import { NUFUS_MIN, TEHDIT_GUC_UST, ZORLUK } from '../src/data/denge.js';

const aktif = (id, guc, ek = {}) => ({ id, guc, aralik: [Math.floor(guc * 0.8), Math.ceil(guc * 1.2)], kalan: 1, tavir: 'savun',
  bilinen: true, erteleme: 0, tahkimat: false, evre: 'uyari', karar: false, elciDenendi: false, silah: 0, ...ek });
const tehditle = (d, a, T = {}) => ({ ...d, tehdit: { ...d.tehdit, aktif: a, ...T } });
const varis = (d) => { const bl = []; const x = adimTehdit(d, bl); return { d: x, bl }; };

test('veri: 10 tehdit, dogrula kırık başvuru yok; her çağda ≥ 2 aday; bozuk özel koşul yakalanır', () => {
  assert.equal(VERI.TEHDITLER.length, 10);
  assert.deepEqual(dogrula(VERI), []);
  const v = structuredClone({ ...VERI, DENGE: { ...VERI.DENGE } });
  v.TEHDITLER.find((t) => t.id === 'korsanlar').ozelKosul = 'deniz';
  v.TEHDITLER.find((t) => t.id === 'ayi').cagaGore.bronz.hedef = ['altin'];
  const h = dogrula(v);
  assert.ok(h.some((x) => /özel koşul/.test(x)));
  assert.ok(h.some((x) => /altin/.test(x)));
});

test('her çağ: aday listesi, Barışçıl yalnız yırtıcı, güç çağla artar ve gucUst altında', () => {
  const beklenen = {
    gocebe: ['ayi', 'kurt_surusu'],
    tasdevri: ['avci_cetesi', 'ayi', 'komsu_baskini', 'kurt_surusu'],
    bronz: ['akincilar', 'avci_cetesi', 'ayi', 'haydutlar', 'komsu_baskini'],
    antik: ['akincilar', 'barbar_akini', 'haydutlar', 'komsu_baskini', 'korsanlar'],
    ortacag: ['barbar_akini', 'haydutlar', 'komsu_baskini', 'korsanlar', 'kusatma', 'yagma_seferi'],
  };
  let onceki = 0;
  for (const cag of CAG_SIRASI) {
    let d = cagBaslangic(cag, 1);
    if (cag !== 'gocebe') d = karoKoy(binaEkle(d, 'pazar_yeri', K + 18, K + 2), K + 19, K + 6, 'su'); // ticaret + kıyı koşulu
    const ids = adayTehditler(d).map((t) => t.id).sort();
    assert.deepEqual(ids, beklenen[cag], cag);
    assert.ok(ids.length >= 2);
    assert.ok(adayTehditler({ ...d, zorluk: 'barisci' }).every((t) => t.tur === 'yirtici'));
    const guc = adayTehditler(d).map((t) => tehditGucu(d, t));
    const ust = Math.ceil(CAGLAR.find((c) => c.id === cag).saldiriTaban * TEHDIT_GUC_UST);
    assert.ok(Math.max(...guc) <= ust, `${cag} güç ${guc} üst ${ust}`);
    assert.ok(Math.max(...guc) > onceki, `${cag} en güçlü tehdit bir önceki çağdan güçlü`);
    onceki = Math.max(...guc);
    for (const z of Object.keys(ZORLUK)) {
      for (const t of adayTehditler(d)) assert.ok(tehditGucu({ ...d, zorluk: z }, t) >= 1);
    }
  }
});

test('özel koşullar: haydutlar Pazar/kervan ister, korsanlar kıyı ister; cagaGore adı/hedefi çağa göre', () => {
  const d = cagBaslangic('bronz', 2);
  assert.equal(ozelKosulSaglanir(d, 'ticaret'), false);
  assert.equal(ozelKosulSaglanir({ ...d, kervanlar: [{ kaynak: 'metal', miktar: 5, tur: 99 }] }, 'ticaret'), true);
  assert.equal(ozelKosulSaglanir(karoKoy(d, K + 7, K + 14, 'su'), 'kiyi'), true);
  assert.equal(tehditCagda(TEHDIT.komsu_baskini, 'antik').ad, 'Komşu Kent Saldırısı');
  assert.deepEqual(tehditCagda(TEHDIT.haydutlar, 'bronz').hedef, ['metal', 'alet']);
});

test('çağ darbesi: kısmi kayıp oranı çağla artar, yenilgi tavanı %25 (Zor %30) korunur; yenilgide huzur düşer', () => {
  const oran = CAG_SIRASI.map((c) => kayipOrani(cagBaslangic(c, 1), TEHDIT.komsu_baskini, 'kismi'));
  for (let i = 1; i < oran.length; i++) assert.ok(oran[i] >= oran[i - 1]);
  assert.ok(oran[4] > oran[0]);
  for (const c of CAG_SIRASI) {
    const d = cagBaslangic(c, 1);
    assert.ok(kayipOrani(d, TEHDIT.komsu_baskini, 'yenilgi') <= 0.25);
    assert.ok(kayipOrani({ ...d, zorluk: 'zor' }, TEHDIT.komsu_baskini, 'yenilgi') <= 0.30);
  }
  const o = cagBaslangic('ortacag', 1);
  const y = varis(tehditle({ ...o, huzur: 60 }, aktif('yagma_seferi', 200)));
  assert.equal(y.d.tehdit.gecmis.at(-1).sonuc, 'yenilgi');
  assert.ok(y.d.huzur <= 50);
  assert.ok(y.d.binalar.some((b) => b.hasarli));
  assert.ok(y.d.binalar.filter((b) => b.hasarli).every((b) => !['tas_ev', 'sehir_meydani'].includes(b.id))); // konut/merkez hasarsız
  assert.ok(y.d.kaynaklar.yiyecek >= 2 * o.nufus);                                                  // kış azığı
  const b = cagBaslangic('antik', 1);
  const istila = varis(tehditle(b, aktif('barbar_akini', 200)));
  assert.ok(istila.d.degistiriciler.some((m) => m.id === 'istila_yikimi'));
});

test('yağma: haydut yenilgisinde yoldaki kervan çalınır', () => {
  const d = { ...cagBaslangic('bronz', 1), kervanlar: [{ kaynak: 'metal', miktar: 15, tur: 99 }] };
  const y = varis(tehditle(d, aktif('haydutlar', 200)));
  assert.equal(y.d.kervanlar.length, 0);
  assert.ok(y.bl.some((b) => b.kod === 'kervan'));
});

test('kuşatma: varışta savunma yetmezse evre + karar; ticaret kapalı; Dayan / Fidye; saklanma ve tahkimat yok', () => {
  const o = { ...cagBaslangic('ortacag', 1), kaynaklar: { ...cagBaslangic('ortacag', 1).kaynaklar, sikke: 200 } };
  const r = varis(tehditle(o, aktif('kusatma', 80)));
  const a = r.d.tehdit.aktif;
  assert.equal(a.evre, 'kusatma');
  assert.equal(a.karar, true);
  assert.equal(a.kalan, TEHDIT.kusatma.kusatma.sure);
  assert.ok(r.bl.some((b) => b.kod === 'tehdit_kusatma' && b.karar));
  assert.ok(etkinDegistiriciler(r.d).some((m) => m.etki?.ticaretKapali));
  const g = tehditGorunumu(r.d).aktif;
  assert.equal(g.karar, true);
  assert.equal(g.evre, 'kusatma');
  assert.deepEqual(g.kusatma.kararSecenekleri, ['dayan', 'fidye']);
  assert.match(tehditTavir(r.d, 'saklan').hata, /Bu tehditte bu seçenek yok|saklanılamaz/);
  assert.match(tahkimatYap(r.d).hata, /Kuşatma altında/);
  assert.match(kusatmaKarar(o, 'dayan').hata, /kuşatma yok/);
  const dayan = kusatmaKarar(r.d, 'dayan').durum;
  assert.equal(dayan.tehdit.aktif.karar, false);
  assert.match(kusatmaKarar(dayan, 'dayan').hata, /zaten/);
  const fidye = kusatmaKarar(r.d, 'fidye').durum;
  assert.equal(fidye.tehdit.aktif, null);
  assert.equal(fidye.kaynaklar.sikke, 200 - Math.ceil(80 * 0.8));
  assert.ok(!fidye.degistiriciler.some((m) => m.id === 'kusatma'));
  // Oyun durmaz: tur ilerler, ordu aşınır, süre bitince sonuç; sonuç sonrası ticaret 'kusatma_ardi' ile kapalı kalabilir.
  let d = r.d;
  const guclar = [d.tehdit.aktif.guc];
  for (let i = 0; i < 5 && d.tehdit.aktif; i++) {
    while (d.olay.aktif) d = olayCoz(d, OLAY[d.olay.aktif.id].secenekler.findIndex((s) => secenekUygunMu(d, s))).durum;
    const t = turIlerlet(d);
    assert.equal(t.hata, undefined);
    d = t.durum;
    if (d.tehdit.aktif) guclar.push(d.tehdit.aktif.guc);
  }
  assert.equal(d.tehdit.aktif, null);
  assert.ok(guclar.every((x, i) => i === 0 || x < guclar[i - 1]), `aşınma ${guclar}`);
  assert.ok(['kismi', 'yenilgi', 'puskurtme'].includes(d.tehdit.gecmis.at(-1).sonuc));
  assert.ok(!d.degistiriciler.some((m) => m.id === 'kusatma'));
});

test('kuşatma: güçlü sur halkası ordunun gücünü hızla aşındırır; savunma ≥ güç ise kuşatma kırılır', () => {
  let o = cagBaslangic('ortacag', 1);
  for (let i = 0; i < 16; i++) o = binaEkle(o, 'sur_parcasi', K - 6 + i, K - 8, { uid: `s${i}`, seviye: 3 });
  const r = varis(tehditle(o, aktif('kusatma', 90, { evre: 'kusatma', kalan: 3 })));
  const r0 = varis(tehditle(cagBaslangic('ortacag', 1), aktif('kusatma', 90, { evre: 'kusatma', kalan: 3 })));
  assert.ok(r.d.tehdit.aktif.guc < r0.d.tehdit.aktif.guc);
  const kir = varis(tehditle(cagBaslangic('ortacag', 1), aktif('kusatma', 3, { evre: 'kusatma', kalan: 3 })));
  assert.equal(kir.d.tehdit.aktif, null);
  assert.equal(kir.d.tehdit.gecmis.at(-1).sonuc, 'puskurtme');
  // Yenilgide önce savunma binası hasar görür
  const y = varis(tehditle(cagBaslangic('ortacag', 1), aktif('kusatma', 300, { evre: 'kusatma', kalan: 1 })));
  assert.equal(y.d.tehdit.gecmis.at(-1).sonuc, 'yenilgi');
  assert.ok(y.d.binalar.filter((b) => b.hasarli).every((b) => ['muhafiz_kulesi', 'kisla'].includes(b.id)));
  assert.ok(y.d.degistiriciler.some((m) => m.id === 'kusatma_ardi' && m.etki.ticaretKapali));
  assert.equal(beklenenSonuc(tehditle(cagBaslangic('ortacag', 1), aktif('kusatma', 300))).sonuc, 'kusatma');
});

test('Silah Dağıt: Göçebe yok; Taş 2 alet, Bronz+ 1 metal → +1; en çok floor(nüfus/2); döküm toplamı tutar', () => {
  const g = tehditle(cagBaslangic('gocebe', 1), aktif('kurt_surusu', 5));
  assert.match(silahDagit(g, 1).hata, /Taş Devri/);
  const t = tehditle({ ...cagBaslangic('tasdevri', 1), kaynaklar: { yiyecek: 20, odun: 5, tas: 5, deri: 0, alet: 10 } }, aktif('komsu_baskini', 9));
  assert.match(silahDagit(tehditle(t, null), 1).hata, /tehdit yok/);
  const s = silahDagit(t, 3).durum;
  assert.equal(s.kaynaklar.alet, 4);
  assert.equal(savunmaHesapla(s) - savunmaHesapla(t), 3);
  assert.equal(savunmaDokum(s).reduce((a, k) => a + k.deger, 0), savunmaHesapla(s));
  assert.match(silahDagit(s, 2).hata, /En çok/);                  // nüfus 8 → en çok 4
  assert.match(silahDagit(t, 0).hata, /Geçersiz/);
  const b = tehditle(cagBaslangic('bronz', 1), aktif('akincilar', 15));
  assert.match(silahDagit(b, 1).hata, /Kaynak yetersiz/);         // metal 0
  const bm = silahDagit({ ...b, kaynaklar: { ...b.kaynaklar, metal: 4 } }, 4).durum;
  assert.equal(bm.kaynaklar.metal, 0);
  assert.equal(tehditGorunumu(bm).aktif.silah.verilen, 4);
  // varışta etkisi biter (aktif silinir)
  assert.equal(varis({ ...bm, tehdit: { ...bm.tehdit, aktif: { ...bm.tehdit.aktif, guc: 1 } } }).d.tehdit.aktif, null);
});

test('Nöbet Tut: yalnız yaklaşan tehdit varken; o tur ve sonraki tur +(1 + çağSırası) savunma', () => {
  const b = cagBaslangic('bronz', 1);
  assert.match(onderEylemiSec(b, 'nobet_tut').hata, /tehdit yok/);
  const d = tehditle(b, aktif('akincilar', 15, { kalan: 3 }));
  const s0 = savunmaHesapla(d);
  const x = adimOnder(onderEylemiSec(d, 'nobet_tut').durum);
  assert.equal(savunmaHesapla(x) - s0, 3);
  assert.equal(tehditGorunumu(d).aktif.nobet.savunma, 3);
  // m adımından (değiştirici düşümü) iki kez sonra da etkin, üçüncüde biter
  let t = turIlerlet(onderEylemiSec(d, 'nobet_tut').durum).durum;
  assert.ok(t.degistiriciler.some((m) => m.id === 'nobet'));
  t = turIlerlet(t).durum;
  assert.ok(t.degistiriciler.some((m) => m.id === 'nobet'));
  t = turIlerlet(t).durum;
  assert.ok(!t.degistiriciler.some((m) => m.id === 'nobet'));
});

test('Elçi Gönder: Taş+, akıncı/baskın/istila; başarı tehdidi bitirir, başarısızlık yarı hediye + ilişki −5; tehdit başına 1', () => {
  const g = tehditle(cagBaslangic('gocebe', 1), aktif('kurt_surusu', 5));
  assert.match(onderEylemiSec(g, 'elci_gonder').hata, /henüz açılmadı/);
  const kurt = tehditle(cagBaslangic('tasdevri', 1), aktif('kurt_surusu', 5));
  assert.match(onderEylemiSec(kurt, 'elci_gonder').hata, /elçi gönderilemez/);
  const t0 = tehditle({ ...cagBaslangic('tasdevri', 1), kaynaklar: { yiyecek: 50, odun: 5, tas: 5, deri: 0, alet: 0 } },
    aktif('komsu_baskini', 9, { kalan: 3 }));
  assert.deepEqual(elciBilgi(t0).maliyet, { yiyecek: 18 });
  assert.equal(elciBilgi(t0).olasilik, 0.4);
  assert.match(onderEylemiSec({ ...t0, kaynaklar: { ...t0.kaynaklar, yiyecek: 3 } }, 'elci_gonder').hata, /Kaynak yetersiz/);
  const sonuc = {};
  for (let rng = 1; rng < 60 && Object.keys(sonuc).length < 2; rng++) {
    const d = { ...t0, tehdit: { ...t0.tehdit, rng } };
    const x = adimOnder(onderEylemiSec(d, 'elci_gonder').durum);
    sonuc[x.tehdit.aktif ? 'basarisiz' : 'basari'] = x;
  }
  const b = sonuc.basari, f = sonuc.basarisiz;
  assert.equal(b.tehdit.aktif, null);
  assert.equal(b.kaynaklar.yiyecek, 32);
  assert.equal(b.tehdit.iliski.komsu, 10);
  assert.equal(b.tehdit.gecmis.at(-1).sonuc, 'elci');
  assert.equal(f.kaynaklar.yiyecek, 41);
  assert.equal(f.tehdit.iliski.komsu, -5);
  assert.equal(f.tehdit.aktif.elciDenendi, true);
  assert.match(onderEylemiSec(f, 'elci_gonder').hata, /zaten/);
  const ant = tehditle(cagBaslangic('antik', 1), aktif('barbar_akini', 40));
  assert.deepEqual(elciBilgi(ant).maliyet, { sikke: 40 });         // Antik+: sikke
  assert.equal(tehditGorunumu(ant).aktif.secenekler.find((s) => s.id === 'elci').eylem, 'elci_gonder');
});

test('haraç: dost kaynağa (ilişki ≥ 30) ×0,75', () => {
  const d = tehditle(cagBaslangic('ortacag', 1), aktif('kusatma', 80), { iliski: { ordu: 30 } });
  assert.deepEqual(haracMaliyeti(d, TEHDIT.kusatma, 80), { sikke: 48 });
  assert.deepEqual(haracMaliyeti({ ...d, tehdit: { ...d.tehdit, iliski: {} } }, TEHDIT.kusatma, 80), { sikke: 64 });
  assert.equal(haracOde({ ...d, kaynaklar: { ...d.kaynaklar, sikke: 50 } }).durum.kaynaklar.sikke, 2);
});

test('kayıt: yeni aktif alanları (evre/karar/elçi/silah) eksik v3 kaydı varsayılanla açılır; kuşatma gidiş-dönüş', () => {
  const r = varis(tehditle(cagBaslangic('ortacag', 1), aktif('kusatma', 80)));
  const geri = yukle(serialize(r.d));
  assert.deepEqual(geri.tehdit, r.d.tehdit);
  assert.deepEqual(turIlerlet(geri), turIlerlet(r.d));
  const eski = JSON.parse(serialize(tehditle(cagBaslangic('tasdevri', 1), aktif('komsu_baskini', 9))));
  for (const k of ['evre', 'karar', 'elciDenendi', 'silah']) delete eski.tehdit.aktif[k];
  const y = yukle(JSON.stringify(eski));
  assert.equal(y.surum, 3);
  assert.deepEqual([y.tehdit.aktif.evre, y.tehdit.aktif.karar, y.tehdit.aktif.elciDenendi, y.tehdit.aktif.silah], ['uyari', false, false, 0]);
});

// ---------- Ölüm sarmalı + tempo (çağ başlangıç durumları, pasif oyun) ----------
function pasifOyna(d0, turSay) {
  let d = d0;
  const v = [];
  let minNufus = d.nufus, maxKayip = 0;
  for (let i = 0; i < turSay; i++) {
    while (d.olay.aktif) d = olayCoz(d, OLAY[d.olay.aktif.id].secenekler.findIndex((s) => secenekUygunMu(d, s))).durum;
    const once = d;
    const r = turIlerlet(d);
    assert.equal(r.hata, undefined);
    d = r.durum;
    for (const b of r.bildirimler.filter((x) => x.kod === 'tehdit_varis')) {
      const top = Object.values(once.kaynaklar).reduce((a, x) => a + x, 0);
      const kay = Object.values(b.kayip || {}).reduce((a, x) => a + x, 0);
      v.push({ tur: i, id: b.tehdit, sonuc: b.sonuc, oran: kay / Math.max(1, top) });
      // isabet anındaki stok ≈ tur sonu stok + kayıp (varış turunda kötü olay yok)
      for (const [k, m] of Object.entries(b.kayip || {})) maxKayip = Math.max(maxKayip, m / ((d.kaynaklar[k] || 0) + m));
    }
    minNufus = Math.min(minNufus, d.nufus);
  }
  return { d, v, minNufus, maxKayip };
}

test('ölüm sarmalı: her çağ başlangıcında 30 tur pasif oyun (Normal ve Zor, gerginlik hazır) nüfus ≥ 2, kaynak kaybı ≤ %30', () => {
  for (const cag of CAG_SIRASI) for (const zorluk of ['normal', 'zor']) for (const tohum of [1, 2]) {
    const d0 = cagBaslangic(cag, tohum, { nefes: 0 });
    const r = pasifOyna({ ...d0, zorluk, tehdit: { ...d0.tehdit, gerginlik: 90 } }, 30);
    assert.ok(r.minNufus >= NUFUS_MIN, `${cag}/${zorluk}/${tohum} nüfus ${r.minNufus}`);
    assert.ok(r.v.length >= 1, `${cag}/${zorluk}/${tohum}: 30 turda tehdit yok`);
    assert.ok(r.maxKayip <= (zorluk === 'zor' ? 0.3 : 0.25) + 0.005, `${cag}/${zorluk} kayıp ${r.maxKayip}`);
  }
});

test('ÖLÇÜM (TEHDIT.md §9): çağ başına tehdit sayısı ve kayıp — çağ hedef süresi boyunca pasif oyun, 4 tohum, Normal', (t) => {
  const satirlar = [];
  for (const cag of CAG_SIRASI) {
    const hedef = CAGLAR.find((c) => c.id === cag).hedefTur;
    const kosu = [1, 2, 3, 4].map((s) => pasifOyna(cagBaslangic(cag, s), hedef));
    const say = kosu.reduce((a, k) => a + k.v.length, 0) / kosu.length;
    const tum = kosu.flatMap((k) => k.v);
    const aralik = kosu.flatMap((k) => k.v.slice(1).map((x, i) => x.tur - k.v[i].tur));
    const ort = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const yen = tum.filter((x) => x.sonuc === 'yenilgi').length / Math.max(1, tum.length);
    satirlar.push(`${cag} ${hedef}t: tehdit ${say.toFixed(2)} · aralık ${ort(aralik).toFixed(1)} · kayıp %${(ort(tum.map((x) => x.oran)) * 100).toFixed(1)}`
      + ` · yenilgi %${Math.round(yen * 100)} · ${[...new Set(tum.map((x) => x.id))].length} çeşit`);
    if (cag !== 'gocebe') {
      assert.ok(say >= 2, `${cag}: çağ başına ${say} tehdit`);
      assert.ok(ort(aralik) >= 12 && ort(aralik) <= 22, `${cag}: aralık ${ort(aralik)}`);
    }
    for (const k of kosu) assert.ok(k.minNufus >= NUFUS_MIN);
  }
  t.diagnostic(satirlar.join(' | '));
});

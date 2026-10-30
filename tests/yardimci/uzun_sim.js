// Uzun süreli simülasyon botu (tüm çağlar). Yalnız oyuncu komutlarını kullanır; amaç OPTİMİZE etmek değil, sistemin 100/500/1000 gün
// boyunca KARARLILIĞINI ölçmek: negatif/NaN değer, taşan stok, kilitlenen iş gücü, kopuk kuyruk, nüfus çöküşü, süre/bellek.
// Evrim de kullanılır (eski konut/üretim binaları kaynak varsa yerinde dönüştürülür).
// Çalıştırma: `node tests/yardimci/uzun_sim.js [tohumSayisi=5] [gun=1000] [zorluk=barisci]` → özet yazar.
import { yeniOyun } from '../../src/core/oyun_durumu.js';
import { turIlerlet } from '../../src/core/tur.js';
import { isAta, insaEt, arastirmaSec, onderEylemiSec, cagAtla, evrimYap, vergiAyarla } from '../../src/core/komutlar.js';
import { cagSartlari } from '../../src/core/cag.js';
import { insaEdilebilirMi, insaatSinirDolu, evrimEdilebilirMi, evrimMaliyeti } from '../../src/core/insa.js';
import { arastirilabilirMi } from '../../src/core/arastirma.js';
import { hamUretimHesapla } from '../../src/core/uretim.js';
import { yiyecekIhtiyaci } from '../../src/core/tuketim.js';
import {
  BINA, BULUS, mevcutCag, isciYuvasi, yaraliSayisi, serbestAnahtar, barinmaKapasitesi, depoTavani, issizSayisi, atamaToplam, kaynakYeter, binaBul, binaKurulu,
} from '../../src/core/yardimci.js';
import { BULUSLAR } from '../../src/data/buluslar.js';
import { NUFUS_MIN } from '../../src/data/denge.js';
import { olaySec, yerBul, tehditHazirla } from './bot.js';
import { cagBaslangic } from './durum.js';

const GIRDI_KAYNAK = ['odun', 'tas', 'deri', 'alet', 'kil', 'cevher', 'metal', 'mermer', 'sikke', 'kumas', 'kitap'];
// Kaynak → üretici bina tercihleri (ilk uygun). `yiyecek` ayrı ele alınır.
const URETICI = {
  odun: ['oduncu_kampi'], tas: ['tas_ocagi'], deri: ['avci_kulubesi', 'agil'], alet: ['demirci', 'alet_yapimcisi'], kil: ['kil_ocagi'],
  cevher: ['maden_ocagi'], metal: ['eritme_firini'], mermer: ['mermer_ocagi'], sikke: ['darphane'], kumas: ['dokuma_atolyesi'], kitap: ['manastir'],
};
const YIYECEK = ['ciftlik', 'sulanan_tarla', 'tahil_bahcesi', 'toplayici_barinagi'];
const BULUS_SIRA = [...BULUSLAR].sort((a, b) => a.bp - b.bp || a.id.localeCompare(b.id)).map((b) => b.id);
const say = (d, id) => d.binalar.filter((b) => b.id === id).length;
const kurulan = (d, id) => d.binalar.filter((b) => b.id === id && binaKurulu(d, b)).length;

function insaDene(d, id) {
  if (insaatSinirDolu(d) || insaEdilebilirMi(d, id)) return d;
  const yer = yerBul(d, id);
  if (!yer) return d;
  const r = insaEt(d, id, yer[0], yer[1]);
  return r.hata ? d : r.durum;
}
const ilkAcik = (d, liste) => liste.find((id) => !insaEdilebilirMi(d, id));

// Her tur: bina yuvalarını doldur, kalan serbest işçileri en ihtiyaçlı kaynağa dağıt (bekçi ataması korunur).
function isleriDengele(d) {
  const bekci = d.atama['serbest:bekci'] || 0;
  for (const k of Object.keys(d.atama)) if (k !== 'serbest:bekci') d = isAta(d, k, 0).durum;
  let bos = d.nufus - yaraliSayisi(d) - bekci;
  const eksikHedef = biriktirmeEksigi(d);
  for (const b of d.binalar) {
    const yuva = isciYuvasi(b);
    if (!yuva || b.hasarli || !binaKurulu(d, b) || bos <= 0) continue;
    // Biriktirme modunda yalnız eksik kaynağı üreten binalar (ya da yiyecek üreticileri) doldurulur.
    if (eksikHedef && !Object.keys(BINA[b.id].uretim).some((r) => eksikHedef.includes(r) || r === 'yiyecek')) continue;
    const n = Math.min(yuva, bos);
    d = isAta(d, b.uid, n).durum;
    bos -= n;
  }
  const ata = (is) => { d = isAta(d, serbestAnahtar(is), (d.atama[serbestAnahtar(is)] || 0) + 1).durum; };
  let u = hamUretimHesapla(d).toplam, sayac = 0;
  while (bos > 0) {
    if (++sayac % 6 === 0) u = hamUretimHesapla(d).toplam; // pahalı: her 6 işçide bir tazele
    const net = (u.yiyecek || 0) - yiyecekIhtiyaci(d);
    const az = (r, oran) => d.kaynaklar[r] !== undefined && d.kaynaklar[r] < depoTavani(d, r) * oran;
    const eksik = biriktirmeEksigi(d);
    if (eksik?.length) { const r = eksik.find((k) => SERBEST_ISI[k]); if (r) { ata(SERBEST_ISI[r]); bos--; continue; } }
    const isinma = d.binalar.reduce((a, b) => a + (BINA[b.id].tur === 'konut' ? BINA[b.id].isinma || 0 : 0), 0);
    ata(net < d.nufus * 0.1 || d.kaynaklar.yiyecek < d.nufus * 2 ? 'toplayici' : (u.odun || 0) < isinma + 2 || az('odun', 0.5) ? 'oduncu' : az('tas', 0.4) ? 'tasci' : az('deri', 0.3) ? 'avci' : 'toplayici');
    bos--;
  }
  return d;
}

// Geçiş şartlarının yalnız kaynağı eksikse: yeni inşaat yapma, eksik kaynağa işçi ver, biriktir.
function biriktirmeEksigi(d) {
  const c = mevcutCag(d);
  if (!c.gecis) return null;
  const s = cagSartlari(d);
  if (s.uygun || s.eksikler.some((e) => !e.startsWith('Kaynak eksik'))) return null;
  return Object.entries(c.gecis.maliyet).filter(([r, m]) => (d.kaynaklar[r] || 0) < m).map(([r]) => r);
}
const SERBEST_ISI = { yiyecek: 'toplayici', odun: 'oduncu', tas: 'tasci', deri: 'avci' };

function botKararlari(d) {
  if (biriktirmeEksigi(d)) return d;
  const cag = mevcutCag(d);
  const u = hamUretimHesapla(d).toplam;
  // 1) Konut: boş barınak azsa en yeni konut.
  if (barinmaKapasitesi(d) < d.nufus + 3) d = insaDene(d, cag.konut);
  // 2) Çağ geçiş şartı binaları.
  for (const [id, adet] of Object.entries(cag.gecis?.binalar || {})) if (say(d, id) < adet) d = insaDene(d, id);
  // 3) Yiyecek.
  const net = (u.yiyecek || 0) - yiyecekIhtiyaci(d);
  if (net < 1 + d.nufus * 0.12) { const y = ilkAcik(d, YIYECEK); if (y) d = insaDene(d, y); }
  // 4) Düşük stoklu kaynaklar için üretici.
  for (const r of GIRDI_KAYNAK) {
    if (d.kaynaklar[r] === undefined) continue;
    const tavan = depoTavani(d, r);
    const adet = (URETICI[r] || []).reduce((a, id) => a + say(d, id), 0);
    if ((d.kaynaklar[r] < tavan * 0.2 && adet < 1) || (d.kaynaklar[r] < tavan * 0.08 && adet < 3)) {
      const id = ilkAcik(d, URETICI[r] || []);
      if (id) d = insaDene(d, id);
    }
  }
  // 5) Depo: stok tavana yakınsa.
  if (Object.keys(d.kaynaklar).some((r) => d.kaynaklar[r] > depoTavani(d, r) * 0.9)) {
    const id = ilkAcik(d, ['ambar', 'erzak_cukuru', 'kurutma_rafi']);
    if (id && say(d, id) < 6) d = insaDene(d, id);
  }
  // 6) Boşta işçi varsa yiyecek/odun üreticisi (iş yuvası aç).
  if (issizSayisi(d) > 3) d = insaDene(d, ilkAcik(d, ['oduncu_kampi', ...YIYECEK]) || 'oduncu_kampi');
  // 7) Evrim: kaynak bolsa eski konut/üretim binalarını yerinde dönüştür (tur başına en çok 1).
  for (const b of d.binalar) {
    if (!BINA[b.id].evrim || evrimEdilebilirMi(d, b.uid)) continue;
    const m = evrimMaliyeti(d, BINA[b.id].evrim);
    const bol = Object.entries(m).every(([r, x]) => (d.kaynaklar[r] || 0) >= x * 3);
    if (bol) { const r = evrimYap(d, b.uid); if (!r.hata) { d = r.durum; break; } }
  }
  return d;
}

export function botTuru(d, secenek = {}) {
  let x = d;
  while (x.olay.aktif) x = olaySec(x);
  if (cagSartlari(x).uygun) { const r = cagAtla(x); if (!r.hata) x = r.durum; }
  if (!x.arastirma) {
    const id = BULUS_SIRA.find((b) => !arastirilabilirMi(x, b));
    if (id) x = arastirmaSec(x, id).durum;
  }
  x = botKararlari(x);
  x = isleriDengele(x);
  x = tehditHazirla(x, secenek.tehditStrateji || 'hazirlikli');
  const yorgun = x.onder.yaraliKalan > 0 || x.onder.yorgunluk >= 4;
  if (!yorgun) { const r = onderEylemiSec(x, 'hikaye_anlat'); if (!r.hata) x = r.durum; }
  else if (x.onder.yaraliKalan <= 0) { const r = onderEylemiSec(x, 'dinlen'); if (!r.hata) x = r.durum; }
  return turIlerlet(x);
}

// Kararlılık denetimi: bir durumda bozuk değer/tutarsızlık varsa Türkçe hata metinleri döner.
export function degismezler(d) {
  const h = [];
  for (const [r, v] of Object.entries(d.kaynaklar)) {
    if (!Number.isFinite(v)) h.push(`kaynak ${r} sayı değil`);
    else if (v < -1e-9) h.push(`kaynak ${r} negatif (${v})`);
    else if (v > depoTavani(d, r) + 1e-6) h.push(`kaynak ${r} depo tavanını aşıyor (${v} > ${depoTavani(d, r)})`);
  }
  if (!Number.isFinite(d.nufus) || d.nufus < 0) h.push(`nüfus geçersiz (${d.nufus})`);
  if (!Number.isFinite(d.huzur) || d.huzur < 0 || d.huzur > 100) h.push(`huzur aralık dışı (${d.huzur})`);
  if (atamaToplam(d) > d.nufus) h.push(`atama (${atamaToplam(d)}) nüfusu (${d.nufus}) aşıyor`);
  const uidler = new Set(d.binalar.map((b) => b.uid));
  if (uidler.size !== d.binalar.length) h.push('yinelenen bina uid');
  for (const s of d.insaatSirasi) {
    const uid = s.includes(':') ? s.split(':')[1] : s;
    if (!uidler.has(uid)) h.push(`kuyrukta olmayan bina: ${s}`);
    if (s.startsWith('evrim:') && !d.istatistik?.evrim?.[uid]) h.push(`evrim kaydı eksik: ${s}`);
  }
  for (const uid of Object.keys(d.istatistik?.evrim || {})) if (!d.insaatSirasi.includes(`evrim:${uid}`)) h.push(`yetim evrim kaydı: ${uid}`);
  for (const k of Object.keys(d.atama)) if (!k.startsWith('serbest:') && !uidler.has(k)) h.push(`olmayan binaya atama: ${k}`);
  const json = JSON.stringify(d, (_, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__SAYI_DEGIL__' : v));
  if (json.includes('__SAYI_DEGIL__')) h.push('durumda NaN/Infinity var');
  return h;
}

// Dönüş: { tohum, gun, ihlaller[], ornekler[{gun,...}], son, sureMs, evrimSayisi, minNufus, cokus }
export function uzunOyna(tohum, { gun = 1000, zorluk = 'barisci', tehditStrateji = 'hazirlikli', ornek = [100, 500, 1000], cag = null } = {}) {
  // cag verilirse o çağın tipik başlangıç köyünden başlar (tests/yardimci/durum.js cagBaslangic); yoksa yeni oyun.
  let d = cag ? { ...cagBaslangic(cag, tohum), zorluk } : yeniOyun(tohum, { zorluk });
  d = vergiAyarla(d, 'yok').durum;
  const ihlaller = [], ornekler = [];
  let minNufus = d.nufus, evrimSayisi = 0;
  const t0 = Date.now();
  for (let i = 0; i < gun; i++) {
    const r = botTuru(d, { tehditStrateji });
    d = r.durum;
    for (const b of r.bildirimler || []) if (b.kod === 'insaat_bitti' && /oldu\.$/.test(b.metin) && b.uidler) evrimSayisi += b.uidler.length;
    minNufus = Math.min(minNufus, d.nufus);
    for (const m of degismezler(d)) if (ihlaller.length < 20) ihlaller.push({ gun: d.tur, m });
    if (ornek.includes(i + 1)) {
      ornekler.push({ gun: i + 1, cag: d.cag, nufus: d.nufus, huzur: Math.round(d.huzur), bina: d.binalar.length,
        issiz: issizSayisi(d), kapasite: barinmaKapasitesi(d), yiyecek: Math.round(d.kaynaklar.yiyecek), bilgi: Math.round(d.bilgiHavuz),
        buluslar: d.buluslar.length, bellekMB: Math.round(process.memoryUsage().heapUsed / 1048576) });
    }
  }
  return { tohum, gun, ihlaller, ornekler, son: d, sureMs: Date.now() - t0, evrimSayisi, minNufus, cokus: minNufus < NUFUS_MIN };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2]) || 5, gun = Number(process.argv[3]) || 1000, zorluk = process.argv[4] || 'barisci', cag = process.argv[5] || null;
  for (let t = 1; t <= n; t++) {
    const s = uzunOyna(t, { gun, zorluk, cag });
    console.log(`tohum ${t}: ${s.sureMs} ms · min nüfus ${s.minNufus} · evrim ${s.evrimSayisi} · ihlal ${s.ihlaller.length}${s.ihlaller[0] ? ' ' + JSON.stringify(s.ihlaller[0]) : ''}`);
    for (const o of s.ornekler) console.log('   ', JSON.stringify(o));
  }
}

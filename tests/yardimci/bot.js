// Basit test botu (TASARIM §9 kabul ölçütü): Göçebe Çağı'nı bitirmeye çalışır. Yalnız oyuncu komutlarını kullanır.
// Strateji: her tur boştaki işçileri "hedefe en uzak" kaynağa (stok + 5 turluk üretim / hedef) atar; bina yuvası varsa
// önce onu, yoksa serbest işi kullanır. Hedefler = çağ geçiş maliyeti + sıradaki binaların maliyeti + kış odunu.
// Önder: yorgunsa Dinlen, deri gerekiyorsa Avlan, aksi Hikâye Anlat (Keşfet kullanmaz; Göçebe başlangıç görüşü yeterli). Olaylarda beklenen değeri en yüksek seçenek.
// Çalıştırma: `node tests/yardimci/bot.js [tohumSayisi]` → özet yazar.
import { yeniOyun } from '../../src/core/oyun_durumu.js';
import { turIlerlet } from '../../src/core/tur.js';
import {
  isAta, insaEt, arastirmaSec, onderEylemiSec, olayCoz, cagAtla,
} from '../../src/core/komutlar.js';
import { cagSartlari } from '../../src/core/cag.js';
import { maliyetHesapla, insaEdilebilirMi, insaatSinirDolu, uygunYerler } from '../../src/core/insa.js';
import { kenarKomsulari } from '../../src/world/izgara.js';
import { gorunurKaro } from '../../src/world/kesif.js';
import { arastirilabilirMi } from '../../src/core/arastirma.js';
import { hamUretimHesapla } from '../../src/core/uretim.js';
import { yiyecekIhtiyaci } from '../../src/core/tuketim.js';
import { savunmaHesapla, saldiriGucu } from '../../src/core/savunma.js';
import { secenekUygunMu } from '../../src/core/olay.js';
import {
  BINA, OLAY, mevcutCag, yaraliSayisi, isciYuvasi, binaKurulu, barinmaKapasitesi, depoTavani, serbestAnahtar,
} from '../../src/core/yardimci.js';
import { takvim } from '../../src/core/takvim.js';
import { beklenenSonuc, haracMaliyeti, TEHDIT, bekciAta, haracOde, tehditTavir } from '../../src/core/tehdit.js';
import { bekciDegeri } from '../../src/core/savunma.js';
import { MEVSIM_TUR, YORGUNLUK_MAX } from '../../src/data/denge.js';

const KAYNAKLAR = ['yiyecek', 'odun', 'tas', 'deri'];
const BULUS_YOLU = ['tas_yontma', 'mizrak_ucu', 'deri_isleme', 'yerlesik_hayat', 'hayvan_izleri'];
const UFUK = 5;
// Kaynak → (bina id'si, serbest iş) tercihleri
const ISLER = {
  yiyecek: { binalar: ['toplayici_barinagi', 'avci_kulubesi'], serbest: 'toplayici' },
  odun: { binalar: ['oduncu_kampi'], serbest: 'oduncu' },
  tas: { binalar: [], serbest: 'tasci' },
  deri: { binalar: ['avci_kulubesi'], serbest: 'avci' },
};

const topla = (a, b) => { const s = { ...a }; for (const [k, v] of Object.entries(b)) s[k] = (s[k] || 0) + v; return s; };

// ---------- Olay seçimi ----------
function sonucDegeri(d, s) {
  if (!s) return 0;
  let v = 0;
  for (const [r, m] of Object.entries(s.kaynak || {})) v += m < 0 ? -Math.min(-m, d.kaynaklar[r] || 0) : m;
  v += (s.nufus || 0) * 30 + (s.huzur || 0) * 0.5 + (s.bilgi || 0) * 2;
  if (s.yaraliIsci) v -= s.yaraliIsci.adet * s.yaraliIsci.sure * 1.5;
  if (s.hasar) v -= 8 * s.hasar.adet;
  if (s.degistirici?.etki?.uretim?.carpan !== undefined) v -= (1 - s.degistirici.etki.uretim.carpan) * (s.degistirici.sure || 10) * 3;
  if (s.kayipOrani) v -= s.kayipOrani * Object.values(d.kaynaklar).reduce((a, x) => a + x, 0);
  if (s.savunmaTesti) {
    const sv = savunmaHesapla(d), g = saldiriGucu(d);
    const stok = Object.values(d.kaynaklar).reduce((a, x) => a + x, 0);
    v += sv >= g ? 2.5 : sv >= g / 2 ? -0.1 * stok : -0.25 * stok - 20;
  }
  for (const o of s.olasilik || []) v += o.p * sonucDegeri(d, o.sonuc);
  return v;
}
export function olaySec(d) {
  const o = OLAY[d.olay.aktif.id];
  let enIyi = -1, deger = -Infinity;
  o.secenekler.forEach((s, i) => {
    if (!secenekUygunMu(d, s)) return;
    const v = sonucDegeri(d, s.sonuc);
    if (v > deger) { deger = v; enIyi = i; }
  });
  return olayCoz(d, enIyi).durum;
}

// ---------- İnşaat ----------
// Aşama 3: gerçek harita. Geçerli yerler (sis/sınır/karo şartı denetli) merkeze yakınlığa göre; karo bitişiklik
// bonusu olan binalar (Oduncu/Avcı: orman, Toplayıcı: orman/su) bonuslu yeri tercih eder.
function bitisikPuan(d, binaId, x, y) {
  const kurallar = BINA[binaId].bitisiklik.filter((k) => [].concat(k.hedef).some((h) => h.startsWith('karo:')));
  if (!kurallar.length) return 0;
  let p = 0;
  for (const k of kurallar) {
    const hedef = [].concat(k.hedef).map((h) => h.slice(5));
    const n = kenarKomsulari(d, { id: binaId, x, y }).filter(([a, b]) => hedef.includes(gorunurKaro(d, a, b))).length;
    p += Math.min(n, k.max);
  }
  return p;
}
export function yerBul(d, binaId) {
  const yerler = uygunYerler(d, binaId).slice(0, 40);
  if (!yerler.length) return null;
  let enIyi = yerler[0], puan = -Infinity;
  yerler.forEach(([x, y], i) => {
    const p = bitisikPuan(d, binaId, x, y) * 10 - i * 0.1;
    if (p > puan) { puan = p; enIyi = [x, y]; }
  });
  return enIyi;
}
const say = (d, id) => d.binalar.filter((b) => b.id === id).length;

// Sıradaki istenen binalar (öncelik sırasıyla). Konut: nüfus + 1 barınak hedefi (geçiş için 3 Çadır).
function istenenBinalar(d) {
  const g = mevcutCag(d).gecis || { nufus: 0, binalar: {} };
  const liste = [];
  const cadirHedef = g.binalar.cadir || 0;
  const konutLazim = barinmaKapasitesi(d) <= d.nufus && (say(d, 'cadir') < cadirHedef || d.nufus < g.nufus);
  // Nüfus artışı en uzun yol: boş barınak yoksa önce konut.
  if (konutLazim) liste.push('cadir');
  if (say(d, 'toplayici_barinagi') < 1) liste.push('toplayici_barinagi');
  if (say(d, 'kurutma_rafi') < 1) liste.push('kurutma_rafi');
  if (!konutLazim && say(d, 'cadir') < cadirHedef) liste.push('cadir');
  if (say(d, 'totem') < 1) liste.push('totem');
  if (say(d, 'oduncu_kampi') < 1) liste.push('oduncu_kampi');
  return liste.filter((id) => !insaEdilebilirMi(d, id));
}
function insaDene(d) {
  if (insaatSinirDolu(d)) return d;
  for (const id of istenenBinalar(d)) {
    const yer = yerBul(d, id);
    if (!yer) continue;
    const r = insaEt(d, id, yer[0], yer[1]);
    if (!r.hata) return r.durum;
  }
  return d;
}

// ---------- Hedefler ve iş atama ----------
function hedefler(d) {
  let h = { ...(mevcutCag(d).gecis?.maliyet || {}) };
  for (const id of istenenBinalar(d)) h = topla(h, maliyetHesapla(d, id));
  // Kış odunu: kışa kadar ya da kış içinde kalan günlerin ısınması.
  const t = takvim(d.tur);
  const kisaKalan = (3 - t.mevsimSira + 4) % 4 * MEVSIM_TUR - (t.mevsimGunu - 1);
  const konut = d.binalar.filter((b) => BINA[b.id].tur === 'konut').reduce((a, b) => a + (BINA[b.id].isinma || 0), 0);
  if (kisaKalan <= MEVSIM_TUR * 2) h.odun = (h.odun || 0) + konut * MEVSIM_TUR;
  h.yiyecek = (h.yiyecek || 0) + d.nufus * 2;
  for (const r of KAYNAKLAR) h[r] = Math.min(Math.max(h[r] || 0, 1), depoTavani(d, r) - 1);
  return h;
}

function isleriAta(d) {
  // Önce tüm atamaları sıfırla.
  for (const k of Object.keys(d.atama)) d = isAta(d, k, 0).durum;
  const isci = d.nufus - yaraliSayisi(d);
  const h = hedefler(d);
  const yuvaDolu = {};
  const eklenen = [];
  const ata = (anahtar) => { d = isAta(d, anahtar, (d.atama[anahtar] || 0) + 1).durum; eklenen.push(anahtar); };
  for (let i = 0; i < isci; i++) {
    const u = hamUretimHesapla(d).toplam;
    const tahmin = (r) => (d.kaynaklar[r] || 0) + ((u[r] || 0) - (r === 'yiyecek' ? yiyecekIhtiyaci(d) : 0)) * UFUK;
    // Yiyecek güvenliği: net yiyecek üretimi tüketimi karşılamıyorsa önce yiyecek.
    const yiyecekNet = (u.yiyecek || 0) - yiyecekIhtiyaci(d);
    let r;
    if ((d.kaynaklar.yiyecek || 0) + yiyecekNet * UFUK < d.nufus * 2) r = 'yiyecek';
    else r = KAYNAKLAR.reduce((a, x) => ((h[x] - tahmin(x)) / h[x] > (h[a] - tahmin(a)) / h[a] ? x : a));
    const is = ISLER[r];
    const bina = d.binalar.find((b) => is.binalar.includes(b.id) && binaKurulu(d, b) && !b.hasarli
      && (d.atama[b.uid] || 0) < isciYuvasi(b));
    ata(bina ? bina.uid : serbestAnahtar(is.serbest));
    yuvaDolu[r] = true;
  }
  return d;
}

// ---------- Önder ----------
function onderSec(d) {
  if (d.onder.yaraliKalan > 0 || d.onder.yorgunluk >= YORGUNLUK_MAX - 1) return d;
  // Deri yalnız sıradaki binaya yetmiyorsa Avlan; aksi BP için Hikâye Anlat.
  const sonraki = istenenBinalar(d)[0];
  const deriLazim = sonraki && (maliyetHesapla(d, sonraki).deri || 0) > (d.kaynaklar.deri || 0);
  const id = deriLazim && d.onder.yorgunluk <= YORGUNLUK_MAX - 2 ? 'avlan' : 'hikaye_anlat';
  const r = onderEylemiSec(d, id);
  return r.hata ? d : r.durum;
}

// ---------- Tehdit (TEHDIT.md §9 "hazırlıklı bot") ----------
// Varıştan önceki son oyuncu evresinde (kalan 1): eksik savunmayı bekçiyle kapat (en çok nüfusun yarısı); olmuyorsa
// yiyecek bolsa haraç, değilse yine kısmiye yetecek kadar bekçi. Bekçi serbest işlerden (en kalabalığından) alınır.
// strateji 'pasif': hiçbir şey yapmaz (varsayılan tavır Savun).
export function tehditHazirla(d, strateji) {
  const a = d.tehdit?.aktif;
  if (strateji === 'pasif' || !a || a.kalan > 1) return d;
  const b = beklenenSonuc(d);
  if (b.sonuc === 'puskurtme') return d;
  const deger = bekciDegeri(d);
  const gerek = Math.ceil((b.guc - b.savunma) / deger - 1e-9);
  const ust = Math.floor(d.nufus / 2);
  const t = TEHDIT[a.id];
  if (gerek > ust) {
    const m = haracMaliyeti(d, t, a.guc);
    const yiyecekSonra = (d.kaynaklar.yiyecek || 0) - (m.yiyecek || 0);
    if (t.secenekler.includes('harac') && yiyecekSonra >= d.nufus * 3) {
      const r = haracOde(d);
      if (!r.hata) return r.durum;
    }
  }
  const n = Math.min(gerek, ust);
  let x = d;
  for (let i = 0; i < n; i++) {
    const kaynak = Object.entries(x.atama).filter(([k, v]) => k.startsWith('serbest:') && k !== 'serbest:bekci' && v > 0)
      .sort((p, q) => q[1] - p[1])[0];
    if (!kaynak) break;
    x = isAta(x, kaynak[0], kaynak[1] - 1).durum;
    x = bekciAta(x, (x.atama['serbest:bekci'] || 0) + 1).durum;
  }
  return x;
}

// ---------- Ana döngü ----------
export function botTuru(d, { tehditStrateji = 'hazirlikli' } = {}) {
  let x = d;
  while (x.olay.aktif) x = olaySec(x);
  const s = cagSartlari(x);
  if (s.uygun) {
    const r = cagAtla(x);
    return { durum: r.durum, cagAtlandi: true };
  }
  if (!x.arastirma) {
    const id = BULUS_YOLU.find((b) => !arastirilabilirMi(x, b));
    if (id) x = arastirmaSec(x, id).durum;
  }
  x = insaDene(x);
  x = isleriAta(x);
  x = tehditHazirla(x, tehditStrateji);
  x = onderSec(x);
  const r = turIlerlet(x);
  return { durum: r.durum, bildirimler: r.bildirimler };
}

// Göçebe'yi bitirmeyi dener. Dönüş: { tohum, tamam, tur (çağ atlandığı tur), minNufus, son (durum), eksikler }
export function botOyna(tohum, { maxTur = 80, hedefCag = 'tasdevri', zorluk = 'normal', tehditStrateji = 'hazirlikli' } = {}) {
  let d = yeniOyun(tohum, { zorluk });
  let minNufus = d.nufus;
  for (let i = 0; i < maxTur; i++) {
    const r = botTuru(d, { tehditStrateji });
    d = r.durum;
    minNufus = Math.min(minNufus, d.nufus);
    if (d.cag === hedefCag) return { tohum, tamam: true, tur: d.tur, minNufus, son: d };
  }
  return { tohum, tamam: false, tur: d.tur, minNufus, son: d, eksikler: cagSartlari(d).eksikler };
}

export function botOzeti(tohumlar, secenek = {}) {
  const sonuclar = tohumlar.map((t) => botOyna(t, secenek));
  const tamam = sonuclar.filter((s) => s.tamam).map((s) => s.tur).sort((a, b) => a - b);
  return {
    sonuclar,
    tamamSayisi: tamam.length,
    min: tamam[0], max: tamam[tamam.length - 1], ortanca: tamam[Math.floor(tamam.length / 2)],
    aralikta: tamam.filter((t) => t >= 20 && t <= 32).length,
    minNufus: Math.min(...sonuclar.map((s) => s.minNufus)),
    tehdit: sonuclar.flatMap((s) => s.son.tehdit?.gecmis || []).reduce((a, g) => ({ ...a, [g.sonuc]: (a[g.sonuc] || 0) + 1 }), {}),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2]) || 50;
  const strateji = process.argv[3] || 'hazirlikli';
  const oz = botOzeti(Array.from({ length: n }, (_, i) => i + 1), { tehditStrateji: strateji, zorluk: process.argv[4] || 'normal' });
  console.log(`Tohum: ${n} · bitiren: ${oz.tamamSayisi} · tur min/ortanca/max: ${oz.min}/${oz.ortanca}/${oz.max}`
    + ` · 20–32 aralığında: ${oz.aralikta} · en düşük nüfus: ${oz.minNufus} · tehdit (${strateji}): ${JSON.stringify(oz.tehdit)}`);
  for (const s of oz.sonuclar.filter((x) => !x.tamam).slice(0, 5)) console.log(`  tohum ${s.tohum}: bitiremedi —`, s.eksikler.join('; '));
}

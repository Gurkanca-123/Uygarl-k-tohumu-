// Basit test botu (TASARIM §9 kabul ölçütü): Göçebe Çağı'nı bitirmeye çalışır. Yalnız oyuncu komutlarını kullanır.
// Strateji: her tur boştaki işçileri "hedefe en uzak" kaynağa (stok + 5 turluk üretim / hedef) atar; bina yuvası varsa
// önce onu, yoksa serbest işi kullanır. Hedefler = çağ geçiş maliyeti + sıradaki binaların maliyeti + kış odunu.
// Önder: yorgunsa Dinlen, deri gerekiyorsa Avlan, aksi Hikâye Anlat. Olaylarda beklenen değeri en yüksek seçenek.
// Çalıştırma: `node tests/yardimci/bot.js [tohumSayisi]` → özet yazar.
import { yeniOyun } from '../../src/core/oyun_durumu.js';
import { turIlerlet } from '../../src/core/tur.js';
import {
  isAta, insaEt, arastirmaSec, onderEylemiSec, olayCoz, cagAtla,
} from '../../src/core/komutlar.js';
import { cagSartlari } from '../../src/core/cag.js';
import { maliyetHesapla, insaEdilebilirMi, yerUygunMu, insaatSinirDolu, acikAlan } from '../../src/core/insa.js';
import { arastirilabilirMi } from '../../src/core/arastirma.js';
import { hamUretimHesapla } from '../../src/core/uretim.js';
import { yiyecekIhtiyaci } from '../../src/core/tuketim.js';
import { savunmaHesapla, saldiriGucu } from '../../src/core/savunma.js';
import { secenekUygunMu } from '../../src/core/olay.js';
import {
  BINA, OLAY, mevcutCag, yaraliSayisi, isciYuvasi, binaKurulu, barinmaKapasitesi, depoTavani, serbestAnahtar,
} from '../../src/core/yardimci.js';
import { takvim } from '../../src/core/takvim.js';
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
function olaySec(d) {
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
function yerBul(d, binaId) {
  const a = acikAlan(d);
  const m = (a.x0 + a.x1) / 2;
  const adaylar = [];
  for (let y = a.y0; y < a.y1; y++) for (let x = a.x0; x < a.x1; x++) adaylar.push([x, y, Math.abs(x + 0.5 - m) + Math.abs(y + 0.5 - m)]);
  adaylar.sort((p, q) => p[2] - q[2]);
  for (const [x, y] of adaylar) if (!yerUygunMu(d, binaId, x, y)) return [x, y];
  return null;
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

// ---------- Ana döngü ----------
export function botTuru(d) {
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
  x = onderSec(x);
  const r = turIlerlet(x);
  return { durum: r.durum, bildirimler: r.bildirimler };
}

// Göçebe'yi bitirmeyi dener. Dönüş: { tohum, tamam, tur (çağ atlandığı tur), minNufus, son (durum), eksikler }
export function botOyna(tohum, { maxTur = 80, hedefCag = 'tasdevri' } = {}) {
  let d = yeniOyun(tohum);
  let minNufus = d.nufus;
  for (let i = 0; i < maxTur; i++) {
    const r = botTuru(d);
    d = r.durum;
    minNufus = Math.min(minNufus, d.nufus);
    if (d.cag === hedefCag) return { tohum, tamam: true, tur: d.tur, minNufus, son: d };
  }
  return { tohum, tamam: false, tur: d.tur, minNufus, son: d, eksikler: cagSartlari(d).eksikler };
}

export function botOzeti(tohumlar) {
  const sonuclar = tohumlar.map((t) => botOyna(t));
  const tamam = sonuclar.filter((s) => s.tamam).map((s) => s.tur).sort((a, b) => a - b);
  return {
    sonuclar,
    tamamSayisi: tamam.length,
    min: tamam[0], max: tamam[tamam.length - 1], ortanca: tamam[Math.floor(tamam.length / 2)],
    aralikta: tamam.filter((t) => t >= 20 && t <= 32).length,
    minNufus: Math.min(...sonuclar.map((s) => s.minNufus)),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2]) || 50;
  const oz = botOzeti(Array.from({ length: n }, (_, i) => i + 1));
  console.log(`Tohum: ${n} · bitiren: ${oz.tamamSayisi} · tur min/ortanca/max: ${oz.min}/${oz.ortanca}/${oz.max}`
    + ` · 20–32 aralığında: ${oz.aralikta} · en düşük nüfus: ${oz.minNufus}`);
  for (const s of oz.sonuclar.filter((x) => !x.tamam).slice(0, 5)) console.log(`  tohum ${s.tohum}: bitiremedi —`, s.eksikler.join('; '));
}

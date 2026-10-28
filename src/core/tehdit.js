// Dış tehdit motoru (docs/TEHDIT.md §3–§6, MVP §10). Saf; ayrı tohumlu RNG (`durum.tehdit.rng`) kullanır, `durum.rng`'ye dokunmaz.
// Akış: gerginlik (0–100) her tur artar → 100'de tehdit doğar (uyarı 2–5 tur) → oyuncu tavır seçer (Savun varsayılan /
// Saklan) ya da Haraç öder (anında) → kalan 0 olduğu turun tehdit adımında (m2) varış: savunma testi + sonuç.
// Oyunu durdurmaz (kullanıcı kararı §11.1). Kuşatma: varışta savunma yetmezse birkaç tur süren kuşatma evresi; evre başında
// `aktif.karar = true` (arayüz durduran karar penceresi: Dayan / Fidye) — çekirdek turu kilitlemez, karar verilmezse "Dayan".
// Güçlendirme: Bekçi (iş), Acil Tahkimat, Silah Dağıt (komutlar), Nöbet Tut (önder eylemi); Elçi Gönder (önder eylemi) çözer.
import { TEHDITLER, TASINABILIR, TEHDIT_TAVIRLARI } from '../data/tehditler.js';
import { CAGLAR } from '../data/caglar.js';
import { KAYNAKLAR } from '../data/kaynaklar.js';
import {
  TEHDIT_ILK_GUN, TEHDIT_DOGUM_ILK_GUN, TEHDIT_BASLANGIC, TEHDIT_DOGUM_ESIK, TEHDIT_BEKLE_ESIK, TEHDIT_GERGINLIK_MIN,
  TEHDIT_KADEME, TEHDIT_GUC_UST, TEHDIT_BEKLEME, TEHDIT_ARALIK, TEHDIT_SARMAL_HUZUR, TEHDIT_SARMAL_GUC, TEHDIT_PUSKURTME,
  TEHDIT_KISMI_GERGINLIK, TEHDIT_YENILGI, TEHDIT_HARAC, TEHDIT_SAKLAN_GERGINLIK, TEHDIT_UN_MAX, TEHDIT_KADEME_SINIR,
  TEHDIT_CEKICILIK, TEHDIT_GECMIS, TEHDIT_KOMSU_DOST, TEHDIT_KIS_AZIGI, TOPARLANMA, MERHAMET_YENILGI, ZORLUK,
  VARSAYILAN_ZORLUK, MERHAMET_ZORLUK, CEVRE, TAHKIMAT, SALDIRI_TUR_BOLEN, TEHDIT_CAG_DARBE, NOBET, SILAH, ELCI,
  HARAC_DOST_CARPAN, KUSATMA, KIYI_MESAFE,
} from '../data/denge.js';
import {
  BINA, kopya, sinirla, mevcutCag, cagSira, kaynakAcik, depoTavani, calisanBinalar, binaKurulu, etkinAtama, sonTur, bildir,
  degistiriciEkle, kaynakUygula, kaynakYeter, eksikMetni, olayKilitli, OLAY_KILIDI, hataDon, serbestAnahtar, KAYNAK,
} from './yardimci.js';
import { rngBaslat, rngSonraki, rngTamsayi, rngAgirlikli } from './rng.js';
import { karoAt, merkezNokta, sinirYaricapi } from '../world/harita.js';
import { kosulSaglanir } from './olay.js';
import { savunmaHesapla, cevreSavunmasi } from './savunma.js';
import { huzurEkle } from './huzur.js';
import { kayipUygula, isAta } from './nufus.js';
import { isinmaIhtiyaci } from './tuketim.js';
import { cevreKapali } from '../world/cevre.js';
import { komsuTehditEtkisi } from './komsu_temel.js';
import { AYI_KACTI } from '../data/denge.js';

export const TEHDIT = Object.fromEntries(TEHDITLER.map((t) => [t.id, t]));
const CAG_SIRA = Object.fromEntries(CAGLAR.map((c) => [c.id, c.sira]));
const SON_SIRA = Math.max(...CAGLAR.map((c) => c.sira));

// ---------- Durum ----------
export const tehditRngBaslat = (tohum) => rngBaslat(`tehdit:${tohum}`);
export function tehditVarsayilan(tohum, ek = {}) {
  return { gerginlik: TEHDIT_BASLANGIC, rng: tehditRngBaslat(tohum), un: 0, haracSayac: 0, sonSonuc: null, artArdaYenilgi: 0,
    aktif: null, bekleme: {}, iliski: {}, nefesKalan: 0, gecmis: [], ...ek };
}
export const zorlukTanim = (d) => ZORLUK[d.zorluk] || ZORLUK[VARSAYILAN_ZORLUK];

// Satırın çağa göre geçersiz kılınmış alanı (tehditler.js `cagaGore`).
export const tehditAlan = (t, cagId, alan) => t.cagaGore?.[cagId]?.[alan] ?? t[alan];
// Satırın o çağdaki birleşik görünümü (ad, metin, hedef, ganimet… `cagaGore` ile geçersiz kılınmış).
export const tehditCagda = (t, cagId) => (t.cagaGore?.[cagId] ? { ...t, ...t.cagaGore[cagId] } : t);
export const cagDarbe = (d) => TEHDIT_CAG_DARBE[d.cag] || TEHDIT_CAG_DARBE.gocebe;
// Aktif tehdit varsayılan alanları (eski kayıt / test durumları için de `?? ` ile okunur).
export const AKTIF_VARSAYILAN = { tavir: 'savun', bilinen: false, erteleme: 0, tahkimat: false, evre: 'uyari', karar: false,
  elciDenendi: false, silah: 0 };

// Kopya üstünde RNG (tehdit akışı).
function tz(d) {
  const r = rngSonraki(d.tehdit.rng);
  d.tehdit.rng = r.rng;
  return r.deger;
}

// ---------- Hesaplar (saf) ----------
// Açık kaynakların ortalama doluluğu (0–1).
export function doluluk(d) {
  const acik = KAYNAKLAR.filter((k) => kaynakAcik(d, k.id));
  if (!acik.length) return 0;
  return acik.reduce((a, k) => a + Math.min(1, (d.kaynaklar[k.id] || 0) / Math.max(1, depoTavani(d, k.id))), 0) / acik.length;
}
// Beklenen artış (rng oynaması hariç; arayüz tahmini için de).
// AKSIYON §4.3 kural 4–5: komşu düşmancaysa artış ×1,3.
export function gerginlikArtisTabani(d) {
  return (mevcutCag(d).gerginlikArtis || 0) * zorlukTanim(d).siklik * (0.8 + cagDarbe(d).servet * doluluk(d))
    * komsuTehditEtkisi(d).gerginlik;
}
export function cekicilik(d) {
  const c = TEHDIT_CEKICILIK;
  return sinirla(c.taban + c.doluluk * doluluk(d) - c.un * (d.tehdit?.un || 0), c.min, c.max);
}
export function kademe(d, z = zorlukTanim(d)) {
  const T = d.tehdit;
  const k = 1 + z.haracKademe * (T?.haracSayac || 0) + (T?.sonSonuc === 'yenilgi' ? TEHDIT_YENILGI.kademe : 0);
  return sinirla(k, TEHDIT_KADEME_SINIR[0], TEHDIT_KADEME_SINIR[1]);
}
const merhametVar = (d) => (d.tehdit?.artArdaYenilgi || 0) >= MERHAMET_YENILGI;
// §3.4 güç: min(gucUst, ceil(taban × çekicilik × kademe × zorluk.guc)). Merhamet: Rahat çarpanı (daha düşükse).
export function tehditGucu(d, t) {
  const cag = mevcutCag(d);
  const zg = merhametVar(d) ? Math.min(zorlukTanim(d).guc, ZORLUK[MERHAMET_ZORLUK].guc) : zorlukTanim(d).guc;
  const taban = tehditAlan(t, d.cag, 'gucOran') * cag.saldiriTaban + Math.floor((d.tur - d.cagBaslangicTuru) / SALDIRI_TUR_BOLEN);
  const ust = Math.ceil(cag.saldiriTaban * TEHDIT_GUC_UST * zg);
  return Math.min(ust, Math.ceil(taban * cekicilik(d) * kademe(d) * zg - 1e-9));
}
// Gözcü: çalışan `tehditGozcu` binası, ≥1 işçi.
export function gozcuVar(d) {
  const etkin = etkinAtama(d);
  return calisanBinalar(d).some((b) => BINA[b.id].tehditGozcu && (etkin[b.uid] || 0) > 0);
}
export function adayTehditler(d) {
  const s = CAG_SIRA[d.cag];
  const z = zorlukTanim(d);
  const gun = d.tur + 1;
  return TEHDITLER.filter((t) => CAG_SIRA[t.cagMin] <= s && s <= (t.cagMax ? CAG_SIRA[t.cagMax] : SON_SIRA)
    && (!z.turler || z.turler.includes(t.tur)) && !((d.tehdit.bekleme[t.id] ?? -Infinity) > gun)
    && kosulSaglanir(d, t.kosul) && ozelKosulSaglanir(d, t.ozelKosul));
}
// 'ticaret': Pazar Yeri çalışıyor ya da yolda kervan var · 'kiyi': yerleşim sınırına ≤ KIYI_MESAFE karoda su.
export function ozelKosulSaglanir(d, k) {
  if (!k) return true;
  if (k === 'ticaret') return d.kervanlar.length > 0 || calisanBinalar(d).some((b) => b.id === 'pazar_yeri');
  if (k === 'kiyi') {
    const m = merkezNokta(d);
    const r = sinirYaricapi(d) + KIYI_MESAFE;
    for (let y = Math.floor(m.y - r); y <= m.y + r; y++) for (let x = Math.floor(m.x - r); x <= m.x + r; x++) {
      if (Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y) <= r && karoAt(d, x, y) === 'su') return true;
    }
    return false;
  }
  return false;
}
function tehditAgirligi(d, t) {
  const son = d.tehdit.gecmis.at(-1);
  let w = tehditAlan(t, d.cag, 'agirlik');
  if (son && TEHDIT[son.id]?.tur === t.tur) w *= 0.5;
  if (t.kaynak === 'komsu' && (d.tehdit.iliski[t.kaynak] || 0) >= TEHDIT_KOMSU_DOST.iliski) w *= TEHDIT_KOMSU_DOST.carpan;
  // AKSIYON §2.3/§7: kaçırılan ayı işareti ayı tehdidini ×3 ağırlaştırır; düşmanca komşu kendi baskınını ×2.
  if (t.id === 'ayi' && (d.sefer?.ayiKacti || 0) > 0) w *= AYI_KACTI.carpan;
  if (t.kaynak === 'komsu') w *= komsuTehditEtkisi(d).agirlik;
  return w;
}
const sarmalda = (d) => d.acTur > 0 || d.huzur < TEHDIT_SARMAL_HUZUR;

// Hedef kaynaklar (yalnız durumda var olanlar).
export function hedefKaynaklar(d, t) {
  const h = tehditAlan(t, d.cag, 'hedef');
  const liste = h === '*' ? Object.keys(d.kaynaklar) : h === 'tasinabilir' ? TASINABILIR : h;
  return liste.filter((r) => d.kaynaklar[r] !== undefined);
}
// §5.3.2 kış azığı: yiyecekten 2 × nüfus, kışta odundan 3 × ısınma altına inilmez.
export function korunanMiktar(d, r) {
  if (r === 'yiyecek') return TEHDIT_KIS_AZIGI.yiyecekKisi * d.nufus;
  if (r === 'odun') return TEHDIT_KIS_AZIGI.odunIsinma * isinmaIhtiyaci(d);
  return 0;
}
// Oran kaybı tahmini/uygulaması: { kaynak: miktar } (fazlaya uygulanır).
export function kayipMiktarlari(d, t, oran) {
  const m = {};
  for (const r of hedefKaynaklar(d, t)) {
    const x = Math.max(0, (d.kaynaklar[r] || 0) - korunanMiktar(d, r)) * oran;
    if (x > 0) m[r] = Math.round(x * 100) / 100;
  }
  return m;
}
// Etkin kayıp oranı: tür oranı × zorluk × çağ darbesi × (kapalı çevre ? 0,8) — zorluk tavanı (%25 / Zor %30).
export function kayipOrani(d, t, tur) {
  const z = zorlukTanim(d);
  const kap = cevreKapali(d).kapali ? CEVRE.kayipCarpani : 1;
  return Math.min(z.kayipTavan, t.sonuc[tur].oran * z.kayip * cagDarbe(d).kayip * kap);
}
// Haraç: dost kaynağa (ilişki ≥ TEHDIT_KOMSU_DOST.iliski) ×0,75.
export function haracMaliyeti(d, t, guc) {
  const h = t.harac;
  const c = (d.tehdit?.iliski?.[t.kaynak] || 0) >= TEHDIT_KOMSU_DOST.iliski ? HARAC_DOST_CARPAN : 1;
  if (h.kaynak) return Object.fromEntries(Object.entries(h.kaynak).map(([r, k]) => [r, Math.ceil(guc * k * c - 1e-9)]));
  return kayipMiktarlari(d, t, h.oran * c);
}
// Varışta kullanılacak güç (sarmal koruması: açlık/huzur < 30 iken ×0,8).
export const varisGucu = (d, a) => (sarmalda(d) ? Math.ceil(a.guc * TEHDIT_SARMAL_GUC) : a.guc);

// Saf önizleme (arayüz): bugün varsa ne olur. Güç bilinmiyorsa aralığın üst ucu kullanılır.
export function beklenenSonuc(d) {
  const a = d.tehdit?.aktif;
  if (!a) return null;
  const t = tehditCagda(TEHDIT[a.id], d.cag);
  const guc = a.bilinen ? varisGucu(d, a) : a.aralik[1];
  const savunma = savunmaHesapla(d);
  if (a.tavir === 'saklan') {
    const s = tehditAlan(t, d.cag, 'saklan');
    return { sonuc: 'saklan', savunma, guc, eksik: 0, kayip: kayipMiktarlari(d, t, s.oran),
      metin: `Saklanırsınız: ${s.sure} tur üretim ×${s.carpan}${s.oran ? `, hedef kaynakların %${Math.round(s.oran * 100)}'u` : ''}.` };
  }
  if (t.kusatma && (a.evre ?? 'uyari') === 'uyari' && savunma < guc) {
    return { sonuc: 'kusatma', savunma, guc, eksik: Math.round((guc - savunma) * 100) / 100, kayip: {},
      metin: `Şu an: ${t.kusatma.sure} tur sürecek kuşatma başlar; surlar her tur ordunun gücünü aşındırır.` };
  }
  const sonuc = savunma >= guc ? 'puskurtme' : savunma >= guc / 2 ? 'kismi' : 'yenilgi';
  const kayip = sonuc === 'puskurtme' ? {} : kayipMiktarlari(d, t, kayipOrani(d, t, sonuc));
  const eksik = sonuc === 'puskurtme' ? 0 : Math.round((guc - savunma) * 100) / 100;
  const metin = sonuc === 'puskurtme' ? 'Şu an: püskürtürsünüz.'
    : `Şu an: ${sonuc === 'kismi' ? 'kısmi kayıp' : 'yenilgi'}. +${Math.ceil(eksik * 100) / 100} savunma ile püskürtürsünüz.`;
  return { sonuc, savunma, guc, eksik, kayip, metin };
}

// Arayüz görünümü: çip + pencere verisi. Sayı yalnız gözcüyle (§11.2).
export function tehditGorunumu(d) {
  const T = d.tehdit;
  if (!T) return null;
  const gozcu = gozcuVar(d);
  const kad = TEHDIT_KADEME.find((k) => T.gerginlik >= k.min);
  const artis = gerginlikArtisTabani(d) + 1;
  const gun = T.gerginlik >= TEHDIT_DOGUM_ESIK ? 0 : Math.ceil((TEHDIT_DOGUM_ESIK - T.gerginlik) / Math.max(0.1, artis));
  const g = { kademe: kad.id, kademeAd: kad.ad, gerginlik: gozcu ? Math.round(T.gerginlik) : null,
    tahminiGun: gozcu ? Math.max(gun, T.nefesKalan) : null, nefes: T.nefesKalan > 0,
    ipucu: doluluk(d) > 0.6 ? 'Dolu ambarlar göz çekiyor.' : null, zorluk: d.zorluk, aktif: null };
  const a = T.aktif;
  if (!a) return g;
  const t = tehditCagda(TEHDIT[a.id], d.cag);
  const b = beklenenSonuc(d);
  const renk = b.savunma >= b.guc ? 'yesil' : b.savunma >= b.guc / 2 ? 'sari' : 'kirmizi';
  const secenekAd = t.secenekAd || {};
  const secenekler = t.secenekler.filter((s) => ['savun', 'harac', 'saklan', 'elci'].includes(s)).map((id) => {
    const ad = secenekAd[id] || { savun: 'Savun', harac: 'Haraç ver', saklan: 'Saklan', elci: 'Elçi gönder' }[id];
    if (id === 'elci') {
      const e = elciBilgi(d);
      return { id, ad, secili: false, uygun: e.uygun, hata: e.hata, maliyet: e.maliyet, olasilik: e.olasilik, eylem: 'elci_gonder' };
    }
    const hata = secenekHatasi(d, id);
    const maliyet = id === 'harac' ? haracMaliyeti(d, t, a.guc) : {};
    return { id, ad, secili: a.tavir === id, uygun: !hata, hata, maliyet };
  });
  const evre = a.evre ?? 'uyari';
  g.aktif = { id: a.id, ad: t.ad, tur: t.tur, metin: t.metin, isaret: t.isaret, kaynak: t.kaynak, iliski: T.iliski[t.kaynak] || 0,
    kalan: a.kalan, tavir: a.tavir, bilinen: a.bilinen, guc: a.bilinen ? a.guc : null, aralik: [...a.aralik],
    savunma: b.savunma, renk, beklenen: b, secenekler, tahkimat: tahkimatBilgi(d), silah: silahBilgi(d), nobet: nobetBilgi(d),
    evre, karar: !!a.karar, kusatma: t.kusatma ? { sure: t.kusatma.sure, kalan: evre === 'kusatma' ? a.kalan : null,
      asinma: evre === 'kusatma' ? kusatmaAsinmasi(d, a.guc, t) : null, kararSecenekleri: ['dayan', 'fidye'] } : null };
  return g;
}

// ---------- Adım m2 ----------
export function adimTehdit(durum, bildirimler = []) {
  if (!durum.tehdit) return durum;
  const d = kopya(durum);
  const T = d.tehdit;
  const gun = d.tur + 1;
  if (T.aktif) {
    const a = T.aktif;
    if (!a.bilinen && (gozcuVar(d) || d.istatistik?.sonTur?.eylem === 'kesfet')) {
      a.bilinen = true;
      bildir(bildirimler, 'tehdit_bilgi', `${tehditAlan(TEHDIT[a.id], d.cag, 'ad')}: gücü ${a.guc} olarak öğrenildi.`, 'bilgi', { tehdit: a.id });
    }
    if ((a.evre ?? 'uyari') === 'kusatma') { kusatmaTuru(d, bildirimler); return d; }
    a.kalan -= 1;
    if (a.kalan > 0) return d;
    if (d.olay?.aktif && !a.erteleme) { a.erteleme = 1; a.kalan = 1; return d; }
    tehditVaris(d, bildirimler);
    return d;
  }
  if (T.nefesKalan > 0) {
    T.nefesKalan -= 1;
    if (gun >= TEHDIT_ILK_GUN) T.gerginlik = Math.min(TEHDIT_BEKLE_ESIK, T.gerginlik + artisZar(d));
    return d;
  }
  if (gun < TEHDIT_ILK_GUN) return d;
  T.gerginlik = Math.min(TEHDIT_DOGUM_ESIK, T.gerginlik + artisZar(d));
  if (T.gerginlik < TEHDIT_DOGUM_ESIK) return d;
  if (gun < TEHDIT_DOGUM_ILK_GUN || sarmalda(d)) { T.gerginlik = TEHDIT_BEKLE_ESIK; return d; }
  const aday = adayTehditler(d);
  // AKSIYON §4.3 kural 5: baskına hazırlanan komşu varsa sonraki doğum (aday ise) kesin onun baskınıdır.
  const kesin = komsuTehditEtkisi(d).kesin ? aday.find((t) => t.kaynak === 'komsu') : null;
  if (kesin) { tehditDogur(d, kesin, bildirimler); return d; }
  const r = rngAgirlikli(T.rng, aday, (t) => tehditAgirligi(d, t));
  T.rng = r.rng;
  if (!r.deger) { T.gerginlik = TEHDIT_BEKLE_ESIK; return d; }
  tehditDogur(d, r.deger, bildirimler);
  return d;
}

function artisZar(d) {
  const r = rngTamsayi(d.tehdit.rng, 0, 2);
  d.tehdit.rng = r.rng;
  return gerginlikArtisTabani(d) + r.deger;
}

// Kopya üstünde: tehdit doğar (uyarı aşaması). Güç doğumda bir kez hesaplanır (öngörülebilirlik).
export function tehditDogur(d, t, bildirimler) {
  const T = d.tehdit;
  const z = zorlukTanim(d);
  const guc = tehditGucu(d, t);
  const gozcu = gozcuVar(d);
  const uyari = t.uyari + (gozcu ? 1 : 0) + z.uyariEk + (merhametVar(d) && !z.uyariEk ? 1 : 0);
  const aralik = [Math.floor(guc * TEHDIT_ARALIK[0]), Math.ceil(guc * TEHDIT_ARALIK[1])];
  const bilinen = gozcu || d.istatistik?.sonTur?.eylem === 'kesfet';
  T.aktif = { id: t.id, guc, aralik, kalan: uyari, ...AKTIF_VARSAYILAN, bilinen };
  T.bekleme = { ...T.bekleme, [t.id]: d.tur + 1 + (t.bekleme ?? TEHDIT_BEKLEME) };
  const c = tehditCagda(t, d.cag);
  bildir(bildirimler, 'tehdit_uyari', `⚠ ${c.isaret}: ${c.ad} ${uyari} gün içinde gelecek.`, 'uyari',
    { tehdit: t.id, kalan: uyari, guc: bilinen ? guc : null, aralik });
}

function gecmisEkle(d, id, guc, savunma, sonuc) {
  d.tehdit.gecmis = [...d.tehdit.gecmis, { tur: d.tur, id, guc, savunma: Math.round(savunma * 100) / 100, sonuc }].slice(-TEHDIT_GECMIS);
}
function iliskiEkle(d, kaynak, n) {
  d.tehdit.iliski = { ...d.tehdit.iliski, [kaynak]: sinirla((d.tehdit.iliski[kaynak] || 0) + n, -100, 100) };
}
function kayipUygulaKaynak(d, miktar) {
  for (const [r, m] of Object.entries(miktar)) d.kaynaklar[r] = Math.max(0, (d.kaynaklar[r] || 0) - m);
}
const kayipMetni = (m) => Object.entries(m).filter(([, x]) => x >= 0.5).map(([r, x]) => `${Math.round(x)} ${KAYNAK[r]?.ad ?? r}`).join(', ');

// Hasar (tehdit RNG'si): merkez, konut, inşaattaki, hasarlı hedef dışı. filtre: ek süzgeç.
function tehditHasar(d, adet, filtre, bildirimler) {
  let n = 0;
  for (let i = 0; i < adet; i++) {
    const aday = d.binalar.filter((b) => !['merkez', 'konut'].includes(BINA[b.id].tur) && binaKurulu(d, b) && !b.hasarli && filtre(b));
    if (!aday.length) break;
    const b = aday[Math.floor(tz(d) * aday.length)];
    b.hasarli = true;
    n++;
    bildir(bildirimler, 'hasar', `${BINA[b.id].ad} ${BINA[b.id].yanabilir ? 'yandı' : 'hasar gördü'}.`, 'uyari', { uid: b.uid });
  }
  return n;
}
// Önce `oncelik` süzgecine uyan binalar (kuşatma: savunma binaları), yoksa genel süzgeç.
function tehditHasarOncelikli(d, adet, filtre, oncelik, bildirimler) {
  let n = 0;
  if (oncelik) n = tehditHasar(d, adet, (b) => filtre(b) && oncelik(b), bildirimler);
  return n + tehditHasar(d, adet - n, filtre, bildirimler);
}
// Kopya üstünde: sonuç ek etkileri (değiştirici, hasar, kervan, huzur). Dönüş: yok.
function ekEtkiler(d, t, s, tur, bildirimler) {
  const z = zorlukTanim(d);
  const darbe = cagDarbe(d);
  if (s.hasar && z.hasarMax > 0) {
    const onc = s.hasarOncelik === 'savunma' ? (b) => BINA[b.id].tur === 'savunma' : null;
    const filtre = s.hasarOncelik === 'savunma' ? () => true : (b) => !BINA[b.id].cevre;
    tehditHasarOncelikli(d, Math.min(s.hasar, z.hasarMax), filtre, onc, bildirimler);
  }
  if (s.yakar && z.hasarMax > 0) tehditHasar(d, 1, (b) => BINA[b.id].yanabilir, bildirimler);
  if (s.kervan && d.kervanlar.length) {
    const n = Math.min(s.kervan, d.kervanlar.length);
    d.kervanlar = d.kervanlar.slice(n);
    bildir(bildirimler, 'kervan', `${n} kervan yolda soyuldu.`, 'uyari');
  }
  if (s.degistirici) degistiriciEkle(d, s.degistirici);
  const h = tur === 'yenilgi' ? darbe.huzur + (s.huzur || 0) : Math.round((darbe.huzur + (s.huzur || 0)) / 2);
  if (h) huzurEkle(d, h);
}
// Göçebe ve ölümsüz zorluklarda ölüm yerine yaralı.
function nufusKaybi(d, t, y, bildirimler) {
  const z = zorlukTanim(d);
  const olumlu = y.nufus > 0 && z.olum && cagSira(d.cag) > 0;
  if (olumlu) {
    kayipUygula(d, y.nufus, t.ad, bildirimler);
  } else if (y.yarali) {
    degistiriciEkle(d, { id: 'yarali', sure: y.yarali.sure, etki: { yaraliIsci: y.yarali.adet } });
    bildir(bildirimler, 'yarali', `${y.yarali.adet} kişi yaralandı; ${y.yarali.sure} tur çalışamayacak.`, 'uyari');
  }
}

// Kopya üstünde: varış (§5.2). Dönüş: sonuç id'si.
export function tehditVaris(d, bildirimler) {
  const T = d.tehdit;
  const a = T.aktif;
  const t = tehditCagda(TEHDIT[a.id], d.cag);
  const guc = varisGucu(d, a);
  const savunma = savunmaHesapla(d);
  sonTur(d).tehditVaris = true;
  // Kuşatma evresi (§2.1): savunma yetmiyorsa ordu kenti sarar; karar noktası.
  if (t.kusatma && (a.evre ?? 'uyari') === 'uyari' && a.tavir !== 'saklan' && savunma < guc) {
    a.evre = 'kusatma';
    a.kalan = t.kusatma.sure;
    a.karar = true;
    a.bilinen = true;
    degistiriciEkle(d, { id: 'kusatma', sure: t.kusatma.sure + 1,
      etki: { ticaretKapali: true, uretim: { etiket: '*', carpan: KUSATMA.uretim } } });
    bildir(bildirimler, 'tehdit_kusatma', `${t.ad} başladı! Ordu kenti sardı (🛡 ${fmt(savunma)} / ⚔ ${guc}). `
      + `${t.kusatma.sure} tur dayanın ya da fidye ödeyin; surlar her tur ordunun gücünü aşındırır.`, 'uyari',
    { tehdit: t.id, guc, savunma, kalan: a.kalan, karar: true });
    return 'kusatma';
  }
  T.aktif = null;
  if (a.evre === 'kusatma') d.degistiriciler = d.degistiriciler.filter((m) => m.id !== 'kusatma');
  const ek = { tehdit: t.id, guc, savunma };
  if (a.tavir === 'saklan') {
    const s = tehditAlan(t, d.cag, 'saklan');
    const kayip = kayipMiktarlari(d, t, s.oran);
    kayipUygulaKaynak(d, kayip);
    degistiriciEkle(d, { id: 'saklanma', sure: s.sure, etki: { uretim: { etiket: '*', carpan: s.carpan } } });
    T.gerginlik = TEHDIT_SAKLAN_GERGINLIK;
    T.un = 0;
    gecmisEkle(d, t.id, guc, savunma, 'saklan');
    bildir(bildirimler, 'tehdit_varis', `${t.ad} geldi; halk saklandı${kayipMetni(kayip) ? ` (${kayipMetni(kayip)} geride kaldı)` : ''}.`,
      'bilgi', { ...ek, sonuc: 'saklan', kayip });
    return 'saklan';
  }
  let sonuc;
  if (savunma >= guc) {
    sonuc = 'puskurtme';
    huzurEkle(d, TEHDIT_PUSKURTME.huzur);
    const gan = tehditAlan(t, d.cag, 'ganimet') || {};
    const kazanc = kaynakUygula(d, Object.fromEntries(Object.entries(gan).filter(([r]) => kaynakAcik(d, r)).map(([r, c]) => [r, Math.ceil(guc * c)])));
    T.un = Math.min(TEHDIT_UN_MAX, T.un + 1);
    T.gerginlik = TEHDIT_PUSKURTME.gerginlik;
    T.artArdaYenilgi = 0;
    T.haracSayac = Math.max(0, T.haracSayac - 1);
    if (t.kaynak === 'komsu') iliskiEkle(d, t.kaynak, TEHDIT_PUSKURTME.iliski);
    const km = Object.entries(kazanc).filter(([, m]) => m > 0).map(([r, m]) => `+${Math.round(m)} ${KAYNAK[r].ad}`).join(', ');
    bildir(bildirimler, 'tehdit_varis', `${t.ad} püskürtüldü (🛡 ${fmt(savunma)} / ⚔ ${guc})${km ? `; ganimet: ${km}` : ''}.`, 'iyi',
      { ...ek, sonuc, ganimet: kazanc });
  } else if (savunma >= guc / 2) {
    sonuc = 'kismi';
    const kayip = kayipMiktarlari(d, t, kayipOrani(d, t, 'kismi'));
    kayipUygulaKaynak(d, kayip);
    ekEtkiler(d, t, t.sonuc.kismi, 'kismi', bildirimler);
    T.un = 0;
    T.gerginlik = TEHDIT_KISMI_GERGINLIK;
    T.artArdaYenilgi = 0;
    bildir(bildirimler, 'tehdit_varis', `${t.ad} kısmen durduruldu (🛡 ${fmt(savunma)} / ⚔ ${guc}); kayıp: ${kayipMetni(kayip) || 'yok'}.`,
      'uyari', { ...ek, sonuc, kayip });
  } else {
    sonuc = 'yenilgi';
    const y = t.sonuc.yenilgi;
    const kayip = kayipMiktarlari(d, t, kayipOrani(d, t, 'yenilgi'));
    kayipUygulaKaynak(d, kayip);
    nufusKaybi(d, t, y, bildirimler);
    ekEtkiler(d, t, y, 'yenilgi', bildirimler);
    degistiriciEkle(d, TOPARLANMA);
    T.un = 0;
    T.gerginlik = TEHDIT_YENILGI.gerginlik;
    T.artArdaYenilgi += 1;
    bildir(bildirimler, 'tehdit_varis', `${t.ad} püskürtülemedi (🛡 ${fmt(savunma)} / ⚔ ${guc}); kayıp: ${kayipMetni(kayip) || 'yok'}. `
      + 'Köy toparlanıyor (5 tur huzur +5, onarım bedava).', 'uyari', { ...ek, sonuc, kayip });
  }
  T.sonSonuc = sonuc;
  gecmisEkle(d, t.id, guc, savunma, sonuc);
  return sonuc;
}
const fmt = (x) => String(Math.round(x * 100) / 100).replace('.', ',');

// Kuşatma turu (adım m2, evre 'kusatma'): karar penceresi kapanır, ordu aşınır; savunma ≥ güç → kırılır; süre biterse sonuç.
export function kusatmaAsinmasi(d, guc, t = TEHDIT[d.tehdit.aktif.id]) {
  const c = cevreSavunmasi(d);
  return Math.ceil(guc * t.kusatma.asinma + (c.parca + c.halka) * KUSATMA.surAsinma - 1e-9);
}
function kusatmaTuru(d, bildirimler) {
  const a = d.tehdit.aktif;
  const t = tehditCagda(TEHDIT[a.id], d.cag);
  a.karar = false;
  sonTur(d).tehditVaris = true;
  const as = kusatmaAsinmasi(d, a.guc, t);
  a.guc = Math.max(1, a.guc - as);
  a.aralik = [a.guc, a.guc];
  a.kalan -= 1;
  if (savunmaHesapla(d) >= varisGucu(d, a) || a.kalan <= 0) { tehditVaris(d, bildirimler); return; }
  bildir(bildirimler, 'tehdit_kusatma', `Kuşatma sürüyor: ordu ${as} güç yitirdi (⚔ ${a.guc}); ${a.kalan} tur kaldı.`, 'uyari',
    { tehdit: t.id, guc: a.guc, kalan: a.kalan, karar: false });
}

// ---------- Komutlar ----------
function secenekHatasi(d, id) {
  const a = d.tehdit?.aktif;
  if (!a) return 'Yaklaşan bir tehdit yok.';
  const t = tehditCagda(TEHDIT[a.id], d.cag);
  if (!t.secenekler.includes(id)) return 'Bu tehditte bu seçenek yok.';
  if (id === 'saklan' && a.evre === 'kusatma') return 'Kuşatma başladı; artık saklanılamaz.';
  if (id === 'harac') {
    const m = haracMaliyeti(d, t, a.guc);
    if (t.harac.kaynak && !kaynakYeter(d, m)) return `Kaynak yetersiz: ${eksikMetni(d, m)} eksik.`;
  }
  return null;
}

// Komut: tavır seç ('savun' | 'saklan'); varışta uygulanır.
export function tehditTavir(durum, tavir) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (!TEHDIT_TAVIRLARI.includes(tavir)) return hataDon(durum, 'Geçersiz tavır.');
  const h = secenekHatasi(durum, tavir);
  if (h) return hataDon(durum, h);
  if (durum.tehdit.aktif.tavir === tavir) return hataDon(durum, 'Bu tavır zaten seçili.');
  const d = kopya(durum);
  d.tehdit.aktif.tavir = tavir;
  return { durum: d };
}
export const tehditTavirSec = tehditTavir;

// Komut: haraç / yem bırak — tehdit anında çözülür.
export function haracOde(durum) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const h = secenekHatasi(durum, 'harac');
  if (h) return hataDon(durum, h);
  const d = kopya(durum);
  const T = d.tehdit;
  const a = T.aktif;
  const t = tehditCagda(TEHDIT[a.id], d.cag);
  const m = haracMaliyeti(d, t, a.guc);
  kayipUygulaKaynak(d, m);
  T.aktif = null;
  if (a.evre === 'kusatma') d.degistiriciler = d.degistiriciler.filter((x) => x.id !== 'kusatma');
  T.haracSayac = Math.min(TEHDIT_HARAC.sayacMax, T.haracSayac + 1);
  T.gerginlik = TEHDIT_HARAC.gerginlik;
  T.un = 0;
  if (t.kaynak === 'komsu') iliskiEkle(d, t.kaynak, TEHDIT_HARAC.iliski);
  gecmisEkle(d, t.id, a.guc, savunmaHesapla(d), 'harac');
  const bildirimler = [];
  bildir(bildirimler, 'tehdit_varis', `${tehditAlan(t, d.cag, 'ad')} uzaklaştı (${kayipMetni(m) || 'bedelsiz'} verildi). Sonraki tehditler biraz daha güçlü gelecek.`,
    'bilgi', { tehdit: t.id, sonuc: 'harac', kayip: m });
  return { durum: d, bildirimler };
}

// Acil Tahkimat (§4.2): tehdit başına 1; savunma değiştiricisi varışa kadar.
export function tahkimatBilgi(d) {
  const a = d.tehdit?.aktif;
  const k = TAHKIMAT[d.cag];
  if (!k) return null;
  const hata = !a ? 'Yaklaşan bir tehdit yok.' : a.tahkimat ? 'Bu tehdit için tahkimat zaten yapıldı.'
    : a.evre === 'kusatma' ? 'Kuşatma altında tahkimat yapılamaz.'
    : !kaynakYeter(d, k.maliyet) ? `Kaynak yetersiz: ${eksikMetni(d, k.maliyet)} eksik.` : null;
  return { maliyet: { ...k.maliyet }, savunma: k.savunma, uygun: !hata, hata };
}
export function tahkimatYap(durum) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const b = tahkimatBilgi(durum);
  if (!b) return hataDon(durum, 'Bu çağda tahkimat yok.');
  if (b.hata) return hataDon(durum, b.hata);
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(b.maliyet).map(([r, m]) => [r, -m])));
  d.tehdit.aktif.tahkimat = true;
  degistiriciEkle(d, { id: 'tahkimat', sure: d.tehdit.aktif.kalan + 1, etki: { savunma: b.savunma } });
  return { durum: d };
}

// Komut: bekçi sayısını ayarla (serbest iş; isAta kısayolu).
export const BEKCI_ANAHTAR = serbestAnahtar('bekci');
export function bekciAta(durum, adet) {
  return isAta(durum, BEKCI_ANAHTAR, adet);
}

// Komut: zorluk her an düşürülebilir; yükseltme yalnız yeni oyunda (§11.4).
export function zorlukAyarla(durum, zorluk) {
  if (!ZORLUK[zorluk]) return hataDon(durum, 'Geçersiz zorluk.');
  if (durum.zorluk === zorluk) return hataDon(durum, 'Zorluk zaten bu düzeyde.');
  if (ZORLUK[zorluk].sira > zorlukTanim(durum).sira) return hataDon(durum, 'Zorluk yalnız yeni oyunda yükseltilebilir.');
  const d = kopya(durum);
  d.zorluk = zorluk;
  if (d.tehdit?.aktif && ZORLUK[zorluk].turler && !ZORLUK[zorluk].turler.includes(TEHDIT[d.tehdit.aktif.id].tur)) {
    d.tehdit.aktif = null; // Barışçıl'a inince yırtıcı olmayan uyarı (ve kuşatma) düşer
    d.degistiriciler = d.degistiriciler.filter((m) => m.id !== 'kusatma');
  }
  return { durum: d };
}


// ---------- Silah Dağıt (komut, §4.2) ----------
// Taş+: puan başı 2 alet (Bronz+: 1 metal) → +1 savunma, varışa (ve kuşatma sonuna) kadar; tehdit başına en çok floor(nüfus/2).
export function silahBilgi(d) {
  const a = d.tehdit?.aktif;
  const birim = SILAH[d.cag];
  const ust = Math.floor(d.nufus / SILAH.nufusBolen);
  const verilen = a?.silah || 0;
  if (!birim) return { birim: null, verilen, ust, kalan: 0, uygun: false, hata: 'Silah Dağıt Taş Devri\'nde açılır.' };
  const [r, m] = Object.entries(birim)[0];
  const alinabilir = Math.min(ust - verilen, Math.floor((d.kaynaklar[r] || 0) / m + 1e-9));
  const hata = !a ? 'Yaklaşan bir tehdit yok.' : verilen >= ust ? `Bu tehdit için en çok ${ust} silah dağıtılabilir.`
    : alinabilir <= 0 ? `Kaynak yetersiz: ${m} ${KAYNAK[r].ad} gerekir.` : null;
  return { birim: { ...birim }, verilen, ust, kalan: Math.max(0, alinabilir), uygun: !hata, hata };
}
export function silahDagit(durum, adet = 1) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (!Number.isInteger(adet) || adet < 1) return hataDon(durum, 'Geçersiz adet.');
  const b = silahBilgi(durum);
  if (b.hata) return hataDon(durum, b.hata);
  if (adet > b.kalan) return hataDon(durum, `En çok ${b.kalan} silah dağıtılabilir.`);
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(b.birim).map(([r, m]) => [r, -m * adet])));
  d.tehdit.aktif.silah = (d.tehdit.aktif.silah || 0) + adet;
  return { durum: d };
}

// ---------- Nöbet Tut (önder eylemi `nobet_tut`, §4.2) ----------
export const nobetSavunmasi = (d) => NOBET.taban + cagSira(d.cag);
export function nobetBilgi(d) {
  const a = d.tehdit?.aktif;
  const hata = !a ? 'Yaklaşan bir tehdit yok.' : null;
  return { savunma: nobetSavunmasi(d), sure: NOBET.sure, eylem: 'nobet_tut', uygun: !hata, hata };
}
// Kopya üstünde (adım a): değiştirici `nobet` NOBET.sure tehdit adımı boyunca (adım m önce düştüğü için +1).
export function nobetTut(d, bildirimler) {
  degistiriciEkle(d, { id: 'nobet', sure: NOBET.sure + 1, etki: { savunma: nobetSavunmasi(d) } });
  bildir(bildirimler, 'tehdit_bilgi', `Önder nöbet tutuyor: ${NOBET.sure} tur +${nobetSavunmasi(d)} savunma.`, 'bilgi');
}

// ---------- Elçi Gönder (önder eylemi `elci_gonder`, §5.1) ----------
export function elciOlasiligi(d, t) {
  return sinirla(ELCI.taban + (d.tehdit.iliski[t.kaynak] || 0) / 100 + ELCI.cag * cagSira(d.cag), ELCI.min, ELCI.max);
}
export function elciHediyesi(d, guc) {
  return cagSira(d.cag) >= cagSira(ELCI.sikkeCag) ? { sikke: Math.ceil(guc * ELCI.sikke) } : { yiyecek: Math.ceil(guc * ELCI.yiyecek) };
}
export function elciBilgi(d) {
  const a = d.tehdit?.aktif;
  if (!a) return { uygun: false, hata: 'Yaklaşan bir tehdit yok.', maliyet: {}, olasilik: 0, eylem: 'elci_gonder' };
  const t = TEHDIT[a.id];
  const maliyet = elciHediyesi(d, a.guc);
  const olasilik = Math.round(elciOlasiligi(d, t) * 100) / 100;
  const hata = !t.secenekler.includes('elci') ? 'Bu tehdide elçi gönderilemez.'
    : cagSira(d.cag) < 1 ? 'Elçi Gönder Taş Devri\'nde açılır.'
    : (a.evre ?? 'uyari') !== 'uyari' ? 'Artık elçi gönderilemez.'
    : a.elciDenendi ? 'Bu tehdide zaten elçi gönderildi.'
    : !kaynakYeter(d, maliyet) ? `Kaynak yetersiz: ${eksikMetni(d, maliyet)} eksik.` : null;
  return { uygun: !hata, hata, maliyet, olasilik, eylem: 'elci_gonder' };
}
// Kopya üstünde (adım a). Başarı: tehdit biter, ilişki +10, gerginlik 0. Başarısız: hediyenin yarısı gider, ilişki −5, tehdit sürer.
export function elciGonder(d, bildirimler) {
  const T = d.tehdit;
  const a = T.aktif;
  const t = tehditCagda(TEHDIT[a.id], d.cag);
  const hediye = elciHediyesi(d, a.guc);
  const p = elciOlasiligi(d, t);
  a.elciDenendi = true;
  if (tz(d) < p) {
    kayipUygulaKaynak(d, hediye);
    iliskiEkle(d, t.kaynak, ELCI.basariIliski);
    T.aktif = null;
    T.gerginlik = ELCI.gerginlik;
    T.un = 0;
    gecmisEkle(d, t.id, a.guc, savunmaHesapla(d), 'elci');
    bildir(bildirimler, 'tehdit_varis', `Elçiler anlaştı: ${t.ad} geri döndü (${kayipMetni(hediye)} hediye edildi).`, 'iyi',
      { tehdit: t.id, sonuc: 'elci', kayip: hediye });
    return 'elci';
  }
  const yari = Object.fromEntries(Object.entries(hediye).map(([r, m]) => [r, Math.ceil(m * ELCI.kayip)]));
  kayipUygulaKaynak(d, yari);
  iliskiEkle(d, t.kaynak, ELCI.basarisizIliski);
  bildir(bildirimler, 'tehdit_bilgi', `Elçiler eli boş döndü (${kayipMetni(yari)} gitti); ${t.ad} yolda.`, 'uyari', { tehdit: t.id });
  return 'basarisiz';
}

// ---------- Kuşatma kararı (durduran pencere; §11.1) ----------
// 'dayan': kuşatma sürer (karar penceresi kapanır) · 'fidye': haraç (sikke) ödenir, kuşatma biter.
export function kusatmaKarar(durum, secim) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const a = durum.tehdit?.aktif;
  if (!a || a.evre !== 'kusatma') return hataDon(durum, 'Süren bir kuşatma yok.');
  if (secim === 'fidye') return haracOde(durum);
  if (secim !== 'dayan') return hataDon(durum, 'Geçersiz karar.');
  if (!a.karar) return hataDon(durum, 'Karar zaten verildi.');
  const d = kopya(durum);
  d.tehdit.aktif.karar = false;
  return { durum: d };
}

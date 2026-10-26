// Dış tehdit motoru (docs/TEHDIT.md §3–§6, MVP §10). Saf; ayrı tohumlu RNG (`durum.tehdit.rng`) kullanır, `durum.rng`'ye dokunmaz.
// Akış: gerginlik (0–100) her tur artar → 100'de tehdit doğar (uyarı 2–5 tur) → oyuncu tavır seçer (Savun varsayılan /
// Saklan) ya da Haraç öder (anında) → kalan 0 olduğu turun tehdit adımında (m2) varış: savunma testi + sonuç.
// Oyunu durdurmaz (kullanıcı kararı §11.1: durduran pencere yalnız Kuşatma'da; MVP'de yok).
import { TEHDITLER, TASINABILIR, TEHDIT_TAVIRLARI } from '../data/tehditler.js';
import { CAGLAR } from '../data/caglar.js';
import { KAYNAKLAR } from '../data/kaynaklar.js';
import {
  TEHDIT_ILK_GUN, TEHDIT_DOGUM_ILK_GUN, TEHDIT_BASLANGIC, TEHDIT_DOGUM_ESIK, TEHDIT_BEKLE_ESIK, TEHDIT_GERGINLIK_MIN,
  TEHDIT_KADEME, TEHDIT_GUC_UST, TEHDIT_BEKLEME, TEHDIT_ARALIK, TEHDIT_SARMAL_HUZUR, TEHDIT_SARMAL_GUC, TEHDIT_PUSKURTME,
  TEHDIT_KISMI_GERGINLIK, TEHDIT_YENILGI, TEHDIT_HARAC, TEHDIT_SAKLAN_GERGINLIK, TEHDIT_UN_MAX, TEHDIT_KADEME_SINIR,
  TEHDIT_CEKICILIK, TEHDIT_GECMIS, TEHDIT_KOMSU_DOST, TEHDIT_KIS_AZIGI, TOPARLANMA, MERHAMET_YENILGI, ZORLUK,
  VARSAYILAN_ZORLUK, MERHAMET_ZORLUK, CEVRE, TAHKIMAT, SALDIRI_TUR_BOLEN,
} from '../data/denge.js';
import {
  BINA, kopya, sinirla, mevcutCag, cagSira, kaynakAcik, depoTavani, calisanBinalar, binaKurulu, etkinAtama, sonTur, bildir,
  degistiriciEkle, kaynakUygula, kaynakYeter, eksikMetni, olayKilitli, OLAY_KILIDI, hataDon, serbestAnahtar, KAYNAK,
} from './yardimci.js';
import { rngBaslat, rngSonraki, rngTamsayi, rngAgirlikli } from './rng.js';
import { kosulSaglanir } from './olay.js';
import { savunmaHesapla } from './savunma.js';
import { huzurEkle } from './huzur.js';
import { kayipUygula, isAta } from './nufus.js';
import { isinmaIhtiyaci } from './tuketim.js';
import { cevreKapali } from '../world/cevre.js';

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
export function gerginlikArtisTabani(d) {
  return (mevcutCag(d).gerginlikArtis || 0) * zorlukTanim(d).siklik * (0.8 + 0.4 * doluluk(d));
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
    && kosulSaglanir(d, t.kosul));
}
function tehditAgirligi(d, t) {
  const son = d.tehdit.gecmis.at(-1);
  let w = t.agirlik;
  if (son && TEHDIT[son.id]?.tur === t.tur) w *= 0.5;
  if (t.kaynak === 'komsu' && (d.tehdit.iliski[t.kaynak] || 0) >= TEHDIT_KOMSU_DOST.iliski) w *= TEHDIT_KOMSU_DOST.carpan;
  return w;
}
const sarmalda = (d) => d.acTur > 0 || d.huzur < TEHDIT_SARMAL_HUZUR;

// Hedef kaynaklar (yalnız durumda var olanlar).
export function hedefKaynaklar(d, t) {
  const h = t.hedef;
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
// Etkin kayıp oranı: tür oranı × zorluk × (kapalı çevre ? 0,8) — zorluk tavanı.
export function kayipOrani(d, t, tur) {
  const z = zorlukTanim(d);
  const kap = cevreKapali(d).kapali ? CEVRE.kayipCarpani : 1;
  return Math.min(z.kayipTavan, t.sonuc[tur].oran * z.kayip * kap);
}
export function haracMaliyeti(d, t, guc) {
  const h = t.harac;
  if (h.kaynak) return Object.fromEntries(Object.entries(h.kaynak).map(([r, c]) => [r, Math.ceil(guc * c)]));
  return kayipMiktarlari(d, t, h.oran);
}
// Varışta kullanılacak güç (sarmal koruması: açlık/huzur < 30 iken ×0,8).
export const varisGucu = (d, a) => (sarmalda(d) ? Math.ceil(a.guc * TEHDIT_SARMAL_GUC) : a.guc);

// Saf önizleme (arayüz): bugün varsa ne olur. Güç bilinmiyorsa aralığın üst ucu kullanılır.
export function beklenenSonuc(d) {
  const a = d.tehdit?.aktif;
  if (!a) return null;
  const t = TEHDIT[a.id];
  const guc = a.bilinen ? varisGucu(d, a) : a.aralik[1];
  const savunma = savunmaHesapla(d);
  if (a.tavir === 'saklan') {
    const s = tehditAlan(t, d.cag, 'saklan');
    return { sonuc: 'saklan', savunma, guc, eksik: 0, kayip: kayipMiktarlari(d, t, s.oran),
      metin: `Saklanırsınız: ${s.sure} tur üretim ×${s.carpan}${s.oran ? `, hedef kaynakların %${Math.round(s.oran * 100)}'u` : ''}.` };
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
  const t = TEHDIT[a.id];
  const b = beklenenSonuc(d);
  const renk = b.savunma >= b.guc ? 'yesil' : b.savunma >= b.guc / 2 ? 'sari' : 'kirmizi';
  const secenekAd = tehditAlan(t, d.cag, 'secenekAd') || {};
  const secenekler = t.secenekler.filter((s) => ['savun', 'harac', 'saklan'].includes(s)).map((id) => {
    const hata = secenekHatasi(d, id);
    const ad = secenekAd[id] || { savun: 'Savun', harac: 'Haraç ver', saklan: 'Saklan' }[id];
    const maliyet = id === 'harac' ? haracMaliyeti(d, t, a.guc) : {};
    return { id, ad, secili: a.tavir === id, uygun: !hata, hata, maliyet };
  });
  g.aktif = { id: a.id, ad: t.ad, metin: t.metin, isaret: t.isaret, kaynak: t.kaynak, iliski: T.iliski[t.kaynak] || 0,
    kalan: a.kalan, tavir: a.tavir, bilinen: a.bilinen, guc: a.bilinen ? a.guc : null, aralik: [...a.aralik],
    savunma: b.savunma, renk, beklenen: b, secenekler, tahkimat: tahkimatBilgi(d) };
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
      bildir(bildirimler, 'tehdit_bilgi', `${TEHDIT[a.id].ad}: gücü ${a.guc} olarak öğrenildi.`, 'bilgi', { tehdit: a.id });
    }
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
  T.aktif = { id: t.id, guc, aralik, kalan: uyari, tavir: 'savun', bilinen, erteleme: 0, tahkimat: false };
  T.bekleme = { ...T.bekleme, [t.id]: d.tur + 1 + (t.bekleme ?? TEHDIT_BEKLEME) };
  bildir(bildirimler, 'tehdit_uyari', `⚠ ${t.isaret}: ${t.ad} ${uyari} gün içinde gelecek.`, 'uyari',
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
  const t = TEHDIT[a.id];
  const z = zorlukTanim(d);
  const guc = varisGucu(d, a);
  const savunma = savunmaHesapla(d);
  sonTur(d).tehditVaris = true;
  T.aktif = null;
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
    tehditHasar(d, Math.min(y.hasar || 0, z.hasarMax), (b) => !BINA[b.id].cevre, bildirimler);
    if (y.yakar && z.hasarMax > 0) tehditHasar(d, 1, (b) => BINA[b.id].yanabilir, bildirimler);
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

// ---------- Komutlar ----------
function secenekHatasi(d, id) {
  const a = d.tehdit?.aktif;
  if (!a) return 'Yaklaşan bir tehdit yok.';
  const t = TEHDIT[a.id];
  if (!t.secenekler.includes(id)) return 'Bu tehditte bu seçenek yok.';
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
  const t = TEHDIT[a.id];
  const m = haracMaliyeti(d, t, a.guc);
  kayipUygulaKaynak(d, m);
  T.aktif = null;
  T.haracSayac = Math.min(TEHDIT_HARAC.sayacMax, T.haracSayac + 1);
  T.gerginlik = TEHDIT_HARAC.gerginlik;
  T.un = 0;
  if (t.kaynak === 'komsu') iliskiEkle(d, t.kaynak, TEHDIT_HARAC.iliski);
  gecmisEkle(d, t.id, a.guc, savunmaHesapla(d), 'harac');
  const bildirimler = [];
  bildir(bildirimler, 'tehdit_varis', `${t.ad} uzaklaştı (${kayipMetni(m) || 'bedelsiz'} verildi). Sonraki tehditler biraz daha güçlü gelecek.`,
    'bilgi', { tehdit: t.id, sonuc: 'harac', kayip: m });
  return { durum: d, bildirimler };
}

// Acil Tahkimat (§4.2): tehdit başına 1; savunma değiştiricisi varışa kadar.
export function tahkimatBilgi(d) {
  const a = d.tehdit?.aktif;
  const k = TAHKIMAT[d.cag];
  if (!k) return null;
  const hata = !a ? 'Yaklaşan bir tehdit yok.' : a.tahkimat ? 'Bu tehdit için tahkimat zaten yapıldı.'
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
    d.tehdit.aktif = null; // Barışçıl'a inince yırtıcı olmayan uyarı düşer
  }
  return { durum: d };
}


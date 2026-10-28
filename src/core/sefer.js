// Seferler ve harita hedef işaretleri (docs/AKSIYON.md §2, §7). Saf; yalnız ayrı tohumlu `durum.sefer.rng` akışını kullanır
// (`durum.rng` ve `tehdit.rng` sırası değişmez).
// Akış: seferGonder (erzak peşin; ekip köyde üretmez/yemez/savunmaz) → adım m3 her tur kalan −1 (yolda %25 sefer olayı, oyunu
// durdurmaz) → kalan 0: sonuç = r' = (ekipGücü / zorluk) × (0,85 + 0,3u) eşiklerle 4 kademe → ödül, XP, yaralı (ölüm YOK).
// İşaretler: Bahar/Güz başında, Keşfet eyleminde, keşif seferinde doğar; ISARET_SURE tur sonra kaybolur (adım o2).
import { SEFERLER, SEFER_OLAYLARI, ISARET_AGIRLIK, ISARET_AD } from '../data/seferler.js';
import {
  SEFER_SANS, SEFER_ESIK, SEFER_SONUC, SEFER_ERZAK, SEFER_ISCI_GUC, SEFER_ALET, SEFER_ONDER_GUC, SEFER_MAX, SEFER_MESAFE,
  SEFER_SURE_MIN, SEFER_KESIF_SURE, SEFER_ISCI_YARALI_SURE, SEFER_OLAY, SEFER_OLCEK, SEFER_MEVSIM, ISARET_MAX, ISARET_SURE,
  ISARET_MESAFE, ISARET_MEVSIM, ISARET_KESFET, ILK_AYI_GUN, AYI_KACTI, NUFUS_MIN, YORGUNLUK_MAX, ILK_OLAY_TUR, MEVSIM_TUR,
  TEHDIT_DOGUM_ESIK, TEHDIT_SARMAL_HUZUR, BASKIN, KOMSU_ILISKI,
} from '../data/denge.js';
import {
  KARO, KAYNAK, kopya, cagSira, mevcutCag, kaynakAcik, kaynakUygula, degistiriciEkle, bildir, olayKilitli, OLAY_KILIDI, hataDon,
  sonTur, yaraliSayisi, aktifSeferler, seferdekiIsci, seferdekiKahramanUid, seferdekiKisi, onderSeferde, kahramanSayisi,
  bulusEtkileri, sinirla, kisiEkle,
} from './yardimci.js';
import { takvim } from './takvim.js';
import { rngBaslat, rngSonraki } from './rng.js';
import { karoAt, merkezNokta } from '../world/harita.js';
import { izgara, icinde } from '../world/izgara.js';
import { kesifli, haritaKesfiUygula, yonAdi } from '../world/kesif.js';
import { savunmaHesapla } from './savunma.js';
import { bilgiEkle } from './arastirma.js';
import {
  SINIF, kahramanBul, kahramanGucu, kahramanSeferde, xpEkle, kahramanYarala, sandigaKoy, esyaEtki, esyaVar, yetenekVar,
  yetenekToplam, yetenekEnBuyuk, adimKahraman, terfiHatasi, kahramanOlustur, acikSiniflar, ESYA,
} from './kahraman.js';
import { destanIlerlet } from './hedef.js';
import { KOMSU, komsuBul, komsuGucu, iliskiDegistir } from './komsu_temel.js';
import { komsuKesfet } from './komsu.js';

export const SEFER = Object.fromEntries(SEFERLER.map((s) => [s.id, s]));
const SEFER_OLAY_TANIM = Object.fromEntries(SEFER_OLAYLARI.map((o) => [o.id, o]));
export const seferRngBaslat = (tohum) => rngBaslat(`sefer:${tohum}`);
export const seferIstatistikVarsayilan = () => ({ gonderilen: 0, buyuk: 0, basari: 0, kismi: 0, basarisiz: 0, yaraliIsci: 0 });
export const seferVarsayilan = (tohum) => ({ rng: seferRngBaslat(tohum), aktif: [], sayac: 0, bekleme: {}, ilkAyi: false,
  harabe: 0, ayiKacti: 0, istatistik: seferIstatistikVarsayilan(), son: [] });

// Kopya üstünde RNG (sefer akışı).
function sz(d) {
  const r = rngSonraki(d.sefer.rng);
  d.sefer.rng = r.rng;
  return r.deger;
}
const szTam = (d, a, b) => a + Math.floor(sz(d) * (b - a + 1));
const olcek = (d) => 1 + SEFER_OLCEK * mevcutCag(d).sira;
const mevsimSefer = (d, tur = d.tur) => SEFER_MEVSIM[takvim(tur).mevsim] || SEFER_MEVSIM.bahar;
const sarmalda = (d) => d.acTur > 0 || d.huzur < TEHDIT_SARMAL_HUZUR;

// ---------- Açıklık / hedef ----------
export function seferAcikHatasi(d, s) {
  if (!s) return 'Böyle bir sefer yok.';
  if (!s.acik) return `${s.ad} henüz yok.`;
  if (cagSira(d.cag) < cagSira(s.cagMin)) return `${s.ad} bu çağda açılmadı.`;
  if (s.cagMax && cagSira(d.cag) > cagSira(s.cagMax)) return `${s.ad} artık yapılmıyor.`;
  if (s.id === 'baskin_seferi' && d.zorluk === 'barisci') return 'Barışçıl zorlukta baskın seferi kapalı.';
  if (s.kisKapali && takvim(d.tur).mevsim === 'kis') return `${s.ad} kışın yapılamaz.`;
  return null;
}
export const isaretBul = (d, uid) => (d.hedefIsaretleri || []).find((i) => i.uid === uid);
export const isaretRezerve = (d, uid) => aktifSeferler(d).some((s) => s.hedef === uid);
const manhattan = (d, x, y) => { const m = merkezNokta(d); return Math.abs(x + 0.5 - m.x) + Math.abs(y + 0.5 - m.y); };

// Hedef çözümü: { hata } | { x, y, zorluk, isaret?, komsu? }.
function hedefCoz(d, s, hedefId) {
  if (s.hedef === 'yok') return { x: null, y: null, zorluk: s.zorluk[d.cag] };
  if (s.hedef === 'isaret') {
    const i = isaretBul(d, hedefId);
    if (!i) return { hata: 'Haritada böyle bir işaret yok.' };
    if (i.tur !== s.isaret) return { hata: `${s.ad} için ${ISARET_AD[s.isaret]} işareti seç.` };
    if (isaretRezerve(d, i.uid)) return { hata: 'Bu işarete zaten bir ekip gidiyor.' };
    return { x: i.x, y: i.y, zorluk: s.zorluk[d.cag] ?? i.zorluk, isaret: i };
  }
  const k = komsuBul(d, hedefId);
  if (!k) return { hata: 'Böyle bir komşu bilinmiyor.' };
  if ((d.sefer.bekleme?.[`${s.id}:${k.id}`] ?? -Infinity) > d.tur) {
    return { hata: `${KOMSU[k.id].ad} için ${d.sefer.bekleme[`${s.id}:${k.id}`] - d.tur} gün beklemelisin.` };
  }
  return { x: k.x, y: k.y, zorluk: s.zorluk === 'komsu' ? komsuGucu(d, k) : s.zorluk[d.cag], komsu: k };
}

// ---------- Ekip ----------
// ekip: { kahraman: [uid], isci: n, onder: bool }. Dönüş: normalleştirilmiş ekip.
export const ekipNormal = (e = {}) => ({ kahraman: [...new Set(Array.isArray(e.kahraman) ? e.kahraman : [])], isci: Math.floor(Number(e.isci) || 0),
  onder: !!e.onder });
export const ekipKisi = (e) => e.kahraman.length + e.isci;
// Gönderilebilir sağlıklı işçi: nüfus − yaralı − kahramanlar − seferdeki işçi.
export const bosIsci = (d) => Math.max(0, d.nufus - yaraliSayisi(d) - kahramanSayisi(d) - seferdekiIsci(d));
const ekipKahramanlari = (d, e) => e.kahraman.map((u) => kahramanBul(d, u)).filter(Boolean);

function ekipHatasi(d, s, e) {
  const n = ekipKisi(e) + (e.onder ? 1 : 0);
  if (e.isci < 0) return 'İşçi sayısı geçersiz.';
  if (n < s.ekipMin) return `Ekip en az ${s.ekipMin} kişi olmalı.`;
  if (n > s.ekipMax) return `Ekip en çok ${s.ekipMax} kişi olabilir.`;
  for (const u of e.kahraman) {
    const k = kahramanBul(d, u);
    if (!k) return 'Böyle bir kahraman yok.';
    if (kahramanSeferde(d, k)) return `${k.ad} zaten seferde.`;
    if (k.yarali > 0) return `${k.ad} yaralı (${k.yarali} gün).`;
  }
  if (e.isci > bosIsci(d)) return `Gönderilebilecek sağlıklı işçi: ${bosIsci(d)}.`;
  if (e.onder) {
    if (onderSeferde(d)) return 'Önder zaten seferde.';
    if (d.onder.yaraliKalan > 0) return 'Önder yaralı.';
  }
  // Ölüm sarmalı koruması: köyde (seferdekiler hariç) en az NUFUS_MIN kişi kalır.
  if (d.nufus - seferdekiKisi(d) - ekipKisi(e) < NUFUS_MIN) return 'Köyde en az iki kişi kalmalı.';
  return null;
}

// Ekip gücü (§2.2): işçi × 1 (Taş+: stokta alet varsa en çok 2 işçi × 1,5) + önder 2 (+1 Mızrak Ucu) + Σ kahraman.
export function ekipGucu(d, s, ekip) {
  const e = ekipNormal(ekip);
  const kalemler = [];
  if (e.isci) {
    const aletli = cagSira(d.cag) >= cagSira(SEFER_ALET.cag) ? Math.min(e.isci, SEFER_ALET.enCok, Math.floor(d.kaynaklar.alet || 0)) : 0;
    kalemler.push({ id: 'isci', ad: `İşçi ×${e.isci}`, deger: (e.isci - aletli) * SEFER_ISCI_GUC + aletli * SEFER_ALET.guc });
  }
  if (e.onder) {
    let g = SEFER_ONDER_GUC;
    for (const x of bulusEtkileri(d, 'savunma')) if (x.hedef === 'onder') g += x.deger;
    kalemler.push({ id: 'onder', ad: 'Önder', deger: g });
  }
  for (const k of ekipKahramanlari(d, e)) kalemler.push({ id: `kahraman:${k.uid}`, ad: `${k.ad} (${SINIF[k.sinif].ad} Sv${k.seviye})`, deger: kahramanGucu(k, s) });
  return { toplam: Math.round(kalemler.reduce((a, x) => a + x.deger, 0) * 100) / 100, kalemler };
}

// Sonuç olasılıkları (saf, kesin): r' = r × (a + b u), u ~ U[0,1). P(r' ≥ e) = 1 − clamp((e/r − a)/b, 0, 1).
export function seferOlasiliklari(r) {
  const [a, b] = SEFER_SANS;
  const ust = (e) => (r <= 0 ? 0 : 1 - sinirla((e / r - a) / b, 0, 1));
  const pB = ust(SEFER_ESIK.buyuk), pS = ust(SEFER_ESIK.basari), pK = ust(SEFER_ESIK.kismi);
  return { buyuk: pB, basari: pS - pB, kismi: pK - pS, basarisiz: 1 - pK };
}
export function sonucBelirle(rSansli) {
  if (rSansli >= SEFER_ESIK.buyuk) return 'buyuk';
  if (rSansli >= SEFER_ESIK.basari) return 'basari';
  if (rSansli >= SEFER_ESIK.kismi) return 'kismi';
  return 'basarisiz';
}

// Süre: hedefsiz sabit / işaret ve komşu merkezden Manhattan; Kaşif Yol Bilgisi ve Eski Harita −1 (en az 2); kış +1.
function seferSuresi(d, s, x, y, kahramanlar) {
  let t;
  if (typeof s.sure === 'number') t = s.sure;
  else if (x === null) t = SEFER_KESIF_SURE;
  else { const m = manhattan(d, x, y); t = SEFER_MESAFE.find(([u]) => m <= u)[1]; }
  const az = yetenekToplam(kahramanlar, 'sureAz') > 0 ? 1 : 0;
  const harita = kahramanlar.some((k) => esyaEtki(k, 'sureAz') > 0) ? 1 : 0;
  t = Math.max(SEFER_SURE_MIN, t - az - harita);
  return t + mevsimSefer(d).sure;
}
function kisZorluk(d, kahramanlar) {
  const z = mevsimSefer(d).zorluk;
  if (!z) return 0;
  return kahramanlar.some((k) => esyaEtki(k, 'kisCeza') === false || ESYA[k.esya?.giysi]?.etki?.kisCeza === false) ? 0 : z;
}

// Önizleme (arayüz; saf). Dönüş: { uygun, hata, guc, kalemler, zorluk, oran, olasiliklar, sure, erzak, odul, xp,
//   savunmaOnce, savunmaSonra, uyari }.
export function seferOnizleme(d, seferId, hedefId = null, ekip = {}) {
  const s = SEFER[seferId];
  const e = ekipNormal(ekip);
  let hata = seferAcikHatasi(d, s);
  if (hata) return { uygun: false, hata };
  if (olayKilitli(d)) hata = OLAY_KILIDI;
  const h = hedefCoz(d, s, hedefId);
  if (h.hata) return { uygun: false, hata: h.hata };
  const ks = ekipKahramanlari(d, e);
  const g = ekipGucu(d, s, e);
  const zorluk = h.zorluk + kisZorluk(d, ks);
  const oran = zorluk > 0 ? g.toplam / zorluk : 0;
  const sure = seferSuresi(d, s, h.x, h.y, ks);
  const kisi = ekipKisi(e) + (e.onder ? 1 : 0);
  const erzak = Math.ceil(kisi * sure * SEFER_ERZAK * mevsimSefer(d).erzak - 1e-9);
  if (!hata && aktifSeferler(d).length >= (SEFER_MAX[d.cag] ?? 1)) hata = `Aynı anda en çok ${SEFER_MAX[d.cag] ?? 1} sefer olabilir.`;
  if (!hata) hata = ekipHatasi(d, s, e);
  if (!hata && (d.kaynaklar.yiyecek || 0) + 1e-9 < erzak) hata = `Erzak için ${erzak} yiyecek gerekir.`;
  const savunmaOnce = savunmaHesapla(d);
  const sonra = seferBaslat(kopya(d), s, h, e, { sure, erzak, guc: g.toplam, zorluk });
  const a = d.tehdit?.aktif;
  const uyari = a && a.kalan <= sure ? `Ekip dönmeden tehdit gelir (${a.kalan} gün).` : null;
  return {
    uygun: !hata, hata, sefer: s.id, ad: s.ad, guc: g.toplam, kalemler: g.kalemler, zorluk, oran: Math.round(oran * 100) / 100,
    olasiliklar: seferOlasiliklari(oran), sure, erzak, odul: odulTahmini(d, s, h), xp: zorluk * 2,
    savunmaOnce, savunmaSonra: savunmaHesapla(sonra), uyari,
  };
}
function odulTahmini(d, s, h) {
  const c = olcek(d);
  const kaynak = Object.fromEntries(Object.entries(s.odul?.kaynak || {}).map(([r, m]) => [r, Math.round(m * c)]));
  if (s.odul?.ozel?.ganimet && h.komsu) Object.assign(kaynak, ganimetTabani(d, h.komsu));
  return { kaynak, bp: s.odul?.bp || 0 };
}

// Kopya üstünde: seferi başlatır (doğrulama çağıranda).
function seferBaslat(d, s, h, e, { sure, erzak, guc, zorluk }) {
  kaynakUygula(d, { yiyecek: -erzak });
  d.sefer.sayac += 1;
  const uid = `s${d.sefer.sayac}`;
  d.sefer.aktif = [...d.sefer.aktif, { uid, tur: s.id, hedef: h.isaret?.uid ?? h.komsu?.id ?? null, x: h.x, y: h.y, kalan: sure, sure,
    ekip: { kahraman: [...e.kahraman], isci: e.isci, onder: e.onder }, guc, zorluk, erzak, gonderimTuru: d.tur, olay: null,
    olayEtki: {}, olayOldu: false }];
  return d;
}

// ---------- Komutlar ----------
export function seferGonder(durum, seferId, hedefId = null, ekip = {}) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const o = seferOnizleme(durum, seferId, hedefId, ekip);
  if (!o.uygun) return hataDon(durum, o.hata);
  const s = SEFER[seferId];
  const d = kopya(durum);
  const h = hedefCoz(d, s, hedefId);
  seferBaslat(d, s, h, ekipNormal(ekip), o);
  d.sefer.istatistik.gonderilen += 1;
  const bildirimler = [];
  bildir(bildirimler, 'sefer_gonderildi', `${s.ad} yola çıktı (${o.sure} gün, erzak ${o.erzak} yiyecek).`, 'bilgi',
    { sefer: d.sefer.aktif.at(-1).uid, tur: s.id, sure: o.sure });
  return { durum: d, bildirimler, uid: d.sefer.aktif.at(-1).uid };
}

// Gönderildiği tur içinde geri çağırma: erzakın yarısı iade, sonuç yok.
export function seferGeriCagir(durum, uid) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const sf = aktifSeferler(durum).find((s) => s.uid === uid);
  if (!sf) return hataDon(durum, 'Böyle bir sefer yok.');
  if (sf.gonderimTuru !== durum.tur) return hataDon(durum, 'Ekip yola çıktı; artık geri çağrılamaz.');
  const d = kopya(durum);
  d.sefer.aktif = d.sefer.aktif.filter((s) => s.uid !== uid);
  d.sefer.istatistik.gonderilen = Math.max(0, d.sefer.istatistik.gonderilen - 1);
  kaynakUygula(d, { yiyecek: Math.floor(sf.erzak / 2) });
  return { durum: d };
}

// Yoldaki sefer olayının seçimi (çözülmezse dönüşte 0. seçenek).
export function seferOlayCoz(durum, uid, secenek) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const sf = aktifSeferler(durum).find((s) => s.uid === uid);
  if (!sf?.olay) return hataDon(durum, 'Bu seferde bekleyen olay yok.');
  const o = SEFER_OLAY_TANIM[sf.olay.id];
  if (!o.secenekler[secenek]) return hataDon(durum, 'Böyle bir seçenek yok.');
  const d = kopya(durum);
  olayEtkisiUygula(d.sefer.aktif.find((s) => s.uid === uid), o.secenekler[secenek].seferEtki);
  return { durum: d };
}
function olayEtkisiUygula(sf, etki = {}) {
  sf.olay = null;
  sf.olayEtki = { ...sf.olayEtki, ...etki };
  if (etki.sureEk) { sf.kalan += etki.sureEk; sf.sure += etki.sureEk; }
}

// ---------- Adım m3 (tehditten sonra, olaydan önce) ----------
export function adimSefer(durum, bildirimler = []) {
  if (!durum.sefer) return durum;
  const d = kopya(durum);
  adimKahraman(d, bildirimler);
  if (onderSeferde(d)) d.onder.yorgunluk = Math.min(YORGUNLUK_MAX, d.onder.yorgunluk + 1);
  const st = sonTur(d);
  const olayOlabilir = takvim(d.tur + 1).gun >= ILK_OLAY_TUR && !d.olay?.aktif && !st.tehditVaris;
  for (const sf of [...d.sefer.aktif]) {
    sf.kalan -= 1;
    if (sf.kalan <= 0 && sf.olay) olayEtkisiUygula(sf, SEFER_OLAY_TANIM[sf.olay.id].secenekler[0].seferEtki);
    if (sf.kalan <= 0) { seferSonuclandir(d, sf, bildirimler); continue; }
    if (olayOlabilir && !st.seferOlayi && !sf.olayOldu && sz(d) < SEFER_OLAY) {
      const o = SEFER_OLAYLARI[Math.floor(sz(d) * SEFER_OLAYLARI.length)];
      sf.olay = { id: o.id };
      sf.olayOldu = true;
      st.seferOlayi = true;
      bildir(bildirimler, 'sefer_olay', `${SEFER[sf.tur].ad}: ${o.ad}. ${o.metin}`, 'uyari', { sefer: sf.uid, olay: o.id,
        secenekler: o.secenekler.map((x) => x.metin) });
    }
  }
  // Keşfet eylemi: ek işaret şansı (Kaşif ile daha yüksek).
  if (st.eylem === 'kesfet' && !sarmalda(d)) {
    const p = (d.kahramanlar || []).some((k) => k.sinif === 'kasif') ? ISARET_KESFET.kasif : ISARET_KESFET.taban;
    if (sz(d) < p) isaretDogur(d, bildirimler);
  }
  return d;
}

const kaynakMetni = (m) => Object.entries(m).filter(([, x]) => x >= 0.5).map(([r, x]) => `${Math.round(x)} ${KAYNAK[r]?.ad ?? r}`).join(', ');

function ganimetTabani(d, k) {
  const g = komsuGucu(d, k) * BASKIN.tavan;
  const ikinci = ['metal', 'alet', 'deri'].find((r) => kaynakAcik(d, r)) || 'deri';
  return { yiyecek: Math.round(g), [ikinci]: Math.round(g / 2) };
}

// Kopya üstünde: sefer sonucu, ödül, XP, yaralı; sefer listeden çıkar.
function seferSonuclandir(d, sf, bildirimler) {
  const s = SEFER[sf.tur];
  d.sefer.aktif = d.sefer.aktif.filter((x) => x.uid !== sf.uid);
  const ks = sf.ekip.kahraman.map((u) => kahramanBul(d, u)).filter(Boolean);
  const r = sf.zorluk > 0 ? sf.guc / sf.zorluk : 0;
  const u = sz(d);
  const rs = r * (SEFER_SANS[0] + SEFER_SANS[1] * u);
  const sonuc = sonucBelirle(rs);
  const SC = SEFER_SONUC[sonuc];
  const basarili = sonuc === 'buyuk' || sonuc === 'basari';
  d.sefer.istatistik[sonuc] += 1;
  const m = mevsimSefer(d);
  let carpan = SC.odul * m.odul * (sf.olayEtki?.odulCarpan || 1);
  if (s.etiket === 'av') carpan *= m.avOdul * (1 + yetenekToplam(ks, 'avOdul'));
  const kazanc = {};
  const ekle = (delta) => { for (const [r2, x] of Object.entries(kaynakUygula(d, delta))) kazanc[r2] = (kazanc[r2] || 0) + x; };
  const notlar = [];
  if (carpan > 0 && s.odul?.kaynak) ekle(Object.fromEntries(Object.entries(s.odul.kaynak).map(([r2, x]) => [r2, x * carpan * olcek(d)])));
  const bp = (s.odul?.bp || 0) * SC.odul;
  if (bp) bilgiEkle(d, bp);
  const oz = s.odul?.ozel || {};
  const isaret = sf.hedef ? isaretBul(d, sf.hedef) : null;

  if (s.id === 'kesif' && sonuc !== 'basarisiz') {
    const yar = Math.round((oz.kesifYaricap + yetenekToplam(ks, 'kesifYaricap')) * (sonuc === 'kismi' ? 0.5 : 1));
    const k = haritaKesfiUygula(d, yar);
    notlar.push(`${k.acilan} karo keşfedildi`);
    for (const b of k.bulgular || []) bildir(bildirimler, 'kesif_bulgu', b.metin, 'iyi', { karo: b.karo, x: b.x, y: b.y });
    const pI = yetenekVar(ks, 'kesifIsaret') ? 1 : oz.isaretOlasilik * (sonuc === 'buyuk' ? 1.5 : 1);
    if (sz(d) < pI) isaretDogur(d, bildirimler, { kesif: true });
    if (sz(d) < oz.kaynakOlasilik) ekle(Object.fromEntries(Object.entries(oz.kaynak).map(([r2, x]) => [r2, x * carpan * olcek(d)])));
    if (oz.komsuBul && basarili) komsuKesfet(d, bildirimler, { neden: 'sefer' });
  }
  if (s.id === 'ayi_avi') {
    if (sonuc === 'buyuk' && oz.buyukEsya) sandigaKoy(d, oz.buyukEsya, bildirimler);
    if (basarili && s.tehditBag && d.tehdit?.aktif?.id === s.tehditBag) {
      d.tehdit = { ...d.tehdit, aktif: null };
      notlar.push('ayı tehdidi sona erdi');
    }
    if (basarili) d.sefer.ayiKacti = 0;
  }
  if (s.id === 'harabe' && basarili) harabeOdulu(d, s, sonuc, ks, sf, ekle, notlar, bildirimler);
  if (s.id === 'baskin_seferi') {
    const k = komsuBul(d, sf.hedef);
    if (k) {
      iliskiDegistir(d, k, KOMSU_ILISKI.baskin);
      d.sefer.bekleme = { ...d.sefer.bekleme, [`${s.id}:${k.id}`]: d.tur + BASKIN.bekleme };
      if (carpan > 0) ekle(Object.fromEntries(Object.entries(ganimetTabani(d, k)).map(([r2, x]) => [r2, x * SC.odul])));
      if (basarili && d.tehdit) {
        d.tehdit.gerginlik = Math.max(-50, d.tehdit.gerginlik + BASKIN.gerginlik);
        if (d.tehdit.aktif && KOMSU[k.id]?.tehditKaynak && d.tehdit.aktif.id && tehditKaynagiKomsu(d.tehdit.aktif.id)) {
          d.tehdit.aktif = null;
          notlar.push('komşunun baskını bozuldu');
        }
      }
    }
  }
  // İşaret: başarı ya da kısmide tükenir; başarısızlıkta (süresi varsa) kalır.
  if (isaret && sonuc !== 'basarisiz') d.hedefIsaretleri = d.hedefIsaretleri.filter((i) => i.uid !== isaret.uid);

  // Yaralanma (ölüm yok): Avcı Pusu (av), Şifalı Ot (1 kez, tükenir), keşif başarısızlığı yaralısız.
  let [ya, yb] = SC.yarali;
  let kahramanYarali = SC.kahramanYarali;
  if (sonuc === 'basarisiz' && !s.basarisizYarali) { ya = 0; yb = 0; kahramanYarali = 0; }
  let yarali = ya || yb ? szTam(d, ya, yb) : 0;
  if (sf.olayEtki?.yaraliOlasilik && sz(d) < sf.olayEtki.yaraliOlasilik) yarali += 1;
  if ((yarali || kahramanYarali) && s.etiket === 'av' && yetenekVar(ks, 'avYaraliYok')) { yarali = 0; kahramanYarali = 0; notlar.push('pusu sayesinde yaralı yok'); }
  const koruyan = ks.find((k) => esyaEtki(k, 'yaraliKoru'));
  if ((yarali || kahramanYarali) && koruyan) {
    yarali = 0; kahramanYarali = 0;
    const yuva = Object.keys(koruyan.esya).find((y) => ESYA[koruyan.esya[y]]?.etki?.yaraliKoru);
    notlar.push(`${ESYA[koruyan.esya[yuva]].ad} yaraları sardı (tükendi)`);
    koruyan.esya[yuva] = null;
  }
  const isciYarali = Math.min(yarali, sf.ekip.isci);
  if (isciYarali > 0) {
    degistiriciEkle(d, { id: 'yarali', sure: SEFER_ISCI_YARALI_SURE, etki: { yaraliIsci: isciYarali } });
    d.sefer.istatistik.yaraliIsci += isciYarali;
  }
  // İşçisi olmayan ekipte yaralanma kahramana düşer.
  const kahramanaDusen = yarali > isciYarali ? SEFER_ISCI_YARALI_SURE : 0;
  for (const k of ks) if (kahramanYarali || kahramanaDusen) kahramanYarala(d, k, Math.max(kahramanYarali, kahramanaDusen), bildirimler);
  // XP: zorluk × 2 × sonuç çarpanı (+ Kurt Dişi).
  const xp = sf.zorluk * 2 * SC.xp;
  for (const k of ks) xpEkle(d, k, xp, bildirimler);
  destanIlerlet(d, { tur: 'sefer', id: s.id, sonuc }, bildirimler);

  const km = kaynakMetni(kazanc);
  const ozet = { uid: sf.uid, tur: s.id, sonuc, turNo: d.tur, kazanc, bp, xp: Math.round(xp), yarali: isciYarali };
  d.sefer.son = [...(d.sefer.son || []), ozet].slice(-5);
  bildir(bildirimler, 'sefer_dondu', `${s.ad} döndü: ${SC.ad}.${km ? ` Kazanç: ${km}.` : ''}${bp ? ` +${bp} BP.` : ''}`
    + `${notlar.length ? ` (${notlar.join('; ')})` : ''}${isciYarali ? ` ${isciYarali} işçi yaralı.` : ''}`,
    basarili ? 'iyi' : sonuc === 'kismi' ? 'bilgi' : 'uyari', { sefer: sf.uid, tur: s.id, sonuc, kazanc, bp, xp: Math.round(xp), yarali: isciYarali });
}
const tehditKaynagiKomsu = (id) => ['komsu_baskini', 'yagma_seferi'].includes(id);

function harabeOdulu(d, s, sonuc, ks, sf, ekle, notlar, bildirimler) {
  const oz = s.odul.ozel;
  const tuzaksiz = d.sefer.harabe === 0 || yetenekVar(ks, 'tuzakYok');
  d.sefer.harabe += 1;
  const tablo = oz.tablo.filter((t) => !(tuzaksiz && t.id === 'tuzak'))
    .map((t) => ({ ...t, p: t.id === 'esya' ? t.p * SEFER_SONUC[sonuc].esya : t.p }));
  const top = tablo.reduce((a, t) => a + t.p, 0);
  let x = sz(d) * top;
  let secim = tablo.at(-1).id;
  for (const t of tablo) { x -= t.p; if (x < 0) { secim = t.id; break; } }
  if (secim === 'esya') {
    const id = oz.esyalar[Math.floor(sz(d) * oz.esyalar.length)];
    sandigaKoy(d, id, bildirimler);
    notlar.push(`eşya: ${ESYA[id].ad}`);
  } else if (secim === 'paket') {
    const p = oz.paket[d.cag] || {};
    ekle(Object.fromEntries(Object.entries(p).map(([r, m]) => [r, m * olcek(d)])));
  } else if (secim === 'gezgin') {
    kisiEkle(d, 1);
    const siniflar = acikSiniflar(d);
    if (!terfiHatasi(d) && siniflar.length) {
      const k = kahramanOlustur(d, siniflar[Math.floor(sz(d) * siniflar.length)].id, { seviye: szTam(d, 1, 2) });
      notlar.push(`gezgin ${k.ad} (${SINIF[k.sinif].ad}) katıldı`);
      bildir(bildirimler, 'kahraman_yeni', `Gezgin ${k.ad} kabileye katıldı (${SINIF[k.sinif].ad} Sv${k.seviye}).`, 'iyi', { kahraman: k.uid });
    } else notlar.push('bir gezgin kabileye katıldı');
  } else if (secim === 'tuzak') {
    notlar.push('tuzak!');
    sf.olayEtki = { ...sf.olayEtki, yaraliOlasilik: 1 };
  }
}

// ---------- İşaretler ----------
// Kopya üstünde: bir işaret doğurur (tür ağırlıklı; yalnız açık sefer türlerinin işaretleri). zorla: tür.
export function isaretDogur(d, bildirimler, { zorla = null } = {}) {
  if (!d.hedefIsaretleri) d.hedefIsaretleri = [];
  if (d.hedefIsaretleri.length >= (ISARET_MAX[d.cag] ?? 3)) return null;
  const turler = [...new Set(SEFERLER.filter((s) => s.isaret && !seferAcikHatasi(d, s)).map((s) => s.isaret))];
  let tur = zorla;
  if (!tur) {
    const w = (t) => (ISARET_AGIRLIK[t] || 1) * (t === 'ayi' ? yetenekEnBuyuk(d.kahramanlar || [], 'ayiIsaret') : 1);
    const top = turler.reduce((a, t) => a + w(t), 0);
    if (!(top > 0)) return null;
    let x = sz(d) * top;
    tur = turler.at(-1);
    for (const t of turler) { x -= w(t); if (x < 0) { tur = t; break; } }
  }
  const yer = isaretYeri(d);
  if (!yer) return null;
  d.sefer.sayac += 1;
  const s = SEFERLER.find((x) => x.isaret === tur);
  const i = { uid: `i${d.sefer.sayac}`, tur, x: yer.x, y: yer.y, kalan: ISARET_SURE, zorluk: s?.zorluk?.[d.cag] ?? 1 };
  d.hedefIsaretleri = [...d.hedefIsaretleri, i];
  if (tur === 'ayi') d.sefer.ilkAyi = true;
  const m = merkezNokta(d);
  const yon = yonAdi(i.x + 0.5 - m.x, i.y + 0.5 - m.y);
  bildir(bildirimler, 'sefer_isaret', tur === 'ayi' ? `${yon} bir ayı görüldü! (🐻 ${ISARET_SURE} gün)` : `${yon} yeni bir hedef: ${ISARET_AD[tur]}.`,
    tur === 'ayi' ? 'uyari' : 'iyi', { isaret: i.uid, tur, x: i.x, y: i.y });
  return i;
}
function isaretYeri(d) {
  const m = merkezNokta(d);
  const [a, b] = ISARET_MESAFE;
  const dolu = izgara(d);
  const n = d.harita.boyut;
  const tutulan = new Set((d.hedefIsaretleri || []).map((i) => `${i.x},${i.y}`));
  const aday = [];
  for (let y = Math.floor(m.y - b); y <= m.y + b; y++) for (let x = Math.floor(m.x - b); x <= m.x + b; x++) {
    if (!icinde(n, x, y)) continue;
    const u = Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
    if (u < a || u > b || dolu[y * n + x] || tutulan.has(`${x},${y}`)) continue;
    if (!KARO[karoAt(d, x, y)]?.gecilir || !kesifli(d, x, y)) continue;
    aday.push({ x, y });
  }
  if (!aday.length) return null;
  return aday[Math.floor(sz(d) * aday.length)];
}

// Adım o2 (takvimden sonra): işaret süreleri, kaybolan ayı cezası, mevsim başı işaretleri, ilk ayı garantisi.
export function adimIsaret(durum, bildirimler = []) {
  if (!durum.sefer) return durum;
  const d = kopya(durum);
  if (d.sefer.ayiKacti > 0) d.sefer.ayiKacti -= 1;
  const kalan = [];
  for (const i of d.hedefIsaretleri || []) {
    if (!isaretRezerve(d, i.uid)) i.kalan -= 1;
    if (i.kalan > 0) { kalan.push(i); continue; }
    bildir(bildirimler, 'sefer_isaret_kayboldu', `${ISARET_AD[i.tur]} kayboldu.`, 'bilgi', { isaret: i.uid, tur: i.tur });
    if (i.tur === 'ayi') {
      d.sefer.ayiKacti = AYI_KACTI.sure;
      if (d.tehdit && !d.tehdit.aktif) d.tehdit.gerginlik = Math.min(TEHDIT_DOGUM_ESIK, d.tehdit.gerginlik + AYI_KACTI.gerginlik);
    }
  }
  d.hedefIsaretleri = kalan;
  const gun = d.tur + 1;
  if (!d.sefer.ilkAyi && gun >= ILK_AYI_GUN[0] && gun <= ILK_AYI_GUN[1]) {
    if (sz(d) < 1 / (ILK_AYI_GUN[1] - gun + 1)) isaretDogur(d, bildirimler, { zorla: 'ayi' });
  }
  if (d.tur % MEVSIM_TUR === 0 && d.tur > 0 && ISARET_MEVSIM.includes(takvim(d.tur).mevsim) && !sarmalda(d)) {
    const adet = 1 + (yetenekToplam(d.kahramanlar || [], 'isaretEk') > 0 ? 1 : 0);
    for (let k = 0; k < adet; k++) isaretDogur(d, bildirimler);
  }
  return d;
}

// ---------- Arayüz okuması ----------
export function seferGorunumu(d) {
  const st = d.sefer || seferVarsayilan(d.tohum);
  return {
    aktif: st.aktif.map((sf) => ({ uid: sf.uid, tur: sf.tur, ad: SEFER[sf.tur].ad, kalan: sf.kalan, sure: sf.sure, hedef: sf.hedef,
      x: sf.x, y: sf.y, ekip: { ...sf.ekip, kahraman: sf.ekip.kahraman.map((u) => ({ uid: u, ad: kahramanBul(d, u)?.ad })) },
      olasiliklar: seferOlasiliklari(sf.zorluk > 0 ? sf.guc / sf.zorluk : 0), geriCagrilir: sf.gonderimTuru === d.tur,
      olay: sf.olay ? { id: sf.olay.id, ad: SEFER_OLAY_TANIM[sf.olay.id].ad, metin: SEFER_OLAY_TANIM[sf.olay.id].metin,
        secenekler: SEFER_OLAY_TANIM[sf.olay.id].secenekler.map((x) => x.metin) } : null })),
    isaretler: (d.hedefIsaretleri || []).map((i) => ({ ...i, ad: ISARET_AD[i.tur], rezerve: isaretRezerve(d, i.uid),
      seferler: SEFERLER.filter((s) => s.isaret === i.tur && !seferAcikHatasi(d, s)).map((s) => s.id) })),
    turler: SEFERLER.filter((s) => s.acik).map((s) => ({ id: s.id, ad: s.ad, metin: s.metin, hedef: s.hedef, isaret: s.isaret,
      acik: !seferAcikHatasi(d, s), hata: seferAcikHatasi(d, s) })),
    enCok: SEFER_MAX[d.cag] ?? 1, bosIsci: bosIsci(d), onderUygun: !onderSeferde(d) && !(d.onder.yaraliKalan > 0),
    kahramanlar: (d.kahramanlar || []).map((k) => ({ uid: k.uid, ad: k.ad, uygun: !k.yarali && !kahramanSeferde(d, k) })),
    son: [...(st.son || [])], istatistik: { ...st.istatistik },
  };
}

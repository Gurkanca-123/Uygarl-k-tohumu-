// Çekirdek ortak yardımcıları: tablo aramaları, bina durumu, iş gücü, depo, kaynak, buluş etkileri, RNG, bildirim.
// Saf; DOM/Three.js bilmez. "…Uygula/…Ekle/…Duzelt" adlı fonksiyonlar ÇAĞIRANIN KOPYASINI değiştirir (adım fonksiyonları
// girdiyi önce `kopya` ile kopyalar, dışarıya karşı saf kalır).
import { CAGLAR } from '../data/caglar.js';
import { BINALAR } from '../data/binalar.js';
import { BULUSLAR } from '../data/buluslar.js';
import { OLAYLAR } from '../data/olaylar.js';
import { EYLEMLER } from '../data/eylemler.js';
import { KAYNAKLAR } from '../data/kaynaklar.js';
import { KAROLAR } from '../data/karolar.js';
import { MEVSIMLER } from '../data/mevsimler.js';
import {
  SEVIYE_CARPAN, SEVIYE_ETKI, SEVIYE_ISCI_EK, SEVIYE_KAPASITE_EK, SERBEST_ISLER, YENI_KISI_ISI,
} from '../data/denge.js';
import { SIKLIK, SIKLIK_VARSAYILAN } from '../data/denge.js';
import { takvim } from './takvim.js';
import { rngSonraki } from './rng.js';

const sozluk = (t) => Object.fromEntries(t.map((x) => [x.id, x]));
export const BINA = sozluk(BINALAR);
export const CAG = sozluk(CAGLAR);
export const BULUS = sozluk(BULUSLAR);
export const OLAY = sozluk(OLAYLAR);
export const EYLEM = sozluk(EYLEMLER);
export const KAYNAK = sozluk(KAYNAKLAR);
export const KARO = sozluk(KAROLAR);
export const KARO_KOD = Object.fromEntries(KAROLAR.map((k) => [k.kod, k]));
export const SERBEST = sozluk(SERBEST_ISLER);
export const SERBEST_ONEK = 'serbest:';

export const kopya = (x) => structuredClone(x);
export const sinirla = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- Çağ / takvim ----------
export const cagSira = (cagId) => CAG[cagId].sira;
export const mevcutCag = (d) => CAG[d.cag];
export const mevsimTanim = (tur) => MEVSIMLER[takvim(tur).mevsimSira];
export const cagAcik = (d, cagId) => cagSira(cagId) <= cagSira(d.cag);
export const kaynakAcik = (d, kaynakId) => !!KAYNAK[kaynakId] && cagAcik(d, KAYNAK[kaynakId].cag);

// ---------- Bildirim ----------
// { kod, seviye: 'bilgi'|'uyari'|'iyi', metin, ...ek }
export function bildir(bildirimler, kod, metin, seviye = 'bilgi', ek = {}) {
  if (bildirimler) bildirimler.push({ kod, seviye, metin, ...ek });
}

// Bu turun geçici kayıtları (bakım kapalıları, açlık, ısınma, üretim özeti). Kayda girer (istatistik serbest sözlük),
// böylece oyuncu evresindeki hesaplar (savunma vb.) ve kayıt-yükle sonrası aynı sonucu verir.
export function sonTur(d) {
  if (!d.istatistik) d.istatistik = {};
  if (!d.istatistik.sonTur) d.istatistik.sonTur = yeniSonTur(d.tur);
  return d.istatistik.sonTur;
}
export function yeniSonTur(tur) {
  return { tur, kapali: [], kapaliDegistirici: [], aclik: false, isinmaEksik: false, olumAdayi: 0,
    uretim: {}, tuketim: {}, kirpilan: {}, bilgi: 0, eylem: null };
}

// ---------- RNG (kopya üstünde) ----------
export function zar(d) {
  const r = rngSonraki(d.rng);
  d.rng = r.rng;
  return r.deger;
}
export function zarAgirlikli(d, ogeler, agirlikFn) {
  const toplam = ogeler.reduce((a, o) => a + Math.max(0, agirlikFn(o)), 0);
  const deger = zar(d);
  if (!(toplam > 0)) return null;
  let esik = deger * toplam;
  for (const o of ogeler) {
    esik -= Math.max(0, agirlikFn(o));
    if (esik < 0) return o;
  }
  return ogeler[ogeler.length - 1];
}

// ---------- Bina durumu ----------
// insaatSirasi girdileri: '<uid>' (yeni inşaat) · 'yukselt:<uid>' · 'onar:<uid>'.
export const binaBul = (d, uid) => d.binalar.find((b) => b.uid === uid);
export const binaKurulu = (d, b) => !d.insaatSirasi.includes(b.uid);
export function binaIsi(d, b) {
  if (d.insaatSirasi.includes(b.uid)) return 'insa';
  if (d.insaatSirasi.includes(`yukselt:${b.uid}`)) return 'yukselt';
  if (d.insaatSirasi.includes(`onar:${b.uid}`)) return 'onar';
  return null;
}
// Çalışır = kurulu, hasarsız ve bu turun bakımı ödenmiş (§1.2 c, §3.2).
export function binaCalisir(d, b) {
  if (!binaKurulu(d, b) || b.hasarli) return false;
  const kapali = d.istatistik?.sonTur?.kapali;
  return !(kapali && kapali.includes(b.uid));
}
export const calisanBinalar = (d) => d.binalar.filter((b) => binaCalisir(d, b));
export const kuruluSayisi = (d, id) => d.binalar.filter((b) => b.id === id && binaKurulu(d, b)).length;
export const seviyeCarpani = (b) => SEVIYE_CARPAN[b.seviye - 1] ?? 1;
export const seviyeEtki = (b) => SEVIYE_ETKI[b.seviye - 1] ?? 1;
export function isciYuvasi(b) {
  const t = BINA[b.id];
  return t.isci > 0 ? t.isci + (SEVIYE_ISCI_EK[b.seviye - 1] ?? 0) : 0;
}
export const merkezBina = (d) => d.binalar.find((b) => BINA[b.id].tur === 'merkez');

// ---------- İş gücü ----------
export const serbestAnahtar = (isId) => SERBEST_ONEK + isId;
export const atamaToplam = (d) => Object.values(d.atama).reduce((a, n) => a + n, 0);

// Değiştiricilerden yaralı (çalışamayan) kişi sayısı.
export function yaraliSayisi(d) {
  const n = d.degistiriciler.reduce((a, m) => a + (m.etki?.yaraliIsci || 0), 0);
  return Math.min(d.nufus, n);
}

// ---------- Sefer / kahraman (docs/AKSIYON.md §2.1, §3.1) ----------
// Seferdeki işçi, kahraman ve önder köyde üretmez, yemek yemez, savunmaya sayılmaz. Kahramanlar nüfusa sayılır ama işçi yuvasına
// girmez (görev yeri ayrı). Eski kayıt / test durumlarında alanlar yoksa boş sayılır.
export const aktifSeferler = (d) => d.sefer?.aktif || [];

// Görev sıklığı profili (denge.js SIKLIK). sec = { siklik: 'az'|'normal'|'cok' } (Ayarlar → turIlerlet parametresi); yoksa varsayılan.
export const siklikProfil = (sec) => SIKLIK[sec?.siklik] || SIKLIK[SIKLIK_VARSAYILAN];
// Oyuncudan karar bekleyen teklif/kart/olay sayısı: ilk kahraman teklifi, seçilmemiş mevsim görev kartı, yanıt bekleyen komşu
// teklifi, seçim bekleyen sefer olayı. Yeni karar öğeleri yalnız 0 iken çıkar ("aynı anda en çok 1 bekleyen karar").
export function bekleyenKararSayisi(d) {
  return (d.kahramanDurum?.teklif ? 1 : 0)
    + (d.hedef?.kartlar?.length > 0 && !d.hedef?.gorev ? 1 : 0)
    + (d.komsular || []).filter((k) => k.niyet && !k.niyet.kullanildi && ['harac', 'ittifak', 'ticaret'].includes(k.niyet.tur)).length
    + aktifSeferler(d).filter((s) => s.olay).length;
}
export const seferdekiIsci = (d) => aktifSeferler(d).reduce((a, s) => a + (s.ekip?.isci || 0), 0);
export const seferdekiKahramanUid = (d) => new Set(aktifSeferler(d).flatMap((s) => s.ekip?.kahraman || []));
export const seferdekiKisi = (d) => seferdekiIsci(d) + seferdekiKahramanUid(d).size;
export const onderSeferde = (d) => aktifSeferler(d).some((s) => s.ekip?.onder);
export const kahramanSayisi = (d) => (d.kahramanlar || []).length;
export const koydekiKahramanlar = (d) => { const s = seferdekiKahramanUid(d); return (d.kahramanlar || []).filter((k) => !s.has(k.uid)); };
// İşçi yuvasına girmeyen kişi: kahramanlar (köyde ya da seferde) + seferdeki işçiler.
export const calisamayanSayisi = (d) => kahramanSayisi(d) + seferdekiIsci(d);

// Yuva sırası: binalar (inşa sırası), sonra serbest işler (tablo sırası). Fazlalık sondan kırpılır.
function yuvaSirasi(d) {
  const s = d.binalar.map((b) => b.uid).filter((u) => d.atama[u] > 0);
  for (const i of SERBEST_ISLER) if (d.atama[serbestAnahtar(i.id)] > 0) s.push(serbestAnahtar(i.id));
  return s;
}

// Fiilen çalışan atama (yaralılar çıkarılmış). Durumu değiştirmez.
export function etkinAtama(d) {
  let bos = Math.max(0, d.nufus - yaraliSayisi(d) - calisamayanSayisi(d));
  const sonuc = {};
  for (const k of yuvaSirasi(d)) {
    const n = Math.min(d.atama[k], bos);
    sonuc[k] = n;
    bos -= n;
  }
  return sonuc;
}
export function issizSayisi(d) {
  const calisan = Object.values(etkinAtama(d)).reduce((a, n) => a + n, 0);
  return Math.max(0, d.nufus - yaraliSayisi(d) - calisamayanSayisi(d) - calisan);
}
export const binaIscisi = (d, b) => etkinAtama(d)[b.uid] || 0;

// Kopya üstünde: geçersiz anahtarları siler, Σ atama ≤ nüfus olacak şekilde sondan kırpar (işsizler önce düşer).
export function atamaDuzelt(d) {
  const temiz = {};
  for (const [k, n] of Object.entries(d.atama)) {
    if (!(n > 0)) continue;
    if (k.startsWith(SERBEST_ONEK) ? SERBEST[k.slice(SERBEST_ONEK.length)] : binaBul(d, k)) temiz[k] = n;
  }
  d.atama = temiz;
  let fazla = atamaToplam(d) - d.nufus;
  const sira = yuvaSirasi(d).reverse();
  for (const k of sira) {
    if (fazla <= 0) break;
    const az = Math.min(fazla, d.atama[k]);
    d.atama[k] -= az;
    fazla -= az;
    if (d.atama[k] === 0) delete d.atama[k];
  }
}

// Kopya üstünde: yeni kişiler §2.5 gereği Toplayıcı'ya yazılır.
export function kisiEkle(d, n) {
  if (!(n > 0)) return;
  d.nufus += n;
  const k = serbestAnahtar(YENI_KISI_ISI);
  d.atama[k] = (d.atama[k] || 0) + n;
}

// ---------- Barınma ----------
// TODO(tasarim): hasarlı konut barınak verir mi yazılmamış → vermez varsayıldı (Fırtına b seçeneği gerçek bir ceza olsun).
export function barinmaKapasitesi(d) {
  let k = 0;
  for (const b of d.binalar) {
    const t = BINA[b.id];
    if (t.tur !== 'konut' || !binaKurulu(d, b) || b.hasarli) continue;
    k += (t.kapasite || 0) + (SEVIYE_KAPASITE_EK[b.seviye - 1] ?? 0);
  }
  return k;
}
export const evsizSayisi = (d) => Math.max(0, d.nufus - barinmaKapasitesi(d));

// ---------- Buluş etkileri ----------
export function bulusEtkileri(d, tur) {
  const sonuc = [];
  for (const id of d.buluslar) for (const e of BULUS[id]?.etkiler || []) if (e.tur === tur) sonuc.push(e);
  return sonuc;
}
export function depoCarpaniBulus(d, binaId) {
  return bulusEtkileri(d, 'depoCarpani').filter((e) => e.hedef === `bina:${binaId}`).reduce((a, e) => a * e.deger, 1);
}

// ---------- Depo / kaynak ----------
export function depoTavani(d, kaynakId) {
  let t = mevcutCag(d).depoTavani;
  for (const b of d.binalar) {
    const tanim = BINA[b.id];
    if (!tanim.depo[kaynakId] || !binaKurulu(d, b)) continue;
    t += tanim.depo[kaynakId] * seviyeEtki(b) * depoCarpaniBulus(d, b.id);
  }
  return t;
}

// Kopya üstünde kaynak değişimi. Eksi değer stokta olandan fazla düşmez (§6.1). `kirp` ise artı değer depo tavanında durur.
// Dönüş: fiilen uygulanan değişim.
export function kaynakUygula(d, delta, { kirp = true, carpan = 1 } = {}) {
  const uygulanan = {};
  for (const [r, ham] of Object.entries(delta || {})) {
    const m = ham * carpan;
    const eski = d.kaynaklar[r] || 0;
    let yeni = eski + m;
    if (m < 0) yeni = Math.max(0, yeni);
    if (m > 0 && kirp) yeni = Math.min(yeni, Math.max(eski, depoTavani(d, r)));
    d.kaynaklar[r] = yeni;
    uygulanan[r] = yeni - eski;
  }
  return uygulanan;
}
export function kaynakYeter(d, miktar, carpan = 1) {
  return Object.entries(miktar || {}).every(([r, m]) => (d.kaynaklar[r] || 0) + 1e-9 >= m * carpan);
}
export function eksikMetni(d, miktar, carpan = 1) {
  return Object.entries(miktar || {})
    .filter(([r, m]) => (d.kaynaklar[r] || 0) + 1e-9 < m * carpan)
    .map(([r, m]) => `${KAYNAK[r]?.ad ?? r} ${Math.ceil(m * carpan - (d.kaynaklar[r] || 0))}`)
    .join(', ');
}

// ---------- Değiştiriciler ----------
// Bakımı ödenmemiş değiştiriciler (Lonca ayrıcalığı) bu tur etkisizdir.
export function etkinDegistiriciler(d) {
  const kapali = d.istatistik?.sonTur?.kapaliDegistirici || [];
  return d.degistiriciler.filter((m) => !kapali.includes(m.id));
}
// Aynı id'li değiştirici yenilenir; `yarali` üst üste biner.
export function degistiriciEkle(d, { id, sure, etki }) {
  const m = { id, kalan: sure ?? null, etki: kopya(etki || {}) };
  if (id !== 'yarali') d.degistiriciler = d.degistiriciler.filter((x) => x.id !== id);
  d.degistiriciler.push(m);
}

// Oyuncu komutları: bekleyen olay varsa diğer düğmeler kilitli (§1.1).
export const OLAY_KILIDI = 'Önce bekleyen olayı çöz.';
export const olayKilitli = (d) => !!d.olay.aktif;

// Komut dönüşü yardımcıları
export const hataDon = (durum, hata) => ({ durum, hata });

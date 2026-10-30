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
  SEVIYE_CARPAN, SEVIYE_ETKI, SEVIYE_ISCI_EK, SEVIYE_KAPASITE_EK, SERBEST_ISLER, YENI_KISI_ISI, COCUK_SURE, YETISKIN_YAS,
} from '../data/denge.js';
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
// insaatSirasi girdileri: '<uid>' (yeni inşaat) · 'yukselt:<uid>' · 'onar:<uid>' · 'evrim:<uid>' (eski bina çalışmaya devam eder; ayrıntı d.istatistik.evrim[uid]).
export const binaBul = (d, uid) => d.binalar.find((b) => b.uid === uid);
export const binaKurulu = (d, b) => !d.insaatSirasi.includes(b.uid);
export function binaIsi(d, b) {
  if (d.insaatSirasi.includes(b.uid)) return 'insa';
  if (d.insaatSirasi.includes(`yukselt:${b.uid}`)) return 'yukselt';
  if (d.insaatSirasi.includes(`onar:${b.uid}`)) return 'onar';
  if (d.insaatSirasi.includes(`evrim:${b.uid}`)) return 'evrim';
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

// ---------- Halk defteri (çocuklar) ----------
// d.halk = [{ id, dogum }] kayıtlı vatandaşlar (başlangıç, doğanlar, göçmenler). Defter nüfustan KISA olabilir (eski kayıt, test kurulumu):
// kayıtsız kişiler yetişkin sayılır. Sayaçlar (nufus, atama) yetkili kalır; defter yalnız yaş/kimlik ekler.
export const yas = (d, h) => d.tur - h.dogum;
export const cocukMu = (d, h) => yas(d, h) < COCUK_SURE;
export function cocukSayisi(d) {
  return Math.min(d.nufus, (d.halk || []).reduce((a, h) => a + (cocukMu(d, h) ? 1 : 0), 0));
}
// Çalışabilir kişi sayısı = nüfus − çocuklar (yaralılar ayrıca düşer).
export const calismaGucu = (d) => Math.max(0, d.nufus - cocukSayisi(d));

// Kopya üstünde: deftere n kişi ekler. cocuk=true → bugün doğmuş; değilse yetişkin (dogum = tur − YETISKIN_YAS).
export function halkEkle(d, n, cocuk) {
  if (!d.halk) d.halk = [];
  if (!Number.isInteger(d.halkSayac)) d.halkSayac = d.halk.reduce((a, h) => Math.max(a, h.id), 0);
  for (let i = 0; i < n; i++) d.halk.push({ id: ++d.halkSayac, dogum: cocuk ? d.tur : d.tur - YETISKIN_YAS });
}
// Kopya üstünde: n kişiyi defterden çıkarır; önce çocuklar (en gençten), sonra en genç yetişkinler. Kayıtsız kişiler defteri etkilemez.
export function halkCikar(d, n) {
  if (!d.halk) return;
  for (let i = 0; i < n && d.halk.length; i++) {
    let k = -1;
    for (let j = d.halk.length - 1; j >= 0; j--) if (cocukMu(d, d.halk[j])) { k = j; break; }
    d.halk.splice(k >= 0 ? k : d.halk.length - 1, 1);
  }
}

// Değiştiricilerden yaralı (çalışamayan) kişi sayısı.
export function yaraliSayisi(d) {
  const n = d.degistiriciler.reduce((a, m) => a + (m.etki?.yaraliIsci || 0), 0);
  return Math.min(calismaGucu(d), n);
}

// Yuva sırası: binalar (inşa sırası), sonra serbest işler (tablo sırası). Fazlalık sondan kırpılır.
function yuvaSirasi(d) {
  const s = d.binalar.map((b) => b.uid).filter((u) => d.atama[u] > 0);
  for (const i of SERBEST_ISLER) if (d.atama[serbestAnahtar(i.id)] > 0) s.push(serbestAnahtar(i.id));
  return s;
}

// Fiilen çalışan atama (yaralılar çıkarılmış). Durumu değiştirmez.
export function etkinAtama(d) {
  let bos = Math.max(0, calismaGucu(d) - yaraliSayisi(d));
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
  return Math.max(0, calismaGucu(d) - yaraliSayisi(d) - calisan);
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
  let fazla = atamaToplam(d) - calismaGucu(d);
  const sira = yuvaSirasi(d).reverse();
  for (const k of sira) {
    if (fazla <= 0) break;
    const az = Math.min(fazla, d.atama[k]);
    d.atama[k] -= az;
    fazla -= az;
    if (d.atama[k] === 0) delete d.atama[k];
  }
}

// Kopya üstünde: yeni kişiler deftere yazılır. Yetişkinler (göçmen) §2.5 gereği Toplayıcı'ya yazılır; doğan çocuklar (cocuk=true) çalışmaz, atanmaz.
export function kisiEkle(d, n, cocuk = false) {
  if (!(n > 0)) return;
  d.nufus += n;
  halkEkle(d, n, cocuk);
  if (cocuk) return;
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

// Kayıt (TASARIM §8): sürüm numaralı, alan beyaz listeli. Kayıt = durum nesnesinin JSON'u; RNG durumu (tohum, rng) dahil.
// Yükleme sırası: JSON çöz → sürüm denetimi → göçler (GOCLER[surum], sırayla) → beyaz liste süzgeci (eksikler yeniOyun'dan).
// Depolama erişimi enjekte edilir (localStorage benzeri { getItem, setItem }); böylece modül testlenebilir kalır.
import { DURUM_SURUM, suz } from '../core/durum.js';
import { yeniOyun } from '../core/oyun_durumu.js';
import { turIlerlet } from '../core/tur.js';
import {
  KAYIT_ANAHTAR_OTOMATIK, KAYIT_ANAHTAR_ELLE, KAYIT_BOZUK_EKI, HARITA_BOYUT, GORUS_BASLANGIC, YERLESIM_YARICAP,
} from '../data/denge.js';
import { BINALAR } from '../data/binalar.js';
import { KAROLAR } from '../data/karolar.js';
import { binaHucreleri, icinde } from '../world/izgara.js';
import { karoAt, karoDegistir, merkezNokta } from '../world/harita.js';
import { kesifUygula } from '../world/kesif.js';
import { tehditVarsayilan } from '../core/tehdit.js';
import { TEHDIT_GOC_NEFES, VARSAYILAN_ZORLUK } from '../data/denge.js';

export const KAYIT_SURUM = DURUM_SURUM;
export const ANAHTARLAR = { otomatik: KAYIT_ANAHTAR_OTOMATIK, elle: KAYIT_ANAHTAR_ELLE };

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const KARO = Object.fromEntries(KAROLAR.map((k) => [k.id, k]));

// Sürüm 1 → 2 (aşama 3): 16×16 yer tutucu (tümü çimen) harita yerine tohumlu HARITA_BOYUT harita.
// Binalar yeni haritanın ortasına kaydırılır; altlarında kurulamayacak karo varsa kalıcı değişimle çimen yapılır
// (oyuncunun köyü bozulmasın). Keşif: merkez çevresinde max(GORUS_BASLANGIC, çağın yerleşim sınırı) açılır.
export function goc1to2(eski) {
  const d = { ...eski };
  const tohum = typeof d.tohum === 'number' && Number.isFinite(d.tohum) ? d.tohum : undefined;
  const taban = yeniOyun(tohum);
  const eskiN = Number.isInteger(eski.harita?.boyut) ? eski.harita.boyut : 16;
  const kay = Math.floor((HARITA_BOYUT - eskiN) / 2);
  const gecerliBina = (b) => b && typeof b === 'object' && BINA[b.id] && Number.isFinite(b.x) && Number.isFinite(b.y);
  if (Array.isArray(eski.binalar)) {
    d.binalar = eski.binalar.map((b) => (gecerliBina(b) ? { ...b, x: b.x + kay, y: b.y + kay } : b));
  }
  // Harita kopyası üstünde (binalar dahil, merkez noktası için) değişimler ve keşif.
  const h = { ...taban, cag: YERLESIM_YARICAP[d.cag] ? d.cag : taban.cag, binalar: (d.binalar || taban.binalar).filter(gecerliBina) };
  for (const b of h.binalar) {
    for (const [x, y] of binaHucreleri(b)) {
      if (!icinde(HARITA_BOYUT, x, y)) continue;
      const k = KARO[karoAt(h, x, y)];
      if (!k.insaEdilir && !(k.yalnizBina || []).includes(b.id)) karoDegistir(h, x, y, 'cimen');
    }
  }
  kesifUygula(h, merkezNokta(h), Math.max(GORUS_BASLANGIC, YERLESIM_YARICAP[h.cag]));
  d.harita = h.harita;
  return d;
}

// Sürüm 2 → 3 (tehdit MVP): zorluk Normal; tehdit varsayılanı gerginlik 0 ve 10 tur nefes (yüklenen eski oyun hemen
// saldırıya uğramaz). Mevcut alanlara dokunulmaz.
export function goc2to3(eski) {
  const tohum = typeof eski.tohum === 'number' && Number.isFinite(eski.tohum) ? eski.tohum : undefined;
  return { ...eski, zorluk: VARSAYILAN_ZORLUK,
    tehdit: tehditVarsayilan(tohum ?? 1, { gerginlik: 0, nefesKalan: TEHDIT_GOC_NEFES }) };
}

// GOCLER[n]: sürüm n kaydını sürüm n+1'e çeviren saf fonksiyon.
export const GOCLER = { 1: goc1to2, 2: goc2to3 };

export class KayitHatasi extends Error {}

export function serialize(durum) {
  const temiz = suz(durum, yeniOyun(durum?.tohum));
  return JSON.stringify(temiz);
}

// Dönüş: süzülmüş durum. Okunamazsa KayitHatasi fırlatır.
// `gocler` ve `hedefSurum` testler için enjekte edilebilir.
export function yukle(metin, gocler = GOCLER, hedefSurum = KAYIT_SURUM) {
  let ham;
  try {
    ham = JSON.parse(metin);
  } catch {
    throw new KayitHatasi('Kayıt okunamadı');
  }
  if (ham === null || typeof ham !== 'object' || Array.isArray(ham)) throw new KayitHatasi('Kayıt okunamadı');
  if (!Number.isInteger(ham.surum) || ham.surum < 1) throw new KayitHatasi('Kayıt sürümü yok');
  if (ham.surum > hedefSurum) throw new KayitHatasi('Kayıt bu oyundan yeni bir sürümle yapılmış');
  let d = ham;
  for (let s = d.surum; s < hedefSurum; s++) {
    if (typeof gocler[s] !== 'function') throw new KayitHatasi(`Sürüm ${s} için göç yok`);
    d = { ...gocler[s](d), surum: s + 1 };
  }
  const tohum = typeof d.tohum === 'number' && Number.isFinite(d.tohum) ? d.tohum : undefined;
  return suz(d, yeniOyun(tohum));
}

export function kaydet(depo, anahtar, durum) {
  depo.setItem(anahtar, serialize(durum));
}

// Okur; kayıt yoksa { durum: null }. Bozuksa eski kaydı `:bozuk` ekiyle saklar, yeni oyun ve hata iletisi döner.
export function oku(depo, anahtar, yeniTohum) {
  const metin = depo.getItem(anahtar);
  if (metin == null) return { durum: null, hata: null };
  try {
    return { durum: yukle(metin), hata: null };
  } catch (e) {
    if (!(e instanceof KayitHatasi)) throw e;
    depo.setItem(anahtar + KAYIT_BOZUK_EKI, metin);
    return { durum: yeniOyun(yeniTohum), hata: e.message };
  }
}

// §1.2 p: otomatik kayıt çekirdeğin dışında, çağıran katmanda yapılır. Tur ilerler, hata yoksa otomatik yuvaya yazılır.
export function turIlerletVeKaydet(depo, durum) {
  const sonuc = turIlerlet(durum);
  if (!sonuc.hata) kaydet(depo, ANAHTARLAR.otomatik, sonuc.durum);
  return sonuc;
}

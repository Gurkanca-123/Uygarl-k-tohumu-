// Kayıt (TASARIM §8): sürüm numaralı, alan beyaz listeli. Kayıt = durum nesnesinin JSON'u; RNG durumu (tohum, rng) dahil.
// Yükleme sırası: JSON çöz → sürüm denetimi → göçler (GOCLER[surum], sırayla) → beyaz liste süzgeci (eksikler yeniOyun'dan).
// Depolama erişimi enjekte edilir (localStorage benzeri { getItem, setItem }); böylece modül testlenebilir kalır.
import { DURUM_SURUM, suz } from '../core/durum.js';
import { yeniOyun } from '../core/oyun_durumu.js';
import { KAYIT_ANAHTAR_OTOMATIK, KAYIT_ANAHTAR_ELLE, KAYIT_BOZUK_EKI } from '../data/denge.js';

export const KAYIT_SURUM = DURUM_SURUM;
export const ANAHTARLAR = { otomatik: KAYIT_ANAHTAR_OTOMATIK, elle: KAYIT_ANAHTAR_ELLE };

// GOCLER[n]: sürüm n kaydını sürüm n+1'e çeviren saf fonksiyon. Şimdilik tek sürüm var.
export const GOCLER = {};

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

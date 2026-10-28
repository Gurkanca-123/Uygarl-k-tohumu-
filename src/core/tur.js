// Tur sonu çözümleme (TASARIM §1.2): `turIlerlet` adımları sabit sırayla birleştirir. Saf ve tohumlu RNG ile deterministik.
// Dönüş: { durum, bildirimler, hata? }. Adım p (otomatik kayıt) çekirdeğin işi DEĞİL: çağıran katman yapar
// (bkz. src/save/kayit.js `turIlerletVeKaydet`).
import { MEVSIM_TUR, MEVSIM_SONU_MAX_TUR, VARSAYILAN_EYLEM } from '../data/denge.js';
import { kopya, yeniSonTur, OLAY_KILIDI } from './yardimci.js';
import { adimOnder } from './eylem.js';
import { adimInsaat, adimBakim } from './insa.js';
import { adimIsDagit } from './isdagit.js';
import { adimHamUretim, adimDonusum, adimDepoKirp } from './uretim.js';
import { adimTuketim, adimBozulma } from './tuketim.js';
import { adimAclik, adimNufus } from './nufus.js';
import { adimHuzur } from './huzur.js';
import { adimArastirma } from './arastirma.js';
import { adimOlay } from './olay.js';
import { adimTakvim } from './cag.js';
import { adimTehdit } from './tehdit.js';
import { adimSefer, adimIsaret } from './sefer.js';
import { adimHedef } from './hedef.js';
import { adimKomsu } from './komsu.js';

// Adım m: değiştiricilerin süresi −1; 0 olan silinir (kalan null = kalıcı).
export function adimDegistiriciler(durum) {
  const d = kopya(durum);
  d.degistiriciler = d.degistiriciler
    .map((m) => (m.kalan === null ? m : { ...m, kalan: m.kalan - 1 }))
    .filter((m) => m.kalan === null || m.kalan > 0);
  return d;
}

export const ADIMLAR = [
  ['a', 'Önder eylemi', adimOnder],
  ['b', 'İnşaat ilerlemesi', adimInsaat],
  ['b2', 'Otomatik iş dağıtımı (varsayılan kapalı)', adimIsDagit],
  ['c', 'Bakım', adimBakim],
  ['d', 'Ham üretim', adimHamUretim],
  ['e', 'Dönüşüm', adimDonusum],
  ['f', 'Depo tavanı', adimDepoKirp],
  ['g', 'Tüketim', adimTuketim],
  ['h', 'Bozulma', adimBozulma],
  ['i', 'Açlık / ısınma', adimAclik],
  ['j', 'Huzur', adimHuzur],
  ['k', 'Nüfus', adimNufus],
  ['l', 'Araştırma', adimArastirma],
  ['m', 'Değiştiriciler', adimDegistiriciler],
  // TEHDIT.md §8.3: tehdit adımı olaydan ÖNCE; varış turunda n kötü olay seçmez (sonTur.tehditVaris).
  ['m2', 'Tehdit', adimTehdit],
  // AKSIYON.md §8.3: sefer dönüşleri tehditten SONRA (bu turun savunmasında ekip yoktu), olaydan önce (yolda sefer olayı kotayı doldurur).
  ['m3', 'Sefer ve kahraman', adimSefer],
  ['n', 'Olay', adimOlay],
  ['o', 'Takvim', adimTakvim],
  // Takvimden sonra (yeni günün turu): işaret süreleri/doğuşu, hedefler (ilk kahraman teklifi, destan, görev kartları), komşu (mevsim başı niyet).
  ['o2', 'Hedef işaretleri', adimIsaret],
  ['o3', 'Hedefler', adimHedef],
  ['o4', 'Komşular', adimKomsu],
];

export function turIlerlet(durum) {
  if (durum.olay?.aktif) return { durum, bildirimler: [], hata: OLAY_KILIDI };
  let d = kopya(durum);
  d.istatistik = { ...(d.istatistik || {}), sonTur: yeniSonTur(d.tur) };
  const bildirimler = [];
  for (const [, , adim] of ADIMLAR) d = adim(d, bildirimler);
  return { durum: d, bildirimler };
}

// Komut: "Mevsim sonuna ilerlet" (§8). En çok MEVSIM_SONU_MAX_TUR tur, önder Dinlen; olay çıkınca, açlık başlayınca,
// inşaat bitince ya da mevsim bitince durur. Dönüş: { durum, hata?, bildirimler, turSayisi, neden }.
export function mevsimSonunaIlerlet(durum) {
  if (durum.olay?.aktif) return { durum, hata: OLAY_KILIDI, bildirimler: [], turSayisi: 0, neden: 'olay' };
  let d = durum;
  const bildirimler = [];
  let neden = 'en_cok';
  let i = 0;
  while (i < MEVSIM_SONU_MAX_TUR) {
    const hazir = { ...d, onder: { ...d.onder, eylem: VARSAYILAN_EYLEM, secim: null } };
    const r = turIlerlet(hazir);
    const onceAc = d.acTur;
    d = r.durum;
    bildirimler.push(...r.bildirimler);
    i++;
    if (d.olay.aktif) { neden = 'olay'; break; }
    if (onceAc === 0 && d.acTur > 0) { neden = 'aclik'; break; }
    if (r.bildirimler.some((b) => b.kod === 'insaat_bitti')) { neden = 'insaat'; break; }
    if (d.tur % MEVSIM_TUR === 0) { neden = 'mevsim_sonu'; break; }
  }
  return { durum: d, bildirimler, turSayisi: i, neden };
}

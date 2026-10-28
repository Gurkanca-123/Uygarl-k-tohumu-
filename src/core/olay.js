// Olay motoru (TASARIM §6; adım n) ve olay çözme komutu. Saf, tohumlu RNG.
//
// Zamanlama tanımı: olay n adımında seçilir ve SONRAKİ oyuncu evresinde gösterilir. `gun` = gösterileceği gün
// (takvim(tur + 1).gun, 1'den sayılır). Olay ancak gun ≥ ILK_OLAY_TUR (6) iken çıkar: gün 1–5 (tur 0–4) olaysız,
// ilk olay en erken tur 4 çözülürken seçilip 6. günde (durum.tur = 5) gösterilir. Koşuldaki `turMin` da aynı `gun` ile
// karşılaştırılır; `mevsim` koşulu gösterileceği günün mevsimidir.
// TODO(tasarim): bekleyen zincir olayları da bu sınırı bekler (gün 1–5'te Keşfet → Yabancı Aile 6. güne kalır) ve zincir olayı
// koşul denetlemez ("kesin gelir"); kurtarma olayı aynı turda zincirin önüne geçer, zincir sonraki tura kalır.
//
// Seçim sırası (tur başına en çok 1): kurtarma (koşullu, çağ başına bir) → vadesi gelen zincir (kesin) →
// diğer koşullu olaylar (ağırlıklı) → rastgele (çağ olasılığıyla, ağırlıklı havuz).
import {
  ILK_OLAY_TUR, SARMAL_KOTU_CARPAN, SARMAL_HUZUR_ESIK, TICARET_CARPAN_MAX, TEHDIT_IZ_GERGINLIK, TEHDIT_DOGUM_ESIK,
} from '../data/denge.js';
import { OLAYLAR } from '../data/olaylar.js';
import { takvim } from './takvim.js';
import {
  OLAY, BINA, kopya, mevcutCag, calisanBinalar, binaKurulu, etkinAtama, etkinDegistiriciler, bildir, zar,
  zarAgirlikli, hataDon,
} from './yardimci.js';
import { sonucUygula } from './sonuc.js';
import { hastalikCarpani } from './savunma.js';

// Koşul / gereksinim denetimi (§6.1; VE ile birleşir). zaman: { gun, mevsim } (verilmezse geçerli tur).
export function kosulSaglanir(d, k = {}, zaman = null) {
  const z = zaman || { gun: takvim(d.tur).gun, mevsim: takvim(d.tur).mevsim };
  const r = (id) => d.kaynaklar[id] || 0;
  if (k.turMin !== undefined && z.gun < k.turMin) return false;
  if (k.nufusMin !== undefined && d.nufus < k.nufusMin) return false;
  if (k.nufusMax !== undefined && d.nufus > k.nufusMax) return false;
  if (k.kaynakMin && Object.entries(k.kaynakMin).some(([id, m]) => r(id) + 1e-9 < m)) return false;
  if (k.kaynakMax && Object.entries(k.kaynakMax).some(([id, m]) => r(id) > m)) return false;
  if (k.mevsim && !k.mevsim.includes(z.mevsim)) return false;
  if (k.huzurMin !== undefined && d.huzur < k.huzurMin) return false;
  if (k.huzurMax !== undefined && d.huzur > k.huzurMax) return false;
  const calisan = calisanBinalar(d);
  if (k.binaVar && !k.binaVar.every((id) => calisan.some((b) => b.id === id))) return false;
  if (k.binaYok && k.binaYok.some((id) => d.binalar.some((b) => b.id === id && binaKurulu(d, b)))) return false;
  if (k.bulusVar && !k.bulusVar.every((id) => d.buluslar.includes(id))) return false;
  if (k.acTurMin !== undefined && d.acTur < k.acTurMin) return false;
  if (k.vergi !== undefined && d.vergi !== k.vergi) return false;
  if (k.isciTuruMin) {
    const etkin = etkinAtama(d);
    for (const [tur, min] of Object.entries(k.isciTuruMin)) {
      const n = calisan.filter((b) => BINA[b.id].isciTuru === tur).reduce((a, b) => a + (etkin[b.uid] || 0), 0);
      if (n < min) return false;
    }
  }
  return true;
}

const beklemede = (d, o, gosterimTuru) => (d.olay.bekleme[o.id] ?? -Infinity) > gosterimTuru;
const cagaUygun = (d, o) => o.cag.includes(d.cag);
const kurtarmaKullanildi = (d, o) => o.cagBasinaBir && d.olay.kurtarmaKullanildi[d.cag];

// §6.2 ağırlık: sarmal koruması, ticaret/göçmen bina çarpanları, hastalık riski, ticaretKapali.
export function olayAgirligi(d, o) {
  let w = o.agirlik;
  if (o.kotu && (d.acTur > 0 || d.huzur < SARMAL_HUZUR_ESIK)) w *= SARMAL_KOTU_CARPAN;
  const binaCarpani = calisanBinalar(d).reduce((a, b) => a * (BINA[b.id].olayAgirlik?.[o.tur] ?? 1), 1);
  w *= o.tur === 'ticaret' ? Math.min(binaCarpani, TICARET_CARPAN_MAX) : binaCarpani;
  if (o.tur === 'hastalik') w *= hastalikCarpani(d);
  if (o.tur === 'ticaret' && etkinDegistiriciler(d).some((m) => m.etki?.ticaretKapali)) w = 0;
  return w;
}

// Gösterileceği an için uygun olaylar (tetik türüne göre).
// Tehdit motoru açıkken (durumda `tehdit` var) `tur:'saldiri'` olayları havuz dışı (çifte saldırı yok; kayıtları silinmez).
// Tehdit varış turunda kötü olay seçilmez (TEHDIT.md §3.6).
export const tehditMotoru = (d) => !!d.tehdit;
const havuzDisi = (d, o) => (tehditMotoru(d) && o.tur === 'saldiri') || (o.kotu && !!d.istatistik?.sonTur?.tehditVaris);
export function uygunOlaylar(d, tetik, zaman) {
  const gosterimTuru = d.tur + 1;
  return OLAYLAR.filter((o) => o.tetik === tetik && !havuzDisi(d, o) && cagaUygun(d, o) && !beklemede(d, o, gosterimTuru)
    && !kurtarmaKullanildi(d, o) && kosulSaglanir(d, o.kosul, zaman));
}

function olayGoster(d, o, bildirimler) {
  const gosterimTuru = d.tur + 1;
  d.olay.aktif = { id: o.id };
  d.olay.bekleme = { ...d.olay.bekleme, [o.id]: gosterimTuru + o.bekleme };
  if (o.cagBasinaBir) d.olay.kurtarmaKullanildi = { ...d.olay.kurtarmaKullanildi, [d.cag]: true };
  bildir(bildirimler, 'olay', `Olay: ${o.ad}`, o.kotu ? 'uyari' : 'bilgi', { olay: o.id });
}

// Adım n.
export function adimOlay(durum, bildirimler = []) {
  const d = kopya(durum);
  if (d.olay.aktif) return d;
  // AKSIYON §7: yolda sefer olayı çıkan tur olay kotasını doldurur.
  if (d.istatistik?.sonTur?.seferOlayi) return d;
  const t = takvim(d.tur + 1);
  const zaman = { gun: t.gun, mevsim: t.mevsim };
  if (zaman.gun < ILK_OLAY_TUR) return d;

  const kosullu = uygunOlaylar(d, 'kosul', zaman);
  const kurtarma = kosullu.find((o) => o.tur === 'kurtarma');
  if (kurtarma) { olayGoster(d, kurtarma, bildirimler); return d; }

  const zi = d.olay.zincir.findIndex((z) => z.tur <= d.tur + 1);
  if (zi >= 0) {
    const z = d.olay.zincir[zi];
    d.olay.zincir = d.olay.zincir.filter((_, i) => i !== zi);
    // Motor açıkken saldırı zinciri (Keşfet → kurt) olay yerine gerginlik ekler (uyarı sürerken etkisiz).
    if (tehditMotoru(d) && OLAY[z.olay].tur === 'saldiri') {
      if (!d.tehdit.aktif) {
        d.tehdit = { ...d.tehdit, gerginlik: Math.min(TEHDIT_DOGUM_ESIK, d.tehdit.gerginlik + TEHDIT_IZ_GERGINLIK) };
        bildir(bildirimler, 'tehdit_iz', 'Keşifte yırtıcı izleri görüldü; köyde tedirginlik arttı.', 'uyari');
      }
      return d;
    }
    olayGoster(d, OLAY[z.olay], bildirimler);
    return d;
  }

  if (kosullu.length) {
    const o = zarAgirlikli(d, kosullu, (x) => olayAgirligi(d, x));
    if (o) { olayGoster(d, o, bildirimler); return d; }
  }

  if (zar(d) < mevcutCag(d).olayOlasiligi) {
    const havuz = uygunOlaylar(d, 'rastgele', zaman);
    const o = zarAgirlikli(d, havuz, (x) => olayAgirligi(d, x));
    if (o) olayGoster(d, o, bildirimler);
  }
  return d;
}

// Seçeneğin gereksinimi (koşul diliyle) sağlanıyor mu.
export function secenekUygunMu(d, secenek) {
  return kosulSaglanir(d, secenek.gereksinim || {});
}

// Komut: bekleyen olayı seç ve çöz. Gereksinimi sağlanmayan seçenek seçilemez.
export function olayCoz(durum, secenekIndex) {
  if (!durum.olay.aktif) return hataDon(durum, 'Bekleyen olay yok.');
  const o = OLAY[durum.olay.aktif.id];
  const s = o.secenekler[secenekIndex];
  if (!s) return hataDon(durum, 'Böyle bir seçenek yok.');
  if (!secenekUygunMu(durum, s)) return hataDon(durum, 'Bu seçeneğin gereksinimi sağlanmıyor.');
  const d = kopya(durum);
  const bildirimler = [];
  d.olay.aktif = null;
  sonucUygula(d, s.sonuc, { bildirimler, olay: o });
  return { durum: d, bildirimler };
}

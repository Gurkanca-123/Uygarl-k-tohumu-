// Nüfus (TASARIM §2.5, §7.3): açlık sayacı, kayıp kilidi, nüfus tabanı, göç, doğum; iş atama komutu. Saf.
//
// Ölüm sarmalı kuralları (§7.3): nüfus NUFUS_MIN'in altına inmez · her KAYIP_PENCERE turluk kayan pencerede en çok
// max(1, floor(nüfus × KAYIP_ORAN)) kişi kaybedilir (açlık + göç + hastalık + saldırı toplamı) · kemer sıkma tuketim/uretim'de ·
// doğum için huzur ≥ DOGUM_HUZUR_MIN (40).
import {
  NUFUS_MIN, KAYIP_PENCERE, KAYIP_ORAN, ACLIK_OLUM_TUR, GOC_HUZUR_ESIK, GOC_OLASILIK,
  DOGUM_HUZUR_MIN, DOGUM_YIYECEK_KISI, DOGUM_NUFUS_BOLEN,
} from '../data/denge.js';
import {
  BINA, kopya, mevcutCag, sonTur, bildir, zar, atamaDuzelt, kisiEkle, barinmaKapasitesi, binaBul,
  isciYuvasi, binaIsi, issizSayisi, SERBEST, SERBEST_ONEK, olayKilitli, OLAY_KILIDI, hataDon,
} from './yardimci.js';

// Penceredeki kayıplar: tur > d.tur − KAYIP_PENCERE (bu tur dahil son 3 tur).
export function penceredekiKayip(d) {
  return d.kayiplar.filter((k) => k.tur > d.tur - KAYIP_PENCERE).reduce((a, k) => a + k.adet, 0);
}
export function kayipSiniri(d) {
  return Math.max(1, Math.floor(d.nufus * KAYIP_ORAN));
}
// Şu an kaybedilebilecek en çok kişi.
export function kayipHakki(d) {
  return Math.max(0, Math.min(kayipSiniri(d) - penceredekiKayip(d), d.nufus - NUFUS_MIN));
}

// Kopya üstünde: en çok `istenen` kişi kaybı uygular (kilit + taban). Dönüş: kaybedilen sayı.
export function kayipUygula(d, istenen, neden, bildirimler) {
  if (!(istenen > 0)) return 0;
  const n = Math.min(istenen, kayipHakki(d));
  if (n > 0) {
    d.nufus -= n;
    d.kayiplar = [...d.kayiplar.filter((k) => k.tur > d.tur - KAYIP_PENCERE), { tur: d.tur, adet: n }];
    atamaDuzelt(d);
    bildir(bildirimler, 'kayip', `${n} kişi kaybedildi (${neden}).`, 'uyari', { adet: n, neden });
  }
  if (n < istenen) {
    bildir(bildirimler, 'kayip_kilidi', `Kayıp kilidi ${istenen - n} kişiyi kurtardı (${neden}).`, 'bilgi');
  }
  return n;
}

// Adım i: açlık sayacı. acTur ≥ ACLIK_OLUM_TUR → 1 ölüm adayı (k adımında kilide tabi) ve acTur = 1.
export function adimAclik(durum, bildirimler = []) {
  const d = kopya(durum);
  const st = sonTur(d);
  if (st.aclik) {
    d.acTur += 1;
    if (d.acTur >= ACLIK_OLUM_TUR) {
      st.olumAdayi = (st.olumAdayi || 0) + 1;
      d.acTur = 1;
    }
  } else {
    d.acTur = 0;
  }
  return d;
}

// Doğum denetimi her `dogumAraligi` turda bir: (tur + 1) % aralık === 0 (4. gün, 8. gün, …).
// TODO(tasarim): aralık çağ başından değil oyun başından sayılır varsayıldı; kayıp penceresi kayan pencere varsayıldı.
export const dogumTuruMu = (d) => (d.tur + 1) % mevcutCag(d).dogumAraligi === 0;
export function dogumSartlari(d) {
  const bos = Math.max(0, barinmaKapasitesi(d) - d.nufus);
  const eksik = [];
  if (bos < 1) eksik.push('boş barınak yok');
  if ((d.kaynaklar.yiyecek || 0) < d.nufus * DOGUM_YIYECEK_KISI) eksik.push(`yiyecek < ${d.nufus * DOGUM_YIYECEK_KISI}`);
  if (d.huzur < DOGUM_HUZUR_MIN) eksik.push(`huzur < ${DOGUM_HUZUR_MIN}`);
  if (d.acTur !== 0) eksik.push('açlık sürüyor');
  return { uygun: eksik.length === 0, eksik, adet: Math.min(1 + Math.floor(d.nufus / DOGUM_NUFUS_BOLEN), bos) };
}

// Adım k: kayıp (açlık + göç) → doğum.
export function adimNufus(durum, bildirimler = []) {
  const d = kopya(durum);
  const st = sonTur(d);
  if (st.olumAdayi) kayipUygula(d, st.olumAdayi, 'açlık', bildirimler);
  if (d.huzur < GOC_HUZUR_ESIK && zar(d) < GOC_OLASILIK) kayipUygula(d, 1, 'huzursuzluk, göç', bildirimler);
  if (dogumTuruMu(d)) {
    const s = dogumSartlari(d);
    if (s.uygun && s.adet > 0) {
      kisiEkle(d, s.adet);
      bildir(bildirimler, 'dogum', `${s.adet} çocuk doğdu.`, 'iyi', { adet: s.adet });
    }
  }
  return d;
}

// Komut: iş ata. `hedef` = bina uid'si ya da 'serbest:<iş>'; `adet` = o yuvadaki yeni kişi sayısı (ücretsiz, sınırsız değişiklik).
// İnşaattaki binaya önceden işçi atanabilir: bina b adımında tamamlandığı tur üretime başlar (§1.2 b); o zamana dek işçi bekler
// (işsiz sayılmaz).
export function isAta(durum, hedef, adet) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (!Number.isInteger(adet) || adet < 0) return hataDon(durum, 'Kişi sayısı geçersiz.');
  if (hedef.startsWith(SERBEST_ONEK)) {
    if (!SERBEST[hedef.slice(SERBEST_ONEK.length)]) return hataDon(durum, 'Böyle bir serbest iş yok.');
  } else {
    const b = binaBul(durum, hedef);
    if (!b) return hataDon(durum, 'Böyle bir bina yok.');
    const t = BINA[b.id];
    const yuva = isciYuvasi(b);
    if (yuva === 0) return hataDon(durum, `${t.ad} işçi almaz.`);
    if (adet > yuva) return hataDon(durum, `${t.ad} en çok ${yuva} işçi alır.`);
  }
  const toplam = Object.entries(durum.atama).reduce((a, [k, n]) => a + (k === hedef ? 0 : n), 0) + adet;
  if (toplam > durum.nufus) return hataDon(durum, `Yeterli kişi yok (nüfus ${durum.nufus}).`);
  const d = kopya(durum);
  if (adet === 0) delete d.atama[hedef];
  else d.atama[hedef] = adet;
  return { durum: d };
}

// Komut: boştakileri otomatik ata. Boşta kalan kişileri, inşa sırasıyla, kurulu ve hasarsız binaların boş yuvalarına doldurur.
// Mevcut atamalar değişmez; serbest işlere dokunulmaz.
export function isOtoAta(durum) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  let kalan = issizSayisi(durum);
  if (kalan <= 0) return hataDon(durum, 'Boşta kimse yok.');
  const d = kopya(durum);
  let atanan = 0;
  for (const b of d.binalar) {
    if (kalan <= 0) break;
    if (b.hasarli || binaIsi(d, b) === 'insa') continue;
    const bos = isciYuvasi(b) - (d.atama[b.uid] || 0);
    if (bos <= 0) continue;
    const n = Math.min(bos, kalan);
    d.atama[b.uid] = (d.atama[b.uid] || 0) + n;
    kalan -= n; atanan += n;
  }
  if (!atanan) return hataDon(durum, 'Boş iş yuvası yok.');
  return { durum: d, atanan };
}

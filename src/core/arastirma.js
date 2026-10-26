// Araştırma (TASARIM §1.2 l, §5): BP üretimi, havuz, buluş seçimi ve tamamlanma. Saf.
// BP her tur seçili buluşa akar; seçili buluş yoksa `bilgiHavuz`'da birikir, seçilince aktarılır.
// Tamamlanan buluşun etkisi bir sonraki turdan başlar (üretim bu turda zaten hesaplandı; l adımı d'den sonra gelir).
// Kitap maliyeti (Orta Çağ) tamamlanma anında düşülür; kitap yetmezse buluş BP'si dolu bekler.
import {
  BULUS, BINA, kopya, mevcutCag, calisanBinalar, binaIscisi, seviyeCarpani, cagAcik, bildir, sonTur,
  olayKilitli, OLAY_KILIDI, hataDon, kaynakYeter, eksikMetni,
} from './yardimci.js';

// Bu turun BP üretimi: merkez tabanı + binaların sabit BP'si + işçi başına BP × seviye çarpanı.
// TODO(tasarim): sabit `bilgi` seviyeyle artar mı yazılmamış (§3.5 listesinde yok) → artmaz varsayıldı.
export function bilgiUretimi(d) {
  let bp = mevcutCag(d).bilgiTaban;
  for (const b of calisanBinalar(d)) {
    const t = BINA[b.id];
    bp += t.bilgi || 0;
    if (t.isciBilgi) bp += t.isciBilgi * binaIscisi(d, b) * seviyeCarpani(b);
  }
  return bp;
}

// Kopya üstünde: BP'yi seçili buluşa ya da havuza ekler.
export function bilgiEkle(d, miktar) {
  if (!miktar) return;
  if (d.arastirma) d.arastirma = { ...d.arastirma, ilerleme: d.arastirma.ilerleme + miktar };
  else d.bilgiHavuz += miktar;
}

export function arastirilabilirMi(d, id) {
  const b = BULUS[id];
  if (!b) return 'Böyle bir buluş yok.';
  if (d.buluslar.includes(id)) return 'Bu buluş zaten biliniyor.';
  if (!cagAcik(d, b.cag)) return 'Bu buluş daha sonraki bir çağda araştırılabilir.';
  const eksik = b.gerekir.filter((g) => !d.buluslar.includes(g));
  if (eksik.length) return `Önce gereken buluşlar: ${eksik.map((g) => BULUS[g].ad).join(', ')}.`;
  return null;
}

// Komut: buluş seç. Başka bir buluş seçiliyse onun ilerlemesi havuza döner (BP kaybolmaz).
// TODO(tasarim): araştırma değiştirmenin cezası yazılmamış → cezasız varsayıldı.
export function arastirmaSec(durum, id) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (durum.arastirma?.id === id) return hataDon(durum, 'Bu buluş zaten araştırılıyor.');
  const hata = arastirilabilirMi(durum, id);
  if (hata) return hataDon(durum, hata);
  const d = kopya(durum);
  const havuz = d.bilgiHavuz + (d.arastirma?.ilerleme || 0);
  d.arastirma = { id, ilerleme: havuz };
  d.bilgiHavuz = 0;
  return { durum: d };
}

// Adım l: BP ekle → araştırma tamamlanır mı.
export function adimArastirma(durum, bildirimler = []) {
  const d = kopya(durum);
  const bp = bilgiUretimi(d);
  sonTur(d).bilgi = (sonTur(d).bilgi || 0) + bp;
  bilgiEkle(d, bp);
  const a = d.arastirma;
  if (a) {
    const b = BULUS[a.id];
    const kitap = b.maliyet.kitap ? { kitap: b.maliyet.kitap } : null;
    if (a.ilerleme + 1e-9 >= b.maliyet.bilgi) {
      if (kitap && !kaynakYeter(d, kitap)) {
        bildir(bildirimler, 'arastirma_kitap', `${b.ad} için kitap eksik: ${eksikMetni(d, kitap)}.`, 'uyari');
      } else {
        if (kitap) d.kaynaklar.kitap -= kitap.kitap;
        d.buluslar = [...d.buluslar, a.id];
        d.bilgiHavuz += a.ilerleme - b.maliyet.bilgi;
        d.arastirma = null;
        bildir(bildirimler, 'bulus_tamam', `Buluş tamamlandı: ${b.ad}.`, 'iyi', { bulus: b.id });
      }
    }
  }
  return d;
}

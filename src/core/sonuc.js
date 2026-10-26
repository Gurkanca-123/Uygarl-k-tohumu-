// Sonuç uygulayıcı (TASARIM §6.1 `sonuc` biçimi; olay seçenekleri ve önder eylemleri ortak kullanır). Kopya üstünde çalışır.
//
// baglam: { bildirimler, olcek (kaynak çarpanı), olay (olay tanımı, varsa), iyiBonus (olasılık listesinde `iyi` dilimlere) }
import { BINA, kaynakUygula, degistiriciEkle, kisiEkle, bildir, zar, mevcutCag, calisanBinalar, sinirla } from './yardimci.js';
import { huzurEkle } from './huzur.js';
import { bilgiEkle } from './arastirma.js';
import { kayipUygula, kayipHakki } from './nufus.js';
import { savunmaTesti, kaynakOranKaybi, rastgeleHasar } from './savunma.js';
import { SALDIRI_PUSKURTME_HUZUR } from '../data/denge.js';

// Olasılık dilimlerini `iyi` bonusuna göre yeniden dağıtır: iyi dilimler orantılı artar, diğerleri orantılı azalır.
export function olasilikDagit(liste, iyiBonus = 0) {
  if (!iyiBonus || !liste.some((o) => o.iyi)) return liste;
  const iyi = liste.filter((o) => o.iyi).reduce((a, o) => a + o.p, 0);
  const diger = 1 - iyi;
  const b = sinirla(iyiBonus, 0, diger);
  return liste.map((o) => ({ ...o, p: o.iyi ? o.p * (iyi + b) / iyi : (diger > 0 ? o.p * (diger - b) / diger : 0) }));
}

// Hastalık olaylarında kayıp çarpanı (Şifacı Çadırı: yarıya). Her kayıp (1 − çarpan) olasılıkla önlenir.
function hastalikKaybi(d, n) {
  const c = calisanBinalar(d).reduce((a, b) => Math.min(a, BINA[b.id].hastalikKayipCarpani ?? 1), 1);
  if (c >= 1) return n;
  let kalan = 0;
  for (let i = 0; i < n; i++) if (zar(d) < c) kalan++;
  return kalan;
}

export function sonucUygula(d, sonuc, baglam = {}) {
  if (!sonuc) return;
  const bl = baglam.bildirimler;
  const olcek = baglam.olcek ?? 1;
  if (sonuc.kosullu) {
    for (const k of sonuc.kosullu) {
      if (k.kosul.vergi && d.vergi !== k.kosul.vergi) continue;
      return sonucUygula(d, k.sonuc, baglam);
    }
  }
  if (sonuc.bos) return;
  if (sonuc.kaynak) {
    const cagC = sonuc.cagOlcek ? 1 + sonuc.cagOlcek * mevcutCag(d).sira : 1;
    kaynakUygula(d, sonuc.kaynak, { carpan: olcek * cagC });
  }
  if (sonuc.nufus > 0) {
    kisiEkle(d, sonuc.nufus);
    bildir(bl, 'gocmen', `${sonuc.nufus} kişi kabileye katıldı.`, 'iyi');
  } else if (sonuc.nufus < 0) {
    const n = baglam.olay?.tur === 'hastalik' ? hastalikKaybi(d, -sonuc.nufus) : -sonuc.nufus;
    kayipUygula(d, n, baglam.olay?.ad ?? 'olay', bl);
  }
  if (sonuc.kayipKilidiKadar) {
    const n = baglam.olay?.tur === 'hastalik' ? hastalikKaybi(d, kayipHakki(d)) : kayipHakki(d);
    kayipUygula(d, n, baglam.olay?.ad ?? 'olay', bl);
  }
  if (sonuc.huzur) huzurEkle(d, sonuc.huzur);
  if (sonuc.bilgi) bilgiEkle(d, sonuc.bilgi);
  if (sonuc.yaraliIsci) {
    degistiriciEkle(d, { id: 'yarali', sure: sonuc.yaraliIsci.sure, etki: { yaraliIsci: sonuc.yaraliIsci.adet } });
    bildir(bl, 'yarali', `${sonuc.yaraliIsci.adet} kişi ${sonuc.yaraliIsci.sure} tur çalışamayacak.`, 'uyari');
  }
  if (sonuc.hasar) rastgeleHasar(d, sonuc.hasar.adet, sonuc.hasar.binaId, bl);
  if (sonuc.degistirici) degistiriciEkle(d, sonuc.degistirici);
  if (sonuc.kayipOrani) kaynakOranKaybi(d, sonuc.kayipOrani);
  if (sonuc.puskurtme) huzurEkle(d, SALDIRI_PUSKURTME_HUZUR);
  if (sonuc.savunmaTesti) savunmaTesti(d, bl, sonuc.savunmaTesti.guc);
  if (sonuc.vergi) d.vergi = sonuc.vergi;
  if (sonuc.bekleme && baglam.olay) d.olay.bekleme = { ...d.olay.bekleme, [baglam.olay.id]: d.tur + sonuc.bekleme };
  if (sonuc.zincir) d.olay.zincir = [...d.olay.zincir, { olay: sonuc.zincir.olay, tur: d.tur + sonuc.zincir.gecikme }];
  if (sonuc.onderYarali) {
    d.onder.yaraliKalan = Math.max(d.onder.yaraliKalan, sonuc.onderYarali);
    bildir(bl, 'onder_yarali', `Önder yaralandı; ${sonuc.onderYarali} tur yalnız dinlenebilir.`, 'uyari');
  }
  if (sonuc.metin) bildir(bl, 'sonuc', sonuc.metin);
  if (sonuc.olasilik) {
    const liste = olasilikDagit(sonuc.olasilik, baglam.iyiBonus);
    const r = zar(d);
    let esik = 0;
    let secilen = liste[liste.length - 1];
    for (const o of liste) { esik += o.p; if (r < esik) { secilen = o; break; } }
    sonucUygula(d, secilen.sonuc, { ...baglam, iyiBonus: 0 });
  }
}

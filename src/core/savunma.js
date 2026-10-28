// Saldırı ve hastalık riski (TASARIM §6.3, §6.4). Saf.
import { orduSavunmaKalemi } from './savas.js';
import {
  ONDER_SAVUNMA, SALDIRI_TUR_BOLEN, SALDIRI_PUSKURTME_HUZUR, SALDIRI_KISMI_KAYIP, SALDIRI_TAM_KAYIP, SALDIRI_TAM_NUFUS,
  SALDIRI_TAM_HASAR, HASTALIK_TABAN, HASTALIK_MIN, HASTALIK_MAX, HASTALIK_ISINMA_EKSIK, BEKCI_DEGER, CEVRE,
} from '../data/denge.js';
import {
  BINA, mevcutCag, calisanBinalar, binaKurulu, seviyeEtki, etkinAtama, bulusEtkileri, etkinDegistiriciler, sinirla,
  bildir, zar, serbestAnahtar, onderSeferde,
} from './yardimci.js';
import { kahramanSavunmaKalemleri } from './kahraman.js';
import { komsuIttifakKalemleri } from './komsu_temel.js';
import { huzurEkle } from './huzur.js';
import { kayipUygula } from './nufus.js';
import { sinirKenarinda } from '../world/yerlestir.js';
import { cevreKapali } from '../world/cevre.js';

export function saldiriGucu(d) {
  return mevcutCag(d).saldiriTaban + Math.floor((d.tur - d.cagBaslangicTuru) / SALDIRI_TUR_BOLEN);
}

// savunma = önder (1 + buluş) + Σ bina.savunma × Sv + Σ işçi × isciSavunma × buluş çarpanı + bekçi + çevre + değiştiriciler.
// Çevre parçaları (Çit, Sur Parçası; `cevre: true`) bina döngüsünde değil, çevre kaleminde sayılır (TEHDIT.md §12):
//   min(Σ parça (savunma + sınır kenarında savunmaKenar) × Sv, CEVRE.parcaTavan[çağ]) + kapalı halka bonusu.
// `savunmaDokum` kalem listesi döner; `savunmaHesapla` = kalemlerin toplamı (tek kaynak, testle denetlenir).
export function bekciDegeri(d) {
  let c = 1;
  for (const e of bulusEtkileri(d, 'bekciCarpani')) if (e.hedef === 'bekci') c *= e.deger;
  return BEKCI_DEGER * c;
}

export function cevreSavunmasi(d) {
  let toplam = 0;
  for (const b of calisanBinalar(d)) {
    const t = BINA[b.id];
    if (!t.cevre) continue;
    toplam += (t.savunma || 0) * seviyeEtki(b);
    if (t.savunmaKenar && sinirKenarinda(d, b)) toplam += t.savunmaKenar * seviyeEtki(b);
  }
  const tavan = CEVRE.parcaTavan[d.cag] ?? 0;
  const parca = Math.min(toplam, tavan);
  const c = toplam > 0 ? cevreKapali(d) : { kapali: false, ic: 0, toplam: 0 };
  const oran = c.kapali && c.toplam > 0 ? c.ic / c.toplam : 0;
  const halka = c.kapali ? Math.round((CEVRE.kapaliBonus[d.cag] ?? 0) * oran * 100) / 100 : 0;
  return { parca, parcaHam: toplam, tavan, kapali: c.kapali, ic: c.ic, toplamBina: c.toplam, halka };
}

// Savunma değiştiricilerinin döküm adları (arayüz).
export const DEGISTIRICI_AD = { tahkimat: 'Acil tahkimat', nobet: 'Önder nöbette', turnuva: 'Turnuva' };

export function savunmaDokum(d) {
  const k = [];
  let onder = ONDER_SAVUNMA;
  for (const e of bulusEtkileri(d, 'savunma')) if (e.hedef === 'onder') onder += e.deger;
  // AKSIYON §7: seferdeki önder, işçi (etkinAtama'dan düşer) ve kahraman köy savunmasına sayılmaz.
  if (!onderSeferde(d)) k.push({ id: 'onder', ad: 'Önder', deger: onder });
  const etkin = etkinAtama(d);
  for (const b of calisanBinalar(d)) {
    const t = BINA[b.id];
    if (t.cevre) continue;
    let s = (t.savunma || 0) * seviyeEtki(b);
    if (t.savunmaKenar && sinirKenarinda(d, b)) s += t.savunmaKenar * seviyeEtki(b);
    if (t.isciSavunma) {
      let c = 1;
      for (const e of bulusEtkileri(d, 'isciSavunmaCarpani')) if (e.hedef === `isciTuru:${t.isciTuru}`) c *= e.deger;
      s += (etkin[b.uid] || 0) * t.isciSavunma * c;
    }
    if (s) k.push({ id: `bina:${b.uid}`, ad: t.ad, deger: s, uid: b.uid });
  }
  const bekci = etkin[serbestAnahtar('bekci')] || 0;
  if (bekci) k.push({ id: 'bekci', ad: `Bekçi ×${bekci}`, deger: bekci * bekciDegeri(d) });
  const c = cevreSavunmasi(d);
  if (c.parca) k.push({ id: 'cevre', ad: 'Çit / sur', deger: c.parca, tavan: c.tavan });
  if (c.halka) k.push({ id: 'halka', ad: 'Kapalı çevre', deger: c.halka, ic: c.ic, toplam: c.toplamBina });
  k.push(...kahramanSavunmaKalemleri(d), ...komsuIttifakKalemleri(d));
  const ordu = orduSavunmaKalemi(d);
  if (ordu) k.push(ordu);
  const silah = d.tehdit?.aktif?.silah || 0;
  if (silah) k.push({ id: 'silah', ad: `Silahlı halk ×${silah}`, deger: silah });
  for (const m of etkinDegistiriciler(d)) {
    if (m.etki?.savunma) k.push({ id: `degistirici:${m.id}`, ad: DEGISTIRICI_AD[m.id] || m.id, deger: m.etki.savunma });
  }
  return k;
}

export function savunmaHesapla(d) {
  return savunmaDokum(d).reduce((a, x) => a + x.deger, 0);
}

// Kopya üstünde: her kaynağın `oran`ı kadar kayıp.
export function kaynakOranKaybi(d, oran) {
  for (const r of Object.keys(d.kaynaklar)) d.kaynaklar[r] = d.kaynaklar[r] * (1 - oran);
}

// Kopya üstünde: `adet` rastgele bina hasarlı olur (merkez, inşaattaki ve zaten hasarlı binalar hariç; binaId ile süzülebilir).
export function rastgeleHasar(d, adet, binaId, bildirimler) {
  for (let i = 0; i < adet; i++) {
    const aday = d.binalar.filter((b) => BINA[b.id].tur !== 'merkez' && binaKurulu(d, b) && !b.hasarli && (!binaId || b.id === binaId));
    if (!aday.length) return;
    const b = aday[Math.floor(zar(d) * aday.length)];
    b.hasarli = true;
    bildir(bildirimler, 'hasar', `${BINA[b.id].ad} hasar gördü.`, 'uyari', { uid: b.uid });
  }
}

// Kopya üstünde: §6.3 savunma testi. Dönüş: 'puskurtme' | 'kismi' | 'yenilgi'.
export function savunmaTesti(d, bildirimler, guc = saldiriGucu(d)) {
  const s = savunmaHesapla(d);
  if (s >= guc) {
    huzurEkle(d, SALDIRI_PUSKURTME_HUZUR);
    bildir(bildirimler, 'saldiri', `Saldırı püskürtüldü (savunma ${s} / güç ${guc}).`, 'iyi');
    return 'puskurtme';
  }
  if (s >= guc / 2) {
    kaynakOranKaybi(d, SALDIRI_KISMI_KAYIP);
    bildir(bildirimler, 'saldiri', `Saldırı kısmen durduruldu (savunma ${s} / güç ${guc}); kaynakların %${SALDIRI_KISMI_KAYIP * 100}'u kayıp.`, 'uyari');
    return 'kismi';
  }
  kaynakOranKaybi(d, SALDIRI_TAM_KAYIP);
  kayipUygula(d, SALDIRI_TAM_NUFUS, 'saldırı', bildirimler);
  rastgeleHasar(d, SALDIRI_TAM_HASAR, null, bildirimler);
  bildir(bildirimler, 'saldiri', `Saldırı püskürtülemedi (savunma ${s} / güç ${guc}).`, 'uyari');
  return 'yenilgi';
}

// §6.4: clamp(nüfus / (15 + Σ hastalık kapasitesi), 0,5, 3); kışta ısınma eksikse ×2.
export function hastalikCarpani(d) {
  let kap = 0;
  const etkin = etkinAtama(d);
  for (const b of d.binalar) {
    const t = BINA[b.id];
    if (!binaKurulu(d, b) || b.hasarli) continue;
    if (t.hastalikKapasitesiIscisiz !== undefined && !(etkin[b.uid] > 0)) kap += t.hastalikKapasitesiIscisiz;
    else kap += t.hastalikKapasitesi || 0;
  }
  let c = sinirla(d.nufus / (HASTALIK_TABAN + kap), HASTALIK_MIN, HASTALIK_MAX);
  if (d.istatistik?.sonTur?.isinmaEksik) c *= HASTALIK_ISINMA_EKSIK;
  return c;
}

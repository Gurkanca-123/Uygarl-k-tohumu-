// Saldırı ve hastalık riski (TASARIM §6.3, §6.4). Saf.
import {
  ONDER_SAVUNMA, SALDIRI_TUR_BOLEN, SALDIRI_PUSKURTME_HUZUR, SALDIRI_KISMI_KAYIP, SALDIRI_TAM_KAYIP, SALDIRI_TAM_NUFUS,
  SALDIRI_TAM_HASAR, HASTALIK_TABAN, HASTALIK_MIN, HASTALIK_MAX, HASTALIK_ISINMA_EKSIK,
} from '../data/denge.js';
import {
  BINA, mevcutCag, calisanBinalar, binaKurulu, seviyeEtki, etkinAtama, bulusEtkileri, etkinDegistiriciler, sinirla,
  bildir, zar,
} from './yardimci.js';
import { huzurEkle } from './huzur.js';
import { kayipUygula } from './nufus.js';

export function saldiriGucu(d) {
  return mevcutCag(d).saldiriTaban + Math.floor((d.tur - d.cagBaslangicTuru) / SALDIRI_TUR_BOLEN);
}

// savunma = önder (1 + buluş) + Σ bina.savunma × Sv + Σ işçi × isciSavunma × buluş çarpanı + değiştiriciler.
// TODO(aşama 3): Sur Parçası "açık alan kenarında +1" (savunmaKenar) ızgara gerektirir; şimdilik taban değer.
export function savunmaHesapla(d) {
  let s = ONDER_SAVUNMA;
  for (const e of bulusEtkileri(d, 'savunma')) if (e.hedef === 'onder') s += e.deger;
  const etkin = etkinAtama(d);
  for (const b of calisanBinalar(d)) {
    const t = BINA[b.id];
    s += (t.savunma || 0) * seviyeEtki(b);
    if (t.isciSavunma) {
      let c = 1;
      for (const e of bulusEtkileri(d, 'isciSavunmaCarpani')) if (e.hedef === `isciTuru:${t.isciTuru}`) c *= e.deger;
      s += (etkin[b.uid] || 0) * t.isciSavunma * c;
    }
  }
  for (const m of etkinDegistiriciler(d)) s += m.etki?.savunma || 0;
  return s;
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

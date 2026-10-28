// Tüketim (TASARIM §1.2 g–h, §2.3, §2.5, §7.3.3): yiyecek, kış ısınması, yiyecek bozulması. Saf.
import { YIYECEK_TUKETIM, KEMER_SIKMA, BOZULMA, BOZULMA_MIN } from '../data/denge.js';
import {
  BINA, kopya, mevsimTanim, binaKurulu, bulusEtkileri, etkinDegistiriciler, sonTur, bildir, seferdekiKisi,
} from './yardimci.js';

// Kemer sıkma (acTur ≥ 1) ve değiştirici `tuketim` çarpanları dahil yiyecek ihtiyacı. Seferdekiler köyde yemez (erzak peşin; AKSIYON §2.2).
export function yiyecekIhtiyaci(d) {
  let c = Math.max(0, d.nufus - seferdekiKisi(d)) * YIYECEK_TUKETIM * (d.acTur >= 1 ? KEMER_SIKMA : 1);
  for (const m of etkinDegistiriciler(d)) if (m.etki?.tuketim?.kaynak === 'yiyecek') c *= m.etki.tuketim.carpan;
  return c;
}

// Kışta her kurulu, hasarsız konut `isinma` kadar odun yakar.
// TODO(tasarim): hasarlı konut ısınma ister mi yazılmamış → hasarlı konut barınak vermez ve yakmaz varsayıldı.
export function isinmaIhtiyaci(d, tur = d.tur) {
  if (!mevsimTanim(tur).isinma) return 0;
  let c = 0;
  for (const b of d.binalar) {
    const t = BINA[b.id];
    if (t.tur === 'konut' && binaKurulu(d, b) && !b.hasarli) c += t.isinma || 0;
  }
  for (const m of etkinDegistiriciler(d)) if (m.etki?.tuketim?.kaynak === 'odun') c *= m.etki.tuketim.carpan;
  return c;
}

// Adım g: tüketim. Karşılanmayan ihtiyaç stoğu 0'a indirir ve bu turun açlık / ısınma eksikliği bayrağını yakar.
export function adimTuketim(durum, bildirimler = []) {
  const d = kopya(durum);
  const st = sonTur(d);
  const yemek = yiyecekIhtiyaci(d);
  const stok = d.kaynaklar.yiyecek || 0;
  st.tuketim.yiyecek = (st.tuketim.yiyecek || 0) + Math.min(stok, yemek);
  if (stok + 1e-9 < yemek) {
    d.kaynaklar.yiyecek = 0;
    st.aclik = true;
    bildir(bildirimler, 'aclik', `Yiyecek yetmedi (${Math.round((yemek - stok) * 10) / 10} eksik). Halk aç.`, 'uyari');
  } else {
    d.kaynaklar.yiyecek = stok - yemek;
  }
  const odun = isinmaIhtiyaci(d);
  if (odun > 0) {
    const os = d.kaynaklar.odun || 0;
    st.tuketim.odun = (st.tuketim.odun || 0) + Math.min(os, odun);
    if (os + 1e-9 < odun) {
      d.kaynaklar.odun = 0;
      st.isinmaEksik = true;
      bildir(bildirimler, 'isinma_eksik', 'Isınma için odun yetmedi; halk üşüyor.', 'uyari');
    } else {
      d.kaynaklar.odun = os - odun;
    }
  }
  return d;
}

// §2.3: oran = max(BOZULMA_MIN, BOZULMA − Σ bozulmaAzaltma − buluş bozulma etkileri).
export function bozulmaOrani(d) {
  let oran = BOZULMA;
  for (const b of d.binalar) if (binaKurulu(d, b)) oran -= BINA[b.id].bozulmaAzaltma || 0;
  for (const e of bulusEtkileri(d, 'bozulma')) if (e.hedef === 'yiyecek') oran -= e.deger;
  return Math.max(BOZULMA_MIN, oran);
}

// Adım h: yiyecek bozulması.
export function adimBozulma(durum) {
  const d = kopya(durum);
  const bozulan = (d.kaynaklar.yiyecek || 0) * bozulmaOrani(d);
  d.kaynaklar.yiyecek = (d.kaynaklar.yiyecek || 0) - bozulan;
  const st = sonTur(d);
  st.bozulan = bozulan;
  return d;
}

// Komşu temel hesapları (docs/AKSIYON.md §4.2): güç, ilişki (tek kaynak), etiket, tehdit motoruna etkiler, ittifak savunması.
// Ayrı modül: savunma.js ve tehdit.js buradan okur; komsu.js (yapay zekâ, komutlar) savunma.js'e bağlıdır → döngü yok.
// İlişki: komşunun `tehditKaynak`ı varsa (ilk komşu: 'komsu') puan `d.tehdit.iliski[kaynak]`'tadır (TEHDIT §7; elçi/haraç/
// püskürtme oradan değiştirir); `k.iliski` aynası her değişimde güncellenir. Kaynaksız komşuda yalnız `k.iliski`.
import { KOMSULAR, MIZACLAR } from '../data/komsular.js';
import { KOMSU_GUC_TUR, KOMSU_ETIKET, KOMSU_ITTIFAK_SAVUNMA } from '../data/denge.js';
import { CAG, sinirla } from './yardimci.js';

export const KOMSU = Object.fromEntries(KOMSULAR.map((k) => [k.id, k]));
export const komsuBul = (d, id) => (d.komsular || []).find((k) => k.id === id);
const kaynakOf = (k) => KOMSU[k.id]?.tehditKaynak || null;

export function komsuIliski(d, k) {
  const kay = kaynakOf(k);
  if (kay && d.tehdit) return d.tehdit.iliski?.[kay] ?? k.iliski ?? 0;
  return k.iliski ?? 0;
}
// Kopya üstünde. Dönüş: yeni ilişki.
export function iliskiDegistir(d, k, n) {
  const yeni = sinirla(komsuIliski(d, k) + n, -100, 100);
  const kay = kaynakOf(k);
  if (kay && d.tehdit) d.tehdit.iliski = { ...d.tehdit.iliski, [kay]: yeni };
  k.iliski = yeni;
  return yeni;
}
export const iliskiEtiketi = (n) => KOMSU_ETIKET.find((e) => n >= e.min);

// komsuGuc = ceil(cag.saldiriTaban × mizac.guc × (1 + 0,02 × komşuÇağİçiTur)).
export function komsuGucu(d, k) {
  const cag = CAG[k.cag] || CAG[d.cag];
  return Math.ceil(cag.saldiriTaban * (MIZACLAR[k.mizac]?.guc ?? 1) * (1 + KOMSU_GUC_TUR * Math.max(0, d.tur - (k.cagTur ?? 0))) - 1e-9);
}

// Niyet etkileri tehdit motoruna (§4.3 kural 4–5): { agirlik (komşu kaynaklı tehdit ağırlığı ×), gerginlik (artış ×), kesin }.
export function komsuTehditEtkisi(d) {
  let agirlik = 1, gerginlik = 1, kesin = false;
  for (const k of d.komsular || []) {
    const e = k.niyet?.etki;
    if (!e) continue;
    agirlik = Math.max(agirlik, e.tehditAgirlik || 1);
    gerginlik = Math.max(gerginlik, e.gerginlik || 1);
    if (e.kesin) kesin = true;
  }
  return { agirlik, gerginlik, kesin };
}

// İttifak: tehdit varışında komşudan savunma +ceil(güç × 0,3) (savunma dökümü kalemleri).
export function komsuIttifakKalemleri(d) {
  return (d.komsular || []).filter((k) => k.durum === 'ittifak').map((k) => ({
    id: `komsu:${k.id}`, ad: `Müttefik ${KOMSU[k.id]?.ad ?? k.id}`, deger: Math.ceil(komsuGucu(d, k) * KOMSU_ITTIFAK_SAVUNMA - 1e-9),
  }));
}

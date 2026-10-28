// Toast süzgeci (saf; DOM yok, testlenebilir).
// Toast gürültüsü: Günlük'e yazılan ama açılır bildirim vermeyen kodlar (ayrıca bildirimde `sessiz: true` ise de gösterilmez).
const TOAST_SESSIZ = new Set(['sefer_isaret_kayboldu', 'hedef_gorev_basarisiz', 'kahraman_iyilesti', 'kahraman_esya', 'dogum']);
// Tekrarlayan uyarılar: aynı kod en az bu kadar tur arayla gösterilir (Günlük'te hepsi durur).
const TOAST_SEYREK = { depo_dolu: 6, isinma_eksik: 6 };
// Aynı türden bildirimleri tek satırda toplar ("Kulübe tamamlandı. (+1 benzeri)"); en yüksek seviye korunur.
// ctx = { tur, son } (son: kod → son gösterilen tur; çağıran tutar) — verilmezse seyreltme yapılmaz.
export function toastSuz(liste, ctx = null) {
  const gruplar = new Map();
  for (const b of liste || []) {
    if (b.sessiz || TOAST_SESSIZ.has(b.kod)) continue;
    const ara = TOAST_SEYREK[b.kod];
    if (ara && ctx) {
      if (ctx.tur - (ctx.son[b.kod] ?? -99) < ara) continue;
      ctx.son[b.kod] = ctx.tur;
    }
    const g = gruplar.get(b.kod);
    if (!g) gruplar.set(b.kod, { ...b, adet: 1 });
    else { g.adet += 1; if (b.seviye === 'uyari' || (b.seviye === 'iyi' && g.seviye === 'bilgi')) g.seviye = b.seviye; }
  }
  return [...gruplar.values()].map(({ adet, ...b }) => (adet > 1 ? { ...b, metin: `${b.metin} (+${adet - 1} benzeri)` } : b));
}

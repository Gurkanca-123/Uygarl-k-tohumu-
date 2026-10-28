// Savaş birlikleri ve düşman profilleri (docs/SAVAS.md §2, şema §10). Denge buradan değişir; çekirdek (src/core/savas.js) okur.
// BIRIMLER: { id, ad, cagMin, gerekir:{bina}, can, saldiri, zirh, menzil (hücre), aralik (tick), hiz, seferGuc, sinif:
//   'piyade'|'okcu'|'atli'|'kusatma', egitim:{maliyet, sure}, talim:{[T]: maliyet}, gorunum:{[T]: parcaSeti}, acik (F1'de oynanabilir) }.
// F1: yalnız `mizrakci` ve `okcu` açık (T1). Kalan satırlar şema (acik:false; F2–F4).
function birim(b) {
  return { gerekir: {}, egitim: null, talim: {}, gorunum: {}, acik: false, ...b };
}

export const BIRIM_SINIFLARI = ['piyade', 'okcu', 'atli', 'kusatma'];
// Düşman profilleri (karşıtlık sütunları).
export const DUSMAN_PROFILLERI = ['piyade', 'okcu', 'atli', 'canavar', 'yapi'];

export const BIRIMLER = [
  birim({ id: 'mizrakci', ad: 'Mızrakçı', cagMin: 'gocebe', can: 30, saldiri: 5, zirh: 3, menzil: 1, aralik: 2, hiz: 1, seferGuc: 1,
    sinif: 'piyade', acik: true,
    egitim: { maliyet: { yiyecek: 3, odun: 1 }, sure: 1 },
    talim: { 2: { odun: 8, alet: 4 }, 3: { metal: 6, yiyecek: 10 }, 4: { metal: 10, sikke: 15 }, 5: { metal: 15, sikke: 30 } },
    gorunum: { 1: 'deri_yelek+sivri_mizrak', 2: 'kemik_uc+hasir_kalkan', 3: 'bronz_migfer+yuvarlak_kalkan', 4: 'sorguc+dikdortgen_kalkan', 5: 'zincir+sancakli_mizrak' } }),
  birim({ id: 'okcu', ad: 'Okçu', cagMin: 'gocebe', can: 18, saldiri: 6, zirh: 1, menzil: 4, aralik: 3, hiz: 1, seferGuc: 1,
    sinif: 'okcu', acik: true,
    egitim: { maliyet: { odun: 2, deri: 1 }, sure: 2 },
    talim: { 2: { odun: 10, alet: 4, deri: 2 }, 3: { metal: 6, yiyecek: 10, odun: 2 }, 4: { metal: 10, sikke: 15, odun: 2 }, 5: { metal: 15, sikke: 30, odun: 2 } },
    gorunum: { 1: 'sapan+kisa_yay', 2: 'asi_boyasi', 3: 'kompozit_yay', 4: 'pelerin', 5: 'uzun_yay' } }),
  // ---------- Şema hazır, F1'de kapalı ----------
  birim({ id: 'kalkanli', ad: 'Kalkanlı', cagMin: 'bronz', gerekir: { bina: 'demirci' }, can: 42, saldiri: 3, zirh: 7, menzil: 1, aralik: 3,
    hiz: 0.8, seferGuc: 1.2, sinif: 'piyade', egitim: { maliyet: { metal: 2 }, sure: 2 }, okAzalt: 0.6 }),
  birim({ id: 'suvari', ad: 'Süvari', cagMin: 'antik', gerekir: { bina: 'ahir' }, can: 34, saldiri: 7, zirh: 4, menzil: 1, aralik: 2,
    hiz: 2, seferGuc: 1.5, sinif: 'atli', egitim: { maliyet: { yiyecek: 8, metal: 1 }, sure: 3 } }),
  birim({ id: 'kusatma', ad: 'Kuşatma', cagMin: 'ortacag', gerekir: { bina: 'kusatma_atolyesi' }, can: 20, saldiri: 12, zirh: 2, menzil: 6,
    aralik: 6, hiz: 0, seferGuc: 2, sinif: 'kusatma', egitim: { maliyet: { odun: 15, metal: 2 }, sure: 3 } }),
];

// Karşıtlık çarpanı K[saldıran sınıfı][hedef profili] (§2.2; uygun ×1,25, ters ×0,8).
export const KARSITLIK = {
  piyade: { piyade: 1, okcu: 1, atli: 1.25, canavar: 1.25, yapi: 0.5 },
  okcu: { piyade: 1.25, okcu: 1, atli: 0.8, canavar: 1, yapi: 0.3 },
  atli: { piyade: 0.8, okcu: 1.25, atli: 1, canavar: 0.8, yapi: 0.3 },
  kusatma: { piyade: 0.8, okcu: 0.8, atli: 0.5, canavar: 0.5, yapi: 3 },
};
// Konum çarpanı konumC[birim][sıra] (ön / orta / arka, §5.3).
export const KONUM_C = {
  mizrakci: [1.10, 1.00, 0.85],
  okcu: [0.80, 1.00, 1.10],
  kalkanli: [1.15, 0.95, 0.80],
  suvari: [1.05, 1.00, 0.90],
  kusatma: [0.70, 0.85, 1.10],
};
// Birlik kademesi tavanı: çağ → en yüksek T (§2.3; Sanayi T6, Modern T7 yalnız veri).
export const KADEME_TAVAN = { gocebe: 1, tasdevri: 2, bronz: 3, antik: 4, ortacag: 5 };

// Düşmanlar: { id, ad, profil, can, saldiri, zirh, aralik, hiz, menzil, ozel:[{ id, ad, her|tick, etki }], ipucu }.
// Çekirdek tabanı ekip gücüne göre ölçekler (taban oranlar profili belirler); gizli çarpan m kademeyi kilitler (§6.1).
export const DUSMANLAR = [
  { id: 'ayi', ad: 'Boz Ayı', profil: 'canavar', can: 140, saldiri: 9, zirh: 4, aralik: 3, hiz: 1, menzil: 1, acik: true,
    ozel: [
      { id: 'pence', ad: 'Pençe Savuruşu', her: 4, etki: { hedef: 'on_yay', adet: 3, carpan: 0.7 } },
      { id: 'hamle', ad: 'Hamle', tick: 10, etki: { hedef: 'orta', carpan: 1.2 } },
    ],
    ipucu: 'Ayı ön sırayı pençesiyle savurur; 5. saniyede ortaya atlar. Mızrakçıları öne, okçuları arkaya koy.' },
  { id: 'ayi_yavrusu', ad: 'Ayı Yavrusu', profil: 'canavar', can: 30, saldiri: 4, zirh: 1, aralik: 2, hiz: 1, menzil: 1, acik: false, ozel: [] },
  { id: 'kurt', ad: 'Kurt', profil: 'canavar', can: 22, saldiri: 5, zirh: 1, aralik: 2, hiz: 2, menzil: 1, acik: false,
    ozel: [{ id: 'dolan', ad: 'Kanattan Dolan', tick: 2, etki: { hedef: 'kanat' } }] },
];

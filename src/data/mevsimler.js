// Mevsimler ve mevsim çarpanları (TASARIM §1, §2.4). Etiketi olmayan üretim her mevsim 1,0.
// Kışta `tarim` 0; Üçlü Ekim buluşu bunu 0,3 yapar (buluslar.js `mevsimCarpani` etkisi).
export const MEVSIMLER = [
  { id: 'bahar', ad: 'Bahar', carpan: { toplama: 1.0, avcilik: 1.0, tarim: 1.0,  balik: 1.0 }, isinma: false },
  { id: 'yaz',   ad: 'Yaz',   carpan: { toplama: 1.25, avcilik: 1.0, tarim: 1.25, balik: 1.0 }, isinma: false },
  { id: 'guz',   ad: 'Güz',   carpan: { toplama: 1.0, avcilik: 1.1, tarim: 1.5,  balik: 1.0 }, isinma: false },
  { id: 'kis',   ad: 'Kış',   carpan: { toplama: 0.5, avcilik: 0.8, tarim: 0,    balik: 0.8 }, isinma: true },
];

export const MEVSIM_ETIKETLERI = ['toplama', 'avcilik', 'tarim', 'balik'];

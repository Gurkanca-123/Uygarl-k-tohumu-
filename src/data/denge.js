// Ayar sabitleri (TASARIM §7.5 + metindeki diğer sayılar). Denge buradan değişir, kodda sayı olmaz.

// --- §7.5 ---
export const YIYECEK_TUKETIM = 1;
export const MEVSIM_TUR = 5;
export const YIL_MEVSIM = 4;              // §1: 1 yıl = 4 mevsim = 20 gün
export const BOZULMA = 0.04;
export const BOZULMA_MIN = 0.01;
export const BOZULMA_PUAN = 0.01;         // §2.3: "−1 puan" = 0,01
export const HUZUR_BASLANGIC = 60;
export const HUZUR_KAYMA = 5;
export const MALIYET_K_KONUT = 1.10;
export const MALIYET_K = 1.15;
export const SEVIYE_CARPAN = [1, 1.5, 2];
export const YUKSELTME_MALIYET = [1.5, 2.5];  // Sv2, Sv3 (taban × …)
export const YIKIM_IADE = 0.5;
export const ONARIM = 0.25;
export const ONARIM_SURE = 1;
export const BITISIKLIK_MAX = 0.5;
export const KAYIP_PENCERE = 3;
export const KAYIP_ORAN = 0.05;
export const NUFUS_MIN = 2;
export const ACLIK_OLUM_TUR = 3;
export const KEMER_SIKMA = 0.75;
export const KEMER_SIKMA_SERBEST = 1.5;   // §7.3.3: serbest işler +%50
export const YORGUNLUK_MAX = 6;
export const ILK_OLAY_TUR = 6;          // olayın gösterilebileceği ilk GÜN (takvim.gun, 1'den): gün 1–5 (tur 0–4) olaysız (§6.2)
export const OLAY_BEKLEME = 15;
export const YOL_CEZA = 0.75;
export const YOL_CAG = 'bronz';           // §3.4: bu çağın (ve sonrakilerin) binaları yola bağlı olmalı

// --- §3.5 seviye etkileri (Sv1/Sv2/Sv3) ---
export const SEVIYE_ISCI_EK = [0, 1, 2];
export const SEVIYE_KAPASITE_EK = [0, 1, 2];
export const SEVIYE_ETKI = [1, 1.5, 2];   // huzur / savunma / depo

// --- §2.6 huzur ---
export const HUZUR_HEDEF_TABAN = 50;
export const HUZUR_AYNI_TUR = 0.5;        // aynı türden 2. ve sonraki binalar %50 sayılır
export const HUZUR_BARINAKLI = 5;
export const HUZUR_EVSIZ = -5;            // evsiz başına
export const HUZUR_ACLIK = -15;
export const HUZUR_ISINMA_EKSIK = -10;
export const HUZUR_ISSIZ = -2;            // işsiz başına
export const HUZUR_ATOLYE_GURULTU = -2;   // §3.3, Bronz+
export const ATOLYE_GURULTU_CAG = 'bronz'; // §3.3: atölye gürültüsü bu çağdan itibaren
export const HUZUR_CARPAN = [             // §2.4 (yukarıdan aşağı ilk sağlanan)
  { min: 70, carpan: 1.10 },
  { min: 30, carpan: 1.00 },
  { min: 15, carpan: 0.85 },
  { min: 0,  carpan: 0.70 },
];

// --- §2.5 nüfus ---
export const DOGUM_HUZUR_MIN = 40;
export const DOGUM_YIYECEK_KISI = 2;      // yiyecek ≥ nüfus × 2
export const DOGUM_NUFUS_BOLEN = 30;      // doğan = min(1 + floor(nüfus/30), boşBarınak)
export const GOC_HUZUR_ESIK = 15;
export const GOC_OLASILIK = 0.2;
export const YENI_KISI_ISI = 'toplayici';

// --- §2.2 serbest işler ---
export const SERBEST_ISLER = [
  { id: 'toplayici', ad: 'Toplayıcı', uretim: { yiyecek: 2 },               mevsimEtiketi: 'toplama' },
  { id: 'avci',      ad: 'Avcı',      uretim: { yiyecek: 1, deri: 0.5 },    mevsimEtiketi: 'avcilik' },
  { id: 'oduncu',    ad: 'Oduncu',    uretim: { odun: 1 },                  mevsimEtiketi: null },
  { id: 'tasci',     ad: 'Taşçı',     uretim: { tas: 1 },                   mevsimEtiketi: null }, // Taş Yontma: 1,5
];

// --- §4.4 vergi ---
export const VERGI = [
  { id: 'yok',    ad: 'Yok',    kisiBasi: 0,    huzur: 0 },
  { id: 'dusuk',  ad: 'Düşük',  kisiBasi: 0.1,  huzur: -3 },
  { id: 'yuksek', ad: 'Yüksek', kisiBasi: 0.25, huzur: -10 },
];

// --- §1.3 önder ---
export const EYLEM_OLCEK_ADIM = 0.5;      // × (1 + 0,5 × çağSırası)
export const VARSAYILAN_EYLEM = 'dinlen';

// --- §6 olaylar ---
export const OLAY_VARSAYILAN_AGIRLIK = 10;     // §6.1 örneğindeki değer
export const SARMAL_KOTU_CARPAN = 0.5;         // §6.2
export const SARMAL_HUZUR_ESIK = 30;
export const TICARET_CARPAN_MAX = 3;           // §4.5 Han
export const SALDIRI_TUR_BOLEN = 10;           // §6.3 floor(cagIcindekiTur / 10)
export const ONDER_SAVUNMA = 1;                // Mızrak Ucu ile +1 → 2
export const SALDIRI_PUSKURTME_HUZUR = 5;
export const SALDIRI_KISMI_KAYIP = 0.10;       // savunma ≥ güç/2
export const SALDIRI_TAM_KAYIP = 0.25;
export const SALDIRI_TAM_NUFUS = 1;
export const SALDIRI_TAM_HASAR = 1;
export const HASTALIK_TABAN = 15;              // §6.4
export const HASTALIK_MIN = 0.5;
export const HASTALIK_MAX = 3;
export const HASTALIK_ISINMA_EKSIK = 2;

// --- §3 ızgara / yol ---
export const HARITA_BOYUT = 16;
export const YOL_MALIYET = { tas: 1 };
export const BOYUTLAR = [[1, 1], [2, 2], [3, 3]];

// --- §7.4 başlangıç ---
export const BASLANGIC_KAYNAK = { yiyecek: 10, odun: 5, tas: 0, deri: 0 };
export const BASLANGIC_NUFUS = 3;

// --- §8 kayıt ---
export const KAYIT_ANAHTAR_OTOMATIK = 'uygarlik-tohumu:otomatik';
export const KAYIT_ANAHTAR_ELLE = 'uygarlik-tohumu:elle';
export const KAYIT_BOZUK_EKI = ':bozuk';
export const MEVSIM_SONU_MAX_TUR = 5;

// --- Aşama 2 motor kararları (belgede sayı yok; TODO(tasarim) varsayımları) ---
// Olay koşullarındaki `turMin` ve ILK_OLAY_TUR, olayın GÖSTERİLECEĞİ günle (takvim.gun, 1'den) karşılaştırılır.
// Aynı kaynaktan iki "iyi sonuç" bonusu (Hayvan İzleri + Gözcü Direği) toplanır.
export const KESIF_BONUS_TOPLANIR = true;

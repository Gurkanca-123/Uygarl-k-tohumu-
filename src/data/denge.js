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
export const TASIMA_MALIYET = 0.2; // taşıma: taban maliyetin %20'si (yıkıp yeniden kurmaktan çok ucuz; seviye/işçi korunur)
export const EVRIM_MALIYET = 0.70;   // Bina evrimi: hedef binanın normal inşa maliyetinin %70'i (yerinde dönüşüm; yıkıp yapmaktan ucuz)
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
// Çocuklar (kullanıcı kararı 2026-10-30: "çocuklar çalışmasın"): doğumdan COCUK_SURE tur çocuktur; çalışmaz (iş yuvası/serbest iş/işsiz sayılmaz),
// yiyecek tüketir, nüfusa ve barınmaya sayılır. Başlangıç ve göçmen kişileri yetişkindir (doğum = tur − YETISKIN_YAS).
export const COCUK_SURE = 5;
export const YETISKIN_YAS = 100;

// --- §2.2 serbest işler ---
export const SERBEST_ISLER = [
  { id: 'toplayici', ad: 'Toplayıcı', uretim: { yiyecek: 2 },               mevsimEtiketi: 'toplama' },
  { id: 'avci',      ad: 'Avcı',      uretim: { yiyecek: 1, deri: 0.5 },    mevsimEtiketi: 'avcilik' },
  { id: 'oduncu',    ad: 'Oduncu',    uretim: { odun: 1 },                  mevsimEtiketi: null },
  { id: 'tasci',     ad: 'Taşçı',     uretim: { tas: 1 },                   mevsimEtiketi: null }, // Taş Yontma: 1,5
  // TEHDIT.md §4.2: Bekçi üretmez; kişi başı BEKCI_DEGER savunma (Mızrak Ucu `bekciCarpani` ×1,5 → 0,75).
  { id: 'bekci',     ad: 'Bekçi',     uretim: {},                           mevsimEtiketi: null, savunma: true },
];

// İş dağıtımı önceliği (boştakileri dağıtırken seçilen kaynağın ağırlığı ×3).
export const ISDAGIT_ONCELIKLER = ['dengeli', 'yiyecek', 'odun', 'tas'];

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

// --- Dış tehditler (docs/TEHDIT.md §3–§6; motor src/core/tehdit.js, tablo src/data/tehditler.js) ---
export const TEHDIT_ILK_GUN = 12;           // gerginlik bu günden önce artmaz
export const TEHDIT_DOGUM_ILK_GUN = 15;     // ilk tehdit en erken bu gün doğar (uyarı ≥2 → varış ≥ gün 17)
export const TEHDIT_BASLANGIC = 40;         // yeni oyunda gerginlik
export const TEHDIT_DOGUM_ESIK = 100;
export const TEHDIT_BEKLE_ESIK = 95;        // doğum engelliyken (açlık, düşük huzur, nefes, aday yok) gerginlik burada bekler
export const TEHDIT_GERGINLIK_MIN = -50;
export const TEHDIT_KADEME = [               // §3.2 çip kademeleri (yukarıdan ilk sağlanan)
  { min: 80, id: 'gergin', ad: 'Gergin' },
  { min: 50, id: 'tedirgin', ad: 'Tedirgin' },
  { min: -Infinity, id: 'sakin', ad: 'Sakin' },
];
export const TEHDIT_CAG_SINIR = 50;         // çağ atlayınca gerginlik = min(gerginlik, 50)
export const TEHDIT_CAG_NEFES = 8;          // çağ atlayınca bu kadar tur yeni tehdit doğmaz
export const TEHDIT_GOC_NEFES = 10;         // v2 kaydından yüklenen oyunda nefes
export const TEHDIT_GUC_UST = 1.8;          // gucUst = ceil(saldiriTaban × 1,8 × zorluk.guc)
export const TEHDIT_BEKLEME = 30;
export const TEHDIT_ARALIK = [0.8, 1.2];    // güç bilinmiyorsa gösterilen aralık (doğumda sabit)
export const TEHDIT_SARMAL_HUZUR = 30;      // §5.3.4: huzur < 30 ya da açlıkta yeni tehdit doğmaz; gelen güç ×0,8
export const TEHDIT_SARMAL_GUC = 0.8;
export const TEHDIT_KORKU_HUZUR = -2;       // uyarı sürerken savunma < güç ise huzur hedefi
export const TEHDIT_PUSKURTME = { huzur: 5, gerginlik: -20, iliski: -5 };
export const TEHDIT_KISMI_GERGINLIK = 0;
export const TEHDIT_YENILGI = { gerginlik: -30, kademe: -0.15 };
export const TEHDIT_HARAC = { gerginlik: 0, iliski: 3, sayacMax: 3 };
export const TEHDIT_SAKLAN_GERGINLIK = 0;
export const TEHDIT_UN_MAX = 3;
export const TEHDIT_KADEME_SINIR = [0.85, 1.45];
export const TEHDIT_CEKICILIK = { taban: 0.85, doluluk: 0.3, un: 0.05, min: 0.8, max: 1.2 };
export const TEHDIT_GECMIS = 5;
export const TEHDIT_IZ_GERGINLIK = 15;      // Keşfet'in "kurt izi" zinciri motor açıkken olay yerine gerginlik ekler
export const TEHDIT_KOMSU_DOST = { iliski: 30, carpan: 0.6 };
export const TEHDIT_KIS_AZIGI = { yiyecekKisi: 2, odunIsinma: 3 };  // §5.3.2
export const TOPARLANMA = { id: 'toparlanma', sure: 5, etki: { huzur: 5, onarimBedava: true } };
export const MERHAMET_YENILGI = 2;          // art arda bu kadar yenilgi → sonraki tehdit Rahat çarpanlarıyla, uyarı +1
export const BEKCI_DEGER = 0.5;
// --- Tüm çağlar dilimi (2026-10-26: kullanıcı "Bronz/Demir'de tehdit yok, daha çok aksiyon") ---
// Çağ darbesi: ileri çağda servet daha çok göz çeker (gerginlik artışında doluluk ağırlığı `servet`: 0,8 + servet × doluluk),
// başarısız savunma daha ağır vurur (kayıp oranı × `kayip`, zorluk tavanı %25/%30 korunur; `huzur` yenilgide anlık, kısmide yarısı).
export const TEHDIT_CAG_DARBE = {
  gocebe: { servet: 0.4, kayip: 1, huzur: 0 },
  tasdevri: { servet: 0.45, kayip: 1, huzur: -3 },
  bronz: { servet: 0.55, kayip: 1.15, huzur: -5 },
  antik: { servet: 0.65, kayip: 1.3, huzur: -7 },
  ortacag: { servet: 0.75, kayip: 1.45, huzur: -10 },
};
// Nöbet Tut (önder eylemi `nobet_tut`, §4.2): +(taban + çağSırası) savunma, `sure` tehdit adımı boyunca.
export const NOBET = { taban: 1, sure: 2 };
// Silah Dağıt (komut `silahDagit`, §4.2): puan başı bedel; Taş Devri 2 alet, Bronz+ 1 metal; tehdit başına en çok floor(nüfus/2) puan.
export const SILAH = { tasdevri: { alet: 2 }, bronz: { metal: 1 }, antik: { metal: 1 }, ortacag: { metal: 1 }, nufusBolen: 2 };
// Elçi Gönder (önder eylemi `elci_gonder`, §5.1): p = clamp(taban + ilişki/100 + cag × çağSırası, min, max).
// Hediye: yiyecek × güç (Antik+: sikke × güç). Başarısızlıkta hediyenin `kayip` payı gider, tehdit sürer.
export const ELCI = { taban: 0.35, cag: 0.05, min: 0.2, max: 0.85, yiyecek: 2, sikke: 1, sikkeCag: 'antik', kayip: 0.5,
  basariIliski: 10, basarisizIliski: -5, gerginlik: 0 };
// TODO(tasarim): "haraç indirimi" — ilişki ≥ TEHDIT_KOMSU_DOST.iliski olan kaynağa haraç ×0,75 (belgede yoktu; görev isteği).
export const HARAC_DOST_CARPAN = 0.75;
// Kuşatma (§2.1, §11.1): varışta savunma < güç ise `sure` tur kuşatma evresi. Her tur ordunun gücü
// ceil(güç × asinma + duvar × surAsinma) aşınır (duvar = çit/sur parçası + kapalı halka savunması); savunma ≥ güç → kırılır.
// Kuşatma boyunca ticaret kapalı, üretim × uretim. Evre başında `karar: true` (arayüz durduran pencere: Dayan / Fidye).
export const KUSATMA = { surAsinma: 0.25, uretim: 0.85 };
export const KIYI_MESAFE = 3;              // korsanlar: yerleşim sınırına bu kadar karo yakın su
// Acil Tahkimat (§4.2; tehdit başına 1): çağa göre maliyet → savunma (değiştirici, kalan + 1 tur).
export const TAHKIMAT = {
  gocebe: { maliyet: { odun: 4 }, savunma: 2 },
  tasdevri: { maliyet: { odun: 6, tas: 2 }, savunma: 3 },
  bronz: { maliyet: { odun: 10, tas: 6 }, savunma: 5 },
  antik: { maliyet: { tas: 20, sikke: 10 }, savunma: 8 },
  ortacag: { maliyet: { tas: 30, sikke: 20 }, savunma: 12 },
};
// Zorluk (§6; kullanıcı kararı §11.4: varsayılan Normal, Barışçıl seçilebilir, yalnız yeni oyunda yükselir, her an düşer).
// turler null = hepsi. Rahat/Zor tanımlı (MVP+1; arayüz şimdilik Barışçıl/Normal sunar).
export const ZORLUK = {
  barisci: { ad: 'Barışçıl', sira: 0, turler: ['yirtici'], siklik: 0.6, guc: 0.75, uyariEk: 1, kayip: 0.5, kayipTavan: 0.25,
    olum: false, hasarMax: 0, haracKademe: 0.10, mvp: true },
  rahat: { ad: 'Rahat', sira: 1, turler: null, siklik: 0.75, guc: 0.8, uyariEk: 1, kayip: 0.6, kayipTavan: 0.25,
    olum: false, hasarMax: 1, haracKademe: 0.10 },
  normal: { ad: 'Normal', sira: 2, turler: null, siklik: 1, guc: 1, uyariEk: 0, kayip: 1, kayipTavan: 0.25,
    olum: true, hasarMax: 1, haracKademe: 0.15, mvp: true },
  zor: { ad: 'Zor', sira: 3, turler: null, siklik: 1.25, guc: 1.2, uyariEk: 0, kayip: 1.2, kayipTavan: 0.30,
    olum: true, hasarMax: 2, haracKademe: 0.20 },
};
export const VARSAYILAN_ZORLUK = 'normal';
export const MERHAMET_ZORLUK = 'rahat';

// --- Çevre (çit / sur; TEHDIT.md §12). `cevre: true` binalar (cit, sur_parcasi) zincir oluşturur. ---
// Savunma = min(Σ parça değeri, parcaTavan[çağ]) + (kapalı ? kapaliBonus[çağ] × içerdeki bina oranı : 0).
// Kapalı = merkezden 4 yön yürüyüşle yerleşim sınırının dışına çıkılamıyor (su/dağ doğal engel; çit+çit arası yol = geçit).
export const CEVRE = {
  parcaTavan: { gocebe: 1, tasdevri: 2, bronz: 4, antik: 8, ortacag: 16 },
  kapaliBonus: { gocebe: 2, tasdevri: 4, bronz: 6, antik: 10, ortacag: 20 },
  kayipCarpani: 0.8,      // kapalı çevrede tehdit kayıp oranı × 0,8
  boslukMax: 60,          // en küçük kesim bundan büyükse "kapatılamaz" (bosluk null)
};

// --- §3 ızgara / harita / keşif / yol (aşama 3, kullanıcı kararı: büyük harita + keşif sisi) ---
// Boyut YALNIZ burada; kodda harita boyutu gömülmez. Merkez bina haritanın ortasındadır.
export const HARITA_BOYUT = 64;
// Yerleşim sınırı: merkez binanın ortasından (Öklid) yarıçap; inşa yalnız sınır içinde VE keşfedilmiş karoda (§3.1).
export const YERLESIM_YARICAP = { gocebe: 8, tasdevri: 11, bronz: 15, antik: 20, ortacag: 26 };
export const GORUS_BASLANGIC = 6;         // yeni oyunda merkez çevresinde açık yarıçap
export const KESIF_YARICAP = 5;           // Keşfet eyleminin açtığı yarıçap (+ bina/buluş `kesifYaricap`)
export const YOL_MALIYET = { tas: 1 };
export const YOL_ZEMIN = ['cimen', 'verimli'];  // §3.4: yol yalnız bunların üstüne
export const BOYUTLAR = [[1, 1], [2, 2], [3, 3]];
// Harita üretimi (src/world/harita.js). Uzaklıklar merkezden karo cinsinden. Garantiler üretimden sonra denetlenir;
// tutmazsa aynı tohumdan sonraki deneme üretilir (deterministik).
export const HARITA_URETIM = {
  denemeMax: 40,
  guvenliYaricap: 3,                                  // tümü çimen
  dag: { minUzaklik: 12, egim: 0.35, esik: 0.85, kayalikEsik: 0.78 },
  gol: { uzaklik: [7, 9], yaricap: [1.6, 2.6] },
  nehir: { olasilik: 0.85, sapma: 0.55 },
  golet: { adet: [3, 6], uzaklik: [14, 30], yaricap: [1.3, 2.6] },
  orman: { esikYakin: 0.68, esikUzak: 0.6, yakinKume: { uzaklik: [4, 5.5], yaricap: 1.9 } },
  verimli: { esik: 0.55, suMesafe: 2, yama: { uzaklik: [3.5, 5], yaricap: 1.3 } },
  kil: { olasilik: 0.3, minUzaklik: 6 },
  tasli: { ilk: { uzaklik: [5, 6.5], ek: 2 }, ekAdet: [7, 11], uzaklik: [9, 30], ekKaro: [1, 4] },
  cevher: { ilk: { uzaklik: [11, 13], ek: 2 }, ekAdet: [3, 5], uzaklik: [19, 30], ekKaro: [1, 3] },
  mermer: { ilk: { uzaklik: [16, 18], ek: 2 }, ekAdet: [2, 3], uzaklik: [24, 30], ekKaro: [1, 3] },
  // Garantiler: { karo, enAz, yaricap } sayımı + merkezden geçilebilir erişim + ilgili binanın sınır içinde yeri.
  sayim: [
    { karo: 'orman', enAz: 6, yaricap: 6 },
    { karo: 'verimli', enAz: 2, yaricap: 6 },
    { karo: 'tasli', enAz: 2, yaricap: 8 },
    { karo: 'su', enAz: 3, yaricap: 11 },
    { karo: 'kil', enAz: 3, yaricap: 15 },
    { karo: 'cevher', enAz: 4, yaricap: 15 },
    { karo: 'mermer', enAz: 4, yaricap: 20 },
  ],
  erisim: ['tasli', 'orman', 'su', 'kil', 'cevher', 'mermer'],
  // Bina yeri garantisi: o binanın çağının yerleşim sınırı içinde, erişilebilir karolarda en az bir geçerli yer.
  yer: ['tas_ocagi', 'balikci_siginagi', 'kil_ocagi', 'maden_ocagi', 'mermer_ocagi', 'liman'],
};

// --- §7.4 başlangıç ---
export const BASLANGIC_KAYNAK = { yiyecek: 10, odun: 6, tas: 0, deri: 2 };
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

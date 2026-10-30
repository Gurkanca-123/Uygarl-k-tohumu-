// Bina tablosu (TASARIM §4, şema §10). Sayılar belgeden birebir; belirsizler TODO(tasarim).
//
// Şema alanları: id, ad, cag, tur, etiketler[], boyut:[g,y], maliyet:{}, insaSuresi,
//   gereksinim:{ bulus?, tekil?, karoUstu?, karoBitisik? }, isci, isciTuru?, uretim:{} (işçi başına), girdi:{} (işçi başına),
//   sabitUretim:{}, mevsimEtiketi?, kapasite?, isinma?, huzur?, savunma?, isciSavunma?, bilgi?, isciBilgi?, depo:{},
//   bozulmaAzaltma?, hastalikKapasitesi?, bakim:{}, bitisiklik:[{hedef, etki, max, mesafe?}], etkiAlani?, maxSeviye, aciklama, mvp
// Şemaya eklenen alanlar (belgede sayısı olan ama §10'da alanı olmayan etkiler):
//   kesifIyiSonuc (Keşfet iyi sonuç olasılığı +), hastalikKayipCarpani, takas:{ver, al, turBasinaMax?},
//   olayAgirlik:{tur: çarpan}, kuresel:{hedefEtiket, etki} (bitişiklik sınırı dışı genel bonus),
//   hastalikKapasitesiIscisiz, savunmaKenar (yerleşim sınırı kenarında ek savunma), etkiIsciGerekir, zafer, anit.
// Tehdit/çevre (TEHDIT.md): tehditGozcu (çalışır + ≥1 işçi: gerginlik sayısı, kesin güç, uyarı +1), cevre (çit/sur zinciri,
//   savunması src/world/cevre.js ile hesaplanır), yanabilir, maliyetSabit (adet çarpanı yok), insaatSinirDisi (eşzamanlı sınıra sayılmaz).
// Aşama 3 (harita/keşif): gorus (bina tamamlanınca kendi çevresinde açtığı yarıçap), kesifYaricap (Keşfet eylemine ek yarıçap).
//   TODO(tasarim): gorus/kesifYaricap sayıları belgede yok; varsayım (Gözcü 8/+1, Muhafız Kulesi 9, Kale 10).
// Evrim: `evrim: '<hedefBinaId>'` = bu bina yerinde hedefe dönüşebilir (core/insa.js evrimYap; maliyet = hedef × EVRIM_MALIYET).
// `bitisiklik[].hedef` tek dizgi ya da dizi olabilir (dizi: hedeflerden herhangi biri, ortak `max`).
// Merkez binaların huzur/depo/BP/eşzamanlı inşaat değerleri CAGLAR tablosundan okunur (tek kaynak).
import { KAYNAKLAR } from './kaynaklar.js';

function bina(o) {
  return {
    etiketler: [], gereksinim: {}, isci: 0, uretim: {}, girdi: {}, sabitUretim: {}, depo: {}, bakim: {},
    bitisiklik: [], maxSeviye: 3, mvp: false, ...o,
  };
}

// Ambar: "+60 yiyecek, +40 diğer" → yiyecek dışındaki tüm kaynaklar.
const AMBAR_DEPO = Object.fromEntries(KAYNAKLAR.map((k) => [k.id, k.id === 'yiyecek' ? 60 : 40]));

const ORMAN = 'karo:orman';
const SU = 'karo:su';

export const BINALAR = [
  // ---------- Merkez binalar (çağ atlayınca dönüşür, yıkılamaz/taşınamaz) ----------
  // TODO(tasarim): yalnız Kamp Ateşi'nin boyutu (2×2) yazılı; diğer merkezler 2×2 varsayıldı. Merkez yükseltilir mi belirsiz (maxSeviye 1).
  bina({ id: 'kamp_atesi',    ad: 'Kamp Ateşi',    cag: 'gocebe',   tur: 'merkez', boyut: [2, 2], maliyet: {}, insaSuresi: 0, maxSeviye: 1, mvp: true,
    aciklama: 'Başlangıçta kurulu. Serbest işler buradan yürür.' }),
  bina({ id: 'ocak_meydani',  ad: 'Ocak Meydanı',  cag: 'tasdevri', tur: 'merkez', boyut: [2, 2], maliyet: {}, insaSuresi: 0, maxSeviye: 1, mvp: true,
    aciklama: 'Taş Devri merkezi; Kamp Ateşi çağ atlayınca dönüşür.' }),
  bina({ id: 'koy_meydani',   ad: 'Köy Meydanı',   cag: 'bronz',    tur: 'merkez', boyut: [2, 2], maliyet: {}, insaSuresi: 0, maxSeviye: 1,
    aciklama: 'Bronz/Demir Çağı merkezi.' }),
  bina({ id: 'agora',         ad: 'Agora',         cag: 'antik',    tur: 'merkez', boyut: [2, 2], maliyet: {}, insaSuresi: 0, maxSeviye: 1,
    aciklama: 'Antik Çağ merkezi.' }),
  bina({ id: 'sehir_meydani', ad: 'Şehir Meydanı', cag: 'ortacag',  tur: 'merkez', boyut: [2, 2], maliyet: {}, insaSuresi: 0, maxSeviye: 1,
    aciklama: 'Orta Çağ merkezi.' }),

  // ---------- §4.1 Göçebe Çağı ----------
  bina({ id: 'cadir', evrim: 'kulube', ad: 'Çadır', cag: 'gocebe', tur: 'konut', boyut: [1, 1], maliyet: { odun: 5, deri: 2 }, insaSuresi: 1,
    kapasite: 3, isinma: 1, mvp: true, aciklama: '3 kişi barındırır.' }),
  bina({ id: 'avci_kulubesi', ad: 'Avcı Kulübesi', cag: 'gocebe', tur: 'uretim', boyut: [1, 1], maliyet: { odun: 8 }, insaSuresi: 1,
    isci: 2, uretim: { yiyecek: 1.5, deri: 0.75 }, mevsimEtiketi: 'avcilik',
    bitisiklik: [{ hedef: ORMAN, etki: { uretim: 0.25 }, max: 2 }], mvp: true, aciklama: 'Avcılar yiyecek ve deri getirir.' }),
  bina({ id: 'toplayici_barinagi', ad: 'Toplayıcı Barınağı', cag: 'gocebe', tur: 'uretim', boyut: [1, 1], maliyet: { odun: 6 }, insaSuresi: 1,
    isci: 2, uretim: { yiyecek: 3 }, mevsimEtiketi: 'toplama',
    bitisiklik: [{ hedef: [ORMAN, SU], etki: { uretim: 0.25 }, max: 2 }], mvp: true, aciklama: 'Toplayıcılar yemiş ve kök toplar.' }),
  bina({ id: 'oduncu_kampi', ad: 'Oduncu Kampı', cag: 'gocebe', tur: 'uretim', boyut: [1, 1], maliyet: { odun: 6 }, insaSuresi: 1,
    isci: 2, uretim: { odun: 2 },
    bitisiklik: [{ hedef: ORMAN, etki: { uretim: 0.25 }, max: 2 }], mvp: true, aciklama: 'Odun keser.' }),
  bina({ id: 'kurutma_rafi', evrim: 'erzak_cukuru', ad: 'Kurutma Rafı', cag: 'gocebe', tur: 'depo', boyut: [1, 1], maliyet: { odun: 6, deri: 2 }, insaSuresi: 1,
    gereksinim: { bulus: 'deri_isleme' }, depo: { yiyecek: 20 }, bozulmaAzaltma: 0.01, mvp: true,
    aciklama: 'Yiyecek deposunu artırır, bozulmayı azaltır.' }),
  bina({ id: 'totem', ad: 'Totem', cag: 'gocebe', tur: 'huzur', boyut: [1, 1], maliyet: { odun: 4, tas: 4 }, insaSuresi: 2,
    gereksinim: { bulus: 'tas_yontma', tekil: true }, huzur: 6, bilgi: 1, mvp: true, aciklama: 'Kabilenin kutsal direği.' }),
  // TODO(tasarim): Gözcü Direği ve Hayvan İzleri buluşu ikisi de "Keşfet iyi sonuç +%10" diyor; üst üste biner mi, "iyi sonuç" hangileri?
  bina({ id: 'gozcu_diregi', ad: 'Gözcü Direği', cag: 'gocebe', tur: 'savunma', boyut: [1, 1], maliyet: { odun: 6, tas: 2 }, insaSuresi: 1,
    gereksinim: { bulus: 'hayvan_izleri' }, isci: 1, isciTuru: 'nobetci', savunma: 2, isciSavunma: 1, kesifIyiSonuc: 0.10, gorus: 8, kesifYaricap: 1, mvp: true,
    tehditGozcu: true, aciklama: 'Nöbetçi yaklaşan tehlikeyi görür.' }),
  // Çevre parçası (TEHDIT.md §12, kullanıcı isteği "köyü çitle çevirebilmeliyim"): ucuz, 1 günde biter, eşzamanlı inşaat sınırına
  // sayılmaz, maliyeti adetle büyümez; komşu parçalar zincir, merkez çevresinde kapalı halka bonus verir. Yanabilir (baskında yanar).
  bina({ id: 'cit', evrim: 'sur_parcasi', ad: 'Çit', cag: 'gocebe', tur: 'savunma', boyut: [1, 1], maliyet: { odun: 1 }, insaSuresi: 1, maxSeviye: 1,
    savunma: 0.25, cevre: true, yanabilir: true, maliyetSabit: true, insaatSinirDisi: true,
    aciklama: 'Kazık çit. Köyü kapalı bir halkayla çevirirsen savunma bonusu verir.' }),
  // TODO(tasarim): "+0,3 BP" sabit mi, işçi başına mı? Sabit (bilgi) varsayıldı; işçisiz çalışır mı belirsiz.
  bina({ id: 'sifaci_cadiri', ad: 'Şifacı Çadırı', cag: 'gocebe', tur: 'kamu', boyut: [1, 1], maliyet: { odun: 8, deri: 3 }, insaSuresi: 2,
    isci: 1, bilgi: 0.3, huzur: 3, hastalikKayipCarpani: 0.5, aciklama: 'Hastalık olaylarında kayıplar yarıya iner. (Sürüm 0.2)' }),

  // ---------- §4.2 Taş Devri ----------
  bina({ id: 'kulube', evrim: 'kerpic_ev', ad: 'Kulübe', cag: 'tasdevri', tur: 'konut', boyut: [1, 1], maliyet: { odun: 8, tas: 4 }, insaSuresi: 2,
    kapasite: 4, isinma: 0.5, mvp: true, aciklama: '4 kişi barındırır.' }),
  bina({ id: 'tas_ocagi', ad: 'Taş Ocağı', cag: 'tasdevri', tur: 'uretim', boyut: [2, 2], maliyet: { odun: 12 }, insaSuresi: 3,
    gereksinim: { karoBitisik: 'tasli' }, isci: 3, uretim: { tas: 1.5 },
    bitisiklik: [{ hedef: 'karo:tasli', etki: { uretim: 0.25 }, max: 2 }], mvp: true, aciklama: 'Taşlığa bitişik kurulur.' }),
  bina({ id: 'alet_yapimcisi', evrim: 'demirci', ad: 'Alet Yapımcısı', cag: 'tasdevri', tur: 'donusum', etiketler: ['atolye'], boyut: [1, 1],
    maliyet: { odun: 10, tas: 8 }, insaSuresi: 2, isci: 2, girdi: { tas: 1, odun: 0.5 }, uretim: { alet: 0.5 }, mvp: true,
    aciklama: 'Taş ve odundan alet yapar.' }),
  bina({ id: 'erzak_cukuru', ad: 'Erzak Çukuru', cag: 'tasdevri', tur: 'depo', boyut: [1, 1], maliyet: { odun: 8, tas: 6 }, insaSuresi: 1,
    depo: { yiyecek: 30, odun: 20, tas: 20, deri: 20, alet: 20 }, bozulmaAzaltma: 0.01, aciklama: 'Depo artırır, bozulmayı azaltır.' }),
  bina({ id: 'nobet_citi', ad: 'Nöbet Çiti', cag: 'tasdevri', tur: 'savunma', boyut: [1, 1], maliyet: { odun: 8, tas: 4 }, insaSuresi: 1,
    isci: 2, isciTuru: 'nobetci', savunma: 3, isciSavunma: 1, aciklama: 'Köyü çevreleyen kazıklı çit.' }),
  bina({ id: 'balikci_siginagi', ad: 'Balıkçı Sığınağı', cag: 'tasdevri', tur: 'uretim', boyut: [1, 1], maliyet: { odun: 10, alet: 2 }, insaSuresi: 2,
    gereksinim: { bulus: 'balikcilik', karoBitisik: 'su' }, isci: 2, uretim: { yiyecek: 2.5 }, mevsimEtiketi: 'balik',
    aciklama: 'Suya bitişik kurulur.' }),
  bina({ id: 'tahil_bahcesi', evrim: 'sulanan_tarla', ad: 'Tahıl Bahçesi', cag: 'tasdevri', tur: 'uretim', etiketler: ['tarim'], boyut: [2, 2],
    maliyet: { odun: 10, alet: 2 }, insaSuresi: 2, gereksinim: { bulus: 'tohum_ekme' }, isci: 2, uretim: { yiyecek: 3 },
    mevsimEtiketi: 'tarim', bitisiklik: [{ hedef: 'karo:verimli', etki: { uretim: 0.25 }, max: 2 }], aciklama: 'İlk tarım.' }),
  bina({ id: 'agil', ad: 'Ağıl', cag: 'tasdevri', tur: 'uretim', boyut: [2, 2], maliyet: { odun: 15, tas: 5 }, insaSuresi: 2,
    gereksinim: { bulus: 'evcilestirme' }, isci: 1, uretim: { yiyecek: 2, deri: 1 }, mevsimEtiketi: null,
    aciklama: 'Mevsimden etkilenmez.' }),
  bina({ id: 'magara_resmi', ad: 'Mağara Resmi Yeri', cag: 'tasdevri', tur: 'huzur', boyut: [2, 2], maliyet: { tas: 10, alet: 4 }, insaSuresi: 3,
    gereksinim: { tekil: true }, isci: 1, huzur: 8, bilgi: 1, isciBilgi: 0.5, aciklama: 'Atalara ve avlara adanmış duvarlar.' }),

  // ---------- §4.3 Bronz/Demir Çağı ----------
  bina({ id: 'kerpic_ev', evrim: 'tas_ev', ad: 'Kerpiç Ev', cag: 'bronz', tur: 'konut', boyut: [1, 1], maliyet: { odun: 6, kil: 10 }, insaSuresi: 2,
    kapasite: 5, isinma: 0.5, aciklama: '5 kişi barındırır.' }),
  bina({ id: 'kil_ocagi', ad: 'Kil Ocağı', cag: 'bronz', tur: 'uretim', boyut: [1, 1], maliyet: { odun: 10, alet: 4 }, insaSuresi: 1,
    gereksinim: { karoBitisik: 'kil' }, isci: 2, uretim: { kil: 2 }, aciklama: 'Kil yatağına (su kenarı) bitişik kurulur.' }),
  bina({ id: 'maden_ocagi', ad: 'Maden Ocağı', cag: 'bronz', tur: 'uretim', boyut: [2, 2], maliyet: { odun: 20, tas: 10, alet: 6 }, insaSuresi: 3,
    gereksinim: { karoUstu: 'cevher' }, isci: 3, uretim: { cevher: 1 }, aciklama: 'Cevher damarı üstüne kurulur.' }),
  bina({ id: 'eritme_firini', ad: 'Eritme Fırını', cag: 'bronz', tur: 'donusum', etiketler: ['atolye'], boyut: [1, 1],
    maliyet: { kil: 15, tas: 10 }, insaSuresi: 2, isci: 2, girdi: { cevher: 1, odun: 1 }, uretim: { metal: 1 },
    aciklama: 'Cevheri metale çevirir.' }),
  bina({ id: 'demirci', ad: 'Demirci', cag: 'bronz', tur: 'donusum', etiketler: ['atolye'], boyut: [1, 1], maliyet: { kil: 15, metal: 5 },
    insaSuresi: 2, gereksinim: { bulus: 'tunc_dokum' }, isci: 2, girdi: { metal: 0.5, odun: 0.5 }, uretim: { alet: 1 },
    aciklama: 'Metalden alet döver.' }),
  bina({ id: 'sulanan_tarla', evrim: 'ciftlik', ad: 'Sulanan Tarla', cag: 'bronz', tur: 'uretim', etiketler: ['tarim'], boyut: [2, 2],
    maliyet: { odun: 10, kil: 15, alet: 4 }, insaSuresi: 2, gereksinim: { bulus: 'sulama' }, isci: 3, uretim: { yiyecek: 4 },
    mevsimEtiketi: 'tarim', bitisiklik: [{ hedef: SU, etki: { uretim: 0.25 }, max: 1, mesafe: 2 }],
    aciklama: '2 karo içinde su varsa verim artar.' }),
  bina({ id: 'ambar', ad: 'Ambar', cag: 'bronz', tur: 'depo', boyut: [2, 2], maliyet: { odun: 20, kil: 20 }, insaSuresi: 2,
    depo: AMBAR_DEPO, bozulmaAzaltma: 0.01, aciklama: 'Büyük depo, bozulmayı azaltır.' }),
  bina({ id: 'pazar_yeri', ad: 'Pazar Yeri', cag: 'bronz', tur: 'kamu', boyut: [2, 2], maliyet: { odun: 20, kil: 20, metal: 5 }, insaSuresi: 3,
    gereksinim: { bulus: 'takas', tekil: true }, isci: 1, takas: { ver: 3, al: 2, turBasinaMax: 20 }, olayAgirlik: { ticaret: 2 },
    aciklama: 'Takas açılır: 3 birim ver, 2 birim al.' }),
  bina({ id: 'kuyu', ad: 'Kuyu', cag: 'bronz', tur: 'kamu', boyut: [1, 1], maliyet: { tas: 10, kil: 5 }, insaSuresi: 1,
    huzur: 2, hastalikKapasitesi: 15, aciklama: 'Temiz su hastalığı azaltır.' }),
  bina({ id: 'muhafiz_kulesi', ad: 'Muhafız Kulesi', cag: 'bronz', tur: 'savunma', boyut: [1, 1], maliyet: { tas: 15, metal: 5 }, insaSuresi: 2,
    isci: 2, isciTuru: 'nobetci', savunma: 6, isciSavunma: 2, gorus: 9, tehditGozcu: true, aciklama: 'Nöbetçi kulesi.' }),
  bina({ id: 'mabet', ad: 'Mabet', cag: 'bronz', tur: 'huzur', boyut: [2, 2], maliyet: { kil: 30, tas: 20, metal: 5 }, insaSuresi: 4,
    gereksinim: { tekil: true }, isci: 1, isciTuru: 'rahip', huzur: 12, bilgi: 2, isciBilgi: 1, bakim: { yiyecek: 1 },
    aciklama: 'Rahipler bilgi biriktirir.' }),

  // ---------- §4.4 Antik Çağ ----------
  bina({ id: 'tas_ev', evrim: 'yari_ahsap_ev', ad: 'Taş Ev', cag: 'antik', tur: 'konut', boyut: [1, 1], maliyet: { tas: 15, kil: 5, metal: 2 }, insaSuresi: 3,
    kapasite: 6, isinma: 0.5, aciklama: '6 kişi barındırır.' }),
  bina({ id: 'mermer_ocagi', ad: 'Mermer Ocağı', cag: 'antik', tur: 'uretim', boyut: [2, 2], maliyet: { odun: 30, tas: 20, alet: 10 }, insaSuresi: 3,
    gereksinim: { karoUstu: 'mermer' }, isci: 3, uretim: { mermer: 1 }, aciklama: 'Mermer yatağı üstüne kurulur.' }),
  bina({ id: 'bag_bahce', ad: 'Bağ-Bahçe', cag: 'antik', tur: 'uretim', etiketler: ['tarim'], boyut: [2, 2], maliyet: { odun: 20, alet: 10 },
    insaSuresi: 2, isci: 2, uretim: { yiyecek: 2.5 }, mevsimEtiketi: 'tarim', huzur: 2, aciklama: 'Üzüm ve meyve.' }),
  bina({ id: 'darphane', ad: 'Darphane', cag: 'antik', tur: 'donusum', etiketler: ['atolye'], boyut: [1, 1], maliyet: { tas: 30, metal: 10 },
    insaSuresi: 3, gereksinim: { bulus: 'para', tekil: true }, isci: 2, girdi: { metal: 0.5 }, uretim: { sikke: 2 },
    aciklama: 'Metalden sikke basar.' }),
  // TODO(tasarim): Liman takas için Pazar Yeri gerektirir mi? "takas oranı 4 → 3" Pazar'ın 3 → 2 oranının yerine geçer varsayıldı.
  bina({ id: 'liman', ad: 'Liman', cag: 'antik', tur: 'uretim', boyut: [2, 2], maliyet: { odun: 40, tas: 20 }, insaSuresi: 3,
    gereksinim: { bulus: 'denizcilik', karoBitisik: 'su' }, isci: 2, uretim: { yiyecek: 3 }, mevsimEtiketi: 'balik',
    takas: { ver: 4, al: 3 }, aciklama: 'Balık ve daha iyi takas oranı.' }),
  bina({ id: 'su_kemeri', ad: 'Su Kemeri', cag: 'antik', tur: 'kamu', boyut: [2, 2], maliyet: { tas: 40, mermer: 10 }, insaSuresi: 4,
    gereksinim: { bulus: 'muhendislik' }, etkiAlani: { yaricap: 4, hedefEtiket: 'tarim', etki: { uretim: 0.20 } },
    hastalikKapasitesi: 40, aciklama: 'Çevresindeki tarımı sular.' }),
  bina({ id: 'hamam', ad: 'Hamam', cag: 'antik', tur: 'huzur', boyut: [2, 2], maliyet: { tas: 40, mermer: 10, kil: 10 }, insaSuresi: 3,
    huzur: 8, hastalikKapasitesi: 30, bakim: { odun: 1 }, aciklama: 'Temizlik ve dinlenme.' }),
  bina({ id: 'kutuphane', ad: 'Kütüphane', cag: 'antik', tur: 'bilgi', boyut: [2, 2], maliyet: { tas: 40, mermer: 15, sikke: 10 }, insaSuresi: 4,
    gereksinim: { bulus: 'felsefe' }, isci: 2, isciTuru: 'bilgin', isciBilgi: 1.5, bakim: { sikke: 1 }, aciklama: 'Bilginler BP üretir.' }),
  bina({ id: 'tiyatro', ad: 'Tiyatro', cag: 'antik', tur: 'huzur', boyut: [3, 3], maliyet: { tas: 60, mermer: 30, sikke: 20 }, insaSuresi: 6,
    gereksinim: { bulus: 'muhendislik', tekil: true }, huzur: 20, bakim: { sikke: 2 }, aciklama: 'Halkın eğlencesi.' }),
  bina({ id: 'kisla', ad: 'Kışla', cag: 'antik', tur: 'savunma', boyut: [2, 2], maliyet: { tas: 40, metal: 20 }, insaSuresi: 4,
    isci: 4, isciTuru: 'asker', savunma: 5, isciSavunma: 3, bakim: { sikke: 1 }, aciklama: 'Askerler kenti korur.' }),

  // ---------- §4.5 Orta Çağ ----------
  bina({ id: 'yari_ahsap_ev', ad: 'Yarı Ahşap Ev', cag: 'ortacag', tur: 'konut', boyut: [1, 1], maliyet: { odun: 20, tas: 20, metal: 5 },
    insaSuresi: 3, kapasite: 8, isinma: 1, aciklama: '8 kişi barındırır.' }),
  bina({ id: 'ciftlik', ad: 'Çiftlik', cag: 'ortacag', tur: 'uretim', etiketler: ['tarim'], boyut: [3, 3], maliyet: { odun: 40, tas: 20, metal: 10 },
    insaSuresi: 3, gereksinim: { bulus: 'uclu_ekim' }, isci: 4, uretim: { yiyecek: 5 }, mevsimEtiketi: 'tarim', aciklama: 'Büyük tarla.' }),
  bina({ id: 'degirmen', ad: 'Değirmen', cag: 'ortacag', tur: 'kamu', boyut: [2, 2], maliyet: { odun: 40, tas: 20, metal: 10 }, insaSuresi: 3,
    gereksinim: { bulus: 'su_degirmeni' }, isci: 1, etkiAlani: { yaricap: 3, hedefEtiket: 'tarim', etki: { uretim: 0.25 } },
    etkiIsciGerekir: true, aciklama: 'Çevresindeki tarımı hızlandırır (işçi yoksa kapalı).' }),
  bina({ id: 'dokuma_atolyesi', ad: 'Dokuma Atölyesi', cag: 'ortacag', tur: 'donusum', etiketler: ['atolye'], boyut: [1, 1],
    maliyet: { odun: 30, metal: 10 }, insaSuresi: 2, gereksinim: { bulus: 'dokumacilik' }, isci: 2, girdi: { deri: 1 }, uretim: { kumas: 1 },
    aciklama: 'Deriden kumaş dokur.' }),
  bina({ id: 'manastir', ad: 'Manastır', cag: 'ortacag', tur: 'bilgi', boyut: [3, 3], maliyet: { tas: 80, mermer: 20, sikke: 30 }, insaSuresi: 6,
    isci: 3, isciTuru: 'kesis', isciBilgi: 1, uretim: { kitap: 0.3 }, huzur: 10, aciklama: 'Keşişler bilgi ve kitap üretir.' }),
  bina({ id: 'lonca_binasi', ad: 'Lonca Binası', cag: 'ortacag', tur: 'kamu', boyut: [2, 2], maliyet: { tas: 60, sikke: 30, kumas: 20 }, insaSuresi: 4,
    gereksinim: { bulus: 'lonca_sistemi', tekil: true }, kuresel: { hedefEtiket: 'atolye', etki: { uretim: 0.20 } }, bakim: { sikke: 2 },
    aciklama: 'Tüm atölyelere +%20 (bitişiklik sınırı dışı).' }),
  bina({ id: 'han', ad: 'Han', cag: 'ortacag', tur: 'kamu', boyut: [2, 2], maliyet: { odun: 50, tas: 40, sikke: 20 }, insaSuresi: 3,
    sabitUretim: { sikke: 2 }, olayAgirlik: { ticaret: 2, gocmen: 1.5 }, aciklama: 'Yolcular sikke ve haber getirir.' }),
  bina({ id: 'darussifa', ad: 'Darüşşifa', cag: 'ortacag', tur: 'kamu', boyut: [2, 2], maliyet: { tas: 60, kumas: 20, sikke: 20 }, insaSuresi: 4,
    gereksinim: { bulus: 'dokumacilik' }, isci: 2, huzur: 5, hastalikKapasitesi: 60, hastalikKapasitesiIscisiz: 20,
    aciklama: 'Hastane; işçisiz yalnız +20 hastalık kapasitesi.' }),
  bina({ id: 'sur_parcasi', ad: 'Sur Parçası', cag: 'ortacag', tur: 'savunma', boyut: [1, 1], maliyet: { tas: 10 }, insaSuresi: 1,
    savunma: 0.5, savunmaKenar: 1, cevre: true, maliyetSabit: true, insaatSinirDisi: true,
    aciklama: 'Yerleşim sınırının kenarında daha güçlü; çitle aynı halka sistemine girer.' }),
  bina({ id: 'kale', ad: 'Kale', cag: 'ortacag', tur: 'savunma', boyut: [3, 3], maliyet: { tas: 150, metal: 40, sikke: 50 }, insaSuresi: 6,
    gereksinim: { tekil: true }, isci: 4, isciTuru: 'sovalye', savunma: 25, isciSavunma: 5, gorus: 10, bakim: { sikke: 3 },
    aciklama: 'Şövalyelerin yuvası.' }),
  // TODO(tasarim): Katedral tekil mi ve yükseltilebilir mi yazılmamış; anıt olduğu için tekil ve maxSeviye 1 varsayıldı.
  bina({ id: 'katedral', ad: 'Katedral', cag: 'ortacag', tur: 'anit', boyut: [3, 3],
    maliyet: { tas: 300, mermer: 100, sikke: 150, kumas: 40, kitap: 30 }, insaSuresi: 20,
    gereksinim: { bulus: 'gotik_mimari', tekil: true }, huzur: 30, anit: true, zafer: true, maxSeviye: 1,
    aciklama: 'Büyük anıt; tamamlanınca zafer şartı.' }),
];

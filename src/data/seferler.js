// Sefer türleri (docs/AKSIYON.md §2.4, şema §8.1). Denge buradan değişir; çekirdek (src/core/sefer.js) kod değişmeden okur.
// Alanlar: id, ad, metin, cagMin, cagMax (null = son çağ), isaret (haritadaki hedef işareti türü; null = hedefsiz / komşu),
//   hedef: 'isaret' | 'yok' | 'komsu', zorluk: { cagId: n } | 'komsu', sure: 'mesafe' | n, ekipMin, ekipMax,
//   gerekir: { bulus?, bina?, komsu? }, kisKapali, etiket ('av' | 'kesif' | 'define' | 'komsu' | 'kamp'), sinifCarpan: { sinif: ×},
//   odul: { kaynak?, bp?, ozel? }, basarisizYarali (false = başarısızlıkta da yaralı yok), tehditBag (başarı bu tehdidi iptal eder),
//   iliski (komşu ilişkisi değişimi), gerginlik, bekleme (aynı hedefe tekrar gönderme beklemesi, tur), acik (MVP'de oynanabilir), mvp,
//   savas (görsel otomatik savaş; docs/SAVAS.md §9 — F1 yalnız ayi_avi), dusman: { id (birimler.js DUSMANLAR), adet }.
// MVP (§9.3): kesif, ayi_avi, harabe açık; baskin_seferi kullanıcı kararıyla (savaş modeli (b)) Bronz'dan açık. Diğerleri yalnız şema.
function sefer(s) {
  return { savas: false, dusman: null, cagMax: null, isaret: null, hedef: 'isaret', sure: 'mesafe', ekipMin: 1, ekipMax: 4, gerekir: {}, kisKapali: false,
    sinifCarpan: {}, odul: {}, basarisizYarali: true, tehditBag: null, iliski: 0, gerginlik: 0, bekleme: 0, acik: false, mvp: false, ...s };
}

export const SEFER_ETIKETLERI = ['av', 'kesif', 'define', 'komsu', 'kamp'];
export const ISARET_TURLERI = ['ayi', 'iz', 'harabe', 'suru', 'ates', 'kaynak'];
// Haritadaki işaret türlerinin doğma ağırlığı (açık sefer türü olan işaretler doğar).
export const ISARET_AGIRLIK = { ayi: 3, harabe: 3, iz: 2, suru: 2, ates: 1, kaynak: 2 };
export const ISARET_AD = { ayi: 'Ayı izi', iz: 'Kurt izi', harabe: 'Eski harabe', suru: 'Yabani sürü', ates: 'Yabancı ateşi', kaynak: 'Uzak kaynak' };

export const SEFERLER = [
  sefer({ id: 'kesif', ad: 'Keşif Seferi', cagMin: 'gocebe', hedef: 'yok', etiket: 'kesif', sure: 2, acik: true, mvp: true,
    metin: 'Ekip sisin ötesine yürür; yeni topraklar, izler ve belki bir komşu bulur.',
    zorluk: { gocebe: 4, tasdevri: 7, bronz: 9, antik: 12, ortacag: 16 },
    sinifCarpan: { kasif: 1.5 }, basarisizYarali: false,
    odul: { bp: 3, ozel: { kesifYaricap: 8, isaretOlasilik: 0.4, kaynakOlasilik: 0.2, kaynak: { odun: 6, tas: 4 }, komsuBul: true } } }),
  sefer({ id: 'ayi_avi', ad: 'Ayı Avı', cagMin: 'gocebe', cagMax: 'bronz', isaret: 'ayi', etiket: 'av', acik: true, mvp: true,
    metin: 'İri bir ayının izleri bulundu. Postu ve eti bütün kışa yeter; ama ayı da avcısını tanır.',
    zorluk: { gocebe: 5, tasdevri: 10, bronz: 13 }, sinifCarpan: { avci: 1.5 }, tehditBag: 'ayi', savas: true, dusman: { id: 'ayi', adet: 1 },
    odul: { kaynak: { yiyecek: 12, deri: 4 }, bp: 0, ozel: { buyukEsya: 'ayi_postu' } } }),
  sefer({ id: 'harabe', ad: 'Eski Harabe', cagMin: 'gocebe', isaret: 'harabe', etiket: 'define', acik: true, mvp: true,
    metin: 'Atalardan kalma yıkık bir yer. Altında ne var, kimse bilmiyor.',
    zorluk: { gocebe: 4, tasdevri: 9, bronz: 12, antik: 16, ortacag: 22 }, sinifCarpan: { kasif: 1.25 },
    odul: { bp: 4, ozel: {
      // Başarıda tek zar: eşya · kaynak paketi · gezgin katılır · tuzak (ilk harabe ve Kaşif Sv5 tuzaksız).
      tablo: [{ id: 'esya', p: 0.4 }, { id: 'paket', p: 0.3 }, { id: 'gezgin', p: 0.15 }, { id: 'tuzak', p: 0.15 }],
      esyalar: ['eski_harita', 'sifali_ot', 'kurt_disi', 'tas_mizrak'],
      paket: { gocebe: { odun: 6, tas: 4, deri: 2 }, tasdevri: { alet: 4 }, bronz: { metal: 4 }, antik: { sikke: 10 }, ortacag: { sikke: 15 } },
    } } }),
  sefer({ id: 'baskin_seferi', ad: 'Baskın Seferi', cagMin: 'bronz', hedef: 'komsu', etiket: 'komsu', zorluk: 'komsu',
    acik: true, mvp: false, bekleme: 15, iliski: -30,
    metin: 'Komşunun ambarlarına baskın. Ganimet bol, ama ilişki uzun süre düzelmez.',
    odul: { bp: 0, ozel: { ganimet: true } } }),
  // ---------- Şema hazır, MVP'de kapalı (F2–F4) ----------
  sefer({ id: 'kurt_avi', ad: 'Kurt Avı', cagMin: 'gocebe', cagMax: 'tasdevri', isaret: 'iz', etiket: 'av', tehditBag: 'kurt_surusu',
    zorluk: { gocebe: 3, tasdevri: 5 }, sinifCarpan: { avci: 1.5 }, gerginlik: -20,
    metin: 'Kurt sürüsünü inine kadar izle.', odul: { kaynak: { yiyecek: 6, deri: 2 }, ozel: { esya: [{ id: 'kurt_disi', p: 0.3 }] } } }),
  sefer({ id: 'koyun', ad: 'Sürü Evcilleştirme', cagMin: 'tasdevri', cagMax: 'bronz', isaret: 'suru', etiket: 'av',
    zorluk: { tasdevri: 4, bronz: 6 }, sinifCarpan: { avci: 1.25 }, basarisizYarali: false, gerekir: { bina: 'agil' },
    metin: 'Yabani sürüyü ağıla getir.', odul: { ozel: { suru: 1 } } }),
  sefer({ id: 'uzak_kamp', ad: 'Uzak Kaynak Kampı', cagMin: 'tasdevri', isaret: 'kaynak', etiket: 'kamp', sure: 3, ekipMin: 2,
    zorluk: { tasdevri: 4, bronz: 7, antik: 10, ortacag: 15 }, kisKapali: true,
    metin: 'Uzak bir ocakta kamp kur; her gün taşı, odunu topla.', odul: { ozel: { kampTuru: { odun: 4 } } } }),
  sefer({ id: 'ticaret', ad: 'Ticaret Kervanı', cagMin: 'tasdevri', hedef: 'komsu', etiket: 'komsu', gerekir: { komsu: true },
    zorluk: { tasdevri: 3, bronz: 5, antik: 8, ortacag: 12 }, iliski: 5,
    metin: 'Komşuya mal götür, başka mal getir.', odul: { ozel: { kervan: true } } }),
  sefer({ id: 'elci', ad: 'Elçi Heyeti', cagMin: 'tasdevri', hedef: 'komsu', etiket: 'komsu', zorluk: 'komsu', iliski: 15,
    metin: 'Hediyelerle komşunun gönlünü al.', odul: { ozel: { elci: true } } }),
  sefer({ id: 'kahraman_arayisi', ad: 'Usta Arayışı', cagMin: 'bronz', hedef: 'yok', etiket: 'kesif',
    zorluk: { bronz: 6, antik: 9, ortacag: 14 }, metin: 'Uzak diyarlarda bir usta ara.', odul: { ozel: { kahraman: true } } }),
];

// Yolda sefer olayları (§2.5; seçim yapılmazsa 0. seçenek). Oyunu durdurmaz; sonuç dönüşte uygulanır (`seferEtki`).
// seferEtki: { sureEk, odulCarpan, yaraliOlasilik }
export const SEFER_OLAYLARI = [
  { id: 'nehir_tasti', ad: 'Nehir Taştı', metin: 'Yoldaki nehir taşmış; karşıya geçmek tehlikeli.',
    secenekler: [{ metin: 'Bekle (+1 gün)', seferEtki: { sureEk: 1 } }, { metin: 'Geç (%30 yaralanma)', seferEtki: { yaraliOlasilik: 0.3 } }] },
  { id: 'ikinci_iz', ad: 'İkinci İz', metin: 'Ekip taze bir iz buldu; izlerse ganimet artar ama dönüş gecikir.',
    secenekler: [{ metin: 'Dön (değişiklik yok)', seferEtki: {} }, { metin: 'İzi sür (+1 gün, ödül ×1,3)', seferEtki: { sureEk: 1, odulCarpan: 1.3 } }] },
];

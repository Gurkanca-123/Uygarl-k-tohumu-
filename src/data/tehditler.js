// Dış tehdit tablosu (docs/TEHDIT.md §2, şema §8.1). Denge/içerik buradan değişir; motor `src/core/tehdit.js`.
// MVP (§10): Göçebe + Taş Devri: kurt_surusu (yırtıcı), avci_cetesi (akıncı), komsu_baskini (baskın; soyut komşu, karar A).
//
// Alanlar: id, ad, metin, isaret (uyarı çipi metni), tur (TEHDIT_TURLERI), kaynak (TEHDIT_KAYNAKLARI; ilişki puanı anahtarı),
//   cagMin / cagMax: çağ id'si; SIRA ile karşılaştırılır (id listesi değil) → yeni çağ eklemek = caglar.js'e satır + buraya satır.
//   cagMax null = son çağa kadar (ileri çağlar: Sanayi/Modern için yer açık).
//   gucOran (§3.4 taban çarpanı), uyari (tur), agirlik, bekleme (aynı id tekrar çıkmaz, tur), kosul (olay `kosul` anahtarları),
//   hedef: kaynak listesi | 'tasinabilir' | '*' (kayıp/haraç uygulanan kaynaklar),
//   sonuc: { kismi: { oran }, yenilgi: { oran, nufus, hasar, yarali:{adet,sure}, yakar? } }
//     (yakar: yenilgide ek olarak 1 yanabilir çevre parçası (çit) yanar),
//   secenekler: tavır/komut kimlikleri ('savun' zorunlu), secenekAd: düğme metni geçersiz kılma,
//   harac: { kaynak: { id: × guc } } | { oran } · saklan: { oran, sure, carpan } · ganimet: { id: × guc } (püskürtmede),
//   cagaGore: { <cagId>: { alan: değer } } — o çağda alanı geçersiz kılar (ör. Taş'ta kurt gucOran 0,8),
//   onleyiciGorev (sefer/kahraman kancası; şimdilik null), mvp.
export const TEHDIT_TURLERI = ['yirtici', 'akinci', 'baskin', 'istila', 'kusatma', 'yagma'];
export const TEHDIT_KAYNAKLARI = ['doga', 'gocebe', 'komsu', 'barbar', 'ordu', 'haydut'];
// Uyarı süresince seçilebilenler. 'savun' ve 'saklan' tavırdır (varışta uygulanır); 'harac' anında çözer (komut).
// 'elci' ve 'karsi' MVP+1 / sefer sistemi (TEHDIT.md §5.1, §11.6: karşı saldırı yok) — veri kimliği olarak ayrıldı.
export const TEHDIT_SECENEKLERI = ['savun', 'harac', 'saklan', 'elci', 'karsi'];
export const TEHDIT_TAVIRLARI = ['savun', 'saklan'];
export const TEHDIT_SONUCLARI = ['puskurtme', 'kismi', 'yenilgi', 'harac', 'saklan'];
// Taşınabilir kaynaklar (akıncı hedefi).
export const TASINABILIR = ['yiyecek', 'deri', 'alet', 'metal', 'sikke', 'kumas'];

function tehdit(o) {
  return { kosul: {}, agirlik: 10, bekleme: 30, cagMax: null, gucOran: 1, cagaGore: {}, secenekAd: {},
    onleyiciGorev: null, mvp: false, ...o };
}

export const TEHDITLER = [
  tehdit({ id: 'kurt_surusu', ad: 'Kurt Sürüsü', tur: 'yirtici', kaynak: 'doga', cagMin: 'gocebe', cagMax: 'tasdevri', mvp: true,
    metin: 'Aç bir kurt sürüsü kampın çevresinde dolaşıyor; erzağın kokusunu aldılar.',
    isaret: 'Kampın çevresinde kurt izleri', uyari: 2, gucOran: 1.0,
    hedef: ['yiyecek'],
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.25, nufus: 0, hasar: 0, yarali: { adet: 1, sure: 3 } } },
    secenekler: ['savun', 'harac', 'saklan'], secenekAd: { harac: 'Et bırak', saklan: 'Ateşi büyüt, içeride kal' },
    harac: { kaynak: { yiyecek: 1.5 } },
    saklan: { oran: 0, sure: 2, carpan: 0.6 },
    ganimet: { yiyecek: 1.5 },
    cagaGore: {
      gocebe: { secenekAd: { harac: 'Et bırak', saklan: 'Kampı taşı' } },
      tasdevri: { gucOran: 0.8, ganimet: { yiyecek: 1.5, deri: 0.5 } },
    } }),
  tehdit({ id: 'avci_cetesi', ad: 'Yabancı Avcı Çetesi', tur: 'akinci', kaynak: 'gocebe', cagMin: 'tasdevri', cagMax: 'bronz', mvp: true,
    metin: 'Yabancı avcılar av sahanızda kamp kurdu; ambarlarınıza göz dikmişler.',
    isaret: 'Uzakta yabancı ateşler', uyari: 3, gucOran: 1.0,
    hedef: 'tasinabilir',
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.25, nufus: 1, hasar: 0, yarali: { adet: 1, sure: 3 }, yakar: true } },
    secenekler: ['savun', 'harac', 'saklan'], secenekAd: { harac: 'Haraç ver', saklan: 'Saklan' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.10, sure: 3, carpan: 0.5 },
    ganimet: { yiyecek: 1.5, alet: 0.5 } }),
  tehdit({ id: 'komsu_baskini', ad: 'Komşu Kabile Baskını', tur: 'baskin', kaynak: 'komsu', cagMin: 'tasdevri', cagMax: null, mvp: true,
    metin: 'Komşu kabile silahlanıyor; ambarlarınız ve evleriniz hedefte.',
    isaret: 'Komşular silah biliyor', uyari: 3, gucOran: 1.2,
    hedef: '*',
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.25, nufus: 1, hasar: 1, yarali: { adet: 1, sure: 3 }, yakar: true } },
    secenekler: ['savun', 'harac', 'saklan'], secenekAd: { harac: 'Haraç ver', saklan: 'Saklan' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.10, sure: 3, carpan: 0.5 },
    ganimet: { yiyecek: 1.5, alet: 0.5 } }),
  // MVP dışı satırlar (ayi, akincilar, haydutlar, korsanlar, barbar_akini, yagma_seferi, kusatma) TEHDIT.md §2.2'de; sonraki dilim.
];

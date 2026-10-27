// Dış tehdit tablosu (docs/TEHDIT.md §2, şema §8.1). Denge/içerik buradan değişir; motor `src/core/tehdit.js`.
// MVP (§10) üç satırla başladı; §2.2'nin 10 tehdidinin tümü burada (2026-10-26: tüm çağlara yayıldı). Çağ başına aday:
//   Göçebe 2 · Taş 4 · Bronz 5 · Antik 5 · Orta 6 (koşullu satırlar: haydutlar = Pazar/kervan, korsanlar = kıyı).
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
//   Ek (tüm çağlar dilimi): ozelKosul: 'ticaret' (Pazar Yeri çalışıyor ya da yolda kervan var) | 'kiyi' (yerleşim sınırına
//     ≤ KIYI_MESAFE karoda su) — motor denetler; sonuc.kismi/yenilgi ek alanları: hasar (kısmi de olabilir), degistirici
//     ({ id, sure, etki } — istila üretim ×0,8, kuşatma ticaretKapali), kervan (yolda çalınan kervan sayısı), hasarOncelik
//     ('savunma': önce savunma binası), huzur (ek anlık huzur; çağ darbesine eklenir);
//   kusatma: { sure, asinma } (yalnız tur 'kusatma': varışta savunma yetmezse `sure` tur kuşatma evresi, karar noktası),
//   karar: true → kuşatma başlarken arayüz durduran karar penceresi açar (TEHDIT.md §11.1).
export const TEHDIT_TURLERI = ['yirtici', 'akinci', 'baskin', 'istila', 'kusatma', 'yagma'];
export const TEHDIT_KAYNAKLARI = ['doga', 'gocebe', 'komsu', 'barbar', 'ordu', 'haydut'];
// Uyarı süresince seçilebilenler. 'savun' ve 'saklan' tavırdır (varışta uygulanır); 'harac' anında çözer (komut).
// 'elci' = önder eylemi `elci_gonder` (Taş+; akıncı/baskın/istila). 'karsi' sefer sistemine bırakıldı (§11.6) — yalnız kimlik.
export const TEHDIT_SECENEKLERI = ['savun', 'harac', 'saklan', 'elci', 'karsi'];
export const TEHDIT_TAVIRLARI = ['savun', 'saklan'];
export const TEHDIT_SONUCLARI = ['puskurtme', 'kismi', 'yenilgi', 'harac', 'saklan', 'elci'];
export const TEHDIT_EVRELERI = ['uyari', 'kusatma'];
export const TEHDIT_OZEL_KOSULLAR = ['ticaret', 'kiyi'];
// Taşınabilir kaynaklar (akıncı hedefi).
export const TASINABILIR = ['yiyecek', 'deri', 'alet', 'metal', 'sikke', 'kumas'];

function tehdit(o) {
  return { kosul: {}, agirlik: 10, bekleme: 30, cagMax: null, gucOran: 1, cagaGore: {}, secenekAd: {},
    onleyiciGorev: null, mvp: false, ...o };
}

export const TEHDITLER = [
  // ---------- Yırtıcılar (doğa; ölüm yok, yalnız yaralı) ----------
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
  // TODO(tasarim): §2.2'de Ayı Taş–Bronz; "çağ başına en az 2 tehdit" isteğiyle Göçebe'ye de açıldı (düşük ağırlık, ölüm yok).
  tehdit({ id: 'ayi', ad: 'Aç Ayı', tur: 'yirtici', kaynak: 'doga', cagMin: 'gocebe', cagMax: 'bronz', agirlik: 6, bekleme: 25,
    metin: 'Kış uykusundan erken uyanan iri bir ayı erzak çukurlarının çevresinde dolaşıyor.',
    isaret: 'Ağaçlarda pençe izleri', uyari: 2, gucOran: 1.0,
    hedef: ['yiyecek', 'deri'],
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.25, nufus: 0, hasar: 0, yarali: { adet: 1, sure: 4 } } },
    secenekler: ['savun', 'harac', 'saklan'], secenekAd: { savun: 'Mızraklarla karşıla', harac: 'Bal ve et bırak', saklan: 'Ateş yakıp bekle' },
    harac: { kaynak: { yiyecek: 1.5 } },
    saklan: { oran: 0.05, sure: 2, carpan: 0.7 },
    ganimet: { yiyecek: 2, deri: 0.5 },
    onleyiciGorev: 'ayi_avi',
    cagaGore: { gocebe: { agirlik: 5 }, bronz: { gucOran: 0.7, agirlik: 4 } } }),

  // ---------- Akıncılar (taşınabilir kaynak) ----------
  tehdit({ id: 'avci_cetesi', ad: 'Yabancı Avcı Çetesi', tur: 'akinci', kaynak: 'gocebe', cagMin: 'tasdevri', cagMax: 'bronz', mvp: true,
    metin: 'Yabancı avcılar av sahanızda kamp kurdu; ambarlarınıza göz dikmişler.',
    isaret: 'Uzakta yabancı ateşler', uyari: 3, gucOran: 1.0,
    hedef: 'tasinabilir',
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.25, nufus: 1, hasar: 0, yarali: { adet: 1, sure: 3 }, yakar: true } },
    secenekler: ['savun', 'harac', 'saklan', 'elci'], secenekAd: { harac: 'Haraç ver', saklan: 'Saklan' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.10, sure: 3, carpan: 0.5 },
    ganimet: { yiyecek: 1.5, alet: 0.5 },
    cagaGore: { bronz: { gucOran: 0.8, agirlik: 6 } } }),
  tehdit({ id: 'akincilar', ad: 'Akıncılar', tur: 'akinci', kaynak: 'gocebe', cagMin: 'bronz', cagMax: 'antik', agirlik: 10,
    metin: 'Atlı akıncılar bozkırdan iniyor; hızlı vurup ambarları boşaltmak niyetindeler.',
    isaret: 'Toz bulutu ufukta', uyari: 3, gucOran: 1.2,
    hedef: 'tasinabilir',
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.25, nufus: 1, hasar: 0, yarali: { adet: 2, sure: 3 }, yakar: true } },
    secenekler: ['savun', 'harac', 'saklan', 'elci'], secenekAd: { harac: 'Haraç ver', saklan: 'Sürüleri tepeye kaçır' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.10, sure: 3, carpan: 0.5 },
    ganimet: { yiyecek: 1.5, metal: 0.25 },
    cagaGore: { antik: { metin: 'Akıncı boyları sınır köylerini yağmalıyor; sıra sizin kentinizde.', ganimet: { yiyecek: 1, metal: 0.25, sikke: 0.3 } } } }),

  // ---------- Baskınlar (tüm depo + bina) ----------
  tehdit({ id: 'komsu_baskini', ad: 'Komşu Kabile Baskını', tur: 'baskin', kaynak: 'komsu', cagMin: 'tasdevri', cagMax: null, mvp: true,
    metin: 'Komşu kabile silahlanıyor; ambarlarınız ve evleriniz hedefte.',
    isaret: 'Komşular silah biliyor', uyari: 3, gucOran: 1.2,
    hedef: '*',
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.25, nufus: 1, hasar: 1, yarali: { adet: 1, sure: 3 }, yakar: true } },
    secenekler: ['savun', 'harac', 'saklan', 'elci'], secenekAd: { harac: 'Haraç ver', saklan: 'Saklan' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.10, sure: 3, carpan: 0.5 },
    ganimet: { yiyecek: 1.5, alet: 0.5 },
    cagaGore: {
      bronz: { ad: 'Komşu Köy Baskını', metin: 'Komşu köyün savaşçıları tunç mızraklarla toplandı; tarlalarınız hedefte.',
        isaret: 'Komşu köyde savaş davulları', ganimet: { yiyecek: 1.5, metal: 0.3 } },
      antik: { ad: 'Komşu Kent Saldırısı', metin: 'Komşu kent devleti sınır taşlarını söktü; hoplitleri yola çıktı.',
        isaret: 'Sınırda kalkanlı askerler', gucOran: 1.0, agirlik: 7, ganimet: { yiyecek: 1, metal: 0.3, sikke: 0.3 } },
      ortacag: { ad: 'Komşu Beylik Saldırısı', metin: 'Komşu bey topraklarınızda hak iddia ediyor; adamları yolda.',
        isaret: 'Komşu beyin sancakları', gucOran: 1.0, agirlik: 6, ganimet: { yiyecek: 1, sikke: 0.4 } },
    } }),
  tehdit({ id: 'yagma_seferi', ad: 'Yağma Seferi', tur: 'baskin', kaynak: 'komsu', cagMin: 'ortacag', cagMax: null, agirlik: 10,
    metin: 'Bir derebeyinin atlıları yağma için yola çıktı; köyleri yakıp ambarları boşaltıyorlar.',
    isaret: 'Sancaklı atlılar görüldü', uyari: 4, gucOran: 1.2,
    hedef: '*',
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.25, nufus: 1, hasar: 1, yarali: { adet: 2, sure: 3 }, yakar: true } },
    secenekler: ['savun', 'harac', 'saklan', 'elci'], secenekAd: { harac: 'Bedel öde', saklan: 'Halkı surların içine al' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.10, sure: 3, carpan: 0.5 },
    ganimet: { yiyecek: 1, metal: 0.3, sikke: 0.5 } }),

  // ---------- Yağmacılar (ticaret: kervan, sikke, kumaş) ----------
  // TODO(tasarim): Bronz'da sikke/kumaş yok → hedef metal/alet (cagaGore); yenilgide yoldaki 1 kervan çalınır.
  tehdit({ id: 'haydutlar', ad: 'Haydutlar', tur: 'yagma', kaynak: 'haydut', cagMin: 'bronz', cagMax: null, agirlik: 8, bekleme: 25,
    ozelKosul: 'ticaret',
    metin: 'Ticaret yolunda haydutlar türedi; kervanları ve pazar mallarını soyuyorlar.',
    isaret: 'Yolda soyulan yolcular', uyari: 3, gucOran: 0.9,
    hedef: ['sikke', 'kumas'],
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.15, nufus: 0, hasar: 0, kervan: 1, yarali: { adet: 1, sure: 3 } } },
    secenekler: ['savun', 'harac', 'saklan'], secenekAd: { savun: 'Yolları koru', harac: 'Geçiş akçesi ver', saklan: 'Pazarı kapat' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.05, sure: 3, carpan: 0.8 },
    ganimet: { metal: 0.3, sikke: 0.5 },
    cagaGore: { bronz: { hedef: ['metal', 'alet'], ganimet: { metal: 0.3, alet: 0.3 } } } }),
  tehdit({ id: 'korsanlar', ad: 'Korsanlar', tur: 'yagma', kaynak: 'haydut', cagMin: 'antik', cagMax: null, agirlik: 8,
    ozelKosul: 'kiyi',
    metin: 'Kıyıya kara yelkenli gemiler yanaştı; korsanlar limanı ve ambarları yağmalamak istiyor.',
    isaret: 'Kıyıda yabancı yelkenler', uyari: 3, gucOran: 1.1,
    hedef: ['sikke', 'kumas', 'yiyecek'],
    sonuc: { kismi: { oran: 0.10 }, yenilgi: { oran: 0.20, nufus: 1, hasar: 1, kervan: 1, yarali: { adet: 1, sure: 3 }, yakar: true } },
    secenekler: ['savun', 'harac', 'saklan'], secenekAd: { savun: 'Kıyıyı tut', harac: 'Fidye öde', saklan: 'İç kesime çekil' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.10, sure: 3, carpan: 0.6 },
    ganimet: { sikke: 0.6, metal: 0.2 } }),

  // ---------- İstila (nüfus + bina + üretim) ----------
  tehdit({ id: 'barbar_akini', ad: 'Barbar Akını', tur: 'istila', kaynak: 'barbar', cagMin: 'antik', cagMax: 'ortacag', agirlik: 9,
    metin: 'Kuzeyden kalabalık bir barbar halkı göçüyor; yollarındaki her şeyi yakıp yıkıyorlar.',
    isaret: 'Kuzeyden kaçan köylüler', uyari: 4, gucOran: 1.4,
    hedef: '*',
    sonuc: {
      kismi: { oran: 0.10, hasar: 1 },
      yenilgi: { oran: 0.25, nufus: 1, hasar: 1, yarali: { adet: 2, sure: 4 }, yakar: true,
        degistirici: { id: 'istila_yikimi', sure: 4, etki: { uretim: { etiket: '*', carpan: 0.8 } } } },
    },
    secenekler: ['savun', 'harac', 'saklan', 'elci'], secenekAd: { harac: 'Haraç ver', saklan: 'Tepelere sığın' },
    harac: { oran: 0.15 },
    saklan: { oran: 0.10, sure: 4, carpan: 0.5 },
    ganimet: { yiyecek: 1, metal: 0.4, alet: 0.4 },
    cagaGore: { ortacag: { gucOran: 1.3, metin: 'Doğudan atlı bir halk akın ediyor; kaleler bir bir düşüyor.', isaret: 'Doğuda yanan köyler' } } }),

  // ---------- Kuşatma (ordu; uzun evre, karar noktası) ----------
  tehdit({ id: 'kusatma', ad: 'Kuşatma', tur: 'kusatma', kaynak: 'ordu', cagMin: 'ortacag', cagMax: null, agirlik: 7, bekleme: 35,
    metin: 'Bir kral ordusu kentinize yürüyor; mancınıklar ve kuşatma kuleleri getiriyorlar.',
    isaret: 'Bir ordu yola çıktı', uyari: 5, gucOran: 1.5,
    hedef: '*',
    sonuc: {
      kismi: { oran: 0.10, degistirici: { id: 'kusatma_ardi', sure: 3, etki: { ticaretKapali: true } } },
      yenilgi: { oran: 0.25, nufus: 1, hasar: 1, hasarOncelik: 'savunma', yarali: { adet: 2, sure: 4 },
        degistirici: { id: 'kusatma_ardi', sure: 5, etki: { ticaretKapali: true } } },
    },
    secenekler: ['savun', 'harac'], secenekAd: { savun: 'Surlarda dayan', harac: 'Fidye öde' },
    harac: { kaynak: { sikke: 0.8 } },
    ganimet: { sikke: 0.6, metal: 0.4 },
    kusatma: { sure: 3, asinma: 0.06 }, karar: true }),
];

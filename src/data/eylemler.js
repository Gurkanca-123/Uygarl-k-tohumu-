// Önder eylemleri (TASARIM §1.3, şema §10). Her tur 1 eylem; seçilmezse Dinlen.
// Alanlar: id, ad, cag (açıldığı çağ), yorgunluk (+/−), gereksinim:{ bina?, kaynak? }, sonuc (§6.1 sonuc biçimi), olcekli, mvp,
//   haritaKesfi? (aşama 3: harita keşfi yapar)
// olcekli: sonuçtaki kaynak miktarları × (1 + EYLEM_OLCEK_ADIM × çağSırası).
// Şemaya eklenen sonuc alanları: onderYarali (tur), yorgunluk, kervan:{ ver, al, gecikme }, kosullu:[{ kosul, sonuc }] (eşleşen ilk
//   kosullu sonuç ana sonucun yerine geçer), bos (hiçbir şey olmaz).
// Olasılık listesi `olasilik:[{ p, sonuc }]`; p toplamı 1.
//
// TODO(tasarim): "kaynak miktarları ölçeklenir" BP'yi (Hikâye Anlat +2 BP, Keşfet +3 BP) kapsıyor mu? Şimdilik yalnız `kaynak` ölçekli.
// TODO(tasarim): Alet Yap (dönüşüm), Kervan Gönder ve Turnuva Düzenle (ödeme) ölçeklenir mi? Alet Yap ölçekli, diğer ikisi ölçeksiz varsayıldı.
export const EYLEMLER = [
  { id: 'avlan', ad: 'Avlan', cag: 'gocebe', yorgunluk: 2, gereksinim: {}, olcekli: true, mvp: true,
    sonuc: { kaynak: { yiyecek: 4, deri: 1 }, olasilik: [{ p: 0.1, sonuc: { onderYarali: 2 } }, { p: 0.9, sonuc: { bos: true } }] } },
  // TODO(tasarim): "%40: +6 odun ya da +4 taş" — ikisi arasındaki pay yazılmamış; 0,5/0,5 varsayıldı.
  // TODO(tasarim): "iyi sonuç +%10" (Hayvan İzleri / Gözcü Direği) hangi dilimden alınıp hangi dilimlere dağıtılır? Motor (aşama 2) kararı.
  // Aşama 3: `haritaKesfi` → eylem ayrıca haritada sisin merkeze en yakın kenarına bakıp KESIF_YARICAP (+ bonus) açar (RNG kullanmaz).
  { id: 'kesfet', ad: 'Keşfet', cag: 'gocebe', yorgunluk: 2, gereksinim: {}, olcekli: true, mvp: true, haritaKesfi: true,
    sonuc: { olasilik: [
      { p: 0.40, sonuc: { olasilik: [{ p: 0.5, sonuc: { kaynak: { odun: 6 } } }, { p: 0.5, sonuc: { kaynak: { tas: 4 } } }] }, iyi: true },
      { p: 0.25, sonuc: { bilgi: 3 }, iyi: true },
      { p: 0.15, sonuc: { zincir: { olay: 'yabanci_aile', gecikme: 0 } } },
      { p: 0.10, sonuc: { zincir: { olay: 'kurt_surusu', gecikme: 0 } } },
      { p: 0.10, sonuc: { bos: true } },
    ] } },
  { id: 'hikaye_anlat', ad: 'Hikâye Anlat', cag: 'gocebe', yorgunluk: 1, gereksinim: {}, olcekli: true, mvp: true,
    sonuc: { bilgi: 2, huzur: 2 } },
  { id: 'dinlen', ad: 'Dinlen', cag: 'gocebe', yorgunluk: -3, gereksinim: {}, olcekli: false, mvp: true,
    sonuc: { bos: true } },
  { id: 'alet_yap', ad: 'Alet Yap', cag: 'tasdevri', yorgunluk: 1, gereksinim: { kaynak: { tas: 2, odun: 1 } }, olcekli: true, mvp: true,
    sonuc: { kaynak: { tas: -2, odun: -1, alet: 1 } } },
  { id: 'kervan_gonder', ad: 'Kervan Gönder', cag: 'bronz', yorgunluk: 2, gereksinim: { bina: 'pazar_yeri' }, olcekli: false,
    sonuc: { kervan: { ver: 20, al: 15, gecikme: 3 } } },
  { id: 'halka_hitap', ad: 'Halka Hitap', cag: 'antik', yorgunluk: 1, gereksinim: {}, olcekli: false,
    sonuc: { huzur: 6, kosullu: [{ kosul: { vergi: 'yuksek' }, sonuc: { huzur: 10 } }] } },
  // TEHDIT.md §4.2 / §5.1: tehdit eylemleri (`tehditEylemi`: sonucu src/core/tehdit.js uygular; yalnız yaklaşan tehdit varken).
  { id: 'nobet_tut', ad: 'Nöbet Tut', cag: 'gocebe', yorgunluk: 1, gereksinim: {}, olcekli: false, tehditEylemi: 'nobet',
    sonuc: { bos: true } },
  { id: 'elci_gonder', ad: 'Elçi Gönder', cag: 'tasdevri', yorgunluk: 2, gereksinim: {}, olcekli: false, tehditEylemi: 'elci',
    sonuc: { bos: true } },
  { id: 'turnuva_duzenle', ad: 'Turnuva Düzenle', cag: 'ortacag', yorgunluk: 2, gereksinim: { kaynak: { sikke: 20 } }, olcekli: false,
    sonuc: { kaynak: { sikke: -20 }, huzur: 10, degistirici: { id: 'turnuva', sure: 3, etki: { savunma: 10 } } } },
];

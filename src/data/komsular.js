// Komşu köy/ülkeler — model B (kullanıcı kararı; docs/AKSIYON.md §4, şema §8.1).
// KOMSULAR: bulunma sırası; `cagBul` = bu çağda (ve sonrasında) bulunabilir. Mizaç bulunurken komsu.rng ile seçilir.
// İlk komşunun `tehditKaynak`ı 'komsu': ilişki puanı tehdit motorunun `tehdit.iliski.komsu` alanıyla ORTAKTIR (tek kaynak;
// TEHDIT.md §7 "A'nın alanları B'ye göçsüz taşınır").
export const KOMSULAR = [
  { id: 'kuzey_kurt_boyu', ad: 'Kuzey Kurt Boyu', cagBul: 'tasdevri', tehditKaynak: 'komsu',
    ilkMesaj: 'Ufukta dumanlar: Kuzey Kurt Boyu\'nun obası bulundu.' },
  { id: 'irmak_halki', ad: 'Irmak Halkı', cagBul: 'bronz', tehditKaynak: null, ilkMesaj: 'Irmağın öte yakasında Irmak Halkı yaşıyor.' },
  { id: 'kizil_kaya', ad: 'Kızıl Kaya Beyliği', cagBul: 'antik', tehditKaynak: null, ilkMesaj: 'Kızıl Kaya Beyliği\'nin sancakları görüldü.' },
];
// MVP: yalnız ilk komşu bulunur (Taş Devri). Bronz/Antik komşuları F3–F4.
export const KOMSU_MVP_SAYI = 1;

// Mizaç: güç çarpanı, görünür ordu profili (savaş modeli (b) birlik karşıtlığı, F3), ticaret oranı ağırlığı.
export const MIZACLAR = {
  baris: { ad: 'Barışsever', guc: 0.8, profil: 'piyade', agirlik: 1 },
  tuccar: { ad: 'Tüccar', guc: 0.9, profil: 'okcu', agirlik: 1 },
  saldirgan: { ad: 'Saldırgan', guc: 1.2, profil: 'atli', agirlik: 1 },
};
export const KOMSU_DURUMLARI = ['bagimsiz', 'ittifak', 'haracci', 'efendi'];
export const NIYET_TURLERI = ['ittifak', 'ticaret', 'harac', 'dusmanca', 'baskin', 'sessiz'];

// §4.3 yapay zekâ (6 kural): mevsim başında komşu başına 1 kez, sabit sırayla; ilk tutan kural uygulanır. komsu.rng yalnız içerik seçer.
// Koşul anahtarları (komsu.js `kuralTutar`): iliskiMin, iliskiMax, cagMin, ittifakYok, mizac, gucOranMin, barisciKapali.
// gucOran = komşu gücü / max(1, köy savunması).
// TODO(tasarim): §4.3 sırasında kural 4 (ilişki ≤ −20) kural 5'ten (≤ −50) önce olduğu için 5 hiç tutmazdı; uygulamada
//   "en özgül önce": baskın 4., düşmanca 5. sırada. Sıra testle sabittir.
export const NIYET_KURALLARI = [
  { id: 'ittifak', kosul: { iliskiMin: 60, cagMin: 'bronz', ittifakYok: true }, sure: 2, metin: '{ad} ittifak öneriyor.' },
  { id: 'ticaret', kosul: { iliskiMin: 20 }, sure: 1, metin: '{ad} takas öneriyor.' },
  { id: 'harac', kosul: { mizac: 'saldirgan', gucOranMin: 1.2, iliskiMax: 19, barisciKapali: true }, sure: 1, metin: '{ad} haraç istiyor.' },
  { id: 'baskin', kosul: { iliskiMax: -50, gucOranMin: 0.8, barisciKapali: true }, sure: 1, metin: '{ad} baskına hazırlanıyor!',
    etki: { tehditAgirlik: 2, gerginlik: 1.3, kesin: true } },
  { id: 'dusmanca', kosul: { iliskiMax: -20, barisciKapali: true }, sure: 1, metin: '{ad} köyünüze düşmanca bakıyor.',
    etki: { tehditAgirlik: 2, gerginlik: 1.3 } },
  { id: 'sessiz', kosul: {}, sure: 1, metin: null },
];

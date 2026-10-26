// Kaynak tablosu (TASARIM §2.1). Depolanan 12 kaynak; BP ayrı göstergedir (depoya sayılmaz, tavanı yok).
// Alanlar: id, ad, cag (açıldığı çağ), simge, bozulur
export const KAYNAKLAR = [
  { id: 'yiyecek', ad: 'Yiyecek', cag: 'gocebe',   simge: '🍖', bozulur: true },
  { id: 'odun',    ad: 'Odun',    cag: 'gocebe',   simge: '🪵', bozulur: false },
  { id: 'tas',     ad: 'Taş',     cag: 'gocebe',   simge: '🪨', bozulur: false },
  { id: 'deri',    ad: 'Deri',    cag: 'gocebe',   simge: '🟫', bozulur: false },
  { id: 'alet',    ad: 'Alet',    cag: 'tasdevri', simge: '🔨', bozulur: false },
  { id: 'kil',     ad: 'Kil',     cag: 'bronz',    simge: '🧱', bozulur: false },
  { id: 'cevher',  ad: 'Cevher',  cag: 'bronz',    simge: '⛏️', bozulur: false },
  { id: 'metal',   ad: 'Metal',   cag: 'bronz',    simge: '⚙️', bozulur: false },
  { id: 'mermer',  ad: 'Mermer',  cag: 'antik',    simge: '🏛️', bozulur: false },
  { id: 'sikke',   ad: 'Sikke',   cag: 'antik',    simge: '🪙', bozulur: false },
  { id: 'kumas',   ad: 'Kumaş',   cag: 'ortacag',  simge: '🧵', bozulur: false },
  { id: 'kitap',   ad: 'Kitap',   cag: 'ortacag',  simge: '📜', bozulur: false },
];

// Bilgi puanı: kaynak değildir; buluş maliyetlerinde `bilgi` anahtarıyla geçer.
export const BILGI = { id: 'bilgi', ad: 'Bilgi Puanı', kisa: 'BP', simge: '💡' };

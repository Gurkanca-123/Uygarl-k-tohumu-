// Karo türleri (TASARIM §3.1). `kod`: harita karakteri (durum.harita.degisim değerleri; zemin tohumdan yeniden üretilir).
// Alanlar: id, ad, kod, insaEdilir, gecilir (yürüyüş/BFS; su ve dağ geçilmez), gorunurCag, temizlenir?, yalnizBina?,
//   gizliGorunum? (gorunurCag'dan önce bu karo gibi görünür ve davranır), kesifBildir? (keşifte bildirim metni), yapay? (oyuncu yapar)
// Kullanıcı kararı (aşama 3): sisteki karoya bina kurulamaz, kaynak ipucu verilmez; cevher/mermer kendi çağından önce kayalık görünür.
export const KAROLAR = [
  { id: 'cimen',   ad: 'Çimen',      kod: 'c', insaEdilir: true,  gecilir: true, gorunurCag: 'gocebe' },
  // Temizleme: komut (insa.js `ormanTemizle`), inşaat sırasına girer (eşzamanlı sınıra sayılır), `sure` tur sonra +kazanc.
  { id: 'orman',   ad: 'Orman',      kod: 'o', insaEdilir: false, gecilir: true, gorunurCag: 'gocebe',
    temizlenir: { sure: 1, kazanc: { odun: 5 }, donusur: 'cimen' } },
  { id: 'tasli',   ad: 'Taşlık',     kod: 't', insaEdilir: false, gecilir: true, gorunurCag: 'gocebe', kesifBildir: 'bir taşlık' },
  { id: 'su',      ad: 'Su',         kod: 's', insaEdilir: false, gecilir: false, gorunurCag: 'gocebe', kesifBildir: 'su' },
  // TODO(tasarim): "tarım bonusu" sayısı yalnız bina bitişiklik kurallarında var (Tahıl Bahçesi +0,25);
  // verimli karo ÜSTÜNE kurulan tarım binasına ek bonus var mı belirsiz.
  { id: 'verimli', ad: 'Verimli Toprak', kod: 'v', insaEdilir: true, gecilir: true, gorunurCag: 'gocebe' },
  // Kil yatağı (aşama 3): su kenarında üretilir; Kil Ocağı buna bitişik kurulur.
  { id: 'kil',     ad: 'Kil Yatağı', kod: 'l', insaEdilir: false, gecilir: true, gorunurCag: 'gocebe', kesifBildir: 'bir kil yatağı' },
  { id: 'cevher',  ad: 'Cevher Damarı', kod: 'e', insaEdilir: false, gecilir: true, gorunurCag: 'bronz', yalnizBina: ['maden_ocagi'],
    gizliGorunum: 'kayalik', kesifBildir: 'bir cevher damarı' },
  { id: 'mermer',  ad: 'Mermer Yatağı', kod: 'm', insaEdilir: false, gecilir: true, gorunurCag: 'antik', yalnizBina: ['mermer_ocagi'],
    gizliGorunum: 'kayalik', kesifBildir: 'bir mermer yatağı' },
  { id: 'kayalik', ad: 'Kayalık',    kod: 'k', insaEdilir: false, gecilir: true, gorunurCag: 'gocebe' },
  { id: 'dag',     ad: 'Dağ',        kod: 'd', insaEdilir: false, gecilir: false, gorunurCag: 'gocebe' },
  // §3.4 yol (Bronz+): yalnız çimen/verimli üstüne, oyuncu yapar; üstüne bina kurulmaz.
  { id: 'yol',     ad: 'Yol',        kod: 'y', insaEdilir: false, gecilir: true, gorunurCag: 'gocebe', yapay: true },
];

// Karo türleri (TASARIM §3.1). `kod`: harita dizgisindeki tek karakter (durum.harita.karolar, 256 karakter).
// Alanlar: id, ad, kod, insaEdilir, gorunurCag, temizlenir?, yalnizBina? (cevher/mermer: yalnız ilgili ocak üstüne)
export const KAROLAR = [
  { id: 'cimen',   ad: 'Çimen',      kod: 'c', insaEdilir: true,  gorunurCag: 'gocebe' },
  // TODO(tasarim): temizlemeyi kim yapar (önder eylemi mi, işçi mi, inşaat sırası mı)? Belge yalnız "1 tur" diyor.
  { id: 'orman',   ad: 'Orman',      kod: 'o', insaEdilir: false, gorunurCag: 'gocebe',
    temizlenir: { sure: 1, kazanc: { odun: 5 }, donusur: 'cimen' } },
  { id: 'tasli',   ad: 'Taşlık',     kod: 't', insaEdilir: false, gorunurCag: 'gocebe' },
  { id: 'su',      ad: 'Su',         kod: 's', insaEdilir: false, gorunurCag: 'gocebe' },
  // TODO(tasarim): "tarım bonusu" sayısı yalnız bina bitişiklik kurallarında var (Tahıl Bahçesi +0,25);
  // verimli karo ÜSTÜNE kurulan tarım binasına ek bonus var mı belirsiz.
  { id: 'verimli', ad: 'Verimli Toprak', kod: 'v', insaEdilir: true, gorunurCag: 'gocebe' },
  // TODO(tasarim): görünür olmadan önceki çağlarda bu karo nasıl davranır (çimen gibi mi görünür / kurulur)?
  { id: 'cevher',  ad: 'Cevher Damarı', kod: 'e', insaEdilir: false, gorunurCag: 'bronz', yalnizBina: ['maden_ocagi'] },
  { id: 'mermer',  ad: 'Mermer Yatağı', kod: 'm', insaEdilir: false, gorunurCag: 'antik', yalnizBina: ['mermer_ocagi'] },
];

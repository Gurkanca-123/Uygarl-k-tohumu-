// Varyant seçimi: bina uid'sinden sabit (kayıttan sonra da aynı) varyant indeksi. Her türün sınırlı sayıda varyantı vardır;
// aynı varyant geometrisi önbellekte paylaşılır (bkz. binalar.js modelVerisi anahtarı).
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export function varyantSec(uid, adet) {
  if (adet <= 1 || uid == null) return 0;
  return hash(String(uid)) % adet;
}

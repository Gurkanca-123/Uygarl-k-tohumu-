// Tohumlu, saf rastgele sayı üreteci (mulberry32). Durum tek bir 32 bitlik tamsayıdır ve oyun durumunda (`rng`) saklanır;
// fonksiyonlar durumu değiştirmez, yeni durumu döner. Aynı rng → aynı sonuç (kayıt-yükle ile zar yeniden atılamaz).

// Herhangi bir tohumu (sayı ya da dizgi) 32 bitlik başlangıç durumuna çevirir.
export function rngBaslat(tohum) {
  let h = 2166136261 >>> 0; // FNV-1a
  const s = String(tohum);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// [0, 1) aralığında sayı. Dönüş: { deger, rng }
export function rngSonraki(rng) {
  const yeni = (rng + 0x6d2b79f5) >>> 0;
  let t = yeni;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const deger = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { deger, rng: yeni };
}

// [alt, ust] aralığında tamsayı (ikisi dahil).
export function rngTamsayi(rng, alt, ust) {
  const r = rngSonraki(rng);
  return { deger: alt + Math.floor(r.deger * (ust - alt + 1)), rng: r.rng };
}

// p olasılıkla true.
export function rngOlasilik(rng, p) {
  const r = rngSonraki(rng);
  return { deger: r.deger < p, rng: r.rng };
}

// Ağırlıklı seçim: ogeler [{ ..., agirlik }] ya da agirlikFn ile. Boş/sıfır ağırlıkta deger null.
export function rngAgirlikli(rng, ogeler, agirlikFn = (o) => o.agirlik) {
  const toplam = ogeler.reduce((a, o) => a + Math.max(0, agirlikFn(o)), 0);
  const r = rngSonraki(rng);
  if (!(toplam > 0)) return { deger: null, rng: r.rng };
  let esik = r.deger * toplam;
  for (const o of ogeler) {
    esik -= Math.max(0, agirlikFn(o));
    if (esik < 0) return { deger: o, rng: r.rng };
  }
  return { deger: ogeler[ogeler.length - 1], rng: r.rng };
}

// Durum nesnesi üzerinde kolaylık: { deger, durum } döner (durum.rng ilerletilmiş kopya).
export function durumRastgele(durum) {
  const r = rngSonraki(durum.rng);
  return { deger: r.deger, durum: { ...durum, rng: r.rng } };
}

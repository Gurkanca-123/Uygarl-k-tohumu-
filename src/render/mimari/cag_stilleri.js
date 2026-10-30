// Çağ stil paketleri: her mimari çağın paleti, malzeme seçimi ve oran kuralları. Altı çağ tanımlıdır; yalnız `ortacag` tamamlanmış
// ve tariflerde kullanılıyor (diğerleri palet/kimlik taslağı: tarif yazılırken ayrıntılandırılır, `hazir: false`).
// Oyun verisindeki 5 çağ (gocebe, tasdevri, bronz, antik, ortacag) şimdilik şu eşleşmeyle kullanılır; veri dönüşümü ayrı aşamadır.
export const MIMARI_CAGLAR = ['ilkel', 'antik', 'ortacag', 'ronesans', 'sanayi', 'modern'];

const OYUN_CAGI = { gocebe: 'ilkel', tasdevri: 'ilkel', bronz: 'antik', antik: 'antik', ortacag: 'ortacag' };
export const mimariCag = (oyunCagId) => OYUN_CAGI[oyunCagId] ?? 'ortacag';

// Ortak maket kuralları (altı çağ): sıcak ışıklı pencere, iri oran, hafif kusur. Stil paketleri bunu çağın paletiyle doldurur.
const ORTAK = {
  camIsik: 0xffcf7a, camKoyu: 0x34281f, demir: 0x2e2a28, altin: 0xe0b04a,
  cicek: [0xd04a5a, 0xe8b84a, 0xf2eee4, 0x9a6ad0, 0xe27a3a],
  saksi: 0x7a4a2e, hazir: false,
  tasKrem: 0xd9d1bf, arduvazUst: 0x7e8a9c, kapiKoyu: 0x4a2e1c, yosun: 0x6f8248, kil: 0xa05a3a,
};

export const CAG_STILLERI = {
  ortacag: {
    ...ORTAK, hazir: true, ad: 'Orta Çağ',
    siva: [0xece1c8, 0xe6d6b4, 0xdcc8a0, 0xe9d9bb],
    kiris: 0x45301f, kirisAcik: 0x5d4128,
    tas: 0x9a9384, tasAcik: 0xb9b2a0,
    kiremit: [0x8a6a58, 0x7e6050, 0x94745e, 0x866652, 0xa08a66, 0x70584a],
    arduvaz: [0x8892a0, 0x7c8796, 0x959fad, 0x8a8f98],
    yosun: 0x6f8248, kil: 0xa05a3a,
    catiDoku: 'kiremit',
    panjur: [0x8a3f2c, 0x55784f, 0x3f6a8a, 0xa0682e],
    kapi: 0x8a4a28,
  },
  ilkel: { ...ORTAK, hazir: true, ad: 'İlkel', siva: [0xc9a57a], kiris: 0x6b4a2c, kirisAcik: 0x8a6a48, tas: 0x8f8a80, tasAcik: 0xb0aa9c, kiremit: [0xc8a85a], arduvaz: [0x8a6a48], catiDoku: 'saman', panjur: [0x8a6a48], kapi: 0x6b4a2c },
  antik: { ...ORTAK, hazir: true, ad: 'Antik', siva: [0xefe6d2, 0xe6dcc4], kiris: 0x5a3b24, kirisAcik: 0x7a5636, tas: 0xc9c2b2, tasAcik: 0xefeae0, kiremit: [0xb06a48, 0xa05a3c, 0xb87a56], arduvaz: [0x8a7a68], catiDoku: 'kiremit', panjur: [0x3f86a8, 0x7a3a2c], kapi: 0x5a3b24 },
  ronesans: { ...ORTAK, ad: 'Rönesans', siva: [0xe8c9a0, 0xd9b48a, 0xe6d3b0], kiris: 0x4a3222, kirisAcik: 0x6a4a30, tas: 0xb7ac98, tasAcik: 0xe2d8c4, kiremit: [0xa8502f, 0xb85a38], arduvaz: [0x5a7a6a], catiDoku: 'kiremit', panjur: [0x3f5f7a, 0x6a2a2a], kapi: 0x4a3222 },
  sanayi: { ...ORTAK, ad: 'Sanayi', siva: [0x9a5a42, 0x8a4e3a, 0xa86a4a], kiris: 0x2e2a28, kirisAcik: 0x4a4440, tas: 0x7a766e, tasAcik: 0xa09a8e, kiremit: [0x4a525c, 0x5a626c], arduvaz: [0x4a525c], catiDoku: 'arduvaz', panjur: [0x2f4f3f, 0x3a3a3a], kapi: 0x2f3a3a },
  modern: { ...ORTAK, ad: 'Modern', siva: [0xe6e4de, 0xd8d6d0], kiris: 0x3a3f46, kirisAcik: 0x59606a, tas: 0x9a9890, tasAcik: 0xc8c6be, kiremit: [0x6a727a], arduvaz: [0x6a727a], catiDoku: 'duz', panjur: [0x3a3f46], kapi: 0x3a3f46 },
};

export const stilAl = (cag) => CAG_STILLERI[cag] || CAG_STILLERI.ortacag;

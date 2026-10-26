// Durum nesnesi şeması (TASARIM §10) = kayıt biçimi = alan beyaz listesi. Saf; DOM/Three.js bilmez.
// Şemadaki her alan için tür denetimi yapılır; bilinmeyen alan atılır, eksik/bozuk alan varsayılanla doldurulur (`suz`).
import { CAGLAR } from '../data/caglar.js';
import { KAYNAKLAR } from '../data/kaynaklar.js';
import { BINALAR } from '../data/binalar.js';
import { BULUSLAR } from '../data/buluslar.js';
import { OLAYLAR } from '../data/olaylar.js';
import { EYLEMLER } from '../data/eylemler.js';
import { KAROLAR } from '../data/karolar.js';
import { VERGI } from '../data/denge.js';
import { kesifGecerli } from '../world/kesif.js';

// Sürüm 2 (aşama 3): harita = { tohum, boyut, kesif, degisim } (zemin yeniden üretilir); sürüm 1 göçü save/kayit.js'de.
export const DURUM_SURUM = 2;

const idler = (t) => t.map((x) => x.id);
const KAROKOD = new Set(KAROLAR.map((k) => k.kod));

// Şema dili: 'sayi' | 'metin' | 'mantik' | 'sozluk' (herhangi JSON nesnesi) |
//   { tur:'metin', izinli?, kontrol? } | { tur:'sayi', bos? } (bos: null olabilir) |
//   { tur:'sozlukSayi', anahtarlar? } | { tur:'sozlukMantik', anahtarlar? } | { tur:'metinDizi', izinli? } |
//   { tur:'sozlukMetin', anahtar?(k → bool), izinli? } |
//   { tur:'nesne', alanlar, bos?, varsayilan? } | { tur:'dizi', oge }
const S = {
  sayi: (o = {}) => ({ tur: 'sayi', ...o }),
  metin: (o = {}) => ({ tur: 'metin', ...o }),
  nesne: (alanlar, o = {}) => ({ tur: 'nesne', alanlar, ...o }),
  dizi: (oge) => ({ tur: 'dizi', oge }),
};

export const DURUM_SEMASI = S.nesne({
  surum: S.sayi(),
  tohum: S.sayi(),
  rng: S.sayi(),
  tur: S.sayi(),
  cag: S.metin({ izinli: idler(CAGLAR) }),
  cagBaslangicTuru: S.sayi(),
  kaynaklar: { tur: 'sozlukSayi', anahtarlar: idler(KAYNAKLAR) },
  bilgiHavuz: S.sayi(),
  arastirma: S.nesne({ id: S.metin({ izinli: idler(BULUSLAR) }), ilerleme: S.sayi() }, { bos: true }),
  buluslar: { tur: 'metinDizi', izinli: idler(BULUSLAR) },
  nufus: S.sayi(),
  atama: { tur: 'sozlukSayi' },
  huzur: S.sayi(),
  acTur: S.sayi(),
  kayiplar: S.dizi(S.nesne({ tur: S.sayi(), adet: S.sayi() })),
  // secim: seçili eylemin parametresi (Kervan Gönder: { ver, al }); aşama 2'de eklendi, eski kayıtta yoksa null.
  onder: S.nesne({ yorgunluk: S.sayi(), yaraliKalan: S.sayi(), eylem: S.metin({ izinli: idler(EYLEMLER), bos: true }),
    secim: { tur: 'sozluk', bos: true } }),
  binalar: S.dizi(S.nesne({
    uid: S.metin(), id: S.metin({ izinli: idler(BINALAR) }), x: S.sayi(), y: S.sayi(),
    seviye: S.sayi(), insaKalan: S.sayi(), hasarli: 'mantik',
  }, { varsayilan: { seviye: 1, insaKalan: 0, hasarli: false } })),
  insaatSirasi: { tur: 'metinDizi' },
  // Harita (aşama 3): yalnız alt-tohum, boyut, keşif bit kümesi (base64) ve kalıcı karo değişimleri saklanır.
  harita: S.nesne({
    tohum: S.sayi(),
    boyut: S.sayi(),
    kesif: S.metin(),
    degisim: { tur: 'sozlukMetin', anahtar: (k) => /^\d+$/.test(k), izinli: [...KAROKOD] },
  }, { kontrol: (h) => Number.isInteger(h.boyut) && h.boyut >= 8 && h.boyut <= 256 && Number.isInteger(h.tohum)
    && kesifGecerli(h.kesif, h.boyut) && Object.keys(h.degisim).every((k) => Number(k) < h.boyut * h.boyut) }),
  olay: S.nesne({
    aktif: S.nesne({ id: S.metin({ izinli: idler(OLAYLAR) }) }, { bos: true }),
    bekleme: { tur: 'sozlukSayi', anahtarlar: idler(OLAYLAR) },
    zincir: S.dizi(S.nesne({ olay: S.metin({ izinli: idler(OLAYLAR) }), tur: S.sayi() })),
    kurtarmaKullanildi: { tur: 'sozlukMantik', anahtarlar: idler(CAGLAR) },
  }),
  degistiriciler: S.dizi(S.nesne({ id: S.metin(), kalan: S.sayi({ bos: true }), etki: 'sozluk' })),
  kervanlar: S.dizi(S.nesne({ kaynak: S.metin({ izinli: idler(KAYNAKLAR) }), miktar: S.sayi(), tur: S.sayi() })),
  vergi: S.metin({ izinli: idler(VERGI) }),
  istatistik: 'sozluk',
});

const YOK = Symbol('yok');
const duzNesne = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const kopya = (x) => JSON.parse(JSON.stringify(x));

// Değeri şemaya göre süzer. Geçersizse `varsayilan` döner (varsayilan da yoksa YOK → üst düzey atar).
function suzDeger(deger, sema, varsayilan) {
  const v = varsayilan === undefined ? YOK : varsayilan;
  const tur = typeof sema === 'string' ? sema : sema.tur;
  if (deger === null && sema.bos) return null;
  if (deger === undefined) return v;
  switch (tur) {
    case 'sayi':
      return typeof deger === 'number' && Number.isFinite(deger) ? deger : v;
    case 'mantik':
      return typeof deger === 'boolean' ? deger : v;
    case 'metin':
      if (typeof deger !== 'string') return v;
      if (sema.izinli && !sema.izinli.includes(deger)) return v;
      if (sema.kontrol && !sema.kontrol(deger)) return v;
      return deger;
    case 'sozluk':
      return duzNesne(deger) ? kopya(deger) : v;
    case 'sozlukSayi':
    case 'sozlukMantik': {
      if (!duzNesne(deger)) return v;
      const tip = tur === 'sozlukSayi' ? 'number' : 'boolean';
      const sonuc = {};
      for (const [k, x] of Object.entries(deger)) {
        if (sema.anahtarlar && !sema.anahtarlar.includes(k)) continue;
        if (typeof x === tip && (tip !== 'number' || Number.isFinite(x))) sonuc[k] = x;
      }
      return sonuc;
    }
    case 'sozlukMetin': {
      if (!duzNesne(deger)) return v;
      const sonuc = {};
      for (const [k, x] of Object.entries(deger)) {
        if (sema.anahtar && !sema.anahtar(k)) continue;
        if (typeof x === 'string' && (!sema.izinli || sema.izinli.includes(x))) sonuc[k] = x;
      }
      return sonuc;
    }
    case 'metinDizi':
      if (!Array.isArray(deger)) return v;
      return deger.filter((x) => typeof x === 'string' && (!sema.izinli || sema.izinli.includes(x)));
    case 'dizi':
      if (!Array.isArray(deger)) return v;
      return deger.map((x) => suzDeger(x, sema.oge, undefined)).filter((x) => x !== YOK);
    case 'nesne': {
      if (!duzNesne(deger)) return v;
      const sonuc = {};
      for (const [alan, alt] of Object.entries(sema.alanlar)) {
        const vars = duzNesne(varsayilan) ? varsayilan[alan] : sema.varsayilan?.[alan];
        const x = suzDeger(deger[alan], alt, vars);
        if (x === YOK) return v; // zorunlu alan eksik/bozuk → nesne geçersiz
        sonuc[alan] = x;
      }
      if (sema.kontrol && !sema.kontrol(sonuc)) return v;
      return sonuc;
    }
    default:
      throw new Error(`Bilinmeyen şema türü: ${tur}`);
  }
}

// Ham nesneyi beyaz listeye göre süzer; eksik alanlar `varsayilan` (yeniOyun çıktısı) ile doldurulur.
export function suz(ham, varsayilan) {
  const sonuc = suzDeger(ham, DURUM_SEMASI, varsayilan);
  return kopya(sonuc === YOK ? varsayilan : sonuc);
}

export const DURUM_ALANLARI = Object.keys(DURUM_SEMASI.alanlar);

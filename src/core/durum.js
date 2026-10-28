// Durum nesnesi şeması (TASARIM §10) = kayıt biçimi = alan beyaz listesi. Saf; DOM/Three.js bilmez.
// Şemadaki her alan için tür denetimi yapılır; bilinmeyen alan atılır, eksik/bozuk alan varsayılanla doldurulur (`suz`).
import { CAGLAR } from '../data/caglar.js';
import { KAYNAKLAR } from '../data/kaynaklar.js';
import { BINALAR } from '../data/binalar.js';
import { BULUSLAR } from '../data/buluslar.js';
import { OLAYLAR } from '../data/olaylar.js';
import { EYLEMLER } from '../data/eylemler.js';
import { KAROLAR } from '../data/karolar.js';
import { VERGI, ZORLUK, ISDAGIT_ONCELIKLER } from '../data/denge.js';
import { TEHDITLER, TEHDIT_KAYNAKLARI, TEHDIT_TAVIRLARI, TEHDIT_SONUCLARI, TEHDIT_EVRELERI } from '../data/tehditler.js';
import { kesifGecerli } from '../world/kesif.js';
import { SEFERLER, ISARET_TURLERI, SEFER_OLAYLARI } from '../data/seferler.js';
import { SINIFLAR, ESYALAR, GOREV_TURLERI } from '../data/kahramanlar.js';
import { KOMSULAR, MIZACLAR, KOMSU_DURUMLARI, NIYET_TURLERI } from '../data/komsular.js';
import { DESTANLAR, MEVSIM_GOREVLERI } from '../data/hedefler.js';
import { SEFER_SONUCLARI } from '../data/denge.js';
import { BIRIMLER } from '../data/birimler.js';
import { RUTBELER } from '../data/rutbeler.js';

// Sürüm 2 (aşama 3): harita = { tohum, boyut, kesif, degisim } (zemin yeniden üretilir); sürüm 1 göçü save/kayit.js'de.
// Sürüm 3 (tehdit MVP): zorluk + tehdit (docs/TEHDIT.md §8.2); göç GOCLER[2].
// Sürüm 4 (aksiyon MVP): kahramanlar, sandık, sefer, hedef işaretleri, komşular, hedefler (docs/AKSIYON.md §8.2); göç GOCLER[3].
// Sürüm 5 (görsel savaş F1): ordu, rutbe, savas; sefer.aktif[].savas ve ekip.asker (docs/SAVAS.md §10); göç GOCLER[4].
export const DURUM_SURUM = 5;

const idler = (t) => t.map((x) => x.id);
const KAROKOD = new Set(KAROLAR.map((k) => k.kod));
const ESYA_ALAN = { tur: 'metin', izinli: ESYALAR.map((e) => e.id), bos: true };
const YERLESIM_OGE = { tur: 'nesne', alanlar: { id: { tur: 'metin' }, rol: { tur: 'metin', izinli: [...BIRIMLER.map((b) => b.id), 'kahraman', 'onder'] },
  sira: { tur: 'sayi' }, sutun: { tur: 'sayi' } } };

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
  isDagitim: S.nesne({ oto: 'mantik', oncelik: S.metin({ izinli: ISDAGIT_ONCELIKLER }) }, { varsayilan: { oto: false, oncelik: 'dengeli' } }),
  // Sürüm 3: dış tehdit (TEHDIT.md §8.2).
  zorluk: S.metin({ izinli: Object.keys(ZORLUK) }),
  tehdit: S.nesne({
    gerginlik: S.sayi(), rng: S.sayi(), un: S.sayi(), haracSayac: S.sayi(),
    sonSonuc: S.metin({ izinli: TEHDIT_SONUCLARI, bos: true }), artArdaYenilgi: S.sayi(),
    aktif: S.nesne({
      id: S.metin({ izinli: idler(TEHDITLER) }), guc: S.sayi(), aralik: S.dizi('sayi'), kalan: S.sayi(),
      tavir: S.metin({ izinli: TEHDIT_TAVIRLARI }), bilinen: 'mantik', erteleme: S.sayi(), tahkimat: 'mantik',
      // Tüm çağlar dilimi (sürüm 3 içinde; eksikse varsayılan — göç gerekmez): kuşatma evresi/kararı, elçi, silah.
      evre: S.metin({ izinli: TEHDIT_EVRELERI }), karar: 'mantik', elciDenendi: 'mantik', silah: S.sayi(),
    }, { bos: true, varsayilan: { tavir: 'savun', bilinen: false, erteleme: 0, tahkimat: false, evre: 'uyari', karar: false,
      elciDenendi: false, silah: 0 },
      kontrol: (a) => a.aralik.length === 2 }),
    bekleme: { tur: 'sozlukSayi', anahtarlar: idler(TEHDITLER) },
    iliski: { tur: 'sozlukSayi', anahtarlar: TEHDIT_KAYNAKLARI },
    nefesKalan: S.sayi(),
    gecmis: S.dizi(S.nesne({ tur: S.sayi(), id: S.metin({ izinli: idler(TEHDITLER) }), guc: S.sayi(), savunma: S.sayi(),
      sonuc: S.metin({ izinli: TEHDIT_SONUCLARI }) })),
  }),
  // Sürüm 4: aksiyon (AKSIYON.md §8.2). Eksik alt alanlar varsayılanla dolar (göç ayrıca eski oyunu hazırlar).
  kahramanlar: S.dizi(S.nesne({
    uid: S.metin(), ad: S.metin(), sinif: S.metin({ izinli: idler(SINIFLAR) }), seviye: S.sayi(), xp: S.sayi(),
    gorev: S.nesne({ tur: S.metin({ izinli: GOREV_TURLERI }), hedef: S.metin({ bos: true }) }, { bos: true, varsayilan: { hedef: null } }),
    yarali: S.sayi(), portre: S.sayi(),
    esya: S.nesne({ silah: ESYA_ALAN, giysi: ESYA_ALAN, tilsim: ESYA_ALAN }, { varsayilan: { silah: null, giysi: null, tilsim: null } }),
  }, { varsayilan: { seviye: 1, xp: 0, gorev: null, yarali: 0, portre: 0, esya: { silah: null, giysi: null, tilsim: null } } })),
  kahramanDurum: S.nesne({
    teklif: S.nesne({ tur: S.sayi(), siniflar: { tur: 'metinDizi', izinli: idler(SINIFLAR) } }, { bos: true }),
    ilk: 'mantik', yemin: { tur: 'sozlukMantik', anahtarlar: idler(CAGLAR) }, sayac: S.sayi(),
  }),
  sandik: { tur: 'metinDizi', izinli: idler(ESYALAR) },
  sefer: S.nesne({
    rng: S.sayi(), sayac: S.sayi(), ilkAyi: 'mantik', harabe: S.sayi(), ayiKacti: S.sayi(),
    bekleme: { tur: 'sozlukSayi' },
    istatistik: { tur: 'sozlukSayi', anahtarlar: [...SEFER_SONUCLARI, 'gonderilen', 'yaraliIsci'] },
    aktif: S.dizi(S.nesne({
      uid: S.metin(), tur: S.metin({ izinli: idler(SEFERLER) }), hedef: S.metin({ bos: true }), x: S.sayi({ bos: true }), y: S.sayi({ bos: true }),
      kalan: S.sayi(), sure: S.sayi(), guc: S.sayi(), zorluk: S.sayi(), erzak: S.sayi(), gonderimTuru: S.sayi(),
      ekip: S.nesne({ kahraman: { tur: 'metinDizi' }, isci: S.sayi(), onder: 'mantik', asker: { tur: 'sozlukSayi', anahtarlar: idler(BIRIMLER) } },
        { varsayilan: { asker: {} } }),
      olay: S.nesne({ id: S.metin({ izinli: idler(SEFER_OLAYLARI) }) }, { bos: true }),
      olayEtki: { tur: 'sozlukSayi', anahtarlar: ['sureEk', 'odulCarpan', 'yaraliOlasilik'] }, olayOldu: 'mantik',
      // Sürüm 5: görsel savaş durumu (≤ 200 bayt). yerlesim: [{ id, rol, sira, sutun }].
      savas: S.nesne({
        durum: S.metin({ izinli: ['bekliyor', 'bitti'] }), varisTur: S.sayi(), kademe: S.metin({ izinli: SEFER_SONUCLARI, bos: true }),
        no: S.sayi({ bos: true }), yerlesim: { tur: 'dizi', oge: YERLESIM_OGE, bos: true },
      }, { bos: true, varsayilan: { kademe: null, no: null, yerlesim: null } }),
    }, { varsayilan: { hedef: null, x: null, y: null, olay: null, olayEtki: {}, olayOldu: false, savas: null } })),
    son: S.dizi(S.nesne({ uid: S.metin(), tur: S.metin({ izinli: idler(SEFERLER) }), sonuc: S.metin({ izinli: SEFER_SONUCLARI }),
      turNo: S.sayi(), kazanc: { tur: 'sozlukSayi' }, bp: S.sayi(), xp: S.sayi(), yarali: S.sayi() })),
  }),
  hedefIsaretleri: S.dizi(S.nesne({ uid: S.metin(), tur: S.metin({ izinli: ISARET_TURLERI }), x: S.sayi(), y: S.sayi(),
    kalan: S.sayi(), zorluk: S.sayi() })),
  // Sürüm 5: görsel savaş (SAVAS.md §10). ordu.asker/kademe tür başına; yerlesim = seferTur → hatırlanan işçi rolleri.
  ordu: S.nesne({
    asker: { tur: 'sozlukSayi', anahtarlar: idler(BIRIMLER) }, kademe: { tur: 'sozlukSayi', anahtarlar: idler(BIRIMLER) },
    yerlesim: { tur: 'sozluk', kontrol: (y) => Object.entries(y).every(([k, l]) => idler(SEFERLER).includes(k) && Array.isArray(l)
      && l.length <= 12 && l.every((h) => h && ROL_IZIN.includes(h.rol) && Number.isInteger(h.sira) && Number.isInteger(h.sutun))) },
  }, { varsayilan: { asker: {}, kademe: {}, yerlesim: {} } }),
  rutbe: S.nesne({ zp: S.sayi(), sira: S.sayi(), yildiz: S.sayi() }, { kontrol: (r) => r.sira >= 0 && r.sira < RUTBELER.length && r.yildiz >= 1 && r.yildiz <= 3 }),
  // son: "Tekrar izle" girdileri (olay listesi kaydedilmez, girdiden üretilir).
  savas: S.nesne({ sayac: S.sayi(), son: S.dizi({ tur: 'sozluk', kontrol: savasGirdiGecerli }) }),
  komsu: S.nesne({ rng: S.sayi(), sonTalep: S.sayi() }, { varsayilan: { sonTalep: -99 } }),
  komsular: S.dizi(S.nesne({
    id: S.metin({ izinli: idler(KOMSULAR) }), x: S.sayi(), y: S.sayi(), mizac: S.metin({ izinli: Object.keys(MIZACLAR) }),
    cag: S.metin({ izinli: idler(CAGLAR) }), cagTur: S.sayi(), iliski: S.sayi(), durum: S.metin({ izinli: KOMSU_DURUMLARI }),
    niyet: { tur: 'sozluk', bos: true, kontrol: (n) => NIYET_TURLERI.includes(n.tur) }, bekleme: { tur: 'sozlukSayi' },
  }, { varsayilan: { iliski: 0, durum: 'bagimsiz', niyet: null, bekleme: {} } })),
  hedef: S.nesne({
    destan: S.nesne({ id: S.metin({ izinli: idler(DESTANLAR) }), adim: S.sayi(), bitti: 'mantik' }),
    kartlar: { tur: 'metinDizi', izinli: idler(MEVSIM_GOREVLERI) },
    gorev: S.nesne({ id: S.metin({ izinli: idler(MEVSIM_GOREVLERI) }), kalan: S.sayi(),
      baslangic: { tur: 'sozlukSayi', anahtarlar: ['tur', 'sefer', 'hediye'] } }, { bos: true }),
    unvanlar: { tur: 'metinDizi' },
    sayac: { tur: 'sozlukSayi' },
    // Kart zamanlaması (görev sıklığı): çağ başına verilen set sayısı, son verilme turu, kendiliğinden kapanma turu.
    kart: S.nesne({ cag: S.metin({ bos: true }), adet: S.sayi(), son: S.sayi(), bitis: S.sayi() }),
  }, { varsayilan: { kart: { cag: '', adet: 0, son: -99, bitis: 0 } } }),
});

const ROL_IZIN = [...idler(BIRIMLER), 'kahraman', 'onder'];
function savasGirdiGecerli(g) {
  return Number.isInteger(g.no) && typeof g.tohum === 'number' && typeof g.uid === 'string' && idler(SEFERLER).includes(g.sefer)
    && SEFER_SONUCLARI.includes(g.kademe) && typeof g.dusman === 'string' && Array.isArray(g.birimler) && g.birimler.length <= 12
    && g.birimler.every((b) => b && typeof b.id === 'string' && ROL_IZIN.includes(b.tur) && Number.isInteger(b.sira) && Number.isInteger(b.sutun));
}

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
      if (!duzNesne(deger) || (sema.kontrol && !sema.kontrol(deger))) return v;
      return kopya(deger);
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

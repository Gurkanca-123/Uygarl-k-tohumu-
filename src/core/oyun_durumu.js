// Simülasyon çekirdeği: sıra tabanlı (tur = gün). DOM/Three.js bilmez. Durum değişmez (immutable) güncellenir.
import { CAGLAR } from '../data/caglar.js';
import { BINALAR } from '../data/binalar.js';
import { KAROLAR } from '../data/karolar.js';
import { BASLANGIC_KAYNAK, BASLANGIC_NUFUS, HUZUR_BASLANGIC, HARITA_BOYUT, YENI_KISI_ISI } from '../data/denge.js';
import { DURUM_SURUM } from './durum.js';
import { rngBaslat } from './rng.js';

export const VARSAYILAN_TOHUM = 1;

// Yer tutucu harita: tümü çimen. TODO(aşama 3): tohumlu harita üretimi ve §3.1 garantileri (src/world).
function bosHarita(boyut = HARITA_BOYUT) {
  const cimen = KAROLAR.find((k) => k.id === 'cimen').kod;
  return { boyut, karolar: cimen.repeat(boyut * boyut) };
}

// §7.4 başlangıç: Kamp Ateşi (merkez 2×2, haritanın ortası) + 1 Çadır, 3 kişi Toplayıcı'da.
export function yeniOyun(tohum = VARSAYILAN_TOHUM) {
  const ilkCag = CAGLAR[0];
  const merkez = BINALAR.find((b) => b.id === ilkCag.merkez);
  const mx = HARITA_BOYUT / 2 - merkez.boyut[0] / 2;
  const my = HARITA_BOYUT / 2 - merkez.boyut[1] / 2;
  return {
    surum: DURUM_SURUM,
    tohum,
    rng: rngBaslat(tohum),
    tur: 0,
    cag: ilkCag.id,
    cagBaslangicTuru: 0,
    kaynaklar: { ...BASLANGIC_KAYNAK },
    bilgiHavuz: 0,
    arastirma: null,
    buluslar: [],
    nufus: BASLANGIC_NUFUS,
    atama: { [`serbest:${YENI_KISI_ISI}`]: BASLANGIC_NUFUS },
    huzur: HUZUR_BASLANGIC,
    acTur: 0,
    kayiplar: [],
    onder: { yorgunluk: 0, yaraliKalan: 0, eylem: null, secim: null },
    binalar: [
      { uid: 'b1', id: merkez.id, x: mx, y: my, seviye: 1, insaKalan: 0, hasarli: false },
      { uid: 'b2', id: ilkCag.konut, x: mx + merkez.boyut[0], y: my, seviye: 1, insaKalan: 0, hasarli: false },
    ],
    insaatSirasi: [],
    harita: bosHarita(),
    olay: { aktif: null, bekleme: {}, zincir: [], kurtarmaKullanildi: {} },
    degistiriciler: [],
    kervanlar: [],
    vergi: 'yok',
    istatistik: {},
  };
}

// Tur çözümlemesi (§1.2 a–o) tur.js'de; geriye uyum için buradan da dışa aktarılır. Dönüş: { durum, bildirimler, hata? }.
export { turIlerlet } from './tur.js';

// Simülasyon çekirdeği: sıra tabanlı (tur = gün). DOM/Three.js bilmez. Durum değişmez (immutable) güncellenir.
import { CAGLAR } from '../data/caglar.js';
import { BINALAR } from '../data/binalar.js';
import {
  BASLANGIC_KAYNAK, BASLANGIC_NUFUS, HUZUR_BASLANGIC, HARITA_BOYUT, YENI_KISI_ISI, GORUS_BASLANGIC, ZORLUK, VARSAYILAN_ZORLUK,
} from '../data/denge.js';
import { tehditVarsayilan } from './tehdit.js';
import { seferVarsayilan } from './sefer.js';
import { kahramanDurumVarsayilan } from './kahraman.js';
import { komsuDurumVarsayilan } from './komsu.js';
import { hedefVarsayilan } from './hedef.js';
import { yeniHarita, merkezKonumu } from '../world/harita.js';
import { bosKesif, kesifUygula } from '../world/kesif.js';
import { DURUM_SURUM } from './durum.js';
import { rngBaslat } from './rng.js';

export const VARSAYILAN_TOHUM = 1;

// §7.4 başlangıç: Kamp Ateşi (merkez 2×2, haritanın ortası) + 1 Çadır, 3 kişi Toplayıcı'da.
// Harita (aşama 3): oyun tohumundan türetilen alt-tohumla üretilir (durum.rng'ye dokunmaz); merkez çevresinde
// GORUS_BASLANGIC yarıçapı açık, gerisi sis.
// secenek.zorluk: ZORLUK anahtarı (varsayılan Normal; TEHDIT.md §6). Geçersizse Normal.
export function yeniOyun(tohum = VARSAYILAN_TOHUM, { zorluk = VARSAYILAN_ZORLUK } = {}) {
  const ilkCag = CAGLAR[0];
  const merkez = BINALAR.find((b) => b.id === ilkCag.merkez);
  const { x: mx, y: my } = merkezKonumu(HARITA_BOYUT);
  const d = {
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
    harita: yeniHarita(tohum, HARITA_BOYUT, bosKesif(HARITA_BOYUT)),
    olay: { aktif: null, bekleme: {}, zincir: [], kurtarmaKullanildi: {} },
    degistiriciler: [],
    kervanlar: [],
    vergi: 'yok',
    istatistik: {},
    zorluk: ZORLUK[zorluk] ? zorluk : VARSAYILAN_ZORLUK,
    tehdit: tehditVarsayilan(tohum),
    isDagitim: { oto: false, oncelik: 'dengeli' }, // otomatik iş dağıtımı (varsayılan KAPALI)
    // Sürüm 4: aksiyon (AKSIYON.md §8.2). Ayrı RNG akışları: sefer.rng, komsu.rng (durum.rng / tehdit.rng sırası değişmez).
    kahramanlar: [],
    kahramanDurum: kahramanDurumVarsayilan(),
    sandik: [],
    sefer: seferVarsayilan(tohum),
    hedefIsaretleri: [],
    komsu: komsuDurumVarsayilan(tohum),
    komsular: [],
    hedef: hedefVarsayilan(),
  };
  kesifUygula(d, { x: mx + merkez.boyut[0] / 2, y: my + merkez.boyut[1] / 2 }, GORUS_BASLANGIC);
  return d;
}

// Tur çözümlemesi (§1.2 a–o) tur.js'de; geriye uyum için buradan da dışa aktarılır. Dönüş: { durum, bildirimler, hata? }.
export { turIlerlet } from './tur.js';

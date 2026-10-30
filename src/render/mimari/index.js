// Mimari üretim katmanı girişi: bina kimliği → tarif kaydı, varyant sayısı, açma/kapama anahtarı.
// Güvenlik: yeni motor varsayılan KAPALI. Açmak için adrese `?mimari=yeni` ya da `localStorage ut_mimari=yeni`.
// Eski modeller (`binalar.js` içindeki `M.*`) olduğu gibi durur; kayıtlı olmayan binalar her zaman eskisiyle çizilir.
import { yariAhsapEv, VARYANT_ADET as EV_VARYANT } from './tarifler/yari_ahsap_ev.js';
import { katedral, VARYANT_ADET as KAT_VARYANT } from './tarifler/katedral.js';
import { degirmen, VARYANT_ADET as DEG_VARYANT } from './tarifler/degirmen.js';
import { kale, VARYANT_ADET as KALE_VARYANT } from './tarifler/kale.js';
import { manastir, VARYANT_ADET as MAN_VARYANT } from './tarifler/manastir.js';
import { han, VARYANT_ADET as HAN_VARYANT } from './tarifler/han.js';
import { demirci, eritmeFirini, dokumaAtolyesi, darphane, aletYapimcisi, VARYANT_ADET as ATL_VARYANT } from './tarifler/atolyeler.js';
import { ciftlik, ambar, agil, tahilBahcesi, erzakCukuru, sulananTarla, bagBahce, kurutmaRafi, VARYANT_ADET as TAR_VARYANT } from './tarifler/ciftlik.js';
import { loncaBinasi, darussifa, VARYANT_ADET as KAMU_VARYANT } from './tarifler/kamu.js';
import { surParcasi, cit, nobetCiti, gozcuDiregi, muhafizKulesi, kisla, VARYANT_ADET as SAV_VARYANT } from './tarifler/savunma.js';
import { cadir, kulube, avciKulubesi, toplayiciBarinagi, oduncuKampi, totem, sifaciCadiri, tasOcagi, balikciSiginagi, magaraResmi, VARYANT_ADET as ILK_VARYANT } from './tarifler/ilkel.js';
import { kerpicEv, kilOcagi, madenOcagi, pazarYeri, kuyu as kuyuTarif, mabet, VARYANT_ADET as BRZ_VARYANT } from './tarifler/bronz.js';
import { tasEv, mermerOcagi, liman, suKemeri, hamam, kutuphane, tiyatro, VARYANT_ADET as ANT_VARYANT } from './tarifler/antik.js';
import { kampAtesi, ocakMeydani, koyMeydani, agora, sehirMeydani, VARYANT_ADET as MRK_VARYANT } from './tarifler/merkez.js';
import { stilAl, mimariCag } from './cag_stilleri.js';
import { varyantSec } from './varyasyon.js';

const KAYIT = {
  yari_ahsap_ev: { varyant: EV_VARYANT, yap: yariAhsapEv },
  katedral: { varyant: KAT_VARYANT, yap: katedral },
  degirmen: { varyant: DEG_VARYANT, yap: degirmen },
  kale: { varyant: KALE_VARYANT, yap: kale },
  manastir: { varyant: MAN_VARYANT, yap: manastir },
  han: { varyant: HAN_VARYANT, yap: han },
  demirci: { varyant: ATL_VARYANT, yap: demirci },
  eritme_firini: { varyant: ATL_VARYANT, yap: eritmeFirini },
  dokuma_atolyesi: { varyant: ATL_VARYANT, yap: dokumaAtolyesi },
  darphane: { varyant: ATL_VARYANT, yap: darphane },
  alet_yapimcisi: { varyant: ATL_VARYANT, yap: aletYapimcisi },
  ciftlik: { varyant: TAR_VARYANT, yap: ciftlik },
  ambar: { varyant: TAR_VARYANT, yap: ambar },
  agil: { varyant: TAR_VARYANT, yap: agil },
  tahil_bahcesi: { varyant: TAR_VARYANT, yap: tahilBahcesi },
  erzak_cukuru: { varyant: TAR_VARYANT, yap: erzakCukuru },
  sulanan_tarla: { varyant: TAR_VARYANT, yap: sulananTarla },
  bag_bahce: { varyant: TAR_VARYANT, yap: bagBahce },
  lonca_binasi: { varyant: KAMU_VARYANT, yap: loncaBinasi },
  darussifa: { varyant: KAMU_VARYANT, yap: darussifa },
  sur_parcasi: { varyant: SAV_VARYANT, yap: surParcasi },
  cit: { varyant: SAV_VARYANT, yap: cit },
  nobet_citi: { varyant: SAV_VARYANT, yap: nobetCiti },
  gozcu_diregi: { varyant: SAV_VARYANT, yap: gozcuDiregi },
  muhafiz_kulesi: { varyant: SAV_VARYANT, yap: muhafizKulesi },
  kisla: { varyant: SAV_VARYANT, yap: kisla },
  cadir: { varyant: ILK_VARYANT, yap: cadir },
  kulube: { varyant: ILK_VARYANT, yap: kulube },
  avci_kulubesi: { varyant: ILK_VARYANT, yap: avciKulubesi },
  toplayici_barinagi: { varyant: ILK_VARYANT, yap: toplayiciBarinagi },
  oduncu_kampi: { varyant: ILK_VARYANT, yap: oduncuKampi },
  totem: { varyant: ILK_VARYANT, yap: totem },
  sifaci_cadiri: { varyant: ILK_VARYANT, yap: sifaciCadiri },
  tas_ocagi: { varyant: ILK_VARYANT, yap: tasOcagi },
  balikci_siginagi: { varyant: ILK_VARYANT, yap: balikciSiginagi },
  magara_resmi: { varyant: ILK_VARYANT, yap: magaraResmi },
  kerpic_ev: { varyant: BRZ_VARYANT, yap: kerpicEv },
  kil_ocagi: { varyant: BRZ_VARYANT, yap: kilOcagi },
  maden_ocagi: { varyant: BRZ_VARYANT, yap: madenOcagi },
  pazar_yeri: { varyant: BRZ_VARYANT, yap: pazarYeri },
  kuyu: { varyant: BRZ_VARYANT, yap: kuyuTarif },
  mabet: { varyant: BRZ_VARYANT, yap: mabet },
  tas_ev: { varyant: ANT_VARYANT, yap: tasEv },
  mermer_ocagi: { varyant: ANT_VARYANT, yap: mermerOcagi },
  liman: { varyant: ANT_VARYANT, yap: liman },
  su_kemeri: { varyant: ANT_VARYANT, yap: suKemeri },
  hamam: { varyant: ANT_VARYANT, yap: hamam },
  kutuphane: { varyant: ANT_VARYANT, yap: kutuphane },
  tiyatro: { varyant: ANT_VARYANT, yap: tiyatro },
  kamp_atesi: { varyant: MRK_VARYANT, yap: kampAtesi },
  ocak_meydani: { varyant: MRK_VARYANT, yap: ocakMeydani },
  koy_meydani: { varyant: MRK_VARYANT, yap: koyMeydani },
  agora: { varyant: MRK_VARYANT, yap: agora },
  sehir_meydani: { varyant: MRK_VARYANT, yap: sehirMeydani },
  kurutma_rafi: { varyant: TAR_VARYANT, yap: kurutmaRafi },
};

export const mimariKayitlar = () => Object.keys(KAYIT);
export const mimariKayitli = (id) => Object.prototype.hasOwnProperty.call(KAYIT, id);
export const mimariVaryantAdet = (id) => KAYIT[id]?.varyant ?? 1;
export const mimariVaryant = (id, uid) => varyantSec(uid, mimariVaryantAdet(id));

export function mimariYap(id, kurucu, c, vr, oyunCag) {
  KAYIT[id].yap(kurucu, { ...c, stil: stilAl(mimariCag(oyunCag)) }, vr);
}

let acik = null;
export function mimariAcik() {
  if (acik !== null) return acik;
  acik = false;
  try {
    const q = globalThis.location?.search || '';
    acik = /[?&]mimari=yeni\b/.test(q) || globalThis.localStorage?.getItem('ut_mimari') === 'yeni';
  } catch { acik = false; }
  return acik;
}

// Kamera uzaklığına bağlı ayrıntı seviyesi: zoom eşiği (oyunda varsayılan 1.6, yakın 3.4). Titremeyi önlemek için histerezis.
// 0 = tam ayrıntı, 1 = uzak (küçük ayrıntılar atılır, kiremit sıraları iriler; silüet ve ana mimari korunur).
export const LOD_ESIK = 2.0, LOD_ARALIK = 0.12;
export function mimariLod(zoom, onceki = 0) {
  if (onceki === 1) return zoom > LOD_ESIK + LOD_ARALIK ? 0 : 1;
  return zoom < LOD_ESIK - LOD_ARALIK ? 1 : 0;
}

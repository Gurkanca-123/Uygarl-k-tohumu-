// Mimari üretim katmanı girişi: bina kimliği → tarif kaydı, varyant sayısı, açma/kapama anahtarı.
// Güvenlik: yeni motor varsayılan KAPALI. Açmak için adrese `?mimari=yeni` ya da `localStorage ut_mimari=yeni`.
// Eski modeller (`binalar.js` içindeki `M.*`) olduğu gibi durur; kayıtlı olmayan binalar her zaman eskisiyle çizilir.
import { yariAhsapEv, VARYANT_ADET as EV_VARYANT } from './tarifler/yari_ahsap_ev.js';
import { stilAl, mimariCag } from './cag_stilleri.js';
import { varyantSec } from './varyasyon.js';

const KAYIT = {
  yari_ahsap_ev: { varyant: EV_VARYANT, yap: yariAhsapEv },
};

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

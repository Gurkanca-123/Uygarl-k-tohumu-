// Huzur (TASARIM §2.6): hedef hesabı ve en çok HUZUR_KAYMA puanlık kayma (adım j). Saf.
import {
  HUZUR_HEDEF_TABAN, HUZUR_AYNI_TUR, HUZUR_BARINAKLI, HUZUR_EVSIZ, HUZUR_ACLIK, HUZUR_ISINMA_EKSIK, HUZUR_ISSIZ,
  HUZUR_KAYMA, VERGI,
} from '../data/denge.js';
import {
  BINA, kopya, mevcutCag, calisanBinalar, seviyeEtki, evsizSayisi, issizSayisi, etkinDegistiriciler, sinirla,
} from './yardimci.js';
import { hesaplaBitisiklik } from './uretim.js';

// Dönüş: { hedef, parcalar } (arayüz dökümü için parçalar ayrı).
export function huzurHedefi(d) {
  const st = d.istatistik?.sonTur || {};
  const p = {};
  p.taban = HUZUR_HEDEF_TABAN;
  p.merkez = mevcutCag(d).merkezHuzur;
  // Aynı türden 2. ve sonraki binalar %50 (en yüksek değerli tam sayılır).
  const turler = {};
  for (const b of calisanBinalar(d)) {
    const t = BINA[b.id];
    if (!t.huzur) continue;
    (turler[b.id] ||= []).push(t.huzur * seviyeEtki(b));
  }
  p.binalar = 0;
  for (const liste of Object.values(turler)) {
    liste.sort((a, b) => b - a).forEach((v, i) => { p.binalar += i === 0 ? v : v * HUZUR_AYNI_TUR; });
  }
  const evsiz = evsizSayisi(d);
  p.barinma = evsiz === 0 ? HUZUR_BARINAKLI : HUZUR_EVSIZ * evsiz;
  p.aclik = st.aclik ? HUZUR_ACLIK : 0;
  p.isinma = st.isinmaEksik ? HUZUR_ISINMA_EKSIK : 0;
  p.issiz = HUZUR_ISSIZ * issizSayisi(d);
  p.kalabalik = -Math.max(0, d.nufus - mevcutCag(d).kalabalikEsigi);
  p.vergi = VERGI.find((v) => v.id === d.vergi)?.huzur || 0;
  p.bitisiklik = hesaplaBitisiklik(d).toplamHuzur;
  p.degistirici = etkinDegistiriciler(d).reduce((a, m) => a + (m.etki?.huzur || 0), 0);
  const hedef = Object.values(p).reduce((a, x) => a + x, 0);
  return { hedef, parcalar: p };
}

// Kopya üstünde: anında huzur etkisi (olay, Hikâye Anlat).
export function huzurEkle(d, n) {
  d.huzur = sinirla(d.huzur + n, 0, 100);
}

// Adım j: huzur = clamp(huzur + clamp(hedef − huzur, −5, +5), 0, 100).
export function adimHuzur(durum) {
  const d = kopya(durum);
  const { hedef } = huzurHedefi(d);
  d.huzur = sinirla(d.huzur + sinirla(hedef - d.huzur, -HUZUR_KAYMA, HUZUR_KAYMA), 0, 100);
  return d;
}

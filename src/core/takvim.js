// Takvim: tur → gün / mevsim / yıl. Saf; durumda saklanmaz, `tur`dan türetilir.
// `tur` = tamamlanan gün sayısı (yeni oyunda 0 = Bahar 1. gün, 1. yıl). 16. gün (tur 15) ilk kış günüdür (§1).
import { MEVSIMLER } from '../data/mevsimler.js';
import { MEVSIM_TUR, YIL_MEVSIM } from '../data/denge.js';

export function takvim(tur) {
  const yilTur = MEVSIM_TUR * YIL_MEVSIM;
  const mevsimSira = Math.floor(tur / MEVSIM_TUR) % YIL_MEVSIM;
  return {
    gun: tur + 1,                                   // oyunun kaçıncı günü (1'den)
    yil: Math.floor(tur / yilTur) + 1,
    mevsim: MEVSIMLER[mevsimSira].id,
    mevsimAd: MEVSIMLER[mevsimSira].ad,
    mevsimSira,
    mevsimGunu: (tur % MEVSIM_TUR) + 1,             // 1..5
    mevsimSonGunu: tur % MEVSIM_TUR === MEVSIM_TUR - 1,
  };
}

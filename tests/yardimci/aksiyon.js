// Aksiyon testleri için yardımcılar: kahraman/işaret kurma, olayları çözerek tur ilerletme.
import { turIlerlet } from '../../src/core/tur.js';
import { olayCoz, secenekUygunMu } from '../../src/core/olay.js';
import { OLAY } from '../../src/core/yardimci.js';
import { kahramanOlustur } from '../../src/core/kahraman.js';
import { isaretDogur } from '../../src/core/sefer.js';

// Kurallar dışı (test kurulumu): kahraman ekler. Dönüş: { d, uid }.
export function kahramanli(d0, sinif = 'avci', { seviye = 1, gorev = null } = {}) {
  const d = structuredClone(d0);
  const k = kahramanOlustur(d, sinif, { seviye });
  k.gorev = gorev;
  return { d, uid: k.uid };
}
// Haritaya işaret koyar. Dönüş: { d, uid, isaret }.
export function isaretli(d0, tur = 'ayi') {
  const d = structuredClone(d0);
  const i = isaretDogur(d, [], { zorla: tur });
  return { d, uid: i.uid, isaret: i };
}
// Bekleyen olayı ilk uygun seçenekle çözüp n tur ilerletir. Dönüş: { d, bildirimler }.
export function ilerle(d0, n = 1) {
  let d = d0;
  const bildirimler = [];
  for (let i = 0; i < n; i++) {
    if (d.olay.aktif) {
      const o = OLAY[d.olay.aktif.id];
      d = olayCoz(d, o.secenekler.findIndex((s) => secenekUygunMu(d, s))).durum;
    }
    const r = turIlerlet(d);
    d = r.durum;
    bildirimler.push(...r.bildirimler.map((b) => ({ ...b, turNo: d.tur })));
  }
  return { d, bildirimler };
}
